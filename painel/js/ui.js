import { h, L, PRIO_COLOR, fmtDate, isOverdue, STATUSES } from "./util.js";

const P = {
  dashboard: "M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z",
  hoje: "M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 7.8 7.8M16.2 16.2l1.5 1.5M6.3 17.7l1.5-1.5M16.2 7.8l1.5-1.5M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  tarefas: "M9 6h12M9 12h12M9 18h12M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17",
  projetos: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  inbox: "M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5",
  agenda: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  historico: "M12 7v5l3 2M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4",
  config: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4",
  busca: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.5-4.5",
};
export function icon(name, size = 16) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("width", size); s.setAttribute("height", size); s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.7");
  s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", P[name] || P.dashboard); s.append(p);
  return s;
}

export const toast = (text, opts = {}) => window.dispatchEvent(new CustomEvent("aos:toast", { detail: { text, ...opts } }));

export const pageHead = (title, eyebrow, ...actions) =>
  h("div", { class: "page-head" },
    h("div", null, h("div", { class: "mono eyebrow" }, "// ", eyebrow || title), h("h1", null, title)),
    h("div", { class: "flex" }, ...actions));

export const panel = (title, { count, color = "#3da7ff" } = {}, ...body) =>
  h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: color } }), h("h2", { class: "mono grow" }, title), count !== undefined && h("span", { class: "mono" }, count)),
    h("div", { class: "panel-body" }, ...body));

export const empty = (t) => h("p", { class: "empty" }, t);
export const alertBox = (t) => h("p", { class: "alert", role: "alert" }, t);
export const list = (items) => h("ul", { class: "stack", style: { listStyle: "none" } }, ...items);

export function taskRow(t, today, lead) {
  const late = isOverdue(t.due_date, t.status, today);
  return h("li", { class: `row${t.status === "concluido" ? " done" : ""}`, style: { "--bar-c": PRIO_COLOR[t.priority] } },
    lead,
    h("a", { href: `#/tarefas/${t.id}`, class: "grow" },
      h("div", { class: "title truncate" }, t.title),
      h("div", { class: "meta" },
        h("span", { class: "mono" }, `T-${t.seq}`),
        t.projects?.name && h("span", { class: "chip" }, t.projects.name),
        (t.priority === "urgente" || t.priority === "alta") && h("span", { class: `chip ${t.priority === "urgente" ? "danger" : "warn"}` }, L.priority[t.priority]),
        t.due_date && h("span", { class: `chip${late ? " danger" : ""}` }, (late ? "atrasada · " : "") + fmtDate(t.due_date)),
        t.status === "aguardando" && h("span", { class: "chip accent" }, "aguardando" + (t.waiting_for ? `: ${t.waiting_for}` : "")))));
}

/** Botão de concluir com atualização otimista e "Desfazer". */
export function completeButton(t, setStatus, onChange) {
  let done = t.status === "concluido", ver = t.version, busy = false;
  const btn = h("button", { class: "check", type: "button", "aria-pressed": String(done), "aria-label": done ? "Reabrir tarefa" : "Concluir tarefa" });
  const paint = () => { btn.setAttribute("aria-pressed", String(done)); btn.textContent = done ? "✓" : ""; btn.setAttribute("aria-label", done ? "Reabrir tarefa" : "Concluir tarefa"); };
  const change = async (to, v) => {
    if (busy) return; busy = true; done = to; paint();
    const r = await setStatus(t.id, v, to ? "concluido" : "a_fazer");
    busy = false;
    if (!r.ok) { done = !to; paint(); toast(r.error, { kind: "err" }); return; }
    ver = r.version; onChange?.();
    if (to) toast("Tarefa concluída.", { actionLabel: "Desfazer", onAction: () => change(false, ver) });
  };
  btn.addEventListener("click", () => change(!done, ver)); paint();
  return btn;
}

export function statusSelect(t, setStatus, onChange) {
  let ver = t.version, cur = t.status;
  const sel = h("select", { class: "select select-sm", "aria-label": "Mudar status" }, ...STATUSES.map((s) => h("option", { value: s, selected: s === cur }, L.status[s])));
  sel.addEventListener("change", async () => {
    const to = sel.value, prev = cur; cur = to; sel.disabled = true;
    const r = await setStatus(t.id, ver, to); sel.disabled = false;
    if (!r.ok) { cur = prev; sel.value = prev; toast(r.error, { kind: "err" }); return; }
    ver = r.version; onChange?.();
  });
  return sel;
}

/** Formulário que NÃO limpa os campos quando o salvamento falha. */
export function form(onSubmit, { reset = true, okText = "Salvo." } = {}, ...kids) {
  const msg = h("div", { class: "small", "aria-live": "polite", style: { minHeight: "20px" } });
  const f = h("form", { class: "grid-form", novalidate: true }, ...kids, msg);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(f); // ler ANTES de desabilitar (campos desabilitados não entram no FormData)
    const btns = f.querySelectorAll("button, input, select, textarea");
    btns.forEach((b) => (b.disabled = true)); msg.textContent = "Salvando…"; msg.style.color = "var(--tx-3)";
    let r;
    try { r = await onSubmit(data); } catch { r = { ok: false, error: "Falha de conexão. Seus dados foram mantidos; tente de novo." }; }
    btns.forEach((b) => (b.disabled = false));
    if (r.ok) { msg.textContent = r.message || okText; msg.style.color = "var(--ok)"; if (reset) f.reset(); } else { msg.textContent = r.error; msg.style.color = "var(--danger)"; }
  });
  return f;
}

export const field = (label, control) => h("label", { class: "field" }, label, control);
export const input = (name, o = {}) => h("input", { class: "input", name, ...o });
export const select = (name, opts, cur, o = {}) => h("select", { class: "select", name, ...o }, ...opts.map(([v, t]) => h("option", { value: v, selected: v === cur }, t)));
export const textarea = (name, v, rows = 3) => { const t = h("textarea", { class: "textarea", name, rows }); t.value = v || ""; return t; };
