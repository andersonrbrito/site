// Sticky NoteS_: notas adesivas livres, arrastáveis, coloridas, com tags, link e opção de fixar no PaineL_.
import { h } from "../util.js";
import { toast, pageHead } from "../ui.js";

export const NOTE_COLORS = { amarelo: "#f5c84c", laranja: "#ff8a5c", rosa: "#ff8fc0", verde: "#62e3a0", azul: "#6cbcff", roxo: "#b3a4ff", cinza: "#b9bdb6" };
const COLS = "id, texto, cor, tags, x, y, w, h, z, fixada, link, version, updated_at";

/** Salva uma nota com controle de versão; devolve a linha nova ou null em conflito. */
export async function saveNote(sb, n, patch) {
  const { data, error } = await sb.from("sticky_notes").update(patch).eq("id", n.id).eq("version", n.version).select(COLS).maybeSingle();
  if (error) { toast("Não salvou a nota.", { kind: "err" }); return null; }
  if (!data) { toast("A nota mudou em outro lugar. Recarregue a página.", { kind: "err", actionLabel: "Recarregar", onAction: () => location.reload() }); return null; }
  Object.assign(n, data); return n;
}

/** Cartão de nota (usado no quadro e no PaineL_). */
export function noteCard(sb, n, { board = false, onArchive } = {}) {
  let t;
  const ta = h("textarea", { class: "sn-text", placeholder: "Escreva…", "aria-label": "Texto da nota" }); ta.value = n.texto;
  ta.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => saveNote(sb, n, { texto: ta.value.slice(0, 4000) }), 700); });
  ta.addEventListener("blur", () => { if (ta.value !== n.texto) { clearTimeout(t); saveNote(sb, n, { texto: ta.value.slice(0, 4000) }); } });
  const tags = h("div", { class: "sn-tags" }, ...n.tags.map((x) => h("span", null, "#" + x)));
  const colorBtns = h("div", { class: "sn-colors" }, ...Object.entries(NOTE_COLORS).map(([k, c]) => h("button", { type: "button", style: { background: c }, "aria-label": `Cor ${k}`, title: k, onclick: async () => { if (await saveNote(sb, n, { cor: k })) el.style.setProperty("--n", NOTE_COLORS[k]); } })));
  const pin = h("button", { type: "button", class: `sn-ico${n.fixada ? " on" : ""}`, title: n.fixada ? "Tirar do PaineL_" : "Fixar no PaineL_", "aria-pressed": String(n.fixada), onclick: async () => { if (await saveNote(sb, n, { fixada: !n.fixada })) { pin.classList.toggle("on", n.fixada); pin.setAttribute("aria-pressed", String(n.fixada)); toast(n.fixada ? "Fixada no PaineL_." : "Saiu do PaineL_."); } } }, "★");
  const tagBtn = h("button", { type: "button", class: "sn-ico", title: "Tags e link", onclick: async () => {
    const v = prompt("Tags separadas por vírgula (ex.: mazzaropi, urgente):", n.tags.join(", ")); if (v === null) return;
    const l = prompt("Link opcional (https://… ou #/perfis):", n.link || ""); if (l === null) return;
    const link = l.trim(); if (link && !/^(https?:\/\/|#\/)/.test(link)) return toast("Link precisa começar com https:// ou #/", { kind: "err" });
    const tg = v.split(",").map((x) => x.trim().replace(/^#/, "").toLowerCase()).filter(Boolean).slice(0, 12);
    if (await saveNote(sb, n, { tags: tg, link: link || null })) { tags.replaceChildren(...n.tags.map((x) => h("span", null, "#" + x))); linkA.hidden = !n.link; linkA.href = n.link || "#"; }
  } }, "#");
  const linkA = h("a", { class: "sn-ico", href: n.link || "#", hidden: !n.link, target: n.link?.startsWith("#") ? null : "_blank", rel: "noopener", title: "Abrir link" }, "↗");
  const del = h("button", { type: "button", class: "sn-ico", title: "Arquivar nota", onclick: async () => { if (await saveNote(sb, n, { archived_at: new Date().toISOString() })) { el.remove(); onArchive?.(n); toast("Nota arquivada.", { actionLabel: "Desfazer", onAction: async () => { if (await saveNote(sb, n, { archived_at: null })) location.reload(); } }); } } }, "×");
  const head = h("div", { class: "sn-head" }, h("span", { class: "sn-grip", "aria-hidden": "true" }, "⋮⋮"), h("span", { class: "grow sn-drag" }), colorBtns, linkA, tagBtn, pin, del);
  const el = h("div", { class: `sn${board ? " sn-abs" : ""}`, dataset: { id: n.id }, style: { "--n": NOTE_COLORS[n.cor] || NOTE_COLORS.amarelo, ...(board ? { left: n.x + "px", top: n.y + "px", width: n.w + "px", height: n.h + "px", zIndex: n.z } : {}) } },
    head, ta, tags, board && h("div", { class: "sn-resize", "aria-hidden": "true" }));
  return el;
}

export default async function notas({ sb, query }) {
  const { data, error } = await sb.from("sticky_notes").select(COLS).is("archived_at", null).order("z", { ascending: true });
  if (error) return h("p", { class: "alert" }, "Não foi possível carregar as notas. A migration 0030 foi aplicada?");
  const notes = data || [];
  let filter = query.tag || "";
  const board = h("div", { class: "sn-board", "aria-label": "Quadro de notas" });
  const allTags = () => [...new Set(notes.flatMap((n) => n.tags))].sort();
  const tagBar = h("div", { class: "flex wrap sn-filter" });
  const drawTags = () => tagBar.replaceChildren(h("button", { type: "button", class: `chip${!filter ? " accent" : ""}`, onclick: () => { filter = ""; draw(); } }, "todas"), ...allTags().map((t) => h("button", { type: "button", class: `chip${filter === t ? " accent" : ""}`, onclick: () => { filter = t; draw(); } }, "#" + t)));
  const draw = () => { drawTags(); board.replaceChildren(...notes.filter((n) => !filter || n.tags.includes(filter)).map((n) => noteCard(sb, n, { board: true, onArchive: (x) => notes.splice(notes.indexOf(x), 1) }))); };
  let maxZ = Math.max(1, ...notes.map((n) => n.z));

  // arrastar pela barra, redimensionar pelo canto
  let act = null;
  board.addEventListener("pointerdown", (e) => {
    const card = e.target.closest(".sn"); if (!card) return;
    const n = notes.find((x) => x.id === card.dataset.id); if (!n) return;
    const isResize = e.target.classList.contains("sn-resize"), isHead = e.target.closest(".sn-head") && !e.target.closest("button,a");
    if (!isResize && !isHead) return;
    e.preventDefault(); card.setPointerCapture(e.pointerId);
    card.style.zIndex = ++maxZ;
    act = { n, card, isResize, sx: e.clientX, sy: e.clientY, x: n.x, y: n.y, w: card.offsetWidth, h: card.offsetHeight, moved: false };
  });
  board.addEventListener("pointermove", (e) => {
    if (!act) return; const dx = e.clientX - act.sx, dy = e.clientY - act.sy; act.moved = true;
    if (act.isResize) { act.card.style.width = Math.max(120, Math.min(900, act.w + dx)) + "px"; act.card.style.height = Math.max(90, Math.min(900, act.h + dy)) + "px"; }
    else { act.card.style.left = Math.max(0, act.x + dx) + "px"; act.card.style.top = Math.max(0, act.y + dy) + "px"; }
  });
  const up = async () => {
    if (!act) return; const a = act; act = null;
    const patch = { z: maxZ };
    if (a.moved) Object.assign(patch, a.isResize ? { w: Math.round(a.card.offsetWidth), h: Math.round(a.card.offsetHeight) } : { x: Math.round(parseFloat(a.card.style.left)), y: Math.round(parseFloat(a.card.style.top)) });
    await saveNote(sb, a.n, patch);
  };
  board.addEventListener("pointerup", up); board.addEventListener("pointercancel", up);

  const add = async () => {
    const sc = board.getBoundingClientRect(), x = Math.max(16, Math.round(-sc.left + 40 + Math.random() * 120)), y = Math.max(16, Math.round(Math.max(0, -sc.top) + 120 + Math.random() * 60));
    const { data: c, error: e } = await sb.from("sticky_notes").insert({ texto: "", cor: ["amarelo", "rosa", "verde", "azul", "laranja"][notes.length % 5], tags: filter ? [filter] : [], x, y, z: ++maxZ }).select(COLS);
    if (e) return toast("Não foi possível criar a nota.", { kind: "err" });
    notes.push(c[0]); draw(); board.querySelector(`[data-id="${c[0].id}"] textarea`)?.focus();
  };
  draw();
  return h("div", { class: "page wide" },
    pageHead("Sticky NoteS_", "notas e lembretes livres", h("button", { class: "btn", type: "button", onclick: add }, "+ Nota")),
    h("p", { class: "muted small", style: { marginBottom: "12px" } }, "Arraste pela barra de cima, redimensione pelo canto. ★ fixa a nota no PaineL_. # define tags e link."),
    tagBar, h("div", { class: "sn-scroll" }, board));
}
