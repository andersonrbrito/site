import { h, todayISO, dayOf, fmtDateTime, fmtDate, TZ } from "../util.js";
import { alertBox, hideable, toast } from "../ui.js";
import { goalPanel } from "./postador.js";
import { calendarEmbed } from "./agenda.js";
import { xOrigem } from "./desempenho.js";
import { favoritesBar } from "../favorites.js";
import { QUICK, META_SCHEDULER, iconLink, favicon } from "../links.js";

// Apelido do dia: muda todo dia (mesmo apelido o dia inteiro).
const APELIDOS = ["mestre", "chefe", "lenda", "gênio", "craque", "monstro", "meu rei", "patrão", "campeão", "maestro", "comandante", "mito", "fera", "professor", "artista", "visionário", "diretor", "capitão", "mago da timeline", "brabo", "pai", "guerreiro", "sensei", "titã", "parceiro", "ídolo", "chefão", "rei do corte", "craque da IA", "o cara"];
const apelidoDoDia = () => { const d = todayISO(); const n = Number(d.replaceAll("-", "")); return APELIDOS[(n * 7) % APELIDOS.length]; };

// Clima de Osasco (Open-Meteo, grátis e sem chave). O tema do topo acompanha o tempo.
const WMO = (c) => c === 0 ? ["Céu limpo", "sol"] : c <= 2 ? ["Parcialmente nublado", "sol"] : c === 3 ? ["Nublado", "nublado"] : c <= 48 ? ["Neblina", "nublado"] : c <= 67 || (c >= 80 && c <= 82) ? ["Chuva", "chuva"] : c <= 77 ? ["Frio intenso", "nublado"] : ["Tempestade", "tempestade"];
async function clima() {
  try {
    const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-23.5325&longitude=-46.7917&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=America%2FSao_Paulo&forecast_days=3");
    if (!r.ok) return null;
    const j = await r.json();
    const [label, tema] = WMO(j.current.weather_code);
    return { temp: Math.round(j.current.temperature_2m), label, tema: j.current.is_day ? tema : tema === "sol" ? "noite" : tema,
      dias: j.daily.time.map((d, i) => ({ d, max: Math.round(j.daily.temperature_2m_max[i]), min: Math.round(j.daily.temperature_2m_min[i]), chuva: j.daily.precipitation_probability_max[i], label: WMO(j.daily.weather_code[i])[0] })) };
  } catch { return null; }
}

// Início: o que importa de cara (meta do X, fila do Postador, Radar, agenda e últimos garimpos).
const k = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(".0", "") + "M" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(".0", "") + "K" : String(n ?? 0));

