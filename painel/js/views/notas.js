// NoteS_: notas no estilo Google Keep (texto livre ou lista com check) + os sticky notes do PaineL_.
// Tudo na tabela sticky_notes: tipo 'sticky' (presos na lateral do PaineL_), 'nota' (texto) e 'lista' (itens com check).
import { h } from "../util.js";
import { toast, pageHead } from "../ui.js";

export const NOTE_COLORS = { amarelo: "#f5c84c", laranja: "#ff8a5c", rosa: "#ff8fc0", verde: "#62e3a0", azul: "#6cbcff", roxo: "#b3a4ff", cinza: "#b9bdb6" };
export const NOTE_COLS = "id, tipo, titulo, texto, itens, cor, tags, x, y, w, h, z, fixada, link, version, updated_at";

/** Salva uma nota com controle de versão; devolve a linha nova ou null em conflito. */
export async function saveNote(sb, n, patch) {
  const { data, error } = await sb.from("sticky_notes").update(patch).eq("id", n.id).eq("version", n.version).select(NOTE_COLS).maybeSingle();
  if (error) { toast("Não salvou a nota.", { kind: "err" }); return null; }
  if (!data) { toast("A nota mudou em outro lugar. Recarregue a página.", { kind: "err", actionLabel: "Recarregar", onAction: () => location.reload() }); return null; }
  Object.assign(n, data); return n;
}

export async function createNote(sb, row) {
  const { data, error } = await sb.from("sticky_notes").insert({ texto: "", tags: [], itens: [], ...row }).select(NOTE_COLS);
  if (error) { toast("Não foi possível criar a nota.", { kind: "err" }); return null; }
  return data[0];
}

const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.flush = (...a) => { clearTimeout(t); fn(...a); }; return d; };
const colorRow = (onPick) => h("div", { class: "sn-colors" }, ...Object.entries(NOTE_COLORS).map(([k, c]) => h("button", { type: "button", style: { background: c }, "aria-label": `Cor ${k}`, title: k, onclick: () => onPick(k) })));

/** Sticky note (cartão adesivo). Usado na lateral do PaineL_ e no NoteS_. */
export function stickyCard(sb, n, { onArchive, onUnpin } = {}) {
  const ta = h("textarea", { class: "sn-text", placeholder: "Escreva o lembrete…", "aria-label": "Texto do sticky" }); ta.value = n.texto;
  const save = debounce(() => saveNote(sb, n, { texto: ta.value.slice(0, 4000) }), 700);
  ta.addEventListener("input", save); ta.addEventListener("blur", () => { if (ta.value !== n.texto) save.flush(); });
  const pin = h("button", { type: "button", class: `sn-ico${n.fixada ? " on" : ""}`, title: n.fixada ? "Soltar da lateral do PaineL_" : "Prender na lateral do PaineL_", "aria-pressed": String(n.fixada),
    onclick: async () => { if (await saveNote(sb, n, { fixada: !n.fixada })) { pin.classList.toggle("on", n.fixada); pin.setAttribute("aria-pressed", String(n.fixada)); toast(n.fixada ? "Preso na lateral do PaineL_." : "Solto da lateral (continua no NoteS_)."); if (!n.fixada) onUnpin?.(n, el); } } }, "◉");
  const el = h("div", { class: "sn", dataset: { id: n.id }, style: { "--n": NOTE_COLORS[n.cor] || NOTE_COLORS.amarelo } },
    h("div", { class: "sn-head" }, h("span", { class: "grow sn-drag" }),
      colorRow(async (k) => { if (await saveNote(sb, n, { cor: k })) el.style.setProperty("--n", NOTE_COLORS[k]); }),
      pin,
      h("button", { type: "button", class: "sn-ico", title: "Arquivar", "aria-label": "Arquivar sticky", onclick: async () => { if (await saveNote(sb, n, { archived_at: new Date().toISOString() })) { el.remove(); onArchive?.(n); toast("Sticky arquivado.", { actionLabel: "Desfazer", onAction: async () => { if (await saveNote(sb, n, { archived_at: null })) location.reload(); } }); } } }, "×")),
    ta);
  return el;
}

