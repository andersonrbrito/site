// Desenho das lâminas na identidade de andersonbrito.com: fundo escuro com grade de pontos verdes,
// brilhos nos cantos, cartão de vidro estilo iOS e rótulos em mono. Destaque por tipo: notícia vermelha,
// educativo azul, pessoal verde Matrix.
// O mesmo código desenha a prévia no painel e exporta PNG (imagem) ou vídeo (lâmina com vídeo).
// Lâmina: { texto, midia: { tipo: "imagem"|"video", src | path, foco: 0..1, credito }, rodape }
// Texto aceita quebra de linha e **negrito** (na lâmina 1 vira marca-texto; nas outras, texto na cor do tipo).
// info (opcional) = { total, tipo }: contador "01 / 07" no topo e a cor de destaque do tipo.

export const W = 1080, H = 1350;
export const PERFIL = { nome: "Anderson Brito", user: "@andersonbrito.mp4", avatar: "/painel/carrosseis/perfil/avatar.jpg" };

// Tokens de assets/ab.css
const BG = "#0B0C0E", CARD = "rgba(24,27,28,.74)", LINE = "rgba(255,255,255,.08)", LINE2 = "rgba(255,255,255,.14)";
const INK = "#F2F2F7", MUTE = "#A1A6AA", FAINT = "#6B7175";
// Cor de destaque por tipo: notícia avermelhada e educativo azulado (pílulas do site); pessoal no verde Matrix.
// a = destaque, ink = tinta sobre o destaque, txt = negrito no texto, rgb = brilhos, grade e contornos.
const TEMAS = {
  noticia: { a: "#FF3B47", ink: "#2B0407", txt: "#FF6B74", rgb: "255,59,71" },
  educativo: { a: "#3D8BFF", ink: "#04122E", txt: "#6EA8FF", rgb: "61,139,255" },
  pessoal: { a: "#41FF8A", ink: "#03200F", txt: "#41FF8A", rgb: "65,255,138" },
};
const tema = (tipo) => TEMAS[tipo] || TEMAS.pessoal;
const FONT = "'SF Pro Display', Inter, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', ui-monospace, Menlo, monospace";

// Medidas (canvas 1080 px; o cartão usa os cantos de 20 px do site na escala da lâmina)
const MX = 40, CP = 44, AV = 104, GAP = 30, R_CARD = 44, R_MEDIA = 28;
const TOP_BAR = 72, AREA_TOP = 124;
const BADGE = new Path2D("M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z");
const CHECK = new Path2D("M10.54 16.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z");

let fontsReady = null;
export function loadFonts() {
  if (!fontsReady) {
    if (!document.querySelector("link[data-cz-fonts]")) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.dataset.czFonts = "1";
      l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap";
      document.head.append(l);
      fontsReady = new Promise((r) => { l.onload = r; l.onerror = r; setTimeout(r, 3000); })
        .then(() => Promise.all(["400 46px Inter", "600 46px Inter", "700 46px Inter", "800 46px Inter", "500 24px 'JetBrains Mono'", "600 24px 'JetBrains Mono'"].map((f) => document.fonts.load(f).catch(() => {}))));
    } else fontsReady = Promise.resolve();
  }
  return fontsReady;
}

const cache = new Map();
export function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if (!cache.has(src)) cache.set(src, new Promise((res) => {
    const im = new Image(); im.crossOrigin = "anonymous"; im.decoding = "async";
    im.onload = () => res(im); im.onerror = () => res(null); im.src = src;
  }));
  return cache.get(src);
}
export function loadVideo(src) {
  return new Promise((res) => {
    const v = document.createElement("video");
    v.crossOrigin = "anonymous"; v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto";
    v.onloadeddata = () => res(v); v.onerror = () => res(null); v.src = src;
    setTimeout(() => res(v.readyState >= 2 ? v : null), 15000);
  });
}

