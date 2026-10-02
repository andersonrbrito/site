-- Anderson OS · migration 0001 · núcleo
-- Requer Supabase (schema auth, roles anon/authenticated/service_role).
-- Nunca apague/recrie tabelas por aqui: evolua com novas migrations.

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, service_role;

-- ───────────────────────── Acesso ─────────────────────────
-- Lista de e-mails autorizados a existir como usuário. Cadastro público é bloqueado
-- por trigger em auth.users (além da configuração "desabilitar sign-ups" no Supabase).
create table public.allowed_emails (
  email      text primary key check (email = lower(email)),
  role       text not null default 'member' check (role in ('owner','member')),
  modules    text[] not null default '{}',   -- módulos liberados a 'member' (owner vê tudo)
  created_at timestamptz not null default now()
);

create table public.app_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('owner','member')),
  modules    text[] not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function app_private.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_members where user_id = auth.uid());
$$;

create or replace function app_private.can(p_module text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from app_members
    where user_id = auth.uid() and (role = 'owner' or p_module = any (modules))
  );
$$;

create or replace function app_private.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_members where user_id = auth.uid() and role = 'owner');
$$;

grant execute on function app_private.is_member(), app_private.can(text), app_private.is_owner()
  to authenticated, service_role;

create or replace function app_private.guard_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from allowed_emails where email = lower(new.email)) then
    raise exception 'signup_not_allowed' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function app_private.provision_member() returns trigger
language plpgsql security definer set search_path = public as $$
declare a allowed_emails%rowtype;
begin
  select * into a from allowed_emails where email = lower(new.email);
  if found then
    insert into app_members (user_id, email, role, modules)
    values (new.id, a.email, a.role, a.modules)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

create trigger trg_guard_signup before insert on auth.users
  for each row execute function app_private.guard_signup();
create trigger trg_provision_member after insert on auth.users
  for each row execute function app_private.provision_member();

-- ───────────────────────── Integrações (agentes) ─────────────────────────
create table public.integrations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  kind         text not null check (kind in ('chatgpt','claude','codex','outro')),
  key_prefix   text not null unique,
  key_hash     text not null,                 -- sha256 hex da chave completa; a chave nunca é guardada
  scopes       text[] not null default '{}',
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);

create table public.idempotency_keys (
  integration_id uuid not null references public.integrations(id) on delete cascade,
  key            text not null,
  op             text not null,
  result         jsonb not null,
  created_at     timestamptz not null default now(),
  primary key (integration_id, key)
);

create table public.rate_limits (
  integration_id uuid not null references public.integrations(id) on delete cascade,
  window_start   timestamptz not null,
  hits           int not null default 0,
  primary key (integration_id, window_start)
);

-- ───────────────────────── Domínio ─────────────────────────
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  notes       text,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  seq         bigint generated always as identity unique,
  name        text not null check (length(trim(name)) > 0),
  area        text not null default 'freelas' check (area in ('doti','woob','freelas','pessoal')),
  client_id   uuid references public.clients(id),
  description text,
  status      text not null default 'ativo' check (status in ('ativo','pausado','concluido','cancelado')),
  stage       text not null default 'briefing' check (stage in ('briefing','producao','revisao','aprovacao','entrega')),
  payment_status text not null default 'nao_aplicavel' check (payment_status in ('nao_aplicavel','pendente','parcial','pago')),
  due_date    date,
  links       jsonb not null default '[]',
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  seq         bigint generated always as identity unique,
  title       text not null check (length(trim(title)) > 0),
  description text,
  project_id  uuid references public.projects(id),
  client_id   uuid references public.clients(id),
  area        text not null default 'trabalho' check (area in ('trabalho','pessoal')),
  priority    text not null default 'normal' check (priority in ('baixa','normal','alta','urgente')),
  status      text not null default 'inbox' check (status in ('inbox','a_fazer','em_andamento','aguardando','concluido','cancelado')),
  due_date    date,                       -- prazo de entrega (sem horário). Compromisso com hora = events.
  waiting_for text,                       -- de quem/o quê depende, quando status = aguardando
  assignee    text,
  tags        text[] not null default '{}',
  links       jsonb not null default '[]',
  notes       text,
  completed_at timestamptz,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
create index tasks_status_idx on public.tasks (status) where archived_at is null;
create index tasks_due_idx on public.tasks (due_date) where archived_at is null;
create index tasks_project_idx on public.tasks (project_id);

create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null default '',
  body        text not null default '',
  project_id  uuid references public.projects(id),
  task_id     uuid references public.tasks(id),
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);

