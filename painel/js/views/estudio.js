// StúdiO_: todos os carrosséis que viraram vídeo (Reel 9:16 e/ou X 16:9). O pedido nasce no CarrosseL_
// ("Transformar em vídeo"); a rotina de pedidos entrega o MP4 e o link fica no result_note do pedido.
// Cada formato tem nome (não número), botão de baixar e de enviar pro iPhone (um, outro ou os dois),
// e "Já usei" tira o vídeo da tela (fica guardado em payload.estudio_ok, recuperável em "Mostrar os já usados").
import { h, fmtDateTime } from "../util.js";
import { CELULAR, salvarNaGaleria, urlParaFile } from "../galeria.js?v=20261111a";
import { pageHead, toast, copiarTexto } from "../ui.js?v=20261107b";

const MP4 = /\/painel\/carrosseis\/[\w./-]+\.mp4/g;
const ST = { aberto: ["na fila", "warn"], gerando: ["gerando", "accent"], feito: ["pronto", "ok"], cancelado: ["cancelado", ""] };
const versao = (u) => { const m = u.split("/").pop().match(/-v(\d+)\.mp4$/); return m ? ` · v${m[1]}` : ""; };
const formato = (u) => (versao(u) ? formatoBase(u) + versao(u) : formatoBase(u));
const formatoBase = (u) => (/reel|9x16|vertical/i.test(u.split("/").pop()) ? "Reel 9:16" : /(^|[-_])x([-_.]|$)|16x9|horizontal/i.test(u.split("/").pop()) ? "X 16:9" : u.split("/").pop().replace(/\.mp4$/, ""));
const ordem = (a, b) => (versao(b) > versao(a) ? 1 : versao(b) < versao(a) ? -1 : formato(a).startsWith("Reel") ? -1 : formato(b).startsWith("Reel") ? 1 : 0);

