import { h, fmtDate } from "../util.js";
import { pageHead, alertBox, toast } from "../ui.js";
import { insightsView } from "./postador.js";

// Desempenho: evolução diária do X e do Instagram (preenchido pela rotina das 5h).
const k = (n) => (n == null ? "–" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "").replace(".", ",") + " mi" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(".0", "").replace(".", ",") + " mil" : String(n));
const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([a, v]) => e.setAttribute(a, v)); return e; };

// Linha simples com área, pontos e linha de meta opcional.
export function lineChart(points, { goal, height = 170, color = "var(--accent)" } = {}) {
  const W = 600, H = height, P = { l: 8, r: 8, t: 14, b: 22 };
  const s = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "lchart", preserveAspectRatio: "none", role: "img" });
  if (!points.length) return h("p", { class: "empty" }, "Sem dados ainda. A coleta roda todo dia de manhã.");
  const vals = points.map((p) => p.v), max = Math.max(goal || 0, ...vals) * 1.08 || 1, min = Math.min(...vals, goal ?? Infinity) * 0.92;
  const lo = goal ? Math.min(min, 0) : min;
  const x = (i) => P.l + (points.length === 1 ? (W - P.l - P.r) / 2 : (i / (points.length - 1)) * (W - P.l - P.r));
  const y = (v) => P.t + (1 - (v - lo) / (max - lo || 1)) * (H - P.t - P.b);
  if (goal) { s.append(svgEl("line", { x1: P.l, x2: W - P.r, y1: y(goal), y2: y(goal), stroke: "var(--tx-4)", "stroke-dasharray": "4 4", "stroke-width": 1 })); }
  // Curva suave (bezier horizontal entre os pontos), como no Otto.
  const d = points.map((p, i) => {
    if (!i) return `M${x(0).toFixed(1)},${y(p.v).toFixed(1)}`;
    const mx = ((x(i - 1) + x(i)) / 2).toFixed(1);
    return `C${mx},${y(points[i - 1].v).toFixed(1)} ${mx},${y(p.v).toFixed(1)} ${x(i).toFixed(1)},${y(p.v).toFixed(1)}`;
  }).join(" ");
  s.append(svgEl("path", { d: `${d} L${x(points.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z`, fill: color, opacity: 0.12 }));
  s.append(svgEl("path", { d, fill: "none", stroke: color, "stroke-width": 2.2, "vector-effect": "non-scaling-stroke" }));
  points.forEach((p, i) => { const c = svgEl("circle", { cx: x(i), cy: y(p.v), r: 3, fill: color }); const t = svgEl("title", {}); t.textContent = `${fmtDate(p.day, false)}: ${p.v.toLocaleString("pt-BR")}`; c.append(t); s.append(c); });
  const first = svgEl("text", { x: P.l, y: H - 6, fill: "var(--tx-4)", "font-size": 11 }); first.textContent = fmtDate(points[0].day, false);
  const last = svgEl("text", { x: W - P.r, y: H - 6, fill: "var(--tx-4)", "font-size": 11, "text-anchor": "end" }); last.textContent = fmtDate(points[points.length - 1].day, false);
  s.append(first, last);
  return s;
}

// Relatórios em texto que o Claude escreve depois de cada coleta (tabela reports).
const REPORT_TITLE = { insights: "Relatório diário do X", desempenho: "Relatório diário do Instagram", instagram: "Insights do Instagram · últimos 30 dias" };
// Códigos de Reel (ex.: DebwXDCBKZp) viram link "Reel ↗" em vez de aparecer soltos no texto.
const reportBody = (text, media = {}) => {
  const out = []; let last = 0;
  for (const m of text.matchAll(/\b(?=[A-Za-z0-9_-]{11}\b)(?=[A-Za-z0-9_-]*[A-Z])(?=[A-Za-z0-9_-]*[a-z])[A-Za-z0-9_-]{11}\b/g)) {
    out.push(text.slice(last, m.index), h("a", { href: `https://www.instagram.com/reel/${m[0]}/`, target: "_blank", rel: "noopener" }, media[m[0]] ? `"${reelName(media[m[0]], m[0])}" ↗` : "Reel ↗"));
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
};
export async function reportBox(sb, kind, media = {}) {
  const { data } = await sb.from("reports").select("body, created_at").eq("kind", kind).is("archived_at", null).order("created_at", { ascending: false }).limit(1);
  const r = (data || [])[0];
  return h("section", { class: "panel", style: { marginBottom: "20px" } },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: kind === "insights" ? "var(--accent)" : "#dd2a7b" } }), h("h2", { class: "mono grow" }, REPORT_TITLE[kind]), r && h("span", { class: "mono muted" }, fmtDate(r.created_at.slice(0, 10), false))),
    h("div", { class: "panel-body" }, r ? h("p", { class: "report" }, ...reportBody(r.body, media)) : h("p", { class: "empty" }, kind === "instagram" ? "Clique em Atualizar insights do Instagram para gerar o primeiro." : "Aparece aqui depois da próxima coleta (5h).")));
}

