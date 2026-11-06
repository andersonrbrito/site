// Map MentaleS_: mapa mental editável em canvas infinito (zoom, pan, nós, grupos, conexões, notas, links).
// Dados em public.mapas.data = { nodes:[{id,type,x,y,w,h,text,note,link,color,fs}], edges:[{id,from,to,label,color}], view:{x,y,k} }
// Salvamento automático com controle de versão; rascunho local de segurança; export/import JSON e PNG.
import { h } from "../util.js";
import { toast } from "../ui.js";

const COLORS = { cinza: "#7e847d", laranja: "#ff4f32", amarelo: "#f5c84c", verde: "#3ddc84", azul: "#3da7ff", roxo: "#9b87ff", rosa: "#ff7eb6", vermelho: "#ff6b6b" };
const TYPES = { node: "Nó", text: "Texto", group: "Grupo" };
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DRAFT = (id) => `aos-mapa-draft:${id}`;
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage */ } }, del(k) { try { localStorage.removeItem(k); } catch { /* sem storage */ } } };

export function validMap(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.nodes) || !Array.isArray(d.edges)) return null;
  const ids = new Set();
  const nodes = d.nodes.filter((n) => n && typeof n.id === "string" && Number.isFinite(+n.x) && Number.isFinite(+n.y)).map((n) => {
    ids.add(n.id);
    return { id: n.id, type: TYPES[n.type] ? n.type : "node", x: +n.x, y: +n.y, w: clamp(+n.w || 200, 60, 4000), h: n.type === "group" ? clamp(+n.h || 300, 60, 4000) : undefined, text: String(n.text ?? ""), note: String(n.note ?? ""), link: String(n.link ?? ""), color: COLORS[n.color] ? n.color : "cinza", fs: clamp(+n.fs || (n.type === "text" ? 22 : 15), 10, 96) };
  });
  const edges = d.edges.filter((e) => e && ids.has(e.from) && ids.has(e.to) && e.from !== e.to).map((e) => ({ id: String(e.id || uid()), from: e.from, to: e.to, label: String(e.label ?? ""), color: COLORS[e.color] ? e.color : "cinza" }));
  const v = d.view || {};
  return { nodes, edges, view: { x: +v.x || 0, y: +v.y || 0, k: clamp(+v.k || 1, 0.1, 3) } };
}

