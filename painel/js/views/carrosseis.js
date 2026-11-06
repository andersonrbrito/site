import { h, todayISO, addDaysISO, fmtDate, fmtDateTime } from "../util.js";
import { pageHead, alertBox, toast } from "../ui.js";
import { W, H, loadFonts, loadImage, loadVideo, draw, recordVideoSlide, PERFIL } from "../carrossel-render.js?v=20261105d";

// Carrosséis diários (estilo print de tweet) para o @ilmarlabs: 2 notícias + 2 educativos por dia.
// Fonte da verdade: tabela "carrosseis" (migration 0028). A rotina diária do Claude cria os rascunhos
// e deixa as mídias em /painel/carrosseis/<slug>/; o que você anexar aqui vai para o Storage privado.
// Antes da migration existir, a tela mostra os carrosséis do repositório (diarios.json) só para leitura.
const BASE = "/painel/carrosseis/";
const BUCKET = "postador-media";
const TIPO = { noticia: "Notícia", educativo: "Educativo" };
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
  const { data } = await sb.storage.from(BUCKET).createSignedUrl(m.path, 3600);
  if (!data?.signedUrl) return null;
  signed.set(m.path, { url: data.signedUrl, until: Date.now() + 50 * 6e4 });
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
  const [dbR, reqR, seedSlugs, legacySlugs] = await Promise.all([
    sb.from("carrosseis").select(COLS).is("archived_at", null).order("dia", { ascending: false }).limit(200),
    sb.from("claude_requests").select("id, status, result_note, payload, created_at, done_at").eq("kind", "carrossel_video").is("archived_at", null).order("created_at", { ascending: false }).limit(100),
    json(BASE + "diarios.json"), json(BASE + "lista.json"),
  ]);
  const dbOn = !dbR.error;
  const rows = dbOn ? dbR.data || [] : [];
  const seeds = (await Promise.all((seedSlugs || []).map((s) => json(`${BASE}${s}/carrossel.json`)))).filter(Boolean);
  const bySlug = new Map(rows.map((r) => [r.slug, { ...r, salvo: true }]));
  for (const s of seeds) if (!bySlug.has(s.slug)) bySlug.set(s.slug, { ...s, status: s.status || "rascunho", version: 0, salvo: false });
  const lista = [...bySlug.values()].sort((a, b) => (b.dia || "").localeCompare(a.dia || "") || (a.tipo || "").localeCompare(b.tipo || ""));
  const legacy = (await Promise.all((legacySlugs || []).map((s) => json(`${BASE}${s}/index.json`)))).filter(Boolean);
  return { dbOn, lista, legacy, pedidos: reqR.error ? [] : reqR.data || [] };
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
  const filtro = ["noticia", "educativo", "descartado"].includes(query.f) ? query.f : "";
  const hoje = todayISO(), ontem = addDaysISO(hoje, -1);
  const itens = data.lista.filter((c) => (filtro === "descartado" ? c.status === "descartado" : c.status !== "descartado" && (!filtro || c.tipo === filtro)));
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
    pageHead("Carrosséis", "2 notícias + 2 educativos por dia · estilo print de tweet · para o @ilmarlabs"),
    !data.dbOn && h("p", { class: "note" }, "A tabela de carrosséis ainda não existe no banco (migration 0028). Dá para ver e baixar, mas edição e pedido de vídeo só funcionam depois de rodar a migration no Supabase."),
    h("div", { class: "flex wrap", style: { marginBottom: "16px" } }, chip("", "Todos"), chip("noticia", "Notícias"), chip("educativo", "Educativos"), chip("descartado", "Descartados")),
    porDia.size ? [...porDia].map(([d, cs]) => h("section", { style: { marginBottom: "26px" } },
      h("h2", { class: "mono", style: { margin: "0 0 10px", color: "var(--accent)" } }, nomeDia(d)),
      h("div", { class: "cz-grid" }, ...cs.map(card)))) : h("p", { class: "empty" }, "Nenhum carrossel por aqui ainda. A rotina das 6h30 cria os do dia."),
    data.legacy.length ? h("section", { style: { marginTop: "30px" } },
      h("h2", { class: "mono", style: { margin: "0 0 10px" } }, "Antigos (imagens prontas)"),
      h("div", { class: "carr-grid" }, ...data.legacy.map((c) => h("a", { class: "carr-card", href: "#/carrosseis?c=" + c.slug, onclick: (e) => { e.preventDefault(); go("/carrosseis?c=" + c.slug); } },
        h("img", { src: `${BASE}${c.slug}/${c.slides[0]}`, alt: "", loading: "lazy" }), h("b", null, c.titulo), h("span", { class: "muted small" }, `${c.perfil} · ${c.slides.length} slides`))))) : null);
}

