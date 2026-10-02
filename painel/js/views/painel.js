import { h, todayISO, addDaysISO, spStartUTC, dayOf, fmtTime, L, STATUSES, TZ } from "../util.js";
import { TASK_COLS, setTaskStatus } from "../data.js";
import { pageHead, panel, empty, alertBox, list, taskRow, completeButton } from "../ui.js";
import { timeline } from "../timeline.js";

const OPEN = ["inbox", "a_fazer", "em_andamento", "aguardando"];

export default async function painel({ sb, refresh }) {
  const today = todayISO(), end = addDaysISO(today, 14);
  const [late, waiting, active, due14, timed, allDay, all] = await Promise.all([
    sb.from("tasks").select(TASK_COLS).is("archived_at", null).in("status", OPEN).lt("due_date", today).order("due_date").limit(20),
    sb.from("tasks").select(TASK_COLS).is("archived_at", null).eq("status", "aguardando").order("due_date", { nullsFirst: false }).limit(20),
    sb.from("tasks").select(TASK_COLS).is("archived_at", null).eq("status", "em_andamento").limit(10),
    sb.from("tasks").select("id, seq, title, due_date, priority, status").is("archived_at", null).in("status", OPEN).lte("due_date", end).order("due_date").limit(80),
    sb.from("events").select("id, title, starts_at").is("archived_at", null).eq("all_day", false).gte("starts_at", spStartUTC(today)).lt("starts_at", spStartUTC(addDaysISO(end, 1))),
    sb.from("events").select("id, title, start_date").is("archived_at", null).eq("all_day", true).gte("start_date", today).lte("start_date", end),
    sb.from("tasks").select("status, due_date").is("archived_at", null),
  ]);
  const failed = [late, waiting, active, due14, timed, allDay, all].some((r) => r.error);
  const counts = {}; let dueToday = 0;
  (all.data || []).forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; if (t.due_date === today && OPEN.includes(t.status)) dueToday++; });
  const max = Math.max(1, ...Object.values(counts));
  const events = [
    ...(timed.data || []).map((e) => ({ id: e.id, title: e.title, day: dayOf(e.starts_at), time: fmtTime(e.starts_at) })),
    ...(allDay.data || []).map((e) => ({ id: e.id, title: e.title, day: e.start_date, time: null })),
  ];
  const row = (t) => taskRow(t, today, completeButton(t, setTaskStatus, refresh));
  const block = (title, rows, color, msg, countOverride) => panel(title, { count: countOverride ?? rows.length, color }, rows.length ? list(rows.map(row)) : empty(msg));
  const kpi = (label, value, href, tone) => h("a", { class: "kpi", href }, h("span", { class: "mono" }, label), h("b", { style: tone ? { color: tone } : null }, value));

  return h("div", { class: "page" },
    pageHead("Painel", "visão geral", h("a", { class: "mono", href: "#/hoje" }, "Ir para hoje →")),
    failed && alertBox("Não foi possível carregar parte dos dados. Atualize a página."),
    h("div", { class: "kpis" },
      kpi("Atrasadas", (late.data || []).length, "#/tarefas", (late.data || []).length ? "var(--danger)" : null),
      kpi("Para hoje", dueToday, "#/hoje"),
      kpi("Em andamento", counts.em_andamento || 0, "#/tarefas?status=em_andamento"),
      kpi("Aguardando", counts.aguardando || 0, "#/tarefas?status=aguardando", "var(--accent)"),
      kpi("No Inbox", counts.inbox || 0, "#/inbox")),
    timeline({ today, tasks: (due14.data || []).filter((t) => t.due_date), events }),
    h("div", { class: "cols2" },
      h("div", null, block("Atrasado", late.data || [], "#ff6b6b", "Nada atrasado."), block("Aguardando alguém", waiting.data || [], "#f5a524", "Nada aguardando.")),
      h("div", null, block("Em andamento", active.data || [], "#22c55e", "Nada em andamento."),
        panel("Tarefas por status", { color: "#7b61ff" },
          h("ul", { class: "stack", style: { listStyle: "none" } }, ...STATUSES.map((s) =>
            h("li", { style: { display: "grid", gridTemplateColumns: "7.5rem 1fr 2rem", alignItems: "center", gap: "8px" } },
              h("a", { href: `#/tarefas?status=${s}`, class: "small" }, L.status[s]),
              h("div", { class: "bar" }, h("i", { style: { width: `${((counts[s] || 0) / max) * 100}%` } })),
              h("span", { class: "mono", style: { textAlign: "right" } }, counts[s] || 0)))),
          h("p", { class: "mono", style: { marginTop: "12px" } }, `Datas no fuso ${TZ}`)))));
}
