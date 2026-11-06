-- Anderson OS · migration 0031 · NoteS_ (notas estilo Keep), ProdutoS_ (PDFs + Kiwify), e-mails importantes,
-- perfis com foto/seguidores, relatório do Facebook e arquivos do painel (imagens do Map MentaleS_ e PDFs).

-- ───────── NoteS_: a mesma tabela guarda sticky (PaineL_) e notas de texto/lista ─────────
alter table public.sticky_notes add column if not exists tipo text not null default 'sticky';
alter table public.sticky_notes drop constraint if exists sticky_notes_tipo_check;
alter table public.sticky_notes add constraint sticky_notes_tipo_check check (tipo in ('sticky','nota','lista'));
alter table public.sticky_notes add column if not exists titulo text check (length(titulo) <= 200);
alter table public.sticky_notes add column if not exists itens jsonb not null default '[]' check (jsonb_typeof(itens) = 'array');

-- ───────── Perfis: foto, link, seguidores do dia ─────────
alter table public.perfis add column if not exists url text;
alter table public.perfis add column if not exists foto_url text;
alter table public.perfis add column if not exists seguidores int;
alter table public.perfis add column if not exists seguidores_em timestamptz;

-- ───────── ProdutoS_ ─────────
create table public.produtos (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  nome        text not null check (length(nome) between 1 and 200),
  descricao   text,
  preco       numeric(12,2),
  status      text not null default 'rascunho' check (status in ('rascunho','revisao','a_venda','pausado')),
  perfil      text,
  kiwify_url  text,
  arquivo     text,                                  -- caminho no bucket anderson-os-arquivos
  capa        text,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
select app_private.std_table('produtos', 'produtos');

-- ───────── E-mails importantes (rotina lê o Gmail e grava o resumo) ─────────
create table public.emails (
  id          uuid primary key default gen_random_uuid(),
  gmail_id    text not null unique,
  thread_id   text,
  conta       text not null default 'contato@andersonbrito.com',
  de          text,
  assunto     text,
  resumo      text,
  recebido_em timestamptz,
  prioridade  text not null default 'media' check (prioridade in ('alta','media','baixa')),
  categoria   text,                                   -- cliente, pagamento, vaga, plataforma, pessoal...
  acao        text,                                   -- o que fazer (responder, pagar, ler...)
  link        text,
  lido        boolean not null default false,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
create index emails_recebido on public.emails (recebido_em desc);
select app_private.std_table('emails', 'emails');
create trigger trg_event after insert on public.emails for each row execute function app_private.emit_event('dashboard', 'assunto');

-- ───────── Relatório do Facebook ─────────
alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind in ('insights','desempenho','instagram','facebook'));

-- ───────── Arquivos do painel (imagens do mapa, PDFs dos produtos) ─────────
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('anderson-os-arquivos', 'anderson-os-arquivos', false, 209715200,
            array['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
    on conflict (id) do nothing;
    execute $p$create policy aos_arq_sel on storage.objects for select to authenticated using (bucket_id = 'anderson-os-arquivos' and app_private.is_member())$p$;
    execute $p$create policy aos_arq_ins on storage.objects for insert to authenticated with check (bucket_id = 'anderson-os-arquivos' and app_private.is_member())$p$;
    execute $p$create policy aos_arq_upd on storage.objects for update to authenticated using (bucket_id = 'anderson-os-arquivos' and app_private.is_member())$p$;
  end if;
end $$;

-- ───────── Rotinas: podem gravar e-mails, produtos e atualizar seguidores ─────────
create or replace function public.agent_write(p_integration uuid, p_op text, p_table text, p_rows jsonb, p_id uuid default null, p_version int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ins_ok  text[] := array['posts','reports','social_stats','reel_stats','x_goal_entries','radar_items','miner_links','miner_profiles','agenda_cache','jobs','carrosseis',
                          'agent_jobs','agent_runs','pautas','mapas','sticky_notes','perfis','emails','produtos'];
  conf    jsonb  := '{"social_stats":"day,platform","reel_stats":"day,shortcode","x_goal_entries":"day","miner_profiles":"url","agenda_cache":"id","agent_jobs":"task_id","agent_runs":"session_id","perfis":"slug","emails":"gmail_id","produtos":"slug"}';
  upd_ok  text[] := array['post_requests','claude_requests'];
  cols text; setc text; n int; r jsonb;
begin
  perform app_private.agent_begin(p_integration);
  if p_op in ('insert','upsert') then
    if not (p_table = any(ins_ok)) then raise exception 'tabela não permitida: %', p_table; end if;
    if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then raise exception 'rows vazio'; end if;
    if p_table = 'posts' then
      p_rows := (select jsonb_agg((x - 'status' - 'scheduled_at' - 'posted_at' - 'external_url') || '{"status":"pending"}') from jsonb_array_elements(p_rows) x);
    end if;
    if p_table = 'carrosseis' then
      p_rows := (select jsonb_agg((x - 'status') || '{"status":"rascunho"}') from jsonb_array_elements(p_rows) x);
    end if;
    select string_agg(quote_ident(k), ',') into cols from jsonb_object_keys(p_rows->0) k;
    if p_op = 'insert' then
      execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1)%s', p_table, cols, cols, p_table,
        case when p_table in ('miner_links','miner_profiles','jobs') then ' on conflict (url) do nothing'
             when p_table in ('carrosseis','mapas','produtos') then ' on conflict (slug) do nothing'
             when p_table = 'pautas' then ' on conflict (chave) do nothing'
             when p_table = 'emails' then ' on conflict (gmail_id) do nothing' else '' end) using p_rows;
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

-- Acesso completo para theilmar@gmail.com (pedido do Anderson em 06/11/2026)
insert into public.allowed_emails (email, role, modules) values ('theilmar@gmail.com', 'owner', '{}')
on conflict (email) do update set role = excluded.role;
update public.app_members set role = 'owner' where lower(email) = 'theilmar@gmail.com';