const card = (title, value, sub, chart) => h("section", { class: "panel" },
  h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, title)),
  h("div", { class: "panel-body" }, h("div", { class: "dnum" }, h("b", null, value), sub && h("span", { class: "muted small" }, sub)), chart));

const delta = (series) => {
  if (series.length < 2) return "primeiro registro";
  const a = series[series.length - 2].v, b = series[series.length - 1].v, d = b - a;
  return `${d >= 0 ? "+" : ""}${d.toLocaleString("pt-BR")} desde ${fmtDate(series[series.length - 2].day, false)}`;
};

export default async function desempenho({ sb, refresh, query, go }) {
  const aba = query?.aba === "instagram" ? "instagram" : "x";
  const tabs = h("div", { class: "qnav dtabs" },
    h("a", { href: "#/desempenho", class: aba === "x" ? "on" : "" }, "X · @andersbrito"),
    h("a", { href: "#/desempenho?aba=instagram", class: aba === "instagram" ? "on" : "" }, "Instagram · @andersonbrito.mp4"));
  const statsR = await sb.from("social_stats").select("day, platform, followers, following, posts, data").is("archived_at", null).order("day").limit(800);
  if (statsR.error) return h("div", { class: "page" }, pageHead("Desempenho", "X e Instagram"), alertBox("Não foi possível carregar os dados."));
  const stats = statsR.data || [];
  const ser = (platform, f) => stats.filter((s) => s.platform === platform).map((s) => ({ day: s.day, v: f(s) })).filter((p) => p.v != null);
  const lastOf = (a) => (a.length ? a[a.length - 1].v : null);

  if (aba === "x") {
    const xVer = ser("x", (s) => s.data?.verified_followers ?? null), xImp = ser("x", (s) => s.data?.impressions_90d ?? null), xFol = ser("x", (s) => s.followers);
    return h("div", { class: "page desempenho" },
      pageHead("Desempenho", "X e Instagram · atualizado toda manhã"), tabs,
      await xOrigem(sb),
      await insightsView(sb, refresh),
      h("div", { class: "dgrid" },
        card("Seguidores verificados (meta 500)", k(lastOf(xVer)), delta(xVer), lineChart(xVer, { goal: 500 })),
        card("Impressões verificadas · 90 dias (meta 500 mil)", k(lastOf(xImp)), delta(xImp), lineChart(xImp, { goal: 500000 })),
        card("Seguidores no total", k(lastOf(xFol)), delta(xFol), lineChart(xFol))));
  }

  const [reelsR, mediaR] = await Promise.all([
    sb.from("reel_stats").select("day, shortcode, views, thumbnail_url").is("archived_at", null).order("day").limit(3000),
    sb.from("ig_media").select("shortcode, caption, thumbnail, posted_at, likes, comments").limit(200),
  ]);
  const media = Object.fromEntries((mediaR.data || []).map((m) => [m.shortcode, m]));
  const igFol = ser("instagram", (s) => s.followers), igPosts = ser("instagram", (s) => s.posts);
  // Reels: últimos 12 do dia mais recente, com crescimento desde a primeira medição de cada um
  const reels = reelsR.data || [];
  const lastDay = reels.length ? reels[reels.length - 1].day : null;
  const latest = reels.filter((r) => r.day === lastDay);
  const hist = (code) => reels.filter((r) => r.shortcode === code).map((r) => ({ day: r.day, v: r.views }));
  const maxV = Math.max(1, ...latest.map((r) => r.views || 0));
  const totalViews = latest.reduce((n, r) => n + (r.views || 0), 0);
  const reelRow = (r) => {
    const hs = hist(r.shortcode), grow = hs.length > 1 ? r.views - hs[0].v : null, m = media[r.shortcode];
    return h("a", { class: "reelrow", href: `https://www.instagram.com/reel/${r.shortcode}/`, target: "_blank", rel: "noopener", title: m?.caption || "" },
      m?.thumbnail ? h("img", { class: "rthumb", src: m.thumbnail, alt: "", loading: "lazy", referrerpolicy: "no-referrer", onerror: (e) => e.target.remove() }) : h("span", { class: "rthumb" }),
      h("span", { class: "rc truncate" }, reelName(m, r.shortcode)),
      h("span", { class: "rbarw" }, h("i", { style: { width: `${Math.max(2, (r.views / maxV) * 100)}%` } })),
      h("b", null, k(r.views)),
      h("span", { class: "mono " + (grow > 0 ? "up" : "muted") }, grow == null ? "novo" : `${grow >= 0 ? "+" : ""}${k(grow)}`));
  };
  return h("div", { class: "page desempenho" },
    pageHead("Desempenho", "X e Instagram · atualizado toda manhã"), tabs,
    await reportBox(sb, "desempenho", media),
    await igInsights(sb, refresh, media),
    h("div", { class: "dgrid" },
      card("Seguidores", k(lastOf(igFol)), delta(igFol), lineChart(igFol, { color: "#dd2a7b" })),
      card("Posts", k(lastOf(igPosts)), delta(igPosts), lineChart(igPosts, { color: "#dd2a7b" }))),
    h("section", { class: "panel", style: { marginTop: "20px" } },
      h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "#dd2a7b" } }), h("h2", { class: "mono grow" }, "Últimos 12 Reels"), h("span", { class: "mono" }, lastDay ? fmtDate(lastDay, false) : "")),
      h("div", { class: "panel-body" },
        latest.length ? [h("div", { class: "dnum" }, h("b", null, k(totalViews)), h("span", { class: "muted small" }, "views somadas · crescimento desde a 1ª medição")), h("div", { class: "reels" }, ...latest.map(reelRow))]
          : h("p", { class: "empty" }, "Sem dados ainda."))),
    h("p", { class: "muted small" }, "O Instagram mostra views arredondadas (ex.: 13,8 mil), então pequenas variações podem não aparecer."));
}

