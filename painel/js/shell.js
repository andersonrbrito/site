import { h, fmtDateTime } from "./util.js";
import { icon, toast } from "./ui.js";
import { visibleModules } from "./modules.js";
import { HREF } from "./views/busca.js";

const NAMES = { task: "Tarefa", project: "Projeto", note: "Nota", event: "Compromisso" };
const href = (m) => "#/" + m.route;

export function buildShell({ sb, member, go, signOut }) {
  const mods = visibleModules(member), primary = mods.filter((m) => m.primary);
  const section = h("span", null, "PAINEL"), clock = h("span", null, "");
  const tick = () => { clock.textContent = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date()).replace(".", ""); };
  tick(); setInterval(tick, 30000);

  const capture = h("input", { class: "input", id: "capture", autocomplete: "off", placeholder: "Capturar rápido: escreva e Enter (vai para o Inbox)", "aria-label": "Captura rápida", style: { height: "36px" } });
  const captureForm = h("form", { class: "grow", onsubmit: async (e) => {
    e.preventDefault(); const title = capture.value.trim(); if (!title) return;
    capture.disabled = true;
    const { error } = await sb.from("tasks").insert({ title: title.slice(0, 300), status: "inbox" });
    capture.disabled = false;
    if (error) return toast("Não foi possível salvar. O texto foi mantido.", { kind: "err" });
    capture.value = ""; toast("Capturado no Inbox."); window.dispatchEvent(new Event("aos:refresh"));
  } }, capture);

  const navLinks = mods.map((m) => h("a", { class: "navlink", href: href(m), dataset: { route: m.route } }, icon(m.id), m.label));
  const tabs = [...primary.map((m) => h("a", { href: href(m), dataset: { route: m.route } }, icon(m.id, 18), m.label)), h("a", { href: "#/menu", dataset: { route: "menu" } }, icon("config", 18), "Mais")];
  tabs.forEach((t) => void t);
  document.querySelector(".tabbar")?.remove();

  const main = h("main", { id: "main" });
  const root = h("div", null,
    h("div", { class: "menubar" },
      h("div", { class: "brand" }, h("span", { class: "logo" }, "OS"), h("span", { class: "hide-sm" }, "andersonbrito.com / painel")),
      h("div", { class: "mid" }, h("span", null, "SEQ "), "ANDERSON_OS · ", section),
      h("div", { class: "right" }, clock, h("span", { class: "hide-sm flex" }, h("span", { class: "dot-live" }), member.email))),
    h("div", { class: "toolbar" },
      h("button", { class: "btn btn-ghost btn-sm hide-sm", type: "button", "data-palette": "", "aria-label": "Abrir busca e comandos" }, icon("busca", 14), " Buscar ", h("span", { class: "kbd" }, "Ctrl K")), captureForm),
    h("aside", { class: "side" }, h("nav", null, ...navLinks), h("button", { class: "navlink", type: "button", style: { border: 0, background: "none", cursor: "pointer", font: "inherit" }, onclick: signOut }, "Sair")),
    main,
    h("nav", { class: "tabbar", style: { gridTemplateColumns: `repeat(${tabs.length}, 1fr)` } }, ...tabs),
    h("div", { class: "toasts", id: "toasts" }));

  const setActive = (route, title) => {
    const top = route.split("/")[0];
    root.querySelectorAll("[data-route]").forEach((a) => (a.dataset.route === top ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    section.textContent = (title || "").toUpperCase();
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
    const cmds = [{ label: "Capturar no Inbox", hint: "C", icon: "inbox", run: () => capture.focus() }, ...mods.map((m) => ({ label: `Ir para ${m.label}`, icon: m.id, run: () => go("/" + m.route) }))];
    const input = h("input", { placeholder: "Buscar ou ir para…", "aria-label": "Buscar" }), ul = h("ul", { role: "listbox" });
    const items = () => { const q = input.value.trim().toLowerCase(); return [...(q ? cmds.filter((c) => c.label.toLowerCase().includes(q)) : cmds), ...results.map((r) => ({ label: r.title || "(sem título)", hint: NAMES[r.entity], icon: "busca", run: () => { location.hash = HREF[r.entity](r.id); } }))]; };
    const draw = () => { const list = items(); idx = Math.min(idx, Math.max(0, list.length - 1)); ul.replaceChildren(...list.map((c, i) => h("li", null, h("button", { type: "button", "aria-selected": String(i === idx), onmouseenter: () => { idx = i; draw(); }, onclick: () => { closePalette(); c.run(); } }, icon(c.icon), h("span", { class: "grow truncate" }, c.label), c.hint && h("span", { class: "mono" }, c.hint))))); };
    input.addEventListener("input", () => { idx = 0; draw(); clearTimeout(timer); const q = input.value.trim(); if (q.length < 2) { results = []; draw(); return; } timer = setTimeout(async () => { const { data } = await sb.rpc("search_all", { q, max_rows: 8 }); results = data || []; draw(); }, 200); });
    input.addEventListener("keydown", (e) => { const list = items(); if (e.key === "ArrowDown") { e.preventDefault(); idx = Math.min(idx + 1, list.length - 1); draw(); } if (e.key === "ArrowUp") { e.preventDefault(); idx = Math.max(idx - 1, 0); draw(); } if (e.key === "Enter") { const c = list[idx]; if (c) { closePalette(); c.run(); } } });
    pal = h("div", { class: "overlay", onmousedown: (e) => e.target === pal && closePalette() }, h("div", { class: "dialog", role: "dialog", "aria-modal": "true", "aria-label": "Paleta de comandos" }, input, ul, h("footer", null, h("span", null, h("span", { class: "kbd" }, "↑↓"), " navegar"), h("span", null, h("span", { class: "kbd" }, "↵"), " abrir"), h("span", { class: "hide-sm", style: { marginLeft: "auto" } }, "Atalhos: C capturar · G depois H/T/I/A"))));
    document.body.append(pal); draw(); input.focus();
  };
  let g = false, gt;
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); return; }
    if (e.key === "Escape") return closePalette();
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "/") { e.preventDefault(); return openPalette(); }
    if (e.key === "c") { e.preventDefault(); return capture.focus(); }
    if (g) { const map = { h: "hoje", p: "", t: "tarefas", j: "projetos", i: "inbox", a: "agenda" }; if (e.key in map) go("/" + map[e.key]); g = false; return; }
    if (e.key === "g") { g = true; clearTimeout(gt); gt = setTimeout(() => (g = false), 900); }
  });
  root.addEventListener("click", (e) => { if (e.target.closest("[data-palette]")) openPalette(); });
  void fmtDateTime;
  return { root, main, setActive, mods };
}
