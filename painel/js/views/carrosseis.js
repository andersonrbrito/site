import { h, todayISO, addDaysISO, fmtDate, fmtDateTime } from "../util.js";
import { pageHead, alertBox, toast, copiarTexto, compartilharTexto, PODE_COMPARTILHAR_TEXTO } from "../ui.js?v=20261112a";
import { CELULAR, ROTULO_GALERIA, salvarNaGaleria, urlParaFile } from "../galeria.js?v=20261112a";
import { W, H, loadFonts, loadImage, loadVideo, draw, recordVideoSlide, PERFIL } from "../carrossel-render.js?v=20261109c";

// Carrosséis diários (identidade do site: escuro, vidro e verde Matrix) para o @ilmarlabs: 2 notícias + 2 educativos por dia.
// Fonte da verdade: tabela "carrosseis" (migration 0028). A rotina diária do Claude cria os rascunhos
// e deixa as mídias em /painel/carrosseis/<slug>/; o que você anexar aqui vai para o Storage privado.
// Antes da migration existir, a tela mostra os carrosséis do repositório (diarios.json) só para leitura.
const BASE = "/painel/carrosseis/";
const BUCKET = "postador-media";
const TIPO = { noticia: "Notícia", educativo: "Educativo", pessoal: "Pessoal" };
const STATUS = { rascunho: "Rascunho", aprovado: "Aprovado", postado: "Postado", descartado: "Descartado" };
const FORMATOS = [["reel", "Reel (9:16)"], ["x", "X (16:9)"], ["ambos", "Os dois"]];
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"];
const COLS = "id, slug, dia, tipo, titulo, perfil, legenda, slides, fontes, notas, status, version, created_at, updated_at";
const json = (u) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const clone = (o) => JSON.parse(JSON.stringify(o));

// URLs assinadas das mídias que você subiu (Storage privado), com cache por 50 min.
const signed = new Map();
async function mediaUrl(sb, m) {
  if (!m) return null;
  if (m.src) return m.src;
  if (!m.path) return null;
  const hit = signed.get(m.path);
  if (hit && hit.until > Date.now()) return hit.url;
  let salvo = null; try { salvo = JSON.parse(localStorage.getItem("cz-signed:" + m.path) || "null"); } catch {}
  if (salvo && salvo.until > Date.now()) { signed.set(m.path, salvo); return salvo.url; }
  // URL estável por 23 h = cache do navegador reaproveita a mídia (menos egresso no Supabase)
  const { data } = await sb.storage.from(BUCKET).createSignedUrl(m.path, 86400);
  if (!data?.signedUrl) return null;
  const v = { url: data.signedUrl, until: Date.now() + 23 * 3600e3 };
  signed.set(m.path, v); try { localStorage.setItem("cz-signed:" + m.path, JSON.stringify(v)); } catch {}
  return data.signedUrl;
}
async function assetsFor(sb, slide) {
  const url = await mediaUrl(sb, slide.midia);
  const avatar = await loadImage(PERFIL.avatar);
  if (!url) return { avatar, media: null };
  if (slide.midia.tipo === "video") {
    const [v, poster] = await Promise.all([loadVideo(url), loadImage(slide.midia.poster)]);
    return { avatar, media: v || poster, poster };
  }
  return { avatar, media: await loadImage(url) };
}

async function loadAll(sb) {
  const [dbR, reqR, seedSlugs, legacySlugs, arqR] = await Promise.all([
    sb.from("carrosseis").select(COLS).is("archived_at", null).order("dia", { ascending: false }).limit(200),
    sb.from("claude_requests").select("id, kind, status, result_note, payload, created_at, done_at").in("kind", ["carrossel_video", "carrossel_novo", "carrossel_ajuste"]).is("archived_at", null).order("created_at", { ascending: false }).limit(100),
    json(BASE + "diarios.json"), json(BASE + "lista.json"),
    sb.from("carrosseis").select("slug").not("archived_at", "is", null).limit(5000),
  ]);
  const arquivados = new Set((arqR?.data || []).map((r) => r.slug)); // postados saem da tela (ficam no banco)
  const dbOn = !dbR.error;
  const todas = dbOn ? dbR.data || [] : [];
  todas.filter((r) => r.status === "postado").forEach((r) => arquivados.add(r.slug)); // postados antigos também saem da tela
  const rows = todas.filter((r) => r.status !== "postado");
  const seeds = (await Promise.all((seedSlugs || []).map((s) => json(`${BASE}${s}/carrossel.json`)))).filter(Boolean);
  const bySlug = new Map(rows.map((r) => [r.slug, { ...r, salvo: true }]));
  for (const s of seeds) if (!bySlug.has(s.slug) && !arquivados.has(s.slug)) bySlug.set(s.slug, { ...s, status: s.status || "rascunho", version: 0, salvo: false });
  const lista = [...bySlug.values()].sort((a, b) => (b.dia || "").localeCompare(a.dia || "") || (a.tipo || "").localeCompare(b.tipo || ""));
  const legacy = (await Promise.all((legacySlugs || []).map((s) => json(`${BASE}${s}/index.json`)))).filter(Boolean);
  const reqs = reqR.error ? [] : reqR.data || [];
  return { dbOn, lista, legacy, pedidos: reqs.filter((r) => r.kind === "carrossel_video"), novos: reqs.filter((r) => r.kind === "carrossel_novo"), ajustes: reqs.filter((r) => r.kind === "carrossel_ajuste") };
}

export default async function carrosseis({ sb, query, go }) {
  await loadFonts();
  const data = await loadAll(sb);
  const atual = data.lista.find((c) => c.slug === query.c);
  if (atual) return editor({ sb, go, c: atual, data });
  const velho = data.legacy.find((c) => c.slug === query.c);
  if (velho) return legacyView(velho, go);
  return listView({ sb, go, query, data });
}

