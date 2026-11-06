import { h, fmtDateTime } from "./util.js";
import { icon, toast } from "./ui.js";
import { visibleModules } from "./modules.js?v=20261106e";
import { SOCIALS, AIS, iconLink } from "./links.js";
import { HREF } from "./views/busca.js";

const NAMES = { task: "Tarefa", project: "Projeto", note: "Nota", event: "Compromisso" };
// Versão do painel mostrada ao lado do logo (suba a cada entrega relevante).
export const VERSAO = "v2.1";
const href = (m) => "#/" + m.route;

export function buildShell({ sb, member, go, signOut }) {
  const mods = visibleModules(member), primary = mods.filter((m) => m.primary);
  const section = h("span", null, "PAINEL"), clock = h("span", null, "");
  const tick = () => { clock.textContent = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date()).replace(".", ""); };
  tick(); setInterval(tick, 30000);

  // Ações rápidas no topo: o que mais se usa, a um clique.
  // Busca ao vivo: módulos do painel + perfis, notas, produtos, carrosséis, posts, garimpo e tarefas, conforme digita.
  const search = buildSearch(sb, mods, go);
  const quick = h("div", { class: "grow flex quick" },
    h("a", { class: "btn btn-sm", href: "#/postador?novo=x", dataset: { only: "postador" } }, "+ Post no X"),
    h("a", { class: "btn btn-ghost btn-sm", href: "#/postador?novo=linkedin", dataset: { only: "postador" } }, "+ LinkedIn"),
    h("a", { class: "btn btn-ghost btn-sm", href: "#/miner?novo=1", dataset: { only: "miner" } }, "+ Garimpar link"),
    h("div", { class: "ais hide-sm" }, ...AIS.map((x) => iconLink(x))));

  const navLinks = mods.map((m) => h("a", { class: "navlink", href: href(m), dataset: { route: m.route } }, icon(m.id, 18), h("span", null, m.label)));
  const tabs = [...primary.map((m) => h("a", { href: href(m), dataset: { route: m.route } }, icon(m.id, 18), m.label)), h("a", { href: "#/menu", dataset: { route: "menu" } }, icon("config", 18), "Mais")];
  tabs.forEach((t) => void t);
  document.querySelector(".tabbar")?.remove();

  const main = h("main", { id: "main" });
  const root = h("div", null,
    h("div", { class: "menubar" },
      h("div", { class: "brand" }, h("span", { class: "logo" }, "ANDERSON", h("b", null, "_OS")), h("span", { class: "ver", title: "Versão do painel" }, VERSAO), h("span", { class: "socials hide-sm" }, ...SOCIALS.map((x) => iconLink(x, "ilink sm"))), h("a", { class: "sitebtn", href: "https://andersonbrito.com/", target: "_blank", rel: "noopener" }, "Meu site ↗")),
      h("div", { class: "mid" }, h("span", null, "SEQ "), "ANDERSON_OS · ", section),
      h("div", { class: "right" }, h("a", { class: "wa-btn", href: "https://web.whatsapp.com/", target: "_blank", rel: "noopener", title: "WhatsApp Business (web)" }, waIcon(), h("span", { class: "hide-sm" }, "WhatsApp")), clock, h("span", { class: "hide-sm flex who" }, h("span", { class: "dot-live" }), member.email))),
    h("div", { class: "toolbar" },
      search.root, quick),
    h("aside", { class: "side" }, h("nav", null, ...navLinks), h("button", { class: "navlink", type: "button", style: { border: 0, background: "none", cursor: "pointer", font: "inherit" }, onclick: signOut }, "Sair")),
    main,
    h("nav", { class: "tabbar", style: { gridTemplateColumns: `repeat(${tabs.length}, 1fr)` } }, ...tabs),
    h("div", { class: "toasts", id: "toasts" }));

  // Notificações: ponto aceso no menu quando um módulo tem novidade (job pronto, pedido feito, rascunho novo...).
  // Regra geral: qualquer módulo novo ganha o ponto sozinho, basta a tabela dele ter o trigger app_private.emit_event('<id>').
  const routeOf = Object.fromEntries(mods.map((m) => [m.id, m.route]));
  const idOf = Object.fromEntries(mods.map((m) => [m.route, m.id]));
  let current = null;
  const paintDots = (news) => {
    root.querySelectorAll(".navdot").forEach((d) => d.remove());
    for (const r of news) {
      if (!(r.module in routeOf) || r.module === current) continue;
      root.querySelectorAll(`[data-route="${CSS.escape(routeOf[r.module])}"]`).forEach((a) => {
        a.append(h("span", { class: "navdot", title: `${r.n} novidade${r.n > 1 ? "s" : ""}`, "aria-label": `${r.n} novidade${r.n > 1 ? "s" : ""}` }));
      });
    }
  };
  let lastNews = [];
  const seen = async (id) => { if (!id) return; lastNews = lastNews.filter((r) => r.module !== id); paintDots(lastNews); await sb.rpc("mark_module_seen", { p_module: id }); };
  const pollNews = async () => {
    const { data, error } = await sb.rpc("module_news");
    if (error || !Array.isArray(data)) return; // migration 0030 ainda não aplicada: sem pontos
    lastNews = data;
    if (current && data.some((r) => r.module === current)) seen(current); else paintDots(data);
  };
  pollNews(); setInterval(() => { if (document.visibilityState === "visible") pollNews(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pollNews(); });

  const setActive = (route, title) => {
    const top = route.split("/")[0];
    current = idOf[top] ?? null; if (current && lastNews.some((r) => r.module === current)) seen(current);
    root.querySelectorAll("[data-route]").forEach((a) => (a.dataset.route === top ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    section.textContent = (title || "").toUpperCase();
    // Ações rápidas só aparecem fora do módulo "dono" da outra ação (ex.: nada de Garimpar dentro do Postador).
    quick.querySelectorAll("[data-only]").forEach((a) => { a.hidden = (top === "postador" && a.dataset.only === "miner") || (top === "miner" && a.dataset.only === "postador"); });
  };

  // Toasts
  const toasts = root.querySelector("#toasts");
  window.addEventListener("aos:toast", (e) => {
    const d = e.detail, el = h("div", { class: `toast${d.kind === "err" ? " err" : ""}`, role: d.kind === "err" ? "alert" : "status" }, h("span", null, d.text),
      d.onAction && h("button", { type: "button", onclick: () => { d.onAction(); el.remove(); } }, d.actionLabel || "Desfazer"));
    toasts.append(el); while (toasts.children.length > 3) toasts.firstChild.remove(); setTimeout(() => el.remove(), 6000);
  });

  // Paleta de comandos
  let pal = null;
  const closePalette = () => { pal?.remove(); pal = null; };
  const openPalette = () => {
    if (pal) return closePalette();
    let idx = 0, results = [], timer;
    const cmds = [{ label: "Novo post no X", icon: "postador", run: () => go("/postador?novo=x") }, { label: "Novo post no LinkedIn", icon: "postador", run: () => go("/postador?novo=linkedin") }, { label: "Garimpar link", icon: "miner", run: () => go("/miner?novo=1") }, ...mods.map((m) => ({ label: `Ir para ${m.label}`, icon: m.id, run: () => go("/" + m.route) }))];
    const input = h("input", { placeholder: "Buscar ou ir para…", "aria-label": "Buscar" }), ul = h("ul", { role: "listbox" });
    const items = () => { const q = input.value.trim().toLowerCase(); return [...(q ? cmds.filter((c) => c.label.toLowerCase().includes(q)) : cmds), ...results.map((r) => ({ label: r.title || "(sem título)", hint: NAMES[r.entity], icon: "busca", run: () => { location.hash = HREF[r.entity](r.id); } }))]; };
    const draw = () => { const list = items(); idx = Math.min(idx, Math.max(0, list.length - 1)); ul.replaceChildren(...list.map((c, i) => h("li", null, h("button", { type: "button", "aria-selected": String(i === idx), onmouseenter: () => { idx = i; draw(); }, onclick: () => { closePalette(); c.run(); } }, icon(c.icon), h("span", { class: "grow truncate" }, c.label), c.hint && h("span", { class: "mono" }, c.hint))))); };
    input.addEventListener("input", () => { idx = 0; draw(); void timer; });
    input.addEventListener("keydown", (e) => { const list = items(); if (e.key === "ArrowDown") { e.preventDefault(); idx = Math.min(idx + 1, list.length - 1); draw(); } if (e.key === "ArrowUp") { e.preventDefault(); idx = Math.max(idx - 1, 0); draw(); } if (e.key === "Enter") { const c = list[idx]; if (c) { closePalette(); c.run(); } } });
    pal = h("div", { class: "overlay", onmousedown: (e) => e.target === pal && closePalette() }, h("div", { class: "dialog", role: "dialog", "aria-modal": "true", "aria-label": "Paleta de comandos" }, input, ul, h("footer", null, h("span", null, h("span", { class: "kbd" }, "↑↓"), " navegar"), h("span", null, h("span", { class: "kbd" }, "↵"), " abrir"), h("span", { class: "hide-sm", style: { marginLeft: "auto" } }, "Atalhos: G depois I/P/M/A"))));
    document.body.append(pal); draw(); input.focus();
  };
  let g = false, gt;
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); search.focus(); return; }
    if (e.key === "Escape") return closePalette();
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "/") { e.preventDefault(); return search.focus(); }
    if (g) { const map = { i: "", p: "postador", m: "miner", a: "agenda" }; if (e.key in map) go("/" + map[e.key]); g = false; return; }
    if (e.key === "g") { g = true; clearTimeout(gt); gt = setTimeout(() => (g = false), 900); }
  });
  root.addEventListener("click", (e) => { if (e.target.closest("[data-palette]")) openPalette(); });
  void fmtDateTime;
  return { root, main, setActive, mods };
}


