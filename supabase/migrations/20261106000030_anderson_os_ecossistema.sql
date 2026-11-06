-- Anderson OS · migration 0030 · Ecossistema (briefing de 2026-11-06)
-- Map MentaleS_ (mapas), Sticky NoteS_ (sticky_notes), AgenteS_ (agent_jobs + agent_runs),
-- PerfiS_ (perfis + pautas), meta de faturamento (receitas) e notificações por módulo (app_events + module_seen).
-- Regra das notificações: toda tabela nova que entrega novidade ganha o trigger app_private.emit_event('<modulo>').

-- ───────── helper: tabela padrão do painel (triggers + RLS + grants) ─────────
create or replace function app_private.std_table(p_table text, p_perm text) returns void
language plpgsql as $$
begin
  execute format('create trigger trg_stamp before insert on public.%I for each row execute function app_private.stamp_origin()', p_table);
  execute format('create trigger trg_before_update before update on public.%I for each row execute function app_private.before_update()', p_table);
  execute format('create trigger trg_log after insert or update on public.%I for each row execute function app_private.log_change()', p_table);
  execute format('alter table public.%I enable row level security', p_table);
  execute format('create policy %I on public.%I for select to authenticated using (app_private.can(%L))', p_table || '_sel', p_table, p_perm);
  execute format('create policy %I on public.%I for insert to authenticated with check (app_private.can(%L))', p_table || '_ins', p_table, p_perm);
  execute format('create policy %I on public.%I for update to authenticated using (app_private.can(%L)) with check (app_private.can(%L))', p_table || '_upd', p_table, p_perm, p_perm);
  execute format('grant select, insert, update on public.%I to authenticated', p_table);
  execute format('grant all on public.%I to service_role', p_table);
end $$;

