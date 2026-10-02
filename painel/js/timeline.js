import { h, addDaysISO, fmtDate } from "./util.js";
import { PRIO_COLOR } from "./util.js";

/** Linha do tempo funcional: prazos (V1) e compromissos (V2) dos próximos dias. */
export function timeline({ today, tasks, events, days = 14 }) {
  const cols = Array.from({ length: days }, (_, i) => addDaysISO(today, i));
  const tpl = { style: { gridTemplateColumns: `7rem repeat(${days}, minmax(0,1fr))` } };
  const pill = (t, color) => h("a", { class: "pill", href: `#/tarefas/${t.id}`, title: t.title, style: { "--c": color } }, t.title);
  const late = tasks.filter((t) => t.due_date < today);
  return h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "#3da7ff" } }), h("h2", { class: "mono grow" }, `Linha do tempo · próximos ${days} dias`), h("span", { class: "mono" }, "V1 prazos · V2 agenda")),
    h("div", { class: "tl" },
      h("div", { class: "tl-grid tl-h", ...tpl }, h("div", null, "Atrasado"), ...cols.map((d, i) => h("div", { class: i === 0 ? "today" : "" }, i === 0 ? "Hoje" : fmtDate(d)))),
      h("div", { class: "tl-grid tl-c", ...tpl },
        h("div", null, ...late.map((t) => pill(t, "#ff6b6b"))),
        ...cols.map((d, i) => h("div", { class: i === 0 ? "today" : "" },
          ...tasks.filter((t) => t.due_date === d).map((t) => pill(t, PRIO_COLOR[t.priority])),
          ...events.filter((e) => e.day === d).map((e) => h("div", { class: "pill ev", title: e.title }, e.time && h("span", { class: "mono", style: { marginRight: "4px" } }, e.time), e.title)))))));
}
