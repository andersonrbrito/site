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
  miner_links: [
    { id: uid(800), url: "https://www.instagram.com/p/DcKCb1TRo_T/", platform: "instagram", collection: "andersonbrito.mp4", author: null, note: "Festa rubro-negra, Pedro e Carrascal de moto", status: "usado", thumbnail_url: null, saved_at: new Date(Date.now() - 864e5 * 3).toISOString(), version: 1, archived_at: null },
    { id: uid(801), url: "https://x.com/Divyanshu555/status/2097329629900222911", platform: "x", collection: "andersonbrito.mp4", author: "@Divyanshu555", note: "DC (@Divyanshu555) on X", status: "inbox", thumbnail_url: null, saved_at: new Date().toISOString(), version: 1, archived_at: null },
  ],
  miner_profiles: [{ id: uid(810), url: "https://www.instagram.com/gelmo_ia/", platform: "instagram", handle: "@gelmo_ia", note: "", version: 1, archived_at: null }],
  posts: [
    { id: uid(820), network: "x", title: "2026-10-19 – X1 – escala do freela", body: "a timeline comemorando o fim da 6x1 e eu aqui na escala 7x0 renderizando video com IA\n\no pior é que eu escolhi isso kkkkkkkkkkkkk", notes: "", media: [], image_urls: [], status: "pending", scheduled_at: null, posted_at: null, external_url: null, error: null, is_viral_bet: false, version: 1, created_at: new Date().toISOString(), archived_at: null },
    { id: uid(821), network: "x", title: "🎯 VIRAL – história por trás", body: "parte 1\n---\nparte 2", notes: "thread de teste", media: [], image_urls: [], status: "approved", scheduled_at: new Date(Date.now() + 36e5 * 3).toISOString(), posted_at: null, external_url: null, error: null, is_viral_bet: true, version: 1, created_at: new Date().toISOString(), archived_at: null },
    { id: uid(822), network: "linkedin", title: "L1 – call que virou aula", body: "Uma empresa marcou call pra me contratar.\n\nSe já começa assim, imagina depois.", notes: "", media: [], image_urls: [], status: "posted", scheduled_at: new Date(Date.now() - 864e5).toISOString(), posted_at: new Date(Date.now() - 864e5).toISOString(), external_url: "https://www.linkedin.com", error: null, is_viral_bet: false, version: 1, created_at: new Date().toISOString(), archived_at: null },
  ],
  radar_items: [], x_snapshots: [], x_goal_entries: [{ id: uid(830), day: today, verified_followers: 210, impressions_90d: 8700, version: 1, archived_at: null }],
  postador_settings: [{ key: "x_daily_limit", value: 10 }, { key: "x_slots", value: ["08:00","10:00","11:30","14:00","16:00","18:00","20:00","22:00"] }, { key: "linkedin_slots", value: ["13:30"] }, { key: "x_read_daily_limit", value: 40 }],
  favorites: [["Cursos","Leo Baltazar","https://leobaltazar.com/"],["Cursos","Curso Kiwify","https://members.kiwify.com/?club=e5ca4402"],["Cursos","WooB","https://members.kiwify.com/?club=5269a082"],["Cursos","Reels Virais com IA","https://congruous-vacation-cd5.notion.site/Reels-Virais-com-IA"]].map(([grp,name,url],i)=>({ id: uid(850+i), grp, name, url, position: i+1, version: 1, archived_at: null })),
  social_stats: [-6,-4,-2,0].flatMap((d,i)=>[{ day: add(d), platform: "x", followers: 580+i*5, following: 178, posts: 27700+i*30, data: { verified_followers: 200+i*3, impressions_90d: 7000+i*600 }, archived_at: null }, { day: add(d), platform: "instagram", followers: 6400+i*80, following: 2680, posts: 220+i, data: {}, archived_at: null }]),
  reel_stats: [-2,0].flatMap((d,j)=>[["DepMxM7JjrS",1417],["DecjTqIPGey",470000],["DePceechGdf",1300000],["DeeMbvPh7WT",13800]].map(([shortcode,v])=>({ day: add(d), shortcode, views: Math.round(v*(j?1:0.8)), thumbnail_url: null, archived_at: null }))),
  post_requests: [],
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
    storage: { from: () => ({ upload: async (path) => ({ data: { path }, error: null }), createSignedUrl: async () => ({ data: { signedUrl: "../../assets/anderson-sony.jpg" }, error: null }) }) },
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }), signOut: async () => {}, signInWithOAuth: async () => ({ error: null }), onAuthStateChange: () => {} },
  }) };
}
