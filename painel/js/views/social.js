import { h, fmtDateTime } from "../util.js";
import { pageHead, alertBox, toast } from "../ui.js";
import { CONFIG } from "../config.js";

// Social: Instagram + Página do Facebook. Comentários, DMs e leads chegam pela função "meta" (webhook);
// daqui você responde, cria respostas automáticas por palavra-chave e conecta as contas.
const PLAT = { instagram: ["IG", "Instagram"], facebook: ["FB", "Facebook"] };
const KIND = { comment: "Comentário", dm: "DM", lead: "Lead" };

export async function callMeta(sb, action, body) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error("sessão expirada, entre de novo");
  const r = await fetch(`${CONFIG.supabaseUrl}/functions/v1/meta?action=${action}${body?.kind ? "&kind=" + body.kind : ""}`, {
    method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, apikey: CONFIG.publishableKey, "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `erro ${r.status}`);
  return j;
}

export default async function social({ sb, query, go, refresh }) {
  const aba = ["inbox", "auto", "contas"].includes(query.aba) ? query.aba : "inbox";
  if (query.msg) setTimeout(() => toast(query.msg), 300);
  const tabs = h("div", { class: "mfilters" }, ...[["inbox", "Caixa de entrada"], ["auto", "Respostas automáticas"], ["contas", "Contas"]].map(([id, l]) =>
    h("button", { type: "button", class: "chip" + (aba === id ? " on" : ""), onclick: () => go("/social" + (id === "inbox" ? "" : "?aba=" + id)) }, l)));
  let body;
  if (aba === "inbox") body = await inbox(sb, query, go, refresh);
  else if (aba === "auto") body = await rules(sb, refresh);
  else body = await accounts(sb, refresh);
  return h("div", { class: "page" }, pageHead("Social", "Instagram e Página do Facebook"), tabs, body);
}

async function inbox(sb, query, go, refresh) {
  const f = ["comment", "dm", "lead"].includes(query.k) ? query.k : "";
  const st = query.st === "todos" ? "todos" : "novo";
  const COLS = "id, platform, kind, external_id, permalink, author_name, text, status, reply_text, received_at, version";
  const load = (cols) => {
    let q = sb.from("social_inbox").select(cols).is("archived_at", null).order("received_at", { ascending: false }).limit(200);
    if (f) q = q.eq("kind", f);
    if (st === "novo") q = q.eq("status", "novo");
    return q;
  };
  let { data, error } = await load(COLS + ", lead_status, lead_reason");
  const temLead = !error;
  if (error) ({ data, error } = await load(COLS)); // migration 0032 ainda não aplicada
  if (error) return alertBox("Não foi possível carregar a caixa de entrada.");
  const setLead = async (it, lead_status) => {
    const { data: d } = await sb.from("social_inbox").update({ lead_status, ...(lead_status === "novo" && !it.lead_reason && { lead_reason: "marcado à mão" }) }).eq("id", it.id).eq("version", it.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" }); toast(lead_status === "novo" ? "Foi para LeadS_." : "Tirado de LeadS_."); refresh();
  };
  const nav = (patch) => { const p = new URLSearchParams({ ...(f && { k: f }), ...(st !== "novo" && { st }), ...patch }); [...p].forEach(([k, v]) => !v && p.delete(k)); go("/social" + (p.toString() ? "?" + p : "")); };
  const setStatus = async (it, status) => {
    const { data: d } = await sb.from("social_inbox").update({ status }).eq("id", it.id).eq("version", it.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" }); refresh();
  };
  const item = (it) => {
    const ta = h("textarea", { class: "input", rows: 2, placeholder: it.kind === "dm" ? "Responder na DM" : "Responder o comentário" });
    const send = async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try { await callMeta(sb, "reply", { id: it.id, text: ta.value }); toast("Respondido."); refresh(); }
      catch (err) { toast("Não respondeu: " + err.message, { kind: "err" }); b.disabled = false; }
    };
    return h("article", { class: "sxitem" + (it.status !== "novo" ? " done" : "") },
      h("header", { class: "flex" }, h("span", { class: "ptag p-" + (it.platform === "instagram" ? "instagram" : "outro") }, PLAT[it.platform][0]),
        h("span", { class: "mono" }, KIND[it.kind]), h("b", { class: "truncate" }, it.author_name || "alguém"),
        it.lead_status && it.lead_status !== "descartado" && h("span", { class: "chip on", title: it.lead_reason || "" }, "lead"), h("div", { class: "grow" }),
        h("span", { class: "mono muted" }, fmtDateTime(it.received_at))),
      h("p", { class: "sxtext" }, it.text || "(sem texto)"),
      it.reply_text && h("p", { class: "muted small" }, "↳ ", it.reply_text),
      h("footer", { class: "flex" },
        it.permalink && h("a", { class: "mono", href: it.permalink, target: "_blank", rel: "noopener" }, it.kind === "dm" ? "abrir conversa ↗" : "ver post ↗"),
        h("div", { class: "grow" }),
        temLead && it.kind !== "lead" && (it.lead_status && it.lead_status !== "descartado"
          ? h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => setLead(it, "descartado") }, "Não é lead")
          : h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => setLead(it, "novo") }, "É lead")),
        it.status === "novo" ? h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => setStatus(it, "ignorado") }, "Ignorar")
          : h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => setStatus(it, "novo") }, "Voltar pra novos")),
      // item lido pela rotina do Chrome (external_id "chrome:...") não tem id da API: responde no próprio Instagram
      it.kind !== "lead" && it.status === "novo" && !String(it.external_id).startsWith("chrome:") && h("div", { class: "flex sxreply" }, ta, h("button", { class: "btn btn-sm", type: "button", onclick: send }, "Responder")),
      String(it.external_id).startsWith("chrome:") && h("p", { class: "muted small" }, "Lido pela rotina do Chrome. Responda pelo Instagram (link acima)."));
  };
  // Resultado da última busca (com os bloqueios da Meta) fica visível até a próxima, não só num aviso que some.
  const avisos = h("div", { class: "stack" });
  const mostrar = (r) => {
    const ig = r.instagram || {}, fb = r.facebook || {};
    const linhas = [...(ig.erro ? ["Instagram: " + ig.erro] : []), ...(ig.bloqueios || []).map((x) => "Instagram: " + x),
      ...(fb.erro ? ["Facebook: " + fb.erro] : []), ...(fb.bloqueios || []).map((x) => "Facebook: " + x)];
    avisos.replaceChildren(...linhas.map((t) => alertBox(t)));
  };
  try { const ult = JSON.parse(sessionStorage.getItem("aos:social-sync") || "null"); if (ult) mostrar(ult); } catch { /* sem sessionStorage */ }
  const syncBtn = h("button", { class: "btn btn-sm", type: "button", onclick: async (e) => {
    const b = e.currentTarget; b.disabled = true; b.textContent = "Buscando…";
    try {
      const r = await callMeta(sb, "sync");
      const ig = r.instagram, fb = r.facebook;
      toast(`Atualizado${ig && !ig.erro ? ` · IG ${ig.novos_comentarios || 0} comentários, ${ig.novas_dms || 0} DMs` : ""}${fb && !fb.erro ? ` · FB ${fb.novos_comentarios || 0} comentários, ${fb.novos_leads || 0} leads` : ""}.`);
      try { sessionStorage.setItem("aos:social-sync", JSON.stringify(r)); } catch { /* sem sessionStorage */ }
      refresh();
    }
    catch (err) { toast("Não deu: " + err.message, { kind: "err" }); b.disabled = false; b.textContent = "Buscar agora"; } } }, "Buscar agora");
  const chip = (id, label) => h("button", { type: "button", class: "chip" + (f === id ? " on" : ""), onclick: () => nav({ k: id }) }, label);
  return h("div", null,
    h("div", { class: "mfilters" }, chip("", "Tudo"), chip("comment", "Comentários"), chip("dm", "DMs"), chip("lead", "Leads"),
      h("button", { type: "button", class: "chip" + (st === "todos" ? " on" : ""), onclick: () => nav({ st: st === "todos" ? "" : "todos" }) }, st === "todos" ? "Mostrando todos" : "Só novos"),
      h("div", { class: "grow" }), syncBtn),
    avisos,
    (data || []).length ? h("div", { class: "stack" }, ...data.map(item)) : h("p", { class: "empty" }, "Nada por aqui ainda. Enquanto o app da Meta estiver em modo Desenvolvimento, a API não entrega comentários e DMs de outras pessoas: quem traz é a rotina do Chrome (leitura da caixa do Instagram), que grava aqui e em LeadS_."));
}

