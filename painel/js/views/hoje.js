import { h, todayISO, addDaysISO, spStartUTC, fmtDateTime } from "../util.js";
import { TASK_COLS, setTaskStatus } from "../data.js";
import { pageHead, panel, empty, alertBox, list, taskRow, completeButton } from "../ui.js";

export default async function hoje({ sb, refresh }) {
  const today = todayISO(), open = ["a_fazer", "em_andamento", "aguardando", "inbox"];
  const [due, doing, evs, evAll] = await Promise.all([
    sb.from("tasks").select(TASK_COLS).is("archived_at", null).in("status", open).lte("due_date", today).order("due_date"),
    sb.from("tasks").select(TASK_COLS).is("archived_at", null).eq("status", "em_andamento").or(`due_date.is.null,due_date.gt.${today}`),
    sb.from("events").select("id, title, starts_at").is("archived_at", null).eq("all_day", false).gte("starts_at", spStartUTC(today)).lt("starts_at", spStartUTC(addDaysISO(today, 1))).order("starts_at"),
    sb.from("events").select("id, title").is("archived_at", null).eq("all_day", true).lte("start_date", today).gte("end_date", today),
  ]);
  const row = (t) => taskRow(t, today, completeButton(t, setTaskStatus, refresh));
  const eventItems = [...(evAll.data || []).map((e) => h("li", { class: "row" }, h("span", null, e.title), h("span", { class: "chip" }, "dia inteiro"))), ...(evs.data || []).map((e) => h("li", { class: "row" }, h("span", null, e.title), h("span", { class: "chip accent" }, fmtDateTime(e.starts_at))))];
  return h("div", { class: "page" },
    pageHead("Hoje", "foco do dia"),
    (due.error || doing.error || evs.error) && alertBox("Não foi possível carregar tudo. Atualize."),
    panel("Compromissos", { color: "#7b61ff" }, eventItems.length ? list(eventItems) : empty("Sem compromissos hoje.")),
    panel("Para hoje e atrasadas", { count: (due.data || []).length, color: "#ff6b6b" }, (due.data || []).length ? list(due.data.map(row)) : empty("Nada com prazo hoje.")),
    panel("Em andamento", { count: (doing.data || []).length, color: "#22c55e" }, (doing.data || []).length ? list(doing.data.map(row)) : empty("Nada em andamento.")));
}