export default async function inicio({ sb, refresh }) {
  const [postsR, goalR, radarR, minerR, setR, socialR, reelsR, tempo, igHistR, agendaR, ideasR, doneR] = await Promise.all([
    sb.from("posts").select("id, network, title, body, status, scheduled_at, posted_at, is_viral_bet, created_at").is("archived_at", null).order("created_at", { ascending: false }).limit(200),
    sb.from("x_goal_entries").select("day, verified_followers, impressions_90d").is("archived_at", null).order("day").limit(200),
    sb.from("radar_items").select("kind, done_at").is("archived_at", null).limit(300),
    sb.from("miner_links").select("id, url, platform, collection, note, status, thumbnail_url, saved_at").is("archived_at", null).order("saved_at", { ascending: false }).limit(6),
    sb.from("postador_settings").select("key, value"),
    sb.from("social_stats").select("day, platform, followers, following, posts, data").is("archived_at", null).order("day", { ascending: false }).limit(6),
    sb.from("reel_stats").select("day, views").is("archived_at", null).order("day", { ascending: false }).limit(48),
    clima(),
    sb.from("social_stats").select("day, followers").eq("platform", "instagram").is("archived_at", null).order("day", { ascending: false }).limit(21),
    sb.from("agenda_cache").select("title, starts_at, ends_at, all_day, calendar, synced_at").gte("ends_at", new Date().toISOString()).order("starts_at").limit(60),
    sb.from("miner_links").select("id, url, platform, author, note, idea, target, format, thumbnail_url, saved_at").is("archived_at", null).not("idea", "is", null).order("saved_at", { ascending: false }).limit(8),
    sb.from("reminder_done").select("key").gte("done_at", new Date(Date.now() - 20 * 864e5).toISOString()),
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

  // Atualização do dia (X e Instagram), com alerta de queda
  const soc = socialR.data || [];
  const lastTwo = (pf) => soc.filter((r) => r.platform === pf).slice(0, 2);
  const [xNow, xPrev] = lastTwo("x"), [igNow, igPrev] = lastTwo("instagram");
  const reelDays = [...new Set((reelsR.data || []).map((r) => r.day))];
  const reelSum = (d) => (reelsR.data || []).filter((r) => r.day === d).reduce((n, r) => n + (r.views || 0), 0);
  const dif = (a, b) => (a == null || b == null ? null : a - b);
  const line = (label, now, before, fmt = (v) => v.toLocaleString("pt-BR")) => {
    if (now == null) return null;
    const d = dif(now, before);
    return h("div", { class: "uline" + (d < 0 ? " down" : "") }, h("span", { class: "muted" }, label), h("b", null, fmt(now)), d == null ? h("span", { class: "mono muted" }, "1º registro") : h("span", { class: "mono" }, d < 0 ? `▼ ${fmt(-d)}` : d > 0 ? `▲ ${fmt(d)}` : "="));
  };
  const update = h("section", { class: "panel daily" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Atualização do dia"), h("a", { class: "mono", href: "#/desempenho" }, "ver gráficos →")),
    h("div", { class: "panel-body" }, (xNow || igNow) ? h("div", { class: "ugrid" },
      h("div", null, h("div", { class: "mono", style: { marginBottom: "6px" } }, "X"),
        line("Verificados", xNow?.data?.verified_followers, xPrev?.data?.verified_followers), line("Impressões 90d", xNow?.data?.impressions_90d, xPrev?.data?.impressions_90d, k), line("Seguidores", xNow?.followers, xPrev?.followers)),
      h("div", null, h("div", { class: "mono", style: { marginBottom: "6px" } }, "Instagram"),
        line("Seguidores", igNow?.followers, igPrev?.followers), line("Posts", igNow?.posts, igPrev?.posts), line("Views 12 Reels", reelDays[0] ? reelSum(reelDays[0]) : null, reelDays[1] ? reelSum(reelDays[1]) : null, k)),
      h("div", null, h("div", { class: "mono", style: { marginBottom: "6px" } }, "LinkedIn"), h("p", { class: "muted small" }, "A API não mostra números de perfil pessoal. Por enquanto só o que sai pelo Postador.")))
      : h("p", { class: "empty" }, "A coleta roda todo dia às 5h.")));

  const nick = apelidoDoDia();
  const hero = h("section", { class: "hero tema-" + (tempo?.tema || "nublado") },
    h("div", { class: "grow" }, h("div", { class: "mono eyebrow" }, "// ", hello), h("h1", { class: "hello" }, `${greet}, ${nick}!`)),
    tempo ? h("div", { class: "wx" },
      h("div", { class: "wxnow" }, h("span", { class: "wxicon", "aria-hidden": "true" }), h("b", null, `${tempo.temp}°`), h("div", null, h("div", null, tempo.label), h("div", { class: "muted small" }, "Osasco agora"))),
      h("div", { class: "wxdays" }, ...tempo.dias.map((d, i) => h("div", null, h("span", { class: "mono" }, i === 0 ? "hoje" : new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(new Date(d.d + "T12:00:00Z")).replace(".", "")), h("b", null, `${d.max}° / ${d.min}°`), h("span", { class: "muted small" }, `chuva ${d.chuva ?? 0}%`)))))
      : h("p", { class: "muted small" }, "Previsão do tempo indisponível agora."));

  const quick = h("section", { class: "quickgrid" }, h("span", { class: "mono striplabel" }, "Ferramentas"),
    ...QUICK.map(([n, u]) => h("a", { class: "qlink", href: u, target: "_blank", rel: "noopener" }, h("img", { src: favicon(u), alt: "", width: 18, height: 18 }), n)),
    h("a", { class: "qlink meta", href: META_SCHEDULER[1], target: "_blank", rel: "noopener" }, h("img", { src: favicon(META_SCHEDULER[1]), alt: "", width: 18, height: 18 }), META_SCHEDULER[0]));

  // Meta semanal: +1000 seguidores no @andersonbrito.mp4, semana de sábado a sexta
  const igH = (igHistR.data || []).slice().reverse();
  const dow = new Date(today + "T12:00:00Z").getUTCDay(); // 0 dom … 6 sáb
  const lastFri = new Date(today + "T12:00:00Z"); lastFri.setUTCDate(lastFri.getUTCDate() - ((dow + 2) % 7 || 7));
  const friKey = lastFri.toISOString().slice(0, 10);
  const nextFri = new Date(lastFri); nextFri.setUTCDate(nextFri.getUTCDate() + 7);
  const baseRow = [...igH].reverse().find((r) => r.day <= friKey) || igH[0];
  const nowRow = igH[igH.length - 1];
  const gained = baseRow && nowRow ? nowRow.followers - baseRow.followers : null;
  const daysLeft = Math.max(0, Math.round((nextFri - new Date(today + "T12:00:00Z")) / 864e5));
  const GOAL_W = 1000;
  const metaIG = h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "#dd2a7b" } }), h("h2", { class: "mono grow" }, "Instagram · @andersonbrito.mp4"),
      h("span", { class: "mono" }, `fecha sexta ${fmtDate(nextFri.toISOString().slice(0, 10), false)}`)),
    h("div", { class: "panel-body" }, gained == null ? h("p", { class: "empty" }, "Sem dados do Instagram ainda.") : [
      h("div", { class: "dnum" }, h("b", null, (nowRow?.followers ?? 0).toLocaleString("pt-BR")), h("span", { class: "muted small" }, "seguidores agora")),
      h("div", { class: "mono", style: { margin: "10px 0 6px" } }, `META DA SEMANA: ${gained >= 0 ? "+" : ""}${gained.toLocaleString("pt-BR")} de +${GOAL_W.toLocaleString("pt-BR")}`),
      bar(Math.max(0, gained), GOAL_W),
      h("p", { class: "muted small", style: { marginTop: "8px" } }, gained >= GOAL_W ? "Meta batida. Bora pra próxima." : `Faltam ${(GOAL_W - gained).toLocaleString("pt-BR")} em ${daysLeft} dia(s): cerca de ${Math.ceil((GOAL_W - gained) / Math.max(1, daysLeft)).toLocaleString("pt-BR")} por dia.`)]));

  // Estratégia dos perfis (direção de cada um; não misturar públicos)
  const perfil = (handle, papel, itens, collab) => h("div", { class: "strat" },
    h("b", { class: "mono" }, handle), h("span", { class: "muted small" }, papel), h("ul", null, ...itens.map((i) => h("li", null, i))), collab && h("span", { class: "chip accent" }, collab));
  const estrategia = h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Estratégia · cada perfil com um público")),
    h("div", { class: "panel-body" },
      h("div", { class: "goalbox" },
        h("div", null, h("span", { class: "mono" }, "OBJETIVO 1"), h("b", null, "Virar referência no nicho"), h("span", { class: "muted small" }, "audiovisual, edição e IA: autoridade e credibilidade para empresas e clientes")),
        h("div", null, h("span", { class: "mono" }, "OBJETIVO 2"), h("b", null, "Captar leads que pagam"), h("span", { class: "muted small" }, "quem quer contratar, comprar ou pagar por serviço (empresários, marcas, influencers)"))),
      h("div", { class: "strat3" },
        perfil("@andersonbrito.mp4", "principal", ["virais e conceituais", "notícias do nicho", "hook com famoso ou cena estranha"], "notícias em collab com @ilmarlabs"),
        perfil("@ilmarlabs", "empresa · identidade marcante", ["ensina edição e IA", "bastidor do principal", "virais com famosos (estilo @auramode.ai)"], "sempre collab com @andersonbrito.mp4"),
        perfil("@ander.sbrito", "pessoal · carrossel", ["seg: dump da semana", "qui: #tbt · sex: dump aleatório", "dia 1: dump do mês · 30/12 dump · 31/12 retrospectiva"], "collab @vanessarotiroti + @andersonbrito.mp4")),
      h("p", { class: "muted small", style: { marginTop: "10px" } }, "Não misturar assuntos: cada perfil fala com um público. Collabs furam a bolha.")));

  // Agenda: próximos compromissos (cache gravado pela rotina das 5h a partir do Google Agenda)
  const ag = agendaR.data || [];
  const lastSync = ag.reduce((m, e) => (e.synced_at > m ? e.synced_at : m), "");
  const prox = ag.filter((e) => e.synced_at === lastSync).slice(0, 8);
  const quando = (e) => e.all_day ? fmtDate(e.starts_at.slice(0, 10), false) : fmtDateTime(e.starts_at);
  const agendaBox = hideable("agenda", h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Próximos compromissos"), h("a", { class: "mono", href: "#/agenda" }, "agenda →")),
    h("div", { class: "panel-body" }, prox.length ? h("div", { class: "stack" }, ...prox.map((e) => h("div", { class: "agrow" }, h("span", { class: "mono muted" }, quando(e)), h("span", null, e.title))))
      : h("p", { class: "empty" }, "Atualiza todo dia às 5h."))));

  // Histórico do X: o que saiu e o que está agendado nos próximos/últimos dias
  const hist = posts.filter((p) => ["approved", "posted", "failed"].includes(p.status) && (p.posted_at || p.scheduled_at))
    .sort((a, b) => (b.posted_at || b.scheduled_at).localeCompare(a.posted_at || a.scheduled_at)).slice(0, 8);
  const histBox = h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Histórico do PostadoR_"), h("a", { class: "mono", href: "#/postador?aba=historico" }, "calendário →")),
    h("div", { class: "panel-body" }, hist.length ? h("div", { class: "stack" }, ...hist.map((p) => h("a", { class: "agrow", href: `#/postador?id=${p.id}` },
      h("span", { class: "mono muted" }, fmtDateTime(p.posted_at || p.scheduled_at)), h("span", { class: "truncate" }, (p.status === "approved" ? "agendado · " : p.status === "failed" ? "erro · " : "") + first(p)))))
      : h("p", { class: "empty" }, "Nada ainda.")));

  // O que replicar hoje (garimpo do MineR_ com ideia de recriação)
  const ideas = ideasR.data || [];
  const replicar = hideable("replicar", h("section", { class: "panel" },
    h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Pra replicar hoje · garimpo"), h("a", { class: "mono", href: "#/miner" }, "MineR_ →")),
    h("div", { class: "panel-body" }, ideas.length ? h("div", { class: "ideas" }, ...ideas.map((l) => h("a", { class: "idea", href: l.url, target: "_blank", rel: "noopener" },
      h("div", { class: "mthumb" }, l.thumbnail_url && h("img", { src: l.thumbnail_url, alt: "", loading: "lazy", referrerpolicy: "no-referrer", onerror: (e) => e.target.remove() })),
      h("div", { class: "grow", style: { minWidth: 0 } },
        h("div", { class: "flex" }, l.target && h("span", { class: "chip accent" }, "@" + l.target), l.format && h("span", { class: "chip" }, l.format), h("span", { class: "mono muted small" }, l.author || "")),
        h("p", { class: "small", style: { margin: "6px 0 0" } }, l.idea)))))
      : h("p", { class: "empty" }, "O garimpo roda todo dia às 6h e traz aqui o que vale recriar do seu jeito."))));

  // Parabéns quando uma meta é batida (aparece no topo e uma vez por semana como aviso)
  const batidas = [gained != null && gained >= GOAL_W && `meta da semana no Instagram (+${gained.toLocaleString("pt-BR")} seguidores)`,
    cur.verified_followers >= 500 && "500 seguidores verificados no X", cur.impressions_90d >= 500000 && "500 mil impressões verificadas no X"].filter(Boolean);
  const parabens = batidas.length ? h("section", { class: "parabens" }, h("b", null, "PARABÉNS!"), h("span", null, " Você bateu: " + batidas.join(" · ") + ". Bora pra próxima.")) : null;
  if (batidas.length) { try { const kk = "aos_parabens_" + friKey + batidas.length; if (!localStorage.getItem(kk)) { localStorage.setItem(kk, "1"); setTimeout(() => toast("Parabéns! Meta batida: " + batidas[0]), 600); } } catch {} }

  // Avisos do @ander.sbrito (carrossel com collab @vanessarotiroti + @andersonbrito.mp4): hoje e atrasados da semana, até marcar feito
  const feitos = new Set((doneR.data || []).map((r) => r.key));
  const avisosDe = (d) => {
    const dt = new Date(d + "T12:00:00Z"), wd = dt.getUTCDay(), dia = dt.getUTCDate(), mes = dt.getUTCMonth() + 1, out = [];
    if (wd === 1) out.push(["dump-semana", "DUMP DA SEMANA"]);
    if (wd === 4) out.push(["tbt", "#TBT"]);
    if (wd === 5) out.push(["dump-aleatorio", "DUMP ALEATÓRIO"]);
    if (dia === 1 && mes !== 1) out.push(["dump-mes", "DUMP DO MÊS PASSADO"]);
    if (dia === 30 && mes === 12) out.push(["dump-mes", "DUMP DO MÊS (dezembro)"]);
    if (dia === 31 && mes === 12) out.push(["retro", "RETROSPECTIVA DO ANO"]);
    return out.map(([k2, t]) => ({ key: `${k2}:${d}`, title: t, day: d }));
  };
  const avisos = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(today + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - i); avisos.push(...avisosDe(d.toISOString().slice(0, 10))); }
  const pend = avisos.filter((a) => !feitos.has(a.key));
  const marcar = async (a, btn) => {
    btn.disabled = true;
    const { error } = await sb.from("reminder_done").insert({ key: a.key });
    if (error && !/duplicate/i.test(error.message)) { btn.disabled = false; return toast("Não foi possível marcar.", { kind: "err" }); }
    toast("Feito!"); refresh();
  };
  const avisosBox = pend.length ? h("section", { class: "avisos" },
    h("div", { class: "flex" }, h("b", { class: "mono" }, "AVISOS · @ander.sbrito"), h("span", { class: "muted small" }, "carrossel com collab @vanessarotiroti + @andersonbrito.mp4")),
    ...pend.map((a) => h("div", { class: "aviso" + (a.day < today ? " atrasado" : "") },
      h("span", { class: "mono" }, a.day === today ? "HOJE" : `atrasado · ${fmtDate(a.day, false)}`), h("b", { class: "grow" }, a.title),
      h("button", { class: "btn btn-sm", type: "button", onclick: (e) => marcar(a, e.currentTarget) }, "Feito")))) : null;

  return h("div", { class: "page inicio wide" },
    h("div", { class: "headstrip" }, await favoritesBar(sb, refresh), quick),
    parabens,
    avisosBox,
    hero,
    failed && alertBox("Não foi possível carregar parte dos dados. Atualize a página."),
    h("div", { class: "homegrid" },
      h("div", { class: "stack-lg" },
        h("div", { class: "metas2" }, metaIG, goalPanel(cur, prev, bar, delta, null, null, null)),
        h("div", { class: "mono sectitle" }, "X · POSTADOR_"),
        h("div", { class: "kpis" },
          tile("Para aprovar", pending.length, "#/postador", viral ? "inclui a aposta viral do dia" : "rascunhos do dia", pending.length > 0),
          tile("Agendados", scheduled.length, "#/postador?status=approved", scheduled[0] ? `próximo ${fmtDateTime(scheduled[0].scheduled_at)}` : "nada na fila"),
          tile("X hoje", `${xToday}/${settings.x_daily_limit}`, "#/postador?aba=historico", failedPosts ? `${failedPosts} com erro` : "posts publicados", failedPosts > 0),
          tile("Radar", talk, "#/postador?aba=radar", `${follow} pra seguir de volta`),
          tile("Pra replicar", ideas.length, "#/miner", "ideias do garimpo")),
        await xOrigem(sb),
        viral && h("a", { class: "viralcard", href: `#/postador?id=${viral.id}` }, h("span", { class: "pill viral" }, "APOSTA VIRAL DO DIA"), h("b", null, first(viral)), h("span", { class: "mono" }, "Revisar e aprovar →")),
        replicar,
        h("section", { class: "panel" },
          h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Rascunhos para aprovar"), h("a", { class: "mono", href: "#/postador" }, "abrir postador →")),
          h("div", { class: "panel-body" }, pending.length ? h("div", { class: "stack" }, ...pending.slice(0, 6).map((p) => h("a", { class: "irow", href: `#/postador?id=${p.id}` },
            h("span", { class: "netb n-" + p.network }, p.network === "x" ? "X" : "in"), h("span", { class: "truncate grow" }, first(p)), h("span", { class: "mono muted" }, "abrir"))))
            : h("p", { class: "empty" }, "Nada pendente. Os rascunhos chegam todo dia às 5h."))),
        update,
        estrategia),
      h("aside", { class: "stack-lg homeside" },
        agendaBox,
        h("section", { class: "panel" },
          h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Calendário")),
          h("div", { class: "panel-body", style: { padding: 0 } }, calendarEmbed("AGENDA", 520))),
        histBox)));
}
