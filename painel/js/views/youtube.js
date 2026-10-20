import { h, fmtDateTime } from "../util.js";
import { pageHead, alertBox, toast } from "../ui.js";

// YouTube download: o download roda no ajudante local do Mac (tools/yt-helper, http://127.0.0.1:8765);
// o painel só manda o pedido e guarda o histórico em yt_downloads. Use para vídeos que você tem direito de baixar.
const HELPER = "http://127.0.0.1:8765";
const mb = (n) => (n == null ? "" : n >= 1e9 ? (n / 1e9).toFixed(2).replace(".", ",") + " GB" : (n / 1e6).toFixed(1).replace(".", ",") + " MB");
const dur = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "");
async function helper(path, body) {
  const r = await fetch(HELPER + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `erro ${r.status}`);
  return j;
}

export default async function youtube({ sb, refresh }) {
  const { data, error } = await sb.from("yt_downloads").select("id, url, title, channel, thumbnail, kind, quality, status, file_path, size_bytes, error, created_at, version").is("archived_at", null).order("created_at", { ascending: false }).limit(100);
  if (error) return h("div", { class: "page" }, pageHead("YouTube download", ""), alertBox("Não foi possível carregar o histórico."));
  const online = await helper("/ping").then(() => true).catch(() => false);

  const urlIn = h("input", { class: "input", type: "url", placeholder: "Cole o link do vídeo do YouTube", autocomplete: "off" });
  const preview = h("div", { class: "ytprev" });
  let info = null, kind = "video", height = 0;
  const opts = h("div", { class: "mfilters" });
  const drawOpts = () => {
    const chip = (label, on, fn) => h("button", { type: "button", class: "chip" + (on ? " on" : ""), onclick: () => { fn(); drawOpts(); } }, label);
    opts.replaceChildren(
      chip("Vídeo MP4", kind === "video", () => (kind = "video")), chip("Só áudio MP3", kind === "audio", () => (kind = "audio")),
      ...(kind === "video" ? [chip("Melhor qualidade", !height, () => (height = 0)), ...(info?.heights || [1080, 720, 480, 360]).map((x) => chip(`${x}p`, height === x, () => (height = x)))] : []));
  };
  drawOpts();
  const look = async () => {
    const url = urlIn.value.trim(); if (!url) return;
    preview.replaceChildren(h("p", { class: "muted small" }, "Lendo o vídeo…"));
    try {
      info = await helper("/info", { url }); height = 0; drawOpts();
      preview.replaceChildren(h("div", { class: "flex" }, info.thumbnail && h("img", { src: info.thumbnail, alt: "", referrerpolicy: "no-referrer" }),
        h("div", { class: "grow", style: { minWidth: 0 } }, h("b", null, info.title), h("div", { class: "muted small" }, `${info.channel || ""} · ${dur(info.duration)}`))));
    } catch (e) { info = null; preview.replaceChildren(h("p", { class: "alert" }, "Não consegui ler: " + e.message)); }
  };
  urlIn.addEventListener("change", look);
  const go = async (e) => {
    const btn = e.currentTarget, url = urlIn.value.trim();
    if (!url) return toast("Cole o link do vídeo.", { kind: "err" });
    if (!info) await look(); if (!info) return;
    btn.disabled = true;
    const quality = kind === "audio" ? "MP3" : height ? `${height}p` : "melhor";
    const { data: row, error: err } = await sb.from("yt_downloads").insert({ url, video_id: info.id, title: info.title, channel: info.channel, thumbnail: info.thumbnail, kind, quality }).select("id, version").single();
    if (err) { btn.disabled = false; return toast("Não foi possível salvar no histórico.", { kind: "err" }); }
    try {
      const { job } = await helper("/download", { url, kind, height });
      toast("Baixando…");
      let v = row.version;
      const poll = async () => {
        const j = await helper(`/job/${job}`).catch(() => null);
        if (!j || j.status === "baixando") { btn.textContent = `Baixando ${Math.round(j?.progress || 0)}%`; return setTimeout(poll, 1500); }
        const patch = j.status === "feito" ? { status: "feito", file_path: j.path, size_bytes: j.size } : { status: "erro", error: j.error };
        await sb.from("yt_downloads").update(patch).eq("id", row.id).eq("version", v);
        toast(j.status === "feito" ? "Pronto! Está em Downloads/YouTube." : "Falhou: " + j.error, { kind: j.status === "feito" ? "ok" : "err" });
        refresh();
      };
      poll();
    } catch (e2) {
      await sb.from("yt_downloads").update({ status: "erro", error: e2.message }).eq("id", row.id).eq("version", row.version);
      toast("Falhou: " + e2.message, { kind: "err" }); refresh();
    }
  };
  const reveal = (d) => helper("/reveal", { path: d.file_path }).catch((e) => toast(e.message, { kind: "err" }));
  const archive = async (d) => { await sb.from("yt_downloads").update({ archived_at: new Date().toISOString() }).eq("id", d.id).eq("version", d.version); refresh(); };

  return h("div", { class: "page" },
    pageHead("YouTube download", "vídeo MP4 ou áudio MP3, salvo no seu Mac"),
    !online && h("div", { class: "alert" }, "O ajudante do Mac está desligado. Abra o Terminal e rode: python3 ~/Downloads/site/tools/yt-helper/server.py (ou reinicie o Mac, que ele liga sozinho). Funciona só no navegador do próprio Mac."),
    h("section", { class: "panel" }, h("div", { class: "panel-body stack" },
      h("div", { class: "flex" }, urlIn, h("button", { class: "btn btn-ghost", type: "button", onclick: look }, "Ver vídeo")),
      preview, opts,
      h("div", null, h("button", { class: "btn", type: "button", disabled: !online, onclick: go }, "Baixar")),
      h("p", { class: "muted small" }, "Os arquivos vão para a pasta Downloads/YouTube. Use para vídeos seus ou que você tem direito de baixar."))),
    h("h2", { class: "dsec" }, "Histórico"),
    (data || []).length ? h("div", { class: "stack" }, ...data.map((d) => h("article", { class: "ytrow" },
      d.thumbnail ? h("img", { src: d.thumbnail, alt: "", loading: "lazy", referrerpolicy: "no-referrer" }) : h("span", { class: "ytph" }),
      h("div", { class: "grow", style: { minWidth: 0 } },
        h("a", { class: "truncate", href: d.url, target: "_blank", rel: "noopener" }, h("b", null, d.title || d.url)),
        h("div", { class: "mono muted small" }, `${d.kind === "audio" ? "MP3" : "MP4 " + (d.quality || "")} · ${fmtDateTime(d.created_at)}${d.size_bytes ? " · " + mb(d.size_bytes) : ""}`),
        d.status === "erro" && h("div", { class: "small", style: { color: "var(--danger)" } }, d.error || "erro")),
      h("span", { class: "pill " + (d.status === "feito" ? "posted" : d.status === "erro" ? "failed" : "approved") }, d.status === "feito" ? "Baixado" : d.status === "erro" ? "Erro" : "Baixando"),
      d.status === "feito" && online && h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => reveal(d) }, "Mostrar no Finder"),
      h("button", { class: "x", type: "button", title: "Tirar do histórico", onclick: () => archive(d) }, "×"))))
      : h("p", { class: "empty" }, "Nenhum download ainda."));
}