-- Compromissos internos (com horário ou dia inteiro). Google Calendar: ver docs/INTEGRATIONS.md (não implementado).
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(trim(title)) > 0),
  description text,
  all_day     boolean not null default false,
  start_date  date,                        -- usado quando all_day
  end_date    date,
  starts_at   timestamptz,                 -- usado quando não all_day
  ends_at     timestamptz,
  location    text,
  project_id  uuid references public.projects(id),
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid,
  check ((all_day and start_date is not null) or (not all_day and starts_at is not null)),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create index events_starts_idx on public.events (starts_at);
create index events_date_idx on public.events (start_date);

-- Histórico (escrito somente por trigger)
create table public.change_log (
  id           bigint generated always as identity primary key,
  entity       text not null,
  entity_id    uuid not null,
  action       text not null,
  actor_user_id uuid,
  integration_id uuid,
  source       text not null,
  changed_fields text[] not null default '{}',
  old_values   jsonb,
  new_values   jsonb,
  at           timestamptz not null default now()
);
create index change_log_entity_idx on public.change_log (entity, entity_id, at desc);
create index change_log_at_idx on public.change_log (at desc);

-- ───────────────────────── Triggers ─────────────────────────
-- Carimba origem/autor a partir do contexto autenticado, ignorando o que o cliente enviou.
create or replace function app_private.stamp_origin() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_source text := nullif(current_setting('app.source', true), '');
  v_integ  uuid := nullif(current_setting('app.integration_id', true), '')::uuid;
begin
  if v_integ is not null then
    new.source := coalesce(v_source, 'api');
    new.created_by_integration := v_integ;
    new.created_by_user := null;
  else
    new.source := 'painel';
    new.created_by_user := auth.uid();
    new.created_by_integration := null;
  end if;
  return new;
end $$;

create or replace function app_private.before_update() returns trigger
language plpgsql set search_path = public as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  new.source := old.source;
  new.created_by_user := old.created_by_user;
  new.created_by_integration := old.created_by_integration;
  if to_jsonb(new) ? 'seq' then new.seq := old.seq; end if;
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end $$;

create or replace function app_private.task_completion() returns trigger
language plpgsql as $$
begin
  if new.status = 'concluido' and (tg_op = 'INSERT' or old.status is distinct from 'concluido') then
    new.completed_at := now();
  elsif new.status <> 'concluido' then
    new.completed_at := null;
  end if;
  return new;
end $$;

create or replace function app_private.log_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb; v_new jsonb := to_jsonb(new);
  v_changed text[]; v_oldv jsonb; v_newv jsonb; v_action text;
  v_source text := nullif(current_setting('app.source', true), '');
  v_integ uuid := nullif(current_setting('app.integration_id', true), '')::uuid;
begin
  if tg_op = 'INSERT' then
    v_action := 'create';
    v_changed := array(select jsonb_object_keys(v_new));
    v_newv := v_new;
  else
    v_old := to_jsonb(old);
    select array_agg(n.key order by n.key),
           jsonb_object_agg(n.key, v_old -> n.key),
           jsonb_object_agg(n.key, n.value)
      into v_changed, v_oldv, v_newv
      from jsonb_each(v_new) n
     where n.value is distinct from (v_old -> n.key)
       and n.key not in ('updated_at','version');
    if v_changed is null then return new; end if;
    v_action := case
      when old.archived_at is null and new.archived_at is not null then 'archive'
      when old.archived_at is not null and new.archived_at is null then 'restore'
      when v_new ? 'status' and (v_old->>'status') is distinct from (v_new->>'status')
           and v_new->>'status' = 'concluido' then 'complete'
      else 'update' end;
  end if;
  insert into change_log (entity, entity_id, action, actor_user_id, integration_id, source,
                          changed_fields, old_values, new_values)
  values (tg_table_name, new.id, v_action,
          case when v_integ is null then auth.uid() end, v_integ,
          case when v_integ is not null then coalesce(v_source,'api') else coalesce(v_source, case when auth.uid() is not null then 'painel' else 'sistema' end) end,
          v_changed, v_oldv, v_newv);
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['clients','projects','tasks','notes','events'] loop
    execute format('create trigger trg_stamp before insert on public.%I for each row execute function app_private.stamp_origin()', t);
    execute format('create trigger trg_before_update before update on public.%I for each row execute function app_private.before_update()', t);
    execute format('create trigger trg_log after insert or update on public.%I for each row execute function app_private.log_change()', t);
  end loop;
end $$;

create trigger trg_task_completion before insert or update on public.tasks
  for each row execute function app_private.task_completion();

-- Sem DELETE: remoção é arquivamento (archived_at). Histórico é imutável.
create or replace function app_private.deny_change_log_mutation() returns trigger
language plpgsql as $$ begin raise exception 'change_log_immutable'; end $$;
create trigger trg_change_log_immutable before update or delete on public.change_log
  for each row execute function app_private.deny_change_log_mutation();

