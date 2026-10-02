import { h, fmtDateTime } from "../util.js";
import { pageHead, panel, empty, alertBox, list, form, field, textarea, toast } from "../ui.js";
import { taskForm } from "../taskform.js";

export default async function tarefa({ sb, member, params, go, refresh }) {
  const id = params[0];
  if (!/^[0-9a-f-]{36}$/i.test(id || "")) return h("div", { class: "page" }, alertBox("Tarefa não encontrada."));
  const { data: t } = await sb.from("tasks").select("*").eq("id", id).maybeSingle();
  if (!t) return h("div", { class: "page" }, alertBox("Tarefa não encontrada."));
  const [{ data: projects }, { data: notes }, hist] = await Promise.all([
    sb.from("projects").select("id, name").is("archived_at", null).order("name"),
    sb.from("notes").select("id, body, created_at, source").eq("task_id", id).is("archived_at", null).order("created_at", { ascending: false }),
    member.role === "owner" ? sb.from("change_log").select("id, action, source, changed_fields, at").eq("entity", "tasks").eq("entity_id", id).order("at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
  ]);

  const archive = h("button", { class: "btn btn-ghost", type: "button", onclick: async () => {
    if (!confirm("Arquivar esta tarefa? Ela fica recuperável pelo histórico.")) return;
    const { data, error } = await sb.from("tasks").update({ archived_at: new Date().toISOString() }).eq("id", t.id).eq("version", t.version).select("id").maybeSingle();
    if (error || !data) return toast("Não foi possível arquivar (ela pode ter mudado). Recarregue.", { kind: "err" });
    toast("Tarefa arquivada."); go("/tarefas");
  } }, "Arquivar");

  const noteForm = form(async (fd) => {
    const body = (fd.get("body") || "").trim();
    if (!body) return { ok: false, error: "Escreva o texto da nota." };
    const { error } = await sb.from("notes").insert({ body, task_id: t.id });
    if (error) return { ok: false, error: "Não foi possível salvar a nota." };
    refresh(); return { ok: true, message: "Nota salva." };
  }, {}, field("Nova nota", textarea("body", "", 2)), h("button", { class: "btn", type: "submit" }, "Adicionar nota"));

  return h("div", { class: "page" },
    pageHead(`T-${t.seq}`, "tarefa", !t.archived_at && archive),
    t.archived_at && h("p", { class: "note" }, "Tarefa arquivada."),
    h("p", { class: "mono", style: { marginBottom: "16px" } }, `Criada ${fmtDateTime(t.created_at)} · origem: ${t.source} · versão ${t.version}${t.completed_at ? ` · concluída ${fmtDateTime(t.completed_at)}` : ""}`),
    taskForm({ sb, task: t, projects: projects || [], submitLabel: "Salvar alterações", onDone: refresh }),
    h("div", { style: { marginTop: "28px" } },
      panel("Notas da tarefa", { color: "#3da7ff" }, noteForm, (notes || []).length ? list(notes.map((n) => h("li", { class: "row", style: { display: "block" } }, h("div", { style: { whiteSpace: "pre-wrap" } }, n.body), h("div", { class: "mono", style: { marginTop: "4px" } }, `${fmtDateTime(n.created_at)} · ${n.source}`)))) : empty("Sem notas.")),
      member.role === "owner" && panel("Histórico", { color: "#7b61ff" }, (hist.data || []).length ? list(hist.data.map((x) => h("li", { class: "small muted" }, `${fmtDateTime(x.at)} · ${x.action} por ${x.source} · ${x.changed_fields.filter((f) => f !== "completed_at").join(", ")}`))) : empty("Sem alterações registradas."))));
}