async function rules(sb, refresh) {
  const { data, error } = await sb.from("autoreply_rules").select("id, platform, keyword, dm_text, comment_reply, active, hits, version").is("archived_at", null).order("created_at", { ascending: false });
  if (error) return alertBox("Não foi possível carregar as respostas automáticas.");
  const kw = h("input", { class: "input", placeholder: "Palavra-chave (ex.: PROMPT)", required: true, maxlength: 60 });
  const pl = h("select", { class: "input" }, h("option", { value: "ambos" }, "Instagram e Facebook"), h("option", { value: "instagram" }, "Só Instagram"), h("option", { value: "facebook" }, "Só Facebook"));
  const dm = h("textarea", { class: "input", rows: 3, placeholder: "Mensagem da DM (ex.: aqui está o prompt: ...)" });
  const cr = h("input", { class: "input", placeholder: "Resposta pública no comentário (opcional, ex.: te mandei na DM!)", maxlength: 300 });
  const form = h("form", { class: "panel" }, h("div", { class: "panel-body stack" }, h("div", { class: "flex" }, kw, pl), dm, cr, h("div", null, h("button", { class: "btn", type: "submit" }, "Criar resposta automática"))));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!dm.value.trim() && !cr.value.trim()) return toast("Escreva a DM ou a resposta do comentário.", { kind: "err" });
    const { error: err } = await sb.from("autoreply_rules").insert({ keyword: kw.value.trim(), platform: pl.value, dm_text: dm.value.trim() || null, comment_reply: cr.value.trim() || null });
    if (err) return toast("Não foi possível salvar.", { kind: "err" }); toast("Criada."); refresh();
  });
  const upd = async (r, patch, ok) => { const { data: d } = await sb.from("autoreply_rules").update(patch).eq("id", r.id).eq("version", r.version).select("id").maybeSingle(); if (!d) return toast("Recarregue a página.", { kind: "err" }); toast(ok); refresh(); };
  return h("div", { class: "stack" },
    h("p", { class: "muted small" }, "Quando alguém comentar um post com a palavra-chave, o painel manda a DM sozinho e, se quiser, responde o comentário. Vale para Instagram e Página do Facebook."),
    form,
    ...(data || []).map((r) => h("article", { class: "sxitem" + (r.active ? "" : " done") },
      h("header", { class: "flex" }, h("b", { class: "mono" }, r.keyword.toUpperCase()), h("span", { class: "mono muted" }, r.platform === "ambos" ? "IG + FB" : PLAT[r.platform][1]), h("div", { class: "grow" }), h("span", { class: "mono muted" }, `${r.hits} envios`)),
      r.dm_text && h("p", { class: "sxtext" }, "DM: ", r.dm_text),
      r.comment_reply && h("p", { class: "muted small" }, "Comentário: ", r.comment_reply),
      h("footer", { class: "flex" }, h("div", { class: "grow" }),
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => upd(r, { active: !r.active }, r.active ? "Pausada." : "Ativada.") }, r.active ? "Pausar" : "Ativar"),
        h("button", { class: "btn btn-ghost btn-sm danger", type: "button", onclick: () => upd(r, { archived_at: new Date().toISOString() }, "Removida.") }, "Remover")))));
}

