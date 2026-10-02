import { h, fmtDate, L, PROJECT_AREAS, STAGES, PAYMENT } from "../util.js";
import { pageHead, panel, empty, alertBox, list, form, field, input, select, textarea } from "../ui.js";

const opt = (obj, keys) => keys.map((k) => [k, obj[k]]);

export default async function projetos({ sb, refresh }) {
  const [{ data: projects, error }, { data: open }] = await Promise.all([
    sb.from("projects").select("id, seq, name, area, status, stage, payment_status, due_date").is("archived_at", null).order("status").order("due_date", { nullsFirst: false }),
    sb.from("tasks").select("project_id").is("archived_at", null).not("status", "in", "(concluido,cancelado)").not("project_id", "is", null),
  ]);
  const counts = {}; (open || []).forEach((t) => (counts[t.project_id] = (counts[t.project_id] || 0) + 1));

  const create = form(async (fd) => {
    const name = (fd.get("name") || "").trim();
    if (!name) return { ok: false, error: "Informe o nome do projeto." };
    const { error: e } = await sb.from("projects").insert({
      name, area: fd.get("area"), stage: fd.get("stage"), payment_status: fd.get("payment_status"),
      due_date: fd.get("due_date") || null, description: (fd.get("description") || "").trim() || null,
    });
    if (e) return { ok: false, error: "Não foi possível salvar o projeto." };
    refresh(); return { ok: true, message: "Projeto criado." };
  }, {},
    field("Nome", input("name", { required: true, maxlength: 200 })),
    h("div", { class: "grid2" },
      field("Área", select("area", opt(L.projectArea, PROJECT_AREAS), "freelas")), field("Etapa", select("stage", opt(L.stage, STAGES), "briefing")),
      field("Pagamento", select("payment_status", opt(L.payment, PAYMENT), "nao_aplicavel")), field("Prazo de entrega", input("due_date", { type: "date" }))),
    field("Descrição / briefing resumido", textarea("description", "", 2)),
    h("button", { class: "btn", type: "submit" }, "Criar projeto"));

  return h("div", { class: "page" },
    pageHead("Projetos", "trabalho e clientes"),
    error && alertBox("Não foi possível carregar os projetos."),
    panel("Projetos", { count: (projects || []).length, color: "#3da7ff" }, (projects || []).length ? list(projects.map((p) =>
      h("li", null, h("a", { href: `#/projetos/${p.id}`, class: "row", style: { display: "block" } },
        h("div", { class: "flex" }, h("span", { class: "title grow" }, p.name), h("span", { class: "mono" }, `${counts[p.id] || 0} abertas`)),
        h("div", { class: "meta" }, h("span", { class: "chip" }, L.projectArea[p.area]), h("span", { class: "chip" }, L.projectStatus[p.status]), h("span", { class: "chip accent" }, `Etapa: ${L.stage[p.stage]}`),
          p.payment_status !== "nao_aplicavel" && h("span", { class: `chip ${p.payment_status === "pago" ? "ok" : "warn"}` }, L.payment[p.payment_status]),
          p.due_date && h("span", { class: "chip" }, `Entrega ${fmtDate(p.due_date)}`)))))) : empty("Nenhum projeto ainda. Crie o primeiro abaixo.")),
    panel("Novo projeto", { color: "#22c55e" }, create));
}
