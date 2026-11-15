import { h, fmtDate } from "../util.js";
import { pageHead } from "../ui.js";
import { lineChart } from "./desempenho.js";

// PersonA_: o "Homer Simpson" do @andersonbrito.mp4. Números da API da Meta lidos em 14/11/2026
// (últimos 30 dias + 37 reels com retenção + 100 posts). Seguidores vêm ao vivo de social_stats.
const SNAP = "14/11/2026";
const NS = "http://www.w3.org/2000/svg";
const s = (tag, a, ...k) => { const e = document.createElementNS(NS, tag); Object.entries(a || {}).forEach(([x, v]) => e.setAttribute(x, v)); e.append(...k); return e; };
const n = (v) => v.toLocaleString("pt-BR");

// Avatar em traço minimalista: gerente de escritório, cabelo curto de lado, camisa e gravata.
function avatar(feliz) {
  const L = { fill: "none", stroke: "var(--tx-1, #eaeaea)", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" };
  const boca = feliz >= 60 ? "M86 112 Q101 124 116 112" : feliz >= 35 ? "M88 114 Q101 118 114 113" : "M88 118 Q101 111 114 118";
  return s("svg", { viewBox: "0 0 200 220", class: "pz-av", role: "img", "aria-label": "Avatar da persona" },
    s("circle", { cx: 100, cy: 108, r: 96, fill: "var(--accent)", opacity: 0.08 }),
    s("path", { ...L, d: "M68 72 Q70 38 104 36 Q136 38 134 70 Q118 56 98 58 Q80 58 68 72" }),
    s("path", { ...L, d: "M68 68 Q64 104 80 120 Q98 136 120 122 Q138 106 134 68" }),
    s("path", { ...L, d: "M82 84 L95 82 M107 82 L120 84", "stroke-width": 3.5 }),
    s("circle", { cx: 89, cy: 92, r: 2.5, fill: "var(--tx-1, #eaeaea)" }), s("circle", { cx: 113, cy: 92, r: 2.5, fill: "var(--tx-1, #eaeaea)" }),
    s("path", { ...L, d: "M101 92 Q97 103 104 104" }),
    s("path", { ...L, d: boca }),
    s("path", { ...L, d: "M88 130 L88 146 M116 128 L116 146" }),
    s("path", { ...L, d: "M40 214 Q42 162 88 146 L102 160 L116 146 Q160 162 162 214" }),
    s("path", { d: "M97 160 L102 154 L107 160 L104 204 L102 208 L100 204 Z", fill: "var(--accent)" }),
    s("path", { ...L, d: "M134 186 h18 v16 h-18 z M152 190 q8 0 8 6 q0 6 -8 6", stroke: "var(--accent)" }));
}

// Barras horizontais simples
const barras = (rows, fmt = n) => {
  const max = Math.max(...rows.map((r) => r[1]));
  return h("div", { class: "pz-bars" }, ...rows.map(([nome, v, cor]) => h("div", { class: "pz-bar" },
    h("span", { class: "small" }, nome),
    h("div", { class: "pz-track" }, h("span", { style: { width: `${Math.max(2, (v / max) * 100)}%`, background: cor || "var(--accent)" } })),
    h("b", { class: "mono small" }, fmt(v)))));
};

const medidor = (rotulo, atual, meta, unid = "%", menorMelhor = false) => {
  const pct = Math.max(0, Math.min(100, menorMelhor ? (meta / atual) * 100 : (atual / meta) * 100));
  return h("div", { class: "pz-meta" },
    h("div", { class: "flex", style: { justifyContent: "space-between", gap: "8px" } }, h("span", { class: "small" }, rotulo), h("span", { class: "mono small" }, `${String(atual).replace(".", ",")}${unid} → meta ${String(meta).replace(".", ",")}${unid}`)),
    h("div", { class: "pz-track" }, h("span", { style: { width: `${pct}%`, background: pct >= 80 ? "var(--ok, #3ddc84)" : pct >= 40 ? "var(--warn, #f0b429)" : "var(--danger, #ff5c5c)" } })));
};

// Felicidade: média de 4 sinais (0 a 100), cada um comparado à meta.
const SINAIS = [
  { nome: "Volta pra ver de novo (alcance entre seguidores)", atual: 0.5, meta: 5 },
  { nome: "Assiste até o fim (1 menos taxa de pulo)", atual: 55, meta: 70 },
  { nome: "Manda pros amigos (compart. a cada 1.000 views)", atual: 53, meta: 40 },
  { nome: "Dá o próximo passo (toques no link)", atual: 0, meta: 300 },
];
const FELIZ = Math.round(SINAIS.reduce((t, x) => t + Math.min(1, x.atual / x.meta), 0) / SINAIS.length * 100);

export default async function persona({ sb }) {
  const { data: st } = await sb.from("social_stats").select("day, followers").eq("platform", "instagram").is("archived_at", null).order("day").limit(400);
  const pts = (st || []).filter((r) => r.followers != null).map((r) => ({ day: r.day, v: r.followers }));
  const ult = pts.at(-1);

  const humor = FELIZ >= 60 ? "feliz" : FELIZ >= 35 ? "desconfiado" : "entediado";
  return h("div", { class: "page persona wide stack-lg" },
    pageHead("PersonA_", `@andersonbrito.mp4 · dados da Meta de ${SNAP}`),

    h("section", { class: "panel pz-hero" },
      avatar(FELIZ),
      h("div", { class: "stack" },
        h("span", { class: "chip accent" }, "persona do público"),
        h("h2", { class: "pz-nome" }, "Michael Scott"),
        h("p", { class: "muted" }, "O gerente de vendas de The Office: tem verba, tem meta pra bater e precisa aparecer bem pro chefe. Quer vídeo que venda, que impressione e que seja fácil de aprovar. Representa quem te contrata: infoprodutor, agência, empresa e o editor que quer ganhar mais."),
        h("p", null, "Se o Michael Scott olhar o vídeo e pensar \"isso vai me trazer cliente, quanto custa?\", o vídeo está certo. Não é quem te segue hoje: é quem você quer que te pague."),
        h("div", { class: "pz-feliz" },
          h("b", { class: "pz-num" }, `${FELIZ}`), h("span", { class: "muted" }, "/100"),
          h("div", { class: "stack", style: { gap: "2px" } }, h("b", null, `Felicidade hoje: ${humor}. `), h("span", { class: "small muted" }, "hoje quem chega é público de meme. Ele ainda não te achou."))))),

    h("div", { class: "pz-grid" },
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Quem ele é")),
        h("ul", { class: "pz-list panel-body" },
          h("li", null, h("b", null, "Idade e vida: "), "infoprodutor que lança, agência que terceiriza edição, empresa que anuncia e editor que quer cobrar mais com IA."),
          h("li", null, h("b", null, "Celular: "), "vê o feed entre uma tarefa e outra, sem som; decide rápido se vale o tempo."),
          h("li", null, h("b", null, "O que ele quer: "), "vídeo que vende (VSL, criativo de anúncio, reels de marca) entregue rápido, e saber usar IA pra gastar menos."),
          h("li", null, h("b", null, "O que ele odeia: "), "pagar e não ter retorno, prazo furado, amadorismo e conversa sem número."),
          h("li", null, h("b", null, "O que chama a atenção: "), "antes e depois de criativo, bastidor de campanha, quanto custou e quanto vendeu."),
          h("li", null, h("b", null, "O que faz ele confiar: "), "portfólio com resultado, preço claro, processo organizado e você mostrando o como."))),
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Como falar com ele")),
        h("ul", { class: "pz-list panel-body" },
          h("li", null, "Primeiros 3 s: o resultado final ou o número logo de cara (\"esse anúncio fez R$ 51 mil\")."),
          h("li", null, "Uma ideia por vídeo: o problema e como o vídeo resolveu."),
          h("li", null, "Tom direto e humilde, sem jargão de editor."),
          h("li", null, "Sempre um número: venda, custo cortado, prazo, tempo economizado com IA."),
          h("li", null, "Fim com próximo passo: \"quer um desse? me chama no Direct\" ou o kit pra quem edita."),
          h("li", null, "Teste do Michael Scott antes de postar: ele vê dinheiro nisso? entende sem som? chamaria no Direct?")))),

    h("div", { class: "pz-grid" },
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "O que deixa ele feliz (sinais)")),
        h("div", { class: "panel-body stack" }, ...SINAIS.map((x) => medidor(x.nome, x.atual, x.meta, x.nome.includes("link") ? "" : x.nome.includes("1.000") ? "" : "%")),
          h("p", { class: "small muted" }, "O compartilhamento alto vem do público de meme. Pro Michael Scott o que conta: seguir, voltar e chamar no Direct."))),
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Quem viu nos últimos 30 dias")),
        h("div", { class: "panel-body stack" },
          barras([["Não seguidores", 990341, "var(--tx-4, #777)"], ["Seguidores", 5161]]),
          h("p", { class: "small muted" }, "99,5% do alcance (985.938 contas) veio de quem não te segue. O público ainda não está formado: hoje quem te acha é o algoritmo, não o fã.")))),

    h("div", { class: "pz-grid" },
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Quem te segue hoje: mulheres por idade")),
        h("div", { class: "panel-body stack" },
          barras([["Mulheres 25-34", 8.1], ["Mulheres 35-44", 10.2], ["Mulheres 45-54", 15.3, "var(--accent)"], ["Mulheres 55-64", 13.8], ["Mulheres 65+", 12.3]], (v) => `${String(v).replace(".", ",")}%`),
          h("p", { class: "small muted" }, "61,4% mulheres, 38,6% homens. Mulheres de 35 anos ou mais somam 51,6%. Esse ainda não é o público que compra."))),
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Quem te segue hoje: homens por idade")),
        h("div", { class: "panel-body stack" },
          barras([["Homens 18-24", 2.7], ["Homens 25-34", 9.3], ["Homens 35-44", 10.6], ["Homens 45-54", 8.7], ["Homens 55-64", 4.6]], (v) => `${String(v).replace(".", ",")}%`),
          h("p", { class: "small muted" }, "Cidades: São Paulo 9,6%, Rio 3,4%, BH 1,4%, Fortaleza 1,3%. Brasil 88,6%. Fonte: Meta Business Suite, 15/11.")))),

    h("div", { class: "pz-grid" },
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Curtidas médias por assunto (100 posts)")),
        h("div", { class: "panel-body stack" },
          barras([["Política", 4351, "var(--danger, #ff5c5c)"], ["Futebol", 791], ["IA e tecnologia", 112], ["TV e famosos", 64], ["Outros", 24], ["GTA", 13]]),
          h("p", { class: "small muted" }, "Política e futebol trazem curtida de quem não compra. Pro Michael Scott contam IA e cases de vídeo, mesmo com menos curtidas."))),
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Taxa de pulo por assunto (37 reels)")),
        h("div", { class: "panel-body stack" },
          barras([["GTA", 61.7, "var(--danger, #ff5c5c)"], ["Outros", 52.1], ["IA e tecnologia", 46.2], ["Política", 44.6], ["Futebol", 43.5], ["TV e famosos", 42.2, "var(--ok, #3ddc84)"]], (v) => `${String(v).replace(".", ",")}%`),
          h("p", { class: "small muted" }, "Quanto menor, melhor. Famoso no gancho segura mais (Silvio Santos café: 32% de pulo, 265 compartilhamentos). O melhor reel de IA (placa Nvidia) teve 35,6%.")))),

    h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono grow" }, "Seguidores"), ult && h("span", { class: "mono muted" }, `${n(ult.v)} em ${fmtDate(ult.day, false)}`)),
      h("div", { class: "panel-body" }, pts.length > 1 ? lineChart(pts, { goal: 20000 }) : h("p", { class: "empty" }, "Sem dados ainda."),
        h("p", { class: "small muted" }, "Linha tracejada: meta de 20 mil. Subiu de 6,6 mil para 10,3 mil desde 19/10, quase tudo no pico político de 25 a 29/10."))),

    h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Metas para conquistar o Michael Scott (próximos 30 dias)")),
      h("ol", { class: "pz-list panel-body" },
        h("li", null, h("b", null, "Um assunto só: "), "vídeo e IA que vendem. Meme, futebol e política ficam nos outros perfis."),
        h("li", null, h("b", null, "Alcance entre seguidores de 0,5% para 5%: "), "série fixa (\"Criativo que vendeu\", ep. 1, 2, 3) pra ele voltar."),
        h("li", null, h("b", null, "Taxa de pulo abaixo de 35%: "), "resultado final ou número na abertura, nunca tela de título."),
        h("li", null, h("b", null, "Toques no link de 0 para 300: "), "convite pro Direct em todo vídeo de trabalho feito."),
        h("li", null, h("b", null, "Felicidade de "), `${FELIZ} para 70: `, "revisar este painel toda semana com os números novos."))));
}
