import { h } from "../util.js";
import { pageHead, toast } from "../ui.js";

// Influencers: vitrine das contas de personagens de IA. Tudo mora na pasta TIK TOK do disco ANDY 1TB.
// Sem senha aqui (o repositório é público): só o e-mail de login. A senha fica no gerenciador do Anderson.
const PASTA = "/Volumes/ANDY 1TB/TIK TOK";
const REDES = {
  tiktok: { nome: "TikTok", cor: "#25F4EE", icone: "M16 3v10.5a4.5 4.5 0 1 1-4.5-4.5M16 3c.3 2.4 2 4 4.5 4.2" },
  instagram: { nome: "Instagram", cor: "#E1306C", icone: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17.5 6.5h.01" },
  youtube: { nome: "YouTube", cor: "#FF0000", icone: "M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM10 9l5 3-5 3z" },
  x: { nome: "X", cor: "#9CA3AF", icone: "M4 4l16 16M20 4L4 20" },
};
const INFLUENCERS = [
  { nome: "Índia Narah", pasta: "INDIA NARAH", foto: "img/influencers/india-narah.jpg", desc: "Personagem de IA · TikTok Shop (maca peruana, cabelo, descascador)", cor: "#E8452C",
    redes: [{ rede: "tiktok", usuario: "@ind1anarah", url: "https://www.tiktok.com/@ind1anarah", login: "theilmar@gmail.com" }],
    funcao: "Vender no TikTok Shop por comissão (afiliada)." },
  { nome: "Kairos", pasta: "KAIROS", foto: "img/influencers/kairos.jpg", desc: "Cantor gospel de IA", cor: "#C9A227", redes: [{ rede: "instagram", usuario: "@kairoscantor", url: "https://www.instagram.com/kairoscantor/", login: "a cadastrar" }],
    funcao: "Ebook de como criar um influencer de IA (case do próprio Kairos). Conteúdo religioso fica fora de publi." },
  { nome: "Mazzaropi da Fiel", pasta: "MAZZAROPI DA FIEL", foto: "img/influencers/mazzaropi.jpg", desc: "Torcedor corinthiano de IA · humor de futebol", cor: "#9CA3AF", redes: [{ rede: "instagram", usuario: "@mazzaropidafiel", url: "https://www.instagram.com/mazzaropidafiel/", login: "a cadastrar" }],
    funcao: "Ebook de como criar um influencer de IA. Sem publi de bets (proibida no Brasil) e sem produto próprio até ter público." },
  { nome: "O Fofudo", pasta: "FOFUDO", foto: "img/influencers/fofudo.jpg", desc: "Personagem de IA · DJ de bochechas gigantes", cor: "#D4C24A", redes: [{ rede: "instagram", usuario: "@seufofudo", url: "https://www.instagram.com/seufofudo/", login: "a cadastrar" }],
    funcao: "A definir." },
];

const svg = (d, size = 18, cor = "currentColor") => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: cor, "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) s.setAttribute(k, v);
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d); s.append(p);
  return s;
};
// O esquema andersonfinder:// é tratado pelo app local AbrirFinder (Mac do Anderson), que abre a pasta no Finder.
const finder = (sub) => "andersonfinder://open?path=" + encodeURIComponent(sub ? `${PASTA}/${sub}` : PASTA);

export default async function influencers() {
  const copiar = async (t, msg) => { try { await navigator.clipboard.writeText(t); toast(msg); } catch { toast("Não deu para copiar.", { kind: "err" }); } };
  const abrir = (sub, rotulo, extra = "") => h("a", { class: "btn " + extra, href: finder(sub) }, rotulo);

  const card = (i) => h("article", { class: "panel", style: { overflow: "hidden", display: "flex", flexDirection: "column", borderTop: `4px solid ${i.cor}` } },
    h("div", { style: { position: "relative", aspectRatio: "9 / 16", background: "#111" } },
      h("img", { src: i.foto, alt: i.nome, loading: "lazy", style: { width: "100%", height: "100%", objectFit: "cover", display: "block" } }),
      h("div", { style: { position: "absolute", left: 0, right: 0, bottom: 0, padding: "40px 12px 12px", background: "linear-gradient(transparent, rgba(0,0,0,.82))", color: "#fff" } },
        h("div", { style: { fontWeight: 700, fontSize: "18px" } }, i.nome),
        h("div", { class: "flex", style: { gap: "6px", marginTop: "6px" } }, ...i.redes.map((r) => h("span", { title: REDES[r.rede].nome, style: { display: "inline-flex", background: "rgba(0,0,0,.55)", borderRadius: "999px", padding: "5px" } }, svg(REDES[r.rede].icone, 18, REDES[r.rede].cor)))))),
    h("div", { class: "panel-body" },
      h("p", { class: "muted small", style: { margin: "0 0 8px" } }, i.desc),
      i.funcao && h("p", { class: "small", style: { margin: "0 0 10px" } }, h("strong", null, "Função: "), i.funcao),
      !i.redes.length && h("p", { class: "mono small muted", style: { margin: "0 0 10px" } }, "redes: a cadastrar"),
      ...i.redes.map((r) => h("div", { style: { marginBottom: "10px" } },
        h("a", { href: r.url, target: "_blank", rel: "noopener" }, r.usuario, " ↗"),
        h("div", { class: "mono small muted", style: { margin: "4px 0 6px", wordBreak: "break-all" } }, "login: ", r.login),
        h("button", { class: "btn btn-sm", type: "button", onclick: () => copiar(r.login, "Login copiado.") }, "Copiar login"))),
      abrir(i.pasta, "Abrir pasta no Finder", "btn-sm")));

  return h("div", { class: "page" },
    pageHead("Influencers", "vitrine das contas"),
    h("section", { class: "panel", style: { marginBottom: "14px" } },
      h("div", { class: "panel-body flex", style: { gap: "12px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" } },
        h("div", null, h("strong", null, "Pasta TIK TOK"), h("div", { class: "mono small muted" }, PASTA)),
        abrir("", "Abrir no Finder"))),
    h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" } }, ...INFLUENCERS.map(card)));
}
