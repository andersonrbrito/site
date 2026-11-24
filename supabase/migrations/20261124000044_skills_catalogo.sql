-- Anderson OS · migration 0044 · SkillS_ > Painel: catálogo vivo de skills, plugins, estilos e aulas.
-- O sincronizador local (tools/skills_sync.py) lê ~/.claude/skills e os plugins instalados e faz upsert aqui
-- (origem 'instalada'). Skills novas criadas por agentes ou pela evolução semanal entram com escolha 'avaliar'.
-- O Anderson escolhe no painel: 'ativa' (fica em ~/.claude/skills), 'desligada' (o sincronizador tira da pasta
-- e guarda em ~/.claude/skills_desligadas) ou 'avaliar'. Sem DELETE: arquivar com archived_at.

create table if not exists public.skills_catalogo (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (length(slug) between 1 and 80),
  nome        text not null check (length(nome) between 1 and 120),
  descricao   text check (length(descricao) <= 2000),
  categoria   text not null default 'sistema' check (categoria in ('video','motion','legenda','conteudo','design','docs','sistema','estilo','aula')),
  tipo        text not null default 'skill' check (tipo in ('skill','plugin','estilo','aula','repo')),
  origem      text not null default 'instalada' check (origem in ('instalada','nova','recomendada')),
  escolha     text not null default 'avaliar' check (escolha in ('ativa','desligada','avaliar')),
  fonte_url   text check (length(fonte_url) <= 500),
  caminho     text check (length(caminho) <= 500),
  arquivos    jsonb not null default '[]'::jsonb,          -- [{nome, bytes}] dos arquivos da pasta da skill
  aprendizados text check (length(aprendizados) <= 8000),  -- resumo do que a skill ensina / o que mudou
  agentes     text[] not null default '{}',                -- perfis/agentes que usam (ex.: ocorintia, kairos)
  semana      date not null default (now() at time zone 'America/Sao_Paulo')::date,
  instalada   boolean not null default false,              -- o sincronizador viu a pasta no Mac
  sincronizado_em timestamptz,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
create index if not exists skills_catalogo_semana on public.skills_catalogo (semana desc);

create trigger trg_stamp before insert on public.skills_catalogo for each row execute function app_private.stamp_origin();
create trigger trg_before_update before update on public.skills_catalogo for each row execute function app_private.before_update();
create trigger trg_log after insert or update on public.skills_catalogo for each row execute function app_private.log_change();
create trigger trg_event after insert on public.skills_catalogo for each row execute function app_private.emit_event('skills', 'nome');
alter table public.skills_catalogo enable row level security;
create policy skills_catalogo_sel on public.skills_catalogo for select to authenticated using (app_private.can('prompts'));
create policy skills_catalogo_upd on public.skills_catalogo for update to authenticated using (app_private.can('prompts')) with check (app_private.can('prompts'));
grant select, update on public.skills_catalogo to authenticated;
grant all on public.skills_catalogo to service_role;

-- agent_write: aceita skills_catalogo (upsert por slug). O agente NUNCA decide a escolha do Anderson:
-- linha nova entra 'avaliar'; em upsert de linha existente a coluna escolha é preservada.
-- Inclui tudo da 0039: se mexer numa, mexa na outra.
create or replace function public.agent_write(p_integration uuid, p_op text, p_table text, p_rows jsonb, p_id uuid default null, p_version int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  ins_ok  text[] := array['posts','reports','social_stats','reel_stats','x_goal_entries','radar_items','miner_links','miner_profiles','agenda_cache','jobs','carrosseis',
                          'agent_jobs','agent_runs','pautas','mapas','sticky_notes','perfis','emails','produtos','social_inbox','aprovacoes','prospects','skills_catalogo'];
  conf    jsonb  := '{"social_stats":"day,platform","reel_stats":"day,shortcode","x_goal_entries":"day","miner_profiles":"url","agenda_cache":"id","agent_jobs":"task_id","agent_runs":"session_id","perfis":"slug","emails":"gmail_id","produtos":"slug","aprovacoes":"arquivo","skills_catalogo":"slug"}';
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
    if p_table = 'social_inbox' then
      if p_op <> 'insert' then raise exception 'social_inbox só aceita insert'; end if;
      p_rows := (select jsonb_agg((x - 'id' - 'status' - 'reply_text' - 'auto_rule' - 'archived_at' - 'version') || '{"status":"novo"}') from jsonb_array_elements(p_rows) x);
    end if;
    if p_table = 'prospects' then
      if p_op <> 'insert' then raise exception 'prospects só aceita insert'; end if;
      p_rows := (select jsonb_agg((x - 'id' - 'status' - 'version' - 'archived_at') || '{"status":"novo"}') from jsonb_array_elements(p_rows) x);
    end if;
    if p_table = 'aprovacoes' then
      p_rows := (select jsonb_agg((x - 'id' - 'status' - 'comentario' - 'decidido_em' - 'publicado_em' - 'url_publicado' - 'version' - 'archived_at') || '{"status":"pendente"}') from jsonb_array_elements(p_rows) x);
    end if;
    if p_table = 'skills_catalogo' then  -- a escolha é do Anderson: o agente nunca manda escolha
      p_rows := (select jsonb_agg(x - 'id' - 'escolha' - 'version' - 'archived_at') from jsonb_array_elements(p_rows) x);
    end if;
    select string_agg(quote_ident(k), ',') into cols from jsonb_object_keys(p_rows->0) k;
    if p_op = 'insert' then
      execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1)%s', p_table, cols, cols, p_table,
        case when p_table in ('miner_links','miner_profiles','jobs') then ' on conflict (url) do nothing'
             when p_table in ('carrosseis','mapas','produtos','skills_catalogo') then ' on conflict (slug) do nothing'
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
    if p_table = 'aprovacoes' then
      r := p_rows->0;
      if coalesce((r->>'arquivar')::boolean, false) then
        update public.aprovacoes set archived_at = now() where id = p_id and version = p_version and status = 'pendente';
      else
        update public.aprovacoes set sugestao_em = coalesce((r->>'sugestao_em')::timestamptz, sugestao_em), sugestao_nota = coalesce(r->>'sugestao_nota', sugestao_nota)
         where id = p_id and version = p_version;
      end if;
      get diagnostics n = row_count;
      if n = 0 then raise exception 'conflito de versão, não encontrado ou já decidido'; end if;
      return jsonb_build_object('ok', true);
    end if;
    if p_table = 'carrosseis' then
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
