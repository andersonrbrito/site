import { h } from "../util.js";
import { pageHead, alertBox, toast } from "../ui.js";

// Carrosséis: área do PostadoR_ só para carrosséis gerados (motor em /carrosseis/gerar.py, 1080x1350).
// Cada carrossel mora em /painel/carrosseis/<slug>/ com index.json e os slides NN.jpg.
const BASE = "/painel/carrosseis/";

export default async function carrosseis({ query, go }) {
  let lista = [];
  try {
    const slugs = await (await fetch(BASE + "lista.json", { cache: "no-store" })).json();
    lista = (await Promise.all(slugs.map((s) => fetch(`${BASE}${s}/index.json`, { cache: "no-store" }).then((r) => r.json()).catch(() => null)))).filter(Boolean);
  } catch { return h("div", { class: "page" }, pageHead("Carrosséis", "gerados para o Instagram"), alertBox("Não foi possível carregar os carrosséis.")); }
  lista.sort((a, b) => (b.criado || "").localeCompare(a.criado || ""));
  const atual = lista.find((c) => c.slug === query.c);

  if (atual) {
    const url = (f) => `${BASE}${atual.slug}/${f}`;
    const copiar = async () => { try { await navigator.clipboard.writeText(atual.legenda || ""); toast("Legenda copiada."); } catch { toast("Não deu para copiar.", { kind: "err" }); } };
    return h("div", { class: "page wide" },
      pageHead(atual.titulo, `${atual.perfil} · ${atual.slides.length} slides · 1080×1350`),
      h("div", { class: "flex", style: { gap: "8px", marginBottom: "14px" } },
        h("button", { class: "btn btn-sm", type: "button", onclick: () => go("/carrosseis") }, "← Todos"),
        h("button", { class: "btn btn-sm", type: "button", onclick: copiar }, "Copiar legenda")),
      h("div", { class: "carr-strip" }, ...atual.slides.map((f, i) => h("a", { href: url(f), target: "_blank", rel: "noopener", class: "carr-slide" },
        h("img", { src: url(f), alt: `Slide ${i + 1}`, loading: "lazy" }), h("span", { class: "mono" }, String(i + 1).padStart(2, "0"))))),
      atual.legenda && h("section", { class: "panel", style: { marginTop: "16px" } }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Legenda")),
        h("div", { class: "panel-body" }, h("p", { style: { whiteSpace: "pre-wrap", margin: 0 } }, atual.legenda))));
  }

  return h("div", { class: "page wide" },
    pageHead("Carrosséis", "gerados para o Instagram · abra um para ver os slides e copiar a legenda"),
    lista.length ? h("div", { class: "carr-grid" }, ...lista.map((c) => h("a", { class: "carr-card", href: "#/carrosseis?c=" + c.slug, onclick: (e) => { e.preventDefault(); go("/carrosseis?c=" + c.slug); } },
      h("img", { src: `${BASE}${c.slug}/${c.slides[0]}`, alt: "", loading: "lazy" }),
      h("b", null, c.titulo), h("span", { class: "muted small" }, `${c.perfil} · ${c.slides.length} slides`))))
      : h("p", { class: "empty" }, "Nenhum carrossel ainda."));
}