// ───────────────────────── Lista ─────────────────────────
function listView({ sb, go, query, data }) {
  const filtro = ["noticia", "educativo", "pessoal", "descartado", "rascunho", "aprovado", "postado"].includes(query.f) ? query.f : "";
  const hoje = todayISO(), ontem = addDaysISO(hoje, -1);
  const porStatus = ["rascunho", "aprovado", "postado", "descartado"].includes(filtro);
  const itens = data.lista.filter((c) => (porStatus ? c.status === filtro : c.status !== "descartado" && (!filtro || c.tipo === filtro)));
  const nSt = (v) => data.lista.filter((c) => c.status === v).length;
  const porDia = new Map();
  for (const c of itens) { if (!porDia.has(c.dia)) porDia.set(c.dia, []); porDia.get(c.dia).push(c); }
  const nomeDia = (d) => (d === hoje ? "Hoje" : d === ontem ? "Ontem" : fmtDate(d));
  const chip = (f, l) => h("a", { class: "chip" + (filtro === f ? " on" : ""), href: "#/carrosseis" + (f ? "?f=" + f : "") }, l);

  const card = (c) => {
    const cv = h("canvas", { width: 270, height: 338, class: "cz-thumb" });
    queueThumb(sb, c, cv);
    return h("a", { class: "cz-card", href: "#/carrosseis?c=" + c.slug, onclick: (e) => { e.preventDefault(); go("/carrosseis?c=" + c.slug); } },
      cv,
      h("div", { class: "flex wrap", style: { gap: "6px" } }, h("span", { class: "cz-tag " + c.tipo }, TIPO[c.tipo] || c.tipo), h("span", { class: "cz-st " + c.status }, STATUS[c.status] || c.status)),
      h("b", null, c.titulo), h("span", { class: "muted small" }, `${c.slides.length} lâminas · ${c.perfil || "@ilmarlabs"}`));
  };

  return h("div", { class: "page wide" },
    pageHead("CarrosseL_", "2 notícias + 2 educativos por dia · pedidos do PostadoR_ · visual do site · para o @ilmarlabs"),
    !data.dbOn && h("p", { class: "note" }, "A tabela de carrosséis ainda não existe no banco (migration 0028). Dá para ver e baixar, mas edição e pedido de vídeo só funcionam depois de rodar a migration no Supabase."),
    h("div", { class: "flex wrap cz-filtros" }, chip("rascunho", `A aprovar (${nSt("rascunho")})`), chip("aprovado", `Aprovados (${nSt("aprovado")})`), chip("descartado", `Descartados (${nSt("descartado")})`)),
    h("div", { class: "flex wrap cz-filtros" }, chip("", "Todos"), chip("noticia", "Notícias"), chip("educativo", "Educativos"), chip("pessoal", "Pessoais")),
    guiaPostagem(),
    pedidosNovos(data, go),
    porDia.size ? [...porDia].map(([d, cs]) => h("section", { style: { marginBottom: "26px" } },
      h("h2", { class: "mono", style: { margin: "0 0 10px", color: "var(--accent)" } }, nomeDia(d)),
      h("div", { class: "cz-grid" }, ...cs.map(card)))) : h("p", { class: "empty" }, "Nenhum carrossel por aqui ainda. A rotina das 6h45 cria os do dia."),
    data.legacy.length ? h("section", { style: { marginTop: "30px" } },
      h("h2", { class: "mono", style: { margin: "0 0 10px" } }, "Antigos (imagens prontas)"),
      h("div", { class: "carr-grid" }, ...data.legacy.map((c) => h("a", { class: "carr-card", href: "#/carrosseis?c=" + c.slug, onclick: (e) => { e.preventDefault(); go("/carrosseis?c=" + c.slug); } },
        h("img", { src: `${BASE}${c.slug}/${c.slides[0]}`, alt: "", loading: "lazy" }), h("b", null, c.titulo), h("span", { class: "muted small" }, `${c.perfil} · ${c.slides.length} slides`))))) : null);
}

// Orientações de postagem (fica aberto ou fechado do jeito que ele deixou da última vez).
function guiaPostagem() {
  let aberto = true;
  try { aberto = localStorage.getItem("cz-guia") !== "0"; } catch { /* sem storage */ }
  const item = (t, ...rest) => h("li", null, h("b", null, t), " ", ...rest);
  const el = h("details", { class: "panel cz-guia", open: aberto },
    h("summary", null, "Como postar (orientações)"),
    h("div", { class: "panel-body" },
      h("ul", null,
        item("A rotina gera 4 por dia, mas não precisa postar os 4.", "Escolha os melhores. Os outros ficam de reserva: dá pra postar em outro dia ou descartar."),
        item("No feed, 2 por dia:", "1 notícia e 1 educativo. Em collab, cada post aparece nos dois perfis, então 4 por dia lotam o grid do @andersonbrito.mp4 e enterram os Reels."),
        item("Notícia: 11h às 12h30.", "Notícia esfria rápido. Se esfriou, descarta."),
        item("Educativo: 18h30 às 20h30.", "Hora de ler com calma e salvar. Educativo aguenta a semana toda."),
        item("Pelo menos 5 h entre um post e outro,", "inclusive dos Reels do dia. Fim de semana: 1 só, de preferência educativo à tarde."),
        item("Collab:", "aceite o convite no @andersonbrito.mp4 logo depois de postar. Sem aceitar, o post sai só no @ilmarlabs."),
        item("Música:", "use \"Enviar pro iPhone\" e coloque a música no app do Instagram (por API não dá)."),
        item("O que olhar:", "salvamentos e compartilhamentos no educativo, comentários na notícia, visitas ao perfil e seguidores novos nos dois. Views sozinhas enganam."),
        item("Depois de umas 2 semanas,", "veja nos Insights do @ilmarlabs quando os seguidores estão mais ativos e ajuste os horários."))));
  el.addEventListener("toggle", () => { try { localStorage.setItem("cz-guia", el.open ? "1" : "0"); } catch { /* sem storage */ } });
  return el;
}

