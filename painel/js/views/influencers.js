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
  { nome: "Índia Narah", pasta: "INDIA NARAH", desc: "Personagem de IA · TikTok Shop (maca peruana, cabelo, descascador)", cor: "#E8452C",
    redes: [{ rede: "tiktok", usuario: "@ind1anarah", url: "https://www.tiktok.com/@ind1anarah", login: "theilmar@gmail.com" }] },
];

const svg = (d, size = 18, cor = "currentColor") => {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: cor, "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) s.setAttribute(k, v);
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d); s.append(p);
  return s;
};
// Página web não abre o Finder sozinha: o botão copia o caminho (no Finder: Cmd+Shift+G e colar).
const caminho = (sub) => (sub ? `${PASTA}/${sub}` : PASTA);

export default async function influencers() {
  const copiar = async (t, msg) => { try { await navigator.clipboard.writeText(t); toast(msg); } catch { toast("Não deu para copiar.", { kind: "err" }); } };
  const botaoPasta = (sub, rotulo, extra = "") => h("button", { class: "btn " + extra, type: "button", onclick: () => copiar(caminho(sub), "Caminho copiado. No Finder: Cmd+Shift+G e colar.") }, rotulo);

  return h("div", { class: "page" },
    pageHead("Influencers", "vitrine das contas e das pastas"),
    h("section", { class: "panel", style: { marginBottom: "14px" } },
      h("div", { class: "panel-body flex", style: { gap: "12px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" } },
        h("div", null, h("strong", null, "Pasta TIK TOK"), h("div", { class: "mono small muted" }, PASTA)),
        botaoPasta("", "Copiar caminho da pasta", "btn-primary"))),
    ...INFLUENCERS.map((i) => h("section", { class: "panel", style: { marginBottom: "12px", borderLeft: `4px solid ${i.cor}` } },
      h("div", { class: "panel-head" }, h("h2", null, i.nome), h("span", { class: "muted small" }, i.desc)),
      h("div", { class: "panel-body" },
        ...i.redes.map((r) => { const rd = REDES[r.rede];
          return h("div", { class: "flex", style: { gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "10px" } },
            h("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px", minWidth: "110px" } }, svg(rd.icone, 20, rd.cor), h("strong", null, rd.nome)),
            h("a", { href: r.url, target: "_blank", rel: "noopener" }, r.usuario, " ↗"),
            h("span", { class: "mono small muted" }, "login: ", r.login),
            h("button", { class: "btn btn-sm", type: "button", onclick: () => copiar(r.login, "Login copiado.") }, "Copiar login")); }),
        h("div", { class: "flex", style: { gap: "8px", marginTop: "6px" } }, botaoPasta(i.pasta, "Copiar caminho da pasta de " + i.nome, "btn-sm"))))));
}
