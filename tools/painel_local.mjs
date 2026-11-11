// Painel local: serve o site em http://localhost:8090/painel/ e as mídias das aprovações direto do disco.
// GET  /_local/aprovacoes/<perfil>/<arquivo>  → arquivo do espelho (com Range, para vídeo) ou 404
// POST /_local/aprovacoes/<perfil>/<arquivo>  → guarda no espelho (o painel manda na 1ª vez que baixa do Supabase)
// Espelho: /Volumes/ANDY 1TB/BANCO DE MIDIA/aprovacoes/<perfil>/ (se o ANDY não estiver montado, ~/Downloads/site/.espelho-aprovacoes)
// Rodar: node tools/painel_local.mjs   (escuta só em 127.0.0.1)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ANDY = "/Volumes/ANDY 1TB/BANCO DE MIDIA";
const MIRROR = fs.existsSync("/Volumes/ANDY 1TB/BANCO DE MIDIA") ? ANDY : path.join(ROOT, ".espelho-aprovacoes");
const PORT = Number(process.env.PORT || 8090);
const OK_PATH = /^aprovacoes\/[a-z0-9-]{2,60}\/[\w.-]{1,160}$/;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".m4v": "video/mp4", ".pdf": "application/pdf", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
const tipo = (f) => TYPES[path.extname(f).toLowerCase()] || "application/octet-stream";

function enviarArquivo(req, res, file) {
  const st = fs.statSync(file);
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  const base = { "Content-Type": tipo(file), "Accept-Ranges": "bytes", "Cache-Control": "no-cache" };
  if (range) {
    const ini = range[1] ? +range[1] : 0, fim = range[2] ? Math.min(+range[2], st.size - 1) : st.size - 1;
    res.writeHead(206, { ...base, "Content-Range": `bytes ${ini}-${fim}/${st.size}`, "Content-Length": fim - ini + 1 });
    return fs.createReadStream(file, { start: ini, end: fim }).pipe(res);
  }
  res.writeHead(200, { ...base, "Content-Length": st.size });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = decodeURIComponent(url.pathname);
  // Pedido vindo do túnel (internet): só leitura das mídias das aprovações, nada mais do disco
  if (req.headers["cf-connecting-ip"]) {
    res.setHeader("Access-Control-Allow-Origin", "https://andersonbrito.com");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range");
    if (req.method === "OPTIONS") { res.writeHead(204, { "Access-Control-Allow-Methods": "GET, HEAD", "Access-Control-Allow-Headers": "Range" }); return res.end(); }
    if (!["GET", "HEAD"].includes(req.method) || !p.startsWith("/_local/aprovacoes/")) { res.writeHead(403); return res.end(); }
  }
  if (p.startsWith("/_local/")) {
    const rel = p.slice(8);
    if (!OK_PATH.test(rel)) { res.writeHead(400); return res.end("path inválido"); }
    const file = path.join(MIRROR, rel);
    if (req.method === "POST") {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = file + ".parcial";
      const out = fs.createWriteStream(tmp);
      req.pipe(out);
      out.on("finish", () => { fs.renameSync(tmp, file); res.writeHead(201); res.end("ok"); });
      out.on("error", (e) => { res.writeHead(500); res.end(String(e)); });
      return;
    }
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    return enviarArquivo(req, res, file);
  }
  let file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || /\/\.(git|env)|\/postador\//.test(file)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!p.endsWith("/")) { res.writeHead(301, { Location: p + "/" + url.search }); return res.end(); } // /painel → /painel/ (senão CSS/JS não carregam)
    file = path.join(file, "index.html");
  }
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end("não encontrado"); }
  enviarArquivo(req, res, file);
}).on("error", (e) => { if (e.code === "EADDRINUSE") { console.log("Já está rodando. É só abrir: http://localhost:8090/painel/"); process.exit(0); } throw e; }).listen(PORT, "127.0.0.1", () => { console.log(`Painel local: http://localhost:${PORT}/painel/  ·  espelho: ${MIRROR}`); if (process.env.TUNEL !== "0") tunel(); });

// Túnel público (cloudflared, grátis, sem conta): o painel do andersonbrito.com toca os originais direto do Mac.
// O endereço muda a cada início; o link com ?mac= é aberto aqui e fica gravado em .tunel-mac.txt (abrir 1x no celular).
function tunel() {
  const cf = spawn("/opt/homebrew/bin/cloudflared", ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${PORT}`]);
  let achou = false;
  const ler = (d) => {
    const m = !achou && String(d).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (!m) return;
    achou = true;
    const link = `https://andersonbrito.com/painel/#/aprovacoes?mac=${m[0]}`;
    fs.writeFileSync(path.join(ROOT, ".tunel-mac.txt"), link + "\n");
    console.log("Túnel: " + m[0] + "\nAbra 1x em cada aparelho: " + link);
    setTimeout(() => spawn("open", [link]), 4000);
  };
  cf.stderr.on("data", ler); cf.stdout.on("data", ler);
  cf.on("exit", (c) => { console.log("cloudflared saiu (" + c + "), reabrindo em 10 s"); setTimeout(tunel, 10000); });
  process.on("exit", () => cf.kill());
}
