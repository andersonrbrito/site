import { h } from "../util.js";
import { pageHead, toast } from "../ui.js";

// Afiliações: links de indicação prontos para copiar, com atalho para o painel de cada programa.
const AFILIADOS = [
  { nome: "Higgsfield", desc: "Imagem e vídeo com IA", link: "https://higgsfield.ai?fpr=anderson-91441d" },
  { nome: "Otto", desc: "Rascunho e publicação no X, LinkedIn e Threads", link: "https://otto.doti.gg/r/01a18caedc21766d8a697836e4b8a8a8", painel: "https://otto.doti.gg/affiliates" },
  { nome: "Magnific", desc: "Imagem, vídeo e voz com IA (Seedream 5 Pro, Kling, ElevenLabs)", link: "https://referral.magnific.com/mzZgkW9", cupom: "GMRPOCT52142" },
  { nome: "Real Oficial", desc: "Indicação Real Oficial", link: "https://realoficial.com.br?ref=anderson-483bc4", painel: "https://realoficial.firstpromoter.com/home" },
];

export default async function afiliacoes() {
  const copiar = async (t) => { try { await navigator.clipboard.writeText(t); toast("Link copiado."); } catch { toast("Não deu para copiar.", { kind: "err" }); } };
  return h("div", { class: "page" },
    pageHead("Afiliações", "links de indicação prontos para copiar"),
    ...AFILIADOS.map((a) => h("section", { class: "panel", style: { marginBottom: "12px" } },
      h("div", { class: "panel-head" }, h("h2", null, a.nome), h("span", { class: "muted small" }, a.desc)),
      h("div", { class: "panel-body" },
        h("p", { class: "mono small", style: { wordBreak: "break-all", margin: "0 0 10px" } }, a.link),
        h("div", { class: "flex", style: { gap: "8px" } },
          h("button", { class: "btn btn-sm", type: "button", onclick: () => copiar(a.link) }, "Copiar link"),
          a.cupom && h("button", { class: "btn btn-sm", type: "button", onclick: () => copiar(a.cupom) }, `Copiar cupom ${a.cupom}`),
          a.painel && h("a", { class: "btn btn-sm", href: a.painel, target: "_blank", rel: "noopener" }, "Abrir dashboard ↗"))))));
}