// Nome do Reel: primeira linha da legenda (sem hashtags); sem legenda, a data do post.
export function reelName(m, code) {
  const cap = (m?.caption || "").split("\n").map((l) => l.replace(/#[\p{L}\d_]+/gu, "").trim()).find(Boolean);
  if (cap) return cap.length > 70 ? cap.slice(0, 68) + "…" : cap;
  return m?.posted_at ? `Reel de ${fmtDate(m.posted_at.slice(0, 10), false)}` : "Reel";
}

// Insights do Instagram (últimos 30 dias): o painel não consegue ler o Instagram, então o botão
// deixa um pedido e a rotina do Claude (de hora em hora, 5h às 22h) abre o Instagram, lê e resume.
async function igInsights(sb, refresh, media = {}) {
  const { data } = await sb.from("claude_requests").select("id, status, created_at, done_at").eq("kind", "ig_insights").is("archived_at", null).order("created_at", { ascending: false }).limit(1);
  const last = (data || [])[0], open = last && ["aberto", "gerando"].includes(last.status);
  const ask = async (e) => {
    e.currentTarget.disabled = true;
    const { error } = await sb.from("claude_requests").insert({ kind: "ig_insights" });
    if (error) { e.currentTarget.disabled = false; return toast("Não foi possível pedir.", { kind: "err" }); }
    toast("Pedido feito. O Claude atualiza na próxima rodada (até 1 hora)."); refresh();
  };
  return h("div", null,
    h("div", { class: "flex", style: { marginBottom: "10px" } },
      h("p", { class: "muted small grow" }, open ? `Pedido feito em ${fmtDate(last.created_at.slice(0, 10), false)}: o Claude está lendo os insights dos últimos 30 dias (sai em até 1 hora).`
        : "Resumo detalhado dos insights do Instagram (últimos 30 dias): alcance, visualizações, interações, seguidores, melhores conteúdos e sugestões."),
      h("button", { class: "btn btn-sm", type: "button", disabled: open, onclick: ask }, open ? "Atualizando…" : "Atualizar insights do Instagram")),
    await reportBox(sb, "instagram", media));
}

// X: o que saiu pelo PostadoR_ x o que ele postou à mão, e a soma (últimos 7 dias e hoje).
// x_posts vem da coleta das 5h40 (inclui tudo que está no perfil); o que é do PostadoR_ tem o link salvo em posts.external_url.
export async function xOrigem(sb) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const [xpR, poR] = await Promise.all([
    sb.from("x_posts").select("id, created_at, impressions, likes, replies, reposts").gte("created_at", since).limit(1000),
    sb.from("posts").select("external_url, posted_at").eq("network", "x").eq("status", "posted").gte("posted_at", since).limit(500),
  ]);
  const xp = xpR.data || [], ids = new Set((poR.data || []).map((p) => (p.external_url || "").split("/").pop()).filter(Boolean));
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const dia = (ts) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(ts));
  const grupo = (f) => { const l = xp.filter(f); return { n: l.length, imp: l.reduce((s, t) => s + (t.impressions || 0), 0), eng: l.reduce((s, t) => s + (t.likes || 0) + (t.replies || 0) + (t.reposts || 0), 0) }; };
  const auto = grupo((t) => ids.has(t.id)), manual = grupo((t) => !ids.has(t.id)), total = grupo(() => true);
  const hojeAuto = (poR.data || []).filter((p) => dia(p.posted_at) === hoje).length;
  const col = (label, g, extra) => h("div", { class: "xorig" }, h("span", { class: "mono" }, label), h("b", null, String(g.n)), h("span", { class: "muted small" }, `posts · ${k(g.imp)} impressões · ${k(g.eng)} interações`), extra && h("span", { class: "muted small" }, extra));
  return h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "X · PostadoR_ x manual (últimos 7 dias)")),
    h("div", { class: "panel-body" },
      h("div", { class: "xorig3" }, col("PELO POSTADOR_", auto, `hoje: ${hojeAuto}`), col("MANUAL", manual), col("TOTAL", total)),
      h("p", { class: "muted small", style: { marginTop: "8px" } }, "Contagem dos posts do perfil (sem respostas). O manual de hoje entra depois da coleta das 5h40.")));
}
