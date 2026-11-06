// Desenho das lâminas no estilo "print de tweet" (fundo branco, foto, nome, @ e selo de verificado).
// O mesmo código desenha a prévia no painel e exporta PNG (imagem) ou vídeo (lâmina com vídeo).
// Lâmina: { texto, midia: { tipo: "imagem"|"video", src | path, foco: 0..1, credito }, rodape }
// Texto aceita quebra de linha e **negrito**.

export const W = 1080, H = 1350;
export const PERFIL = { nome: "Anderson Brito", user: "@andersonbrito.mp4", avatar: "/painel/carrosseis/perfil/avatar.jpg" };
const PAD = 72, AV = 112, GAP = 34, FONT = "Inter, 'Helvetica Neue', Arial, sans-serif";
const INK = "#0f1419", MUTE = "#536471", LINE = "#cfd9de", BLUE = "#1d9bf0";
const BADGE = new Path2D("M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z");
const CHECK = new Path2D("M10.54 16.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z");

let fontsReady = null;
export function loadFonts() {
  if (!fontsReady) {
    if (!document.querySelector("link[data-inter]")) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.dataset.inter = "1";
      l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
      document.head.append(l);
      fontsReady = new Promise((r) => { l.onload = r; l.onerror = r; setTimeout(r, 3000); })
        .then(() => Promise.all(["400 46px Inter", "700 46px Inter", "800 46px Inter"].map((f) => document.fonts.load(f).catch(() => {}))));
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
function wrap(ctx, toks, size, maxW) {
  const lines = [[]]; let x = 0;
  for (const t of toks) {
    if (t.br) { lines.push([]); x = 0; continue; }
    ctx.font = `${t.bold ? 700 : 400} ${size}px ${FONT}`;
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

// Mede tudo e devolve as posições. mediaSize = { w, h } natural da mídia (ou null).
export function layout(ctx, slide, idx, mediaSize) {
  const maxW = W - PAD * 2;
  const toks = tokens(slide.texto);
  const temRodape = !!slide.rodape;
  const bottomReserve = temRodape ? 110 : 70;
  let size = idx === 0 ? 58 : 46, lines, textH, mediaH = 0;
  const natural = mediaSize ? Math.round(maxW * (mediaSize.h / mediaSize.w)) : 0;
  for (; ; size -= 2) {
    lines = wrap(ctx, toks, size, maxW);
    textH = toks.length ? lines.length * size * 1.3 : 0;
    const avail = H - 70 - bottomReserve - AV - GAP - textH - (mediaSize ? GAP : 0);
    mediaH = mediaSize ? Math.min(natural, avail, 860) : 0;
    if (size <= 32 || !mediaSize || mediaH >= Math.min(natural, 460)) break;
  }
  mediaH = Math.max(0, Math.round(mediaH));
  const total = AV + (textH ? GAP + textH : 0) + (mediaSize ? GAP + mediaH : 0);
  const top = Math.max(60, Math.round((H - bottomReserve + 40 - total) / 2));
  return { size, lines, textH, mediaH, top, maxW };
}

// Desenha a lâmina. assets = { avatar: Image, media: Image|HTMLVideoElement|null }
export function draw(ctx, slide, idx, assets) {
  const m = slide.midia?.tipo === "video" && !assets.playing && assets.poster ? assets.poster : assets.media;
  const mw = m ? (m.videoWidth || m.naturalWidth || m.width) : 0, mh = m ? (m.videoHeight || m.naturalHeight || m.height) : 0;
  const L = layout(ctx, slide, idx, m && mw ? { w: mw, h: mh } : null);
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";
  let y = L.top;

  // Cabeçalho: foto redonda, nome + selo, @
  ctx.save(); ctx.beginPath(); ctx.arc(PAD + AV / 2, y + AV / 2, AV / 2, 0, Math.PI * 2); ctx.clip();
  if (assets.avatar) ctx.drawImage(assets.avatar, PAD, y, AV, AV); else { ctx.fillStyle = "#e7e9ea"; ctx.fillRect(PAD, y, AV, AV); }
  ctx.restore();
  const nx = PAD + AV + 26;
  ctx.font = `700 40px ${FONT}`; ctx.fillStyle = INK; ctx.fillText(PERFIL.nome, nx, y + 48);
  const bx = nx + ctx.measureText(PERFIL.nome).width + 10, bs = 40 / 24;
  ctx.save(); ctx.translate(bx, y + 14); ctx.scale(bs, bs); ctx.fillStyle = BLUE; ctx.fill(BADGE); ctx.fillStyle = "#fff"; ctx.fill(CHECK); ctx.restore();
  ctx.font = `400 34px ${FONT}`; ctx.fillStyle = MUTE; ctx.fillText(PERFIL.user, nx, y + 96);
  y += AV;

  // Texto
  if (L.textH) {
    y += GAP;
    L.lines.forEach((line, i) => {
      let x = PAD; const by = y + L.size * (1.3 * i + 1.02);
      for (const t of line) { ctx.font = `${t.bold ? 700 : 400} ${L.size}px ${FONT}`; ctx.fillStyle = INK; ctx.fillText(t.w, x, by); x += t.width; }
    });
    y += L.textH;
  }

  // Mídia com cantos arredondados (recorte "cover" quando precisa caber)
  if (m && L.mediaH) {
    y += GAP;
    const bw = L.maxW, bh = L.mediaH, scale = Math.max(bw / mw, bh / mh);
    const sw = bw / scale, sh = bh / scale, foco = slide.midia?.foco ?? 0.5;
    const sx = (mw - sw) / 2, sy = Math.max(0, Math.min(mh - sh, (mh - sh) * foco));
    ctx.save(); rounded(ctx, PAD, y, bw, bh, 30); ctx.clip();
    ctx.drawImage(m, sx, sy, sw, sh, PAD, y, bw, bh); ctx.restore();
    rounded(ctx, PAD, y, bw, bh, 30); ctx.lineWidth = 2; ctx.strokeStyle = LINE; ctx.stroke();
    if (slide.midia?.tipo === "video" && !assets.playing) {
      ctx.fillStyle = "rgba(15,20,25,.7)"; ctx.beginPath(); ctx.arc(PAD + bw / 2, y + bh / 2, 54, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(PAD + bw / 2 - 16, y + bh / 2 - 26); ctx.lineTo(PAD + bw / 2 + 28, y + bh / 2); ctx.lineTo(PAD + bw / 2 - 16, y + bh / 2 + 26); ctx.fill();
    }
    if (slide.midia?.credito) {
      ctx.font = `400 24px ${FONT}`; ctx.fillStyle = MUTE; ctx.textAlign = "right";
      ctx.fillText(slide.midia.credito, PAD + bw, y + bh + 34); ctx.textAlign = "left";
    }
  }

  if (slide.rodape) {
    ctx.font = `600 30px ${FONT}`; ctx.fillStyle = MUTE; ctx.textAlign = "center";
    ctx.fillText(slide.rodape, W / 2, H - 56); ctx.textAlign = "left";
  }
}

// Grava a lâmina com vídeo como MP4 (ou WebM se o navegador não gravar MP4), com o áudio do vídeo.
export async function recordVideoSlide(slide, idx, assets, onProgress) {
  const v = assets.media; const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const stream = c.captureStream(30);
  try {
    const ac = new AudioContext(); const src = ac.createMediaElementSource(v); const dest = ac.createMediaStreamDestination();
    src.connect(dest); dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  } catch { /* sem áudio */ }
  const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
  const parts = []; rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
  const dur = Math.min(v.duration || 30, 60);
  v.loop = false; v.muted = false; v.currentTime = 0; await v.play();
  rec.start(250);
  await new Promise((done) => {
    const tick = () => {
      draw(ctx, slide, idx, { ...assets, playing: true });
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
