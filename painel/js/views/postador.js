import { h, fmtDateTime, fmtDate, todayISO, dayOf, TZ } from "../util.js";
import { pageHead, alertBox, toast } from "../ui.js";
import { CONFIG } from "../config.js";
import { lineChart, reportBox } from "./desempenho.js";

// Chama o robô da nuvem com a sessão do dono (Radar e Insights sob demanda).
async function runCloud(sb, action, btn, label) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return toast("Sessão expirada. Entre de novo.", { kind: "err" });
  btn.disabled = true; btn.textContent = "Buscando…";
  try {
    const r = await fetch(`${CONFIG.supabaseUrl}/functions/v1/postador?action=${action}`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, apikey: CONFIG.publishableKey } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `erro ${r.status}`);
    if (j.skipped || j.budgetHit) toast("Teto diário de leituras do X atingido. Tenta amanhã.", { kind: "err" });
    else toast(action === "radar" ? `${j.saved ?? 0} itens de verificados no Radar.` : `Métricas atualizadas (${j.posts ?? 0} posts).`);
    return true;
  } catch (e) { toast("Não deu: " + e.message, { kind: "err" }); return false; }
  finally { btn.disabled = false; btn.textContent = label; }
}

// Postador: rascunhos → aprovação → publicação agendada no X e no LinkedIn.
// Quem publica é a Edge Function "postador" (cron no Supabase); esta tela só edita e aprova.
const BUCKET = "postador-media";
const STATUS = { pending: "Para aprovar", approved: "Agendados", posted: "Publicados", failed: "Com erro", rejected: "Recusados" };
const PILL = { pending: "Rascunho", approved: "Agendado", posting: "Publicando", posted: "Publicado", failed: "Erro", rejected: "Recusado" };
const LIMIT = { x: 25000, linkedin: 3000 };
const PROFILE_DEFAULT = { name: "Britinho edições", username: "andersbrito", avatar: "../assets/anderson-sony.jpg", linkedinName: "Anderson Brito", headline: "Editor de Vídeo & AI Video Creator" };
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"];

// Contagem no estilo do X: link vale 23, emoji/CJK valem 2.
export function xLength(t) {
  let n = 0;
  const rest = t.replace(/https?:\/\/\S+/g, () => { n += 23; return ""; });
  for (const ch of rest) { const c = ch.codePointAt(0); n += c <= 4351 || (c >= 8192 && c <= 8205) || (c >= 8208 && c <= 8223) || (c >= 8242 && c <= 8247) ? 1 : 2; }
  return n;
}
export const threadParts = (t) => t.split(/\n\s*---\s*\n/).map((s) => s.trim()).filter(Boolean);
const spDay = (ts) => dayOf(ts);
const fromLocalInput = (v) => new Date(`${v}:00-03:00`).toISOString();
const k = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + "M" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(".0", "") + "K" : String(n ?? 0));
const ago = (ts) => { const m = Math.round((Date.now() - new Date(ts)) / 6e4); return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };

// Próximo horário livre (fuso de SP), respeitando o limite diário do X.
export function nextSlot(posts, network, settings, now = Date.now()) {
  const slots = network === "x" ? settings.x_slots : settings.linkedin_slots;
  const busy = posts.filter((p) => p.network === network && ["approved", "posting", "posted"].includes(p.status) && p.scheduled_at);
  const taken = new Set(busy.map((p) => new Date(p.scheduled_at).getTime()));
  for (let d = 0; d < 30; d++) {
    const day = todayISO(new Date(now + d * 864e5));
    if (network === "x" && busy.filter((p) => spDay(p.scheduled_at) === day).length >= settings.x_daily_limit) continue;
    for (const s of slots) {
      const t = new Date(`${day}T${s}:00-03:00`).getTime();
      if (t > now + 60000 && !taken.has(t)) return new Date(t).toISOString();
    }
  }
  return null;
}

export default async function postador(ctx) {
  const { sb, query, go, refresh } = ctx;
  if (query.aba === "insights") { go("/desempenho"); return h("div"); }
  const aba = ["fila", "historico", "radar", "pedidos", "estudio"].includes(query.aba) ? query.aba : query.aba === "calendario" ? "historico" : "fila";
  // Novo post: abre o editor vazio; só vira rascunho no banco quando você escrever algo.
  const novo = query.novo === "x" || query.novo === "linkedin" ? query.novo : null;

  const [postsR, setR] = await Promise.all([
    sb.from("posts").select("id, network, title, body, notes, media, image_urls, status, scheduled_at, posted_at, external_url, error, is_viral_bet, version, created_at").is("archived_at", null).order("created_at", { ascending: false }).limit(400),
    sb.from("postador_settings").select("key, value"),
  ]);
  if (postsR.error) return h("div", { class: "page" }, pageHead("Postador", "X e LinkedIn"), alertBox("Não foi possível carregar os posts. Atualize a página."));
  const posts = postsR.data || [];
  const settings = { x_daily_limit: 10, x_slots: ["11:30"], linkedin_slots: ["13:30"], x_read_daily_limit: 40, ...Object.fromEntries((setR.data || []).map((r) => [r.key, r.value])) };
  const profile = { ...PROFILE_DEFAULT, ...(settings.profile || {}) };
  const today = todayISO();
  const xToday = posts.filter((p) => p.network === "x" && p.status === "posted" && p.posted_at && spDay(p.posted_at) === today).length;
  const cloudOn = !!settings.publisher_active;

  const TABS = [["fila", "Rascunhos", "M4 5h16v14H4zM8 9h8M8 13h5"], ["historico", "Histórico", "M12 7v5l3 2M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4"], ["radar", "Radar", "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM12 12l6-6"], ["pedidos", "Pedir posts", "M4 5h16v11H8l-4 4zM8 10h8"], ["estudio", "Estúdio", "M4 6h16v12H4zM10 9l5 3-5 3z"]];
  const tabIcon = (d) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", "20"); s.setAttribute("height", "20"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.8"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); const pa = document.createElementNS("http://www.w3.org/2000/svg", "path"); pa.setAttribute("d", d); s.append(pa); return s; };
  const pending = posts.filter((p) => p.status === "pending").length;
  const brand = h("div", { class: "pbrand" },
    h("div", { class: "plogo" }, tabIcon("M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16zM14 7l3 3"), h("span", null, "POSTADO", h("b", null, "R_"))),
    h("span", { class: "mono muted hide-sm" }, "X e LinkedIn"),
    h("div", { class: "grow" }),
    h("span", { class: "mono" }, `X hoje ${xToday}/${settings.x_daily_limit}`),
    h("span", { class: "meter" }, h("b", { style: { width: `${Math.min(100, (xToday / settings.x_daily_limit) * 100)}%` } })),
    h("a", { class: "btn btn-sm", href: "#/postador?novo=x" }, "+ X"), h("a", { class: "btn btn-ghost btn-sm", href: "#/postador?novo=linkedin" }, "+ LinkedIn"));
  const tabs = h("nav", { class: "pbig" }, ...TABS.map(([id, l, d]) => h("a", { href: `#/postador?aba=${id}`, class: aba === id ? "on" : "" }, tabIcon(d), h("span", null, l), id === "fila" && pending ? h("b", null, pending) : null)));
  const warn = !cloudOn && h("p", { class: "note" }, "Publicação automática na nuvem ainda não ativada: você já pode revisar, editar e aprovar, mas nada sai até ligarmos as chaves do X no Supabase.");

  let body;
  if (aba === "historico") body = calendarView(posts, query, go, settings);
  else if (aba === "radar") body = await radarView(sb, query, go, refresh);
  else if (aba === "pedidos") body = await requestsView(sb, refresh);
  else if (aba === "estudio") body = await studioView(sb, posts, profile, query, refresh);
  else body = await queueView({ sb, query, go, refresh, posts, settings, profile, today, novo });
  return h("div", { class: "page postador" }, brand, tabs, warn, body);
}

