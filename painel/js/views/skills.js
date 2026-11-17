import { h } from "../util.js";
import promptsArea from "./prompts.js?v=20261117b";
import { pageHead, alertBox, toast, copiarTexto } from "../ui.js?v=20261117a";
import { CATS, SKILLS } from "../skills-data.js?v=20261108b";

const NEC = { essencial: "Essencial", util: "Útil", opcional: "Opcional" };
// Catálogo de skills, plugins e repositórios (dados em js/skills-data.js), com filtro local.
function catalogo() {
  let fil = "todos";
  const out = h("div", { class: "stack-lg" });
  const draw = () => {
    const vis = SKILLS.filter((s) => fil === "todos" || (fil === "uso" ? s.uso : fil === "rec" ? !s.uso : s.nec === fil));
    const chips = [["todos", "Todas", SKILLS.length], ["uso", "Eu uso", SKILLS.filter((s) => s.uso).length], ["rec", "Recomendadas", SKILLS.filter((s) => !s.uso).length],
      ["essencial", "Essenciais"], ["util", "Úteis"], ["opcional", "Opcionais"]].map(([id, l, n]) =>
      h("button", { type: "button", class: "chip" + (fil === id ? " on" : ""), onclick: () => { fil = id; draw(); } }, l, n != null ? h("sup", null, n) : null));
    out.replaceChildren(h("div", { class: "mfilters" }, ...chips), ...CATS.map((c) => {
      const items = vis.filter((s) => s.cat === c.id).sort((a, b) => Object.keys(NEC).indexOf(a.nec) - Object.keys(NEC).indexOf(b.nec));
      return items.length ? h("section", { class: "stack" }, h("div", { class: "mono sectitle" }, c.nome.toUpperCase()),
        h("div", { class: "prgrid" }, ...items.map((s) => h("article", { class: "prcard sk" + (s.uso ? " sk-uso" : "") },
          h("header", { class: "flex" }, s.url ? h("a", { class: "grow truncate", href: s.url, target: "_blank", rel: "noopener" }, h("b", null, s.nome), " ↗") : h("b", { class: "grow truncate" }, s.nome),
            h("span", { class: "chip" + (s.uso ? " accent" : "") }, s.uso ? "uso" : "recomendo")),
          h("p", { class: "prbody" }, s.desc),
          h("footer", { class: "flex" }, h("span", { class: "mono muted small grow" }, s.tipo), h("span", { class: "mono small sk-" + s.nec }, NEC[s.nec])))))) : null;
    }).filter(Boolean));
  };
  draw();
  return out;
}

// SkillS_ tem duas áreas: Skills (catálogo) e Prompts (salvos no banco).
export default async function skills(ctx) {
  const aba = ctx.query.aba === "prompts" ? "prompts" : "skills";
  const tab = (id, l) => h("button", { type: "button", class: "chip" + (aba === id ? " on" : ""), onclick: () => ctx.go(id === "skills" ? "/skills" : "/skills?aba=prompts") }, l);
  return h("div", { class: "page" },
    h("div", { class: "page-head" }, h("div", null, h("div", { class: "mono eyebrow" }, "// biblioteca"), h("h1", null, "SkillS_"))),
    h("div", { class: "mfilters" }, tab("skills", "Skills"), tab("prompts", "Prompts")),
    aba === "prompts" ? await promptsArea(ctx)
      : h("div", { class: "stack-lg" }, h("p", { class: "muted hide-sm" }, "Skills do Claude, plugins e repositórios do GitHub. \"Uso\" = instalado no anderson_Os; \"Recomendo\" = vale instalar."), catalogo()));
}
