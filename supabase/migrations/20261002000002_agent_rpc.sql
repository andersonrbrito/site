-- Anderson OS · migration 0002 · operações específicas para agentes (sem SQL arbitrário)
-- Chamadas apenas pelo servidor (service_role) depois de autenticar a chave da integração.
-- A origem (chatgpt/claude/...) vem de integrations.kind, nunca do corpo do pedido.

create or replace function app_private.agent_begin(p_integration uuid) returns text
language plpgsql set search_path = public as $$
declare v_kind text;
begin
  select kind into v_kind from integrations where id = p_integration and revoked_at is null;
  if v_kind is null then raise exception 'integration_revoked'; end if;
  perform set_config('app.source', v_kind, true);
  perform set_config('app.integration_id', p_integration::text, true);
  return v_kind;
end $$;

create or replace function app_private.jsonb_text_array(p jsonb) returns text[]
language sql immutable as $$
  select coalesce(array(select jsonb_array_elements_text(p)), '{}'::text[]);
$$;

-- Rate limit por janela fixa. Retorna false quando excedeu.
create or replace function public.agent_rate_check(p_integration uuid, p_limit int, p_window_seconds int default 60)
returns boolean language plpgsql set search_path = public as $$
declare v_win timestamptz; v_hits int;
begin
  v_win := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into rate_limits (integration_id, window_start, hits) values (p_integration, v_win, 1)
  on conflict (integration_id, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;
  delete from rate_limits where window_start < now() - interval '1 hour';
  update integrations set last_used_at = now() where id = p_integration;
  return v_hits <= p_limit;
end $$;

create or replace function public.agent_create_task(p_integration uuid, p_idem text, p_data jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare r tasks%rowtype; v_rows int; v_prev jsonb; v_out jsonb;
begin
  perform app_private.agent_begin(p_integration);
  if p_idem is not null then
    insert into idempotency_keys (integration_id, key, op, result) values (p_integration, p_idem, 'create_task', '{}')
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      select result into v_prev from idempotency_keys where integration_id = p_integration and key = p_idem;
      return v_prev || jsonb_build_object('idempotent_replay', true);
    end if;
  end if;
  insert into tasks (title, description, project_id, client_id, area, priority, status, due_date,
                     waiting_for, assignee, tags, links, notes)
  values (
    p_data->>'title', p_data->>'description',
    nullif(p_data->>'project_id','')::uuid, nullif(p_data->>'client_id','')::uuid,
    coalesce(p_data->>'area','trabalho'), coalesce(p_data->>'priority','normal'),
    coalesce(p_data->>'status','inbox'), nullif(p_data->>'due_date','')::date,
    p_data->>'waiting_for', p_data->>'assignee',
    app_private.jsonb_text_array(p_data->'tags'), coalesce(p_data->'links','[]'::jsonb), p_data->>'notes')
  returning * into r;
  v_out := to_jsonb(r) || jsonb_build_object('ref', 'T-' || r.seq);
  if p_idem is not null then
    update idempotency_keys set result = v_out where integration_id = p_integration and key = p_idem;
  end if;
  return v_out;
end $$;

create or replace function public.agent_update_task(p_integration uuid, p_id uuid, p_version int, p_patch jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare r tasks%rowtype;
begin
  perform app_private.agent_begin(p_integration);
  update tasks set
    title       = case when p_patch ? 'title' then p_patch->>'title' else title end,
    description = case when p_patch ? 'description' then p_patch->>'description' else description end,
    project_id  = case when p_patch ? 'project_id' then nullif(p_patch->>'project_id','')::uuid else project_id end,
    client_id   = case when p_patch ? 'client_id' then nullif(p_patch->>'client_id','')::uuid else client_id end,
    area        = case when p_patch ? 'area' then p_patch->>'area' else area end,
    priority    = case when p_patch ? 'priority' then p_patch->>'priority' else priority end,
    status      = case when p_patch ? 'status' then p_patch->>'status' else status end,
    due_date    = case when p_patch ? 'due_date' then nullif(p_patch->>'due_date','')::date else due_date end,
    waiting_for = case when p_patch ? 'waiting_for' then p_patch->>'waiting_for' else waiting_for end,
    assignee    = case when p_patch ? 'assignee' then p_patch->>'assignee' else assignee end,
    tags        = case when p_patch ? 'tags' then app_private.jsonb_text_array(p_patch->'tags') else tags end,
    links       = case when p_patch ? 'links' then coalesce(p_patch->'links','[]'::jsonb) else links end,
    notes       = case when p_patch ? 'notes' then p_patch->>'notes' else notes end
  where id = p_id and version = p_version and archived_at is null
  returning * into r;
  if not found then
    if exists (select 1 from tasks where id = p_id and archived_at is null) then
      raise exception 'version_conflict';
    end if;
    raise exception 'not_found';
  end if;
  return to_jsonb(r) || jsonb_build_object('ref', 'T-' || r.seq);
end $$;

create or replace function public.agent_create_project(p_integration uuid, p_idem text, p_data jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare r projects%rowtype; v_rows int; v_prev jsonb; v_out jsonb;
begin
  perform app_private.agent_begin(p_integration);
  if p_idem is not null then
    insert into idempotency_keys (integration_id, key, op, result) values (p_integration, p_idem, 'create_project', '{}')
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      select result into v_prev from idempotency_keys where integration_id = p_integration and key = p_idem;
      return v_prev || jsonb_build_object('idempotent_replay', true);
    end if;
  end if;
  insert into projects (name, area, client_id, description, status, stage, payment_status, due_date)
  values (p_data->>'name', coalesce(p_data->>'area','freelas'), nullif(p_data->>'client_id','')::uuid,
          p_data->>'description', coalesce(p_data->>'status','ativo'), coalesce(p_data->>'stage','briefing'),
          coalesce(p_data->>'payment_status','nao_aplicavel'), nullif(p_data->>'due_date','')::date)
  returning * into r;
  v_out := to_jsonb(r) || jsonb_build_object('ref', 'P-' || r.seq);
  if p_idem is not null then
    update idempotency_keys set result = v_out where integration_id = p_integration and key = p_idem;
  end if;
  return v_out;
end $$;

create or replace function public.agent_add_note(p_integration uuid, p_idem text, p_data jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare r notes%rowtype; v_rows int; v_prev jsonb; v_out jsonb;
begin
  perform app_private.agent_begin(p_integration);
  if p_idem is not null then
    insert into idempotency_keys (integration_id, key, op, result) values (p_integration, p_idem, 'add_note', '{}')
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      select result into v_prev from idempotency_keys where integration_id = p_integration and key = p_idem;
      return v_prev || jsonb_build_object('idempotent_replay', true);
    end if;
  end if;
  insert into notes (title, body, project_id, task_id)
  values (coalesce(p_data->>'title',''), coalesce(p_data->>'body',''),
          nullif(p_data->>'project_id','')::uuid, nullif(p_data->>'task_id','')::uuid)
  returning * into r;
  v_out := to_jsonb(r);
  if p_idem is not null then
    update idempotency_keys set result = v_out where integration_id = p_integration and key = p_idem;
  end if;
  return v_out;
end $$;

create or replace function public.agent_create_event(p_integration uuid, p_idem text, p_data jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare r events%rowtype; v_rows int; v_prev jsonb; v_out jsonb;
begin
  perform app_private.agent_begin(p_integration);
  if p_idem is not null then
    insert into idempotency_keys (integration_id, key, op, result) values (p_integration, p_idem, 'create_event', '{}')
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      select result into v_prev from idempotency_keys where integration_id = p_integration and key = p_idem;
      return v_prev || jsonb_build_object('idempotent_replay', true);
    end if;
  end if;
  insert into events (title, description, all_day, start_date, end_date, starts_at, ends_at, location, project_id)
  values (p_data->>'title', p_data->>'description', coalesce((p_data->>'all_day')::boolean, false),
          nullif(p_data->>'start_date','')::date, nullif(p_data->>'end_date','')::date,
          nullif(p_data->>'starts_at','')::timestamptz, nullif(p_data->>'ends_at','')::timestamptz,
          p_data->>'location', nullif(p_data->>'project_id','')::uuid)
  returning * into r;
  v_out := to_jsonb(r);
  if p_idem is not null then
    update idempotency_keys set result = v_out where integration_id = p_integration and key = p_idem;
  end if;
  return v_out;
end $$;

-- Somente service_role executa
do $$
declare f text;
begin
  foreach f in array array[
    'agent_rate_check(uuid,int,int)','agent_create_task(uuid,text,jsonb)','agent_update_task(uuid,uuid,int,jsonb)',
    'agent_create_project(uuid,text,jsonb)','agent_add_note(uuid,text,jsonb)','agent_create_event(uuid,text,jsonb)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;
grant execute on function app_private.agent_begin(uuid), app_private.jsonb_text_array(jsonb) to service_role;
