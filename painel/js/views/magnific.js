// Créditos do Magnific (tela inicial). Só lê quando o Anderson clica "Verificar agora":
// o ajudante local do Mac (tools/yt-helper, rota /magnific) roda o Claude em segundo plano com o MCP do Magnific
// (só leitura) e devolve o JSON; cada verificação fica salva em reports kind 'magnific'.
import { h, fmtDateTime, fmtDate } from "../util.js";
import { toast } from "../ui.js";

const HELPER = "http://127.0.0.1:8765";
const TIPOS = [["video", "Vídeo", "#FF4F32"], ["imagem", "Imagem", "#7b61ff"], ["audio", "Áudio", "#22c55e"]];
const n = (v) => Number(v || 0).toLocaleString("pt-BR");

export async function magnificBox(sb) {
  const { data, error } = await sb.from("reports").select("id, created_at, dados").eq("kind", "magnific").is("archived_at", null).order("created_at", { ascending: false }).limit(5);
  const box = h("section", { class: "panel mag" });
  const draw = (rows, msg) => {
    const d = rows[0]?.dados;
    const est = d?.estimado || {}, tot = TIPOS.reduce((s, [k]) => s + Number(est[k] || 0), 0) || 1;
    const btn = h("button", { class: "btn btn-sm", type: "button", onclick: () => verificar(btn) }, "Verificar agora");
    box.replaceChildren(
      h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "#FF4F32" } }), h("h2", { class: "mono grow" }, "Créditos Magnific"), btn),
      h("div", { class: "panel-body stack" }, ...[
        msg ? h("p", { class: "muted small" }, msg) : null,
        !d ? h("p", { class: "empty" }, error ? "Aplique a migration 0037 para guardar as verificações." : "Nenhuma verificação ainda. Clique em Verificar agora (no Mac).") : null,
        d ? h("div", { class: "mag-top" },
          h("div", null, h("span", { class: "muted small" }, "Plano"), h("b", null, (d.plano || "?") + (d.unlimited ? " · Unlimited" : ""))),
          h("div", null, h("span", { class: "muted small" }, "Saldo"), h("b", null, `${n(d.disponivel)} / ${n(d.total)}`)),
          h("div", null, h("span", { class: "muted small" }, "Renova"), h("b", null, d.renovacao ? fmtDate(d.renovacao, true) : "não lido"))) : null,
        d ? h("div", { class: "mag-meter" }, h("span", { style: { width: `${Math.min(100, (d.gasto / (d.total || 1)) * 100)}%` } })) : null,
        d ? h("p", { class: "muted small" }, `${n(d.gasto)} gastos no ciclo desde ${d.ciclo_inicio ? fmtDate(d.ciclo_inicio, false) : "?"}`) : null,
        d ? h("div", { class: "mag-bars" }, ...TIPOS.map(([k, label, cor]) => h("div", { class: "mag-bar" },
          h("span", { class: "small" }, label),
          h("div", { class: "mag-track" }, h("span", { style: { width: `${(Number(est[k] || 0) / tot) * 100}%`, background: cor } })),
          h("span", { class: "mono small" }, `${n(est[k])} · ${n(d.contagem?.[k])}×`)))) : null,
        d ? h("p", { class: "muted small" }, "Crédito por tipo é estimativa (contagem × custo simulado de cada tipo).") : null,
        rows.length ? h("details", null, h("summary", { class: "mono small" }, `Última verificação: ${fmtDateTime(rows[0].created_at)}`),
          h("ul", { class: "stack small", style: { listStyle: "none", padding: 0 } }, ...rows.map((r) => h("li", { class: "muted" },
            `${fmtDateTime(r.created_at)} · saldo ${n(r.dados?.disponivel)} · gasto ${n(r.dados?.gasto)}${r.dados?.obs ? " · " + r.dados.obs : ""}`)))) : null,
      ].filter(Boolean)));
  };
  const verificar = async (btn) => {
    btn.disabled = true; btn.textContent = "Verificando…";
    try {
      const r = await fetch(HELPER + "/magnific", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((x) => x.json());
      if (!r.job) throw new Error(r.error || "ajudante não respondeu");
      draw(rowsNow, "Lendo o Magnific em segundo plano (1 a 3 min). Pode continuar usando o painel.");
      let job;
      for (let i = 0; i < 120; i++) {
        await new Promise((ok) => setTimeout(ok, 5000));
        job = await fetch(HELPER + "/job/" + r.job).then((x) => x.json());
        if (job.status !== "verificando") break;
      }
      if (job?.status !== "pronto") throw new Error(job?.error || "demorou demais");
      const ins = await sb.from("reports").insert({ kind: "magnific", body: `Magnific: saldo ${job.dados.disponivel}/${job.dados.total}`, dados: job.dados }).select("id, created_at, dados").single();
      if (ins.error) throw new Error("não salvou: " + ins.error.message);
      rowsNow = [ins.data, ...rowsNow].slice(0, 5);
      draw(rowsNow); toast("Créditos do Magnific atualizados");
    } catch (e) {
      draw(rowsNow, e instanceof TypeError ? "O ajudante do Mac não respondeu. A verificação só funciona no navegador do Mac." : "Falhou: " + e.message);
    }
  };
  let rowsNow = data || [];
  draw(rowsNow);
  return box;
}
