-- Anderson OS · migration 0039 · LeadS_ > Pesquisas: base de prospecção (negócios e igrejas achados em pesquisa pública)
-- O Claude pesquisa e grava aqui (agent_write, só insert, sempre 'novo'); o Anderson aborda pelo painel
-- (Direct, WhatsApp Business ou e-mail, com script pronto) e move o status. Sem DELETE: descartar = status 'descartado'.
-- LGPD: só dados que o próprio negócio divulga (perfil, telefone/site de contato comercial).

create table if not exists public.prospects (
  id          uuid primary key default gen_random_uuid(),
  pesquisa    text not null check (length(pesquisa) between 1 and 120),
  cidade      text check (length(cidade) <= 120),
  uf          text check (length(uf) <= 2),
  segmento    text check (length(segmento) <= 80),
  nome        text not null check (length(nome) between 1 and 160),
  instagram   text check (length(instagram) <= 80),
  seguidores  text check (length(seguidores) <= 20),
  whatsapp    text check (length(whatsapp) <= 20),
  email       text check (length(email) <= 254),
  site        text check (length(site) <= 300),
  destaque    boolean not null default false,
  notas       text check (length(notas) <= 1000),
  status      text not null default 'novo' check (status in ('novo','contatado','respondeu','fechou','descartado')),
  contatado_em timestamptz,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid,
  unique (pesquisa, nome, cidade)
);
create index if not exists prospects_pesquisa_idx on public.prospects (pesquisa, cidade);

create trigger trg_stamp before insert on public.prospects for each row execute function app_private.stamp_origin();
create trigger trg_before_update before update on public.prospects for each row execute function app_private.before_update();
create trigger trg_log after insert or update on public.prospects for each row execute function app_private.log_change();
alter table public.prospects enable row level security;
create policy prospects_sel on public.prospects for select to authenticated using (app_private.can('leads'));
create policy prospects_upd on public.prospects for update to authenticated using (app_private.can('leads')) with check (app_private.can('leads'));
grant select, update on public.prospects to authenticated;
grant all on public.prospects to service_role;

-- Botão "Pedir nova pesquisa" no LeadS_: claude_requests kind 'pesquisa_leads' (payload: cidades, segmento, observação).
alter table public.claude_requests drop constraint if exists claude_requests_kind_check;
alter table public.claude_requests add constraint claude_requests_kind_check check (kind in ('ig_insights','carrossel_video','carrossel_novo','carrossel_ajuste','pesquisa_leads'));

-- agent_write: aceita prospects (só insert, sem duplicar). Inclui tudo da 0038: se mexer numa, mexa na outra.
create or replace function public.agent_write(p_integration uuid, p_op text, p_table text, p_rows jsonb, p_id uuid default null, p_version int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ins_ok  text[] := array['posts','reports','social_stats','reel_stats','x_goal_entries','radar_items','miner_links','miner_profiles','agenda_cache','jobs','carrosseis',
                          'agent_jobs','agent_runs','pautas','mapas','sticky_notes','perfis','emails','produtos','social_inbox','aprovacoes','prospects'];
  conf    jsonb  := '{"social_stats":"day,platform","reel_stats":"day,shortcode","x_goal_entries":"day","miner_profiles":"url","agenda_cache":"id","agent_jobs":"task_id","agent_runs":"session_id","perfis":"slug","emails":"gmail_id","produtos":"slug","aprovacoes":"arquivo"}';
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
    if p_table = 'social_inbox' then  -- leitura da caixa: nunca marca como respondido nem arquiva
      if p_op <> 'insert' then raise exception 'social_inbox só aceita insert'; end if;
      p_rows := (select jsonb_agg((x - 'id' - 'status' - 'reply_text' - 'auto_rule' - 'archived_at' - 'version') || '{"status":"novo"}') from jsonb_array_elements(p_rows) x);
    end if;
    if p_table = 'prospects' then  -- pesquisa nova sempre entra como novo; o contato é do Anderson
      if p_op <> 'insert' then raise exception 'prospects só aceita insert'; end if;
      p_rows := (select jsonb_agg((x - 'id' - 'status' - 'version' - 'archived_at') || '{"status":"novo"}') from jsonb_array_elements(p_rows) x);
    end if;
    if p_table = 'aprovacoes' then  -- o agente só envia para aprovação: a decisão é do Anderson no painel
      p_rows := (select jsonb_agg((x - 'id' - 'status' - 'comentario' - 'decidido_em' - 'publicado_em' - 'url_publicado' - 'version' - 'archived_at') || '{"status":"pendente"}') from jsonb_array_elements(p_rows) x);
    end if;
    select string_agg(quote_ident(k), ',') into cols from jsonb_object_keys(p_rows->0) k;
    if p_op = 'insert' then
      execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1)%s', p_table, cols, cols, p_table,
        case when p_table in ('miner_links','miner_profiles','jobs') then ' on conflict (url) do nothing'
             when p_table in ('carrosseis','mapas','produtos') then ' on conflict (slug) do nothing'
             when p_table = 'pautas' then ' on conflict (chave) do nothing'
             when p_table = 'emails' then ' on conflict (gmail_id) do nothing'
             when p_table = 'aprovacoes' then ' on conflict (arquivo) do nothing'
             when p_table = 'prospects' then ' on conflict (pesquisa, nome, cidade) do nothing'
             when p_table = 'social_inbox' then ' on conflict (platform, kind, external_id) do nothing' else '' end) using p_rows;
    else
      if conf->>p_table is null then raise exception 'upsert não permitido em %', p_table; end if;
      select string_agg(format('%I = excluded.%I', k, k), ',') into setc from jsonb_object_keys(p_rows->0) k where k <> all(string_to_array(conf->>p_table, ','));
      execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1) on conflict (%s) do update set %s',
        p_table, cols, cols, p_table, conf->>p_table, setc) using p_rows;
    end if;
    get diagnostics n = row_count;
    return jsonb_build_object('ok', true, 'rows', n);
  elsif p_op = 'update' then
    if p_table = 'aprovacoes' then  -- agente só pode mexer na sugestão de postagem (a decisão é do Anderson)
      r := p_rows->0;
      if coalesce((r->>'arquivar')::boolean, false) then  -- agente tira da fila uma peça dele que o Anderson ainda não decidiu (ex.: duplicada)
        update public.aprovacoes set archived_at = now() where id = p_id and version = p_version and status = 'pendente';
      else
        update public.aprovacoes set sugestao_em = coalesce((r->>'sugestao_em')::timestamptz, sugestao_em), sugestao_nota = coalesce(r->>'sugestao_nota', sugestao_nota)
         where id = p_id and version = p_version;
      end if;
      get diagnostics n = row_count;
      if n = 0 then raise exception 'conflito de versão, não encontrado ou já decidido'; end if;
      return jsonb_build_object('ok', true);
    end if;
    if p_table = 'carrosseis' then  -- "Pedir alteração": agente refaz conteúdo; status (decisão) continua do Anderson
      r := p_rows->0;
      update public.carrosseis set slides = coalesce(r->'slides', slides), legenda = coalesce(r->>'legenda', legenda),
             fontes = coalesce(r->'fontes', fontes), notas = coalesce(r->>'notas', notas), titulo = coalesce(r->>'titulo', titulo)
       where id = p_id and version = p_version and archived_at is null;
      get diagnostics n = row_count;
      if n = 0 then raise exception 'conflito de versão ou não encontrado'; end if;
      return jsonb_build_object('ok', true);
    end if;
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

-- Carga inicial dos contatos: feita direto no banco (fora do Git, o repositório é público).
