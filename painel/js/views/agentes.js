// AgenteS_: todas as tarefas agendadas do Claude Code com status real (sincronizado das execuções),
// últimas execuções com resumo/erro e pedidos de ação (rodar agora, pausar, retomar) atendidos pela rotina de sincronização.
import { h, fmtDateTime } from "../util.js";
import { toast, pageHead } from "../ui.js";

const ST = { pendente: ["pendente", ""], executando: ["executando", "accent"], concluida: ["concluída", "ok"], falha: ["falha", "danger"], revisao: ["revisão", "warn"] };
const chip = (s) => { const [l, c] = ST[s] || [s || "sem execução", ""]; return h("span", { class: `chip ${c}` }, l); };
const ago = (ts) => { if (!ts) return ""; const m = Math.round((Date.now() - Date.parse(ts)) / 60000); return m < 1 ? "agora" : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} d`; };

export default async function agentes({ sb, refresh }) {
  const [jR, rR, qR] = await Promise.all([
    sb.from("agent_jobs").select("*").is("archived_at", null).order("titulo"),
    sb.from("agent_runs").select("session_id, task_id, titulo, status, started_at, finished_at, resumo, erro, link, custo").is("archived_at", null).order("started_at", { ascending: false }).limit(120),
    sb.from("claude_requests").select("id, kind, status, payload, result_note, created_at").in("kind", ["agente_rodar", "agente_pausar", "agente_retomar"]).is("archived_at", null).order("created_at", { ascending: false }).limit(20),
  ]);
  if (jR.error || rR.error) return h("p", { class: "alert" }, "Não foi possível carregar os agentes. A migration 0030 foi aplicada?");
  const jobs = jR.data || [], runs = rR.data || [], reqs = qR.data || [];
  const sync = jobs.reduce((s, j) => (j.synced_at > s ? j.synced_at : s), "");
  const open = (task, kind) => reqs.find((q) => q.payload?.task_id === task && q.kind === kind && ["aberto", "gerando"].includes(q.status));
  const ask = async (j, kind) => {
    if (open(j.task_id, kind)) return toast("Esse pedido já está na fila.");
    const { error } = await sb.from("claude_requests").insert({ kind, payload: { task_id: j.task_id, titulo: j.titulo } });
    if (error) return toast("Não foi possível pedir.", { kind: "err" });
    toast("Pedido enviado. A rotina de sincronização executa em até 1 hora (com o app do Claude aberto)."); refresh();
  };
  let filtro = "todos";
  const runsOf = (t) => runs.filter((r) => r.task_id === t);
  const list = h("div", { class: "stack" });
  const draw = () => {
    const vis = jobs.filter((j) => filtro === "todos" || (filtro === "falha" ? j.last_status === "falha" : filtro === "pausados" ? !j.enabled : j.enabled));
    list.replaceChildren(...vis.map((j) => {
      const rs = runsOf(j.task_id);
      return h("details", { class: "ag-job" + (j.last_status === "falha" ? " bad" : "") + (!j.enabled ? " off" : "") },
        h("summary", null,
          h("div", { class: "ag-line" },
            h("div", { class: "grow", style: { minWidth: 0 } }, h("b", { class: "truncate", style: { display: "block" } }, j.titulo), h("span", { class: "muted small" }, [j.agenda || j.cron, j.conta].filter(Boolean).join(" · "))),
            !j.enabled && h("span", { class: "chip" }, "pausada"), chip(j.last_status),
            h("span", { class: "mono muted hide-sm" }, j.last_run_at ? `última ${ago(j.last_run_at)}` : ""),
            h("span", { class: "mono hide-sm" }, j.enabled && j.next_run_at ? `próxima ${fmtDateTime(j.next_run_at)}` : ""))),
        h("div", { class: "ag-body" },
          j.descricao && h("p", { class: "small" }, j.descricao),
          h("dl", { class: "eco-dl" }, ...[["ID", j.task_id], ["Modelo", j.modelo], ["Conta / área", j.conta], ["Agenda", [j.agenda, j.cron && `(${j.cron})`].filter(Boolean).join(" ")], ["Custo", j.custo], ["Notas", j.notas]].filter(([, v]) => v).flatMap(([k, v]) => [h("dt", null, k), h("dd", null, v)])),
          h("div", { class: "flex wrap" },
            h("button", { class: "btn btn-sm", type: "button", disabled: !!open(j.task_id, "agente_rodar"), onclick: () => ask(j, "agente_rodar") }, open(j.task_id, "agente_rodar") ? "na fila para rodar" : "Rodar agora"),
            j.enabled ? h("button", { class: "btn btn-ghost btn-sm", type: "button", disabled: !!open(j.task_id, "agente_pausar"), onclick: () => ask(j, "agente_pausar") }, open(j.task_id, "agente_pausar") ? "pausa na fila" : "Pausar")
              : h("button", { class: "btn btn-ghost btn-sm", type: "button", disabled: !!open(j.task_id, "agente_retomar"), onclick: () => ask(j, "agente_retomar") }, open(j.task_id, "agente_retomar") ? "retomada na fila" : "Retomar")),
          h("div", { class: "mono", style: { margin: "14px 0 6px" } }, `execuções (${rs.length})`),
          rs.length ? h("div", { class: "stack" }, ...rs.slice(0, 10).map((r) => h("div", { class: "ag-run" },
            h("div", { class: "flex wrap" }, chip(r.status), h("span", { class: "mono muted" }, fmtDateTime(r.started_at)), r.finished_at && r.started_at && h("span", { class: "mono muted" }, `${Math.max(1, Math.round((Date.parse(r.finished_at) - Date.parse(r.started_at)) / 60000))} min`), r.custo && h("span", { class: "chip" }, r.custo), r.link && h("a", { class: "chip", href: r.link, target: r.link.startsWith("#") ? null : "_blank", rel: "noopener" }, "resultado ↗")),
            r.resumo && h("p", { class: "small", style: { marginTop: "4px" } }, r.resumo),
            r.erro && h("p", { class: "small", style: { marginTop: "4px", color: "var(--danger)" } }, r.erro))))
            : h("p", { class: "empty" }, "Nenhuma execução registrada ainda.")));
    }));
  };
  const tabs = h("div", { class: "flex wrap" }, ...[["todos", `Todas (${jobs.length})`], ["ativos", `Ativas (${jobs.filter((j) => j.enabled).length})`], ["pausados", `Pausadas (${jobs.filter((j) => !j.enabled).length})`], ["falha", `Com falha (${jobs.filter((j) => j.last_status === "falha").length})`]]
    .map(([k, l]) => h("button", { type: "button", class: `chip${filtro === k ? " accent" : ""}`, onclick: (e) => { filtro = k; tabs.querySelectorAll("button").forEach((b) => b.classList.remove("accent")); e.currentTarget.classList.add("accent"); draw(); } }, l)));
  draw();
  const falhas24 = runs.filter((r) => r.status === "falha" && Date.parse(r.started_at) > Date.now() - 864e5).length;
  return h("div", { class: "page" },
    pageHead("AgenteS_", "tarefas agendadas do Claude"),
    h("div", { class: "kpis" },
      h("div", { class: "kpi" }, h("span", { class: "mono" }, "Tarefas"), h("b", null, String(jobs.length)), h("span", { class: "muted small" }, `${jobs.filter((j) => j.enabled).length} ativas`)),
      h("div", { class: "kpi" }, h("span", { class: "mono" }, "Execuções 24 h"), h("b", null, String(runs.filter((r) => Date.parse(r.started_at) > Date.now() - 864e5).length)), h("span", { class: "muted small" }, `${runs.filter((r) => r.status === "executando").length} rodando agora`)),
      h("div", { class: "kpi" + (falhas24 ? " hot" : "") }, h("span", { class: "mono" }, "Falhas 24 h"), h("b", null, String(falhas24)), h("span", { class: "muted small" }, "abra a tarefa para ver o erro")),
      h("div", { class: "kpi" }, h("span", { class: "mono" }, "Sincronizado"), h("b", null, sync ? ago(sync) : "nunca"), h("span", { class: "muted small" }, sync ? fmtDateTime(sync) : "a rotina de sincronização roda de hora em hora"))),
    h("p", { class: "muted small", style: { margin: "12px 0" } }, "Os dados vêm das tarefas agendadas reais do app do Claude (lista e execuções), copiados para cá de hora em hora. As rotinas só rodam com o app do Claude aberto no Mac; se ele estiver fechado, rodam ao abrir."),
    tabs, h("div", { style: { marginTop: "12px" } }, list),
    reqs.length ? h("section", { class: "panel", style: { marginTop: "20px" } }, h("div", { class: "panel-head" }, h("span", { class: "pd", style: { background: "var(--accent)" } }), h("h2", { class: "mono grow" }, "Pedidos de ação")),
      h("div", { class: "panel-body stack" }, ...reqs.map((q) => h("div", { class: "agrow" }, h("span", { class: "mono muted" }, fmtDateTime(q.created_at)), h("span", { class: "grow" }, `${{ agente_rodar: "Rodar", agente_pausar: "Pausar", agente_retomar: "Retomar" }[q.kind]} · ${q.payload?.titulo || q.payload?.task_id}`), h("span", { class: "chip" }, q.status), q.result_note && h("span", { class: "muted small" }, q.result_note))))) : null);
}