// ───────────────────────── Fila + editor ─────────────────────────
async function queueView({ sb, query, go, refresh, posts, settings, profile, novo }) {
  const blank = novo ? { id: null, network: novo, title: "", body: "", notes: "", media: [], status: "pending", version: 1, created_at: new Date().toISOString() } : null;
  let sel = blank || posts.find((p) => p.id === query.id) || null;
  const view = STATUS[query.status] ? query.status : sel ? (sel.status === "posting" ? "approved" : sel.status) : "pending";
  const net = ["x", "linkedin"].includes(query.rede) ? query.rede : "";
  let list = posts.filter((p) => (p.status === view || (view === "approved" && p.status === "posting")) && (!net || p.network === net));
  if (view === "approved") list = list.sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  if (view === "posted") list = list.sort((a, b) => (b.posted_at || "").localeCompare(a.posted_at || ""));
  const qs = (patch) => { const p = new URLSearchParams({ status: view, ...(net && { rede: net }), ...patch }); [...p].forEach(([a, b]) => !b && p.delete(a)); return "#/postador?" + p; };
  const count = (s) => posts.filter((p) => (p.status === s || (s === "approved" && p.status === "posting")) && (!net || p.network === net)).length;

  const nav = h("div", { class: "qnav" },
    ...Object.entries(STATUS).map(([s, l]) => h("a", { href: qs({ status: s, id: "" }), class: view === s ? "on" : "" }, l, h("b", null, count(s)))),
    h("div", { class: "grow" }),
    ...[["", "Todas"], ["x", "X"], ["linkedin", "LinkedIn"]].map(([n, l]) => h("a", { class: "chip" + (net === n ? " on" : ""), href: qs({ rede: n, id: "" }) }, l)));

  const card = (p) => {
    const when = p.status === "approved" ? fmtDateTime(p.scheduled_at) : p.status === "posted" ? fmtDateTime(p.posted_at) : fmtDateTime(p.created_at);
    const first = p.body.split("\n").find((l) => l.trim()) || "(sem texto)";
    return h("a", { class: "pcard" + (p.id === sel?.id ? " sel" : ""), href: qs({ id: p.id }), dataset: { id: p.id }, onclick: (e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); openPost(p); } },
      h("div", { class: "pc-top" }, netBadge(p.network), h("span", { class: "pill " + p.status }, PILL[p.status]), p.is_viral_bet && h("span", { class: "pill viral" }, "VIRAL"), h("span", { class: "muted" }, when)),
      p.title ? [h("div", { class: "pc-t" }, p.title), h("div", { class: "pc-x" }, first)] : h("div", { class: "pc-t" }, first),
      p.media?.length ? h("div", { class: "mono muted", style: { marginTop: "6px" } }, `${p.media.length} mídia${p.media.length > 1 ? "s" : ""}`) : null);
  };

  const placeholder = () => h("div", { class: "placeholder" }, h("p", null, "Escolha um rascunho na lista"), h("p", { class: "muted small" }, "ou crie um novo com + X / + LinkedIn"));
  const editorBox = h("div", { class: "qeditor" });
  const grid = h("div", { class: "qgrid" + (sel ? " editing" : "") });
  const listBox = h("div", { class: "qlist" }, list.length ? list.map(card) : h("p", { class: "empty" }, "Nada por aqui."));
  // Abre o post na hora: troca só o editor, sem recarregar a lista nem o painel.
  let opening = 0;
  async function openPost(p) {
    const my = ++opening;
    sel = p;
    history.replaceState(null, "", qs({ id: p.id }));
    listBox.querySelectorAll(".pcard").forEach((c) => c.classList.toggle("sel", c.dataset.id === p.id));
    grid.classList.add("editing");
    const ed = await editorView({ sb, p, posts, settings, profile, go, refresh, qs, onCreated: (row) => { history.replaceState(null, "", qs({ id: row.id })); } });
    if (my === opening) { editorBox.replaceChildren(ed); window.scrollTo(0, 0); }
  }
  editorBox.append(sel ? await editorView({ sb, p: sel, posts, settings, profile, go, refresh, qs, onCreated: (row) => { history.replaceState(null, "", qs({ id: row.id, status: "pending" })); } }) : placeholder());
  grid.append(listBox, editorBox);
  return h("div", null, nav, grid);
}

const netBadge = (n) => h("span", { class: "netb n-" + n }, n === "x" ? "X" : "in");

async function signedUrls(sb, media) {
  const out = {};
  await Promise.all((media || []).map(async (m) => { const { data } = await sb.storage.from(BUCKET).createSignedUrl(m.path, 3600); if (data) out[m.path] = data.signedUrl; }));
  return out;
}

