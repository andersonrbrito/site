import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
`;

let db: PGlite;
let ownerId: string;
let strangerId: string; // member sem módulos
let integrationId: string;

async function asUser<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${uid ? "authenticated" : "anon"}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role`);
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

async function asService<T>(fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role service_role`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role`);
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(STUB);
  const dir = join(__dirname, "../../../supabase/migrations");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, f), "utf8"));
  }
  await db.exec(`
    insert into allowed_emails (email, role) values ('dono@example.com', 'owner');
    insert into allowed_emails (email, role, modules) values ('esposa@example.com', 'member', '{}');
  `);
  ownerId = (await db.query<{ id: string }>(`insert into auth.users (email) values ('dono@example.com') returning id`)).rows[0].id;
  strangerId = (await db.query<{ id: string }>(`insert into auth.users (email) values ('esposa@example.com') returning id`)).rows[0].id;
  integrationId = (
    await db.query<{ id: string }>(
      `insert into integrations (name, kind, key_prefix, key_hash, scopes) values ('ChatGPT', 'chatgpt', 'abcd1234', 'x', '{tasks:write}') returning id`,
    )
  ).rows[0].id;
});

describe("login restrito", () => {
  it("bloqueia cadastro de e-mail fora da lista", async () => {
    await expect(db.query(`insert into auth.users (email) values ('intruso@example.com')`)).rejects.toThrow(/signup_not_allowed/);
  });
  it("provisiona membro para e-mail autorizado", async () => {
    const r = await db.query<{ role: string }>(`select role from app_members where user_id = $1`, [ownerId]);
    expect(r.rows[0].role).toBe("owner");
  });
});