/** Nota estilo Keep: título + texto livre, ou título + lista com check. */
export function keepCard(sb, n, { onArchive } = {}) {
  const title = h("input", { class: "kp-title", placeholder: "Título", value: n.titulo || "", maxlength: 200, "aria-label": "Título da nota" });
  const saveTitle = debounce(() => saveNote(sb, n, { titulo: title.value.trim() || null }), 700);
  title.addEventListener("input", saveTitle);
  let body;
  if (n.tipo === "lista") {
    const itens = Array.isArray(n.itens) ? n.itens.map((x) => ({ t: String(x.t ?? ""), ok: !!x.ok })) : [];
    const saveItens = debounce(() => saveNote(sb, n, { itens }), 600);
    const ul = h("ul", { class: "kp-list" });
    const draw = (focusIdx) => {
      const idx = itens.map((x, i) => [x, i]);
      const ordered = [...idx.filter(([x]) => !x.ok), ...idx.filter(([x]) => x.ok)];
      ul.replaceChildren(...ordered.map(([x, i]) => {
        const inp = h("input", { class: "kp-it", value: x.t, placeholder: "Item", "aria-label": "Item da lista" });
        inp.addEventListener("input", () => { itens[i].t = inp.value; saveItens(); });
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); itens.splice(i + 1, 0, { t: "", ok: false }); saveItens(); draw(i + 1); }
          if (e.key === "Backspace" && !inp.value && itens.length > 1) { e.preventDefault(); itens.splice(i, 1); saveItens(); draw(Math.max(0, i - 1)); }
        });
        if (focusIdx === i) setTimeout(() => inp.focus(), 0);
        return h("li", { class: x.ok ? "ok" : "" },
          h("input", { type: "checkbox", checked: x.ok, "aria-label": "Feito", onchange: (e) => { itens[i].ok = e.target.checked; saveItens(); draw(); } }), inp,
          h("button", { type: "button", class: "sn-ico", "aria-label": "Remover item", onclick: () => { itens.splice(i, 1); saveItens(); draw(); } }, "×"));
      }), h("li", { class: "kp-add" }, h("button", { type: "button", onclick: () => { itens.push({ t: "", ok: false }); saveItens(); draw(itens.length - 1); } }, "+ item")));
    };
    draw(); body = ul;
  } else {
    const ta = h("textarea", { class: "kp-text", placeholder: "Escreva livremente…", rows: 4, "aria-label": "Texto da nota" }); ta.value = n.texto;
    const fit = () => { ta.style.height = "auto"; ta.style.height = Math.min(520, ta.scrollHeight + 2) + "px"; };
    const save = debounce(() => saveNote(sb, n, { texto: ta.value.slice(0, 4000) }), 700);
    ta.addEventListener("input", () => { fit(); save(); }); setTimeout(fit, 0);
    body = ta;
  }
  const el = h("article", { class: "kp", dataset: { id: n.id }, style: { "--n": NOTE_COLORS[n.cor] || NOTE_COLORS.cinza } },
    title, body,
    h("div", { class: "kp-foot" },
      colorRow(async (k) => { if (await saveNote(sb, n, { cor: k })) el.style.setProperty("--n", NOTE_COLORS[k]); }),
      h("span", { class: "grow" }),
      h("span", { class: "mono" }, n.tipo === "lista" ? "lista" : "texto"),
      h("button", { type: "button", class: "sn-ico", title: "Arquivar", "aria-label": "Arquivar nota", onclick: async () => { if (await saveNote(sb, n, { archived_at: new Date().toISOString() })) { el.remove(); onArchive?.(n); toast("Nota arquivada.", { actionLabel: "Desfazer", onAction: async () => { if (await saveNote(sb, n, { archived_at: null })) location.reload(); } }); } } }, "×")));
  return el;
}