async function accounts(sb, refresh) {
  const { data } = await sb.from("meta_accounts").select("kind, account_id, name, expires_at, updated_at").order("updated_at", { ascending: false });
  const st = await callMeta(sb, "status").catch(() => ({}));
  const connect = (kind) => async (e) => {
    const b = e.currentTarget; b.disabled = true;
    try { const { url } = await callMeta(sb, "connect", { kind }); location.href = url; }
    catch (err) { toast("Não deu: " + err.message, { kind: "err" }); b.disabled = false; }
  };
  const row = (kind, label, ok) => {
    const acc = (data || []).filter((a) => a.kind === kind);
    return h("section", { class: "panel", style: { marginBottom: "16px" } },
      h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: acc.length ? "var(--accent)" : "var(--tx-4)" } }), h("h2", { class: "mono grow" }, label), h("span", { class: "mono" }, acc.length ? "conectado" : "não conectado")),
      h("div", { class: "panel-body stack" },
        ...acc.map((a) => h("div", { class: "flex" }, h("b", null, a.name || a.account_id), h("span", { class: "mono muted small" }, a.expires_at ? `token renova sozinho · vence ${fmtDateTime(a.expires_at)}` : "token sem vencimento"))),
        !ok && h("p", { class: "alert" }, kind === "instagram" ? "Falta colar a chave secreta do app do Instagram no Supabase (IG_APP_SECRET)." : "Falta colar a chave secreta do app da Meta no Supabase (FB_APP_SECRET)."),
        h("div", null, h("button", { class: "btn btn-sm", type: "button", disabled: !ok, onclick: connect(kind) }, acc.length ? "Reconectar" : "Conectar"))));
  };
  return h("div", null, row("instagram", "Instagram · @andersonbrito.mp4", st.ig_secret), row("page", "Página do Facebook (comentários, Messenger e leads)", st.fb_secret));
}
