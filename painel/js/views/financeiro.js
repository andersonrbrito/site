import { h } from "../util.js";
import { pageHead } from "../ui.js";

// Financeiro: em construção.
export default async function financeiro() {
  return h("div", { class: "page" },
    pageHead("Financeiro", "em construção"),
    h("section", { class: "panel" }, h("div", { class: "panel-body" }, h("p", { class: "empty" }, "Em construção. Em breve: entradas, saídas e contas do mês."))));
}
