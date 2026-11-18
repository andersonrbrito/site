import { h } from "../util.js";
import { pageHead } from "../ui.js";

// KIT BF: todos os links do lançamento do Kit Editar com Claude num lugar só. Editar a lista aqui e no plano (divulgacao-kit).
const G = [["Vender", [["Página de vendas", "https://andersonbrito.com/editar-com-claude.html", "o link que vai na DM e na bio"], ["Página de vendas com formulário liberado", "https://andersonbrito.com/editar-com-claude.html?liberar", "para conferir preços e totais sem ver a apresentação"], ["Links da bio", "https://andersonbrito.com/links/", "kit em primeiro (falta publicar)"]]], ["Páginas grátis (iscas)", [["10 estilos de animação", "https://andersonbrito.com/10estilos/", "quem comenta ESTILOS"], ["20 repositórios", "https://andersonbrito.com/repos/", "quem comenta REPOS"], ["Ferramentas e materiais grátis", "https://andersonbrito.com/gratis.html", "quem comenta LISTA"]]], ["Pagamento (Nubank)", [["Só o kit · R$57", "https://checkout.nubank.com.br/nnBc7Yo2d46sj6f5", "conferir se o valor do link é 57"], ["Kit + Pack Impacto · R$83", "https://checkout.nubank.com.br/oPz74kqKq96sj6f5", "conferir se o valor do link é 83"], ["Kit + Pack Estúdio · R$97", "https://checkout.nubank.com.br/xB30acWjt46sj6f5", "conferir se o valor do link é 97"]]], ["Acesso do comprador (mandar depois do pagamento)", [["Quem comprou só o kit", "https://andersonbrito.com/acesso/kit-c7m2/", ""], ["Quem comprou kit + Pack Impacto", "https://andersonbrito.com/acesso/kit-impacto-p4x9/", ""], ["Quem comprou kit + Pack Estúdio", "https://andersonbrito.com/acesso/kit-estudio-t8q3/", ""]]], ["Arquivos do kit", [["Pasta do Drive com tudo", "https://drive.google.com/drive/folders/1mhbMdQMJa5aEZYhV2GYisU12np_Ji1T9", ""], ["E-book (PDF)", "https://drive.google.com/file/d/17wpd5vGnd_xWbEJr29taEzYHKv2AfkSz/view", ""], ["Manual rápido", "https://drive.google.com/file/d/1QUvQ7f17Exky5WKDtmXMBQ4pOAtZr63Z/view", ""], ["Prompts (Docs)", "https://docs.google.com/document/d/1qOO4ARiCtU6KJ60DUM-_od7rpGeiUamBIo_fJQNYP3Y/edit", ""], ["Skills (zip)", "https://drive.google.com/file/d/15gAFEn0uTMg9-lVw74Lx1RBHZOvkzQLe/view", ""], ["Catálogo de skills", "https://docs.google.com/document/d/1wzVlTy6zy4Hf3uErYw2-kSKKBQv2QXceO43dILGJLnk/edit", ""], ["Modelos (zip)", "https://drive.google.com/file/d/1yHR75OWC6qGcBpzDVqqehGfruZ3oe8bw/view", ""]]], ["Contato e controle", [["Canal do WhatsApp do kit", "https://whatsapp.com/channel/0029VbDV1CDEQIakrItW4S30", ""], ["WhatsApp de suporte", "https://wa.me/5511992392104", ""], ["Checklist de lançamento no Notion", "https://www.notion.so/26ab1f9f4c5f80b18d3bd10a6b1d2f4e", "pode estar atrás do plano; o plano é a referência"]]]];
const FALTA = ["Videoaula no YouTube (não listado)", "pacote-de-edicao.zip no Drive", "pack-impacto.zip no Drive", "pack-estudio.zip no Drive"];
const T = (x) => new Date(x + "-03:00").getTime();
function fase() {
  const n = Date.now();
  if (n <= T("2026-11-25T23:59:59")) return ["R$57", "Black Friday até 25/11 23h59"];
  if (n <= T("2026-11-26T20:00:00")) return ["R$97", "preço normal até 26/11 20h"];
  if (n <= T("2026-11-28T23:59:59")) return ["R$57", "Black Friday até 28/11 23h59"];
  if (n <= T("2026-11-30T23:59:59")) return ["R$97", "últimos dias, fecha 30/11 23h59"];
  return ["fechado", "vendas encerradas em 30/11"];
}
export default async function kitbf() {
  const [preco, txt] = fase();
  const copiar = (u, b) => navigator.clipboard.writeText(u).then(() => { b.textContent = "copiado"; setTimeout(() => (b.textContent = "copiar"), 1200); });
  return h("div", { class: "page" },
    pageHead("KIT BF", "Kit Editar com Claude · disponível só até 30 de novembro"),
    h("div", { class: "pfgrid" }, h("div", { class: "pfcard" }, h("span", { class: "mono muted" }, "preço na página agora"), h("b", null, preco), h("span", { class: "muted small" }, txt))),
    ...G.map(([t, L]) => h("div", { style: { marginTop: "18px" } },
      h("div", { class: "mono muted", style: { marginBottom: "8px" } }, t),
      h("div", { class: "pfgrid" }, ...L.map(([n, u, o]) => h("div", { class: "pfcard", style: { minWidth: "0", overflow: "hidden" } },
        h("a", { href: u, target: "_blank", rel: "noopener", style: { whiteSpace: "normal", display: "block" } }, h("b", { style: { whiteSpace: "normal" } }, n)),
        o ? h("span", { class: "muted small", style: { whiteSpace: "normal", display: "block", overflow: "visible" } }, o) : null,
        h("span", { class: "mono muted", style: { whiteSpace: "normal", wordBreak: "break-all", display: "block", fontSize: "12px" } }, u.replace(/^https:\/\//, "")),
        h("div", null, h("button", { type: "button", class: "chip", onclick: (e) => copiar(u, e.currentTarget) }, "copiar"))))))),
    h("div", { style: { marginTop: "18px" } }, h("div", { class: "mono muted", style: { marginBottom: "8px" } }, "Ainda sem link"),
      h("ul", { class: "muted small" }, ...FALTA.map((x) => h("li", null, x)))),
    h("p", { class: "muted small", style: { marginTop: "12px" } }, "As legendas, os vídeos e o calendário interno ficam no plano de divulgação, que está só no Mac (pasta divulgacao-kit)."));
}