function waIcon() {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries({ width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.9", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) s.setAttribute(k, v);
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", "M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3zM9 8.5c.3 2.7 3.2 5.9 6.5 6.5l1-1.6-2-1-1 1c-1.2-.5-2.4-1.7-2.9-2.9l1-1-1-2z");
  s.append(p); return s;
}

function buildSearch(sb, mods, go) {
  const input = h("input", { class: "gsearch-in", type: "search", placeholder: "Buscar no painel…  (Ctrl K)", "aria-label": "Buscar no painel", autocomplete: "off", role: "combobox", "aria-expanded": "false" });
  const ul = h("ul", { class: "gsearch-res", role: "listbox", hidden: true });
  const root = h("div", { class: "gsearch" }, icon("busca", 16), input, ul);
  let results = [], idx = 0, seq = 0, t;
  const esc = (q) => q.replace(/[%_,()]/g, " ");
  const SRC = [
    ["perfis", "Perfil", "handle", (r) => "#/perfis", "handle, papel", (q) => `handle.ilike.%${q}%,papel.ilike.%${q}%`, "id, handle"],
    ["sticky_notes", "Nota", "titulo", () => "#/notas", "", (q) => `titulo.ilike.%${q}%,texto.ilike.%${q}%`, "id, titulo, texto"],
    ["produtos", "Produto", "nome", () => "#/produtos", "", (q) => `nome.ilike.%${q}%`, "id, nome"],
    ["carrosseis", "Carrossel", "titulo", (r) => `#/carrosseis?c=${encodeURIComponent(r.slug)}`, "", (q) => `titulo.ilike.%${q}%,legenda.ilike.%${q}%`, "id, slug, titulo"],
    ["posts", "Post", "title", (r) => `#/postador?id=${r.id}`, "", (q) => `title.ilike.%${q}%,body.ilike.%${q}%`, "id, title, body"],
    ["miner_links", "Garimpo", "note", () => "#/miner", "", (q) => `note.ilike.%${q}%,author.ilike.%${q}%`, "id, note, author"],
    ["pautas", "Pauta", "titulo", () => "#/perfis", "", (q) => `titulo.ilike.%${q}%`, "id, titulo"],
  ];
  const close = () => { ul.hidden = true; input.setAttribute("aria-expanded", "false"); };
  const draw = () => {
    idx = Math.min(idx, Math.max(0, results.length - 1));
    ul.replaceChildren(...(results.length ? results.map((r, i) => h("li", null, h("button", { type: "button", "aria-selected": String(i === idx), onmousedown: (e) => { e.preventDefault(); pick(r); } }, h("span", { class: "mono" }, r.kind), h("span", { class: "grow truncate" }, r.label)))) : [h("li", { class: "muted small", style: { padding: "10px 12px" } }, "Nada encontrado.")]));
    ul.hidden = !input.value.trim(); input.setAttribute("aria-expanded", String(!ul.hidden));
  };
  const pick = (r) => { close(); input.value = ""; input.blur(); location.hash = r.href; };
  const run = async () => {
    const q = input.value.trim(), my = ++seq;
    if (!q) { results = []; close(); return; }
    const ql = q.toLowerCase();
    results = mods.filter((m) => m.label.toLowerCase().includes(ql)).map((m) => ({ kind: "Página", label: m.label, href: "#/" + m.route }));
    draw();
    if (q.length < 2) return;
    const qq = esc(q);
    const found = await Promise.all(SRC.map(([table, kind, col, href, , or, cols]) => sb.from(table).select(cols).is("archived_at", null).or(or(qq)).limit(5)
      .then(({ data }) => (data || []).map((r) => ({ kind, label: (r[col] || r.texto || r.body || r.author || "(sem título)").toString().split("\n")[0].slice(0, 90), href: href(r) }))).catch(() => [])));
    if (my !== seq) return;
    results = [...results, ...found.flat()].slice(0, 30); draw();
  };
  input.addEventListener("input", () => { idx = 0; clearTimeout(t); t = setTimeout(run, 200); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); idx = Math.min(idx + 1, results.length - 1); draw(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); idx = Math.max(idx - 1, 0); draw(); }
    else if (e.key === "Enter") { const r = results[idx]; if (r) pick(r); }
    else if (e.key === "Escape") { input.value = ""; close(); input.blur(); }
  });
  input.addEventListener("blur", () => setTimeout(close, 150));
  window.addEventListener("hashchange", () => { input.value = ""; results = []; close(); });
  input.addEventListener("focus", () => { if (input.value.trim()) draw(); });
  return { root, focus: () => input.focus() };
}
