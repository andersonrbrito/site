import { h, todayISO } from "../util.js";
import { TASK_COLS, setTaskStatus } from "../data.js";
import { pageHead, panel, empty, alertBox, list, taskRow, statusSelect } from "../ui.js";

export default async function inbox({ sb, refresh }) {
  const { data, error } = await sb.from("tasks").select(TASK_COLS).eq("status", "inbox").is("archived_at", null).order("created_at", { ascending: false });
  const today = todayISO();
  return h("div", { class: "page" },
    pageHead("Inbox", "captura"),
    h("p", { class: "note" }, "Capture rápido na barra do topo (atalho C). Aqui você organiza: mude o status para tirar do Inbox, ou abra a tarefa para completar os detalhes."),
    error && alertBox("Não foi possível carregar o Inbox."),
    panel("Itens para organizar", { count: (data || []).length, color: "#8888a0" }, (data || []).length ? list(data.map((t) => taskRow(t, today, statusSelect(t, setTaskStatus, refresh)))) : empty("Inbox vazio.")));
}
