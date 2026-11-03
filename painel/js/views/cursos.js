import { h } from "../util.js";
import { pageHead } from "../ui.js";

// Cursos: resumos explicativos das aulas que o Anderson estudou. Cada curso é uma página em /painel/cursos/.
const CURSOS = [
  { titulo: "Como viralizar no X e transformar alcance em dinheiro", autor: "Conrado de Sá (Condes)", tema: "X / Twitter", desc: "Nicho vende, meme não; constância, números como desafio, mostrar o como, responder todo mundo e o que medir.", href: "/painel/cursos/conrado-viralizar-x.html", data: "03/11/2026" },
];

export default async function cursos() {
  return h("div", { class: "page" },
    pageHead("Cursos", "resumos explicativos das aulas estudadas"),
    h("div", { class: "stack" }, ...CURSOS.map((c) => h("a", { class: "panel", href: c.href, target: "_blank", rel: "noopener", style: { display: "block" } },
      h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, c.tema), h("span", { class: "mono muted" }, c.data)),
      h("div", { class: "panel-body" }, h("b", { style: { fontSize: "17px" } }, c.titulo), h("p", { class: "muted small", style: { margin: "4px 0 6px" } }, c.autor), h("p", { style: { margin: 0 } }, c.desc))))));
}
