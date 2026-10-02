import { h, STATUSES, PRIORITIES, AREAS, L, taskFromForm } from "./util.js";
import { form, field, input, select, textarea } from "./ui.js";

/** Formulário de tarefa (criar ou editar com controle de versão). */
export function taskForm({ sb, task, projects, submitLabel, onDone }) {
  const t = task || {};
  const opt = (obj, keys) => keys.map((k) => [k, obj[k]]);
  const f = form(async (fd) => {
    const r = taskFromForm(fd);
    if (r.error) return { ok: false, error: r.error };
    if (t.id) {
      const { data, error } = await sb.from("tasks").update(r.value).eq("id", t.id).eq("version", t.version).select("id").maybeSingle();
      if (error) return { ok: false, error: "Não foi possível salvar. Seus dados foram mantidos na tela." };
      if (!data) return { ok: false, error: "Esta tarefa foi alterada por outra pessoa/IA enquanto você editava. Recarregue para ver a versão atual (copie o que digitou antes)." };
    } else {
      const { error } = await sb.from("tasks").insert(r.value);
      if (error) return { ok: false, error: "Não foi possível salvar a tarefa." };
    }
    onDone?.();
    return { ok: true, message: t.id ? "Tarefa atualizada." : "Tarefa criada." };
  }, { reset: !t.id },
    field("Título", input("title", { required: true, value: t.title || "", maxlength: 300 })),
    h("div", { class: "grid2" },
      field("Status", select("status", opt(L.status, STATUSES), t.status || "a_fazer")),
      field("Prioridade", select("priority", opt(L.priority, PRIORITIES), t.priority || "normal")),
      field("Área", select("area", opt(L.area, AREAS), t.area || "trabalho")),
      field("Prazo de entrega", input("due_date", { type: "date", value: t.due_date || "" })),
      field("Projeto", select("project_id", [["", "Sem projeto"], ...projects.map((p) => [p.id, p.name])], t.project_id || "")),
      field("Responsável", input("assignee", { value: t.assignee || "" }))),
    field("Aguardando (de quem / o quê)", input("waiting_for", { value: t.waiting_for || "" })),
    field("Tags (separadas por vírgula)", input("tags", { value: (t.tags || []).join(", ") })),
    field("Descrição", textarea("description", t.description)),
    field("Observações", textarea("notes", t.notes, 2)),
    h("button", { class: "btn", type: "submit" }, submitLabel));
  return f;
}
