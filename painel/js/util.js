// Construtor de DOM: texto sempre entra como nó de texto (nunca innerHTML), evitando XSS.
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  const add = (c) => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach(add);
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  };
  kids.forEach(add);
  return el;
}

export const TZ = "America/Sao_Paulo";
export const todayISO = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
export function addDaysISO(iso, n) { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); }
// Data sem horário: formata como UTC para não "voltar um dia".
export function fmtDate(iso, long = true) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", ...(long ? { weekday: "short" } : {}), day: "2-digit", month: "short" }).format(new Date(Date.UTC(y, m - 1, d)));
}
export const fmtDateTime = (ts) => ts ? new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(ts)) : "";
export const fmtTime = (ts) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
export const dayOf = (ts) => todayISO(new Date(ts));
export const spLocalToISO = (local) => new Date(`${local}:00-03:00`).toISOString(); // SP sem horário de verão: UTC-3
export const spStartUTC = (iso) => new Date(`${iso}T00:00:00-03:00`).toISOString();
export const isOverdue = (due, status, today = todayISO()) => !!due && due < today && !["concluido", "cancelado"].includes(status);

export const STATUSES = ["inbox", "a_fazer", "em_andamento", "aguardando", "concluido", "cancelado"];
export const PRIORITIES = ["baixa", "normal", "alta", "urgente"];
export const AREAS = ["trabalho", "pessoal"];
export const PROJECT_AREAS = ["doti", "woob", "freelas", "pessoal"];
export const PROJECT_STATUSES = ["ativo", "pausado", "concluido", "cancelado"];
export const STAGES = ["briefing", "producao", "revisao", "aprovacao", "entrega"];
export const PAYMENT = ["nao_aplicavel", "pendente", "parcial", "pago"];
export const L = {
  status: { inbox: "Inbox", a_fazer: "A fazer", em_andamento: "Em andamento", aguardando: "Aguardando", concluido: "Concluído", cancelado: "Cancelado" },
  priority: { baixa: "Baixa", normal: "Normal", alta: "Alta", urgente: "Urgente" },
  area: { trabalho: "Trabalho", pessoal: "Pessoal" },
  projectArea: { doti: "Doti", woob: "Woob", freelas: "Freelas", pessoal: "Projetos pessoais" },
  projectStatus: { ativo: "Ativo", pausado: "Pausado", concluido: "Concluído", cancelado: "Cancelado" },
  stage: { briefing: "Briefing", producao: "Produção", revisao: "Revisão", aprovacao: "Aprovação", entrega: "Entrega" },
  payment: { nao_aplicavel: "Sem cobrança", pendente: "Pagamento pendente", parcial: "Parcial", pago: "Pago" },
};
export const PRIO_COLOR = { urgente: "#ff6b6b", alta: "#ff9a5c", normal: "#3da7ff", baixa: "#6e6e80" };
export const STATUS_COLOR = { inbox: "#8888a0", a_fazer: "#3da7ff", em_andamento: "#22c55e", aguardando: "#f5a524", concluido: "#22c55e", cancelado: "#6e6e80" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const nz = (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

/** Lê o formulário de tarefa e valida. Retorna { value } ou { error }. */
export function taskFromForm(fd) {
  const title = nz(fd.get("title"));
  if (!title) return { error: "O título é obrigatório." };
  if (title.length > 300) return { error: "Título muito longo (máx. 300)." };
  const pick = (k, list, label) => { const v = nz(fd.get(k)); if (v && !list.includes(v)) throw new Error(`${label} inválido.`); return v; };
  try {
    const due = nz(fd.get("due_date"));
    if (due && !ISO.test(due)) return { error: "Prazo inválido." };
    const tags = (nz(fd.get("tags")) || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 20);
    const v = {
      title, description: nz(fd.get("description")), project_id: nz(fd.get("project_id")), due_date: due,
      waiting_for: nz(fd.get("waiting_for")), assignee: nz(fd.get("assignee")), tags, notes: nz(fd.get("notes")),
    };
    const status = pick("status", STATUSES, "Status"), priority = pick("priority", PRIORITIES, "Prioridade"), area = pick("area", AREAS, "Área");
    if (status) v.status = status; if (priority) v.priority = priority; if (area) v.area = area;
    return { value: v };
  } catch (e) { return { error: e.message }; }
}
export const str = nz;
