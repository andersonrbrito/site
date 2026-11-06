-- Anderson OS · migration 0035 · sugestão de data e horário de postagem em cada peça do AprovaçõeS_ (todos os perfis).
alter table public.aprovacoes add column if not exists sugestao_em timestamptz;     -- quando postar (horário de Brasília na interface)
alter table public.aprovacoes add column if not exists sugestao_nota text check (length(sugestao_nota) <= 200);  -- por quê (ex.: pico de jogo após as 18h)
create index if not exists aprovacoes_sugestao on public.aprovacoes (sugestao_em);

create or replace function public.agent_write(p_integration uuid, p_op text, p_table text, p_rows jsonb, p_id uuid default null, p_version int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ins_ok  text[] := array['posts','reports','social_stats','reel_stats','x_goal_entries','radar_items','miner_links','miner_profiles','agenda_cache','jobs','carrosseis',
                          'agent_jobs','agent_runs','pautas','mapas','sticky_notes','perfis','emails','produtos','social_inbox','aprovacoes'];
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
      update public.aprovacoes set sugestao_em = coalesce((r->>'sugestao_em')::timestamptz, sugestao_em), sugestao_nota = coalesce(r->>'sugestao_nota', sugestao_nota)
       where id = p_id and version = p_version;
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
