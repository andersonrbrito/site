import { h } from "../util.js";
import { pageHead } from "../ui.js";
import { PORTFOLIOS } from "../portfolios.js";

// Portfólios e landing pages do site: no ar (com ou sem link na home) e offline, com data da última alteração.
export default async function portfolios({ query, go }) {
  const f = ["on", "off"].includes(query.f) ? query.f : "todos";
  const list = PORTFOLIOS.filter((p) => f === "todos" || (f === "on" ? p.online : !p.online));
  const chip = (id, label, n) => h("button", { type: "button", class: "chip" + (f === id ? " on" : ""), onclick: () => go(`/portfolios${id === "todos" ? "" : "?f=" + id}`) }, label, h("sup", null, n));
  const status = (p) => (p.online ? (p.linked ? ["on", "No ar · linkada no site"] : ["hid", "No ar · sem link na home"]) : ["off", "Offline · só no Mac"]);
  return h("div", { class: "page" },
    pageHead("Portfólios", "páginas do andersonbrito.com"),
    h("div", { class: "mfilters" }, chip("todos", "Todos", PORTFOLIOS.length), chip("on", "No ar", PORTFOLIOS.filter((p) => p.online).length), chip("off", "Offline", PORTFOLIOS.filter((p) => !p.online).length)),
    h("div", { class: "pfgrid" }, ...list.map((p) => {
      const [cls, label] = status(p);
      return h("a", { class: "pfcard" + (p.online ? "" : " off"), href: p.online ? `../${p.path}` : null, target: "_blank", rel: "noopener" },
        h("div", { class: "flex" }, h("i", { class: "st " + cls }), h("span", { class: "mono muted" }, label)),
        h("b", null, p.title.split(/ [—|] /)[0]),
        h("span", { class: "muted small truncate" }, p.title.split(/ [—|] /).slice(1).join(" · ")),
        h("div", { class: "flex" }, h("span", { class: "mono" }, `/${p.path}`), h("div", { class: "grow" }), h("span", { class: "mono muted" }, `alterado ${p.updated.split("-").reverse().join("/")}`)));
    })),
    h("p", { class: "muted small", style: { marginTop: "12px" } }, "A lista é gerada a partir do repositório do site (painel/dev/gen-portfolios.py) e atualizada quando o painel é publicado."));
}
