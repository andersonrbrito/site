// Estúdio: transforma um post em card (PNG 4:5) e Reel (vídeo 9:16) direto no navegador, sem custo.
// Visual MineR_: fundo preto esverdeado, grade, laranja #FF4F32, Geist.
const BG = "#050706", GRID = "rgba(255,255,255,.045)", ACC = "#FF4F32", TX = "#F3F2EE", MUTED = "#8B918A";

function loadImg(src) {
  return new Promise((res) => {
    if (!src) return res(null);
    const i = new Image(); i.crossOrigin = "anonymous";
    i.onload = () => res(i); i.onerror = () => res(null); i.src = src;
  });
}

function wrap(ctx, text, maxW) {
  const lines = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) { lines.push(""); continue; }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const t = line ? line + " " + word : word;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = word; } else line = t;
    }
    lines.push(line);
  }
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines;
}

function background(ctx, W, H) {
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = GRID; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 72) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 72) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
  const g = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.9); g.addColorStop(0, "rgba(255,79,50,.22)"); g.addColorStop(1, "rgba(255,79,50,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

function header(ctx, avatar, profile, x, y, size) {
  if (avatar) { ctx.save(); ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(avatar, x, y, size, size); ctx.restore(); }
  else { ctx.fillStyle = ACC; ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = TX; ctx.font = `700 ${size * 0.42}px Geist, system-ui, sans-serif`; ctx.fillText(profile.name, x + size + 22, y + size * 0.45);
  ctx.fillStyle = MUTED; ctx.font = `400 ${size * 0.34}px Geist, system-ui, sans-serif`; ctx.fillText("@" + profile.username, x + size + 22, y + size * 0.88);
}

function footer(ctx, W, H) {
  ctx.font = `italic 900 40px Geist, system-ui, sans-serif`; ctx.fillStyle = TX; ctx.fillText("ANDERSON", 72, H - 72);
  const w = ctx.measureText("ANDERSON").width; ctx.fillStyle = ACC; ctx.fillText("_BRITO", 72 + w, H - 72);
  ctx.font = `500 30px "Geist Mono", ui-monospace, monospace`; ctx.fillStyle = MUTED; ctx.textAlign = "right"; ctx.fillText("andersonbrito.com", W - 72, H - 76); ctx.textAlign = "left";
}

// Escolhe o maior tamanho de fonte que cabe na área.
function fit(ctx, text, maxW, maxH, from, to) {
  for (let fs = from; fs >= to; fs -= 2) {
    ctx.font = `600 ${fs}px Geist, system-ui, sans-serif`;
    const lines = wrap(ctx, text, maxW);
    if (lines.length * fs * 1.32 <= maxH) return { fs, lines };
  }
  ctx.font = `600 ${to}px Geist, system-ui, sans-serif`;
  return { fs: to, lines: wrap(ctx, text, maxW) };
}

const clean = (t) => t.split(/\n\s*---\s*\n/)[0].replace(/https?:\/\/\S+/g, "").trim();

export async function renderCard(text, profile) {
  await document.fonts?.ready;
  const W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d"), avatar = await loadImg(profile.avatar);
  background(ctx, W, H);
  header(ctx, avatar, profile, 72, 96, 96);
  const { fs, lines } = fit(ctx, clean(text), W - 144, H - 480, 58, 30);
  ctx.fillStyle = TX; lines.forEach((l, i) => ctx.fillText(l, 72, 300 + fs + i * fs * 1.32));
  ctx.fillStyle = ACC; ctx.fillRect(72, 260, 64, 6);
  footer(ctx, W, H);
  return new Promise((res) => c.toBlob(res, "image/png"));
}

// Reel 9:16: texto aparecendo palavra por palavra + zoom leve; ~1,2s por linha, mínimo 8s.
export async function renderReel(text, profile, onProgress) {
  await document.fonts?.ready;
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d"), avatar = await loadImg(profile.avatar);
  const { fs, lines } = fit(ctx, clean(text), W - 144, H - 760, 70, 36);
  const words = lines.map((l) => l.split(" "));
  const totalWords = words.reduce((n, w) => n + w.length, 0);
  const dur = Math.min(30, Math.max(8, totalWords * 0.28 + 3)) * 1000;
  const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((m) => window.MediaRecorder?.isTypeSupported?.(m));
  if (!mime) throw new Error("Este navegador não grava vídeo. Use o Chrome.");
  const stream = c.captureStream(30), rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((res) => (rec.onstop = res));
  rec.start(250);
  const t0 = performance.now();
  await new Promise((resolve) => {
    const frame = () => {
      const t = performance.now() - t0, p = Math.min(1, t / dur);
      const shown = Math.floor(Math.min(1, t / (dur - 2500)) * totalWords);
      background(ctx, W, H);
      ctx.save(); const z = 1 + p * 0.03; ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      header(ctx, avatar, profile, 72, 330, 110);
      ctx.fillStyle = ACC; ctx.fillRect(72, 500, 72, 7);
      ctx.font = `600 ${fs}px Geist, system-ui, sans-serif`; ctx.fillStyle = TX;
      let n = 0;
      words.forEach((ws, i) => { const vis = ws.slice(0, Math.max(0, shown - n)); n += ws.length; if (vis.length) ctx.fillText(vis.join(" "), 72, 560 + fs + i * fs * 1.32); });
      ctx.restore();
      footer(ctx, W, H - 120);
      ctx.fillStyle = ACC; ctx.fillRect(0, H - 10, W * p, 10);
      onProgress?.(p);
      if (t < dur) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });
  rec.stop(); await done;
  return { blob: new Blob(chunks, { type: mime.split(";")[0] }), ext: mime.includes("mp4") ? "mp4" : "webm" };
}

export function download(blob, name) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
