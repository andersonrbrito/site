import { h } from "../util.js";
import { pageHead } from "../ui.js";

// KIT BF: todos os links do lançamento do Kit Editar com Claude num lugar só. Editar a lista aqui e no plano (divulgacao-kit).
const G = [["Vender", [["Página de vendas", "https://andersonbrito.com/editar-com-claude.html", "o link que vai na DM e na bio"], ["Página de vendas com formulário liberado", "https://andersonbrito.com/editar-com-claude.html?liberar", "para conferir preços e totais sem ver a apresentação"], ["Links da bio", "https://andersonbrito.com/links/", "kit em primeiro (falta publicar)"]]], ["Páginas grátis (iscas)", [["10 estilos de animação", "https://andersonbrito.com/10estilos/", "quem comenta ESTILOS"], ["20 repositórios", "https://andersonbrito.com/repos/", "quem comenta REPOS"], ["Ferramentas e materiais grátis", "https://andersonbrito.com/gratis.html", "quem comenta LISTA"]]], ["Pagamento (Nubank)", [["Só o kit · R$57", "https://checkout.nubank.com.br/nnBc7Yo2d46sj6f5", "conferir se o valor do link é 57"], ["Kit + Pack Impacto · R$83", "https://checkout.nubank.com.br/oPz74kqKq96sj6f5", "conferir se o valor do link é 83"], ["Kit + Pack Estúdio · R$97", "https://checkout.nubank.com.br/xB30acWjt46sj6f5", "conferir se o valor do link é 97"]]], ["Acesso do comprador (mandar depois do pagamento)", [["Quem comprou só o kit", "https://andersonbrito.com/acesso/kit-c7m2/", ""], ["Quem comprou kit + Pack Impacto", "https://andersonbrito.com/acesso/kit-impacto-p4x9/", ""], ["Quem comprou kit + Pack Estúdio", "https://andersonbrito.com/acesso/kit-estudio-t8q3/", ""]]], ["Arquivos do kit", [["Pasta do Drive com tudo", "https://drive.google.com/drive/folders/1mhbMdQMJa5aEZYhV2GYisU12np_Ji1T9", ""], ["E-book (PDF)", "https://drive.google.com/file/d/17wpd5vGnd_xWbEJr29taEzYHKv2AfkSz/view", ""], ["Manual rápido", "https://drive.google.com/file/d/1QUvQ7f17Exky5WKDtmXMBQ4pOAtZr63Z/view", ""], ["Prompts (Docs)", "https://docs.google.com/document/d/1qOO4ARiCtU6KJ60DUM-_od7rpGeiUamBIo_fJQNYP3Y/edit", ""], ["Skills (zip)", "https://drive.google.com/file/d/15gAFEn0uTMg9-lVw74Lx1RBHZOvkzQLe/view", ""], ["Catálogo de skills", "https://docs.google.com/document/d/1wzVlTy6zy4Hf3uErYw2-kSKKBQv2QXceO43dILGJLnk/edit", ""], ["Modelos (zip)", "https://drive.google.com/file/d/1yHR75OWC6qGcBpzDVqqehGfruZ3oe8bw/view", ""], ["Pacote de edição (zip, 309 MB)", "https://drive.google.com/file/d/1Ajys8HRtMpuBvi145NvFzm3fYEK8kiZY/view", ""], ["Pack Impacto (zip)", "https://drive.google.com/file/d/1-QYkUwNjguuGQd1IyVDynVgHp3-o-dza/view", "só para quem comprou Impacto ou Estúdio"], ["Pack Estúdio (zip)", "https://drive.google.com/file/d/1XT5OWeqgy1N51PP59xQxiWiZak0zCk8I/view", "só para quem comprou Estúdio"]]], ["Contato e controle", [["Canal do WhatsApp do kit", "https://whatsapp.com/channel/0029VbDV1CDEQIakrItW4S30", ""], ["Comunidade do WhatsApp (compradores)", "https://chat.whatsapp.com/K7Rq23ABok3EhI9peEosaI", "vai na mensagem de entrega"], ["WhatsApp de suporte", "https://wa.me/5511992392104", ""], ["Checklist de lançamento no Notion", "https://www.notion.so/26ab1f9f4c5f80b18d3bd10a6b1d2f4e", "pode estar atrás do plano; o plano é a referência"]]]];
const FALTA = [];
// Lista de tarefas do lançamento (mesma ordem do calendário do plano). [data, peça, onde, CTA, estado]
const TAREFAS = [
  ["2026-11-17", "Reel: 10 estilos de animação", "Reels + TikTok + Shorts + X", "ESTILOS (grátis)", "pronto"],
  ["2026-11-18", "Carrossel: Como eu edito vídeo com o Claude", "Instagram feed (collab @andrstudios) + LinkedIn (PDF)", "KIT", "pronto"],
  ["2026-11-18", "Stories de abertura (3)", "Instagram stories, adesivo de link no terceiro", "link no story", "pronto"],
  ["2026-11-18", "Reel: 11 estilos de legenda", "Reels + TikTok + Shorts + X", "KIT", "pronto"],
  ["2026-11-19", "Vertical: a dor de editar", "Reels + TikTok + Shorts", "KIT", "pronto"],
  ["2026-11-19", "Reel: 15 estilos de lettering", "Reels + TikTok + Shorts + X", "KIT", "pronto"],
  ["2026-11-20", "Vertical: o que vem no kit", "Reels + TikTok + Shorts", "KIT", "pronto"],
  ["2026-11-20", "Reel: 10 ferramentas grátis", "Reels + TikTok + Shorts + X + LinkedIn", "LISTA (grátis)", "pronto"],
  ["2026-11-21", "Reel principal de 50 s", "Reels + TikTok + Shorts + LinkedIn", "KIT", "pronto"],
  ["2026-11-21", "Reel: ouça 10 efeitos do Pack Impacto", "Reels + TikTok + Shorts + stories", "KIT", "pronto"],
  ["2026-11-22", "Vídeo: Packs de som", "Reels + stories", "KIT", "pronto"],
  ["2026-11-22", "Grátis: 5 prompts do kit", "X (fio) + LinkedIn + stories com caixinha", "KIT", "texto pronto"],
  ["2026-11-23", "Vídeo falado: 4 passos", "Reels + TikTok + Shorts + X + LinkedIn", "KIT", "falta gravar"],
  ["2026-11-24", "Repost dos melhores + faltam 2 dias", "Reels + stories + X", "KIT", "texto pronto"],
  ["2026-11-25", "Vertical: reta final da promoção", "Reels + stories (manhã e noite)", "KIT", "pronto"],
  ["", "Pauta contextual: GTA VI, Matrix e memes", "X + story falado + Threads, sem preço e sem link", "", "todo dia"],
  ["", "Stories: você falando, sem cartão", "Instagram stories, celular na mão", "", "todo dia"],
  ["", "Posts de LinkedIn (4): qua, sex, seg e qua", "LinkedIn, sempre com imagem ou vídeo", "kit no 1º comentário", "rascunho"],
];
const PEND = ["Conferir o valor dos 3 links do Nubank (57, 83 e 97)", "Confirmar que o @ do Instagram já é @andrstudios", "Gravar o vídeo falado dos 4 passos (seg 23/11)"];
const K = "kitbf_feitas";
const feitas = () => { try { return JSON.parse(localStorage.getItem(K) || "{}"); } catch { return {}; } };
const DS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const rot = (d) => { const x = new Date(d + "T12:00:00-03:00"); return DS[x.getDay()] + " " + d.slice(8) + "/" + d.slice(5, 7); };
function item(id, titulo, sub, tag) {
  const f = feitas(), cb = h("input", { type: "checkbox", style: { width: "20px", height: "20px", flex: "none", marginTop: "2px" } });
  cb.checked = !!f[id];
  const tx = h("div", { style: { minWidth: "0", flex: "1", opacity: cb.checked ? ".45" : "1" } }, h("b", { style: { whiteSpace: "normal", display: "block" } }, titulo), sub ? h("span", { class: "muted small", style: { whiteSpace: "normal", display: "block" } }, sub) : null);
  cb.onchange = () => { const g = feitas(); if (cb.checked) g[id] = 1; else delete g[id]; try { localStorage.setItem(K, JSON.stringify(g)); } catch {} tx.style.opacity = cb.checked ? ".45" : "1"; };
  return h("label", { style: { display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.08)", cursor: "pointer" } }, cb, tx, tag ? h("span", { class: "chip", style: { flex: "none" } }, tag) : null);
}
function tarefas() {
  const hoje = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const dias = [...new Set(TAREFAS.map((t) => t[0]))];
  const bloco = (titulo, itens, destaque) => h("div", { class: "pfcard", style: { minWidth: "0", marginTop: "10px", display: "block", borderColor: destaque ? "var(--accent, #39ff14)" : "" } }, h("div", { class: "mono muted", style: { marginBottom: "4px" } }, titulo), ...itens);
  const linha = (t, i) => item("t" + i, t[1], t[2] + (t[3] ? " · CTA: " + t[3] : ""), t[4]);
  return h("div", { style: { marginTop: "18px" } }, h("div", { class: "mono muted" }, "Tarefas do lançamento"),
    ...dias.map((d) => bloco(d ? (d === hoje ? "HOJE · " : d < hoje ? "passou · " : "") + rot(d) : "Recorrentes", TAREFAS.map((t, i) => [t, i]).filter(([t]) => t[0] === d).map(([t, i]) => linha(t, i)), d === hoje)),
    bloco("O que falta para lançar", PEND.map((x, i) => item("p" + i, x, "", ""))));
}
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
    tarefas(),
    ...G.map(([t, L]) => h("div", { style: { marginTop: "18px" } },
      h("div", { class: "mono muted", style: { marginBottom: "8px" } }, t),
      h("div", { class: "pfgrid" }, ...L.map(([n, u, o]) => h("div", { class: "pfcard", style: { minWidth: "0", overflow: "hidden" } },
        h("a", { href: u, target: "_blank", rel: "noopener", style: { whiteSpace: "normal", display: "block" } }, h("b", { style: { whiteSpace: "normal" } }, n)),
        o ? h("span", { class: "muted small", style: { whiteSpace: "normal", display: "block", overflow: "visible" } }, o) : null,
        h("span", { class: "mono muted", style: { whiteSpace: "normal", wordBreak: "break-all", display: "block", fontSize: "12px" } }, u.replace(/^https:\/\//, "")),
        h("div", null, h("button", { type: "button", class: "chip", onclick: (e) => copiar(u, e.currentTarget) }, "copiar"))))))),
    h("div", { style: { marginTop: "18px" } }, h("div", { class: "mono muted", style: { marginBottom: "8px" } }, "Ainda sem link"),
      h("ul", { class: "muted small" }, ...FALTA.map((x) => h("li", null, x)))),
    h("p", { class: "muted small", style: { marginTop: "12px" } }, "As legendas e os vídeos ficam no plano de divulgação, que está só no Mac (pasta divulgacao-kit)."));
}
