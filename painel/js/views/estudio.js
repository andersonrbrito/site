// StúdiO_: todos os carrosséis que viraram vídeo (Reel 9:16 e/ou X 16:9). O pedido nasce no CarrosseL_
// ("Transformar em vídeo"); a rotina de pedidos entrega o MP4 e o link fica no result_note do pedido.
import { h, fmtDateTime } from "../util.js";
import { pageHead } from "../ui.js";

const MP4 = /\/painel\/carrosseis\/[\w./-]+\.mp4/g;
const ST = { aberto: ["na fila", "warn"], gerando: ["gerando", "accent"], feito: ["pronto", "ok"], cancelado: ["cancelado", ""] };

export default async function estudio({ sb }) {
  const { data, error } = await sb.from("claude_requests").select("id, status, payload, result_note, created_at, done_at").eq("kind", "carrossel_video").is("archived_at", null).order("created_at", { ascending: false }).limit(200);
  if (error) return h("p", { class: "alert" }, "Não foi possível carregar os vídeos.");
  const reqs = data || [];
  let filtro = "todos";
  const grid = h("div", { class: "st-grid" });
  const draw = () => {
    const vis = reqs.filter((r) => filtro === "todos" || (filtro === "prontos" ? r.status === "feito" : ["aberto", "gerando"].includes(r.status)));
    grid.replaceChildren(...(vis.length ? vis.map((r) => {
      const vids = (r.result_note || "").match(MP4) || [], [sl, sc] = ST[r.status] || [r.status, ""];
      const titulo = r.payload?.carrossel?.titulo || r.payload?.slug || "Carrossel";
      return h("article", { class: "panel st-card" },
        h("div", { class: "st-media" }, vids.length ? h("video", { src: vids[0], controls: true, playsinline: true, preload: "metadata" }) : h("div", { class: "st-wait" }, h("span", { class: `chip ${sc}` }, sl))),
        h("div", { class: "panel-body" },
          h("b", { class: "st-title" }, titulo),
          h("div", { class: "flex wrap", style: { gap: "6px", margin: "6px 0" } }, h("span", { class: `chip ${sc}` }, sl), ...(r.payload?.formatos || []).map((f) => h("span", { class: "chip" }, f === "x" ? "X 16:9" : "Reel 9:16")), h("span", { class: "mono muted" }, fmtDateTime(r.done_at || r.created_at))),
          vids.length > 1 && h("div", { class: "stack" }, ...vids.slice(1).map((u) => h("video", { src: u, controls: true, playsinline: true, preload: "metadata", style: { width: "100%", borderRadius: "8px" } }))),
          h("div", { class: "flex wrap", style: { marginTop: "8px" } },
            ...vids.map((u, i) => h("a", { class: "btn btn-sm", href: u, download: "" }, vids.length > 1 ? `Baixar ${i + 1}` : "Baixar MP4")),
            r.payload?.slug && h("a", { class: "btn btn-ghost btn-sm", href: `#/carrosseis?c=${encodeURIComponent(r.payload.slug)}` }, "Abrir carrossel"))));
    }) : [h("p", { class: "empty" }, "Nenhum vídeo ainda. No CarrosseL_, use “Transformar em vídeo” em um carrossel.")]));
  };
  const tabs = h("div", { class: "flex wrap", style: { marginBottom: "14px" } }, ...[["todos", `Todos (${reqs.length})`], ["prontos", `Prontos (${reqs.filter((r) => r.status === "feito").length})`], ["fila", `Na fila (${reqs.filter((r) => ["aberto", "gerando"].includes(r.status)).length})`]]
    .map(([k, l]) => h("button", { type: "button", class: `chip${filtro === k ? " accent" : ""}`, style: { height: "30px", padding: "0 12px", cursor: "pointer" }, onclick: (e) => { filtro = k; tabs.querySelectorAll("button").forEach((b) => b.classList.remove("accent")); e.currentTarget.classList.add("accent"); draw(); } }, l)));
  draw();
  return h("div", { class: "page wide" }, pageHead("StúdiO_", "carrosséis transformados em vídeo", h("a", { class: "btn btn-ghost btn-sm", href: "#/carrosseis" }, "CarrosseL_ →")), tabs, grid);
}