async function editorView({ sb, p, posts, settings, profile, go, refresh, qs, onCreated }) {
  const locked = p.status === "posted" || p.status === "posting";
  const isX = p.network === "x";
  let version = p.version, tab = "write";
  const urls = await signedUrls(sb, p.media);

  const saved = h("span", { class: "mono muted" }, "");
  // Salvamento automático com controle de versão.
  let timer = null, pending = null;
  // Rascunho novo: só entra no banco quando tiver texto ou mídia.
  const ensureRow = async () => {
    if (p.id) return true;
    const { data, error } = await sb.from("posts").insert({ network: p.network, title: p.title, body: p.body }).select("id, version").maybeSingle();
    if (error || !data) { saved.textContent = "Não foi possível criar o rascunho."; return false; }
    p.id = data.id; version = data.version; posts.unshift(p); onCreated?.(data); saved.textContent = "Rascunho salvo"; return true;
  };
  const save = async () => {
    if (!pending) return;
    if (!p.id) { if (!p.body.trim() && !p.title.trim()) { pending = null; saved.textContent = ""; return true; } pending = null; return ensureRow(); }
    const patch = pending; pending = null;
    const { data, error } = await sb.from("posts").update(patch).eq("id", p.id).eq("version", version).select("version").maybeSingle();
    if (error || !data) { saved.textContent = "Não salvou: o post mudou em outro lugar. Recarregue."; return false; }
    version = data.version; saved.textContent = "Salvo"; return true;
  };
  const queue = (patch) => { pending = { ...(pending || {}), ...patch }; saved.textContent = "Editando…"; clearTimeout(timer); timer = setTimeout(save, 700); };
  const flush = async () => { clearTimeout(timer); return pending ? save() : true; };
  window.addEventListener("hashchange", flush, { once: true });

  const titleIn = h("input", { class: "input", placeholder: "Título interno (só você vê)", value: p.title, disabled: locked, oninput: (e) => { p.title = e.target.value; queue({ title: p.title }); } });
  const ta = h("textarea", { class: "ptext", placeholder: isX ? "O que está acontecendo?" : "Sobre o que você quer falar?", disabled: locked });
  ta.value = p.body;
  const autosize = () => { ta.style.height = "auto"; ta.style.height = Math.max(140, ta.scrollHeight) + "px"; };
  const counter = h("div", { class: "pcount" });
  const drawCount = () => {
    const n = isX ? xLength(p.body) : [...p.body].length, max = LIMIT[p.network], parts = isX ? threadParts(p.body).length : 1;
    const ringMax = isX ? 280 : max, frac = Math.min(1, n / ringMax), C = 2 * Math.PI * 10;
    const color = n > max ? "var(--danger)" : isX && n > 280 ? "#3da7ff" : n > ringMax - 20 ? "var(--warn)" : "var(--accent)";
    const ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", "26"); svg.setAttribute("height", "26"); svg.setAttribute("viewBox", "0 0 26 26");
    for (const [stroke, off] of [["var(--line-2)", 0], [color, C * (1 - frac)]]) {
      const c = document.createElementNS(ns, "circle");
      Object.entries({ cx: 13, cy: 13, r: 10, fill: "none", stroke, "stroke-width": 2.4, "stroke-dasharray": C, "stroke-dashoffset": off, transform: "rotate(-90 13 13)", "stroke-linecap": "round" }).forEach(([a, v]) => c.setAttribute(a, v));
      svg.append(c);
    }
    counter.replaceChildren(
      parts > 1 ? h("span", { class: "mono" }, `thread · ${parts} posts`) : isX && n > 280 && n <= max ? h("span", { class: "mono hide-sm" }, "mostra “mostrar mais”") : "",
      h("span", { class: n > max ? "bad" : "" }, `${n.toLocaleString("pt-BR")}/${max.toLocaleString("pt-BR")}`), svg);
  };
  ta.addEventListener("input", () => { p.body = ta.value; autosize(); drawCount(); queue({ body: p.body }); });
  requestAnimationFrame(autosize);

  // ---- mídia: botão, arrastar e colar ----
  const fileIn = h("input", { type: "file", accept: OK_TYPES.join(","), multiple: true, hidden: true });
  const mediaBox = h("div");
  const drawMedia = () => {
    const m = p.media || [];
    mediaBox.replaceChildren(m.length ? h("div", { class: `pmgrid n${Math.min(m.length, 4)}` }, ...m.map((it) => h("div", { class: "pmi" },
      it.mime.startsWith("video/") ? h("video", { src: urls[it.path] || "", controls: true, muted: true, preload: "metadata" }) : h("img", { src: urls[it.path] || "", alt: "" }),
      it.uploading ? h("div", { class: "pmprog" }) : !locked && h("button", { type: "button", class: "pmrm", "aria-label": "Remover mídia", onclick: () => removeMedia(it) }, "×")))) : "");
  };
  const setMedia = async (media) => {
    await flush();
    if (!(await ensureRow())) return false;
    const { data, error } = await sb.from("posts").update({ media }).eq("id", p.id).eq("version", version).select("version").maybeSingle();
    if (error || !data) { toast("Não salvou a mídia: o post mudou. Recarregue.", { kind: "err" }); return false; }
    version = data.version; p.media = media; return true;
  };
  const removeMedia = async (it) => { if (await setMedia(p.media.filter((x) => x.path !== it.path))) drawMedia(); };
  const upload = async (files) => {
    for (const f of files) {
      if (!OK_TYPES.includes(f.type)) { toast(`Formato não suportado: ${f.name}`, { kind: "err" }); continue; }
      if (!isX && !f.type.startsWith("image/")) { toast("LinkedIn: por enquanto só imagens.", { kind: "err" }); continue; }
      const cur = p.media || [];
      const hasVid = cur.some((m) => m.mime.startsWith("video/") || m.mime === "image/gif");
      if (isX && (hasVid || ((f.type.startsWith("video/") || f.type === "image/gif") && cur.length) || cur.length >= 4)) { toast("No X: até 4 imagens, ou 1 vídeo/GIF sozinho.", { kind: "err" }); continue; }
      if (!(await ensureRow())) return;
      const path = `${p.id}/${crypto.randomUUID()}.${f.name.split(".").pop().toLowerCase()}`;
      urls[path] = URL.createObjectURL(f);
      p.media = [...cur, { path, mime: f.type, size: f.size, name: f.name, uploading: true }]; drawMedia();
      const { error } = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type, upsert: false });
      const clean = p.media.filter((m) => m.path !== path);
      if (error) { p.media = clean; drawMedia(); toast(`Não anexou ${f.name}.`, { kind: "err" }); continue; }
      await setMedia([...clean, { path, mime: f.type, size: f.size, name: f.name }]); drawMedia();
    }
  };
  fileIn.addEventListener("change", () => { upload([...fileIn.files]); fileIn.value = ""; });
  ta.addEventListener("paste", (e) => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); upload(fs); } });

  const who = h("div", { class: "pwho" }, h("img", { class: "ava", src: profile.avatar, alt: "" }),
    h("div", { class: "grow" },
      h("div", { class: "pname" }, h("b", null, isX ? profile.name : profile.linkedinName), isX && h("span", { class: "muted" }, " @" + profile.username)),
      !isX && h("div", { class: "muted small truncate" }, profile.headline)));

  const compose = h("div", { class: "pcompose" }, h("div", { class: "pdrop" }, "Solte para anexar"), who, ta, mediaBox,
    h("div", { class: "ptools" },
      h("button", { type: "button", class: "ptool", title: "Anexar imagem ou vídeo", disabled: locked, onclick: () => fileIn.click() }, "▣ Mídia"),
      h("button", { type: "button", class: "ptool", title: "Copiar texto", onclick: () => navigator.clipboard.writeText(p.body).then(() => toast("Texto copiado.")) }, "⧉ Copiar"),
      h("div", { class: "grow" }), counter), fileIn);
  let depth = 0;
  const has = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
  compose.addEventListener("dragenter", (e) => { if (!has(e) || locked) return; e.preventDefault(); depth++; compose.classList.add("drag"); });
  compose.addEventListener("dragover", (e) => { if (has(e)) e.preventDefault(); });
  compose.addEventListener("dragleave", () => { if (--depth <= 0) { depth = 0; compose.classList.remove("drag"); } });
  compose.addEventListener("drop", (e) => { e.preventDefault(); depth = 0; compose.classList.remove("drag"); if (!locked) upload([...e.dataTransfer.files]); });

  // ---- prévia ----
  const preview = () => {
    const parts = isX ? threadParts(p.body) : [p.body];
    const cut = (t) => {
      if (isX) { if (xLength(t) <= 280) return [t]; let c = "", n = 0; for (const ch of t) { n += xLength(ch); if (n > 280) break; c += ch; } return [c.trimEnd() + "… ", h("span", { class: "more" }, "Mostrar mais")]; }
      const l = t.split("\n"); return t.length <= 210 && l.length <= 3 ? [t] : [l.slice(0, 3).join("\n").slice(0, 210).trimEnd(), h("span", { class: "more muted" }, "…ver mais")];
    };
    return h("div", { class: "pprev" }, ...parts.map((t, i) => h("div", { class: "pp" }, who.cloneNode(true), h("div", { class: "pptext" }, ...cut(t)),
      i === 0 && p.media?.length ? h("div", { class: `pmgrid n${Math.min(p.media.length, 4)}` }, ...p.media.map((m) => h("div", { class: "pmi" }, m.mime.startsWith("video/") ? h("video", { src: urls[m.path] || "", muted: true }) : h("img", { src: urls[m.path] || "", alt: "" })))) : "")));
  };
  const pane = h("div");
  const tabBtns = [["write", "Escrever"], ["preview", "Prévia"]].map(([id, l]) => h("button", { type: "button", class: id === tab ? "on" : "", onclick: (e) => { tab = id; tabBtns.forEach((b) => b.classList.toggle("on", b === e.currentTarget)); draw(); } }, l));
  const draw = () => pane.replaceChildren(tab === "write" ? compose : preview());

  // ---- ações ----
  const act = async (patch, ok) => {
    if (!(await flush())) return;
    if (!p.id && !(await ensureRow())) return;
    const { data, error } = await sb.from("posts").update(patch).eq("id", p.id).eq("version", version).select("id").maybeSingle();
    if (error || !data) return toast("Não foi possível: o post mudou em outro lugar. Recarregue.", { kind: "err" });
    toast(ok); refresh();
  };
  const validate = () => {
    if (!p.body.trim() && !(p.media || []).length) return "Post vazio.";
    const n = isX ? xLength(p.body) : [...p.body].length;
    if (n > LIMIT[p.network]) return "Texto passa do limite da rede.";
    if (isX && /https?:\/\//.test(p.body)) return confirm("Post do X com link custa ~13x mais na API e derruba alcance. Aprovar mesmo assim?") ? null : "cancelado";
    return null;
  };
  const sched = slotPicker(posts.filter((x) => x.id !== p.id), p, settings);
  const approve = async () => {
    const bad = validate(); if (bad) return bad !== "cancelado" && toast(bad, { kind: "err" });
    const when = sched.value() || nextSlot(posts.filter((x) => x.id !== p.id), p.network, settings);
    if (!when) return toast("Sem horário livre nos próximos 30 dias.", { kind: "err" });
    if (isX && posts.filter((x) => x.id !== p.id && x.network === "x" && ["approved", "posting", "posted"].includes(x.status) && x.scheduled_at && spDay(x.scheduled_at) === spDay(when)).length >= settings.x_daily_limit)
      return toast(`Já tem ${settings.x_daily_limit} posts do X nesse dia.`, { kind: "err" });
    act({ status: "approved", scheduled_at: when, error: null }, `Agendado para ${fmtDateTime(when)}.`);
  };
  // Publicar agora = publica na hora pela nuvem (não agenda).
  const postNow = async (e) => {
    const bad = validate(); if (bad) return bad !== "cancelado" && toast(bad, { kind: "err" });
    if (!(await flush())) return;
    if (!p.id && !(await ensureRow())) return;
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = "Publicando…";
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error("sessão expirada, entre de novo");
      const r = await fetch(`${CONFIG.supabaseUrl}/functions/v1/postador?action=publish&id=${encodeURIComponent(p.id)}`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, apikey: CONFIG.publishableKey } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error(j.error || `erro ${r.status}`);
      toast("Publicado.");
    } catch (err) { toast("Não publicou: " + err.message, { kind: "err" }); }
    finally { refresh(); }
  };

  const info = [
    p.is_viral_bet && h("p", { class: "note" }, "Aposta de viral do dia."),
    p.notes && h("p", { class: "note pre" }, p.notes),
    p.error && h("p", { class: "alert" }, p.error),
    p.status === "approved" && h("p", { class: "note blue" }, `Agendado para ${fmtDateTime(p.scheduled_at)}`),
    p.status === "posted" && h("p", { class: "note green" }, `Publicado em ${fmtDateTime(p.posted_at)} `, p.external_url && h("a", { href: p.external_url, target: "_blank", rel: "noopener" }, "ver post ↗")),
  ];
  const netSwitch = h("div", { class: "netsw" }, ...["x", "linkedin"].map((n) => h("button", { type: "button", class: p.network === n ? "on" : "", disabled: locked,
    onclick: () => n !== p.network && act({ network: n }, n === "x" ? "Agora é post do X." : "Agora é post do LinkedIn.") }, netBadge(n), n === "x" ? "X" : "LinkedIn")));

  draw(); drawMedia(); drawCount();
  return h("div", { class: "ped" },
    h("div", { class: "ped-top" }, h("a", { class: "btn btn-ghost btn-sm back", href: qs({ id: "" }) }, "← Lista"), netSwitch, h("span", { class: "pill " + p.status }, PILL[p.status]), h("div", { class: "grow" }), saved),
    titleIn, h("div", { class: "ptabsm" }, ...tabBtns), ...info, pane,
    !locked && h("div", { class: "pbar" },
      p.status === "rejected" ? h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => act({ status: "pending", scheduled_at: null }, "Voltou pra rascunho.") }, "Voltar pra rascunho")
        : h("button", { class: "btn btn-ghost btn-sm danger", type: "button", onclick: () => act({ status: "rejected", scheduled_at: null }, "Recusado.") }, "Recusar"),
      h("div", { class: "grow" }),
      p.status === "approved" && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => act({ status: "pending", scheduled_at: null }, "Tirado da agenda.") }, "Tirar da agenda"),
      h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: approve }, p.status === "approved" ? "Reagendar" : "Agendar"),
      h("button", { class: "btn btn-sm", type: "button", onclick: postNow }, "Postar agora")),
    !locked && sched.el);
}

