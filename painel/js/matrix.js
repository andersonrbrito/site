// Chuva de código (Matrix) do painel: só aparece no dia em que a meta de +1.000 seguidores da semana é batida.
// A home calcula a meta (views/painel.js) e chama armMatrix(dia). O fim vale até 23:59 daquele dia (Brasília)
// e fica salvo no aparelho, então a chuva continua em qualquer tela do painel até lá.
const KEY = "aos_matrix_ate";
const GLYPHS = "アイウエオカキクケコサシスセソタチツテト01ABRITO<>/{}=+*";
let running = null;

const fimDoDia = (day) => new Date(day + "T23:59:59-03:00").getTime();

export function initMatrix() {
  try {
    const ate = Number(localStorage.getItem(KEY) || 0);
    if (ate > Date.now()) startMatrix(ate);
  } catch {}
}

export function armMatrix(hitDay) {
  if (!hitDay) return;
  const ate = fimDoDia(hitDay);
  if (ate <= Date.now()) return;
  try { localStorage.setItem(KEY, String(ate)); } catch {}
  startMatrix(ate);
}

function startMatrix(ate) {
  if (running || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.createElement("canvas");
  cv.className = "aos-rain";
  cv.setAttribute("aria-hidden", "true");
  document.body.prepend(cv);
  const ctx = cv.getContext("2d"), fs = 15;
  let w = 0, h = 0, cols = [], raf = 0, last = 0;
  const size = () => {
    const d = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight; cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    cols = Array.from({ length: Math.ceil(w / fs) }, () => (Math.random() < 0.45 ? Math.random() * -h / fs : null));
  };
  const tick = (t) => {
    if (Date.now() > ate) { stop(); return; }
    raf = requestAnimationFrame(tick);
    if (t - last < 80) return; last = t;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,.05)"; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    ctx.font = `500 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
    cols.forEach((y, i) => {
      if (y === null || Math.random() > 0.6) return;
      ctx.fillStyle = Math.random() > 0.96 ? "#d6ffe6" : "rgba(65,255,138,.8)";
      ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * fs, y * fs);
      cols[i] = y * fs > h && Math.random() > 0.975 ? 0 : y + 1;
    });
  };
  const stop = () => { cancelAnimationFrame(raf); cv.remove(); removeEventListener("resize", size); running = null; };
  size(); addEventListener("resize", size);
  document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden && running) raf = requestAnimationFrame(tick); });
  raf = requestAnimationFrame(tick);
  running = { stop };
}
