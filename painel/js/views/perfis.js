// PerfiS_: matriz do ecossistema (função, plataformas, collab, stories, CTA), pautas e lembretes do dia
// (aquecimento, oração, react...) e a meta de faturamento de 60 dias. Também exporta os blocos do PaineL_.
import { h, todayISO, addDaysISO, fmtDate, fmtDateTime } from "../util.js";
import { toast, pageHead } from "../ui.js";


const REDES = { instagram: { nome: "Instagram", cor: "#E1306C", d: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17.5 6.5h.01" },
  tiktok: { nome: "TikTok", cor: "#25F4EE", d: "M16 3v10.5a4.5 4.5 0 1 1-4.5-4.5M16 3c.3 2.4 2 4 4.5 4.2" },
  youtube: { nome: "YouTube", cor: "#FF0000", d: "M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM10 9l5 3-5 3z" },
  x: { nome: "X", cor: "#d6d6d6", d: "M4 4l16 16M20 4L4 20" } };
const FOTOS = { "andersonbrito-mp4": "/lunar/images/anderson-camera.jpg", "x-andersbrito": "/lunar/images/anderson-camera.jpg", "youtube-andersonbrito": "/lunar/images/anderson-camera.jpg", "tiktok-andersonbrito": "/lunar/images/anderson-camera.jpg", "anders-brito": "/lunar/images/anderson-camera.jpg", "brito-portfolio": "/lunar/images/anderson-camera.jpg",
  kairos: "/painel/img/influencers/kairos.jpg", mazzaropi: "/painel/img/influencers/mazzaropi.jpg", "india-narah": "/painel/img/influencers/india-narah.jpg", seufofudo: "/painel/img/influencers/fofudo.jpg" };
const redeDe = (p) => { const s = (p.plataforma || "").toLowerCase(); return s.startsWith("tiktok") ? "tiktok" : s.startsWith("youtube") ? "youtube" : s.startsWith("x") ? "x" : "instagram"; };
const urlDe = (p, rede) => {
  if (p.url) return p.url;
  const m = (p.handle || "").match(/@([\w.]+)/); if (!m) return null;
  return rede === "tiktok" ? `https://www.tiktok.com/@${m[1]}` : rede === "x" ? `https://x.com/${m[1]}` : rede === "youtube" ? `https://www.youtube.com/@${m[1]}` : `https://www.instagram.com/${m[1]}/`;
};
const iniciais = (t) => (t || "?").replace(/[@(].*$/, "").replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
function netIcon(rede) {
  const r = REDES[rede] || REDES.instagram, s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [k, v] of Object.entries({ width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: r.cor, "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) s.setAttribute(k, v);
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", r.d); s.append(p); return s;
}

export const META = { valor: 3000, inicio: "2026-11-06", fim: "2027-01-05" };
const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const FASES = { ativo: "ativo", aquecendo: "aquecendo", piloto: "piloto", planejado: "planejado", pausado: "pausado" };
const MATRIZ = [["feed", "Feed / Reels"], ["stories", "Stories"], ["collab", "Collab"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["x", "X"], ["cta", "CTA"], ["frequencia", "Frequência"], ["publico", "Público"], ["custo", "Custo"], ["metricas", "Métricas"], ["aprovacao", "Aprovação"]];
const TIPOS_REC = { servico: "Serviço", produto: "Produto", afiliado: "Afiliado", adsense: "AdSense", tiktok_shop: "TikTok Shop", outro: "Outro" };
const TIPO_PAUTA = { aquecimento: "aquecer", reel: "reel", story: "story", carrossel: "carrossel", post: "post", oracao: "oração", lyrics: "lyrics", versiculo: "versículo", react: "react", foto: "foto", contagem: "contagem", prospeccao: "prospecção", produto: "produto", outro: "outro" };

function metaNums(rec) {
  const total = rec.filter((r) => r.dia >= META.inicio && r.dia <= META.fim).reduce((s, r) => s + Number(r.valor), 0);
  const today = todayISO(), dias = Math.max(0, Math.round((Date.parse(META.fim) - Date.parse(today)) / 864e5) + 1);
  const falta = Math.max(0, META.valor - total), semanas = Math.max(1, dias / 7);
  return { total, falta, dias, porSemana: falta / semanas, pct: Math.min(100, (total / META.valor) * 100) };
}
const metaBar = (m) => h("div", { class: "eco-meta" },
  h("div", { class: "flex wrap", style: { justifyContent: "space-between" } }, h("b", { class: "eco-big" }, brl(m.total), h("span", { class: "muted" }, ` / ${brl(META.valor)}`)), h("span", { class: "mono" }, `${m.dias} dias restantes · faltam ${brl(m.falta)} · ~${brl(m.porSemana)}/semana`)),
  h("div", { class: "gbar" }, h("b", { style: { width: m.pct + "%" } })));

/** Blocos do PaineL_: meta de 60 dias, agentes, pautas do dia e notas fixadas. Some sozinho se a migration 0030 não existir. */
export async function ecoHome(sb) {
  const today = todayISO();
  const apR = await sb.from("aprovacoes").select("id", { count: "exact", head: true }).is("archived_at", null).eq("status", "pendente");
  const [recR, jobsR, pautR] = await Promise.all([
    sb.from("receitas").select("valor, dia").is("archived_at", null).gte("dia", META.inicio),
    sb.from("agent_jobs").select("task_id, titulo, enabled, last_status, last_run_at, next_run_at, synced_at").is("archived_at", null),
    sb.from("pautas").select("id, perfil, tipo, titulo, status, dia").is("archived_at", null).eq("dia", today),
  ]);
  if ([recR, jobsR, pautR].some((r) => r.error)) return null;
  const m = metaNums(recR.data || []), jobs = jobsR.data || [], pautas = pautR.data || [];
  const falhas = jobs.filter((j) => j.last_status === "falha").length, ativos = jobs.filter((j) => j.enabled).length;
  const sync = jobs.reduce((s, j) => (j.synced_at > s ? j.synced_at : s), "");
  const pend = pautas.filter((p) => p.status === "pendente");
  const head = (t, href, link) => h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, t), href && h("a", { class: "mono", href }, link));
  return h("div", { class: "stack-lg" },
    h("section", { class: "panel" }, head("Meta · R$ 3.000 em 60 dias (faturamento)", "#/perfis", "registrar venda →"), h("div", { class: "panel-body" }, metaBar(m))),
    h("div", { class: "kpis" },
      !apR.error && h("a", { class: "kpi" + (apR.count ? " hot" : ""), href: "#/aprovacoes" }, h("span", { class: "mono" }, "Para aprovar"), h("b", null, String(apR.count ?? 0)), h("span", { class: "muted small" }, apR.count ? "conteúdo dos agentes esperando o seu OK" : "nada pendente")),
      h("a", { class: "kpi" + (falhas ? " hot" : ""), href: "#/agentes" }, h("span", { class: "mono" }, "AgenteS_"), h("b", null, `${ativos} ativos`), h("span", { class: "muted small" }, falhas ? `${falhas} com falha na última execução` : sync ? `sincronizado ${fmtDateTime(sync)}` : "aguardando a 1ª sincronização")),
      h("a", { class: "kpi" + (pend.length ? " hot" : ""), href: "#/perfis" }, h("span", { class: "mono" }, "Pautas de hoje"), h("b", null, `${pautas.length - pend.length}/${pautas.length}`), h("span", { class: "muted small" }, pend.length ? `${pend.length} pendentes (aquecimento, oração, reacts…)` : "tudo feito")),
      h("a", { class: "kpi", href: "#/mapa" }, h("span", { class: "mono" }, "Map MentaleS_"), h("b", null, "abrir"), h("span", { class: "muted small" }, "ecossistema, funis e dependências"))));
}

export default async function perfis({ sb, refresh }) {
  const today = todayISO();
  const [pR, paR, rR] = await Promise.all([
    sb.from("perfis").select("*").is("archived_at", null).order("ordem"),
    sb.from("pautas").select("id, chave, dia, perfil, tipo, titulo, detalhe, fontes, status, version").is("archived_at", null).gte("dia", addDaysISO(today, -3)).lte("dia", addDaysISO(today, 1)).order("dia"),
    sb.from("receitas").select("id, dia, valor, tipo, descricao, perfil, canal, custo, version").is("archived_at", null).order("dia", { ascending: false }).limit(200),
  ]);
  if (pR.error || paR.error || rR.error) return h("p", { class: "alert" }, "Não foi possível carregar os perfis. A migration 0030 foi aplicada?");
  const perfisL = pR.data || [], pautas = paR.data || [], rec = rR.data || [];
  // Relatório diário de cada perfil novo (rotina relatorios-perfis-diario): avaliação, recomendações e a meta de +100 seguidores/semana.
  // Sem a migration 0036 a coluna "perfil" não existe: a seção some sem quebrar a página.
  const relR = await sb.from("reports").select("id, perfil, body, dados, created_at").eq("kind", "perfil").is("archived_at", null).gte("created_at", addDaysISO(today, -14)).order("created_at", { ascending: false }).limit(300);
  const rels = relR.error ? [] : relR.data || [];
  const relDe = (slug) => rels.filter((r) => r.perfil === slug);
  const nome = (slug) => perfisL.find((p) => p.slug === slug)?.handle || slug;

  // ── Meta + registrar venda
  const m = metaNums(rec);
  const form = h("form", { class: "eco-form" },
    h("input", { class: "input", name: "valor", type: "number", step: "0.01", min: "0", placeholder: "R$", required: true, "aria-label": "Valor" }),
    h("input", { class: "input", name: "descricao", placeholder: "O que foi vendido (ex.: motion açaí)", required: true, maxlength: 300, "aria-label": "Descrição" }),
    h("select", { class: "select", name: "tipo", "aria-label": "Tipo" }, ...Object.entries(TIPOS_REC).map(([k, v]) => h("option", { value: k }, v))),
    h("select", { class: "select", name: "perfil", "aria-label": "Perfil de origem" }, h("option", { value: "" }, "origem…"), ...perfisL.map((p) => h("option", { value: p.slug }, p.handle))),
    h("input", { class: "input", name: "canal", placeholder: "canal (direct, whatsapp, kiwify…)", "aria-label": "Canal" }),
    h("input", { class: "input", name: "dia", type: "date", value: today, "aria-label": "Dia" }),
    h("button", { class: "btn", type: "submit" }, "Registrar"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault(); const fd = new FormData(form), btn = form.querySelector("button"); btn.disabled = true;
    const row = { valor: Number(fd.get("valor")), descricao: String(fd.get("descricao")).trim(), tipo: fd.get("tipo"), perfil: fd.get("perfil") || null, canal: String(fd.get("canal")).trim() || null, dia: fd.get("dia") || today };
    const { error } = await sb.from("receitas").insert(row); btn.disabled = false;
    if (error) return toast("Não foi possível registrar.", { kind: "err" }); toast("Venda registrada."); refresh();
  });
  const recList = rec.length ? h("div", { class: "stack" }, ...rec.slice(0, 12).map((r) => h("div", { class: "agrow" }, h("span", { class: "mono muted" }, fmtDate(r.dia, false)), h("b", null, brl(r.valor)), h("span", { class: "grow truncate" }, r.descricao), h("span", { class: "chip" }, TIPOS_REC[r.tipo]), r.perfil && h("span", { class: "chip" }, nome(r.perfil)))))
    : h("p", { class: "empty" }, "Nenhuma venda registrada ainda. Cada serviço, pack ou comissão entra aqui para medir a meta e a origem por perfil.");
  const porPerfil = Object.entries(rec.filter((r) => r.dia >= META.inicio).reduce((a, r) => ((a[r.perfil || "sem origem"] = (a[r.perfil || "sem origem"] || 0) + Number(r.valor)), a), {})).sort((a, b) => b[1] - a[1]);

  // ── Pautas (hoje, amanhã e atrasadas)
  const setPauta = async (p, status) => {
    const { data, error } = await sb.from("pautas").update({ status, done_at: status === "feito" ? new Date().toISOString() : null }).eq("id", p.id).eq("version", p.version).select("version").maybeSingle();
    if (error || !data) return toast("Não foi possível atualizar (recarregue).", { kind: "err" }); p.version = data.version; p.status = status; drawPautas();
  };
  const pautaBox = h("div", { class: "stack" });
  const drawPautas = () => {
    const vis = pautas.filter((p) => p.dia === today || (p.dia < today && p.status === "pendente") || p.dia > today);
    const groups = {}; for (const p of vis) (groups[p.perfil] ||= []).push(p);
    pautaBox.replaceChildren(...(vis.length ? Object.entries(groups).map(([pf, ps]) => h("div", { class: "eco-pgroup" }, h("div", { class: "mono" }, nome(pf)),
      ...ps.map((p) => h("div", { class: `eco-pauta s-${p.status}` },
        h("span", { class: "chip" }, TIPO_PAUTA[p.tipo]), h("span", { class: "mono muted" }, p.dia === today ? "hoje" : p.dia > today ? "amanhã" : "atrasada · " + fmtDate(p.dia, false)),
        h("div", { class: "grow" }, h("b", null, p.titulo), p.detalhe && h("details", null, h("summary", { class: "muted small" }, "detalhes"), h("p", { class: "small pre" }, p.detalhe), (p.fontes || []).length ? h("div", { class: "flex wrap" }, ...p.fontes.map((f) => h("a", { class: "chip", href: f.url || f, target: "_blank", rel: "noopener" }, f.nome || "fonte"))) : null)),
        p.status === "pendente" ? h("div", { class: "flex" }, h("button", { class: "btn btn-sm", type: "button", onclick: () => setPauta(p, "feito") }, "Feito"), h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => setPauta(p, "pulado") }, "Pular"))
          : h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => setPauta(p, "pendente") }, p.status === "feito" ? "feito ✓" : p.status))))) : [h("p", { class: "empty" }, "Sem pautas para hoje. As rotinas de aquecimento e dos perfis entregam aqui todo dia cedo.")]));
  };
  drawPautas();

  // ── Matriz
  const editPerfil = (p) => {
    const ov = h("div", { class: "overlay", onmousedown: (e) => e.target === ov && ov.remove() });
    const f = h("form", { class: "dialog eco-dialog", role: "dialog", "aria-modal": "true", "aria-label": "Editar perfil" },
      h("h2", null, p.handle),
      h("div", { class: "grid2" }, h("label", { class: "field" }, "@ / nome", h("input", { class: "input", name: "handle", value: p.handle })), h("label", { class: "field" }, "Fase", h("select", { class: "select", name: "fase" }, ...Object.keys(FASES).map((k) => h("option", { value: k, selected: k === p.fase }, k))))),
      h("label", { class: "field" }, "Papel", h("textarea", { class: "textarea", name: "papel", rows: 2 }, p.papel || "")),
      h("label", { class: "field" }, "Conteúdo", h("textarea", { class: "textarea", name: "conteudo", rows: 2 }, p.conteudo || "")),
      h("label", { class: "field" }, "Conversão", h("textarea", { class: "textarea", name: "conversao", rows: 2 }, p.conversao || "")),
      h("div", { class: "grid2" }, ...MATRIZ.map(([k, l]) => h("label", { class: "field" }, l, h("textarea", { class: "textarea", name: "m_" + k, rows: 2 }, p.matriz?.[k] || "")))),
      h("div", { class: "flex", style: { justifyContent: "flex-end", marginTop: "12px" } }, h("button", { class: "btn btn-ghost", type: "button", onclick: () => ov.remove() }, "Cancelar"), h("button", { class: "btn", type: "submit" }, "Salvar")));
    f.addEventListener("submit", async (e) => {
      e.preventDefault(); const fd = new FormData(f);
      const patch = { handle: String(fd.get("handle")).trim() || p.handle, fase: fd.get("fase"), papel: fd.get("papel"), conteudo: fd.get("conteudo"), conversao: fd.get("conversao"), matriz: { ...p.matriz, ...Object.fromEntries(MATRIZ.map(([k]) => [k, String(fd.get("m_" + k)).trim()])) } };
      const { data, error } = await sb.from("perfis").update(patch).eq("id", p.id).eq("version", p.version).select("id").maybeSingle();
      if (error || !data) return toast("Não salvou (o perfil mudou em outro lugar? recarregue).", { kind: "err" }); ov.remove(); toast("Perfil salvo."); refresh();
    });
    ov.append(f); document.body.append(ov); f.querySelector("input").focus();
  };
  const verMatriz = (p) => {
    const ov = h("div", { class: "overlay", onmousedown: (e) => e.target === ov && ov.remove() });
    ov.append(h("div", { class: "dialog eco-dialog", role: "dialog", "aria-modal": "true", "aria-label": p.handle },
      h("div", { class: "flex", style: { justifyContent: "space-between" } }, h("h2", null, p.handle), h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => ov.remove() }, "Fechar")),
      h("p", { class: "small" }, p.papel),
      p.conteudo && h("p", { class: "small", style: { marginTop: "8px" } }, h("b", null, "Conteúdo: "), p.conteudo),
      p.conversao && h("p", { class: "small", style: { marginTop: "8px" } }, h("b", null, "Conversão: "), p.conversao),
      h("dl", { class: "eco-dl" }, ...MATRIZ.filter(([k]) => p.matriz?.[k]).flatMap(([k, l]) => [h("dt", null, l), h("dd", null, p.matriz[k])])),
      h("button", { class: "btn btn-sm", type: "button", onclick: () => { ov.remove(); editPerfil(p); } }, "Editar")));
    document.body.append(ov);
  };
  const verRelatorio = (p, lista) => {
    let i = 0;
    const ov = h("div", { class: "overlay", onmousedown: (e) => e.target === ov && ov.remove() });
    const box = h("div", { class: "dialog eco-dialog", role: "dialog", "aria-modal": "true", "aria-label": `Relatório de ${p.handle}` });
    const draw = () => {
      const r = lista[i], d = r.dados || {};
      box.replaceChildren(...[
        h("div", { class: "flex", style: { justifyContent: "space-between" } }, h("h2", null, p.handle), h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => ov.remove() }, "Fechar")),
        h("div", { class: "flex wrap", style: { gap: "6px", margin: "6px 0 12px" } },
          h("span", { class: "mono muted" }, fmtDateTime(r.created_at)),
          d.seguidores == null ? null : h("span", { class: "chip" }, `${Number(d.seguidores).toLocaleString("pt-BR")} seguidores`),
          d.delta_dia == null ? null : h("span", { class: "chip" + (d.delta_dia > 0 ? " ok" : "") }, `${d.delta_dia > 0 ? "+" : ""}${d.delta_dia} no dia`),
          d.semana_delta == null ? null : h("span", { class: "chip" + (d.semana_delta >= (d.meta_semana || 100) ? " ok" : " warn") }, `${d.semana_delta > 0 ? "+" : ""}${d.semana_delta} / ${d.meta_semana || 100} na semana`)),
        h("p", { class: "small pre" }, r.body),
        lista.length < 2 ? null : h("div", { class: "flex", style: { justifyContent: "space-between", marginTop: "14px" } },
          h("button", { class: "btn btn-ghost btn-sm", type: "button", disabled: i >= lista.length - 1, onclick: () => { i++; draw(); } }, "← dia anterior"),
          h("span", { class: "mono muted" }, `${i + 1} de ${lista.length}`),
          h("button", { class: "btn btn-ghost btn-sm", type: "button", disabled: i === 0, onclick: () => { i--; draw(); } }, "mais novo →"))].filter(Boolean));
    };
    draw(); ov.append(box); document.body.append(ov);
  };
  const metaSemana = (p) => {
    const lista = relDe(p.slug); if (!lista.length) return null;
    const d = lista[0].dados || {}, meta = d.meta_semana || 100, feito = Number(d.semana_delta ?? 0), pct = Math.max(0, Math.min(100, (feito / meta) * 100));
    return h("button", { class: "pf-rel", type: "button", title: "Abrir o relatório do dia", onclick: () => verRelatorio(p, lista) },
      h("div", { class: "flex", style: { justifyContent: "space-between" } }, h("span", { class: "mono" }, "Meta da semana"), h("b", null, `${feito > 0 ? "+" : ""}${feito} / ${meta}`)),
      h("div", { class: "gbar" }, h("b", { style: { width: pct + "%" } })),
      h("span", { class: "muted small" }, `relatório de ${fmtDateTime(lista[0].created_at)} · abrir`));
  };
  const card = (p) => {
    const rede = redeDe(p), url = urlDe(p, rede), foto = p.foto_url || FOTOS[p.slug];
    return h("article", { class: "panel pf-card", style: { borderTop: `4px solid ${REDES[rede]?.cor || "var(--accent)"}` } },
      h("div", { class: "pf-photo" },
        foto ? h("img", { src: foto, alt: p.handle, loading: "lazy", referrerpolicy: "no-referrer", onerror: (e) => e.target.replaceWith(h("span", { class: "pf-ini" }, iniciais(p.handle))) }) : h("span", { class: "pf-ini" }, iniciais(p.handle)),
        h("div", { class: "pf-over" },
          h("div", { class: "pf-name" }, p.handle),
          h("div", { class: "flex", style: { gap: "6px", marginTop: "6px" } },
            url ? h("a", { class: "pf-net", href: url, target: "_blank", rel: "noopener", title: `Abrir no ${REDES[rede]?.nome || "perfil"}`, "aria-label": `Abrir ${p.handle} no ${REDES[rede]?.nome || "perfil"}` }, netIcon(rede)) : h("span", { class: "pf-net" }, netIcon(rede)),
            h("span", { class: `chip f-${p.fase}`, style: { background: "rgba(0,0,0,.55)" } }, p.fase)))),
      h("div", { class: "panel-body" },
        h("div", { class: "pf-fol" }, h("b", null, p.seguidores != null ? p.seguidores.toLocaleString("pt-BR") : "–"), h("span", { class: "muted small" }, p.seguidores != null ? `seguidores · ${fmtDate(p.seguidores_em.slice(0, 10), false)}` : "seguidores: coleta diária")),
        metaSemana(p),
        h("p", { class: "small muted pf-papel" }, p.papel),
        h("div", { class: "flex wrap", style: { gap: "6px", marginTop: "8px" } }, h("span", { class: "chip" }, `P${p.prioridade}`), p.nome_pendente && h("span", { class: "chip warn" }, "nome pendente"), h("span", { class: "chip" }, p.plataforma)),
        h("div", { class: "flex", style: { marginTop: "10px" } }, h("button", { class: "btn btn-sm", type: "button", onclick: () => verMatriz(p) }, "Matriz"), relDe(p.slug).length ? h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => verRelatorio(p, relDe(p.slug)) }, "Relatório") : null, h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => editPerfil(p) }, "Editar"))));
  };
  const porFase = (f) => perfisL.filter((p) => p.fase === f);

  const ordenados = [...perfisL].sort((a, b) => a.prioridade - b.prioridade || a.ordem - b.ordem);
  return h("div", { class: "page wide" },
    pageHead("PerfiS_", "ecossistema de contas", h("a", { class: "btn btn-ghost btn-sm", href: "#/mapa" }, "Map MentaleS_ →")),
    perfisL.length ? h("div", { class: "pf-grid" }, ...ordenados.map(card)) : h("p", { class: "empty" }, "A matriz dos perfis ainda não foi carregada."),
    h("section", { class: "panel", style: { marginTop: "20px" } }, h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--warn)" } }), h("h2", { class: "mono grow" }, "Pautas e lembretes · hoje, amanhã e atrasadas")),
      h("div", { class: "panel-body" }, h("p", { class: "muted small", style: { marginBottom: "10px" } }, "Aquecimento é sempre ação humana: comentar de verdade, responder, observar. Nada de engajamento comprado ou automação de comentários."), pautaBox)),
    h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, `Meta · ${brl(META.valor)} de faturamento de ${fmtDate(META.inicio, false)} a ${fmtDate(META.fim, false)}`)),
      h("div", { class: "panel-body stack-lg" }, metaBar(m), form,
        porPerfil.length ? h("div", { class: "flex wrap" }, h("span", { class: "mono" }, "por origem:"), ...porPerfil.map(([k2, v]) => h("span", { class: "chip" }, `${nome(k2)} ${brl(v)}`))) : null, recList)));
}
