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
