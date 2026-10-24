-- Anderson OS · migration 0019 · rotinas podem garimpar no MineR_ (miner_links/miner_profiles) + perfis de referência
create or replace function public.agent_write(p_integration uuid, p_op text, p_table text, p_rows jsonb, p_id uuid default null, p_version int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ins_ok  text[] := array['posts','reports','social_stats','reel_stats','x_goal_entries','radar_items','miner_links','miner_profiles'];
  conf    jsonb  := '{"social_stats":"day,platform","reel_stats":"day,shortcode","x_goal_entries":"day"}';
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
    select string_agg(quote_ident(k), ',') into cols from jsonb_object_keys(p_rows->0) k;
    if p_op = 'insert' then
      execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1)%s', p_table, cols, cols, p_table,
        case when p_table in ('miner_links','miner_profiles') then ' on conflict (url) do nothing' else '' end) using p_rows;
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

insert into public.miner_profiles (url, platform, handle, note) values
  ('https://www.instagram.com/auramode.ai/','instagram','@auramode.ai','inspiração do @ilmarlabs: virais com famosos'),
  ('https://www.instagram.com/anselmovitor/','instagram','@anselmovitor','concorrente/referência'),
  ('https://www.instagram.com/abrahubstudio/','instagram','@abrahubstudio','concorrente/referência'),
  ('https://www.instagram.com/matheusborrascah/','instagram','@matheusborrascah','concorrente/referência'),
  ('https://www.instagram.com/onovomercado/','instagram','@onovomercado','notícias e educacional'),
  ('https://www.instagram.com/rodrigoscarpa/','instagram','@rodrigoscarpa','concorrente/referência'),
  ('https://www.instagram.com/baronesintetico/','instagram','@baronesintetico','concorrente/referência'),
  ('https://www.instagram.com/kaique.editor/','instagram','@kaique.editor','notícias e educacional'),
  ('https://www.instagram.com/monraaii/','instagram','@monraaii','concorrente/referência'),
  ('https://www.instagram.com/rudylanducci/','instagram','@rudylanducci','concorrente/referência'),
  ('https://www.instagram.com/v4company/','instagram','@v4company','notícias e educacional'),
  ('https://www.instagram.com/d0n.ai/','instagram','@d0n.ai','concorrente/referência'),
  ('https://www.instagram.com/ohdejay/','instagram','@ohdejay','concorrente/referência'),
  ('https://www.instagram.com/studio.artificial/','instagram','@studio.artificial','concorrente/referência'),
  ('https://www.instagram.com/iamsmoother/','instagram','@iamsmoother','concorrente/referência')
on conflict (url) do nothing;