// Agenda de horários estilo reserva: dia, horas de 02h a 23h com as ocupadas marcadas, sugeridas e hora manual.
function slotPicker(others, p, settings) {
  const net = p.network, limit = net === "x" ? settings.x_daily_limit : 10;
  const suggested = (net === "x" ? settings.x_slots : settings.linkedin_slots) || [];
  const busy = others.filter((x) => x.network === net && ["approved", "posting", "posted"].includes(x.status) && (x.scheduled_at || x.posted_at));
  const fmt = (o) => (ts) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...o }).format(new Date(ts));
  const hhmm = fmt({ hour: "2-digit", minute: "2-digit" }), hh = (t) => t.slice(0, 2);
  let day = p.scheduled_at ? spDay(p.scheduled_at) : todayISO(), time = p.scheduled_at ? hhmm(p.scheduled_at) : "";
  const dayIn = h("input", { type: "date", class: "input", value: day, min: todayISO(), onchange: () => { day = dayIn.value || todayISO(); time = ""; timeIn.value = ""; draw(); } });
  const timeIn = h("input", { type: "time", class: "input", value: time, title: "Ou digite o horário exato", oninput: () => { time = timeIn.value; draw(); } });
  const count = h("span", { class: "mono" }), title = h("b", { class: "mono" }), grid = h("div", { class: "slotgrid" });
  const draw = () => {
    // Só os posts do dia escolhido; cada um marca a faixa da hora dele (11:05 ocupa 11:00).
    const today = busy.filter((x) => spDay(x.scheduled_at || x.posted_at) === day);
    const byHour = {};
    today.forEach((x) => (byHour[hh(hhmm(x.scheduled_at || x.posted_at))] ||= []).push(x));
    const label = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(day + "T12:00:00Z"));
    title.textContent = `Horários de ${label}`;
    count.textContent = `${today.length}/${limit} no dia`; count.className = "mono " + (today.length >= limit ? "danger" : "muted");
    const now = Date.now(), cells = [];
    for (let hr = 2; hr <= 23; hr++) {
      const H = String(hr).padStart(2, "0"), occ = byHour[H] || [], sug = suggested.find((t) => hh(t) === H);
      const pick = sug || `${H}:00`, past = new Date(`${day}T${H}:59:00-03:00`).getTime() < now + 60000;
      cells.push(h("button", { type: "button", disabled: !!occ.length || past,
        class: "slot" + (occ.length ? " occ" : "") + (sug ? " sug" : "") + (time && hh(time) === H ? " on" : ""),
        title: occ.length ? "Ocupado: " + occ.map((x) => `${hhmm(x.scheduled_at || x.posted_at)} ${(x.title || x.body || "").slice(0, 50)}`).join(" | ") : sug ? `Sugerido: ${sug}` : "",
        onclick: () => { time = pick; timeIn.value = pick; draw(); } },
        h("span", null, `${H}:00`), occ.length ? h("small", null, occ.map((x) => hhmm(x.scheduled_at || x.posted_at)).join(" ")) : sug && sug !== `${H}:00` ? h("small", null, sug) : null));
    }
    grid.replaceChildren(...cells);
  };
  draw();
  return {
    el: h("div", { class: "slotpick" }, h("div", { class: "flex" }, title, dayIn, timeIn, h("div", { class: "grow" }), count),
      grid, h("p", { class: "muted small" }, "Riscado = já tem post nessa faixa de hora (o horário exato aparece embaixo) · destacado = sugerido · sem escolher = próximo horário livre.")),
    value: () => (time ? fromLocalInput(`${day}T${time}`) : null),
  };
}