// Pedidos vindos do PostadoR_ ("Enviar para o CarrosseL_"): fila e os prontos das últimas 48 h.
function pedidosNovos(data, go) {
  const recentes = data.novos.filter((r) => r.status === "aberto" || r.status === "gerando" || (r.done_at && Date.now() - new Date(r.done_at) < 48 * 36e5));
  if (!recentes.length) return null;
  const S = { aberto: "Na fila", gerando: "Montando", feito: "Pronto", cancelado: "Cancelado" };
  const REDE = { x: "X", linkedin: "LinkedIn" };
  return h("section", { class: "panel", style: { marginBottom: "22px" } },
    h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Pedidos do PostadoR_")),
    h("div", { class: "panel-body stack" }, ...recentes.map((r) => {
      const pl = r.payload || {}, slug = (r.result_note || "").match(/carrossel:\s*([a-z0-9-]{3,80})/i)?.[1];
      const pronto = slug && data.lista.find((c) => c.slug === slug);
      const assunto = pl.titulo || (pl.texto || "").split("\n").find((l) => l.trim()) || "(sem texto)";
      return h("div", { class: "cz-ped" },
        h("div", { class: "flex wrap" }, h("span", { class: "cz-st " + (r.status === "feito" ? "aprovado" : "rascunho") }, S[r.status] || r.status),
          h("span", { class: "muted small" }, "rascunho do ", REDE[pl.rede] || pl.rede || "PostadoR_", " · pedido ", fmtDateTime(r.created_at)),
          h("div", { class: "grow" }),
          pronto && h("button", { type: "button", class: "btn btn-sm", onclick: () => go("/carrosseis?c=" + slug) }, "Abrir carrossel")),
        h("p", { class: "small truncate", style: { margin: "6px 0 0" } }, assunto),
        r.result_note && r.status !== "aberto" ? h("p", { class: "muted small", style: { margin: "4px 0 0", whiteSpace: "pre-wrap" } }, r.result_note.replace(/carrossel:\s*[a-z0-9-]+/i, "").trim()) : null);
    })));
}

// Miniaturas: desenha a lâmina 1 num canvas grande compartilhado e reduz (uma de cada vez).
const big = Object.assign(document.createElement("canvas"), { width: W, height: H });
let thumbChain = Promise.resolve();
function queueThumb(sb, c, cv) {
  thumbChain = thumbChain.then(async () => {
    const s = c.slides[0]; if (!s) return;
    const a = await assetsFor(sb, s);
    draw(big.getContext("2d"), s, 0, a, { total: c.slides.length, tipo: c.tipo });
    cv.getContext("2d").drawImage(big, 0, 0, cv.width, cv.height);
  }).catch(() => {});
}

