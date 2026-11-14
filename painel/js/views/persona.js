import { h, fmtDate } from "../util.js";
import { pageHead } from "../ui.js";
import { lineChart } from "./desempenho.js";

// PersonA_: o "Homer Simpson" do @andersonbrito.mp4. Números da API da Meta lidos em 14/11/2026
// (últimos 30 dias + 37 reels com retenção + 100 posts). Seguidores vêm ao vivo de social_stats.
const SNAP = "14/11/2026";
const NS = "http://www.w3.org/2000/svg";
const s = (tag, a, ...k) => { const e = document.createElementNS(NS, tag); Object.entries(a || {}).forEach(([x, v]) => e.setAttribute(x, v)); e.append(...k); return e; };
const n = (v) => v.toLocaleString("pt-BR");

// Avatar ilustrado (desenho próprio, não é foto nem cópia de ator): chapéu de palha, sorriso de canto, celular na mão.
function avatar(feliz) {
  const boca = feliz >= 60 ? "M86 128 Q100 142 116 126" : feliz >= 35 ? "M88 130 Q100 134 114 128" : "M88 134 Q100 126 114 134";
  return s("svg", { viewBox: "0 0 200 220", class: "pz-av", role: "img", "aria-label": "Avatar do João Grilo" },
    s("circle", { cx: 100, cy: 110, r: 96, fill: "var(--accent)", opacity: 0.12 }),
    s("path", { d: "M40 220 Q44 168 100 160 Q156 168 160 220 Z", fill: "#c9b48a" }),
    s("path", { d: "M84 160 L100 184 L116 160", fill: "none", stroke: "#8a7448", "stroke-width": 3 }),
    s("ellipse", { cx: 100, cy: 108, rx: 40, ry: 46, fill: "#c98d5e" }),
    s("ellipse", { cx: 58, cy: 112, rx: 7, ry: 11, fill: "#b97c4e" }), s("ellipse", { cx: 142, cy: 112, rx: 7, ry: 11, fill: "#b97c4e" }),
    s("path", { d: "M30 78 Q100 58 170 78 Q150 88 100 86 Q50 88 30 78 Z", fill: "#d9b45a" }),
    s("path", { d: "M62 80 Q66 34 100 32 Q134 34 138 80 Z", fill: "#e3c46c" }),
    s("path", { d: "M63 70 Q100 62 137 70", stroke: "#9b6b2f", "stroke-width": 6, fill: "none" }),
    s("path", { d: "M76 98 Q84 92 92 98", stroke: "#3a2615", "stroke-width": 3, fill: "none" }),
    s("path", { d: "M108 96 Q116 90 124 96", stroke: "#3a2615", "stroke-width": 3, fill: "none" }),
    s("circle", { cx: 84, cy: 106, r: 4, fill: "#21160c" }), s("circle", { cx: 116, cy: 104, r: 4, fill: "#21160c" }),
    s("path", { d: "M100 108 Q96 120 102 120", stroke: "#8f5a33", "stroke-width": 2.5, fill: "none" }),
    s("path", { d: boca, stroke: "#4a1f10", "stroke-width": 4, fill: "none", "stroke-linecap": "round" }),
    s("rect", { x: 128, y: 168, width: 26, height: 44, rx: 5, fill: "#1b1b1b", stroke: "var(--accent)", "stroke-width": 2 }),
    s("rect", { x: 132, y: 174, width: 18, height: 30, rx: 2, fill: "var(--accent)", opacity: 0.55 }));
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
        h("h2", { class: "pz-nome" }, "João Grilo"),
        h("p", { class: "muted" }, "O nordestino esperto do Auto da Compadecida: tem pouco, se vira com o que tem, ri de tudo, desconfia de quem fala difícil e topa qualquer atalho que dê dinheiro sem precisar de patrão."),
        h("p", null, "Se o João Grilo entender o vídeo em 3 segundos, rir e pensar \"isso eu consigo fazer no meu celular e cobrar\", todo mundo entende. Não é que o público seja ele: é ele que serve de régua."),
        h("div", { class: "pz-feliz" },
          h("b", { class: "pz-num" }, `${FELIZ}`), h("span", { class: "muted" }, "/100"),
          h("div", { class: "stack", style: { gap: "2px" } }, h("b", null, `Felicidade hoje: ${humor}`), h("span", { class: "small muted" }, "ele chega pelo meme, ri, compartilha e vai embora sem seguir nem clicar."))))),

    h("div", { class: "pz-grid" },
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Quem ele é")),
        h("ul", { class: "pz-list panel-body" },
          h("li", null, h("b", null, "Idade e vida: "), "25 a 40 anos, trabalha com o que aparece, já tentou renda extra (revenda, Uber, afiliado)."),
          h("li", null, h("b", null, "Celular: "), "Android, CapCut, rola o feed no ônibus e no intervalo; vê tudo sem som."),
          h("li", null, h("b", null, "O que ele quer: "), "um jeito de ganhar dinheiro com vídeo e IA sem faculdade e sem câmera cara."),
          h("li", null, h("b", null, "O que ele odeia: "), "guru, palavra em inglês, aula longa, \"link na bio\" sem mostrar o resultado."),
          h("li", null, h("b", null, "O que faz ele rir: "), "famoso em situação absurda (Silvio, Neto, Faustão), futebol, a vida do pobre esperto."),
          h("li", null, h("b", null, "O que faz ele confiar: "), "ver o antes e depois, o prompt na tela, o preço real e alguém igual a ele conseguindo."))),
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Como falar com ele")),
        h("ul", { class: "pz-list panel-body" },
          h("li", null, "Primeiros 3 s: famoso ou cena estranha + a promessa em 5 palavras (\"fiz isso com IA em 2 min\")."),
          h("li", null, "Uma ideia por vídeo. Mostrar o como na tela, sem explicar teoria."),
          h("li", null, "Português de conversa: \"bora\", \"olha isso\", nada de \"workflow\" e \"prompt engineering\"."),
          h("li", null, "Sempre um número concreto: tempo, preço, quanto cobrou do cliente."),
          h("li", null, "Fim com próximo passo simples: comentar uma palavra pra receber o kit, não \"segue pra mais\"."),
          h("li", null, "Teste do João Grilo antes de postar: ele entende sem som? ele riria? ele mandaria pro primo?")))),

    h("div", { class: "pz-grid" },
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "O que deixa ele feliz (sinais)")),
        h("div", { class: "panel-body stack" }, ...SINAIS.map((x) => medidor(x.nome, x.atual, x.meta, x.nome.includes("link") ? "" : x.nome.includes("1.000") ? "" : "%")),
          h("p", { class: "small muted" }, "Compartilhamento já passa da meta: ele gosta e manda pros amigos. O que falta é voltar (seguir) e dar o próximo passo (link, comentário, DM)."))),
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Quem viu nos últimos 30 dias")),
        h("div", { class: "panel-body stack" },
          barras([["Não seguidores", 990341, "var(--tx-4, #777)"], ["Seguidores", 5161]]),
          h("p", { class: "small muted" }, "99,5% do alcance (985.938 contas) veio de quem não te segue. O público ainda não está formado: hoje quem te acha é o algoritmo, não o fã.")))),

    h("div", { class: "pz-grid" },
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Curtidas médias por assunto (100 posts)")),
        h("div", { class: "panel-body stack" },
          barras([["Política", 4351, "var(--danger, #ff5c5c)"], ["Futebol", 791], ["IA e tecnologia", 112], ["TV e famosos", 64], ["Outros", 24], ["GTA", 13]]),
          h("p", { class: "small muted" }, "Política puxou o pico (1 reel com 24 mil curtidas), mas é proibida no seu perfil de edição e não vende. Futebol e famosos funcionam como isca; IA é o assunto que vende."))),
      h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Taxa de pulo por assunto (37 reels)")),
        h("div", { class: "panel-body stack" },
          barras([["GTA", 61.7, "var(--danger, #ff5c5c)"], ["Outros", 52.1], ["IA e tecnologia", 46.2], ["Política", 44.6], ["Futebol", 43.5], ["TV e famosos", 42.2, "var(--ok, #3ddc84)"]], (v) => `${String(v).replace(".", ",")}%`),
          h("p", { class: "small muted" }, "Quanto menor, melhor. Famoso no gancho segura mais (Silvio Santos café: 32% de pulo, 265 compartilhamentos). O melhor reel de IA (placa Nvidia) teve 35,6%.")))),

    h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono grow" }, "Seguidores"), ult && h("span", { class: "mono muted" }, `${n(ult.v)} em ${fmtDate(ult.day, false)}`)),
      h("div", { class: "panel-body" }, pts.length > 1 ? lineChart(pts, { goal: 20000 }) : h("p", { class: "empty" }, "Sem dados ainda."),
        h("p", { class: "small muted" }, "Linha tracejada: meta de 20 mil. Subiu de 6,6 mil para 10,3 mil desde 19/10, quase tudo no pico político de 25 a 29/10."))),

    h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Metas para conquistar o João Grilo (próximos 30 dias)")),
      h("ol", { class: "pz-list panel-body" },
        h("li", null, h("b", null, "Um assunto só: "), "IA e edição de vídeo pra ganhar dinheiro. Futebol e famosos entram só como gancho dos 3 primeiros segundos."),
        h("li", null, h("b", null, "Alcance entre seguidores de 0,5% para 5%: "), "série fixa (\"Fiz com IA em 2 min\", episódio 1, 2, 3) pra ele voltar."),
        h("li", null, h("b", null, "Taxa de pulo abaixo de 35%: "), "famoso ou resultado final na abertura, nunca tela de título."),
        h("li", null, h("b", null, "Toques no link de 0 para 300: "), "CTA de comentar palavra e receber o kit no Direct."),
        h("li", null, h("b", null, "Felicidade de "), `${FELIZ} para 70: `, "revisar este painel toda semana com os números novos."))));
}
