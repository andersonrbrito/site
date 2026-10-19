import { h, fmtDate } from "../util.js";
import { pageHead, alertBox } from "../ui.js";

// Desempenho: evolução diária do X e do Instagram (preenchido pela rotina das 7h).
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

const card = (title, value, sub, chart) => h("section", { class: "panel" },
  h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, title)),
  h("div", { class: "panel-body" }, h("div", { class: "dnum" }, h("b", null, value), sub && h("span", { class: "muted small" }, sub)), chart));

const delta = (series) => {
  if (series.length < 2) return "primeiro registro";
  const a = series[series.length - 2].v, b = series[series.length - 1].v, d = b - a;
  return `${d >= 0 ? "+" : ""}${d.toLocaleString("pt-BR")} desde ${fmtDate(series[series.length - 2].day, false)}`;
};

export default async function desempenho({ sb }) {
  const [statsR, reelsR] = await Promise.all([
    sb.from("social_stats").select("day, platform, followers, following, posts, data").is("archived_at", null).order("day").limit(800),
    sb.from("reel_stats").select("day, shortcode, views, thumbnail_url").is("archived_at", null).order("day").limit(3000),
  ]);
  if (statsR.error || reelsR.error) return h("div", { class: "page" }, pageHead("Desempenho", "X e Instagram"), alertBox("Não foi possível carregar os dados."));
  const stats = statsR.data || [];
  const ser = (platform, f) => stats.filter((s) => s.platform === platform).map((s) => ({ day: s.day, v: f(s) })).filter((p) => p.v != null);
  const xVer = ser("x", (s) => s.data?.verified_followers ?? null), xImp = ser("x", (s) => s.data?.impressions_90d ?? null);
  const xFol = ser("x", (s) => s.followers), igFol = ser("instagram", (s) => s.followers), igPosts = ser("instagram", (s) => s.posts);
  const lastOf = (a) => (a.length ? a[a.length - 1].v : null);

  // Reels: últimos 12 do dia mais recente, com crescimento desde a primeira medição de cada um
  const reels = reelsR.data || [];
  const lastDay = reels.length ? reels[reels.length - 1].day : null;
  const latest = reels.filter((r) => r.day === lastDay);
  const hist = (code) => reels.filter((r) => r.shortcode === code).map((r) => ({ day: r.day, v: r.views }));
  const maxV = Math.max(1, ...latest.map((r) => r.views || 0));
  const totalViews = latest.reduce((n, r) => n + (r.views || 0), 0);
  const reelRow = (r) => {
    const hs = hist(r.shortcode), grow = hs.length > 1 ? r.views - hs[0].v : null;
    return h("a", { class: "reelrow", href: `https://www.instagram.com/reel/${r.shortcode}/`, target: "_blank", rel: "noopener" },
      h("span", { class: "mono rc" }, r.shortcode),
      h("span", { class: "rbarw" }, h("i", { style: { width: `${Math.max(2, (r.views / maxV) * 100)}%` } })),
      h("b", null, k(r.views)),
      h("span", { class: "mono " + (grow > 0 ? "up" : "muted") }, grow == null ? "novo" : `${grow >= 0 ? "+" : ""}${k(grow)}`));
  };

  return h("div", { class: "page desempenho" },
    pageHead("Desempenho", "X e Instagram · atualizado toda manhã"),
    h("h2", { class: "dsec" }, "X · @andersbrito"),
    h("div", { class: "dgrid" },
      card("Seguidores verificados (meta 500)", k(lastOf(xVer)), delta(xVer), lineChart(xVer, { goal: 500 })),
      card("Impressões verificadas · 90 dias (meta 500 mil)", k(lastOf(xImp)), delta(xImp), lineChart(xImp, { goal: 500000 })),
      card("Seguidores no total", k(lastOf(xFol)), delta(xFol), lineChart(xFol))),
    h("h2", { class: "dsec" }, "Instagram · @andersonbrito.mp4"),
    h("div", { class: "dgrid" },
      card("Seguidores", k(lastOf(igFol)), delta(igFol), lineChart(igFol, { color: "#dd2a7b" })),
      card("Posts", k(lastOf(igPosts)), delta(igPosts), lineChart(igPosts, { color: "#dd2a7b" })),
      h("section", { class: "panel" },
        h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "#dd2a7b" } }), h("h2", { class: "mono grow" }, "Últimos 12 Reels"), h("span", { class: "mono" }, lastDay ? fmtDate(lastDay, false) : "")),
        h("div", { class: "panel-body" },
          latest.length ? [h("div", { class: "dnum" }, h("b", null, k(totalViews)), h("span", { class: "muted small" }, "views somadas · crescimento desde a 1ª medição")), h("div", { class: "reels" }, ...latest.map(reelRow))]
            : h("p", { class: "empty" }, "Sem dados ainda.")))),
    h("p", { class: "muted small" }, "O Instagram mostra views arredondadas (ex.: 13,8 mil), então pequenas variações podem não aparecer."));
}
