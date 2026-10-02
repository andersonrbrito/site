import { h, fmtDateTime } from "../util.js";
import { pageHead, panel, empty, alertBox, list, select } from "../ui.js";

const short = (v) => { const s = typeof v === "string" ? v : JSON.stringify(v); return s && s.length > 60 ? s.slice(0, 60) + "…" : s; };
const HREF = { tasks: (id) => `#/tarefas/${id}`, projects: (id) => `#/projetos/${id}` };

export default async function historico({ sb, member, query, go }) {
  if (member.role !== "owner") return h("div", { class: "page" }, alertBox("Apenas o dono acessa o histórico."));
  let q = sb.from("change_log").select("id, entity, entity_id, action, source, changed_fields, old_values, new_values, at").order("at", { ascending: false }).limit(100);
  if (["tasks", "projects", "notes", "events", "clients"].includes(query.entidade)) q = q.eq("entity", query.entidade);
  if (["painel", "chatgpt", "claude", "codex", "outro", "api", "sistema"].includes(query.origem)) q = q.eq("source", query.origem);
  const { data, error } = await q;

  const f = h("form", { class: "filters", style: { gridTemplateColumns: "1fr 1fr auto" } },
    select("entidade", [["", "Todos os registros"], ["tasks", "Tarefas"], ["projects", "Projetos"], ["notes", "Notas"], ["events", "Compromissos"]], query.entidade || ""),
    select("origem", [["", "Todas as origens"], ["painel", "Painel"], ["chatgpt", "ChatGPT"], ["claude", "Claude"], ["codex", "Codex"]], query.origem || ""),
    h("button", { class: "btn btn-ghost", type: "submit" }, "Filtrar"));
  f.addEventListener("submit", (e) => { e.preventDefault(); const p = new URLSearchParams(); for (const [k, v] of new FormData(f)) if (v) p.set(k, v); go("/historico?" + p); });

  const item = (x) => {
    const fields = x.changed_fields.filter((c) => !["completed_at", "id", "seq"].includes(c));
    return h("li", { class: "row", style: { display: "block" } },
      h("div", { class: "meta", style: { marginTop: 0 } }, h("span", { class: "mono" }, fmtDateTime(x.at)), h("span", { class: "chip accent" }, x.action), h("span", { class: "chip" }, x.entity), h("span", { class: "chip" }, `por ${x.source}`), HREF[x.entity] && h("a", { class: "mono", href: HREF[x.entity](x.entity_id) }, "abrir")),
      x.action === "create" ? h("div", { class: "small", style: { marginTop: "4px" } }, short(x.new_values?.title ?? x.new_values?.name))
        : fields.map((c) => h("div", { class: "small", style: { marginTop: "2px" } }, h("span", { class: "muted" }, `${c}: `), `${short(x.old_values?.[c]) || "∅"} → ${short(x.new_values?.[c]) || "∅"}`)));
  };
  return h("div", { class: "page" }, pageHead("Histórico", "auditoria"), f, error && alertBox("Não foi possível carregar o histórico."),
    panel("Alterações", { count: (data || []).length, color: "#7b61ff" }, (data || []).length ? list(data.map(item)) : empty("Nenhuma alteração registrada.")));
}
