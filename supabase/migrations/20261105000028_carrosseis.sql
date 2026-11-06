-- Anderson OS · migration 0028 · Carrosséis diários (estilo print de tweet) + pedido de vídeo
-- A rotina diária do Claude cria 4 carrosséis por dia (2 notícias + 2 educativos) via agent_write.
-- O painel edita texto e mídia de cada lâmina (salvamento com versão) e pede "Transformar em vídeo"
-- (claude_requests kind 'carrossel_video', com o carrossel editado no payload).

create table public.carrosseis (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  dia         date not null default (now() at time zone 'America/Sao_Paulo')::date,
  tipo        text not null check (tipo in ('noticia','educativo')),
  titulo      text not null check (length(titulo) between 1 and 200),
  perfil      text not null default '@ilmarlabs',
  legenda     text check (length(legenda) <= 2200),
  slides      jsonb not null default '[]' check (jsonb_typeof(slides) = 'array'),
  fontes      jsonb not null default '[]' check (jsonb_typeof(fontes) = 'array'),
  notas       text,
  status      text not null default 'rascunho' check (status in ('rascunho','aprovado','postado','descartado')),
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'claude',
  created_by_user uuid,
  created_by_integration uuid
);
create index carrosseis_dia on public.carrosseis (dia desc);
create trigger trg_stamp before insert on public.carrosseis for each row execute function app_private.stamp_origin();
create trigger trg_before_update before update on public.carrosseis for each row execute function app_private.before_update();
create trigger trg_log after insert or update on public.carrosseis for each row execute function app_private.log_change();
alter table public.carrosseis enable row level security;
create policy carrosseis_sel on public.carrosseis for select to authenticated using (app_private.can('postador'));
create policy carrosseis_ins on public.carrosseis for insert to authenticated with check (app_private.can('postador'));
create policy carrosseis_upd on public.carrosseis for update to authenticated using (app_private.can('postador')) with check (app_private.can('postador'));
grant select, insert, update on public.carrosseis to authenticated;
grant all on public.carrosseis to service_role;

-- Pedido de vídeo do carrossel: mesmo canal dos outros pedidos pro Claude.
alter table public.claude_requests add column if not exists payload jsonb;
alter table public.claude_requests drop constraint if exists claude_requests_kind_check;
alter table public.claude_requests add constraint claude_requests_kind_check check (kind in ('ig_insights','carrossel_video'));

-- O Claude passa a poder inserir carrosséis (slug repetido é ignorado).
create or replace function public.agent_write(p_integration uuid, p_op text, p_table text, p_rows jsonb, p_id uuid default null, p_version int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ins_ok  text[] := array['posts','reports','social_stats','reel_stats','x_goal_entries','radar_items','miner_links','miner_profiles','agenda_cache','jobs','carrosseis'];
  conf    jsonb  := '{"social_stats":"day,platform","reel_stats":"day,shortcode","x_goal_entries":"day","miner_profiles":"url","agenda_cache":"id"}';
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
             when p_table = 'carrosseis' then ' on conflict (slug) do nothing' else '' end) using p_rows;
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