describe("RLS", () => {
  it("anon não lê nem escreve", async () => {
    await expect(asUser(null, () => db.query(`select * from tasks`))).rejects.toThrow(/permission denied/);
    await expect(asUser(null, () => db.query(`insert into tasks (title) values ('x')`))).rejects.toThrow(/permission denied/);
  });
  it("membro sem módulo não vê tarefas e não cria", async () => {
    await asUser(ownerId, () => db.query(`insert into tasks (title) values ('Tarefa do dono')`));
    const rows = await asUser(strangerId, () => db.query(`select * from tasks`));
    expect(rows.rows).toHaveLength(0);
    await expect(asUser(strangerId, () => db.query(`insert into tasks (title) values ('invasão')`))).rejects.toThrow(/row-level security/);
  });
  it("não existe DELETE para usuários", async () => {
    await expect(asUser(ownerId, () => db.query(`delete from tasks`))).rejects.toThrow(/permission denied/);
  });
  it("histórico é imutável e só o dono lê", async () => {
    await expect(asUser(ownerId, () => db.query(`update change_log set action = 'x'`))).rejects.toThrow(/permission denied/);
    const own = await asUser(ownerId, () => db.query(`select count(*)::int as n from change_log`));
    expect(own.rows[0]).toMatchObject({ n: expect.any(Number) });
    const other = await asUser(strangerId, () => db.query(`select count(*)::int as n from change_log`));
    expect((other.rows[0] as { n: number }).n).toBe(0);
  });
  it("authenticated não executa RPC de agente", async () => {
    await expect(
      asUser(ownerId, () => db.query(`select agent_create_task($1, null, '{"title":"x"}')`, [integrationId])),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("tarefas e histórico", () => {
  it("origem e autor vêm do contexto, não do cliente", async () => {
    const r = await asUser(ownerId, () =>
      db.query<{ source: string; created_by_user: string }>(
        `insert into tasks (title, source, created_by_user) values ('Forjar origem', 'chatgpt', gen_random_uuid()) returning source, created_by_user`,
      ),
    );
    expect(r.rows[0].source).toBe("painel");
    expect(r.rows[0].created_by_user).toBe(ownerId);
  });

  it("data sem horário permanece no mesmo dia", async () => {
    const r = await asUser(ownerId, () =>
      db.query<{ due: string }>(`insert into tasks (title, due_date) values ('Prazo', '2026-10-05') returning due_date::text as due`),
    );
    expect(r.rows[0].due).toBe("2026-10-05");
  });

  it("atualização incrementa versão, preenche completed_at e registra diff", async () => {
    const t = (await asUser(ownerId, () => db.query<{ id: string }>(`insert into tasks (title) values ('Entregar vídeo') returning id`))).rows[0];
    const u = await asUser(ownerId, () =>
      db.query<{ version: number; completed_at: string | null }>(
        `update tasks set status = 'concluido' where id = $1 returning version, completed_at`, [t.id]),
    );
    expect(u.rows[0].version).toBe(2);
    expect(u.rows[0].completed_at).not.toBeNull();
    const log = await db.query<{ action: string; changed_fields: string[]; old_values: any; new_values: any }>(
      `select action, changed_fields, old_values, new_values from change_log where entity_id = $1 order by id`, [t.id]);
    expect(log.rows.map((x) => x.action)).toEqual(["create", "complete"]);
    expect(log.rows[1].old_values.status).toBe("inbox");
    expect(log.rows[1].new_values.status).toBe("concluido");
    expect(log.rows[1].changed_fields).toContain("completed_at");
  });

  it("arquivar registra ação archive", async () => {
    const t = (await asUser(ownerId, () => db.query<{ id: string }>(`insert into tasks (title) values ('Arquivar') returning id`))).rows[0];
    await asUser(ownerId, () => db.query(`update tasks set archived_at = now() where id = $1`, [t.id]));
    const log = await db.query<{ action: string }>(`select action from change_log where entity_id = $1 order by id desc limit 1`, [t.id]);
    expect(log.rows[0].action).toBe("archive");
  });
});

describe("API de agentes (RPC)", () => {
  it("cria tarefa com origem da integração e é idempotente", async () => {
    const call = () =>
      asService(() =>
        db.query<{ r: any }>(`select agent_create_task($1, 'k-1', '{"title":"Entregar vídeo da Viver+","priority":"alta","due_date":"2026-10-09"}') as r`, [integrationId]),
      );
    const a = (await call()).rows[0].r;
    const b = (await call()).rows[0].r;
    expect(a.source).toBe("chatgpt");
    expect(a.priority).toBe("alta");
    expect(a.due_date).toBe("2026-10-09");
    expect(a.ref).toMatch(/^T-\d+$/);
    expect(b.id).toBe(a.id);
    expect(b.idempotent_replay).toBe(true);
    const n = await db.query<{ n: number }>(`select count(*)::int as n from tasks where title = 'Entregar vídeo da Viver+'`);
    expect(n.rows[0].n).toBe(1);
  });

  it("detecta conflito de versão e atualiza com versão correta", async () => {
    const created = (await asService(() => db.query<{ r: any }>(`select agent_create_task($1, null, '{"title":"Conflito"}') as r`, [integrationId]))).rows[0].r;
    const ok = (await asService(() => db.query<{ r: any }>(
      `select agent_update_task($1, $2, $3, '{"status":"aguardando","waiting_for":"aprovação do cliente","due_date":"2026-10-12"}') as r`,
      [integrationId, created.id, created.version]))).rows[0].r;
    expect(ok.status).toBe("aguardando");
    expect(ok.version).toBe(created.version + 1);
    await expect(
      asService(() => db.query(`select agent_update_task($1, $2, $3, '{"title":"velho"}')`, [integrationId, created.id, created.version])),
    ).rejects.toThrow(/version_conflict/);
    await expect(
      asService(() => db.query(`select agent_update_task($1, gen_random_uuid(), 1, '{"title":"x"}')`, [integrationId])),
    ).rejects.toThrow(/not_found/);
  });

  it("histórico marca origem chatgpt e preserva identidade do registro", async () => {
    const created = (await asService(() => db.query<{ r: any }>(`select agent_create_task($1, null, '{"title":"Identidade"}') as r`, [integrationId]))).rows[0].r;
    await asService(() => db.query(`select agent_update_task($1, $2, $3, '{"priority":"urgente"}')`, [integrationId, created.id, created.version]));
    const log = await db.query<{ source: string; integration_id: string; actor_user_id: string | null }>(
      `select source, integration_id, actor_user_id from change_log where entity_id = $1 order by id`, [created.id]);
    expect(log.rows).toHaveLength(2);
    for (const l of log.rows) {
      expect(l.source).toBe("chatgpt");
      expect(l.integration_id).toBe(integrationId);
      expect(l.actor_user_id).toBeNull();
    }
  });

  it("integração revogada é recusada", async () => {
    const revoked = (await db.query<{ id: string }>(
      `insert into integrations (name, kind, key_prefix, key_hash, revoked_at) values ('Velha', 'claude', 'zzzz9999', 'x', now()) returning id`)).rows[0].id;
    await expect(asService(() => db.query(`select agent_create_task($1, null, '{"title":"x"}')`, [revoked]))).rejects.toThrow(/integration_revoked/);
  });

  it("limita requisições por janela", async () => {
    const res: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      res.push((await asService(() => db.query<{ ok: boolean }>(`select agent_rate_check($1, 3, 60) as ok`, [integrationId]))).rows[0].ok);
    }
    expect(res).toEqual([true, true, true, false]);
  });

  it("rejeita valores inválidos pelo banco", async () => {
    await expect(
      asService(() => db.query(`select agent_create_task($1, null, '{"title":"x","priority":"critica"}')`, [integrationId])),
    ).rejects.toThrow(/check constraint/);
  });
});

describe("busca", () => {
  it("encontra por título e respeita RLS", async () => {
    const mine = await asUser(ownerId, () => db.query<{ title: string }>(`select title from search_all('viver')`));
    expect(mine.rows.map((r) => r.title)).toContain("Entregar vídeo da Viver+");
    const other = await asUser(strangerId, () => db.query(`select * from search_all('viver')`));
    expect(other.rows).toHaveLength(0);
  });
  it("trata curingas como texto", async () => {
    const r = await asUser(ownerId, () => db.query(`select * from search_all('%')`));
    expect(r.rows).toHaveLength(0);
  });
});

describe("conexão Google", () => {
  it("usuário autenticado não lê o token criptografado", async () => {
    await db.query(`insert into google_connections (user_id, google_email, scopes, refresh_token_enc) values ($1, 'dono@example.com', '{a}', 'v1:x:y:z')`, [ownerId]);
    await expect(asUser(ownerId, () => db.query(`select refresh_token_enc from google_connections`))).rejects.toThrow(/permission denied/);
    const ok = await asUser(ownerId, () => db.query(`select google_email from google_connections`));
    expect(ok.rows).toHaveLength(1);
    const other = await asUser(strangerId, () => db.query(`select google_email from google_connections`));
    expect(other.rows).toHaveLength(0);
  });
});

describe("Postador e MineR_ (migration 0004)", () => {
  it("anon não acessa posts nem garimpo", async () => {
    await expect(asUser(null, () => db.query(`select * from posts`))).rejects.toThrow(/permission denied/);
    await expect(asUser(null, () => db.query(`select * from miner_links`))).rejects.toThrow(/permission denied/);
  });
  it("dono cria rascunho e link; membro sem módulo não vê", async () => {
    await asUser(ownerId, () => db.query(`insert into posts (network, body) values ('x', 'teste')`));
    await asUser(ownerId, () => db.query(`insert into miner_links (url, platform) values ('https://x.com/a/status/1', 'x')`));
    expect((await asUser(strangerId, () => db.query(`select * from posts`))).rows).toHaveLength(0);
    expect((await asUser(strangerId, () => db.query(`select * from miner_links`))).rows).toHaveLength(0);
    await expect(asUser(strangerId, () => db.query(`insert into posts (network, body) values ('x', 'invasão')`))).rejects.toThrow(/row-level security/);
  });
  it("aprovado exige horário e não existe DELETE", async () => {
    await expect(asUser(ownerId, () => db.query(`insert into posts (network, body, status) values ('x', 'sem hora', 'approved')`))).rejects.toThrow(/check/);
    await expect(asUser(ownerId, () => db.query(`delete from posts`))).rejects.toThrow(/permission denied/);
    await expect(asUser(ownerId, () => db.query(`delete from miner_links`))).rejects.toThrow(/permission denied/);
  });
  it("usuário não cria itens do Radar (só o servidor)", async () => {
    await expect(asUser(ownerId, () => db.query(`insert into radar_items (kind, tweet_id) values ('talk', '1')`))).rejects.toThrow(/permission denied/);
    await asService(() => db.query(`insert into radar_items (kind, tweet_id) values ('talk', '1')`));
    expect((await asUser(ownerId, () => db.query(`select * from radar_items`))).rows).toHaveLength(1);
  });
  it("só o dono muda configurações do Postador", async () => {
    await asUser(ownerId, () => db.query(`update postador_settings set value = '9' where key = 'x_daily_limit'`));
    const r = await asUser(ownerId, () => db.query<{ value: number }>(`select value from postador_settings where key = 'x_daily_limit'`));
    expect(r.rows[0].value).toBe(9);
  });
});

describe("Favoritos (migration 0006)", () => {
  it("dono vê os favoritos semeados; anon e membro sem módulo não", async () => {
    const own = await asUser(ownerId, () => db.query(`select name from favorites where archived_at is null`));
    expect(own.rows.length).toBeGreaterThanOrEqual(4);
    expect((await asUser(strangerId, () => db.query(`select * from favorites`))).rows).toHaveLength(0);
    await expect(asUser(null, () => db.query(`select * from favorites`))).rejects.toThrow(/permission denied/);
    await expect(asUser(ownerId, () => db.query(`delete from favorites`))).rejects.toThrow(/permission denied/);
  });
});

describe("Desempenho (migration 0008)", () => {
  it("dono grava e lê; um registro por dia e plataforma; membro sem módulo não vê", async () => {
    await asUser(ownerId, () => db.query(`insert into social_stats (day, platform, followers, following, posts) values ('2026-10-19', 'instagram', 6499, 2676, 221)`));
    await expect(asUser(ownerId, () => db.query(`insert into social_stats (day, platform, followers) values ('2026-10-19', 'instagram', 1)`))).rejects.toThrow(/duplicate|unique/);
    await asUser(ownerId, () => db.query(`insert into reel_stats (day, shortcode, views) values ('2026-10-19', 'DcKCb1TRo_T', 1000)`));
    expect((await asUser(strangerId, () => db.query(`select * from social_stats`))).rows).toHaveLength(0);
    await expect(asUser(ownerId, () => db.query(`delete from reel_stats`))).rejects.toThrow(/permission denied/);
  });
});

describe("Ecossistema (migration 0030)", () => {
  it("dono cria mapa, nota, pauta e receita; membro sem módulo não vê; sem DELETE", async () => {
    await asUser(ownerId, () => db.query(`insert into mapas (slug, titulo, data) values ('teste', 'Teste', '{"nodes":[{"id":"a"}],"edges":[]}')`));
    await asUser(ownerId, () => db.query(`insert into sticky_notes (texto, cor) values ('lembrar', 'rosa')`));
    await asUser(ownerId, () => db.query(`insert into pautas (perfil, tipo, titulo) values ('mazzaropi', 'aquecimento', 'comentar em 5 contas')`));
    await asUser(ownerId, () => db.query(`insert into receitas (valor, descricao) values (97, 'motion')`));
    for (const t of ["mapas", "sticky_notes", "pautas", "receitas", "agent_jobs", "agent_runs", "perfis"]) {
      expect((await asUser(strangerId, () => db.query(`select * from ${t}`))).rows).toHaveLength(0);
      await expect(asUser(ownerId, () => db.query(`delete from ${t}`))).rejects.toThrow(/permission denied/);
    }
    const v = await asUser(ownerId, () => db.query<{ version: number }>(`update mapas set titulo = 'Novo' where slug = 'teste' returning version`));
    expect(v.rows[0].version).toBe(2);
  });

  it("notificação: o que eu faço no painel não acende; entrega de agente acende até eu abrir o módulo", async () => {
    const news = async () => (await asUser(ownerId, () => db.query<{ module: string; n: string }>(`select module, n from module_news()`))).rows;
    expect((await news()).find((r) => r.module === "agentes")).toBeUndefined();
    await asService(() => db.query(`select agent_write($1, 'upsert', 'agent_jobs', '[{"task_id":"t1","titulo":"Rotina"}]')`, [integrationId]));
    await asService(() => db.query(`select agent_write($1, 'upsert', 'agent_runs', '[{"session_id":"s1","task_id":"t1","titulo":"Rotina","status":"executando"}]')`, [integrationId]));
    expect((await news()).find((r) => r.module === "agentes")).toBeUndefined(); // ainda rodando
    await asService(() => db.query(`select agent_write($1, 'upsert', 'agent_runs', '[{"session_id":"s1","task_id":"t1","titulo":"Rotina","status":"concluida"}]')`, [integrationId]));
    expect(Number((await news()).find((r) => r.module === "agentes")?.n)).toBe(1);
    await asUser(ownerId, () => db.query(`select mark_module_seen('agentes')`));
    expect((await news()).find((r) => r.module === "agentes")).toBeUndefined();
    await asService(() => db.query(`select agent_write($1, 'insert', 'pautas', '[{"chave":"k1","perfil":"kairos","tipo":"oracao","titulo":"Oração do dia"}]')`, [integrationId]));
    await asService(() => db.query(`select agent_write($1, 'insert', 'pautas', '[{"chave":"k1","perfil":"kairos","tipo":"oracao","titulo":"repetida"}]')`, [integrationId]));
    expect(Number((await news()).find((r) => r.module === "perfis")?.n)).toBe(1);
    expect((await asUser(strangerId, () => db.query(`select * from app_events`))).rows).toHaveLength(0);
  });
});

describe("AprovaçõeS_ (migration 0033)", () => {
  it("agente envia sempre como pendente, não decide; reenvio volta para pendente e acende o ponto", async () => {
    await asService(() => db.query(`select agent_write($1, 'upsert', 'aprovacoes', '[{"arquivo":"aprovacoes/kairos/v1.mp4","perfil":"kairos","titulo":"Versículo 1","status":"aprovado"}]')`, [integrationId]));
    let r = await asUser(ownerId, () => db.query<{ status: string; version: number; id: string }>(`select id, status, version from aprovacoes where arquivo = 'aprovacoes/kairos/v1.mp4'`));
    expect(r.rows[0].status).toBe("pendente");
    await asUser(ownerId, () => db.query(`update aprovacoes set status = 'ajustar', comentario = 'texto maior' where id = $1`, [r.rows[0].id]));
    await asUser(ownerId, () => db.query(`select mark_module_seen('aprovacoes')`));
    await asService(() => db.query(`select agent_write($1, 'upsert', 'aprovacoes', '[{"arquivo":"aprovacoes/kairos/v1.mp4","perfil":"kairos","titulo":"Versículo 1 (ajustado)"}]')`, [integrationId]));
    r = await asUser(ownerId, () => db.query(`select status, titulo from aprovacoes where arquivo = 'aprovacoes/kairos/v1.mp4'`));
    expect(r.rows[0].status).toBe("pendente");
    const news = (await asUser(ownerId, () => db.query<{ module: string }>(`select module from module_news()`))).rows;
    expect(news.some((x) => x.module === "aprovacoes")).toBe(true);
    expect((await asUser(strangerId, () => db.query(`select * from aprovacoes`))).rows).toHaveLength(0);
  });
});

describe("Sugestão de postagem (migration 0035)", () => {
  it("agente atualiza só a sugestão, sem mexer no status já decidido", async () => {
    await asService(() => db.query(`select agent_write($1, 'upsert', 'aprovacoes', '[{"arquivo":"aprovacoes/gta/c13.png","perfil":"gta","titulo":"Contagem 13"}]')`, [integrationId]));
    const r = (await asUser(ownerId, () => db.query<{ id: string; version: number }>(`select id, version from aprovacoes where arquivo = 'aprovacoes/gta/c13.png'`))).rows[0];
    await asUser(ownerId, () => db.query(`update aprovacoes set status = 'aprovado' where id = $1`, [r.id]));
    const v = (await asUser(ownerId, () => db.query<{ version: number }>(`select version from aprovacoes where id = $1`, [r.id]))).rows[0].version;
    await asService(() => db.query(`select agent_write($1, 'update', 'aprovacoes', '[{"sugestao_em":"2026-11-07T18:30:00-03:00","sugestao_nota":"pico"}]', $2, $3)`, [integrationId, r.id, v]));
    const out = (await asUser(ownerId, () => db.query<{ status: string; sugestao_nota: string }>(`select status, sugestao_nota from aprovacoes where id = $1`, [r.id]))).rows[0];
    expect(out.status).toBe("aprovado");
    expect(out.sugestao_nota).toBe("pico");
  });
});

describe("Arquivar pendente (migration 0036)", () => {
  it("agente arquiva peça pendente, mas não uma já decidida", async () => {
    await asService(() => db.query(`select agent_write($1, 'upsert', 'aprovacoes', '[{"arquivo":"aprovacoes/infograficos/b.mp4","perfil":"infograficos","titulo":"Ep 1 gancho B"},{"arquivo":"aprovacoes/infograficos/c.mp4","perfil":"infograficos","titulo":"Ep 1 gancho C"}]')`, [integrationId]));
    const rows = (await asUser(ownerId, () => db.query<{ id: string; version: number; arquivo: string }>(`select id, version, arquivo from aprovacoes where perfil = 'infograficos' order by arquivo`))).rows;
    await asService(() => db.query(`select agent_write($1, 'update', 'aprovacoes', '[{"arquivar":true}]', $2, $3)`, [integrationId, rows[0].id, rows[0].version]));
    await asUser(ownerId, () => db.query(`update aprovacoes set status = 'aprovado' where id = $1`, [rows[1].id]));
    const v = (await asUser(ownerId, () => db.query<{ version: number }>(`select version from aprovacoes where id = $1`, [rows[1].id]))).rows[0].version;
    await expect(asService(() => db.query(`select agent_write($1, 'update', 'aprovacoes', '[{"arquivar":true}]', $2, $3)`, [integrationId, rows[1].id, v]))).rejects.toThrow(/já decidido/);
    const vivos = (await asUser(ownerId, () => db.query(`select arquivo from aprovacoes where perfil = 'infograficos' and archived_at is null`))).rows;
    expect(vivos).toHaveLength(1);
  });
});
