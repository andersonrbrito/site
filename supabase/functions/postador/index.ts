// Edge Function "postador" · publica no X/LinkedIn, busca o Radar e coleta Insights.
// Chamada pelo cron (cabeçalho x-cron-key = segredo do Vault) ou pelo painel (sessão do dono).
// Ações: ?action=tick | radar | insights | ping
// Secrets necessários: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET, X_HANDLE
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm do próprio Supabase.)
import { createClient } from "jsr:@supabase/supabase-js@2";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const API = "https://api.x.com/2";
const BUCKET = "postador-media";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-cron-key, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ───────── OAuth 1.0a (assinatura HMAC-SHA1) ─────────
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
async function hmacSha1(key: string, data: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
  return btoa(String.fromCharCode(...sig));
}
async function oauthHeader(method: string, fullUrl: string) {
  const e = (n: string) => { const v = Deno.env.get(n); if (!v) throw new Error(`secret ${n} ausente`); return v; };
  const u = new URL(fullUrl);
  const oauth: Record<string, string> = {
    oauth_consumer_key: e("X_API_KEY"), oauth_nonce: crypto.randomUUID().replace(/-/g, ""), oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_token: e("X_ACCESS_TOKEN"), oauth_version: "1.0",
  };
  const all = [...Object.entries(oauth), ...u.searchParams.entries()].map(([a, b]) => [enc(a), enc(b)]).sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1));
  const base = [method.toUpperCase(), enc(u.origin + u.pathname), enc(all.map(([a, b]) => `${a}=${b}`).join("&"))].join("&");
  oauth.oauth_signature = await hmacSha1(`${enc(e("X_API_SECRET"))}&${enc(e("X_ACCESS_SECRET"))}`, base);
  return "OAuth " + Object.keys(oauth).sort().map((k) => `${enc(k)}="${enc(oauth[k])}"`).join(", ");
}
async function xCall(method: string, url: string, opts: { json?: unknown; form?: FormData } = {}) {
  const headers: Record<string, string> = { Authorization: await oauthHeader(method, url) };
  let body: BodyInit | undefined;
  if (opts.json) { headers["Content-Type"] = "application/json"; body = JSON.stringify(opts.json); }
  if (opts.form) body = opts.form;
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) throw new Error(`X ${res.status}: ${data.detail || data.title || text.slice(0, 200)}`);
  return data;
}

// ───────── Configurações e orçamento de leituras ─────────
async function settings() {
  const { data } = await sb.from("postador_settings").select("key, value");
  return Object.fromEntries((data || []).map((r: any) => [r.key, r.value])) as Record<string, any>;
}
const setSetting = (key: string, value: unknown) => sb.from("postador_settings").upsert({ key, value, updated_at: new Date().toISOString() });
const spDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
async function spendReads(n: number, s: Record<string, any>) {
  const u = s.x_reads?.day === spDay() ? s.x_reads : { day: spDay(), reads: 0 };
  u.reads += n; s.x_reads = u; await setSetting("x_reads", u);
}
const readsLeft = (s: Record<string, any>) => Number(s.x_read_daily_limit ?? 40) - (s.x_reads?.day === spDay() ? s.x_reads.reads : 0);

