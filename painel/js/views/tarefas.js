import { h, todayISO, STATUSES, AREAS, L } from "../util.js";
import { TASK_COLS, setTaskStatus } from "../data.js";
import { pageHead, empty, alertBox, list, taskRow, completeButton, select } from "../ui.js";
import { kanban } from "../kanban.js";
import { taskForm } from "../taskform.js";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function tarefas({ sb, query, refresh, go }) {
  const today = todayISO(), isK = query.view === "kanban";
  let q = sb.from("tasks").select(TASK_COLS).is("archived_at", null).order("due_date", { nullsFirst: false }).limit(300);
  if (STATUSES.includes(query.status)) q = q.eq("status", query.status); else if (!query.concluidas) q = q.not("status", "in", "(concluido,cancelado)");
  if (AREAS.includes(query.area)) q = q.eq("area", query.area);
  if (query.projeto && UUID.test(query.projeto)) q = q.eq("project_id", query.projeto);
  if (query.q) q = q.ilike("title", `%${query.q.replace(/[%_\\]/g, "\\$&")}%`);
  const [{ data, error }, { data: projects }] = await Promise.all([q, sb.from("projects").select("id, name").is("archived_at", null).order("name")]);
  const tasks = data || [];

  const keep = (extra) => "#/tarefas?" + new URLSearchParams({ ...query, ...extra }).toString();
  const filters = h("form", { class: "filters" },
    h("input", { class: "input", name: "q", placeholder: "Buscar no título", value: query.q || "" }),
    select("status", [["", "Abertas"], ...STATUSES.map((s) => [s, L.status[s]])], query.status || ""),
    select("area", [["", "Todas as áreas"], ...AREAS.map((a) => [a, L.area[a]])], query.area || ""),
    select("projeto", [["", "Todos os projetos"], ...(projects || []).map((p) => [p.id, p.name])], query.projeto || ""),
    h("button", { class: "btn btn-ghost", type: "submit" }, "Filtrar"));
  filters.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(filters), p = new URLSearchParams();
    for (const [k, v] of fd) if (v) p.set(k, v);
    if (isK) p.set("view", "kanban");
    go("/tarefas?" + p.toString());
  });

  const body = !tasks.length ? empty("Nenhuma tarefa com esses filtros.")
    : isK ? kanban({ tasks, today, refresh, columns: STATUSES.filter((s) => !["cancelado", "concluido"].includes(s) || query.concluidas || query.status === s) })
    : list(tasks.map((t) => taskRow(t, today, completeButton(t, setTaskStatus, refresh))));

  return h("div", { class: "page" },
    pageHead("Tarefas", isK ? "kanban" : "lista", h("a", { class: "btn btn-ghost", href: keep({ view: isK ? "lista" : "kanban" }) }, isK ? "Ver lista" : "Ver Kanban")),
    filters, error && alertBox("Não foi possível carregar as tarefas."), body,
    h("details", { class: "panel", style: { marginTop: "32px" } }, h("summary", null, "Nova tarefa com detalhes"),
      h("div", { class: "panel-body" }, taskForm({ sb, projects: projects || [], submitLabel: "Criar tarefa", onDone: refresh }))));
}
