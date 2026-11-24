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


// Painel: catálogo vivo (tabela skills_catalogo), sincronizado do Mac por tools/skills_sync.py.
// O Anderson escolhe ativa / avaliar / desligada; o sincronizador aplica no Mac (move a pasta).
const ESC = [["ativa", "Ativa"], ["avaliar", "Avaliar"], ["desligada", "Desligada"]];
const CATN = { video: "Edição de vídeo", motion: "Motion", legenda: "Legenda", estilo: "Estilos", conteudo: "Conteúdo", design: "Design", docs: "Documentos", sistema: "Sistema", aula: "Aulas" };
const kb = (n) => n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
async function painelVivo(sb) {
  const { data, error } = await sb.from("skills_catalogo").select("*").is("archived_at", null).order("nome");
  if (error) return h("div", { class: "stack" }, alertBox("A tabela das skills ainda não existe no banco (migration 0044). Enquanto isso, veja a aba Catálogo.", "warn"));
  const rows = data || [];
  const semanaIni = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  let fil = rows.some((r) => r.escolha === "avaliar") ? "avaliar" : "todas", cat = "", busca = "";
  const out = h("div", { class: "stack-lg" });
  const salvar = async (r, escolha, btns) => {
    btns.forEach((b) => (b.disabled = true));
    const { data: d, error: e } = await sb.from("skills_catalogo").update({ escolha }).eq("id", r.id).eq("version", r.version).select("*").maybeSingle();
    if (e || !d) { toast(e ? e.message : "Alguém mudou esta skill antes. Recarregue a página.", "error"); btns.forEach((b) => (b.disabled = false)); return; }
    Object.assign(r, d); toast(escolha === "desligada" ? `${r.nome}: desligada. Sai do Mac na próxima sincronização.` : escolha === "ativa" ? `${r.nome}: ativa.` : `${r.nome}: em avaliação.`); draw();
  };
  const card = (r) => {
    const btns = [];
    const seg = h("div", { class: "sk-seg" }, ...ESC.map(([id, l]) => { const b = h("button", { type: "button", class: "chip" + (r.escolha === id ? " on" : ""), onclick: () => r.escolha !== id && salvar(r, id, btns) }, l); btns.push(b); return b; }));
    const arqs = Array.isArray(r.arquivos) ? r.arquivos : [];
    const nova = r.semana >= semanaIni;
    return h("article", { class: "prcard sk sk-" + r.escolha },
      h("header", { class: "flex" }, h("b", { class: "grow truncate", title: r.slug }, r.nome),
        nova ? h("span", { class: "chip accent" }, "nova") : null, h("span", { class: "chip" }, r.tipo)),
      h("p", { class: "prbody" }, r.descricao || "Sem descrição."),
      r.aprendizados ? h("details", null, h("summary", { class: "mono small" }, "O que ensina"), h("p", { class: "small", style: { whiteSpace: "pre-wrap" } }, r.aprendizados)) : null,
      arqs.length ? h("details", null, h("summary", { class: "mono small" }, `Arquivos (${arqs.length})`),
        h("ul", { class: "mono small sk-arqs" }, ...arqs.map((a) => h("li", null, a.nome, h("span", { class: "muted" }, ` ${kb(a.bytes)}`))))) : null,
      r.agentes?.length ? h("div", { class: "flex wrap" }, ...r.agentes.map((a) => h("span", { class: "chip" }, a))) : null,
      h("footer", { class: "flex wrap" }, h("span", { class: "mono muted small grow" }, CATN[r.categoria] || r.categoria, r.instalada ? "" : " · fora do Mac"),
        r.fonte_url ? h("a", { class: "small", href: r.fonte_url, target: "_blank", rel: "noopener" }, "fonte ↗") : null),
      seg);
  };
  const draw = () => {
    const n = (f) => rows.filter(f).length;
    const F = { todas: () => true, novas: (r) => r.semana >= semanaIni, avaliar: (r) => r.escolha === "avaliar", ativa: (r) => r.escolha === "ativa", desligada: (r) => r.escolha === "desligada" };
    const q = busca.trim().toLowerCase();
    const vis = rows.filter(F[fil]).filter((r) => !cat || r.categoria === cat).filter((r) => !q || `${r.nome} ${r.slug} ${r.descricao || ""}`.toLowerCase().includes(q));
    const chips = [["todas", "Todas"], ["novas", "Novas da semana"], ["avaliar", "Para avaliar"], ["ativa", "Ativas"], ["desligada", "Desligadas"]].map(([id, l]) =>
      h("button", { type: "button", class: "chip" + (fil === id ? " on" : ""), onclick: () => { fil = id; draw(); } }, l, h("sup", null, n(F[id]))));
    const sel = h("select", { class: "input", style: { maxWidth: "200px" }, onchange: (e) => { cat = e.target.value; draw(); } }, h("option", { value: "" }, "Todas as categorias"),
      ...Object.entries(CATN).filter(([k]) => rows.some((r) => r.categoria === k)).map(([k, l]) => h("option", { value: k, selected: k === cat }, l)));
    const inp = h("input", { class: "input", type: "search", placeholder: "Buscar skill...", value: busca, style: { maxWidth: "240px" }, oninput: (e) => { busca = e.target.value; clearTimeout(inp._t); inp._t = setTimeout(() => { draw(); const i = out.querySelector("input[type=search]"); i.focus(); i.setSelectionRange(busca.length, busca.length); }, 250); } });
    const grupos = Object.keys(CATN).map((k) => [k, vis.filter((r) => r.categoria === k)]).filter(([, v]) => v.length);
    out.replaceChildren(
      h("div", { class: "of-kpis sk-kpis" }, ...[["ativa", "ativas"], ["avaliar", "para avaliar"], ["desligada", "desligadas"], ["novas", "novas na semana"]].map(([k, l]) => h("div", { class: k === "avaliar" && n(F.avaliar) ? "hot" : "" }, h("b", null, String(n(F[k]))), h("span", null, l)))),
      h("p", { class: "muted small" }, "Escolha o que fica ligado. A mudança vale no Mac na próxima sincronização (tools/skills_sync.py, roda junto da evolução semanal). Skills de plugin só mudam pelo app."),
      h("div", { class: "mfilters" }, ...chips), h("div", { class: "flex wrap" }, sel, inp),
      ...(grupos.length ? grupos.map(([k, v]) => h("section", { class: "stack" }, h("div", { class: "mono sectitle" }, `${CATN[k].toUpperCase()} · ${v.length}`), h("div", { class: "prgrid" }, ...v.map(card))))
        : [h("p", { class: "empty" }, "Nada neste filtro.")]));
  };
  draw();
  return out;
}