// ───────── Publicação ─────────
const splitThread = (t: string) => t.split(/\n\s*---\s*\n/).map((x) => x.trim()).filter(Boolean);
async function mediaBlob(path: string) {
  const { data, error } = await sb.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`mídia não encontrada: ${path}`);
  return data;
}
async function xUpload(m: { path: string; mime: string }) {
  const blob = await mediaBlob(m.path);
  const isVideo = m.mime.startsWith("video/"), isGif = m.mime === "image/gif";
  if (!isVideo && !isGif) {
    const form = new FormData(); form.append("media", new Blob([blob], { type: m.mime }), "image"); form.append("media_category", "tweet_image");
    return (await xCall("POST", `${API}/media/upload`, { form })).data.id as string;
  }
  const buf = new Uint8Array(await blob.arrayBuffer());
  const id = (await xCall("POST", `${API}/media/upload/initialize`, { json: { media_type: m.mime, total_bytes: buf.length, media_category: isVideo ? "tweet_video" : "tweet_gif" } })).data.id;
  const CHUNK = 4 * 1024 * 1024;
  for (let i = 0, seg = 0; i < buf.length; i += CHUNK, seg++) {
    const form = new FormData(); form.append("segment_index", String(seg)); form.append("media", new Blob([buf.subarray(i, i + CHUNK)]), "chunk");
    await xCall("POST", `${API}/media/upload/${id}/append`, { form });
  }
  let info = (await xCall("POST", `${API}/media/upload/${id}/finalize`)).data?.processing_info;
  while (info && ["pending", "in_progress"].includes(info.state)) {
    await new Promise((r) => setTimeout(r, (info.check_after_secs || 2) * 1000));
    info = (await xCall("GET", `${API}/media/upload?command=STATUS&media_id=${id}`)).data?.processing_info;
  }
  if (info?.state === "failed") throw new Error("X recusou o vídeo");
  return id as string;
}
async function postX(p: any) {
  const ids: string[] = [];
  for (const m of p.media || []) ids.push(await xUpload(m));
  let first: string | null = null, prev: string | null = null;
  for (const [i, part] of splitThread(p.body).entries()) {
    const body: any = { text: part };
    if (i === 0 && ids.length) body.media = { media_ids: ids };
    if (prev) body.reply = { in_reply_to_tweet_id: prev };
    prev = (await xCall("POST", `${API}/tweets`, { json: body })).data.id;
    if (i === 0) first = prev;
  }
  return { id: first, url: first ? `https://x.com/${Deno.env.get("X_HANDLE") || "i"}/status/${first}` : null };
}
async function postLinkedIn(p: any) {
  const token = Deno.env.get("LINKEDIN_ACCESS_TOKEN"), author = Deno.env.get("LINKEDIN_PERSON_URN");
  if (!token || !author) throw new Error("LinkedIn ainda não conectado na nuvem");
  const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "LinkedIn-Version": Deno.env.get("LINKEDIN_VERSION") || "202609", "X-Restli-Protocol-Version": "2.0.0" };
  const images: string[] = [];
  for (const m of p.media || []) {
    if (!m.mime.startsWith("image/")) throw new Error("LinkedIn: só imagens por enquanto");
    const init = await fetch("https://api.linkedin.com/rest/images?action=initializeUpload", { method: "POST", headers: H, body: JSON.stringify({ initializeUploadRequest: { owner: author } }) });
    if (!init.ok) throw new Error(`LinkedIn imagem ${init.status}`);
    const { value } = await init.json();
    const put = await fetch(value.uploadUrl, { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": m.mime }, body: await mediaBlob(m.path) });
    if (!put.ok) throw new Error(`LinkedIn upload ${put.status}`);
    images.push(value.image);
  }
  const content = images.length === 1 ? { media: { id: images[0] } } : images.length > 1 ? { multiImage: { images: images.map((id) => ({ id })) } } : undefined;
  const res = await fetch("https://api.linkedin.com/rest/posts", { method: "POST", headers: H, body: JSON.stringify({
    author, commentary: p.body.replace(/[\\|{}@\[\]()<>#*_~]/g, (c: string) => "\\" + c), visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] }, ...(content ? { content } : {}), lifecycleState: "PUBLISHED", isReshareDisabledByAuthor: false }) });
  if (!res.ok) throw new Error(`LinkedIn ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const id = res.headers.get("x-restli-id");
  return { id, url: id ? `https://www.linkedin.com/feed/update/${id}/` : null };
}

async function tick() {
  const s = await settings();
  if (!s.publisher_active) await setSetting("publisher_active", true);
  const { data: due } = await sb.from("posts").select("*").eq("status", "approved").is("archived_at", null).lte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(5);
  const out: any[] = [];
  for (const p of due || []) {
    // Trava: só um processo pega o post (approved → posting com a versão atual).
    const { data: lock } = await sb.from("posts").update({ status: "posting" }).eq("id", p.id).eq("status", "approved").eq("version", p.version).select("id, version").maybeSingle();
    if (!lock) continue;
    try {
      if (p.network === "x") {
        const { count } = await sb.from("posts").select("id", { count: "exact", head: true }).eq("network", "x").eq("status", "posted").gte("posted_at", new Date(`${spDay()}T00:00:00-03:00`).toISOString());
        if ((count ?? 0) >= Number(s.x_daily_limit ?? 10)) throw new Error(`limite diário de ${s.x_daily_limit ?? 10} posts no X atingido`);
      }
      const r = p.network === "x" ? await postX(p) : await postLinkedIn(p);
      await sb.from("posts").update({ status: "posted", posted_at: new Date().toISOString(), external_id: r.id, external_url: r.url, error: null }).eq("id", p.id).eq("version", lock.version);
      out.push({ id: p.id, ok: true, url: r.url });
    } catch (e) {
      await sb.from("posts").update({ status: "failed", error: String((e as Error).message).slice(0, 500) }).eq("id", p.id).eq("version", lock.version);
      out.push({ id: p.id, ok: false, error: (e as Error).message });
    }
  }
  return { published: out };
}

// ───────── Radar (só contas verificadas) ─────────
const isVerified = (u: any) => u && (u.verified || ["blue", "business", "government"].includes(u.verified_type));
async function search(q: string, max = 10) {
  const qs = new URLSearchParams({ query: /is:verified/.test(q) ? q : `${q} is:verified`, max_results: String(Math.max(10, max)), sort_order: "relevancy",
    "tweet.fields": "created_at,public_metrics", expansions: "author_id", "user.fields": "name,username,profile_image_url,verified,verified_type,public_metrics" });
  let r: any;
  try { r = await xCall("GET", `${API}/tweets/search/recent?${qs}`); }
  catch (e) { if (!/400/.test((e as Error).message)) throw e; qs.set("query", q); r = await xCall("GET", `${API}/tweets/search/recent?${qs}`); }
  const users = Object.fromEntries(((r.includes?.users) || []).map((u: any) => [u.id, u]));
  return (r.data || []).map((t: any) => ({ ...t, author: users[t.author_id] || null }));
}
async function radar() {
  const s = await settings();
  const plan: [string, string[]][] = [["talk", s.radar_talk_queries || []], ["follow", s.radar_follow_queries || []]];
  let saved = 0, read = 0;
  for (const [kind, queries] of plan) for (const q of queries) {
    if (readsLeft(s) < 10) return { saved, read, budgetHit: true };
    const found = await search(q, 10); read += found.length; await spendReads(found.length, s);
    const rows = found.filter((t: any) => isVerified(t.author)).map((t: any) => ({ kind, tweet_id: t.id, author: t.author, text: t.text, metrics: t.public_metrics || {}, tweet_created_at: t.created_at }));
    if (rows.length) { await sb.from("radar_items").upsert(rows, { onConflict: "kind,tweet_id", ignoreDuplicates: true }); saved += rows.length; }
  }
  // Arquiva itens com mais de 5 dias.
  await sb.from("radar_items").update({ archived_at: new Date().toISOString() }).is("archived_at", null).lt("tweet_created_at", new Date(Date.now() - 5 * 864e5).toISOString());
  return { saved, read };
}

// ───────── Insights ─────────
async function insights() {
  const s = await settings();
  if (readsLeft(s) < 11) return { skipped: "teto diário de leituras" };
  const me = (await xCall("GET", `${API}/users/me?user.fields=profile_image_url,name,username,public_metrics`)).data;
  const tw = (await xCall("GET", `${API}/users/${me.id}/tweets?max_results=10&exclude=retweets,replies&tweet.fields=created_at,public_metrics`)).data || [];
  await spendReads(1 + tw.length, s);
  await sb.from("x_snapshots").insert({ followers: me.public_metrics?.followers_count ?? null, tweets: tw });
  await setSetting("profile", { ...(s.profile || {}), name: me.name, username: me.username, avatar: String(me.profile_image_url || "").replace("_normal", "_400x400") });
  return { followers: me.public_metrics?.followers_count, tweets: tw.length };
}

// ───────── Autorização ─────────
async function authorized(req: Request) {
  const cron = req.headers.get("x-cron-key");
  if (cron) {
    const { data } = await sb.rpc("postador_cron_key");
    return !!data && cron === data;
  }
  const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!token) return false;
  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user) return false;
  const { data: m } = await sb.from("app_members").select("role, modules").eq("user_id", u.user.id).maybeSingle();
  return !!m && (m.role === "owner" || (m.modules || []).includes("postador"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (!(await authorized(req))) return json({ error: "não autorizado" }, 401);
  const action = new URL(req.url).searchParams.get("action") || "tick";
  try {
    if (action === "tick") return json(await tick());
    if (action === "radar") return json(await radar());
    if (action === "insights") return json(await insights());
    if (action === "ping") return json({ ok: true, x: !!Deno.env.get("X_API_KEY"), linkedin: !!Deno.env.get("LINKEDIN_ACCESS_TOKEN") });
    return json({ error: "ação desconhecida" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
