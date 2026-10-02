import { h } from "../util.js";
import { pageHead, panel, empty, alertBox, list } from "../ui.js";

const NAMES = { task: "Tarefa", project: "Projeto", note: "Nota", event: "Compromisso" };
export const HREF = { task: (id) => `#/tarefas/${id}`, project: (id) => `#/projetos/${id}`, note: () => "#/projetos", event: () => "#/agenda" };

export default async function busca({ sb, query, go }) {
  const q = (query.q || "").trim();
  const { data, error } = q ? await sb.rpc("search_all", { q }) : { data: [], error: null };
  const f = h("form", null, h("input", { class: "input", name: "q", value: q, placeholder: "Buscar tarefas, projetos, notas, compromissos", autofocus: true }));
  f.addEventListener("submit", (e) => { e.preventDefault(); go("/busca?q=" + encodeURIComponent(new FormData(f).get("q"))); });
  return h("div", { class: "page" }, pageHead("Busca", "global"), h("div", { style: { marginBottom: "16px" } }, f), error && alertBox("Não foi possível buscar."),
    q && !error && panel("Resultados", { count: (data || []).length, color: "#3da7ff" }, (data || []).length ? list(data.map((r) =>
      h("li", null, h("a", { class: "row", href: HREF[r.entity](r.id), style: { display: "block" } }, h("span", { class: "mono" }, NAMES[r.entity]), h("div", { class: "title" }, r.title || "(sem título)"), r.snippet && h("div", { class: "small muted truncate" }, r.snippet))))) : empty(`Nada encontrado para “${q}”.`)));
}