// ───────────────────────── Calendário ─────────────────────────
function calendarView(posts, query, go) {
  const base = /^\d{4}-\d{2}$/.test(query.mes || "") ? new Date(`${query.mes}-01T12:00:00-03:00`) : new Date();
  const y = Number(new Intl.DateTimeFormat("en", { timeZone: TZ, year: "numeric" }).format(base)), m = Number(new Intl.DateTimeFormat("en", { timeZone: TZ, month: "numeric" }).format(base));
  const first = new Date(Date.UTC(y, m - 1, 1)), start = new Date(first); start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
  const today = todayISO();
  const byDay = {};
  for (const p of posts.filter((x) => ["approved", "posting", "posted", "failed"].includes(x.status) && (x.posted_at || x.scheduled_at))) (byDay[spDay(p.posted_at || p.scheduled_at)] ||= []).push(p);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    if (i >= 35 && d.getUTCMonth() !== m - 1) break;
    const list = (byDay[key] || []).sort((a, b) => (a.posted_at || a.scheduled_at).localeCompare(b.posted_at || b.scheduled_at));
    cells.push(h("div", { class: "cday" + (d.getUTCMonth() !== m - 1 ? " out" : "") + (key === today ? " today" : "") },
      h("div", { class: "cdn" }, h("b", null, d.getUTCDate()), list.filter((p) => p.network === "x").length ? h("span", { class: "mono" }, list.filter((p) => p.network === "x").length + " X") : ""),
      ...list.map((p) => h("a", { class: "cev " + p.status, href: `#/postador?id=${p.id}`, title: p.title || p.body.slice(0, 80) }, netBadge(p.network),
        h("time", null, new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(p.posted_at || p.scheduled_at))),
        h("span", { class: "truncate" }, p.title || p.body.split("\n")[0])))));
  }
  const ym = (dy) => { const d = new Date(Date.UTC(y, m - 1 + dy, 1)); return d.toISOString().slice(0, 7); };
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  return h("div", null,
    h("div", { class: "flex", style: { margin: "4px 0 12px" } }, h("h2", { class: "caltitle" }, label[0].toUpperCase() + label.slice(1)), h("div", { class: "grow" }),
      h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => go(`/postador?aba=calendario&mes=${ym(-1)}`) }, "‹"),
      h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => go("/postador?aba=calendario") }, "Hoje"),
      h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => go(`/postador?aba=calendario&mes=${ym(1)}`) }, "›")),
    h("div", { class: "cal7" }, ...["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d) => h("div", { class: "cdow mono" }, d)), ...cells),
    h("p", { class: "muted small", style: { marginTop: "8px" } }, "Laranja: agendado · verde: publicado · vermelho: erro. Clique pra abrir."));
}

// ───────────────────────── Radar ─────────────────────────
async function radarView(sb, query, go, refresh) {
  const kind = query.tipo === "follow" ? "follow" : "talk";
  const { data, error } = await sb.from("radar_items").select("id, kind, tweet_id, author, text, metrics, tweet_created_at, done_at, version, created_at").is("archived_at", null).order("tweet_created_at", { ascending: false }).limit(300);
  if (error) return alertBox("Não foi possível carregar o Radar.");
  const items = (data || []).filter((i) => i.kind === kind);
  const lastFetch = (data || []).reduce((a, i) => (i.created_at > a ? i.created_at : a), "");
  const score = (i) => (i.metrics?.reply_count || 0) * 3 + (i.metrics?.like_count || 0);
  items.sort((a, b) => (!!a.done_at - !!b.done_at) || (kind === "talk" ? score(b) - score(a) : 0));
  const mark = async (i, done) => {
    const { data: d } = await sb.from("radar_items").update({ done_at: done ? new Date().toISOString() : null }).eq("id", i.id).eq("version", i.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" }); refresh();
  };
  const archive = async (i) => {
    const { data: d } = await sb.from("radar_items").update({ archived_at: new Date().toISOString() }).eq("id", i.id).eq("version", i.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" }); toast("Removido do Radar."); refresh();
  };
  const row = (i) => {
    const a = i.author || {}, m = i.metrics || {};
    const embed = h("div", { class: "rembed", dataset: { tweet: i.tweet_id } });
    const reply = h("textarea", { class: "textarea", rows: 2, placeholder: "Sua resposta (no seu jeito: minúscula, direto, com opinião)" });
    return h("article", { class: "rcard" + (i.done_at ? " done" : "") },
      h("div", { class: "pwho" }, a.profile_image_url && h("img", { class: "ava", src: a.profile_image_url, alt: "", referrerpolicy: "no-referrer" }),
        h("div", { class: "grow" }, h("b", null, a.name || ""), h("div", { class: "muted small" }, `@${a.username || ""} · ${k(a.public_metrics?.followers_count)} seguidores · há ${ago(i.tweet_created_at || i.created_at)}`))),
      h("p", { class: "rtext" }, i.text),
      embed,
      kind === "talk" && h("div", { class: "mono muted rmeta" }, `${k(m.reply_count)} respostas · ${k(m.like_count)} likes`, m.impression_count ? ` · ${k(m.impression_count)} impressões` : ""),
      h("div", { class: "rbar" },
        kind === "talk" ? [reply, h("button", { class: "btn btn-sm", type: "button", onclick: () => { window.open(`https://x.com/intent/post?in_reply_to=${i.tweet_id}${reply.value.trim() ? "&text=" + encodeURIComponent(reply.value.trim()) : ""}`, "_blank", "noopener"); mark(i, true); } }, "Responder no X")]
          : [h("a", { class: "btn btn-sm", href: `https://x.com/${a.username}`, target: "_blank", rel: "noopener" }, "Abrir perfil ↗"), h("a", { class: "btn btn-ghost btn-sm", href: `https://x.com/${a.username}/status/${i.tweet_id}`, target: "_blank", rel: "noopener" }, "Ver post")],
        kind === "talk" && h("a", { class: "btn btn-ghost btn-sm", href: `https://x.com/${a.username || "i"}/status/${i.tweet_id}`, target: "_blank", rel: "noopener" }, "Abrir post ↗"),
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => mark(i, !i.done_at) }, i.done_at ? "Desfazer" : kind === "talk" ? "Feito" : "Já segui"),
        h("button", { class: "btn btn-ghost btn-sm danger", type: "button", title: "Tirar do Radar", onclick: () => archive(i) }, "Remover")));
  };
  // Post embutido do X (foto/vídeo), carregado só quando aparece na tela.
  const loadEmbeds = (root) => {
    const run = () => {
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return; io.unobserve(e.target);
        window.twttr?.widgets?.createTweet(e.target.dataset.tweet, e.target, { theme: "dark", conversation: "none", dnt: true, lang: "pt" })
          .then((el) => { if (el) e.target.closest(".rcard")?.querySelector(".rtext")?.remove(); });
      }), { rootMargin: "400px" });
      root.querySelectorAll(".rembed").forEach((el) => io.observe(el));
    };
    if (window.twttr?.widgets) return run();
    if (!document.getElementById("twttr-js")) document.head.append(h("script", { id: "twttr-js", src: "https://platform.twitter.com/widgets.js", async: true }));
    const t = setInterval(() => { if (window.twttr?.widgets) { clearInterval(t); run(); } }, 300);
    setTimeout(() => clearInterval(t), 15000);
  };
  return h("div", { class: "radar" },
    h("div", { class: "qnav" },
      h("a", { href: "#/postador?aba=radar", class: kind === "talk" ? "on" : "" }, "Conversas", h("b", null, (data || []).filter((i) => i.kind === "talk" && !i.done_at).length)),
      h("a", { href: "#/postador?aba=radar&tipo=follow", class: kind === "follow" ? "on" : "" }, "Sigo de volta", h("b", null, (data || []).filter((i) => i.kind === "follow" && !i.done_at).length)),
      h("div", { class: "grow" }), h("span", { class: "mono" }, lastFetch ? `última busca há ${ago(lastFetch)}` : "sem busca ainda"),
      h("button", { class: "btn btn-sm", type: "button", onclick: async (e) => { if (await runCloud(sb, "radar", e.currentTarget, "Buscar agora")) refresh(); } }, "Buscar agora")),
    h("p", { class: "note" }, kind === "talk"
      ? "Só contas verificadas (são as que contam pra monetização). Responder pesa 5x mais que like no X, e entre mútuos chega a 20x. A resposta abre no X pra você publicar, de graça."
      : "Verificados do seu nicho pedindo pra se seguir. Abra o perfil e siga na mão: 10 a 20 por dia é o seguro. Automação de follow pode tirar a conta da monetização."),
    (() => { if (!items.length) return h("p", { class: "empty" }, "Nada ainda. A busca roda todo dia de manhã."); const list = h("div", { class: "stack" }, ...items.map(row)); setTimeout(() => loadEmbeds(list), 0); return list; })());
}