/** Lateral do PaineL_: botão que gera sticky + stickies presos (fixada = true). */
export async function stickySide(sb) {
  const { data, error } = await sb.from("sticky_notes").select(NOTE_COLS).is("archived_at", null).eq("tipo", "sticky").eq("fixada", true).order("updated_at", { ascending: false }).limit(20);
  if (error) return null;
  const list = h("div", { class: "sn-side" });
  const draw = (items) => list.replaceChildren(...items.map((n) => stickyCard(sb, n, { onUnpin: (_, el) => el.remove() })), !items.length ? h("p", { class: "muted small" }, "Nenhum sticky preso. Clique em + Sticky.") : null);
  const items = data || []; draw(items);
  const add = async () => { const n = await createNote(sb, { tipo: "sticky", cor: ["amarelo", "rosa", "verde", "azul", "laranja"][items.length % 5], fixada: true }); if (!n) return; items.unshift(n); draw(items); list.querySelector(`[data-id="${n.id}"] textarea`)?.focus(); };
  return h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "#f5c84c" } }), h("h2", { class: "mono grow" }, "Sticky NoteS_"), h("a", { class: "mono", href: "#/notas" }, "NoteS_ →")),
    h("div", { class: "panel-body" }, h("button", { class: "btn btn-sm", type: "button", style: { width: "100%", marginBottom: "10px" }, onclick: add }, "+ Sticky"), list));
}

export default async function notas({ sb }) {
  const { data, error } = await sb.from("sticky_notes").select(NOTE_COLS).is("archived_at", null).order("updated_at", { ascending: false });
  if (error) return h("p", { class: "alert" }, "Não foi possível carregar as notas. A migration 0031 foi aplicada?");
  const all = data || [];
  let busca = "";
  const stickies = h("div", { class: "sn-grid" }), keeps = h("div", { class: "kp-grid" });
  const match = (n) => !busca || `${n.titulo || ""} ${n.texto} ${(n.itens || []).map((x) => x.t).join(" ")}`.toLowerCase().includes(busca);
  const drop = (x) => { const i = all.indexOf(x); if (i >= 0) all.splice(i, 1); };
  const draw = () => {
    const st = all.filter((n) => n.tipo === "sticky" && match(n)), kp = all.filter((n) => n.tipo !== "sticky" && match(n));
    stickies.replaceChildren(...(st.length ? st.map((n) => stickyCard(sb, n, { onArchive: drop })) : [h("p", { class: "empty" }, "Nenhum sticky. Crie aqui ou na lateral do PaineL_.")]));
    keeps.replaceChildren(...(kp.length ? kp.map((n) => keepCard(sb, n, { onArchive: drop })) : [h("p", { class: "empty" }, "Nenhuma nota ainda. Use + Nota (texto livre) ou + Lista (com check).")]));
  };
  const add = async (tipo) => {
    const row = tipo === "sticky" ? { tipo, cor: "amarelo", fixada: true } : tipo === "lista" ? { tipo, cor: "cinza", itens: [{ t: "", ok: false }] } : { tipo, cor: "cinza" };
    const n = await createNote(sb, row); if (!n) return;
    all.unshift(n); draw();
    setTimeout(() => (tipo === "sticky" ? stickies : keeps).querySelector(`[data-id="${n.id}"] ${tipo === "sticky" ? "textarea" : ".kp-title"}`)?.focus(), 0);
  };
  const search = h("input", { class: "input", type: "search", placeholder: "Buscar nas notas…", "aria-label": "Buscar nas notas", style: { maxWidth: "340px" } });
  search.addEventListener("input", () => { busca = search.value.trim().toLowerCase(); draw(); });
  draw();
  return h("div", { class: "page" },
    pageHead("NoteS_", "anotações livres, listas e stickies",
      h("button", { class: "btn", type: "button", onclick: () => add("nota") }, "+ Nota"),
      h("button", { class: "btn btn-ghost", type: "button", onclick: () => add("lista") }, "+ Lista"),
      h("button", { class: "btn btn-ghost", type: "button", onclick: () => add("sticky") }, "+ Sticky")),
    h("div", { style: { marginBottom: "16px" } }, search),
    h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Notas e listas")), h("div", { class: "panel-body" }, keeps)),
    h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "#f5c84c" } }), h("h2", { class: "mono grow" }, "Stickies · ◉ preso na lateral do PaineL_")), h("div", { class: "panel-body" }, stickies)));
}