export default async function mapa({ sb, query, go }) {
  const { data: list, error } = await sb.from("mapas").select("id, slug, titulo, version, updated_at").is("archived_at", null).order("updated_at", { ascending: false });
  if (error) return h("p", { class: "alert" }, "Não foi possível carregar os mapas. A migration 0030 foi aplicada?");
  let maps = list || [];
  if (!maps.length) {
    const starter = { nodes: [{ id: uid(), type: "node", x: 0, y: 0, w: 260, text: "anderson_Os\nMeta: R$ 3.000 em 60 dias", note: "", link: "", color: "laranja", fs: 18 }], edges: [], view: { x: 0, y: 0, k: 1 } };
    const { data: c, error: e2 } = await sb.from("mapas").insert({ slug: "ecossistema", titulo: "Ecossistema", data: starter }).select("id, slug, titulo, version, updated_at");
    if (e2) return h("p", { class: "alert" }, "Não foi possível criar o primeiro mapa.");
    maps = c;
  }
  const cur = maps.find((m) => m.slug === query.m) || maps[0];
  const { data: row } = await sb.from("mapas").select("id, slug, titulo, data, version, updated_at").eq("id", cur.id).maybeSingle();
  let doc = validMap(row.data) || { nodes: [], edges: [], view: { x: 0, y: 0, k: 1 } };
  let version = row.version;
  const draft = store.get(DRAFT(row.id));
  if (draft && draft.base === version && draft.data && JSON.stringify(draft.data) !== JSON.stringify(doc)) {
    const d = validMap(draft.data); if (d) { doc = d; setTimeout(() => { toast("Recuperei alterações que não tinham sido salvas."); queueSave(); }, 300); }
  }

  // ───────── estado ─────────
  let view = { ...doc.view }, sel = new Set(), selEdge = null, editing = null, selAll = false;
  const hist = [], fut = [];
  const snap = () => JSON.stringify({ nodes: doc.nodes, edges: doc.edges });
  const commit = () => { hist.push(snap()); if (hist.length > 100) hist.shift(); fut.length = 0; };
  const restore = (s) => { const d = JSON.parse(s); doc.nodes = d.nodes; doc.edges = d.edges; sel.clear(); selEdge = null; render(); queueSave(); };
  const undo = () => { if (!hist.length) return; fut.push(snap()); restore(hist.pop()); };
  const redo = () => { if (!fut.length) return; hist.push(snap()); restore(fut.pop()); };
  const byId = (id) => doc.nodes.find((n) => n.id === id);

  // ───────── salvamento ─────────
  const status = h("span", { class: "mono mm-status" }, "salvo");
  let saveT, saving = false, dirty = false, conflict = false;
  function queueSave() {
    dirty = true; status.textContent = "alterado…";
    store.set(DRAFT(row.id), { base: version, data: { ...doc, view }, at: Date.now() });
    clearTimeout(saveT); saveT = setTimeout(save, 900);
  }
  async function save() {
    if (saving || conflict) return; if (!dirty) return;
    saving = true; dirty = false; status.textContent = "salvando…";
    const payload = { nodes: doc.nodes, edges: doc.edges, view };
    const { data, error: e } = await sb.from("mapas").update({ data: payload }).eq("id", row.id).eq("version", version).select("version").maybeSingle();
    saving = false;
    if (e) { dirty = true; status.textContent = "erro ao salvar"; toast("Não salvou o mapa. Tento de novo em instantes.", { kind: "err" }); saveT = setTimeout(save, 5000); return; }
    if (!data) { conflict = true; status.textContent = "conflito"; toast("O mapa mudou em outra aba ou aparelho. Suas alterações ficaram guardadas neste navegador.", { kind: "err", actionLabel: "Recarregar", onAction: () => location.reload() }); return; }
    version = data.version; store.set(DRAFT(row.id), { base: version, data: payload, at: Date.now() });
    status.textContent = "salvo"; if (dirty) save(); else store.del(DRAFT(row.id));
  }
  addEventListener("pagehide", () => { if (dirty) store.set(DRAFT(row.id), { base: version, data: { ...doc, view }, at: Date.now() }); }, { once: true });

  // ───────── DOM ─────────
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "mm-edges");
  svg.innerHTML = `<defs>${Object.entries(COLORS).map(([k, c]) => `<marker id="mm-a-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join("")}</defs>`; // conteúdo fixo, sem dados do usuário
  const gEdges = document.createElementNS("http://www.w3.org/2000/svg", "g"); svg.append(gEdges);
  const tmpLine = document.createElementNS("http://www.w3.org/2000/svg", "path"); tmpLine.setAttribute("class", "mm-tmp"); svg.append(tmpLine);
  const layerGroups = h("div", { class: "mm-layer" }), layerNodes = h("div", { class: "mm-layer" }), layerLabels = h("div", { class: "mm-layer" });
  const world = h("div", { class: "mm-world" }, layerGroups, svg, layerNodes, layerLabels);
  const marquee = h("div", { class: "mm-marquee", hidden: true });
  const zoomTxt = h("span", { class: "mono" }, "100%");
  const vp = h("div", { class: "mm-vp", tabindex: "0", "aria-label": "Mapa mental. Duplo clique cria um nó; arraste o fundo para mover." }, world, marquee);
  const inspector = h("aside", { class: "mm-insp", hidden: true });

  const applyView = () => { world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`; zoomTxt.textContent = Math.round(view.k * 100) + "%"; vp.style.backgroundPosition = `${view.x}px ${view.y}px`; vp.style.backgroundSize = `${28 * view.k}px ${28 * view.k}px`; };
  const toWorld = (cx, cy) => { const r = vp.getBoundingClientRect(); return { x: (cx - r.left - view.x) / view.k, y: (cy - r.top - view.y) / view.k }; };
  const sizes = new Map();
  const size = (n) => (n.type === "group" ? { w: n.w, h: n.h } : sizes.get(n.id) || { w: n.w, h: 60 });

  function nodeEl(n) {
    const isSel = sel.has(n.id), c = COLORS[n.color];
    if (n.type === "group") {
      const el = h("div", { class: `mm-group${isSel ? " sel" : ""}`, dataset: { id: n.id }, style: { left: n.x + "px", top: n.y + "px", width: n.w + "px", height: n.h + "px", "--c": c } },
        h("div", { class: "mm-gtitle", style: { fontSize: n.fs + "px" } }, n.text || "Grupo"), h("div", { class: "mm-resize", dataset: { resize: n.id } }));
      return el;
    }
    const txt = h("div", { class: "mm-text", style: { fontSize: n.fs + "px" } }, n.text);
    if (editing === n.id) { txt.setAttribute("contenteditable", "plaintext-only"); txt.spellcheck = true; }
    const el = h("div", { class: `mm-node mm-t-${n.type}${isSel ? " sel" : ""}`, dataset: { id: n.id }, style: { left: n.x + "px", top: n.y + "px", width: n.w + "px", "--c": c } },
      txt,
      (n.note || n.link) && h("div", { class: "mm-meta" },
        n.note && h("span", { class: "mm-chip", title: n.note }, "nota"),
        n.link && h("a", { class: "mm-chip", href: n.link, target: n.link.startsWith("#") ? null : "_blank", rel: "noopener", onpointerdown: (e) => e.stopPropagation() }, n.link.startsWith("#") ? "abrir ↗" : "link ↗")),
      h("div", { class: "mm-handle", dataset: { handle: n.id }, title: "Arraste para conectar" }),
      h("div", { class: "mm-resize", dataset: { resize: n.id } }));
    return el;
  }

  function anchor(a, b) { // pontos de saída/chegada nas bordas mais próximas
    const sa = size(a), sbb = size(b);
    const ca = { x: a.x + sa.w / 2, y: a.y + sa.h / 2 }, cb = { x: b.x + sbb.w / 2, y: b.y + sbb.h / 2 };
    const dx = cb.x - ca.x, dy = cb.y - ca.y;
    if (Math.abs(dx) * (sa.h + sbb.h) > Math.abs(dy) * (sa.w + sbb.w)) {
      const s = Math.sign(dx) || 1;
      return [{ x: ca.x + s * sa.w / 2, y: ca.y, dx: s, dy: 0 }, { x: cb.x - s * sbb.w / 2, y: cb.y, dx: -s, dy: 0 }];
    }
    const s = Math.sign(dy) || 1;
    return [{ x: ca.x, y: ca.y + s * sa.h / 2, dx: 0, dy: s }, { x: cb.x, y: cb.y - s * sbb.h / 2, dx: 0, dy: -s }];
  }
  const curve = (p, q) => { const d = Math.max(40, Math.hypot(q.x - p.x, q.y - p.y) / 2.5); return `M${p.x} ${p.y}C${p.x + p.dx * d} ${p.y + p.dy * d} ${q.x + q.dx * d} ${q.y + q.dy * d} ${q.x} ${q.y}`; };

  function drawEdges() {
    gEdges.replaceChildren(); layerLabels.replaceChildren();
    for (const e of doc.edges) {
      const a = byId(e.from), b = byId(e.to); if (!a || !b) continue;
      const [p, q] = anchor(a, b), d = curve(p, q);
      const hit = document.createElementNS("http://www.w3.org/2000/svg", "path"); hit.setAttribute("d", d); hit.setAttribute("class", "mm-hit"); hit.dataset.edge = e.id;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("d", d); path.setAttribute("class", `mm-edge${selEdge === e.id ? " sel" : ""}`);
      path.setAttribute("stroke", COLORS[e.color]); path.setAttribute("marker-end", `url(#mm-a-${e.color})`);
      gEdges.append(path, hit);
      if (e.label) layerLabels.append(h("div", { class: "mm-elabel", dataset: { edge: e.id }, style: { left: (p.x + q.x) / 2 + "px", top: (p.y + q.y) / 2 + "px" } }, e.label));
    }
  }
  function measure() { layerNodes.querySelectorAll(".mm-node").forEach((el) => sizes.set(el.dataset.id, { w: el.offsetWidth, h: el.offsetHeight })); }
  function render() {
    layerGroups.replaceChildren(...doc.nodes.filter((n) => n.type === "group").map(nodeEl));
    layerNodes.replaceChildren(...doc.nodes.filter((n) => n.type !== "group").map(nodeEl));
    measure(); drawEdges(); drawInspector();
    if (editing) { const t = layerNodes.querySelector(`[data-id="${editing}"] .mm-text`) || null; if (t) { t.focus(); const r = document.createRange(); r.selectNodeContents(t); if (!selAll) r.collapse(false); selAll = false; const s = getSelection(); s.removeAllRanges(); s.addRange(r); } }
  }
  const moveEls = () => { for (const id of sel) { const n = byId(id), el = world.querySelector(`[data-id="${id}"]`); if (n && el) { el.style.left = n.x + "px"; el.style.top = n.y + "px"; } } drawEdges(); };

  // ───────── ações ─────────
  function addNode(type, at, extra = {}) {
    commit();
    const r = vp.getBoundingClientRect(), p = at || toWorld(r.left + r.width / 2, r.top + r.height / 2);
    const n = { id: uid(), type, x: Math.round(p.x - (type === "group" ? 200 : 100)), y: Math.round(p.y - (type === "group" ? 150 : 25)), w: type === "group" ? 400 : type === "text" ? 280 : 200, h: type === "group" ? 300 : undefined, text: type === "group" ? "Grupo" : type === "text" ? "Texto livre" : "Nova ideia", note: "", link: "", color: type === "group" ? "azul" : "cinza", fs: type === "text" ? 22 : type === "group" ? 16 : 15, ...extra };
    doc.nodes.push(n); sel = new Set([n.id]); selEdge = null; editing = type === "group" ? null : n.id; selAll = !!editing; render(); queueSave(); return n;
  }
  function addChild() {
    const [id] = sel; const p = id && byId(id); if (!p || p.type === "group") return;
    const kids = doc.edges.filter((e) => e.from === p.id).length;
    const n = addNode("node", { x: p.x + size(p).w + 180, y: p.y + 25 + kids * 90 }, { color: p.color });
    doc.edges.push({ id: uid(), from: p.id, to: n.id, label: "", color: p.color }); drawEdges(); queueSave();
  }
  function delSel() {
    if (!sel.size && !selEdge) return; commit();
    if (selEdge) doc.edges = doc.edges.filter((e) => e.id !== selEdge);
    doc.nodes = doc.nodes.filter((n) => !sel.has(n.id)); doc.edges = doc.edges.filter((e) => !sel.has(e.from) && !sel.has(e.to));
    sel.clear(); selEdge = null; render(); queueSave();
  }
  function dupSel() {
    if (!sel.size) return; commit(); const map = {}, add = [];
    for (const id of sel) { const n = byId(id); const c = { ...n, id: uid(), x: n.x + 30, y: n.y + 30 }; map[id] = c.id; add.push(c); }
    const edges = doc.edges.filter((e) => map[e.from] && map[e.to]).map((e) => ({ ...e, id: uid(), from: map[e.from], to: map[e.to] }));
    doc.nodes.push(...add); doc.edges.push(...edges); sel = new Set(add.map((n) => n.id)); render(); queueSave();
  }
  const setColor = (c) => { if (!sel.size && !selEdge) return; commit(); for (const id of sel) byId(id).color = c; if (selEdge) doc.edges.find((e) => e.id === selEdge).color = c; render(); queueSave(); };
  function zoomAt(k, cx, cy) { const r = vp.getBoundingClientRect(); cx ??= r.left + r.width / 2; cy ??= r.top + r.height / 2; const w = toWorld(cx, cy); view.k = clamp(k, 0.1, 3); view.x = cx - r.left - w.x * view.k; view.y = cy - r.top - w.y * view.k; applyView(); queueViewSave(); }
  function bounds(nodes = doc.nodes) {
    if (!nodes.length) return { x: -200, y: -200, w: 400, h: 400 };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of nodes) { const s = size(n); x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y); x1 = Math.max(x1, n.x + s.w); y1 = Math.max(y1, n.y + s.h); }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function fit() { const b = bounds(), r = vp.getBoundingClientRect(); const k = clamp(Math.min((r.width - 80) / b.w, (r.height - 80) / b.h), 0.1, 1.5); view = { k, x: (r.width - b.w * k) / 2 - b.x * k, y: (r.height - b.h * k) / 2 - b.y * k }; applyView(); queueViewSave(); }
  let viewT; const queueViewSave = () => { clearTimeout(viewT); viewT = setTimeout(() => { if (!dirty) { dirty = true; save(); } }, 2500); };

  // ───────── ponteiro: pan, arrastar, conectar, redimensionar, seleção em área, pinça ─────────
  const ptrs = new Map(); let act = null;
  vp.addEventListener("pointerdown", (e) => {
    if (e.button === 2) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; act = { kind: "pinch", d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k }; return; }
    const t = e.target;
    if (editing && t.closest(".mm-text[contenteditable]")) return;
    if (editing) finishEdit();
    vp.focus({ preventScroll: true });
    const w = toWorld(e.clientX, e.clientY);
    const handle = t.dataset?.handle, rs = t.dataset?.resize, edgeId = t.closest("[data-edge]")?.dataset.edge, nodeEl2 = t.closest("[data-id]");
    vp.setPointerCapture(e.pointerId);
    if (handle) { act = { kind: "link", from: handle }; return; }
    if (rs) { commit(); const n = byId(rs); act = { kind: "resize", n, sx: w.x, sy: w.y, w: size(n).w, h: size(n).h }; return; }
    if (edgeId) { selEdge = edgeId; sel.clear(); render(); act = null; return; }
    if (nodeEl2) {
      const id = nodeEl2.dataset.id; selEdge = null;
      if (e.shiftKey) { sel.has(id) ? sel.delete(id) : sel.add(id); } else if (!sel.has(id)) sel = new Set([id]);
      // grupo arrasta junto o que está dentro dele
      const moving = new Set(sel);
      for (const gid of sel) { const g = byId(gid); if (g?.type === "group") for (const n of doc.nodes) { if (n.type === "group" && n.id === gid) continue; const s = size(n); if (n.x >= g.x && n.y >= g.y && n.x + s.w <= g.x + g.w && n.y + s.h <= g.y + g.h) moving.add(n.id); } }
      act = { kind: "drag", sx: w.x, sy: w.y, start: [...moving].map((i) => ({ n: byId(i), x: byId(i).x, y: byId(i).y })), moved: false };
      layerNodes.querySelectorAll(".mm-node, .mm-group").forEach((el) => el.classList.toggle("sel", sel.has(el.dataset.id)));
      layerGroups.querySelectorAll(".mm-group").forEach((el) => el.classList.toggle("sel", sel.has(el.dataset.id)));
      drawInspector(); return;
    }
    if (e.shiftKey) { act = { kind: "marquee", sx: e.clientX, sy: e.clientY }; return; }
    act = { kind: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
  });
  vp.addEventListener("pointermove", (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!act) return;
    if (act.kind === "pinch" && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; zoomAt(act.k * Math.hypot(a.x - b.x, a.y - b.y) / act.d, (a.x + b.x) / 2, (a.y + b.y) / 2); return; }
    const w = toWorld(e.clientX, e.clientY);
    if (act.kind === "pan") { view.x = act.vx + e.clientX - act.sx; view.y = act.vy + e.clientY - act.sy; act.moved ||= Math.hypot(e.clientX - act.sx, e.clientY - act.sy) > 3; applyView(); }
    else if (act.kind === "drag") {
      const dx = w.x - act.sx, dy = w.y - act.sy;
      if (!act.moved && Math.hypot(dx, dy) * view.k < 3) return;
      if (!act.moved) { commit(); act.moved = true; }
      const snapv = (v) => (e.altKey ? v : Math.round(v / 4) * 4);
      for (const s of act.start) { s.n.x = snapv(s.x + dx); s.n.y = snapv(s.y + dy); }
      const ids = new Set(act.start.map((s) => s.n.id)); const keep = sel; sel = ids; moveEls(); sel = keep;
    } else if (act.kind === "resize") {
      act.n.w = Math.round(clamp(act.w + w.x - act.sx, 80, 4000));
      if (act.n.type === "group") act.n.h = Math.round(clamp(act.h + w.y - act.sy, 60, 4000));
      const el = world.querySelector(`[data-id="${act.n.id}"]`); el.style.width = act.n.w + "px"; if (act.n.type === "group") el.style.height = act.n.h + "px";
      measure(); drawEdges();
    } else if (act.kind === "link") {
      const a = byId(act.from), s = size(a); tmpLine.setAttribute("d", `M${a.x + s.w} ${a.y + s.h / 2}L${w.x} ${w.y}`);
    } else if (act.kind === "marquee") {
      const r = vp.getBoundingClientRect(), x = Math.min(act.sx, e.clientX) - r.left, y = Math.min(act.sy, e.clientY) - r.top;
      Object.assign(marquee.style, { left: x + "px", top: y + "px", width: Math.abs(e.clientX - act.sx) + "px", height: Math.abs(e.clientY - act.sy) + "px" }); marquee.hidden = false;
      act.ex = e.clientX; act.ey = e.clientY;
    }
  });
  const end = (e) => {
    ptrs.delete(e.pointerId);
    if (!act) return; const a = act; act = null;
    if (a.kind === "pinch") return;
    if (a.kind === "pan") { if (!a.moved) { sel.clear(); selEdge = null; render(); } else queueViewSave(); }
    else if (a.kind === "drag" && a.moved) queueSave();
    else if (a.kind === "resize") { render(); queueSave(); }
    else if (a.kind === "link") {
      tmpLine.setAttribute("d", "");
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-id]");
      const to = over?.dataset.id;
      if (to && to !== a.from && !doc.edges.some((x) => x.from === a.from && x.to === to)) { commit(); doc.edges.push({ id: uid(), from: a.from, to, label: "", color: byId(a.from).color }); render(); queueSave(); }
      else if (!to) { const w = toWorld(e.clientX, e.clientY); const from = byId(a.from); const n = addNode("node", { x: w.x + 100, y: w.y + 25 }, { color: from.color }); doc.edges.push({ id: uid(), from: a.from, to: n.id, label: "", color: from.color }); drawEdges(); queueSave(); }
    } else if (a.kind === "marquee") {
      marquee.hidden = true; if (a.ex == null) return;
      const p = toWorld(Math.min(a.sx, a.ex), Math.min(a.sy, a.ey)), q = toWorld(Math.max(a.sx, a.ex), Math.max(a.sy, a.ey));
      for (const n of doc.nodes) { const s = size(n); if (n.x >= p.x && n.y >= p.y && n.x + s.w <= q.x && n.y + s.h <= q.y) sel.add(n.id); }
      render();
    }
  };
  vp.addEventListener("pointerup", end); vp.addEventListener("pointercancel", end);
  vp.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) zoomAt(view.k * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
    else { view.x -= e.deltaX; view.y -= e.deltaY; applyView(); queueViewSave(); }
  }, { passive: false });
  vp.addEventListener("dblclick", (e) => {
    const n = e.target.closest("[data-id]");
    if (n) { const node = byId(n.dataset.id); if (node.type === "group") { inspectorFocus = true; drawInspector(); return; } editing = node.id; sel = new Set([node.id]); render(); return; }
    if (e.target.closest("[data-edge]")) return;
    addNode("node", toWorld(e.clientX, e.clientY));
  });
  function finishEdit() {
    const el = layerNodes.querySelector(`[data-id="${editing}"] .mm-text`); const n = byId(editing); editing = null;
    if (el && n) { const t = el.innerText.replace(/\n$/, ""); if (t !== n.text) { commit(); n.text = t; queueSave(); } }
    render();
  }
  vp.addEventListener("focusout", (e) => { if (editing && e.target.matches?.(".mm-text")) setTimeout(() => { if (editing && !layerNodes.querySelector(".mm-text:focus")) finishEdit(); }, 0); });
  vp.addEventListener("input", (e) => { if (e.target.matches?.(".mm-text")) { measure(); drawEdges(); } });

  // ───────── teclado ─────────
  vp.addEventListener("keydown", (e) => {
    if (editing) { if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) { e.preventDefault(); finishEdit(); vp.focus(); } return; }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const mod = e.metaKey || e.ctrlKey;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); delSel(); }
    else if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); dupSel(); }
    else if (mod && e.key.toLowerCase() === "a") { e.preventDefault(); sel = new Set(doc.nodes.map((n) => n.id)); render(); }
    else if (e.key === "Tab") { e.preventDefault(); addChild(); }
    else if (e.key === "Enter" && sel.size === 1) { e.preventDefault(); const [id] = sel; if (byId(id).type !== "group") { editing = id; render(); } }
    else if (e.key === "Escape") { sel.clear(); selEdge = null; render(); }
    else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && sel.size) {
      e.preventDefault(); commit(); const d = e.shiftKey ? 40 : 8; for (const id of sel) { const n = byId(id); if (e.key === "ArrowUp") n.y -= d; if (e.key === "ArrowDown") n.y += d; if (e.key === "ArrowLeft") n.x -= d; if (e.key === "ArrowRight") n.x += d; } moveEls(); queueSave();
    } else if (e.key === "+" || e.key === "=") zoomAt(view.k * 1.2); else if (e.key === "-") zoomAt(view.k / 1.2); else if (e.key === "0") fit();
  });

  // ───────── inspetor (nó ou conexão selecionada) ─────────
  let inspectorFocus = false;
  function field(label, el) { return h("label", { class: "field" }, label, el); }
  function drawInspector() {
    const one = sel.size === 1 ? byId([...sel][0]) : null, edge = selEdge && doc.edges.find((e) => e.id === selEdge);
    if (!one && !edge && sel.size < 2) { inspector.hidden = true; return; }
    inspector.hidden = false;
    const swatches = h("div", { class: "mm-sw" }, ...Object.entries(COLORS).map(([k, c]) => h("button", { type: "button", class: `mm-swb${(one?.color || edge?.color) === k ? " on" : ""}`, style: { background: c }, title: k, "aria-label": `Cor ${k}`, onclick: () => setColor(k) })));
    if (edge) {
      const lab = h("input", { class: "input", value: edge.label, placeholder: "ex.: tração, collab, CTA" });
      lab.addEventListener("change", () => { commit(); edge.label = lab.value.trim(); render(); queueSave(); });
      inspector.replaceChildren(h("div", { class: "mono" }, "// conexão"), field("Rótulo", lab), field("Cor", swatches),
        h("div", { class: "flex wrap" }, h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => { commit(); [edge.from, edge.to] = [edge.to, edge.from]; render(); queueSave(); } }, "Inverter"), h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: delSel }, "Apagar")));
      return;
    }
    if (!one) {
      inspector.replaceChildren(h("div", { class: "mono" }, `// ${sel.size} selecionados`), field("Cor", swatches),
        h("div", { class: "flex wrap" }, h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: dupSel }, "Duplicar"), h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => align("x") }, "Alinhar à esquerda"), h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => align("y") }, "Alinhar no topo"), h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: delSel }, "Apagar")));
      return;
    }
    const n = one;
    const text = h("textarea", { class: "textarea", rows: 3 }); text.value = n.text;
    const note = h("textarea", { class: "textarea", rows: 4, placeholder: "Notas, contexto, decisões" }); note.value = n.note;
    const link = h("input", { class: "input", value: n.link, placeholder: "https://… ou #/perfis" });
    const fs = h("input", { class: "input", type: "number", min: 10, max: 96, value: n.fs });
    const type = h("select", { class: "select" }, ...Object.entries(TYPES).map(([k, v]) => h("option", { value: k, selected: k === n.type }, v)));
    const upd = (k, v) => { if (n[k] === v) return; commit(); n[k] = v; if (k === "type" && v === "group") n.h = n.h || 300; render(); queueSave(); };
    text.addEventListener("change", () => upd("text", text.value)); note.addEventListener("change", () => upd("note", note.value));
    link.addEventListener("change", () => { const v = link.value.trim(); if (v && !/^(https?:\/\/|#\/)/.test(v)) { toast("Link precisa começar com https:// ou #/", { kind: "err" }); return; } upd("link", v); });
    fs.addEventListener("change", () => upd("fs", clamp(+fs.value || 15, 10, 96))); type.addEventListener("change", () => upd("type", type.value));
    inspector.replaceChildren(h("div", { class: "mono" }, `// ${TYPES[n.type].toLowerCase()}`), field("Texto", text), field("Notas", note), field("Link", link),
      h("div", { class: "grid2" }, field("Tipo", type), field("Fonte", fs)), field("Cor", swatches),
      h("div", { class: "flex wrap" }, n.type !== "group" && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: addChild }, "+ Filho (Tab)"), h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: dupSel }, "Duplicar"), h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: delSel }, "Apagar")));
    if (inspectorFocus) { inspectorFocus = false; text.focus(); }
  }
  function align(axis) { commit(); const ns = [...sel].map(byId); const v = Math.min(...ns.map((n) => n[axis])); ns.forEach((n) => (n[axis] = v)); render(); queueSave(); }

  // ───────── export / import ─────────
  const download = (blob, name) => { const a = h("a", { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  const exportJSON = () => download(new Blob([JSON.stringify({ app: "anderson_os.map_mentales", v: 1, titulo: row.titulo, data: { nodes: doc.nodes, edges: doc.edges, view } }, null, 2)], { type: "application/json" }), `map-mentales-${row.slug}.json`);
  const fileIn = h("input", { type: "file", accept: "application/json,.json", hidden: true });
  fileIn.addEventListener("change", async () => {
    const f = fileIn.files[0]; fileIn.value = ""; if (!f) return;
    try { const j = JSON.parse(await f.text()); const d = validMap(j.data || j); if (!d) throw new Error(); commit(); doc.nodes = d.nodes; doc.edges = d.edges; sel.clear(); render(); fit(); queueSave(); toast(`Importado: ${d.nodes.length} nós. Ctrl+Z desfaz.`); }
    catch { toast("Arquivo inválido: precisa ser um JSON exportado do Map MentaleS_.", { kind: "err" }); }
  });
  function exportPNG() {
    const b = bounds(), pad = 60, sc = 2, cv = document.createElement("canvas");
    cv.width = Math.min(16000, (b.w + pad * 2) * sc); cv.height = Math.min(16000, (b.h + pad * 2) * sc);
    const g = cv.getContext("2d"); g.scale(sc, sc); g.translate(pad - b.x, pad - b.y);
    g.fillStyle = "#050706"; g.fillRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
    const rr = (x, y, w, hh, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, hh, r) : g.rect(x, y, w, hh); };
    const wrap = (t, x, y, maxW, fsz, bold) => { g.font = `${bold ? 600 : 400} ${fsz}px Geist, system-ui, sans-serif`; let yy = y; for (const para of t.split("\n")) { let line = ""; for (const w of para.split(" ")) { const tst = line ? line + " " + w : w; if (g.measureText(tst).width > maxW && line) { g.fillText(line, x, yy); yy += fsz * 1.35; line = w; } else line = tst; } g.fillText(line, x, yy); yy += fsz * 1.35; } };
    for (const n of doc.nodes.filter((x) => x.type === "group")) { g.fillStyle = COLORS[n.color] + "14"; g.strokeStyle = COLORS[n.color] + "88"; g.setLineDash([6, 5]); rr(n.x, n.y, n.w, n.h, 10); g.fill(); g.stroke(); g.setLineDash([]); g.fillStyle = COLORS[n.color]; g.textBaseline = "top"; wrap(n.text, n.x + 14, n.y + 12, n.w - 28, n.fs, true); }
    for (const e of doc.edges) { const a = byId(e.from), c = byId(e.to); if (!a || !c) continue; const [p, q] = anchor(a, c); g.strokeStyle = COLORS[e.color]; g.lineWidth = 2; g.stroke(new Path2D(curve(p, q))); g.fillStyle = COLORS[e.color]; const ang = Math.atan2(q.dy * -1, q.dx * -1); g.save(); g.translate(q.x, q.y); g.rotate(ang); g.beginPath(); g.moveTo(0, 0); g.lineTo(-10, -5); g.lineTo(-10, 5); g.fill(); g.restore(); if (e.label) { g.font = "500 12px Geist, sans-serif"; const tw = g.measureText(e.label).width; g.fillStyle = "#0b0d0c"; g.fillRect((p.x + q.x) / 2 - tw / 2 - 6, (p.y + q.y) / 2 - 10, tw + 12, 20); g.fillStyle = "#adb1ab"; g.textBaseline = "middle"; g.fillText(e.label, (p.x + q.x) / 2 - tw / 2, (p.y + q.y) / 2); } }
    for (const n of doc.nodes.filter((x) => x.type !== "group")) { const s = size(n); g.textBaseline = "top"; if (n.type === "node") { g.fillStyle = "#0f1210"; rr(n.x, n.y, s.w, s.h, 8); g.fill(); g.strokeStyle = COLORS[n.color]; g.lineWidth = 1.5; g.stroke(); g.fillStyle = COLORS[n.color]; g.fillRect(n.x, n.y + 8, 3, s.h - 16); } g.fillStyle = n.type === "text" ? COLORS[n.color] === COLORS.cinza ? "#f3f2ee" : COLORS[n.color] : "#f3f2ee"; wrap(n.text, n.x + 14, n.y + 12, s.w - 28, n.fs, n.type === "text"); }
    cv.toBlob((bl) => download(bl, `map-mentales-${row.slug}.png`), "image/png");
  }

  // ───────── mapas (trocar, criar, renomear, arquivar) ─────────
  const pick = h("select", { class: "select select-sm", "aria-label": "Escolher mapa" }, ...maps.map((m) => h("option", { value: m.slug, selected: m.id === row.id }, m.titulo)));
  pick.addEventListener("change", async () => { await save(); go("/mapa?m=" + pick.value); });
  const newMap = async () => {
    const t = prompt("Nome do novo mapa:"); if (!t?.trim()) return;
    const slug = t.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "mapa";
    const s = maps.some((m) => m.slug === slug) ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug;
    const { error: e } = await sb.from("mapas").insert({ slug: s, titulo: t.trim().slice(0, 200), data: { nodes: [{ id: uid(), type: "node", x: 0, y: 0, w: 220, text: t.trim(), note: "", link: "", color: "laranja", fs: 18 }], edges: [], view: { x: 300, y: 200, k: 1 } } });
    if (e) return toast("Não foi possível criar o mapa.", { kind: "err" }); go("/mapa?m=" + s);
  };
  const rename = async () => {
    const t = prompt("Novo nome do mapa:", row.titulo); if (!t?.trim() || t.trim() === row.titulo) return;
    await save(); const { data, error: e } = await sb.from("mapas").update({ titulo: t.trim().slice(0, 200) }).eq("id", row.id).eq("version", version).select("version").maybeSingle();
    if (e || !data) return toast("Não foi possível renomear (recarregue a página).", { kind: "err" }); version = data.version; row.titulo = t.trim(); pick.selectedOptions[0].textContent = row.titulo; toast("Mapa renomeado.");
  };
  const archive = async () => {
    if (maps.length < 2) return toast("Este é o único mapa: crie outro antes de arquivar.", { kind: "err" });
    if (!confirm(`Arquivar o mapa "${row.titulo}"? Ele sai da lista, mas continua guardado no banco.`)) return;
    await save(); const { error: e } = await sb.from("mapas").update({ archived_at: new Date().toISOString() }).eq("id", row.id).eq("version", version);
    if (e) return toast("Não foi possível arquivar.", { kind: "err" }); go("/mapa");
  };

  const full = h("button", { class: "btn btn-ghost btn-sm", type: "button", title: "Tela cheia", onclick: () => { root.classList.toggle("mm-full"); setTimeout(() => { applyView(); }, 50); } }, "Tela cheia");
  const tb = (label, fn, title) => h("button", { class: "btn btn-ghost btn-sm", type: "button", title: title || label, onclick: fn }, label);
  const help = h("details", { class: "mm-help" }, h("summary", { class: "mono" }, "atalhos"),
    h("ul", null, ...["Duplo clique no fundo: novo nó", "Duplo clique no nó ou Enter: editar texto (Esc termina)", "Arrastar o fundo: mover · Ctrl/Cmd + rolar ou pinça: zoom · rolar: mover", "Shift + arrastar: selecionar área · Shift + clique: somar à seleção", "Bolinha à direita do nó: arraste até outro nó para conectar (ou solte no vazio para criar um filho)", "Tab: cria filho conectado · Ctrl+D duplica · Delete apaga · Ctrl+Z / Ctrl+Shift+Z", "Setas movem (Shift = mais) · 0 enquadra tudo · + e - zoom", "Grupo arrasta junto tudo que está dentro dele"].map((t) => h("li", null, t))));
  const root = h("div", { class: "page mm-page" },
    h("div", { class: "page-head" }, h("div", null, h("div", { class: "mono eyebrow" }, "// mapa mental editável"), h("h1", null, "Map MentaleS_")),
      h("div", { class: "flex wrap" }, pick, tb("+ Mapa", newMap, "Criar outro mapa"), tb("Renomear", rename), tb("Arquivar", archive))),
    h("div", { class: "mm-bar" },
      h("div", { class: "flex wrap" }, tb("+ Nó", () => addNode("node")), tb("+ Texto", () => addNode("text")), tb("+ Grupo", () => addNode("group")), tb("Desfazer", undo, "Ctrl+Z"), tb("Refazer", redo, "Ctrl+Shift+Z")),
      h("div", { class: "flex wrap" }, tb("−", () => zoomAt(view.k / 1.2), "Diminuir zoom"), zoomTxt, tb("+", () => zoomAt(view.k * 1.2), "Aumentar zoom"), tb("Enquadrar", fit, "Mostrar tudo (0)"), full,
        tb("JSON ↓", exportJSON, "Exportar JSON"), tb("JSON ↑", () => fileIn.click(), "Importar JSON"), tb("PNG ↓", exportPNG, "Exportar imagem"), status, fileIn)),
    h("div", { class: "mm-wrap" }, vp, inspector), help);
  root.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("mm-full") && !editing) root.classList.remove("mm-full"); });

  requestAnimationFrame(() => { applyView(); render(); if (!doc.view || (doc.view.x === 0 && doc.view.y === 0 && doc.view.k === 1)) fit(); });
  return root;
}