// ───────────────────────── Editor ─────────────────────────
function editor({ sb, go, c, data }) {
  const st = clone(c);
  let sel = 0, saving = false, dirty = false, timer = null;
  const canvases = [], assets = [];
  const saveInfo = h("span", { class: "mono muted" }, st.salvo ? "Salvo" : data.dbOn ? "Ainda não está no banco" : "Só leitura");

  // ── salvar (insert na primeira vez, depois update com versão) ──
  async function save() {
    if (!data.dbOn) { saveInfo.textContent = "Sem banco: rode a migration 0028"; return; }
    if (saving) { dirty = true; return; }
    saving = true; dirty = false; saveInfo.textContent = "Salvando…";
    const body = { titulo: st.titulo, legenda: st.legenda || null, slides: st.slides, fontes: st.fontes || [], notas: st.notas || null, status: st.status };
    let res;
    if (!st.salvo) res = await sb.from("carrosseis").insert({ slug: st.slug, dia: st.dia, tipo: st.tipo, perfil: st.perfil || "@ilmarlabs", ...body }).select("id, version").maybeSingle();
    else res = await sb.from("carrosseis").update(body).eq("id", st.id).eq("version", st.version).select("version").maybeSingle();
    saving = false;
    if (res.error || !res.data) {
      saveInfo.textContent = "Não salvou";
      toast(res.error ? "Não salvou: " + res.error.message : "Este carrossel mudou em outro lugar. Recarregue a página antes de editar.", { kind: "err" });
      return;
    }
    if (!st.salvo) { st.id = res.data.id; st.salvo = true; }
    st.version = res.data.version;
    saveInfo.textContent = "Salvo";
    if (dirty) save();
  }
  const touch = () => { saveInfo.textContent = "Editando…"; clearTimeout(timer); timer = setTimeout(save, 900); };

  // ── prévias ──
  const info = () => ({ total: st.slides.length, tipo: st.tipo });
  const strip = h("div", { class: "cz-strip" });
  let playing = null;
  async function renderSlide(i, reload = false) {
    if (reload || !assets[i]) assets[i] = await assetsFor(sb, st.slides[i]);
    const cv = canvases[i]; if (!cv) return;
    draw(cv.getContext("2d"), st.slides[i], i, { ...assets[i], playing: playing === i }, info());
  }
  function buildStrip() {
    canvases.length = 0;
    strip.replaceChildren(...st.slides.map((s, i) => {
      const cv = h("canvas", { width: W, height: H });
      canvases[i] = cv;
      const fig = h("button", { type: "button", class: "cz-slide" + (i === sel ? " on" : ""), onclick: () => select(i), "aria-label": `Lâmina ${i + 1}` },
        cv, h("span", { class: "mono" }, String(i + 1).padStart(2, "0"), s.midia?.tipo === "video" ? " · vídeo" : ""));
      return fig;
    }));
    st.slides.forEach((_, i) => renderSlide(i));
  }
  function playLoop(i) {
    const v = assets[i]?.media;
    if (!(v instanceof HTMLVideoElement)) return;
    playing = i; v.muted = true; v.loop = true; v.play().catch(() => {});
    const tick = () => { if (playing !== i || !canvases[i]?.isConnected) { v.pause(); return; } draw(canvases[i].getContext("2d"), st.slides[i], i, { ...assets[i], playing: true }, info()); requestAnimationFrame(tick); };
    tick();
  }
  function select(i) {
    if (playing !== null && playing !== i) { const p = playing; playing = null; renderSlide(p); }
    sel = i;
    strip.querySelectorAll(".cz-slide").forEach((b, k) => b.classList.toggle("on", k === i));
    if (st.slides[i]?.midia?.tipo === "video") assetsFor(sb, st.slides[i]).then((a) => { assets[i] = a; playLoop(i); });
    drawForm();
  }

  // ── formulário da lâmina selecionada ──
  const form = h("div", { class: "cz-form" });
  const fileIn = h("input", { type: "file", accept: OK_TYPES.join(","), hidden: true });
  fileIn.addEventListener("change", () => { const f = fileIn.files[0]; fileIn.value = ""; if (f) uploadMedia(f); });
  async function uploadMedia(f) {
    if (!data.dbOn) return toast("Rode a migration 0028 para poder anexar.", { kind: "err" });
    if (!OK_TYPES.includes(f.type)) return toast("Formato não suportado.", { kind: "err" });
    const i = sel, path = `carrosseis/${st.slug}/${crypto.randomUUID()}.${f.name.split(".").pop().toLowerCase()}`;
    toast("Enviando mídia…");
    const { error } = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type, upsert: false });
    if (error) return toast("Não anexou: " + error.message, { kind: "err" });
    st.slides[i].midia = { tipo: f.type.startsWith("video/") ? "video" : "imagem", path, mime: f.type, foco: 0.5 };
    await renderSlide(i, true); drawForm(); touch();
    if (st.slides[i].midia.tipo === "video") playLoop(i);
  }
  function drawForm() {
    const s = st.slides[sel];
    if (!s) { form.replaceChildren(h("p", { class: "muted" }, "Sem lâminas.")); return; }
    const redraw = () => { renderSlide(sel); touch(); };
    const ta = h("textarea", { class: "textarea", rows: 7, "aria-label": "Texto da lâmina" }); ta.value = s.texto || "";
    ta.addEventListener("input", () => { s.texto = ta.value; redraw(); });
    const rod = h("input", { class: "input", placeholder: "ex.: arrasta pro lado →", value: s.rodape || "" });
    rod.addEventListener("input", () => { s.rodape = rod.value || undefined; redraw(); });
    const cred = h("input", { class: "input", placeholder: "ex.: imagem: Anthropic", value: s.midia?.credito || "" });
    cred.addEventListener("input", () => { if (s.midia) { s.midia.credito = cred.value || undefined; redraw(); } });
    const foco = h("input", { type: "range", min: 0, max: 100, value: Math.round((s.midia?.foco ?? 0.5) * 100), class: "cz-range" });
    foco.addEventListener("input", () => { if (s.midia) { s.midia.foco = foco.value / 100; redraw(); } });
    const move = (d) => { const j = sel + d; if (j < 0 || j >= st.slides.length) return; [st.slides[sel], st.slides[j]] = [st.slides[j], st.slides[sel]]; [assets[sel], assets[j]] = [assets[j], assets[sel]]; sel = j; buildStrip(); drawForm(); touch(); };
    const dup = () => { st.slides.splice(sel + 1, 0, clone(s)); assets.splice(sel + 1, 0, assets[sel]); sel++; buildStrip(); drawForm(); touch(); };
    const del = () => { if (st.slides.length <= 1) return toast("O carrossel precisa de pelo menos uma lâmina.", { kind: "err" }); if (!confirm(`Tirar a lâmina ${sel + 1}?`)) return; st.slides.splice(sel, 1); assets.splice(sel, 1); sel = Math.max(0, sel - 1); buildStrip(); drawForm(); touch(); };
    const nova = () => { st.slides.splice(sel + 1, 0, { texto: "Novo texto", midia: null }); assets.splice(sel + 1, 0, null); sel++; buildStrip(); drawForm(); touch(); };
    // pegar a mídia de outra lâmina: "trocar" inverte as duas; "copiar" repete a outra aqui
    const outras = st.slides.map((x, j) => [x, j]).filter(([x, j]) => j !== sel && x.midia);
    const origem = h("select", { class: "input", "aria-label": "Lâmina de onde pegar a mídia" }, ...outras.map(([x, j]) => h("option", { value: j }, `Lâmina ${j + 1}${x.midia.tipo === "video" ? " (vídeo)" : ""}`)));
    const pegar = (trocar) => {
      const j = Number(origem.value); if (Number.isNaN(j)) return;
      const mj = clone(st.slides[j].midia), aj = assets[j];
      if (trocar) { st.slides[j].midia = s.midia ? clone(s.midia) : null; assets[j] = assets[sel]; renderSlide(j); }
      s.midia = mj; assets[sel] = aj; renderSlide(sel, true); buildStrip(); drawForm(); touch();
      toast(trocar ? `Mídias das lâminas ${sel + 1} e ${j + 1} trocadas.` : `Mídia da lâmina ${j + 1} copiada para a ${sel + 1}.`);
    };
    const semMidia = () => { s.midia = null; renderSlide(sel, true); drawForm(); touch(); };
    form.replaceChildren(
      h("b", null, `Lâmina ${sel + 1} de ${st.slides.length}`),
      h("label", { class: "field" }, h("span", null, "Texto ", h("span", { class: "muted small" }, "(**assim** fica em negrito)")), ta),
      h("label", { class: "field" }, "Rodapé (opcional)", rod),
      h("div", { class: "field" }, h("span", null, "Mídia ", h("span", { class: "muted small" }, s.midia ? (s.midia.tipo === "video" ? "vídeo" : "imagem") + (s.midia.path ? " enviada por você" : "") : "nenhuma (toda lâmina deve ter ilustração)")),
        h("div", { class: "flex wrap" },
          h("button", { type: "button", class: "btn btn-sm", onclick: () => fileIn.click() }, s.midia ? "Trocar imagem ou vídeo" : "Anexar imagem ou vídeo"),
          s.midia && h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: semMidia }, "Remover mídia"), fileIn)),
      outras.length ? h("div", { class: "field" }, h("span", null, "Pegar mídia de outra lâmina"),
        h("div", { class: "flex wrap" }, origem,
          h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => pegar(true) }, "Trocar com esta"),
          h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => pegar(false) }, "Copiar para esta"))) : null,
      s.midia && h("label", { class: "field" }, "Recorte da mídia (cima ↔ baixo)", foco),
      s.midia && h("label", { class: "field" }, "Crédito da mídia", cred),
      h("div", { class: "cz-grp", style: { marginTop: "6px" } }, h("span", { class: "mono" }, "Esta lâmina"),
        h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => move(-1), disabled: sel === 0 }, "← Mover"),
        h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => move(1), disabled: sel === st.slides.length - 1 }, "Mover →"),
        h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: dup }, "Duplicar"),
        h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: nova }, "+ Lâmina depois"),
        h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: (e) => baixar([sel], e.currentTarget) }, CELULAR ? ROTULO_GALERIA : s.midia?.tipo === "video" ? "Baixar (vídeo)" : "Baixar (PNG)"),
        h("button", { type: "button", class: "btn btn-ghost btn-sm cz-del", onclick: del }, "Tirar lâmina")));
    if (!data.dbOn) form.querySelectorAll("textarea,input,button").forEach((el) => { if (!/Baixar|galeria/.test(el.textContent)) el.disabled = true; });
  }

  // ── arquivos das lâminas (imagem: PNG ou JPG; lâmina com vídeo: gravada em MP4) ──
  async function gerarArquivo(i, formato, onInfo) {
    const a = await assetsFor(sb, st.slides[i]);
    const nome = `${st.slug}-${String(i + 1).padStart(2, "0")}`;
    if (st.slides[i].midia?.tipo === "video" && a.media instanceof HTMLVideoElement) {
      if (playing === i) playing = null;
      const blob = await recordVideoSlide(st.slides[i], i, a, (p) => onInfo(`Gravando lâmina ${i + 1}… ${Math.round(p * 100)}%`), info());
      assets[i] = null; renderSlide(i);
      return new File([blob], `${nome}.${blob.type.includes("mp4") ? "mp4" : "webm"}`, { type: blob.type });
    }
    onInfo(`Gerando ${i + 1}…`);
    const cv = Object.assign(document.createElement("canvas"), { width: W, height: H });
    draw(cv.getContext("2d"), st.slides[i], i, a, info());
    const tipo = formato === "jpg" ? "image/jpeg" : "image/png";
    const blob = await new Promise((r) => cv.toBlob(r, tipo, 0.95));
    if (!blob) throw new Error("imagem bloqueada pelo navegador");
    return new File([blob], `${nome}.${formato}`, { type: tipo });
  }

  // ── downloads ──
  const salvarArquivo = (blob, nome) => { const a = h("a", { href: URL.createObjectURL(blob), download: nome }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); };
  // No celular: JPG pela folha de compartilhar (vai pra galeria). Guarda o que já gerou para o toque abrir na hora.
  const jpgs = new Map();
  async function jpgCel(i, onInfo) {
    const k = JSON.stringify([i, st.slides.length, st.slides[i]]);
    if (!jpgs.has(k)) jpgs.set(k, await gerarArquivo(i, "jpg", onInfo));
    return jpgs.get(k);
  }
  async function preGerarCel() { // lâminas de imagem ficam prontas em segundo plano; vídeo só grava quando pedir
    for (let i = 0; i < st.slides.length; i++) {
      if (st.slides[i].midia?.tipo === "video") continue;
      try { await jpgCel(i, () => {}); } catch { /* gera de novo no toque */ }
    }
  }
  async function baixar(idxs, btn) {
    if (CELULAR) return salvarNaGaleria(btn, async (info) => { const fs = []; for (const i of idxs) fs.push(await jpgCel(i, info)); return fs; });
    const label = btn.textContent; btn.disabled = true;
    try {
      for (const i of idxs) {
        const f = await gerarArquivo(i, "png", (t) => { btn.textContent = t; });
        salvarArquivo(f, f.name);
        await new Promise((r) => setTimeout(r, 350));
      }
      toast(idxs.length > 1 ? "Lâminas baixadas." : "Lâmina baixada.");
    } catch (e) { toast("Não deu para baixar: " + e.message, { kind: "err" }); }
    finally { btn.disabled = false; btn.textContent = label; }
  }

  // ── enviar pro iPhone: folha de compartilhar do sistema (no iPhone "Salvar imagens" vai pra galeria; no Mac, AirDrop) ──
  // O compartilhar exige um toque recente: se as lâminas demorarem (vídeo), o botão pede um segundo toque com tudo pronto.
  let pacote = null;
  const iphone = h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => enviarIphone() }, "Enviar pro iPhone");
  async function compartilhar() {
    try {
      await navigator.share({ files: pacote, title: st.titulo });
      toast(st.legenda ? "Enviado. A legenda está copiada: é só colar no Instagram." : "Enviado.");
      pacote = null; delete iphone.dataset.tentou; iphone.textContent = "Enviar pro iPhone";
    } catch (e) {
      if (e.name === "AbortError") return;
      if (e.name === "NotAllowedError") {
        if (iphone.dataset.tentou) { // 2ª recusa: o navegador não deixa; baixa as lâminas para não travar
          delete iphone.dataset.tentou; pacote = null; iphone.textContent = "Enviar pro iPhone";
          toast("O navegador bloqueou o compartilhar. Baixei as lâminas; no iPhone use o Safari.", { kind: "err" });
          return baixar(st.slides.map((_, i) => i), baixarTudo);
        }
        iphone.dataset.tentou = "1"; iphone.textContent = `Tocar de novo para enviar (${pacote.length})`; return toast("Lâminas prontas. Toque de novo para abrir o compartilhar.");
      }
      toast("Não deu para compartilhar: " + e.message, { kind: "err" });
    }
  }
  async function enviarIphone() {
    // 2º toque: abre o compartilhar na hora. Nada antes (copiar a legenda gastava a permissão do toque e o botão travava).
    if (pacote) return compartilhar();
    if (st.legenda) copiarTexto(st.legenda, "Legenda copiada."); // 1º toque: copia já, antes de gerar as lâminas
    if (!navigator.canShare) {
      toast("Este navegador não abre o compartilhar com arquivos. Abra o painel no Safari do iPhone ou do Mac. Baixando as lâminas aqui.", { kind: "err" });
      return baixar(st.slides.map((_, i) => i), baixarTudo);
    }
    iphone.disabled = true;
    try {
      const files = [];
      for (let i = 0; i < st.slides.length; i++) files.push(await gerarArquivo(i, "jpg", (t) => { iphone.textContent = t; }));
      if (!navigator.canShare({ files })) throw new Error("o navegador recusou estes arquivos");
      pacote = files;
    } catch (e) { iphone.textContent = "Enviar pro iPhone"; toast("Não preparou as lâminas: " + e.message, { kind: "err" }); return; }
    finally { iphone.disabled = false; }
    iphone.textContent = `Tocar de novo para enviar (${pacote.length})`;
    return compartilhar();
  }

  // ── transformar em vídeo (pedido pro Claude) ──
  const pedidosDeste = data.pedidos.filter((p) => p.payload?.slug === st.slug);
  const videoBox = h("div", { class: "cz-video", hidden: true });
  function abrirVideo() {
    if (!data.dbOn) return toast("Rode a migration 0028 para pedir vídeo.", { kind: "err" });
    let fmt = "reel";
    const obs = h("textarea", { class: "textarea", rows: 2, placeholder: "Observação (opcional): ex.: mais meme, ritmo mais rápido, gancho com o enterro" });
    const opts = h("div", { class: "flex wrap" }, ...FORMATOS.map(([v, l]) => h("label", { class: "cz-opt" }, h("input", { type: "radio", name: "cz-fmt", value: v, checked: v === fmt, onchange: () => { fmt = v; } }), l)));
    const enviar = h("button", { type: "button", class: "btn btn-sm", onclick: async () => {
      enviar.disabled = true; enviar.textContent = "Enviando…";
      if (timer) { clearTimeout(timer); await save(); }
      // mídias suas (Storage privado) viajam como link assinado de 7 dias, para a rotina conseguir baixar
      const slides = clone(st.slides);
      for (const s of slides) if (s.midia?.path) { const { data: d } = await sb.storage.from(BUCKET).createSignedUrl(s.midia.path, 7 * 86400); if (d) s.midia.url_assinada = d.signedUrl; }
      const payload = { slug: st.slug, carrossel_id: st.id || null, formatos: fmt === "ambos" ? ["reel", "x"] : [fmt], obs: obs.value.trim() || null, carrossel: { titulo: st.titulo, tipo: st.tipo, legenda: st.legenda, fontes: st.fontes, slides } };
      const { error } = await sb.from("claude_requests").insert({ kind: "carrossel_video", payload });
      enviar.disabled = false; enviar.textContent = "Pedir vídeo";
      if (error) return toast("Não enviou: " + error.message, { kind: "err" });
      toast("Pedido enviado. O Claude pega na próxima rodada (a cada 2 h, das 7h às 23h). Pode levar até 1 h depois de começar.");
      videoBox.hidden = true;
      pedidosDeste.unshift({ status: "aberto", created_at: new Date().toISOString(), payload });
      drawPedidos();
    } }, "Pedir vídeo");
    videoBox.replaceChildren(
      h("b", null, "Transformar em vídeo"),
      h("p", { class: "muted small", style: { margin: "4px 0 10px" } }, "O Claude monta o vídeo em motion a partir destas lâminas, com a sua voz clonada (ElevenLabs no Magnific), trilha viral e SFX. O vídeo aparece aqui embaixo quando ficar pronto."),
      opts, obs, h("div", { class: "flex", style: { marginTop: "8px" } }, enviar, h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => { videoBox.hidden = true; } }, "Cancelar")));
    videoBox.hidden = false;
  }
  const pedidosBox = h("div");
  // ── pedir alteração do conteúdo (pedido pro Claude, rotina carrosseis-pedidos) ──
  const ajustesDeste = (data.ajustes || []).filter((p) => p.payload?.slug === st.slug);
  const ajusteBox = h("div", { class: "cz-video", hidden: true });
  function abrirAjuste() {
    if (!data.dbOn) return toast("Rode a migration 0028 para pedir alteração.", { kind: "err" });
    const txt = h("textarea", { class: "textarea", rows: 4, placeholder: "O que mudar? Ex.: lâmina 3 com dado mais recente; trocar o meme da 5; hook mais curto; nova ilustração na 2." });
    const env = h("button", { type: "button", class: "btn btn-sm", onclick: async () => {
      if (!txt.value.trim()) return toast("Escreva o que mudar.", { kind: "err" });
      env.disabled = true;
      if (timer) { clearTimeout(timer); await save(); }
      const payload = { slug: st.slug, carrossel_id: st.id || null, lamina: sel + 1, pedido: txt.value.trim() };
      const { error } = await sb.from("claude_requests").insert({ kind: "carrossel_ajuste", payload });
      env.disabled = false;
      if (error) return toast(/check/.test(error.message) ? "Rode a migration 0038 no Supabase para liberar o pedido de alteração." : "Não enviou: " + error.message, { kind: "err" });
      toast("Pedido enviado. O Claude ajusta na próxima rodada (a cada 2 h, das 7h às 23h).");
      ajusteBox.hidden = true; ajustesDeste.unshift({ status: "aberto", created_at: new Date().toISOString(), payload }); drawAjustes();
    } }, "Enviar pedido");
    ajusteBox.replaceChildren(h("b", null, "Pedir alteração"),
      h("p", { class: "muted small", style: { margin: "4px 0 10px" } }, `O Claude refaz o que você pedir (texto, ilustração, ordem) e salva aqui. Você está na lâmina ${sel + 1}; cite o número se for outra.`),
      txt, h("div", { class: "flex", style: { marginTop: "8px" } }, env, h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => { ajusteBox.hidden = true; } }, "Cancelar")));
    ajusteBox.hidden = false; txt.focus();
  }
  const ajustesBox = h("div");
  function drawAjustes() {
    ajustesBox.replaceChildren(...(ajustesDeste.length ? [h("section", { class: "panel", style: { marginTop: "16px" } },
      h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Alterações pedidas")),
      h("div", { class: "panel-body stack" }, ...ajustesDeste.map((p) => h("div", { class: "stack", style: { gap: "2px" } },
        h("span", { class: "small" }, h("b", null, p.status === "feito" ? "Feito" : p.status === "gerando" ? "Ajustando…" : "Na fila"), " · ", fmtDateTime(p.created_at)),
        h("span", { class: "muted small", style: { whiteSpace: "pre-wrap" } }, p.payload?.pedido || ""),
        p.result_note ? h("span", { class: "small", style: { whiteSpace: "pre-wrap" } }, p.result_note) : null))))] : []));
  }
  function drawPedidos() {
    if (!pedidosDeste.length) { pedidosBox.replaceChildren(); return; }
    const S = { aberto: "Na fila", gerando: "Gerando", feito: "Pronto", cancelado: "Cancelado" };
    pedidosBox.replaceChildren(h("section", { class: "panel", style: { marginTop: "16px" } },
      h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Vídeos pedidos")),
      h("div", { class: "panel-body stack" }, ...pedidosDeste.map((p) => {
        const vids = (p.result_note || "").match(/\/painel\/carrosseis\/[\w./-]+\.mp4/g) || [];
        return h("div", { class: "cz-ped" },
          h("div", { class: "flex wrap" }, h("span", { class: "cz-st " + (p.status === "feito" ? "aprovado" : "rascunho") }, S[p.status] || p.status),
            h("span", { class: "muted small" }, (p.payload?.formatos || []).map((f) => (f === "x" ? "X" : "Reel")).join(" + "), " · pedido ", fmtDateTime(p.created_at))),
          p.result_note && h("p", { class: "small", style: { margin: "6px 0 0", whiteSpace: "pre-wrap" } }, p.result_note.replace(/\/painel\/carrosseis\/[\w./-]+\.mp4/g, "").trim()),
          vids.length ? h("div", { class: "cz-vids" }, ...vids.map((u) => h("div", null, h("video", { src: u, controls: true, playsinline: true, preload: "metadata" }), CELULAR
            ? h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: (e) => salvarNaGaleria(e.currentTarget, async () => [await urlParaFile(u, u.split("/").pop())]) }, ROTULO_GALERIA)
            : h("a", { class: "small", href: u, download: "" }, "Baixar")))) : null);
      }))));
  }

  // ── cabeçalho, legenda, fontes ──
  const titulo = h("input", { class: "input cz-title", value: st.titulo, "aria-label": "Título interno" });
  titulo.addEventListener("input", () => { st.titulo = titulo.value || "Sem título"; touch(); });
  // ── decisão: um lugar só, com o status atual e os botões que fazem sentido para ele ──
  const decisao = h("div", { class: "cz-decide" });
  async function setStatus(v, msg) {
    if (!data.dbOn) return toast("Rode a migration 0028 para mudar o status.", { kind: "err" });
    const antes = st.status; st.status = v; clearTimeout(timer); await save();
    if (saveInfo.textContent !== "Salvo") { st.status = antes; drawDecisao(); return; }
    if (v === "postado") { // postado sai da tela para não pesar; o registro fica no banco (arquivado)
      const { error } = await sb.from("carrosseis").update({ archived_at: new Date().toISOString() }).eq("id", st.id).eq("version", st.version);
      if (error) return toast("Marcou como postado, mas não tirou da tela: " + error.message, { kind: "err" });
      toast("Postado. Saiu da lista do CarrosseL_ (continua guardado no banco).");
      return go("/carrosseis");
    }
    drawDecisao(); toast(msg, { actionLabel: "Desfazer", onAction: () => setStatus(antes, "Voltou.") });
  }
  function drawDecisao() {
    const b = (l, v, msg, cls = "btn-ghost") => h("button", { type: "button", class: `btn btn-sm ${cls}`, onclick: () => setStatus(v, msg) }, l);
    decisao.replaceChildren(
      h("span", { class: "cz-st " + st.status }, STATUS[st.status] || st.status),
      ...(st.status === "rascunho" ? [b("Aprovar", "aprovado", "Aprovado. Pronto para postar.", "ap-ok"), b("Descartar", "descartado", "Descartado.")]
        : st.status === "aprovado" ? [b("Marcar como postado", "postado", "Marcado como postado.", "ap-ok"), b("Voltar para rascunho", "rascunho", "Voltou para rascunho.")]
        : [b("Voltar para rascunho", "rascunho", "Voltou para rascunho.")]),
      h("span", { class: "grow" }), saveInfo);
  }
  drawDecisao();
  const leg = h("textarea", { class: "textarea", rows: 8 }); leg.value = st.legenda || "";
  leg.addEventListener("input", () => { st.legenda = leg.value; touch(); });
  const copiar = () => copiarTexto(st.legenda || "", "Legenda copiada.");
  const baixarTudo = h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: (e) => baixar(st.slides.map((_, i) => i), e.currentTarget) }, CELULAR ? "Salvar lâminas na galeria" : "Baixar lâminas");
  if (!data.dbOn) [titulo, leg].forEach((el) => { el.disabled = true; });

  buildStrip(); drawForm(); drawPedidos(); drawAjustes();
  if (st.slides[0]?.midia?.tipo === "video") select(0);
  if (CELULAR) setTimeout(preGerarCel, 1500);

  return h("div", { class: "page wide" },
    pageHead(st.titulo, `${TIPO[st.tipo] || st.tipo} · ${st.perfil || "@ilmarlabs"} · ${fmtDate(st.dia)} · 1080×1350`),
    !data.dbOn && h("p", { class: "note" }, "Modo leitura: rode a migration 0028 no Supabase para editar e pedir vídeo."),
    h("a", { class: "cz-back mono", href: "#/carrosseis", onclick: (e) => { e.preventDefault(); go("/carrosseis"); } }, "← Todos os carrosséis"),
    h("div", { class: "panel cz-bar" },
      decisao,
      h("div", { class: "cz-acts" },
        h("div", { class: "cz-grp" }, h("span", { class: "mono" }, "Postar"), CELULAR ? null : iphone, h("button", { class: "btn btn-sm ap-copy", type: "button", onclick: copiar }, "Copiar legenda"),
          PODE_COMPARTILHAR_TEXTO && st.legenda ? h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => compartilharTexto(st.legenda) }, CELULAR ? "Compartilhar legenda" : "Legenda por AirDrop") : null,
          baixarTudo),
        h("div", { class: "cz-grp" }, h("span", { class: "mono" }, "Criar"), h("button", { class: "btn btn-sm", type: "button", onclick: abrirAjuste }, "Pedir alteração"), h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: abrirVideo }, "Transformar em vídeo")))),
    ajusteBox,
    videoBox,
    strip,
    h("div", { class: "cz-edit" },
      form,
      h("div", { class: "cz-side" },
        h("label", { class: "field" }, "Título interno", titulo),
        h("label", { class: "field" }, "Legenda do post", leg),
        st.fontes?.length ? h("div", { class: "field" }, h("span", null, "Fontes"), h("ul", { class: "cz-fontes" }, ...st.fontes.map((f) => h("li", null, h("a", { href: f.url, target: "_blank", rel: "noopener" }, f.titulo || f.url))))) : null,
        st.notas ? h("p", { class: "muted small", style: { whiteSpace: "pre-wrap" } }, st.notas) : null)),
    ajustesBox,
    pedidosBox);
}

