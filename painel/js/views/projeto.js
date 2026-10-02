import { h, todayISO, fmtDateTime, L, PROJECT_AREAS, PROJECT_STATUSES, STAGES, PAYMENT } from "../util.js";
import { TASK_COLS, setTaskStatus } from "../data.js";
import { pageHead, panel, empty, alertBox, list, taskRow, completeButton, form, field, input, select, textarea } from "../ui.js";

const opt = (obj, keys) => keys.map((k) => [k, obj[k]]);

export default async function projeto({ sb, params, refresh }) {
  const id = params[0];
  if (!/^[0-9a-f-]{36}$/i.test(id || "")) return h("div", { class: "page" }, alertBox("Projeto não encontrado."));
  const { data: p } = await sb.from("projects").select("*").eq("id", id).maybeSingle();
  if (!p) return h("div", { class: "page" }, alertBox("Projeto não encontrado."));
  const [{ data: tasks }, { data: notes }] = await Promise.all([
    sb.from("tasks").select(TASK_COLS).eq("project_id", id).is("archived_at", null).order("status").order("due_date", { nullsFirst: false }),
    sb.from("notes").select("id, body, created_at, source").eq("project_id", id).is("archived_at", null).order("created_at", { ascending: false }),
  ]);
  const today = todayISO();

  const edit = form(async (fd) => {
    const name = (fd.get("name") || "").trim();
    if (!name) return { ok: false, error: "O nome é obrigatório." };
    const { data, error } = await sb.from("projects").update({
      name, area: fd.get("area"), status: fd.get("status"), stage: fd.get("stage"), payment_status: fd.get("payment_status"),
      due_date: fd.get("due_date") || null, description: (fd.get("description") || "").trim() || null,
    }).eq("id", p.id).eq("version", p.version).select("id").maybeSingle();
    if (error) return { ok: false, error: "Não foi possível salvar." };
    if (!data) return { ok: false, error: "Este projeto foi alterado enquanto você editava. Recarregue." };
    refresh(); return { ok: true, message: "Projeto atualizado." };
  }, { reset: false },
    field("Nome", input("name", { required: true, value: p.name })),
    h("div", { class: "grid2" },
      field("Área", select("area", opt(L.projectArea, PROJECT_AREAS), p.area)), field("Status", select("status", opt(L.projectStatus, PROJECT_STATUSES), p.status)),
      field("Etapa", select("stage", opt(L.stage, STAGES), p.stage)), field("Pagamento", select("payment_status", opt(L.payment, PAYMENT), p.payment_status)),
      field("Prazo de entrega", input("due_date", { type: "date", value: p.due_date || "" }))),
    field("Descrição", textarea("description", p.description)),
    h("p", { class: "mono" }, "Fluxo: Briefing → Produção → Revisão → Aprovação → Entrega. O pagamento é acompanhado à parte."),
    h("button", { class: "btn", type: "submit" }, "Salvar projeto"));

  const noteForm = form(async (fd) => {
    const body = (fd.get("body") || "").trim();
    if (!body) return { ok: false, error: "Escreva o texto da nota." };
    const { error } = await sb.from("notes").insert({ body, project_id: p.id });
    if (error) return { ok: false, error: "Não foi possível salvar a nota." };
    refresh(); return { ok: true, message: "Nota salva." };
  }, {}, field("Nova nota ou briefing", textarea("body", "", 2)), h("button", { class: "btn", type: "submit" }, "Adicionar nota"));

  return h("div", { class: "page" },
    pageHead(p.name, `P-${p.seq}`),
    h("p", { class: "mono", style: { marginBottom: "16px" } }, `Versão ${p.version} · origem ${p.source}`),
    panel("Dados do projeto", { color: "#3da7ff" }, edit),
    panel("Tarefas do projeto", { count: (tasks || []).length, color: "#22c55e" }, (tasks || []).length ? list(tasks.map((t) => taskRow(t, today, completeButton(t, setTaskStatus, refresh)))) : empty("Sem tarefas. Crie em Tarefas escolhendo este projeto.")),
    panel("Notas", { color: "#7b61ff" }, noteForm, (notes || []).length ? list(notes.map((n) => h("li", { class: "row", style: { display: "block" } }, h("div", { style: { whiteSpace: "pre-wrap" } }, n.body), h("div", { class: "mono", style: { marginTop: "4px" } }, `${fmtDateTime(n.created_at)} · ${n.source}`)))) : empty("Sem notas.")));
}