-- ───────────────────────── RLS ─────────────────────────
alter table public.allowed_emails enable row level security;
alter table public.app_members    enable row level security;
alter table public.integrations   enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.rate_limits    enable row level security;
alter table public.clients  enable row level security;
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;
alter table public.notes    enable row level security;
alter table public.events   enable row level security;
alter table public.change_log enable row level security;

create policy members_self on public.app_members for select to authenticated using (user_id = auth.uid());
create policy allowed_owner_read on public.allowed_emails for select to authenticated using (app_private.is_owner());
-- integrações: o dono lista/revoga; chaves são criadas pelo servidor (service_role)
create policy integrations_owner_read on public.integrations for select to authenticated using (app_private.is_owner());
create policy integrations_owner_revoke on public.integrations for update to authenticated
  using (app_private.is_owner()) with check (app_private.is_owner());
-- idempotency_keys e rate_limits: sem policy => somente service_role

create policy clients_rw on public.clients for select to authenticated using (app_private.can('clientes'));
create policy clients_ins on public.clients for insert to authenticated with check (app_private.can('clientes'));
create policy clients_upd on public.clients for update to authenticated using (app_private.can('clientes')) with check (app_private.can('clientes'));

create policy projects_sel on public.projects for select to authenticated using (app_private.can('projetos'));
create policy projects_ins on public.projects for insert to authenticated with check (app_private.can('projetos'));
create policy projects_upd on public.projects for update to authenticated using (app_private.can('projetos')) with check (app_private.can('projetos'));

create policy tasks_sel on public.tasks for select to authenticated using (app_private.can('tarefas'));
create policy tasks_ins on public.tasks for insert to authenticated with check (app_private.can('tarefas'));
create policy tasks_upd on public.tasks for update to authenticated using (app_private.can('tarefas')) with check (app_private.can('tarefas'));

create policy notes_sel on public.notes for select to authenticated using (app_private.can('notas'));
create policy notes_ins on public.notes for insert to authenticated with check (app_private.can('notas'));
create policy notes_upd on public.notes for update to authenticated using (app_private.can('notas')) with check (app_private.can('notas'));

create policy events_sel on public.events for select to authenticated using (app_private.can('agenda'));
create policy events_ins on public.events for insert to authenticated with check (app_private.can('agenda'));
create policy events_upd on public.events for update to authenticated using (app_private.can('agenda')) with check (app_private.can('agenda'));

create policy log_sel on public.change_log for select to authenticated using (app_private.is_owner());

-- Privilégios: authenticated só faz o que as policies permitem; anon não vê nada.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.app_members, public.allowed_emails, public.integrations, public.change_log to authenticated;
grant update (revoked_at) on public.integrations to authenticated;
grant select, insert, update on public.clients, public.projects, public.tasks, public.notes, public.events to authenticated;
grant all on all tables in schema public to service_role;

-- ───────────────────────── Busca global (respeita RLS: security invoker) ─────────────────────────
create or replace function public.search_all(q text, max_rows int default 30)
returns table (entity text, id uuid, title text, snippet text, rank int)
language sql stable security invoker set search_path = public as $$
  with p as (select '%' || replace(replace(replace(trim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat)
  select * from (
    select 'task'::text, t.id, t.title, coalesce(t.description, t.notes), (case when t.title ilike p.pat then 0 else 1 end)
      from tasks t, p where t.archived_at is null and (t.title ilike p.pat or t.description ilike p.pat or t.notes ilike p.pat or exists (select 1 from unnest(t.tags) g where g ilike p.pat))
    union all
    select 'project', j.id, j.name, j.description, (case when j.name ilike p.pat then 0 else 1 end)
      from projects j, p where j.archived_at is null and (j.name ilike p.pat or j.description ilike p.pat)
    union all
    select 'note', n.id, coalesce(nullif(n.title,''), left(n.body, 60)), left(n.body, 160), (case when n.title ilike p.pat then 0 else 1 end)
      from notes n, p where n.archived_at is null and (n.title ilike p.pat or n.body ilike p.pat)
    union all
    select 'event', e.id, e.title, e.description, (case when e.title ilike p.pat then 0 else 1 end)
      from events e, p where e.archived_at is null and (e.title ilike p.pat or e.description ilike p.pat)
  ) s(entity, id, title, snippet, rank)
  where length(trim(q)) > 0
  order by rank, title
  limit least(max_rows, 100);
$$;
grant execute on function public.search_all(text, int) to authenticated;
revoke execute on function public.search_all(text, int) from anon, public;