// Quebra "**negrito**" em pedaços e depois em palavras com o peso de cada uma.
function tokens(texto) {
  const out = [];
  (texto || "").split("\n").forEach((linha, li) => {
    if (li) out.push({ br: true });
    linha.split(/(\*\*[^*]+\*\*)/).filter(Boolean).forEach((seg) => {
      const bold = seg.startsWith("**") && seg.endsWith("**");
      const t = bold ? seg.slice(2, -2) : seg;
      t.split(/(\s+)/).filter((w) => w.length).forEach((w) => out.push({ w, bold, space: /^\s+$/.test(w) }));
    });
  });
  return out;
}
const weight = (t, hook) => (t.bold ? 700 : hook ? 600 : 400);
function wrap(ctx, toks, size, maxW, hook) {
  const lines = [[]]; let x = 0;
  for (const t of toks) {
    if (t.br) { lines.push([]); x = 0; continue; }
    ctx.font = `${weight(t, hook)} ${size}px ${FONT}`;
    const w = ctx.measureText(t.w).width;
    if (t.space) { if (x > 0) { lines.at(-1).push({ ...t, w: " ", width: w }); x += w; } continue; }
    if (x + w > maxW && x > 0) {
      const last = lines.at(-1); if (last.at(-1)?.space) x -= last.pop().width;
      lines.push([]); x = 0;
    }
    lines.at(-1).push({ ...t, width: w }); x += w;
  }
  return lines;
}

function rounded(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// Texto mono em maiúsculas com espaçamento .09em, desenhado letra a letra (funciona em todo navegador).
function monoWidth(ctx, txt, size) { ctx.font = `500 ${size}px ${MONO}`; return ctx.measureText(txt).width + Math.max(0, txt.length - 1) * size * 0.09; }
function mono(ctx, txt, x, y, size, color, align = "left") {
  txt = txt.toUpperCase();
  const total = monoWidth(ctx, txt, size), sp = size * 0.09;
  let cx = align === "right" ? x - total : align === "center" ? x - total / 2 : x;
  ctx.font = `500 ${size}px ${MONO}`; ctx.fillStyle = color; ctx.textAlign = "left";
  for (const ch of txt) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; }
  return total;
}