// ───────────────────────── Insights + meta ─────────────────────────
// Meta de engajamento (KPI): 2% de interações por impressão. No X a média de contas pequenas fica perto de 1%;
// 2% é um alvo ambicioso mas alcançável pra quem conversa com a audiência.
const ENG_GOAL = 2;
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const engOf = (t) => (t.impressions ? ((t.likes + t.replies + t.reposts + t.quotes + t.bookmarks) / t.impressions) * 100 : 0);
const KIND = { thread: "Thread", imagem: "Imagem", video: "Vídeo", texto: "Texto", artigo: "Artigo" };

function heatmap(xp) {
  // Mapa anual: 53 semanas x 7 dias (dom a sáb), cor pela soma de views dos posts do dia.
  const byDay = {};
  for (const t of xp) { const d = dayOf(t.created_at); byDay[d] = (byDay[d] || 0) + t.impressions; }
  const vals = Object.values(byDay).filter(Boolean).sort((a, b) => a - b);
  const q = (p) => vals[Math.floor((vals.length - 1) * p)] || 1;
  const lv = (v) => (!v ? 0 : v <= q(0.25) ? 1 : v <= q(0.5) ? 2 : v <= q(0.8) ? 3 : 4);
  const end = new Date(), start = new Date(end); start.setDate(end.getDate() - 364 - end.getDay());
  const cols = [], months = [];
  for (let w = 0; w < 53; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d);
      if (dt > end) { col.push(h("i", { class: "hm out" })); continue; }
      const key = todayISO(dt), v = byDay[key] || 0;
      col.push(h("i", { class: `hm l${lv(v)}`, title: `${key.split("-").reverse().join("/")}: ${v.toLocaleString("pt-BR")} views` }));
      if (dt.getDate() <= 7 && d === 0) months.push([w, new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(dt).replace(".", "")]);
    }
    cols.push(h("div", { class: "hmcol" }, ...col));
  }
  const total = xp.filter((t) => Date.now() - new Date(t.created_at) < 365 * 864e5).reduce((n, t) => n + t.impressions, 0);
  return h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Mapa anual de visualizações")),
    h("div", { class: "panel-body" },
      h("div", { class: "dnum" }, h("b", null, total.toLocaleString("pt-BR")), h("span", { class: "muted small" }, "views no último ano · posts originais no X, pelo dia de publicação")),
      h("div", { class: "hmwrap" },
        h("div", { class: "hmdays mono" }, ...["Dom", "", "Ter", "", "Qui", "", "Sáb"].map((d) => h("span", null, d))),
        h("div", null, h("div", { class: "hmmonths mono" }, ...months.map(([w, m]) => h("span", { style: { gridColumn: `${w + 1}` } }, m))), h("div", { class: "hmgrid" }, ...cols))),
      h("div", { class: "hmlegend mono" }, "Menos", ...[0, 1, 2, 3, 4].map((l) => h("i", { class: `hm l${l}` })), "Mais")));
}

function donut(pct, goal) {
  const NS = "http://www.w3.org/2000/svg", s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", "0 0 120 120"); s.setAttribute("class", "donut");
  const C = 2 * Math.PI * 50, frac = Math.min(1, pct / (goal * 1.5));
  const ring = (stroke, off, w) => { const c = document.createElementNS(NS, "circle"); Object.entries({ cx: 60, cy: 60, r: 50, fill: "none", stroke, "stroke-width": w, "stroke-dasharray": C, "stroke-dashoffset": off, transform: "rotate(-90 60 60)", "stroke-linecap": "round" }).forEach(([a, v]) => c.setAttribute(a, v)); return c; };
  s.append(ring("var(--panel-hd)", 0, 12), ring(pct >= goal ? "var(--ok)" : "var(--accent)", C * (1 - frac), 12));
  // marcador da meta
  const ang = (goal / (goal * 1.5)) * 2 * Math.PI - Math.PI / 2, mk = document.createElementNS(NS, "line");
  Object.entries({ x1: 60 + 42 * Math.cos(ang), y1: 60 + 42 * Math.sin(ang), x2: 60 + 58 * Math.cos(ang), y2: 60 + 58 * Math.sin(ang), stroke: "var(--tx)", "stroke-width": 2 }).forEach(([a, v]) => mk.setAttribute(a, v));
  s.append(mk);
  const t = document.createElementNS(NS, "text"); Object.entries({ x: 60, y: 66, "text-anchor": "middle", fill: "var(--tx)", "font-size": 20, "font-weight": 800 }).forEach(([a, v]) => t.setAttribute(a, v)); t.textContent = pct.toFixed(1).replace(".", ",") + "%";
  s.append(t);
  return s;
}

