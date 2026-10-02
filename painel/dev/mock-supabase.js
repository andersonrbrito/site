// Supabase FALSO em memória, só para testar a interface localmente (não é usado em produção).
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const add = (n) => { const [y, m, d] = today.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const P = [{ id: uid(900), seq: 1, name: "Viver+ institucional", area: "freelas", status: "ativo", stage: "revisao", payment_status: "pendente", due_date: add(5), version: 1, source: "painel", description: "", archived_at: null }, { id: uid(901), seq: 2, name: "Aftermovie Woob", area: "woob", status: "ativo", stage: "producao", payment_status: "parcial", due_date: add(11), version: 1, source: "painel", description: "", archived_at: null }];
const T = (seq, title, status, priority, due, proj, waiting) => ({ id: uid(seq), seq, title, status, priority, due_date: due === null ? null : add(due), project_id: proj ? P[proj - 1].id : null, waiting_for: waiting || null, area: "trabalho", tags: [], description: null, notes: null, assignee: null, completed_at: null, version: 1, created_at: new Date().toISOString(), source: "painel", archived_at: null });
const DB = {
  projects: P,
  tasks: [T(14, "Enviar orçamento Artur Nogueira", "a_fazer", "alta", -3), T(16, "Revisar legendas do aftermovie", "em_andamento", "normal", -1, 2), T(22, "Fechar proposta Woob", "a_fazer", "urgente", 0, 2), T(18, "Entregar vídeo da Viver+", "em_andamento", "alta", 3, 1), T(21, "Vídeo Viver+ (revisão do cliente)", "aguardando", "alta", 5, 1, "aprovação do cliente"), T(25, "Roteiro reels Sentra", "a_fazer", "normal", 6), T(30, "Ideia: série de cortes", "inbox", "normal", null), T(31, "Ligar para a oficina", "inbox", "normal", null)],
  events: [{ id: uid(700), title: "Alinhamento Doti", all_day: false, starts_at: new Date(Date.now() + 86400000).toISOString(), start_date: null, location: "Meet", archived_at: null }, { id: uid(701), title: "Visita ao imóvel", all_day: true, start_date: add(2), end_date: add(2), starts_at: null, archived_at: null }],
  notes: [], change_log: [{ id: 1, entity: "tasks", entity_id: uid(18), action: "update", source: "claude", changed_fields: ["status"], old_values: { status: "a_fazer" }, new_values: { status: "em_andamento" }, at: new Date().toISOString() }],
  integrations: [], app_members: [{ user_id: "u1", email: "dono@exemplo.com", role: "owner", modules: [] }], google_connections: [],
};
let nextId = 5000;

class Q {
  constructor(t) { this.t = t; this.f = []; this.op = "select"; this.cols = "*"; this.ord = null; this.lim = 1e9; }
  select(c) { if (this.op === "select") this.cols = c || "*"; this.ret = true; return this; }
  insert(r) { this.op = "insert"; this.row = r; return this; }
  update(r) { this.op = "update"; this.row = r; return this; }
  eq(c, v) { this.f.push((r) => r[c] === v); return this; }
  is(c, v) { this.f.push((r) => (v === null ? r[c] == null : r[c] === v)); return this; }
  in(c, v) { this.f.push((r) => v.includes(r[c])); return this; }
  lt(c, v) { this.f.push((r) => r[c] != null && r[c] < v); return this; } lte(c, v) { this.f.push((r) => r[c] != null && r[c] <= v); return this; }
  gt(c, v) { this.f.push((r) => r[c] != null && r[c] > v); return this; } gte(c, v) { this.f.push((r) => r[c] != null && r[c] >= v); return this; }
  not(c, op, v) { if (op === "in") { const l = v.replace(/[()]/g, "").split(","); this.f.push((r) => !l.includes(r[c])); } else if (op === "is") this.f.push((r) => (v === null ? r[c] != null : r[c] !== v)); return this; }
  ilike(c, p) { const s = p.replace(/%/g, "").replace(/\\/g, "").toLowerCase(); this.f.push((r) => String(r[c] ?? "").toLowerCase().includes(s)); return this; }
  or(s) { const parts = s.split(",").map((x) => x.split(".")); this.f.push((r) => parts.some(([c, o, v]) => (o === "is" ? r[c] == null : o === "gt" ? r[c] != null && r[c] > v : false))); return this; }
  order(c, o = {}) { this.ord = [c, o.ascending === false ? -1 : 1]; return this; }
  limit(n) { this.lim = n; return this; }
  rows() {
    let rs = DB[this.t].filter((r) => this.f.every((f) => f(r)));
    if (this.ord) { const [c, d] = this.ord; rs = [...rs].sort((a, b) => ((a[c] ?? "￿") > (b[c] ?? "￿") ? 1 : -1) * d); }
    rs = rs.slice(0, this.lim);
    if (this.t === "tasks") rs = rs.map((r) => ({ ...r, projects: r.project_id ? { name: DB.projects.find((p) => p.id === r.project_id)?.name } : null }));
    return rs;
  }
  async maybeSingle() { const r = await this; return { data: r.data?.[0] ?? null, error: r.error }; }
  then(res, rej) {
    try {
      if (this.op === "insert") { const row = { id: uid(nextId++), seq: nextId, version: 1, created_at: new Date().toISOString(), source: "painel", archived_at: null, tags: [], ...this.row }; DB[this.t].push(row); return Promise.resolve({ data: [row], error: null }).then(res, rej); }
      if (this.op === "update") { const hit = DB[this.t].filter((r) => this.f.every((f) => f(r))); hit.forEach((r) => { Object.assign(r, this.row); r.version++; if (this.row.status === "concluido") r.completed_at = new Date().toISOString(); }); return Promise.resolve({ data: hit, error: null }).then(res, rej); }
      return Promise.resolve({ data: this.rows(), error: null }).then(res, rej);
    } catch (e) { return Promise.resolve({ data: null, error: { message: String(e) } }).then(res, rej); }
  }
}
export function installMock() {
  window.supabase = { createClient: () => ({
    from: (t) => new Q(t),
    rpc: async (fn, { q }) => ({ data: fn === "search_all" ? DB.tasks.filter((t) => t.title.toLowerCase().includes(q.toLowerCase())).map((t) => ({ entity: "task", id: t.id, title: t.title, snippet: null })) : [], error: null }),
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }), signOut: async () => {}, signInWithOAuth: async () => ({ error: null }), onAuthStateChange: () => {} },
  }) };
}
