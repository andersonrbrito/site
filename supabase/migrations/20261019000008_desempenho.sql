-- Anderson OS · migration 0008 · desempenho diário (X e Instagram)
-- Preenchido toda manhã pela rotina do Claude (lendo o X e o Instagram logados no Chrome do Anderson).

create table public.social_stats (
  id          uuid primary key default gen_random_uuid(),
  day         date not null,
  platform    text not null check (platform in ('x','instagram')),
  followers   int check (followers >= 0),
  following   int check (following >= 0),
  posts       int check (posts >= 0),
  data        jsonb not null default '{}',          -- extras (ex.: x: verified_followers, impressions_90d)
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid,
  unique (day, platform)
);

-- Views dos últimos Reels, uma linha por reel por dia (pra ver a curva de crescimento de cada um)
create table public.reel_stats (
  id          uuid primary key default gen_random_uuid(),
  day         date not null,
  shortcode   text not null check (shortcode ~ '^[A-Za-z0-9_-]+$'),
  views       bigint check (views >= 0),
  thumbnail_url text,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid,
  unique (day, shortcode)
);
create index reel_stats_code_idx on public.reel_stats (shortcode, day);

do $$
declare t text;
begin
  foreach t in array array['social_stats','reel_stats'] loop
    execute format('create trigger trg_stamp before insert on public.%I for each row execute function app_private.stamp_origin()', t);
    execute format('create trigger trg_before_update before update on public.%I for each row execute function app_private.before_update()', t);
    execute format('create trigger trg_log after insert or update on public.%I for each row execute function app_private.log_change()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (app_private.can(''desempenho''))', t || '_sel', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (app_private.can(''desempenho''))', t || '_ins', t);
    execute format('create policy %I on public.%I for update to authenticated using (app_private.can(''desempenho'')) with check (app_private.can(''desempenho''))', t || '_upd', t);
  end loop;
end $$;
grant select, insert, update on public.social_stats, public.reel_stats to authenticated;
grant all on public.social_stats, public.reel_stats to service_role;
