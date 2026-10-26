// Edge Function "meta" · Instagram + Página do Facebook no painel.
// - Webhook (GET verificação / POST eventos): comentários, DMs e leads caem em social_inbox;
//   respostas automáticas por palavra-chave (autoreply_rules) mandam DM privada e/ou respondem o comentário.
// - Login (OAuth) do Instagram e do Facebook: o token nunca passa pelo navegador, fica em meta_accounts.
// - Ações do painel (sessão do dono): connect, reply, sync, status. Cron (x-cron-key): daily.
// Secrets: IG_APP_SECRET (chave secreta do app do Instagram) e FB_APP_SECRET (chave secreta do app da Meta).
// Precisa de "Verify JWT" desligado (a Meta chama sem login).
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const BASE = "https://avyzkygunshncwwbmzll.supabase.co/functions/v1/meta";
const PAINEL = "https://andersonbrito.com/painel/#/social";
const IG_APP_ID = "1108793578594260";
const FB_APP_ID = "1584718087029566";
const V = "v23.0";
const VERIFY_TOKEN = "anderson-os-meta-webhook"; // só confirma a assinatura do webhook; os eventos são validados pela chave secreta
const IG_SCOPES = "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_manage_insights";
const FB_SCOPES = "pages_show_list,pages_read_engagement,read_insights,business_management"; // só leitura (views e comentários da Página); responder comentários exige permissão que a Meta não liberou para este app
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-cron-key, apikey, x-client-info", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const secret = (n: string) => { const v = Deno.env.get(n); if (!v) throw new Error(`secret ${n} ausente no Supabase`); return v; };
const back = (msg: string) => Response.redirect(`${PAINEL}?msg=${encodeURIComponent(msg)}`, 302);

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j.error?.message || j.error_message || `erro ${r.status}`);
  return j;
}
const form = (o: Record<string, string>) => ({ method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(o) });
const post = (url: string, body: unknown) => api(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// A conta Meta tem várias Páginas; a do painel é a "Anderson Brito Fotografia".
const PAGE_NAME = "anderson brito fotografia";
async function account(kind: "instagram" | "page") {
  const { data } = await sb.from("meta_accounts").select("account_id, name, token").eq("kind", kind).order("updated_at", { ascending: false }).limit(50);
  const list = data || [];
  if (kind === "page") return list.find((a) => (a.name || "").toLowerCase().includes(PAGE_NAME)) || list[0] || null;
  return list[0] || null;
}

// ───────── autorização ─────────
async function authorized(req: Request) {
  const cron = req.headers.get("x-cron-key");
  if (cron) { const { data } = await sb.rpc("postador_cron_key"); return !!data && cron === data; }
  const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!token) return false;
  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user) return false;
  const { data: m } = await sb.from("app_members").select("role, modules").eq("user_id", u.user.id).maybeSingle();
  return !!m && (m.role === "owner" || (m.modules || []).includes("social"));
}

async function validSignature(req: Request, raw: string) {
  const sig = (req.headers.get("x-hub-signature-256") || "").replace(/^sha256=/, "");
  if (!sig) return false;
  for (const n of ["IG_APP_SECRET", "FB_APP_SECRET"]) {
    const s = Deno.env.get(n); if (!s) continue;
    const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(s), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(raw)))].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (mac === sig) return true;
  }
  return false;
}

// ───────── login (OAuth) ─────────
async function connectUrl(kind: "instagram" | "page") {
  const state = crypto.randomUUID();
  await sb.from("meta_oauth_states").insert({ state, kind });
  if (kind === "instagram") {
    const p = new URLSearchParams({ client_id: IG_APP_ID, redirect_uri: `${BASE}/callback-ig`, response_type: "code", scope: IG_SCOPES, state, enable_fb_login: "0", force_reauth: "true" });
    return `https://www.instagram.com/oauth/authorize?${p}`;
  }
  const p = new URLSearchParams({ client_id: FB_APP_ID, redirect_uri: `${BASE}/callback-fb`, response_type: "code", scope: FB_SCOPES, state });
  // configuração "Painel leitura Pagina" do Login do Facebook para Empresas (o app não aceita a lista de permissões solta)
  const cfg = Deno.env.get("FB_LOGIN_CONFIG_ID") || "1460240862723137"; if (cfg) { p.delete("scope"); p.set("config_id", cfg); }
  return `https://www.facebook.com/${V}/dialog/oauth?${p}`;
}