export async function insightsView(sb, refresh) {
  const [goalR, snapR, xpR, statsR] = await Promise.all([
    sb.from("x_goal_entries").select("id, day, verified_followers, impressions_90d, version").is("archived_at", null).order("day").limit(200),
    sb.from("x_snapshots").select("taken_at, followers").is("archived_at", null).order("taken_at").limit(400),
    sb.from("x_posts").select("id, created_at, text, kind, impressions, likes, replies, reposts, quotes, bookmarks, updated_at").order("created_at", { ascending: false }).limit(1000),
    sb.from("social_stats").select("day, platform, followers").eq("platform", "x").order("day").limit(400),
  ]);
  const E = goalR.data || [], cur = E[E.length - 1] || { verified_followers: 0, impressions_90d: 0 }, prev = E.length > 1 ? E[E.length - 2] : null;
  const xp = xpR.data || [];
  const bar = (v, max) => h("div", { class: "gbar" }, h("b", { style: { width: `${Math.min(100, (v / max) * 100)}%` } }));
  const delta = (a, b) => (prev ? `${a - b >= 0 ? "+" : ""}${k(a - b)} desde o registro anterior` : "");
  const fIn = h("input", { class: "input", type: "number", min: 0, placeholder: "verificados", value: cur.verified_followers || "" });
  const iIn = h("input", { class: "input", type: "number", min: 0, placeholder: "impressões 90d", value: cur.impressions_90d || "" });
  const saveGoal = async () => {
    const day = todayISO(), row = { day, verified_followers: Number(fIn.value) || 0, impressions_90d: Number(iIn.value) || 0 };
    const ex = E.find((e) => e.day === day);
    const { error } = ex ? await sb.from("x_goal_entries").update(row).eq("id", ex.id).eq("version", ex.version) : await sb.from("x_goal_entries").insert(row);
    if (error) return toast("Não foi possível salvar.", { kind: "err" }); toast("Meta atualizada."); refresh();
  };

  // Cartões das contas (como no Otto)
  const fol = [...(statsR.data || []).map((r) => ({ d: r.day, v: r.followers })), ...(snapR.data || []).map((r) => ({ d: dayOf(r.taken_at), v: r.followers }))].filter((r) => r.v != null).sort((a, b) => a.d.localeCompare(b.d));
  const fNow = fol.length ? fol[fol.length - 1].v : null, fFirst = fol.length ? fol[0] : null;
  const acct = (name, handle, value, sub, badge) => h("div", { class: "acct" }, h("div", { class: "flex" }, badge, h("div", null, h("b", null, name), h("div", { class: "muted small" }, handle))), h("div", { class: "anum" }, value), h("div", { class: "muted small" }, sub));

  // Views por dia (últimos 30 dias) com os posts dos picos
  const last30 = [...Array(30)].map((_, i) => todayISO(new Date(Date.now() - (29 - i) * 864e5)));
  const per = Object.fromEntries(last30.map((d) => [d, 0]));
  for (const t of xp) { const d = dayOf(t.created_at); if (d in per) per[d] += t.impressions; }
  const peaks = [...xp].filter((t) => dayOf(t.created_at) in per).sort((a, b) => b.impressions - a.impressions).slice(0, 2);

  // Desempenho por tipo
  const kinds = Object.keys(KIND).map((kk) => { const a = xp.filter((t) => t.kind === kk); return { kk, n: a.length, mv: median(a.map((t) => t.impressions)), me: median(a.map(engOf)) }; });
  const maxMv = Math.max(1, ...kinds.map((x) => x.mv));
  const best = kinds.filter((x) => x.n >= 3).sort((a, b) => b.mv - a.mv);
  const txt = kinds.find((x) => x.kk === "texto");
  const insight = best.length && txt?.mv ? `${KIND[best[0].kk]} tem ${(best[0].mv / txt.mv).toFixed(1).replace(".", ",")}x a mediana de views de Texto.` : "";

  // Engajamento dos últimos 30 dias vs meta
  const rec = xp.filter((t) => Date.now() - new Date(t.created_at) < 30 * 864e5);
  const imp = rec.reduce((n, t) => n + t.impressions, 0), inter = rec.reduce((n, t) => n + t.likes + t.replies + t.reposts + t.quotes + t.bookmarks, 0);
  const engPct = imp ? (inter / imp) * 100 : 0;

  const recreate = async (t) => {
    const { error } = await sb.from("posts").insert({ network: "x", title: "REPUBLICAR – " + t.text.split("\n")[0].slice(0, 60), body: t.text.replace(/\s*https:\/\/t\.co\/\S+/g, "").trim(), notes: `Recriado a partir do post de ${fmtDate(dayOf(t.created_at), false)} (${k(t.impressions)} views). Ajuste o texto e anexe a mídia de novo se tinha.` });
    if (error) return toast("Não foi possível recriar.", { kind: "err" }); toast("Virou rascunho na aba Rascunhos.");
  };
  const top = [...xp].sort((a, b) => b.impressions - a.impressions).slice(0, 9);
  const lastUpd = xp.reduce((m, t) => (t.updated_at > m ? t.updated_at : m), "");

  return h("div", { class: "ins" }, await reportBox(sb, "insights"),
    h("div", { class: "flex" }, h("p", { class: "muted small grow" }, lastUpd ? `Atualizado há ${ago(lastUpd)} · coleta automática todo dia às 5h40.` : "Sem coleta ainda."),
      h("button", { class: "btn btn-sm", type: "button", onclick: async (e) => { if (await runCloud(sb, "insights", e.currentTarget, "Atualizar agora")) refresh(); } }, "Atualizar agora")),
    h("div", { class: "accts" },
      acct("X", "@andersbrito", fNow != null ? fNow.toLocaleString("pt-BR") : "–", fFirst && fNow != null ? `${fNow - fFirst.v >= 0 ? "+" : ""}${fNow - fFirst.v} desde ${fmtDate(fFirst.d, false)}` : "seguidores", h("span", { class: "netb n-x" }, "X")),
      acct("LinkedIn", "Anderson Brito", "–", "a API não mostra seguidores de perfil pessoal", h("span", { class: "netb n-linkedin" }, "in")),
      h("div", { class: "acct" }, h("b", null, "Engajamento · 30 dias"), h("div", { class: "flex", style: { gap: "14px" } }, donut(engPct, ENG_GOAL),
        h("div", { class: "small" }, h("div", null, `Meta (KPI): ${ENG_GOAL}%`), h("div", { class: "muted" }, `${inter.toLocaleString("pt-BR")} interações em ${imp.toLocaleString("pt-BR")} views`), h("div", { class: engPct >= ENG_GOAL ? "okc" : "muted" }, engPct >= ENG_GOAL ? "Acima da meta" : `Faltam ${(ENG_GOAL - engPct).toFixed(1).replace(".", ",")} p.p.`))))),
    goalPanel(cur, prev, bar, delta, fIn, iIn, saveGoal),
    heatmap(xp),
    h("section", { class: "panel" },
      h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Views por dia de publicação · 30 dias")),
      h("div", { class: "panel-body" },
        h("div", { class: "peaks" }, ...peaks.map((t) => h("a", { href: `https://x.com/i/status/${t.id}`, target: "_blank", rel: "noopener", class: "peak" }, h("b", null, `${k(t.impressions)} views`), h("span", { class: "truncate" }, t.text.split("\n")[0]), h("span", { class: "mono muted" }, fmtDate(dayOf(t.created_at), false))))),
        lineChart(last30.map((d) => ({ day: d, v: per[d] })), { height: 200 }))),
    h("section", { class: "panel" },
      h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Desempenho por tipo de conteúdo")),
      h("div", { class: "panel-body" }, insight && h("p", { style: { marginBottom: "12px" } }, insight),
        h("div", { class: "kgrid" },
          h("div", null, h("div", { class: "mono", style: { marginBottom: "8px" } }, "Mediana de visualizações"), ...kinds.map((x) => h("div", { class: "krow" }, h("div", { class: "flex" }, h("span", { class: "grow" }, `${KIND[x.kk]} · ${x.n} posts`), h("b", null, x.n ? k(Math.round(x.mv)) : "–")), h("div", { class: "gbar" }, h("b", { style: { width: `${(x.mv / maxMv) * 100}%` } }))))),
          h("div", null, h("div", { class: "mono", style: { marginBottom: "8px" } }, "Engajamento mediano"), ...kinds.map((x) => h("div", { class: "flex krow2" }, h("span", { class: "grow" }, KIND[x.kk]), h("b", null, x.n ? x.me.toFixed(1).replace(".", ",") + "%" : "–"))))))),
    h("h2", { class: "dsec" }, "Seus melhores conteúdos para republicar"),
    h("div", { class: "bestgrid" }, ...top.map((t) => h("article", { class: "best" },
      h("div", { class: "muted small" }, `@andersbrito · ${fmtDate(dayOf(t.created_at), false)} · ${KIND[t.kind]}`),
      h("p", null, t.text.replace(/\s*https:\/\/t\.co\/\S+/g, "")),
      h("div", { class: "flex" }, h("span", { class: "mono" }, `♡ ${k(t.likes)}`), h("span", { class: "mono" }, `${k(t.impressions)} views`), h("div", { class: "grow" }),
        h("a", { class: "mono", href: `https://x.com/i/status/${t.id}`, target: "_blank", rel: "noopener" }, "ver"), h("button", { class: "mono link", type: "button", onclick: () => recreate(t) }, "Recriar"))))),
    h("section", { class: "panel" },
      h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Coleta dos posts"), h("span", { class: "mono" }, `${xp.length} posts`)),
      h("div", { class: "panel-body" }, ...xp.slice(0, 25).map((t) => h("a", { class: "trow", href: `https://x.com/i/status/${t.id}`, target: "_blank", rel: "noopener" }, h("span", { class: "truncate grow" }, t.text.split("\n")[0]), h("span", { class: "muted mono" }, fmtDate(dayOf(t.created_at), false)), h("b", null, k(t.impressions)))))));
}