export default async function estudio({ sb }) {
  const { data, error } = await sb.from("claude_requests").select("id, status, payload, result_note, created_at, done_at, version").eq("kind", "carrossel_video").is("archived_at", null).order("created_at", { ascending: false }).limit(200);
  if (error) return h("p", { class: "alert" }, "Não foi possível carregar os vídeos.");
  const reqs = data || [];
  let filtro = "todos", verUsados = false;
  const grid = h("div", { class: "st-list" });
  const usado = (r) => !!r.payload?.estudio_ok;

  const marcarUsado = async (r, ok) => {
    const payload = { ...(r.payload || {}), estudio_ok: ok };
    const { data: d, error: e } = await sb.from("claude_requests").update({ payload }).eq("id", r.id).eq("version", r.version).select("version, payload").maybeSingle();
    if (e || !d) return toast("Não salvou (recarregue a página).", { kind: "err" });
    r.version = d.version; r.payload = d.payload;
    toast(ok ? "Saiu da tela. Está em \"Mostrar os já usados\"." : "Voltou para a tela.", ok ? { actionLabel: "Desfazer", onAction: () => marcarUsado(r, false) } : {});
    draw();
  };

  // Enviar pro iPhone: o compartilhar do sistema exige toque recente; como baixar o vídeo leva tempo,
  // o 1º toque prepara e o 2º abre o compartilhar (no iPhone: "Salvar vídeo" vai pra galeria; no Mac: AirDrop).
  const enviar = (r, urls, rotulo) => {
    let pacote = null;
    const btn = h("button", { class: "btn btn-sm st-iphone", type: "button" }, rotulo);
    const compartilhar = async () => {
      const leg = r.payload?.carrossel?.legenda;
      try {
        await navigator.share({ files: pacote, title: r.payload?.carrossel?.titulo || "Vídeo" });
        toast(leg ? "Enviado. A legenda está copiada: é só colar no Instagram." : "Enviado.");
        pacote = null; btn.textContent = rotulo;
      } catch (e) {
        if (e.name === "AbortError") return;
        if (e.name === "NotAllowedError") { btn.textContent = "Tocar de novo para enviar"; return toast("Vídeo pronto. Toque de novo para abrir o compartilhar."); }
        toast("Não deu para compartilhar: " + e.message, { kind: "err" });
      }
    };
    btn.addEventListener("click", async () => {
      if (r.payload?.carrossel?.legenda) copiarTexto(r.payload.carrossel.legenda, "Legenda copiada."); // no toque, antes de qualquer espera
      if (pacote) return compartilhar();
      if (!navigator.canShare) { toast("Este navegador não abre o compartilhar com vídeo. Abra o painel no Safari do iPhone ou do Mac. Baixando aqui.", { kind: "err" }); urls.forEach((u) => { const a = h("a", { href: u, download: "" }); document.body.append(a); a.click(); a.remove(); }); return; }
      btn.disabled = true; btn.textContent = "Preparando…";
      try {
        const files = [];
        for (const u of urls) { const b = await (await fetch(u)).blob(); files.push(new File([b], `${(r.payload?.slug || "video")}-${formato(u).startsWith("Reel") ? "reel-9x16" : "x-16x9"}.mp4`, { type: "video/mp4" })); }
        if (!navigator.canShare({ files })) throw new Error("o navegador recusou o vídeo");
        pacote = files;
      } catch (e) { btn.textContent = rotulo; toast("Não preparou o vídeo: " + e.message, { kind: "err" }); return; }
      finally { btn.disabled = false; }
      btn.textContent = "Tocar de novo para enviar";
      return compartilhar();
    });
    return btn;
  };

  // Baixar no Mac/PC: busca o arquivo e salva como MP4 com nome do carrossel (o link simples às vezes só abria o player)
  const baixarBtn = (r, u) => {
    const nome = `${(r.payload?.slug || "video")}-${formato(u).startsWith("Reel") ? "reel-9x16" : "x-16x9"}.mp4`;
    const b = h("button", { class: "btn btn-sm", type: "button", onclick: async () => {
      if (CELULAR) return salvarNaGaleria(b, (info) => { info("Preparando…"); return urlParaFile(u, nome).then((f) => [f]); });
      const rot = b.textContent; b.disabled = true; b.textContent = "Baixando…";
      try {
        const res = await fetch(u); if (!res.ok) throw new Error("arquivo não encontrado");
        const url = URL.createObjectURL(await res.blob());
        const a = h("a", { href: url, download: `${(r.payload?.slug || "video")}-${formato(u).startsWith("Reel") ? "reel-9x16" : "x-16x9"}.mp4` });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
        toast("Vídeo baixado.");
      } catch (e) { toast("Não baixou: " + e.message, { kind: "err" }); }
      b.disabled = false; b.textContent = rot;
    } }, "⬇ " + formato(u));
    return b;
  };

  const card = (r) => {
    const vids = [...new Set((r.result_note || "").match(MP4) || [])].sort(ordem), [sl, sc] = ST[r.status] || [r.status, ""];
    const titulo = r.payload?.carrossel?.titulo || r.payload?.slug || "Carrossel";
    return h("article", { class: "panel st-row" + (usado(r) ? " st-usado" : "") },
      vids.length ? h("div", { class: "st-vids" }, ...vids.map((u) => h("figure", { class: "st-fig" + (formato(u).startsWith("Reel") ? "" : " st-wide") },
        h("figcaption", { class: "mono" }, formato(u)), h("video", { src: u, controls: true, playsinline: true, preload: "metadata" }))))
        : h("div", { class: "st-media" }, h("div", { class: "st-wait" }, h("span", { class: `chip ${sc}` }, sl))),
      h("div", { class: "panel-body st-side" },
        h("b", { class: "st-title" }, titulo),
        h("div", { class: "flex wrap", style: { gap: "6px", margin: "6px 0" } }, h("span", { class: `chip ${sc}` }, sl), ...vids.map((u) => h("span", { class: "chip" }, formato(u))), h("span", { class: "mono muted" }, fmtDateTime(r.done_at || r.created_at))),
        vids.length ? h("div", { class: "st-acts" },
          h("div", { class: "flex wrap" }, h("span", { class: "mono" }, "iPhone:"), ...vids.map((u) => enviar(r, [u], formato(u))), vids.length > 1 && enviar(r, vids, "Os dois")),
          h("div", { class: "flex wrap" }, h("span", { class: "mono" }, "Baixar:"), ...vids.map((u) => baixarBtn(r, u)))) : null,
        h("div", { class: "flex wrap", style: { marginTop: "10px", justifyContent: "space-between" } },
          r.payload?.slug ? h("a", { class: "btn btn-ghost btn-sm", href: `#/carrosseis?c=${encodeURIComponent(r.payload.slug)}` }, "Abrir carrossel") : h("span"),
          vids.length ? h("label", { class: "st-check" }, h("input", { type: "checkbox", checked: usado(r), onchange: (e) => marcarUsado(r, e.target.checked) }), usado(r) ? "Já usei (voltar para a tela)" : "Já usei · tirar da tela") : null)));
  };

  const tabs = h("div", { class: "flex wrap", style: { marginBottom: "14px" } });
  const draw = () => {
    const ativos = reqs.filter((r) => verUsados || !usado(r));
    const n = (f) => ativos.filter(f).length;
    tabs.replaceChildren(
      ...[["todos", `Todos (${ativos.length})`, () => true], ["prontos", `Prontos (${n((r) => r.status === "feito")})`, (r) => r.status === "feito"], ["fila", `Na fila (${n((r) => ["aberto", "gerando"].includes(r.status))})`, (r) => ["aberto", "gerando"].includes(r.status)]]
        .map(([k, l]) => h("button", { type: "button", class: `chip${filtro === k ? " accent" : ""}`, style: { height: "30px", padding: "0 12px", cursor: "pointer" }, onclick: () => { filtro = k; draw(); } }, l)),
      h("button", { type: "button", class: `chip${verUsados ? " accent" : ""}`, style: { height: "30px", padding: "0 12px", cursor: "pointer", marginLeft: "auto" }, onclick: () => { verUsados = !verUsados; draw(); } }, verUsados ? "Esconder os já usados" : `Mostrar os já usados (${reqs.filter(usado).length})`));
    const vis = ativos.filter((r) => filtro === "todos" || (filtro === "prontos" ? r.status === "feito" : ["aberto", "gerando"].includes(r.status)));
    grid.replaceChildren(...(vis.length ? vis.map(card) : [h("p", { class: "empty" }, "Nenhum vídeo aqui. No CarrosseL_, use “Transformar em vídeo” em um carrossel.")]));
  };
  draw();
  return h("div", { class: "page wide" }, pageHead("StúdiO_", "carrosséis transformados em vídeo", h("a", { class: "btn btn-ghost btn-sm", href: "#/carrosseis" }, "CarrosseL_ →")), tabs, grid);
}