async function useState(state: string | null, kind: string) {
  if (!state) return false;
  const { data } = await sb.from("meta_oauth_states").delete().eq("state", state).eq("kind", kind).select("state, created_at").maybeSingle();
  return !!data && Date.now() - new Date(data.created_at).getTime() < 15 * 60e3;
}

async function callbackIg(u: URL) {
  if (!(await useState(u.searchParams.get("state"), "instagram"))) return back("Login do Instagram expirou. Tente de novo.");
  const code = (u.searchParams.get("code") || "").replace(/#_$/, "");
  if (!code) return back("Instagram não autorizou: " + (u.searchParams.get("error_description") || "cancelado"));
  const short = await api("https://api.instagram.com/oauth/access_token", form({ client_id: IG_APP_ID, client_secret: secret("IG_APP_SECRET"), grant_type: "authorization_code", redirect_uri: `${BASE}/callback-ig`, code }));
  const long = await api(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${secret("IG_APP_SECRET")}&access_token=${short.access_token}`);
  const me = await api(`https://graph.instagram.com/${V}/me?fields=user_id,username&access_token=${long.access_token}`);
  await sb.from("meta_accounts").upsert({ kind: "instagram", account_id: String(me.user_id), name: "@" + me.username, token: long.access_token, expires_at: new Date(Date.now() + (long.expires_in || 5184000) * 1000).toISOString(), updated_at: new Date().toISOString() }, { onConflict: "kind,account_id" });
  await api(`https://graph.instagram.com/${V}/me/subscribed_apps?subscribed_fields=comments,messages&access_token=${long.access_token}`, { method: "POST" }).catch(() => null);
  return back(`Instagram @${me.username} conectado.`);
}

async function callbackFb(u: URL) {
  if (!(await useState(u.searchParams.get("state"), "page"))) return back("Login do Facebook expirou. Tente de novo.");
  const code = u.searchParams.get("code");
  if (!code) return back("Facebook não autorizou: " + (u.searchParams.get("error_description") || "cancelado"));
  const s = secret("FB_APP_SECRET");
  const short = await api(`https://graph.facebook.com/${V}/oauth/access_token?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(`${BASE}/callback-fb`)}&client_secret=${s}&code=${code}`);
  const long = await api(`https://graph.facebook.com/${V}/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${s}&fb_exchange_token=${short.access_token}`);
  const pages = await api(`https://graph.facebook.com/${V}/me/accounts?fields=id,name,access_token&limit=50&access_token=${long.access_token}`);
  const names: string[] = [];
  for (const pg of pages.data || []) {
    if (!(pg.name || "").toLowerCase().includes(PAGE_NAME)) continue; // só a Página do painel
    await sb.from("meta_accounts").upsert({ kind: "page", account_id: pg.id, name: pg.name, token: pg.access_token, expires_at: null, updated_at: new Date().toISOString() }, { onConflict: "kind,account_id" });
    await api(`https://graph.facebook.com/${V}/${pg.id}/subscribed_apps?subscribed_fields=feed,messages,leadgen&access_token=${pg.access_token}`, { method: "POST" }).catch(() => null);
    names.push(pg.name);
  }
  return back(names.length ? `Página conectada: ${names.join(", ")}.` : "Nenhuma Página encontrada nessa conta do Facebook.");
}

// ───────── webhook ─────────
let lastSaveError = "";
async function save(row: Record<string, unknown>) {
  const { data, error } = await sb.from("social_inbox").upsert(row, { onConflict: "platform,kind,external_id", ignoreDuplicates: true }).select("id").maybeSingle();
  if (error) { console.error("social_inbox", error.message); lastSaveError = error.message; return null; }
  return data?.id ?? null;
}

async function autoReply(platform: "instagram" | "facebook", commentId: string, text: string, inboxId: string | null) {
  const { data: rules } = await sb.from("autoreply_rules").select("id, platform, keyword, dm_text, comment_reply, hits, version").eq("active", true).is("archived_at", null);
  const t = (text || "").toLowerCase();
  const rule = (rules || []).find((r) => (r.platform === "ambos" || r.platform === platform) && t.includes(r.keyword.toLowerCase().trim()));
  if (!rule) return;
  const sent: string[] = [];
  if (platform === "instagram") {
    const a = await account("instagram"); if (!a) return;
    if (rule.dm_text) { await post(`https://graph.instagram.com/${V}/me/messages?access_token=${a.token}`, { recipient: { comment_id: commentId }, message: { text: rule.dm_text } }); sent.push("DM"); }
    if (rule.comment_reply) { await api(`https://graph.instagram.com/${V}/${commentId}/replies?message=${encodeURIComponent(rule.comment_reply)}&access_token=${a.token}`, { method: "POST" }); sent.push("comentário"); }
  } else {
    const a = await account("page"); if (!a) return;
    if (rule.dm_text) { await post(`https://graph.facebook.com/${V}/${a.account_id}/messages?access_token=${a.token}`, { recipient: { comment_id: commentId }, message: { text: rule.dm_text } }); sent.push("DM"); }
    if (rule.comment_reply) { await api(`https://graph.facebook.com/${V}/${commentId}/comments?message=${encodeURIComponent(rule.comment_reply)}&access_token=${a.token}`, { method: "POST" }); sent.push("comentário"); }
  }
  await sb.from("autoreply_rules").update({ hits: rule.hits + 1 }).eq("id", rule.id);
  if (inboxId) await sb.from("social_inbox").update({ status: "respondido", auto_rule: rule.id, reply_text: `Automático (${sent.join(" + ")}): ${rule.dm_text || rule.comment_reply}` }).eq("id", inboxId);
}

async function handleEvent(body: any) {
  const ig = await account("instagram");
  for (const entry of body.entry || []) {
    if (body.object === "instagram") {
      for (const ch of entry.changes || []) {
        if (ch.field !== "comments") continue;
        const v = ch.value || {};
        if (ig && v.from?.id === ig.account_id) continue; // ignora os próprios comentários
        const id = await save({ platform: "instagram", kind: "comment", external_id: v.id, parent_id: v.media?.id, author_id: v.from?.id, author_name: v.from?.username ? "@" + v.from.username : null, text: v.text, data: v });
        if (id) await autoReply("instagram", v.id, v.text, id).catch((e) => console.error("autoreply ig", e.message));
      }
      for (const m of entry.messaging || []) {
        if (!m.message?.text || m.message.is_echo || (ig && m.sender?.id === ig.account_id)) continue;
        await save({ platform: "instagram", kind: "dm", external_id: m.message.mid, author_id: m.sender?.id, text: m.message.text, data: m });
      }
    } else if (body.object === "page") {
      for (const ch of entry.changes || []) {
        const v = ch.value || {};
        if (ch.field === "feed" && v.item === "comment" && v.verb === "add" && v.from?.id !== entry.id) {
          const id = await save({ platform: "facebook", kind: "comment", external_id: v.comment_id, parent_id: v.post_id, author_id: v.from?.id, author_name: v.from?.name, text: v.message, permalink: v.post?.permalink_url, data: v });
          if (id) await autoReply("facebook", v.comment_id, v.message, id).catch((e) => console.error("autoreply fb", e.message));
        }
        if (ch.field === "leadgen") await saveLead(v.leadgen_id, v).catch((e) => console.error("lead", e.message));
      }
      for (const m of entry.messaging || []) {
        if (!m.message?.text || m.message.is_echo || m.sender?.id === entry.id) continue;
        await save({ platform: "facebook", kind: "dm", external_id: m.message.mid, author_id: m.sender?.id, text: m.message.text, data: m });
      }
    }
  }
}

async function saveLead(leadId: string, meta: Record<string, unknown> = {}) {
  const pg = await account("page"); if (!pg) return;
  const l = await api(`https://graph.facebook.com/${V}/${leadId}?fields=created_time,field_data,form_id,ad_name,campaign_name&access_token=${pg.token}`);
  const f = Object.fromEntries((l.field_data || []).map((x: any) => [x.name, (x.values || []).join(", ")]));
  const name = f.full_name || f.nome || f.first_name || f.email || "Lead";
  const txt = Object.entries(f).map(([k, v]) => `${k}: ${v}`).join("\n");
  await save({ platform: "facebook", kind: "lead", external_id: leadId, parent_id: l.form_id, author_name: name, text: txt, data: { ...meta, ...l }, received_at: l.created_time || new Date().toISOString() });
}

// ───────── ações do painel ─────────
async function reply(id: string, text: string) {
  const { data: it } = await sb.from("social_inbox").select("*").eq("id", id).maybeSingle();
  if (!it) throw new Error("item não encontrado");
  if (!text?.trim()) throw new Error("resposta vazia");
  if (it.platform === "instagram") {
    const a = await account("instagram"); if (!a) throw new Error("Instagram não conectado");
    if (it.kind === "comment") await api(`https://graph.instagram.com/${V}/${it.external_id}/replies?message=${encodeURIComponent(text)}&access_token=${a.token}`, { method: "POST" });
    else if (it.kind === "dm") await post(`https://graph.instagram.com/${V}/me/messages?access_token=${a.token}`, { recipient: { id: it.author_id }, message: { text } });
    else throw new Error("lead não tem resposta automática por aqui");
  } else {
    const a = await account("page"); if (!a) throw new Error("Página não conectada");
    if (it.kind === "comment") await api(`https://graph.facebook.com/${V}/${it.external_id}/comments?message=${encodeURIComponent(text)}&access_token=${a.token}`, { method: "POST" });
    else if (it.kind === "dm") await post(`https://graph.facebook.com/${V}/me/messages?access_token=${a.token}`, { recipient: { id: it.author_id }, messaging_type: "RESPONSE", message: { text } });
    else throw new Error("para lead, responda pelo contato do formulário");
  }
  await sb.from("social_inbox").update({ status: "respondido", reply_text: text }).eq("id", id);
  return { ok: true };
}

// Puxa comentários recentes e leads (para quando o webhook ainda não estava ligado) e os números do Instagram.
async function sync() {
  const out: Record<string, unknown> = {};
  const ig = await account("instagram");
  if (ig) {
    const me = await api(`https://graph.instagram.com/${V}/me?fields=username,followers_count,follows_count,media_count&access_token=${ig.token}`);
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    await sb.from("social_stats").upsert({ day, platform: "instagram", followers: me.followers_count, following: me.follows_count, posts: me.media_count, data: { via: "api" } }, { onConflict: "day,platform" });
    const media = await api(`https://graph.instagram.com/${V}/me/media?fields=id,permalink,comments_count,like_count,caption,media_type,thumbnail_url,media_url,timestamp&limit=50&access_token=${ig.token}`);
    // Guarda legenda/capa de cada post: o painel mostra o nome do Reel em vez do código.
    const rows = (media.data || []).map((m: any) => ({ shortcode: (m.permalink || "").split("/").filter(Boolean).pop(), media_id: m.id, media_type: m.media_type, caption: m.caption || null, permalink: m.permalink, thumbnail: m.thumbnail_url || m.media_url || null, posted_at: m.timestamp, likes: m.like_count ?? null, comments: m.comments_count ?? null, updated_at: new Date().toISOString() })).filter((r: any) => r.shortcode);
    if (rows.length) { const { error } = await sb.from("ig_media").upsert(rows, { onConflict: "shortcode" }); if (error) lastSaveError = error.message; }
    // views de cada Reel pela API (precisa da permissão de insights; sem ela, segue sem as views)
    const reelViews: any[] = [];
    for (const m of (media.data || []).filter((m: any) => m.media_type === "VIDEO").slice(0, 12)) {
      const ins = await api(`https://graph.instagram.com/${V}/${m.id}/insights?metric=views&access_token=${ig.token}`).catch(() => null);
      const v = ins?.data?.[0]?.values?.[0]?.value ?? ins?.data?.[0]?.total_value?.value;
      const code = (m.permalink || "").split("/").filter(Boolean).pop();
      if (v != null && code) reelViews.push({ day, shortcode: code, views: v, thumbnail_url: m.thumbnail_url || null });
    }
    if (reelViews.length) await sb.from("reel_stats").upsert(reelViews, { onConflict: "day,shortcode" });
    out.reels_com_views = reelViews.length;
    media.data = (media.data || []).slice(0, 12);
    let n = 0, lidos = 0;
    for (const m of media.data || []) {
      if (m.comments_count === 0) continue;
      const cs = await api(`https://graph.instagram.com/${V}/${m.id}/comments?fields=id,text,username,from,timestamp&limit=50&access_token=${ig.token}`);
      for (const c of cs.data || []) {
        lidos++;
        if (c.from?.id === ig.account_id) continue;
        if (await save({ platform: "instagram", kind: "comment", external_id: c.id, parent_id: m.id, permalink: m.permalink, author_id: c.from?.id, author_name: c.username ? "@" + c.username : null, text: c.text, data: c, received_at: c.timestamp })) n++;
      }
    }
    out.instagram = { followers: me.followers_count, posts_lidos: (media.data || []).length, contagem_meta: (media.data || []).map((m: any) => m.comments_count ?? null), comentarios_lidos: lidos, novos_comentarios: n, ...(lastSaveError && { erro: lastSaveError }) };
  }
  const pg = await account("page");
  if (pg) {
    let n = 0, leads = 0;
    const posts = await api(`https://graph.facebook.com/${V}/${pg.account_id}/posts?fields=id,permalink_url,comments.limit(50){id,message,from,created_time}&limit=10&access_token=${pg.token}`);
    for (const p of posts.data || []) for (const c of p.comments?.data || []) {
      if (c.from?.id === pg.account_id) continue;
      if (await save({ platform: "facebook", kind: "comment", external_id: c.id, parent_id: p.id, permalink: p.permalink_url, author_id: c.from?.id, author_name: c.from?.name, text: c.message, data: c, received_at: c.created_time })) n++;
    }
    const forms = await api(`https://graph.facebook.com/${V}/${pg.account_id}/leadgen_forms?fields=id,name&limit=25&access_token=${pg.token}`).catch(() => ({ data: [] }));
    for (const f of forms.data || []) {
      const ls = await api(`https://graph.facebook.com/${V}/${f.id}/leads?fields=id&limit=50&access_token=${pg.token}`).catch(() => ({ data: [] }));
      for (const l of ls.data || []) { const { data: ex } = await sb.from("social_inbox").select("id").eq("platform", "facebook").eq("kind", "lead").eq("external_id", l.id).maybeSingle(); if (!ex) { await saveLead(l.id, { form_name: f.name }); leads++; } }
    }
    out.facebook = { novos_comentarios: n, novos_leads: leads };
  }
  return out;
}

// Insights da conta nos últimos 30 dias (alcance, views, interações, seguidores) + top posts, para o relatório.
async function igInsights() {
  const ig = await account("instagram"); if (!ig) throw new Error("Instagram não conectado");
  const until = Math.floor(Date.now() / 1000), since = until - 29 * 86400;
  const q = (metric: string, extra = "") => api(`https://graph.instagram.com/${V}/me/insights?metric=${metric}&period=day&since=${since}&until=${until}${extra}&access_token=${ig.token}`).catch((e) => ({ error: e.message }));
  const totals = await q("reach,views,accounts_engaged,total_interactions,likes,comments,shares,saves,follows_and_unfollows,profile_links_taps", "&metric_type=total_value");
  const daily = await q("reach");
  const { data: top } = await sb.from("ig_media").select("caption, posted_at, likes, comments, permalink").gte("posted_at", new Date(since * 1000).toISOString()).order("likes", { ascending: false }).limit(10);
  return { periodo: "últimos 30 dias", totais: totals, alcance_diario: daily, top_posts: top };
}

// Histórico para diagnóstico de alcance: alcance da conta mês a mês e views/alcance de cada post (até ~200 posts).
async function igHistory() {
  const ig = await account("instagram"); if (!ig) throw new Error("Instagram não conectado");
  const meses: any[] = [];
  const now = Math.floor(Date.now() / 1000);
  for (let i = 0; i < 9; i++) {  // 9 janelas de 30 dias para trás
    const until = now - i * 30 * 86400, since = until - 30 * 86400;
    const r = await api(`https://graph.instagram.com/${V}/me/insights?metric=reach,views,accounts_engaged,follows_and_unfollows&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${ig.token}`).catch((e) => ({ error: e.message }));
    meses.push({ de: new Date(since * 1000).toISOString().slice(0, 10), ate: new Date(until * 1000).toISOString().slice(0, 10), dados: r.data?.map((m: any) => ({ [m.name]: m.total_value?.value ?? m.total_value?.breakdowns })) ?? r });
  }
  const posts: any[] = [];
  let url = `https://graph.instagram.com/${V}/me/media?fields=id,caption,timestamp,media_type,like_count,comments_count,permalink&limit=50&access_token=${ig.token}`;
  for (let p = 0; p < 4 && url; p++) {
    const page = await api(url);
    for (const m of page.data || []) {
      const ins = await api(`https://graph.instagram.com/${V}/${m.id}/insights?metric=views,reach,shares,saved&access_token=${ig.token}`).catch(() => null);
      const val = (n: string) => ins?.data?.find((x: any) => x.name === n)?.values?.[0]?.value ?? ins?.data?.find((x: any) => x.name === n)?.total_value?.value ?? null;
      posts.push({ data: m.timestamp?.slice(0, 10), tipo: m.media_type, legenda: (m.caption || "").split("\n")[0].slice(0, 60), likes: m.like_count, comentarios: m.comments_count, views: val("views"), alcance: val("reach"), shares: val("shares"), salvos: val("saved") });
    }
    url = page.paging?.next || "";
  }
  return { meses, posts };
}

// Views dos Reels/vídeos da Página do Facebook, para comparar com o Instagram post a post.
async function fbHistory() {
  const pg = await account("page"); if (!pg) throw new Error("Página do Facebook não conectada");
  const out: any[] = [];
  let url = `https://graph.facebook.com/${V}/${pg.account_id}/video_reels?fields=id,description,created_time,permalink_url&limit=50&access_token=${pg.token}`;
  for (let p = 0; p < 5 && url; p++) {
    const page = await api(url).catch((e) => ({ error: e.message }));
    if ((page as any).error) { out.push({ erro: (page as any).error }); break; }
    for (const v of (page as any).data || []) {
      // "views" vem no próprio vídeo, sem precisar da permissão de insights (que o app não tem)
      const f = await api(`https://graph.facebook.com/${V}/${v.id}?fields=views,post_views&access_token=${pg.token}`).catch(() => ({}));
      out.push({ data: v.created_time?.slice(0, 10), legenda: (v.description || "").split("\n")[0].slice(0, 60), views: (f as any).views ?? null, views_post: (f as any).post_views ?? null, link: v.permalink_url });
    }
    url = (page as any).paging?.next || "";
  }
  return { pagina: pg.name, reels: out };
}

async function daily() {
  const ig = await account("instagram");
  if (ig) { // token do Instagram dura 60 dias: renova todo dia
    const r = await api(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${ig.token}`).catch(() => null);
    if (r?.access_token) await sb.from("meta_accounts").update({ token: r.access_token, expires_at: new Date(Date.now() + (r.expires_in || 5184000) * 1000).toISOString(), updated_at: new Date().toISOString() }).eq("kind", "instagram").eq("account_id", ig.account_id);
  }
  return sync();
}

// ───────── porta das rotinas do Claude (sem navegador): ?action=agente, cabeçalho x-agent-key ─────────
const READ = ["posts", "post_requests", "claude_requests", "x_posts", "x_goal_entries", "x_snapshots", "social_stats", "reel_stats", "ig_media", "reports", "radar_items", "postador_settings", "miner_links", "miner_profiles", "agenda_cache", "jobs"];
async function integration(key: string | null) {
  if (!key || key.length < 20) return null;
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const { data } = await sb.from("integrations").select("id, kind").eq("key_hash", hash).is("revoked_at", null).maybeSingle();
  if (data) await sb.from("integrations").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return data;
}

async function agente(req: Request) {
  const integ = await integration(req.headers.get("x-agent-key"));
  if (!integ) return json({ error: "não autorizado" }, 401);
  {
    const b = await req.json();
    if (b.op === "select") {
      if (!READ.includes(b.table)) return json({ error: "tabela não permitida" }, 400);
      let q: any = sb.from(b.table).select(b.select || "*");
      for (const [c, v] of Object.entries(b.eq || {})) q = q.eq(c, v);
      for (const c of b.is_null || []) q = q.is(c, null);
      for (const [c, v] of Object.entries(b.gte || {})) q = q.gte(c, v);
      if (b.order) q = q.order(b.order, { ascending: !!b.asc });
      q = q.limit(Math.min(Number(b.limit) || 100, 1000));
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return json({ data });
    }
    if (["insert", "upsert", "update"].includes(b.op)) {
      const rows = Array.isArray(b.rows) ? b.rows : [b.rows || b.patch || {}];
      const { data, error } = await sb.rpc("agent_write", { p_integration: integ.id, p_op: b.op, p_table: b.table, p_rows: rows, p_id: b.id ?? null, p_version: b.version ?? null });
      if (error) throw new Error(error.message);
      return json(data);
    }
    return json({ error: "op desconhecida (select, insert, upsert, update)" }, 400);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const u = new URL(req.url);
  try {
    // Webhook da Meta: verificação
    if (req.method === "GET" && u.searchParams.get("hub.mode") === "subscribe")
      return u.searchParams.get("hub.verify_token") === VERIFY_TOKEN ? new Response(u.searchParams.get("hub.challenge") || "", { status: 200 }) : new Response("token inválido", { status: 403 });
    if (u.pathname.endsWith("/callback-ig")) return await callbackIg(u);
    if (u.pathname.endsWith("/callback-fb")) return await callbackFb(u);
    // Webhook da Meta: eventos (assinados com a chave secreta do app)
    if (req.method === "POST" && req.headers.get("x-hub-signature-256")) {
      const raw = await req.text();
      if (!(await validSignature(req, raw))) return new Response("assinatura inválida", { status: 401 });
      await handleEvent(JSON.parse(raw));
      return new Response("ok", { status: 200 });
    }
    if (u.searchParams.get("action") === "agente") return await agente(req);
    if (req.headers.get("x-agent-key") && await integration(req.headers.get("x-agent-key"))) { /* rotinas do Claude podem chamar sync e ig_insights */ }
    else if (!(await authorized(req))) return json({ error: "não autorizado" }, 401);
    const action = u.searchParams.get("action") || "status";
    if (action === "connect") return json({ url: await connectUrl(u.searchParams.get("kind") === "page" ? "page" : "instagram") });
    if (action === "reply") { const b = await req.json().catch(() => ({})); return json(await reply(b.id, b.text)); }
    if (action === "sync") return json(await sync());
    if (action === "ig_insights") return json(await igInsights());
    if (action === "ig_history") return json(await igHistory());
    if (action === "fb_history") return json(await fbHistory());
    if (action === "ig_retention") {  // retenção dos Reels: tempo médio assistido e taxa de pulo (o que o Instagram usa pra distribuir)
      const ig = await account("instagram"); if (!ig) throw new Error("Instagram não conectado");
      const media = await api(`https://graph.instagram.com/${V}/me/media?fields=id,caption,timestamp,media_type&limit=40&access_token=${ig.token}`);
      const out: any[] = [];
      for (const m of (media.data || []).filter((x: any) => x.media_type === "VIDEO")) {
        const r = await fetch(`https://graph.instagram.com/${V}/${m.id}/insights?metric=views,reach,ig_reels_avg_watch_time,reels_skip_rate,shares,saved,likes&access_token=${ig.token}`).then((x) => x.json());
        const v: any = {}; for (const d of r.data || []) v[d.name] = d.values?.[0]?.value ?? d.total_value?.value;
        out.push({ data: m.timestamp?.slice(0, 10), legenda: (m.caption || "").split("\n")[0].slice(0, 50), ...v, erro: r.error?.message });
      }
      return json(out);
    }
    if (action === "ig_followtype") {  // alcance e views separados entre seguidores e não seguidores, janelas de 30 dias
      const ig = await account("instagram"); if (!ig) throw new Error("Instagram não conectado");
      const now = Math.floor(Date.now() / 1000), out: any[] = [];
      for (let i = 0; i < 9; i++) {
        const until = now - i * 30 * 86400, since = until - 30 * 86400;
        const r = await fetch(`https://graph.instagram.com/${V}/me/insights?metric=reach,views&period=day&metric_type=total_value&breakdown=follow_type&since=${since}&until=${until}&access_token=${ig.token}`).then((x) => x.json());
        out.push({ de: new Date(since * 1000).toISOString().slice(0, 10), r });
      }
      return json(out);
    }
    if (action === "fb_debug") {  // resposta crua da Meta para 1 Reel (diagnóstico)
      const pg = await account("page"); if (!pg) throw new Error("Página não conectada");
      const id = u.searchParams.get("id") || "";
      const a = await fetch(`https://graph.facebook.com/${V}/${id}/video_insights?access_token=${pg.token}`).then((r) => r.json());
      const b = await fetch(`https://graph.facebook.com/${V}/${id}?fields=views,length,post_views&access_token=${pg.token}`).then((r) => r.json());
      const c = await fetch(`https://graph.facebook.com/${V}/${id}/insights?metric=fb_reels_total_plays,post_video_views&access_token=${pg.token}`).then((r) => r.json());
      return json({ video_insights: a, campos: b, insights: c });
    }
    if (action === "daily") return json(await daily());
    if (action === "status") return json({ ig_secret: !!Deno.env.get("IG_APP_SECRET"), fb_secret: !!Deno.env.get("FB_APP_SECRET") });
    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    console.error(e);
    if (u.pathname.includes("/callback-")) return back("Erro ao conectar: " + (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