// Carrosséis antigos (JPGs/MP4 prontos, sem edição): legenda no topo, baixar/salvar tudo ou lâmina por lâmina.
function legacyView(atual, go) {
  const url = (f) => `${BASE}${atual.slug}/${f}`;
  const nome = (f) => `${atual.slug}-${f}`;
  const copiar = () => copiarTexto(atual.legenda || "", "Legenda copiada.");
  const baixarLink = (f) => { const a = h("a", { href: url(f), download: nome(f) }); document.body.append(a); a.click(); setTimeout(() => a.remove(), 2000); };
  async function salvar(fs, btn) {
    if (CELULAR) return salvarNaGaleria(btn, async (info) => { const out = []; for (const [k, f] of fs.entries()) { info(`Preparando ${k + 1}/${fs.length}…`); out.push(await urlParaFile(url(f), nome(f))); } return out; });
    for (const f of fs) { baixarLink(f); await new Promise((r) => setTimeout(r, 350)); }
    toast(fs.length > 1 ? "Lâminas baixadas." : "Lâmina baixada.");
  }
  const tudo = h("button", { class: "btn btn-sm", type: "button", onclick: (e) => salvar(atual.slides, e.currentTarget) }, CELULAR ? "Salvar lâminas na galeria" : "Baixar lâminas");
  return h("div", { class: "page wide" },
    pageHead(atual.titulo, `${atual.perfil} · ${atual.slides.length} slides · 1080×1350`),
    h("div", { class: "flex wrap", style: { gap: "8px", marginBottom: "14px" } },
      h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => go("/carrosseis") }, "← Todos"),
      atual.legenda ? h("button", { class: "btn btn-sm ap-copy", type: "button", onclick: copiar }, "Copiar legenda") : null,
      PODE_COMPARTILHAR_TEXTO && atual.legenda ? h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => compartilharTexto(atual.legenda) }, CELULAR ? "Compartilhar legenda" : "Legenda por AirDrop") : null,
      tudo),
    h("section", { class: "panel", style: { marginBottom: "16px" } }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Legenda")),
      h("div", { class: "panel-body" }, h("p", { style: { whiteSpace: "pre-wrap", margin: 0 } }, atual.legenda || "Este carrossel não tem legenda salva."))),
    h("div", { class: "carr-strip" }, ...atual.slides.map((f, i) => h("div", { class: "carr-slide" },
      /\.(mp4|mov)$/i.test(f)
        ? h("video", { src: url(f), poster: url(f.replace(/\.\w+$/, ".jpg")), muted: true, loop: true, playsinline: true, autoplay: true, preload: "metadata" })
        : h("img", { src: url(f), alt: `Slide ${i + 1}`, loading: "lazy" }),
      h("span", { class: "mono" }, String(i + 1).padStart(2, "0")),
      h("button", { class: "btn btn-ghost btn-sm", type: "button", style: { marginTop: "6px", width: "100%" }, onclick: (e) => salvar([f], e.currentTarget) }, CELULAR ? ROTULO_GALERIA : /\.(mp4|mov)$/i.test(f) ? "Baixar (vídeo)" : "Baixar")))));
}
