// Stickies flutuantes: "+ Sticky" na barra de cima cria um post-it que fica por cima de todas as telas do painel.
// Arrasta pelo topo, redimensiona pelo canto, posição salva em sticky_notes (x, y, w, h, z). Quantos quiser.
import { h } from "./util.js";
import { toast } from "./ui.js";
import { NOTE_COLORS, NOTE_COLS, saveNote, createNote } from "./views/notas.js?v=20261115d";

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

export async function mountFloatNotes(sb, toolbar) {
  const layer = h("div", { class: "fn-layer" });
  document.body.append(layer);
  let topZ = 10;

  const card = (n) => {
    const ta = h("textarea", { class: "sn-text", placeholder: "Escreva o lembrete…", "aria-label": "Texto do sticky" }); ta.value = n.texto || "";
    let t; ta.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => saveNote(sb, n, { texto: ta.value.slice(0, 4000) }), 700); });
    const colors = h("div", { class: "sn-colors" }, ...Object.entries(NOTE_COLORS).map(([k, c]) => h("button", { type: "button", style: { background: c }, title: k, "aria-label": `Cor ${k}`,
      onclick: async () => { if (await saveNote(sb, n, { cor: k })) el.style.setProperty("--n", c); } })));
    const head = h("div", { class: "sn-head fn-head" }, h("span", { class: "sn-grip" }, "⋮⋮"), h("span", { class: "grow" }), colors,
      h("button", { type: "button", class: "sn-ico", title: "Arquivar (some da tela, fica no NoteS_)", "aria-label": "Arquivar sticky", onclick: async () => {
        if (await saveNote(sb, n, { archived_at: new Date().toISOString() })) { el.remove(); toast("Sticky arquivado.", { actionLabel: "Desfazer", onAction: async () => { if (await saveNote(sb, n, { archived_at: null })) layer.append(el); } }); } } }, "×"));
    const el = h("div", { class: "sn fn", dataset: { id: n.id }, style: { "--n": NOTE_COLORS[n.cor] || NOTE_COLORS.amarelo } }, head, ta);
    const place = () => {
      const W = innerWidth, H = innerHeight, w = clamp(+n.w || 220, 150, 600), hh = clamp(+n.h || 170, 100, 600);
      Object.assign(el.style, { width: w + "px", height: hh + "px", left: clamp(+n.x || W - w - 24, 0, W - 60) + "px", top: clamp(+n.y || 130, 0, H - 40) + "px", zIndex: String(+n.z || 10) });
      topZ = Math.max(topZ, +n.z || 10);
    };
    place();
    const front = () => { if (+el.style.zIndex < topZ) { topZ++; el.style.zIndex = String(topZ); n.z = topZ; } };
    el.addEventListener("pointerdown", front);
    head.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      e.preventDefault(); head.setPointerCapture(e.pointerId);
      const sx = e.clientX - el.offsetLeft, sy = e.clientY - el.offsetTop;
      const mv = (ev) => { el.style.left = clamp(ev.clientX - sx, 0, innerWidth - 60) + "px"; el.style.top = clamp(ev.clientY - sy, 0, innerHeight - 40) + "px"; };
      const up = () => { head.removeEventListener("pointermove", mv); head.removeEventListener("pointerup", up); saveNote(sb, n, { x: el.offsetLeft, y: el.offsetTop, z: +el.style.zIndex }); };
      head.addEventListener("pointermove", mv); head.addEventListener("pointerup", up);
    });
    // Redimensionar: CSS resize; salva quando o tamanho para de mudar.
    let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { const w = el.offsetWidth, hh = el.offsetHeight; if (Math.abs(w - (+n.w || 0)) > 2 || Math.abs(hh - (+n.h || 0)) > 2) saveNote(sb, n, { w, h: hh }); }, 600); }).observe(el);
    return el;
  };

  const { data, error } = await sb.from("sticky_notes").select(NOTE_COLS).is("archived_at", null).eq("tipo", "sticky").eq("fixada", true).order("z").limit(50);
  if (!error) layer.append(...(data || []).map(card));

  const add = async () => {
    const i = layer.children.length;
    const n = await createNote(sb, { tipo: "sticky", fixada: true, cor: ["amarelo", "rosa", "verde", "azul", "laranja"][i % 5], x: Math.max(0, innerWidth - 260 - (i % 6) * 24), y: 130 + (i % 6) * 24, w: 220, h: 170, z: ++topZ });
    if (!n) return; const el = card(n); layer.append(el); el.querySelector("textarea").focus();
  };
  toolbar?.append(h("button", { class: "btn btn-sm fn-add", type: "button", title: "Cria um post-it flutuante que você arrasta pra qualquer canto", onclick: add }, "+ Sticky"));
}