export function goalPanel(cur, prev, bar, delta, fIn, iIn, saveGoal) {
  const perDay = Math.ceil(500000 / 90);
  // Alerta quando perde seguidores verificados ou impressões em relação ao registro anterior.
  const drops = prev ? [
    cur.verified_followers < prev.verified_followers && `Perdeu ${prev.verified_followers - cur.verified_followers} seguidor(es) verificado(s) desde o último registro.`,
    cur.impressions_90d < prev.impressions_90d && `Impressões dos últimos 90 dias caíram ${k(prev.impressions_90d - cur.impressions_90d)} (posts antigos saindo da janela). Hora de publicar mais.`,
  ].filter(Boolean) : [];
  return h("section", { class: "panel goal" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Meta de monetização do X"), h("a", { class: "mono", href: "https://help.x.com/en/using-x/original-content-rewards", target: "_blank", rel: "noopener" }, "regras ↗")),
    h("div", { class: "panel-body" },
      ...drops.map((t) => h("p", { class: "alert", role: "alert" }, t)),
      h("div", { class: "goalgrid" },
        h("div", null, h("span", { class: "mono" }, "Seguidores verificados"), h("div", { class: "gnum" }, h("b", null, cur.verified_followers), h("span", { class: "muted" }, " / 500"), h("span", { class: "mono muted gd" }, delta(cur.verified_followers, prev?.verified_followers))), bar(cur.verified_followers, 500),
          h("span", { class: "muted small" }, cur.verified_followers >= 500 ? "Meta batida" : `Faltam ${500 - cur.verified_followers}`)),
        h("div", null, h("span", { class: "mono" }, "Impressões verificadas · 90 dias"), h("div", { class: "gnum" }, h("b", null, k(cur.impressions_90d)), h("span", { class: "muted" }, " / 500K"), h("span", { class: "mono muted gd" }, delta(cur.impressions_90d, prev?.impressions_90d))), bar(cur.impressions_90d, 500000),
          h("span", { class: "muted small" }, cur.impressions_90d >= 500000 ? "Meta batida" : `Faltam ${k(500000 - cur.impressions_90d)} · precisa de ~${k(perDay)}/dia (respostas não contam)`))),
      fIn && h("div", { class: "flex wrap goalform" }, h("span", { class: "muted small" }, "Números do painel de Monetização do X:"), fIn, iIn, h("button", { class: "btn btn-sm", type: "button", onclick: saveGoal }, "Salvar"))));
}

// ───────────────────────── Pedir posts ("nova conversa") ─────────────────────────
async function requestsView(sb, refresh) {
  const { data, error } = await sb.from("post_requests").select("id, topic, networks, quantity, status, result_note, created_at, done_at, version").is("archived_at", null).order("created_at", { ascending: false }).limit(60);
  if (error) return alertBox("Não foi possível carregar os pedidos.");
  const topic = h("textarea", { class: "textarea", rows: 4, placeholder: "Sobre o que você quer posts? Ex.: \"meu teste do Kling 4.0 contra o Seedance, com o carro voando na Paulista\" ou \"opinião sobre o debate de ontem, só no X\"", maxlength: 2000 });
  const nets = h("select", { class: "select select-sm" }, h("option", { value: "x" }, "Só X"), h("option", { value: "linkedin" }, "Só LinkedIn"), h("option", { value: "ambos" }, "X e LinkedIn"));
  const qty = h("select", { class: "select select-sm" }, ...[1, 2, 3, 5].map((n) => h("option", { value: n, selected: n === 3 }, `${n} versões`)));
  const send = async () => {
    if (!topic.value.trim()) return toast("Escreva o assunto.", { kind: "err" });
    const { error: err } = await sb.from("post_requests").insert({ topic: topic.value.trim(), networks: nets.value, quantity: Number(qty.value) });
    if (err) return toast("Não foi possível enviar o pedido.", { kind: "err" });
    toast("Pedido enviado. Os rascunhos aparecem em Rascunhos."); refresh();
  };
  const cancel = async (r) => {
    const { data: d } = await sb.from("post_requests").update({ status: "cancelado" }).eq("id", r.id).eq("version", r.version).select("id").maybeSingle();
    if (!d) return toast("Recarregue a página.", { kind: "err" }); refresh();
  };
  const LBL = { aberto: "Na fila", gerando: "Gerando", feito: "Pronto", cancelado: "Cancelado" };
  return h("div", { class: "preq" },
    h("section", { class: "panel" },
      h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Novo pedido")),
      h("div", { class: "panel-body stack" }, topic,
        h("div", { class: "flex wrap" }, nets, qty, h("div", { class: "grow" }), h("button", { class: "btn", type: "button", onclick: send }, "Pedir rascunhos")),
        h("p", { class: "muted small" }, "O Claude lê os pedidos de hora em hora (das 5h às 22h) e na rotina das 5h, escreve no seu tom e deixa os rascunhos aqui no Postador. Nada é publicado sem você aprovar."))),
    h("div", { class: "stack" }, ...(data || []).map((r) => h("div", { class: "row" },
      h("div", { class: "grow" }, h("div", { class: "title" }, r.topic), h("div", { class: "muted small" }, `${r.networks === "ambos" ? "X e LinkedIn" : r.networks === "x" ? "X" : "LinkedIn"} · ${r.quantity} versões · ${fmtDateTime(r.created_at)}`, r.result_note ? ` · ${r.result_note}` : "")),
      h("span", { class: "pill " + (r.status === "feito" ? "posted" : r.status === "aberto" ? "approved" : "") }, LBL[r.status]),
      r.status === "aberto" && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => cancel(r) }, "Cancelar")))),
    !(data || []).length && h("p", { class: "empty" }, "Nenhum pedido ainda."));
}

// ───────────────────────── Estúdio: post → card e Reel ─────────────────────────
async function studioView() {
  // Em construção: aqui vai o estúdio de vídeos em motion (imagens, fontes, animação) a partir de posts escolhidos à mão.
  return h("div", { class: "placeholder", style: { minHeight: "360px" } },
    h("p", { class: "mono", style: { color: "var(--accent)" } }, "Em construção"),
    h("h2", { class: "caltitle" }, "Estúdio de vídeos"),
    h("p", { class: "muted small", style: { maxWidth: "460px" } }, "Você vai escolher os posts e transformar em vídeos em motion, com imagens, fontes e animação, pra postar no Instagram, X, LinkedIn e Threads."));
}