-- ───────── Map MentaleS_ ─────────
create table public.mapas (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  titulo      text not null check (length(titulo) between 1 and 200),
  data        jsonb not null default '{"nodes":[],"edges":[],"groups":[]}' check (jsonb_typeof(data) = 'object'),
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
select app_private.std_table('mapas', 'mapa');

-- ───────── Sticky NoteS_ ─────────
create table public.sticky_notes (
  id          uuid primary key default gen_random_uuid(),
  texto       text not null default '' check (length(texto) <= 4000),
  cor         text not null default 'amarelo' check (cor in ('amarelo','laranja','rosa','verde','azul','roxo','cinza')),
  tags        text[] not null default '{}',
  x           int not null default 40,
  y           int not null default 40,
  w           int not null default 220 check (w between 120 and 900),
  h           int not null default 180 check (h between 90 and 900),
  z           int not null default 1,
  fixada      boolean not null default false,        -- aparece no PaineL_
  link        text,                                   -- rota do painel (#/perfis) ou URL
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
select app_private.std_table('sticky_notes', 'notas');

-- ───────── AgenteS_: tarefas agendadas do Claude e execuções ─────────
create table public.agent_jobs (
  id          uuid primary key default gen_random_uuid(),
  task_id     text not null unique,                  -- id da tarefa agendada no Claude Code
  titulo      text not null,
  descricao   text,
  conta       text,                                  -- perfil/área (ex.: @andersonbrito.mp4, PostadoR_)
  modelo      text,                                  -- modelo usado na execução
  cron        text,
  agenda      text,                                  -- legível (ex.: "todo dia 5h")
  enabled     boolean not null default true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_status text check (last_status in ('pendente','executando','concluida','falha','revisao')),
  custo       text,
  notas       text,
  synced_at   timestamptz,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
select app_private.std_table('agent_jobs', 'agentes');

create table public.agent_runs (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null unique,
  task_id     text not null,
  titulo      text,
  status      text not null check (status in ('pendente','executando','concluida','falha','revisao')),
  started_at  timestamptz,
  finished_at timestamptz,
  resumo      text,
  erro        text,
  link        text,
  custo       text,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
create index agent_runs_task on public.agent_runs (task_id, started_at desc);
select app_private.std_table('agent_runs', 'agentes');

-- ───────── PerfiS_: matriz do ecossistema ─────────
create table public.perfis (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  handle      text not null,                         -- @ ou nome provisório
  nome_pendente boolean not null default false,
  plataforma  text not null,
  papel       text,
  conteudo    text,
  conversao   text,
  prioridade  int not null default 3 check (prioridade between 1 and 5),  -- 1 = receita
  fase        text not null default 'ativo' check (fase in ('ativo','aquecendo','piloto','planejado','pausado')),
  matriz      jsonb not null default '{}',            -- feed, reels, stories, collab, tiktok, youtube, x, cta, frequencia, publico, custo, metricas, aprovacao
  ordem       int not null default 100,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
select app_private.std_table('perfis', 'perfis');

-- Pautas e lembretes por perfil (aquecimento, oração do Kairos, react do Mazzaropi, contagem do GTA...)
create table public.pautas (
  id          uuid primary key default gen_random_uuid(),
  chave       text unique,                           -- idempotência das rotinas (ex.: aquecimento:mazzaropi:2026-11-07)
  dia         date not null default (now() at time zone 'America/Sao_Paulo')::date,
  perfil      text not null,                         -- slug de perfis
  tipo        text not null check (tipo in ('aquecimento','reel','story','carrossel','post','oracao','lyrics','versiculo','react','foto','contagem','prospeccao','produto','outro')),
  titulo      text not null check (length(titulo) between 1 and 300),
  detalhe     text,
  fontes      jsonb not null default '[]',
  status      text not null default 'pendente' check (status in ('pendente','feito','pulado','revisao')),
  done_at     timestamptz,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
create index pautas_dia on public.pautas (dia desc, perfil);
select app_private.std_table('pautas', 'perfis');

-- Faturamento (meta R$ 3.000 em 60 dias: faturamento bruto, não lucro)
create table public.receitas (
  id          uuid primary key default gen_random_uuid(),
  dia         date not null default (now() at time zone 'America/Sao_Paulo')::date,
  valor       numeric(12,2) not null check (valor >= 0),
  tipo        text not null default 'servico' check (tipo in ('servico','produto','afiliado','adsense','tiktok_shop','outro')),
  descricao   text not null check (length(descricao) between 1 and 300),
  perfil      text,                                  -- origem (slug de perfis)
  canal       text,                                  -- direct, whatsapp, site, kiwify...
  custo       numeric(12,2) not null default 0 check (custo >= 0),
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
select app_private.std_table('receitas', 'financeiro');

-- ───────── Notificações por módulo (pontinho no menu) ─────────
create table public.app_events (
  id         bigint generated always as identity primary key,
  module     text not null,
  title      text,
  created_at timestamptz not null default now()
);
create index app_events_mod on public.app_events (module, created_at desc);
alter table public.app_events enable row level security;
create policy app_events_sel on public.app_events for select to authenticated using (app_private.can(module));
grant select on public.app_events to authenticated;
grant all on public.app_events to service_role;

create table public.module_seen (
  user_id uuid not null default auth.uid(),
  module  text not null,
  seen_at timestamptz not null default now(),
  primary key (user_id, module)
);
alter table public.module_seen enable row level security;
create policy module_seen_sel on public.module_seen for select to authenticated using (user_id = auth.uid());
create policy module_seen_ins on public.module_seen for insert to authenticated with check (user_id = auth.uid() and app_private.is_member());
create policy module_seen_upd on public.module_seen for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.module_seen to authenticated;
grant all on public.module_seen to service_role;

-- Novidade = linha criada/concluída por agente, rotina ou sistema (o que eu mesmo faço no painel não acende o ponto).
-- Uso: trigger after insert or update ... execute function app_private.emit_event('<modulo>', '<coluna de título>', '<status que conta como entrega ou vazio>')
create or replace function app_private.emit_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_mod text := tg_argv[0];
  v_col text := coalesce(tg_argv[1], 'title');
  v_done text := nullif(coalesce(tg_argv[2], ''), '');
  v_new jsonb := to_jsonb(new);
begin
  if coalesce(v_new->>'source', 'sistema') = 'painel' and v_done is null then return new; end if;
  if v_done is not null then
    -- só conta quando o status muda para o valor de entrega
    if not (v_new->>'status' = any(string_to_array(v_done, '|'))) then return new; end if;
    if tg_op = 'UPDATE' and (to_jsonb(old)->>'status') is not distinct from (v_new->>'status') then return new; end if;
  end if;
  if v_mod = 'claude_requests' then  -- pedido pronto acende o módulo de onde ele veio
    v_mod := case when v_new->>'kind' like 'carrossel%' then 'carrosseis' when v_new->>'kind' = 'ig_insights' then 'desempenho' when v_new->>'kind' like 'agente%' then 'agentes' else 'dashboard' end;
  end if;
  insert into app_events (module, title) values (v_mod, left(coalesce(v_new->>v_col, ''), 200));
  return new;
end $$;

create trigger trg_event after insert on public.posts for each row execute function app_private.emit_event('postador', 'title');
create trigger trg_event after update on public.post_requests for each row execute function app_private.emit_event('postador', 'topic', 'feito');
create trigger trg_event after insert on public.carrosseis for each row execute function app_private.emit_event('carrosseis', 'titulo');
create trigger trg_event after update on public.claude_requests for each row execute function app_private.emit_event('claude_requests', 'result_note', 'feito');
create trigger trg_event after insert on public.miner_links for each row execute function app_private.emit_event('miner', 'note');
create trigger trg_event after insert on public.jobs for each row execute function app_private.emit_event('trampos', 'title');
create trigger trg_event after insert on public.reports for each row execute function app_private.emit_event('desempenho', 'kind');
create trigger trg_event after insert or update on public.agent_runs for each row execute function app_private.emit_event('agentes', 'titulo', 'concluida|falha|revisao');
create trigger trg_event after insert on public.pautas for each row execute function app_private.emit_event('perfis', 'titulo');
create trigger trg_event after insert on public.mapas for each row execute function app_private.emit_event('mapa', 'titulo');

-- Pontos acesos para o usuário atual: módulo, quantas novidades e a última.
create or replace function public.module_news() returns table (module text, n bigint, last_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select e.module, count(*), max(e.created_at)
    from app_events e
    left join module_seen s on s.user_id = auth.uid() and s.module = e.module
   where e.created_at > coalesce(s.seen_at, now() - interval '7 days')
   group by e.module;
$$;
create or replace function public.mark_module_seen(p_module text) returns void
language sql security invoker set search_path = public as $$
  insert into module_seen (user_id, module, seen_at) values (auth.uid(), p_module, now())
  on conflict (user_id, module) do update set seen_at = excluded.seen_at;
$$;
grant execute on function public.module_news(), public.mark_module_seen(text) to authenticated;

-- ───────── Pedidos de ação nos agentes (rodar agora / pausar / retomar) ─────────
alter table public.claude_requests drop constraint if exists claude_requests_kind_check;
alter table public.claude_requests add constraint claude_requests_kind_check
  check (kind in ('ig_insights','carrossel_video','carrossel_novo','agente_rodar','agente_pausar','agente_retomar'));

-- ───────── Rotinas do Claude podem gravar nas tabelas novas ─────────
create or replace function public.agent_write(p_integration uuid, p_op text, p_table text, p_rows jsonb, p_id uuid default null, p_version int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ins_ok  text[] := array['posts','reports','social_stats','reel_stats','x_goal_entries','radar_items','miner_links','miner_profiles','agenda_cache','jobs','carrosseis',
                          'agent_jobs','agent_runs','pautas','mapas','sticky_notes','perfis'];
  conf    jsonb  := '{"social_stats":"day,platform","reel_stats":"day,shortcode","x_goal_entries":"day","miner_profiles":"url","agenda_cache":"id","agent_jobs":"task_id","agent_runs":"session_id","perfis":"slug"}';
  upd_ok  text[] := array['post_requests','claude_requests'];
  cols text; setc text; n int; r jsonb;
begin
  perform app_private.agent_begin(p_integration);
  if p_op in ('insert','upsert') then
    if not (p_table = any(ins_ok)) then raise exception 'tabela não permitida: %', p_table; end if;
    if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then raise exception 'rows vazio'; end if;
    if p_table = 'posts' then  -- o Claude só cria rascunho: nunca agenda nem publica
      p_rows := (select jsonb_agg((x - 'status' - 'scheduled_at' - 'posted_at' - 'external_url') || '{"status":"pending"}') from jsonb_array_elements(p_rows) x);
    end if;
    if p_table = 'carrosseis' then  -- carrossel do Claude sempre entra como rascunho
      p_rows := (select jsonb_agg((x - 'status') || '{"status":"rascunho"}') from jsonb_array_elements(p_rows) x);
    end if;
    select string_agg(quote_ident(k), ',') into cols from jsonb_object_keys(p_rows->0) k;
    if p_op = 'insert' then
      execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1)%s', p_table, cols, cols, p_table,
        case when p_table in ('miner_links','miner_profiles','jobs') then ' on conflict (url) do nothing'
             when p_table in ('carrosseis','mapas') then ' on conflict (slug) do nothing'
             when p_table = 'pautas' then ' on conflict (chave) do nothing' else '' end) using p_rows;
    else
      if conf->>p_table is null then raise exception 'upsert não permitido em %', p_table; end if;
      select string_agg(format('%I = excluded.%I', k, k), ',') into setc from jsonb_object_keys(p_rows->0) k where k <> all(string_to_array(conf->>p_table, ','));
      execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1) on conflict (%s) do update set %s',
        p_table, cols, cols, p_table, conf->>p_table, setc) using p_rows;
    end if;
    get diagnostics n = row_count;
    return jsonb_build_object('ok', true, 'rows', n);
  elsif p_op = 'update' then
    if not (p_table = any(upd_ok)) then raise exception 'update não permitido em %', p_table; end if;
    r := p_rows->0;
    execute format('update public.%I set status = coalesce($1->>''status'', status), result_note = coalesce($1->>''result_note'', result_note), done_at = coalesce(($1->>''done_at'')::timestamptz, done_at) where id = $2 and version = $3', p_table)
      using r, p_id, p_version;
    get diagnostics n = row_count;
    if n = 0 then raise exception 'conflito de versão ou não encontrado'; end if;
    return jsonb_build_object('ok', true);
  end if;
  raise exception 'operação desconhecida';
end $$;
revoke all on function public.agent_write(uuid, text, text, jsonb, uuid, int) from public, anon, authenticated;
grant execute on function public.agent_write(uuid, text, text, jsonb, uuid, int) to service_role;