// SkillS_ tem três áreas: Painel (escolha), Catálogo (referência) e Prompts.
// SkillS_ tem duas áreas: Skills (catálogo) e Prompts (salvos no banco).
export default async function skills(ctx) {
  const aba = ["prompts", "catalogo"].includes(ctx.query.aba) ? ctx.query.aba : "skills";
  const tab = (id, l) => h("button", { type: "button", class: "chip" + (aba === id ? " on" : ""), onclick: () => ctx.go(id === "skills" ? "/skills" : `/skills?aba=${id}`) }, l);
  return h("div", { class: "page" },
    h("div", { class: "page-head" }, h("div", null, h("div", { class: "mono eyebrow" }, "// biblioteca"), h("h1", null, "SkillS_"))),
    h("div", { class: "mfilters" }, tab("skills", "Painel"), tab("catalogo", "Catálogo"), tab("prompts", "Prompts")),
    aba === "prompts" ? await promptsArea(ctx)
      : aba === "skills" ? await painelVivo(ctx.sb)
      : h("div", { class: "stack-lg" }, h("p", { class: "muted hide-sm" }, "Skills do Claude, plugins e repositórios do GitHub. \"Uso\" = instalado no anderson_Os; \"Recomendo\" = vale instalar."), catalogo()));
}
