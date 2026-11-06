import { h } from "../util.js";
import { pageHead } from "../ui.js";

// CursoS_: os cursos da barra do PaineL_ (favoritos do grupo "Cursos", mesma fonte da página inicial)
// + os resumos explicativos das aulas que o Anderson estudou (páginas em /painel/cursos/).
const RESUMOS = [
  { titulo: "Como viralizar no X e transformar alcance em dinheiro", autor: "Conrado de Sá (Condes)", tema: "X / Twitter", desc: "Nicho vende, meme não; constância, números como desafio, mostrar o como, responder todo mundo e o que medir.", href: "/painel/cursos/conrado-viralizar-x.html", data: "03/11/2026" },
];
const favicon = (url) => { try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; } catch { return ""; } };

export default async function cursos({ sb }) {
  const { data } = await sb.from("favorites").select("id, grp, name, url, position").is("archived_at", null).ilike("grp", "%curso%").order("position").limit(100);
  const meus = data || [];
  return h("div", { class: "page" },
    pageHead("CursoS_", "meus cursos e resumos das aulas"),
    h("section", { class: "panel" },
      h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Meus cursos"), h("span", { class: "mono" }, String(meus.length))),
      h("div", { class: "panel-body" }, meus.length ? h("div", { class: "cu-grid" }, ...meus.map((c) => h("a", { class: "cu-card", href: c.url, target: "_blank", rel: "noopener" },
        h("img", { src: favicon(c.url), alt: "", width: 32, height: 32, loading: "lazy" }), h("div", { class: "grow", style: { minWidth: 0 } }, h("b", { class: "truncate", style: { display: "block" } }, c.name), h("span", { class: "muted small truncate", style: { display: "block" } }, (() => { try { return new URL(c.url).hostname; } catch { return c.url; } })())), h("span", { class: "mono" }, "↗"))))
        : h("p", { class: "empty" }, "Nenhum curso nos favoritos. Adicione no PaineL_ (barra de cima, Editar) no grupo Cursos."))),
    h("section", { class: "panel" },
      h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--violet)" } }), h("h2", { class: "mono grow" }, "Resumos das aulas")),
      h("div", { class: "panel-body stack" }, ...RESUMOS.map((c) => h("a", { class: "cu-res", href: c.href, target: "_blank", rel: "noopener" },
        h("div", { class: "flex wrap", style: { gap: "6px" } }, h("span", { class: "chip accent" }, c.tema), h("span", { class: "mono muted" }, c.data)),
        h("b", { style: { fontSize: "17px", display: "block", marginTop: "6px" } }, c.titulo), h("p", { class: "muted small", style: { margin: "4px 0 6px" } }, c.autor), h("p", { style: { margin: 0 } }, c.desc))))));
}
