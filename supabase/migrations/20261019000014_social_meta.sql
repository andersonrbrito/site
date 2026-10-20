-- Anderson OS · migration 0014 · Social (Instagram + Página do Facebook): caixa de entrada, respostas automáticas e conexões da Meta

-- Contas conectadas pela Meta. O token fica só para o service_role (o painel não lê a coluna token).
create table public.meta_accounts (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('instagram','page')),
  account_id  text not null,
  name        text,
  token       text not null,
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (kind, account_id)
);
alter table public.meta_accounts enable row level security;
create policy meta_accounts_sel on public.meta_accounts for select to authenticated using (app_private.can('social'));
revoke all on public.meta_accounts from anon, authenticated;
grant select (id, kind, account_id, name, expires_at, created_at, updated_at) on public.meta_accounts to authenticated;
grant all on public.meta_accounts to service_role;

-- Estados do login OAuth (anti-CSRF), só service_role
create table public.meta_oauth_states (
  state      text primary key,
  kind       text not null check (kind in ('instagram','page')),
  created_at timestamptz not null default now()
);
alter table public.meta_oauth_states enable row level security;
revoke all on public.meta_oauth_states from anon, authenticated;
grant all on public.meta_oauth_states to service_role;

-- Caixa de entrada: comentários, DMs e leads
create table public.social_inbox (
  id           uuid primary key default gen_random_uuid(),
  platform     text not null check (platform in ('instagram','facebook')),
  kind         text not null check (kind in ('comment','dm','lead')),
  external_id  text not null,
  parent_id    text,
  permalink    text,
  author_id    text,
  author_name  text,
  text         text,
  data         jsonb not null default '{}',
  status       text not null default 'novo' check (status in ('novo','respondido','ignorado')),
  reply_text   text,
  auto_rule    uuid,
  received_at  timestamptz not null default now(),
  version      int not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz,
  source       text not null default 'meta',
  created_by_user uuid,
  created_by_integration uuid,
  unique (platform, kind, external_id)
);
create index social_inbox_recent on public.social_inbox (received_at desc);

-- Respostas automáticas por palavra-chave (estilo ManyChat)
create table public.autoreply_rules (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null default 'ambos' check (platform in ('instagram','facebook','ambos')),
  keyword       text not null check (length(trim(keyword)) > 0),
  dm_text       text,
  comment_reply text,
  active        boolean not null default true,
  hits          int not null default 0,
  version       int not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  archived_at   timestamptz,
  source        text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid,
  check (dm_text is not null or comment_reply is not null)
);

do $$ declare t text; begin
  foreach t in array array['social_inbox','autoreply_rules'] loop
    execute format('create trigger trg_stamp before insert on public.%I for each row execute function app_private.stamp_origin()', t);
    execute format('create trigger trg_before_update before update on public.%I for each row execute function app_private.before_update()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (app_private.can(''social''))', t||'_sel', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (app_private.can(''social''))', t||'_ins', t);
    execute format('create policy %I on public.%I for update to authenticated using (app_private.can(''social'')) with check (app_private.can(''social''))', t||'_upd', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
create trigger trg_log after insert or update on public.autoreply_rules for each row execute function app_private.log_change();

-- Cron: chama a função "meta" (renova token do Instagram e sincroniza números) todo dia às 05:10 SP
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then return; end if;
  execute $f$
    create or replace function app_private.call_meta(p_action text) returns void
    language plpgsql security definer set search_path = '' as $b$
    begin
      perform net.http_post(
        url := 'https://avyzkygunshncwwbmzll.supabase.co/functions/v1/meta?action=' || p_action,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', public.postador_cron_key()),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000);
    end $b$;
  $f$;
  perform cron.unschedule(jobid) from cron.job where jobname = 'meta_daily';
  perform cron.schedule('meta_daily', '10 8 * * *', $c$select app_private.call_meta('daily')$c$);
end $$;