// Fundo do site: #0B0C0E, brilhos na cor do tipo no canto de cima à direita e embaixo à esquerda, grade de pontos a cada 22 px.
const gridTiles = new Map();
function background(ctx, T) {
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  const glow = (cx, cy, rx, ry, a) => {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(${T.rgb},${a})`); g.addColorStop(0.7, `rgba(${T.rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
  };
  glow(W, 0, W * 0.75, H * 0.5, 0.13);
  glow(0, H, W * 0.65, H * 0.45, 0.10);
  if (!gridTiles.has(T.rgb)) {
    const t = document.createElement("canvas"); t.width = t.height = 22;
    const g = t.getContext("2d"); g.fillStyle = `rgba(${T.rgb},.07)`; g.beginPath(); g.arc(1.5, 1.5, 1.5, 0, Math.PI * 2); g.fill();
    gridTiles.set(T.rgb, t);
  }
  ctx.fillStyle = ctx.createPattern(gridTiles.get(T.rgb), "repeat"); ctx.fillRect(0, 0, W, H);
}

// Pílula com contorno fino (chips do topo e rodapé).
function pill(ctx, x, y, w, h, { fill = "rgba(255,255,255,.05)", stroke = LINE2 } = {}) {
  rounded(ctx, x, y, w, h, h / 2); ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke();
}

// Mede tudo e devolve as posições. mediaSize = { w, h } natural da mídia (ou null).
export function layout(ctx, slide, idx, mediaSize) {
  const maxW = W - MX * 2 - CP * 2;
  const toks = tokens(slide.texto);
  const hook = idx === 0;
  const areaBottom = H - (slide.rodape ? 138 : 64);
  const inner = areaBottom - AREA_TOP - CP * 2;
  let size = hook ? 58 : 46, lines, textH, mediaH = 0;
  const lh = hook ? 1.24 : 1.32;
  const natural = mediaSize ? Math.round(maxW * (mediaSize.h / mediaSize.w)) : 0;
  for (; ; size -= 2) {
    lines = wrap(ctx, toks, size, maxW, hook);
    textH = toks.length ? lines.length * size * lh : 0;
    const avail = inner - AV - (textH ? GAP + textH : 0) - (mediaSize ? GAP : 0);
    mediaH = mediaSize ? Math.min(natural, avail, 840) : 0;
    if (size <= 32 || !mediaSize || mediaH >= Math.min(natural, 440)) break;
  }
  mediaH = Math.max(0, Math.round(mediaH));
  const content = AV + (textH ? GAP + textH : 0) + (mediaSize ? GAP + mediaH : 0);
  const cardH = content + CP * 2;
  const cardY = Math.max(AREA_TOP, Math.round(AREA_TOP + (areaBottom - AREA_TOP - cardH) / 2));
  return { size, lh, lines, textH, mediaH, cardY, cardH, maxW, hook, areaBottom };
}

// Desenha a lâmina. assets = { avatar: Image, media: Image|HTMLVideoElement|null }
export function draw(ctx, slide, idx, assets, info = {}) {
  const m = slide.midia?.tipo === "video" && !assets.playing && assets.poster ? assets.poster : assets.media;
  const mw = m ? (m.videoWidth || m.naturalWidth || m.width) : 0, mh = m ? (m.videoHeight || m.naturalHeight || m.height) : 0;
  const L = layout(ctx, slide, idx, m && mw ? { w: mw, h: mh } : null);
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  const T = tema(info.tipo);
  background(ctx, T);

  // Topo: só o contador da lâmina, em Arial
  if (info.total) {
    const n = `${String(idx + 1).padStart(2, "0")} / ${String(info.total).padStart(2, "0")}`;
    ctx.font = `400 26px Arial, "Helvetica Neue", Helvetica, sans-serif`; ctx.fillStyle = MUTE; ctx.textAlign = "right";
    ctx.fillText(n, W - MX - 4, TOP_BAR + 9); ctx.textAlign = "left";
  }

  // Cartão de vidro
  const cx = MX, cw = W - MX * 2;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.45)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 18;
  rounded(ctx, cx, L.cardY, cw, L.cardH, R_CARD); ctx.fillStyle = CARD; ctx.fill(); ctx.restore();
  const sheen = ctx.createLinearGradient(0, L.cardY, 0, L.cardY + 260);
  sheen.addColorStop(0, "rgba(255,255,255,.045)"); sheen.addColorStop(1, "rgba(255,255,255,0)");
  rounded(ctx, cx, L.cardY, cw, L.cardH, R_CARD); ctx.fillStyle = sheen; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = LINE; ctx.stroke();

  const x0 = cx + CP;
  let y = L.cardY + CP;

  // Cabeçalho: foto redonda com anel e selo na cor do tipo, @ em mono
  ctx.save(); ctx.beginPath(); ctx.arc(x0 + AV / 2, y + AV / 2, AV / 2, 0, Math.PI * 2); ctx.clip();
  if (assets.avatar) ctx.drawImage(assets.avatar, x0, y, AV, AV); else { ctx.fillStyle = "#16191A"; ctx.fillRect(x0, y, AV, AV); }
  ctx.restore();
  ctx.beginPath(); ctx.arc(x0 + AV / 2, y + AV / 2, AV / 2 + 3, 0, Math.PI * 2); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${T.rgb},.6)`; ctx.stroke();
  const nx = x0 + AV + 26;
  ctx.font = `700 38px ${FONT}`; ctx.fillStyle = INK; ctx.fillText(PERFIL.nome, nx, y + 46);
  const bx = nx + ctx.measureText(PERFIL.nome).width + 10, bs = 36 / 24;
  ctx.save(); ctx.translate(bx, y + 16); ctx.scale(bs, bs); ctx.fillStyle = T.a; ctx.fill(BADGE); ctx.fillStyle = T.ink; ctx.fill(CHECK); ctx.restore();
  ctx.font = `500 28px ${MONO}`; ctx.fillStyle = MUTE; ctx.fillText(PERFIL.user, nx, y + 90);
  y += AV;

  // Texto (negrito: marca-texto na cor do tipo na lâmina 1, texto na cor do tipo nas outras)
  if (L.textH) {
    y += GAP;
    L.lines.forEach((line, i) => {
      const by = y + L.size * (L.lh * i + 1.0);
      if (L.hook) {
        let x = x0, run = null;
        const flush = () => { if (run) { rounded(ctx, run.x - 6, by - L.size * 0.86, run.w + 12, L.size * 1.1, 10); ctx.fillStyle = T.a; ctx.fill(); run = null; } };
        for (const t of line) {
          if (t.bold) { if (!run) run = { x, w: 0 }; run.w = x + t.width - run.x; } else if (!t.space || !run) flush();
          x += t.width;
        }
        flush();
      }
      let x = x0;
      for (const t of line) {
        ctx.font = `${weight(t, L.hook)} ${L.size}px ${FONT}`;
        ctx.fillStyle = t.bold ? (L.hook ? T.ink : T.txt) : INK;
        ctx.fillText(t.w, x, by); x += t.width;
      }
    });
    y += L.textH;
  }

  // Mídia com cantos arredondados (recorte "cover" quando precisa caber)
  if (m && L.mediaH) {
    y += GAP;
    const bw = L.maxW, bh = L.mediaH, scale = Math.max(bw / mw, bh / mh);
    const sw = bw / scale, sh = bh / scale, foco = slide.midia?.foco ?? 0.5;
    const sx = (mw - sw) / 2, sy = Math.max(0, Math.min(mh - sh, (mh - sh) * foco));
    ctx.save(); rounded(ctx, x0, y, bw, bh, R_MEDIA); ctx.clip();
    ctx.drawImage(m, sx, sy, sw, sh, x0, y, bw, bh);
    ctx.restore();
    rounded(ctx, x0, y, bw, bh, R_MEDIA); ctx.lineWidth = 2; ctx.strokeStyle = LINE2; ctx.stroke();
    if (slide.midia?.tipo === "video" && !assets.playing) {
      const pcx = x0 + bw / 2, pcy = y + bh / 2;
      ctx.fillStyle = "rgba(11,12,14,.62)"; ctx.beginPath(); ctx.arc(pcx, pcy, 56, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = `rgba(${T.rgb},.5)`; ctx.stroke();
      ctx.fillStyle = T.a; ctx.beginPath(); ctx.moveTo(pcx - 15, pcy - 25); ctx.lineTo(pcx + 27, pcy); ctx.lineTo(pcx - 15, pcy + 25); ctx.fill();
    }
    if (slide.midia?.credito) {
      const cr = slide.midia.credito.toUpperCase(), tw = monoWidth(ctx, cr, 18), ph = 38, pw = tw + 28;
      const px = x0 + bw - 16 - pw, py = y + bh - 16 - ph;
      pill(ctx, px, py, pw, ph, { fill: "rgba(11,12,14,.72)", stroke: LINE2 });
      mono(ctx, cr, px + 14, py + ph / 2 + 6, 18, MUTE);
    }
  }

  // Rodapé: pílula com contorno fino na cor do tipo
  if (slide.rodape) {
    let fs = 30; ctx.font = `600 ${fs}px ${FONT}`;
    while (ctx.measureText(slide.rodape).width > W - MX * 2 - 80 && fs > 22) { fs -= 1; ctx.font = `600 ${fs}px ${FONT}`; }
    const tw = ctx.measureText(slide.rodape).width, ph = 66, pw = tw + 64, py = H - 52 - ph;
    pill(ctx, (W - pw) / 2, py, pw, ph, { fill: `rgba(${T.rgb},.08)`, stroke: `rgba(${T.rgb},.42)` });
    ctx.fillStyle = T.txt; ctx.textAlign = "center"; ctx.fillText(slide.rodape, W / 2, py + ph / 2 + fs * 0.36); ctx.textAlign = "left";
  }
}

// Grava a lâmina com vídeo como MP4 (ou WebM se o navegador não gravar MP4), com o áudio do vídeo.
export async function recordVideoSlide(slide, idx, assets, onProgress, info = {}) {
  const v = assets.media; const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const stream = c.captureStream(30);
  try {
    // um elemento de vídeo só aceita uma fonte de áudio por toda a vida: guarda e reaproveita
    if (!v._cz) { const ac = new AudioContext(); v._cz = { ac, dest: ac.createMediaStreamDestination() }; ac.createMediaElementSource(v).connect(v._cz.dest); }
    await v._cz.ac.resume().catch(() => {});
    v._cz.dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  } catch { /* sem áudio */ }
  const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
  const parts = []; rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const dur = Math.min(v.duration || 30, 60);
  v.loop = false; v.muted = false; v.currentTime = 0;
  // o iPhone pode recusar tocar com som fora de um toque: grava sem som em vez de falhar
  try { await v.play(); } catch { v.muted = true; await v.play(); }
  rec.start(250);
  await new Promise((done) => {
    const tick = () => {
      draw(ctx, slide, idx, { ...assets, playing: true }, info);
      onProgress?.(Math.min(1, v.currentTime / dur));
      if (v.ended || v.currentTime >= dur) return done();
      requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop(); v.pause(); v.muted = true; v.loop = true;
  await new Promise((r) => (rec.onstop = r));
  return new Blob(parts, { type: mime.split(";")[0] });
}
