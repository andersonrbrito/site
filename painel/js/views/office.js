// The OfficE_: os agentes (tarefas agendadas do Claude) num escritório estilo Matrix + mockumentário.
// Cada perfil/área vira um departamento; cada tarefa é um funcionário numa mesa. Clicar abre a ficha:
// o que fez (execuções), o que está fazendo e o que vai fazer. A sala do chefe (Michael = Anderson) junta o que precisa dele.
import { h, fmtDateTime } from "../util.js";
import { toast } from "../ui.js";

const ago = (ts) => { if (!ts) return "nunca"; const m = Math.round((Date.now() - Date.parse(ts)) / 60000); return m < 1 ? "agora" : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} d`; };
const ate = (ts) => { if (!ts) return ""; const m = Math.round((Date.parse(ts) - Date.now()) / 60000); return m <= 0 ? "a qualquer momento" : m < 60 ? `em ${m} min` : m < 1440 ? `em ${Math.round(m / 60)} h` : `em ${Math.round(m / 1440)} d`; };

// departamentos por palavra-chave na conta/título
const DEPTOS = [
  ["vendas", "Vendas & Leads", "💼", /lead|venda|vaga|trampo|prospect|cliente|kit|social/i],
  ["redacao", "Redação (X e LinkedIn)", "📝", /postador|radar|x\b|linkedin|artigo|post/i],
  ["estudio", "Estúdio de Vídeo", "🎬", /reel|vídeo|video|kairos|mazzaropi|fofudo|ocorintia|transe|hipn|narah|tiktok|fato|noticia/i],
  ["arte", "Arte & Carrossel", "🎨", /carross|lâmina|lamina|thumb|capa|design|imagem/i],
  ["ti", "TI & Relatórios", "🖥️", /relat|sync|sincron|desempenho|métrica|metric|backup|painel/i],
];
const deptoDe = (j) => { const t = `${j.conta || ""} ${j.titulo || ""}`; return (DEPTOS.find(([, , , re]) => re.test(t)) || ["geral", "Anexo (sem departamento)", "📦"]).slice(0, 3); };

// avatar fixo por tarefa (escolha estável pelo id)
const ROSTOS = ["🧑‍💻", "👩‍💻", "👨‍💼", "👩‍🎨", "🧔", "👱‍♀️", "🧑‍🔧", "👩‍🔬", "🕵️", "🤓", "🧑‍🎤", "👨‍🍳"];
const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const rosto = (j) => ROSTOS[hash(j.task_id) % ROSTOS.length];

// humor de mockumentário: depoimento pra câmera conforme o estado
const FALAS = {
  executando: ["Não posso falar agora. Estou literalmente trabalhando. Diferente de certas pessoas.", "Se o Michael perguntar, eu estou nisso desde às 5h. Ele não vai checar.", "Isso aqui é cinema. O Oscar vem."],
  concluida: ["Terminei. Ninguém aplaudiu. Normal.", "Entreguei antes do prazo. Anotem isso pra minha avaliação.", "Fiz meu trabalho. Agora vou fingir que estou ocupado."],
  falha: ["Não fui eu. Foi o servidor. O servidor tem histórico.", "Deu erro, mas aprendi muito. Principalmente sobre erros.", "Michael, antes de você ler o log... respira."],
  revisao: ["Está pronto, só falta o chefe aprovar. Ele vai demorar.", "Deixei na mesa do Michael. Embaixo da caneca."],
  pausada: ["Me pausaram. Estou de férias forçadas. Não reclamo.", "Zzz. Me acorda quando for dia de pagamento."],
  pendente: ["Ainda não comecei, mas mentalmente já estou na metade.", "Estou esperando o horário. Pontualidade é meu forte."],
};
const fala = (j) => { const k = !j.enabled ? "pausada" : j.last_status || "pendente"; const a = FALAS[k] || FALAS.pendente; return a[hash(j.task_id + new Date().getDate()) % a.length]; };
const estado = (j) => !j.enabled ? ["pausada", "de folga", "off"] : j.last_status === "executando" ? ["executando", "trabalhando", "run"] : j.last_status === "falha" ? ["falha", "deu ruim", "bad"] : j.last_status === "revisao" ? ["revisao", "esperando você", "warn"] : j.last_status === "concluida" ? ["concluida", "entregou", "ok"] : ["pendente", "aguardando", "idle"];

export default async function office({ sb, refresh }) {
  const [jR, rR, aR, qR] = await Promise.all([
    sb.from("agent_jobs").select("*").is("archived_at", null).order("titulo"),
    sb.from("agent_runs").select("session_id, task_id, titulo, status, started_at, finished_at, resumo, erro, link").is("archived_at", null).order("started_at", { ascending: false }).limit(300),
    sb.from("aprovacoes").select("id, perfil, status").eq("status", "pendente").is("archived_at", null).limit(500),
    sb.from("claude_requests").select("id, kind, status, payload, created_at").in("kind", ["agente_rodar", "agente_pausar", "agente_retomar"]).in("status", ["aberto", "gerando"]).limit(50),
  ]);
  if (jR.error || rR.error) return h("p", { class: "alert" }, "O escritório está fechado: não deu pra carregar os agentes. Atualize a página.");
  const jobs = jR.data || [], runs = rR.data || [], aprov = aR.data || [], reqs = qR.data || [];
  const runsOf = (t) => runs.filter((r) => r.task_id === t);
  const semana = Date.now() - 7 * 864e5;

  // funcionário do mês: mais entregas na semana
  const placar = jobs.map((j) => [j, runsOf(j.task_id).filter((r) => r.status === "concluida" && Date.parse(r.started_at) > semana).length]).sort((a, b) => b[1] - a[1]);
  const destaque = placar[0]?.[1] ? placar[0][0] : null;

  // ---- ficha do funcionário (gaveta) ----
  const gaveta = h("aside", { class: "of-drawer", hidden: true });
  const pedir = async (j, kind) => {
    if (reqs.some((q) => q.kind === kind && q.payload?.task_id === j.task_id)) return toast("Esse pedido já está na fila.");
    const { error } = await sb.from("claude_requests").insert({ kind, payload: { task_id: j.task_id, titulo: j.titulo } });
    if (error) return toast("Não foi possível pedir.", { kind: "err" });
    toast(kind === "agente_rodar" ? "Mandei trabalhar. Roda em até 1 hora." : kind === "agente_pausar" ? "Mandei de folga." : "Chamei de volta pro trabalho."); refresh();
  };
  const abrir = (j) => {
    const rs = runsOf(j.task_id), [st, rot, cls] = estado(j), [, dnome] = deptoDe(j);
    const atual = rs.find((r) => r.status === "executando");
    gaveta.hidden = false;
    gaveta.replaceChildren(
      h("button", { class: "of-x", type: "button", "aria-label": "Fechar", onclick: () => (gaveta.hidden = true) }, "×"),
      h("div", { class: "of-face big" }, rosto(j)),
      h("h2", null, j.titulo), h("div", { class: "mono muted" }, dnome, j.conta ? ` · ${j.conta}` : ""),
      h("span", { class: `of-st ${cls}` }, rot),
      h("blockquote", { class: "of-quote" }, "“", fala(j), "”", h("small", null, "depoimento pra câmera")),
      h("h3", { class: "mono" }, "> fazendo agora"),
      h("p", null, atual ? `Começou ${ago(atual.started_at)}: ${atual.titulo || j.titulo}` : !j.enabled ? "Nada. Está pausado." : "Nada no momento. Está na mesa esperando o horário."),
      h("h3", { class: "mono" }, "> vai fazer"),
      h("p", null, j.enabled && j.next_run_at ? `${fmtDateTime(j.next_run_at)} (${ate(j.next_run_at)})` : "Sem próxima execução marcada.", j.agenda ? ` · rotina: ${j.agenda}` : ""),
      j.descricao ? h("p", { class: "muted small" }, j.descricao) : null,
      h("h3", { class: "mono" }, `> o que fez (${rs.length})`),
      rs.length ? h("div", { class: "of-runs" }, ...rs.slice(0, 15).map((r) => h("div", { class: "of-run " + r.status },
        h("div", { class: "mono small" }, fmtDateTime(r.started_at), " · ", estado({ enabled: true, last_status: r.status })[1], r.link ? h("a", { href: r.link, target: r.link.startsWith("#") ? null : "_blank", rel: "noopener", style: { marginLeft: "8px" } }, "ver ↗") : null),
        r.resumo ? h("p", null, r.resumo) : null, r.erro ? h("p", { class: "err" }, r.erro) : null)))
        : h("p", { class: "muted" }, "Ainda não entregou nada. Estagiário."),
      h("div", { class: "flex wrap", style: { marginTop: "14px" } },
        h("button", { class: "btn btn-sm", type: "button", onclick: () => pedir(j, "agente_rodar") }, "Mandar trabalhar agora"),
        j.enabled ? h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => pedir(j, "agente_pausar") }, "Dar folga (pausar)")
          : h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => pedir(j, "agente_retomar") }, "Chamar de volta")));
  };

  // ---- mesas por departamento ----
  const grupos = new Map();
  jobs.forEach((j) => { const [id, nome, ic] = deptoDe(j); if (!grupos.has(id)) grupos.set(id, { nome, ic, js: [] }); grupos.get(id).js.push(j); });
  const mesa = (j) => {
    const [, rot, cls] = estado(j);
    return h("button", { class: `of-desk ${cls}`, type: "button", title: j.titulo, onclick: () => abrir(j) },
      h("div", { class: "of-monitor" }, h("i"), h("i"), h("i")),
      h("div", { class: "of-face" }, rosto(j), destaque === j ? h("span", { class: "of-trofeu", title: "Funcionário da semana" }, "🏆") : null),
      h("div", { class: "of-name" }, j.titulo), h("div", { class: "of-tag mono" }, rot));
  };
  const salas = [...grupos.values()].sort((a, b) => b.js.length - a.js.length).map((g) => h("section", { class: "of-room" },
    h("header", null, h("span", null, g.ic), h("b", { class: "grow" }, g.nome), h("span", { class: "mono muted" }, `${g.js.length} na sala`)),
    h("div", { class: "of-desks" }, ...g.js.map(mesa))));

  // ---- sala do chefe: o que precisa do Michael ----
  const falhas = jobs.filter((j) => j.enabled && j.last_status === "falha");
  const revis = jobs.filter((j) => j.last_status === "revisao");
  const atrasados = jobs.filter((j) => j.enabled && j.next_run_at && Date.parse(j.next_run_at) < Date.now() - 3 * 3600e3);
  const aviso = (ic, txt, onclick, href) => h(href ? "a" : "button", { class: "of-memo", type: href ? null : "button", href, onclick }, h("span", null, ic), h("span", { class: "grow" }, txt), h("span", { class: "mono" }, "→"));
  const memos = [
    ...falhas.map((j) => aviso("🔥", `${j.titulo}: deu erro ${ago(j.last_run_at)}. Precisa olhar.`, () => abrir(j))),
    ...revis.map((j) => aviso("✋", `${j.titulo}: terminou e espera sua aprovação.`, () => abrir(j))),
    aprov.length ? aviso("📥", `${aprov.length} peças esperando você no AprovaçõeS_.`, null, "#/aprovacoes") : null,
    ...atrasados.map((j) => aviso("⏰", `${j.titulo}: devia ter rodado ${ago(j.next_run_at)}. O app do Claude está aberto?`, () => abrir(j))),
  ].filter(Boolean);
  const trabalhando = jobs.filter((j) => j.last_status === "executando").length;
  const entregas = runs.filter((r) => r.status === "concluida" && Date.parse(r.started_at) > Date.now() - 864e5).length;

  const chefe = h("section", { class: "of-boss" },
    h("div", { class: "of-boss-head" },
      h("div", { class: "of-face big" }, "🧑‍💼"),
      h("div", { class: "grow" }, h("div", { class: "mono accent" }, "// sala do gerente regional"), h("h2", null, "Michael (você)"),
        h("div", { class: "of-mug", title: "presente de si mesmo" }, "☕ MELHOR CHEFE DO MUNDO")),
      h("div", { class: "of-kpis" },
        h("div", null, h("b", null, String(trabalhando)), h("span", null, "trabalhando")),
        h("div", null, h("b", null, String(entregas)), h("span", null, "entregas 24 h")),
        h("div", { class: memos.length ? "hot" : "" }, h("b", null, String(memos.length)), h("span", null, "precisam de você")))),
    memos.length ? h("div", { class: "of-memos" }, h("div", { class: "mono" }, "> recados na sua mesa"), ...memos)
      : h("p", { class: "of-calm" }, "Nenhum recado. A equipe está funcionando sem você. Isso é ótimo... ou preocupante."),
    destaque ? h("p", { class: "of-award" }, "🏆 Funcionário da semana: ", h("b", null, destaque.titulo), ` (${placar[0][1]} entregas). Discurso na próxima reunião, que ninguém pediu.`) : null);

  return h("div", { class: "page office" },
    h("div", { class: "of-rain", "aria-hidden": "true" }),
    h("div", { class: "page-head" }, h("div", null, h("div", { class: "mono eyebrow" }, "// anderson_Os · filial Matrix"), h("h1", null, "The OfficE_")),
      h("span", { class: "mono muted" }, `${jobs.length} funcionários · ${grupos.size} departamentos`)),
    chefe,
    jobs.length ? h("div", { class: "of-floor" }, ...salas) : h("p", { class: "empty" }, "O escritório está vazio. A sincronização dos agentes ainda não rodou."),
    gaveta);
}