// Miniaturas: desenha a lâmina 1 num canvas grande compartilhado e reduz (uma de cada vez).
const big = Object.assign(document.createElement("canvas"), { width: W, height: H });
let thumbChain = Promise.resolve();
function queueThumb(sb, c, cv) {
  thumbChain = thumbChain.then(async () => {
    const s = c.slides[0]; if (!s) return;
    const a = await assetsFor(sb, s);
    draw(big.getContext("2d"), s, 0, a);
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
  const strip = h("div", { class: "cz-strip" });
  let playing = null;
  async function renderSlide(i, reload = false) {
    if (reload || !assets[i]) assets[i] = await assetsFor(sb, st.slides[i]);
    const cv = canvases[i]; if (!cv) return;
    draw(cv.getContext("2d"), st.slides[i], i, { ...assets[i], playing: playing === i });
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
    const tick = () => { if (playing !== i || !canvases[i]?.isConnected) { v.pause(); return; } draw(canvases[i].getContext("2d"), st.slides[i], i, { ...assets[i], playing: true }); requestAnimationFrame(tick); };
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
    const semMidia = () => { s.midia = null; renderSlide(sel, true); drawForm(); touch(); };
    form.replaceChildren(
      h("div", { class: "flex", style: { justifyContent: "space-between" } }, h("b", null, `Lâmina ${sel + 1} de ${st.slides.length}`), saveInfo),
      h("label", { class: "field" }, h("span", null, "Texto ", h("span", { class: "muted small" }, "(**assim** fica em negrito)")), ta),
      h("label", { class: "field" }, "Rodapé (opcional)", rod),
      h("div", { class: "field" }, h("span", null, "Mídia ", h("span", { class: "muted small" }, s.midia ? (s.midia.tipo === "video" ? "vídeo" : "imagem") + (s.midia.path ? " enviada por você" : "") : "nenhuma (toda lâmina deve ter ilustração)")),
        h("div", { class: "flex wrap" },
          h("button", { type: "button", class: "btn btn-sm", onclick: () => fileIn.click() }, s.midia ? "Trocar imagem ou vídeo" : "Anexar imagem ou vídeo"),
          s.midia && h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: semMidia }, "Remover mídia"), fileIn)),
      s.midia && h("label", { class: "field" }, "Recorte da mídia (cima ↔ baixo)", foco),
      s.midia && h("label", { class: "field" }, "Crédito da mídia", cred),
      h("div", { class: "flex wrap", style: { marginTop: "6px" } },
        h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => move(-1), disabled: sel === 0 }, "← Mover"),
        h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: () => move(1), disabled: sel === st.slides.length - 1 }, "Mover →"),
        h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: dup }, "Duplicar"),
        h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: nova }, "+ Lâmina depois"),
        h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: del }, "Tirar lâmina")),
      h("div", { class: "flex wrap", style: { marginTop: "6px" } },
        h("button", { type: "button", class: "btn btn-ghost btn-sm", onclick: (e) => baixar([sel], e.currentTarget) }, s.midia?.tipo === "video" ? "Baixar esta lâmina (vídeo)" : "Baixar esta lâmina (PNG)")));
    if (!data.dbOn) form.querySelectorAll("textarea,input,button").forEach((el) => { if (!/Baixar/.test(el.textContent)) el.disabled = true; });
  }

  // ── downloads ──
  const salvarArquivo = (blob, nome) => { const a = h("a", { href: URL.createObjectURL(blob), download: nome }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); };
  async function baixar(idxs, btn) {
    const label = btn.textContent; btn.disabled = true;
    try {
      for (const i of idxs) {
        const a = await assetsFor(sb, st.slides[i]);
        const nome = `${st.slug}-${String(i + 1).padStart(2, "0")}`;
        if (st.slides[i].midia?.tipo === "video" && a.media instanceof HTMLVideoElement) {
          if (playing === i) playing = null;
          const blob = await recordVideoSlide(st.slides[i], i, a, (p) => { btn.textContent = `Gravando lâmina ${i + 1}… ${Math.round(p * 100)}%`; });
          salvarArquivo(blob, `${nome}.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
          assets[i] = null; renderSlide(i);
        } else {
          btn.textContent = `Gerando ${i + 1}…`;
          const cv = Object.assign(document.createElement("canvas"), { width: W, height: H });
          draw(cv.getContext("2d"), st.slides[i], i, a);
          const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
          if (!blob) throw new Error("imagem bloqueada pelo navegador");
          salvarArquivo(blob, `${nome}.png`);
          await new Promise((r) => setTimeout(r, 350));
        }
      }
      toast(idxs.length > 1 ? "Lâminas baixadas." : "Lâmina baixada.");
    } catch (e) { toast("Não deu para baixar: " + e.message, { kind: "err" }); }
    finally { btn.disabled = false; btn.textContent = label; }
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
      toast("Pedido enviado. O Claude pega na próxima rodada (5h, 9h, 13h, 17h ou 21h).");
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
          vids.length ? h("div", { class: "cz-vids" }, ...vids.map((u) => h("div", null, h("video", { src: u, controls: true, playsinline: true, preload: "metadata" }), h("a", { class: "small", href: u, download: "" }, "Baixar")))) : null);
      }))));
  }

  // ── cabeçalho, legenda, fontes ──
  const titulo = h("input", { class: "input cz-title", value: st.titulo, "aria-label": "Título interno" });
  titulo.addEventListener("input", () => { st.titulo = titulo.value || "Sem título"; touch(); });
  const status = h("select", { class: "select", style: { width: "auto" }, "aria-label": "Status" }, ...Object.entries(STATUS).map(([v, l]) => h("option", { value: v, selected: v === st.status }, l)));
  status.addEventListener("change", () => { st.status = status.value; touch(); });
  const leg = h("textarea", { class: "textarea", rows: 8 }); leg.value = st.legenda || "";
  leg.addEventListener("input", () => { st.legenda = leg.value; touch(); });
  const copiar = async () => { try { await navigator.clipboard.writeText(st.legenda || ""); toast("Legenda copiada."); } catch { toast("Não deu para copiar.", { kind: "err" }); } };
  const baixarTudo = h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: (e) => baixar(st.slides.map((_, i) => i), e.currentTarget) }, "Baixar lâminas");
  if (!data.dbOn) [titulo, status, leg].forEach((el) => { el.disabled = true; });

  buildStrip(); drawForm(); drawPedidos();
  if (st.slides[0]?.midia?.tipo === "video") select(0);

  return h("div", { class: "page wide" },
    pageHead(st.titulo, `${TIPO[st.tipo] || st.tipo} · ${st.perfil || "@ilmarlabs"} · ${fmtDate(st.dia)} · 1080×1350`),
    !data.dbOn && h("p", { class: "note" }, "Modo leitura: rode a migration 0028 no Supabase para editar e pedir vídeo."),
    h("div", { class: "flex wrap", style: { gap: "8px", marginBottom: "14px" } },
      h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => go("/carrosseis") }, "← Todos"),
      h("button", { class: "btn btn-sm", type: "button", onclick: abrirVideo }, "Transformar em vídeo"),
      baixarTudo,
      h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: copiar }, "Copiar legenda"),
      h("div", { class: "grow" }), status),
    videoBox,
    strip,
    h("div", { class: "cz-edit" },
      form,
      h("div", { class: "cz-side" },
        h("label", { class: "field" }, "Título interno", titulo),
        h("label", { class: "field" }, "Legenda do post", leg),
        st.fontes?.length ? h("div", { class: "field" }, h("span", null, "Fontes"), h("ul", { class: "cz-fontes" }, ...st.fontes.map((f) => h("li", null, h("a", { href: f.url, target: "_blank", rel: "noopener" }, f.titulo || f.url))))) : null,
        st.notas ? h("p", { class: "muted small", style: { whiteSpace: "pre-wrap" } }, st.notas) : null)),
    pedidosBox);
}

// Carrosséis antigos (JPGs prontos, sem edição).
function legacyView(atual, go) {
  const url = (f) => `${BASE}${atual.slug}/${f}`;
  const copiar = async () => { try { await navigator.clipboard.writeText(atual.legenda || ""); toast("Legenda copiada."); } catch { toast("Não deu para copiar.", { kind: "err" }); } };
  return h("div", { class: "page wide" },
    pageHead(atual.titulo, `${atual.perfil} · ${atual.slides.length} slides · 1080×1350`),
    h("div", { class: "flex", style: { gap: "8px", marginBottom: "14px" } },
      h("button", { class: "btn btn-sm", type: "button", onclick: () => go("/carrosseis") }, "← Todos"),
      h("button", { class: "btn btn-sm", type: "button", onclick: copiar }, "Copiar legenda")),
    h("div", { class: "carr-strip" }, ...atual.slides.map((f, i) => h("a", { href: url(f), target: "_blank", rel: "noopener", class: "carr-slide" },
      h("img", { src: url(f), alt: `Slide ${i + 1}`, loading: "lazy" }), h("span", { class: "mono" }, String(i + 1).padStart(2, "0"))))),
    atual.legenda && h("section", { class: "panel", style: { marginTop: "16px" } }, h("div", { class: "panel-head" }, h("h2", { class: "mono" }, "Legenda")),
      h("div", { class: "panel-body" }, h("p", { style: { whiteSpace: "pre-wrap", margin: 0 } }, atual.legenda))));
}
