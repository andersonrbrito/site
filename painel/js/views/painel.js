import { h, todayISO, dayOf, fmtDateTime, TZ } from "../util.js";
import { alertBox } from "../ui.js";
import { goalPanel } from "./postador.js";
import { calendarEmbed } from "./agenda.js";
import { favoritesBar } from "../favorites.js";

// Início: o que importa de cara (meta do X, fila do Postador, Radar, agenda e últimos garimpos).
const k = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + "M" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(".0", "") + "K" : String(n ?? 0));

export default async function inicio({ sb, refresh }) {
  const [postsR, goalR, radarR, minerR, setR] = await Promise.all([
    sb.from("posts").select("id, network, title, body, status, scheduled_at, posted_at, is_viral_bet, created_at").is("archived_at", null).order("created_at", { ascending: false }).limit(200),
    sb.from("x_goal_entries").select("day, verified_followers, impressions_90d").is("archived_at", null).order("day").limit(200),
    sb.from("radar_items").select("kind, done_at").is("archived_at", null).limit(300),
    sb.from("miner_links").select("id, url, platform, collection, note, status, thumbnail_url, saved_at").is("archived_at", null).order("saved_at", { ascending: false }).limit(6),
    sb.from("postador_settings").select("key, value"),
  ]);
  const failed = [postsR, goalR, radarR, minerR].some((r) => r.error);
  const posts = postsR.data || [];
  const settings = { x_daily_limit: 10, ...Object.fromEntries((setR.data || []).map((r) => [r.key, r.value])) };
  const today = todayISO();
  const pending = posts.filter((p) => p.status === "pending");
  const viral = pending.find((p) => p.is_viral_bet);
  const scheduled = posts.filter((p) => p.status === "approved").sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const xToday = posts.filter((p) => p.network === "x" && p.status === "posted" && p.posted_at && dayOf(p.posted_at) === today).length;
  const failedPosts = posts.filter((p) => p.status === "failed").length;
  const radar = radarR.data || [];
  const talk = radar.filter((r) => r.kind === "talk" && !r.done_at).length, follow = radar.filter((r) => r.kind === "follow" && !r.done_at).length;
  const E = goalR.data || [], cur = E[E.length - 1] || { verified_followers: 0, impressions_90d: 0 }, prev = E.length > 1 ? E[E.length - 2] : null;

  const hello = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const hour = Number(new Intl.DateTimeFormat("en", { timeZone: TZ, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const tile = (label, value, href, sub, hot) => h("a", { class: "kpi" + (hot ? " hot" : ""), href }, h("span", { class: "mono" }, label), h("b", null, value), sub && h("span", { class: "muted small" }, sub));
  const bar = (v, max) => h("div", { class: "gbar" }, h("b", { style: { width: `${Math.min(100, (v / max) * 100)}%` } }));
  const delta = (a, b) => (prev ? `${a - b >= 0 ? "+" : ""}${k(a - b)}` : "");
  const first = (p) => p.title || p.body.split("\n").find((l) => l.trim()) || "(sem texto)";

  return h("div", { class: "page inicio" },
    h("div", { class: "page-head" },
      h("div", null, h("div", { class: "mono eyebrow" }, "// ", hello), h("h1", null, `${greet}, Anderson.`)),
      h("div", { class: "flex" }, h("a", { class: "btn btn-sm", href: "#/postador?novo=x" }, "+ Post no X"), h("a", { class: "btn btn-ghost btn-sm", href: "#/miner?novo=1" }, "+ Garimpar"))),
    failed && alertBox("Não foi possível carregar parte dos dados. Atualize a página."),
    await favoritesBar(sb, refresh),

    h("div", { class: "kpis" },
      tile("Para aprovar", pending.length, "#/postador", viral ? "inclui a aposta viral do dia" : "rascunhos do dia", pending.length > 0),
      tile("Agendados", scheduled.length, "#/postador?status=approved", scheduled[0] ? `próximo ${fmtDateTime(scheduled[0].scheduled_at)}` : "nada na fila"),
      tile("X hoje", `${xToday}/${settings.x_daily_limit}`, "#/postador?aba=calendario", failedPosts ? `${failedPosts} com erro` : "posts publicados", failedPosts > 0),
      tile("Radar", talk, "#/postador?aba=radar", `${follow} pra seguir de volta`),
      tile("Garimpo", (minerR.data || []).length ? "→" : "0", "#/miner", "últimos links abaixo")),

    h("div", { class: "igrid" },
      h("div", { class: "stack-lg" },
        goalPanel(cur, prev, bar, delta, null, null, null),
        viral && h("a", { class: "viralcard", href: `#/postador?id=${viral.id}` }, h("span", { class: "pill viral" }, "APOSTA VIRAL DO DIA"), h("b", null, first(viral)), h("span", { class: "mono" }, "Revisar e aprovar →")),
        h("section", { class: "panel" },
          h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Rascunhos para aprovar"), h("a", { class: "mono", href: "#/postador" }, "abrir postador →")),
          h("div", { class: "panel-body" }, pending.length ? h("div", { class: "stack" }, ...pending.slice(0, 6).map((p) => h("a", { class: "irow", href: `#/postador?id=${p.id}` },
            h("span", { class: "netb n-" + p.network }, p.network === "x" ? "X" : "in"), h("span", { class: "truncate grow" }, first(p)), h("span", { class: "mono muted" }, "abrir"))))
            : h("p", { class: "empty" }, "Nada pendente. Os rascunhos chegam todo dia às 7h."))),
        h("section", { class: "panel" },
          h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Últimos garimpos · MineR_"), h("a", { class: "mono", href: "#/miner" }, "ver tudo →")),
          h("div", { class: "panel-body" }, (minerR.data || []).length ? h("div", { class: "minis" }, ...(minerR.data || []).map((l) => h("a", { class: "mini", href: l.url, target: "_blank", rel: "noopener" },
            h("div", { class: "mthumb" }, l.thumbnail_url && h("img", { src: l.thumbnail_url, alt: "", loading: "lazy", referrerpolicy: "no-referrer", onerror: (e) => e.target.remove() }), h("span", { class: "ptag p-" + l.platform }, l.platform === "instagram" ? "IG" : l.platform === "x" ? "X" : "↗")),
            h("span", { class: "truncate small" }, l.note || l.url)))) : h("p", { class: "empty" }, "Nenhum link ainda.")))),
      h("section", { class: "panel" },
        h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Agenda · próximos dias"), h("a", { class: "mono", href: "#/agenda" }, "abrir agenda →")),
        h("div", { class: "panel-body", style: { padding: 0 } }, calendarEmbed("AGENDA", 560)))));
}
