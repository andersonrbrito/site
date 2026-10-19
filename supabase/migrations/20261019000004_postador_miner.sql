-- Anderson OS · migration 0004 · Postador (X/LinkedIn) e MineR_ (garimpo de referências)
-- Segue as regras do painel: RLS por módulo, triggers de origem/versão/histórico, sem DELETE (arquivar).

-- ───────────────────────── Postador ─────────────────────────
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  network      text not null check (network in ('x','linkedin')),
  title        text not null default '',
  body         text not null default '',             -- thread no X: partes separadas por uma linha "---"
  notes        text not null default '',             -- observações do gerador (fonte, o que conferir, roteiro)
  media        jsonb not null default '[]',          -- [{path, mime, size, name}] no bucket postador-media
  image_urls   text[] not null default '{}',         -- imagens externas ainda não baixadas
  status       text not null default 'pending' check (status in ('pending','approved','posting','posted','failed','rejected')),
  scheduled_at timestamptz,
  posted_at    timestamptz,
  external_id  text,
  external_url text,
  error        text,
  is_viral_bet boolean not null default false,
  version      int not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz,
  source       text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid,
  check (status <> 'approved' or scheduled_at is not null)
);
create index posts_status_idx on public.posts (status, scheduled_at) where archived_at is null;

-- Radar: conversas e perfis "sigo de volta" de contas verificadas (cache da busca do X)
create table public.radar_items (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('talk','follow')),
  tweet_id    text not null,
  author      jsonb not null default '{}',
  text        text not null default '',
  metrics     jsonb not null default '{}',
  tweet_created_at timestamptz,
  done_at     timestamptz,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid,
  unique (kind, tweet_id)
);

-- Meta de monetização do X (números copiados do painel de Monetização) e fotos das métricas
create table public.x_goal_entries (
  id          uuid primary key default gen_random_uuid(),
  day         date not null unique,
  verified_followers int not null check (verified_followers >= 0),
  impressions_90d    int not null check (impressions_90d >= 0),
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);

create table public.x_snapshots (
  id          uuid primary key default gen_random_uuid(),
  taken_at    timestamptz not null default now(),
  followers   int,
  tweets      jsonb not null default '[]',            -- últimos posts com public_metrics
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);

-- Configuração do Postador (buscas do Radar, horários, limites). Uma linha por chave.
create table public.postador_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
insert into public.postador_settings (key, value) values
  ('x_daily_limit', '10'),
  ('x_slots', '["08:00","10:00","11:30","14:00","16:00","18:00","20:00","22:00"]'),
  ('linkedin_slots', '["13:30"]'),
  ('x_read_daily_limit', '40'),
  ('radar_talk_queries', '["(IA OR \"inteligência artificial\") (vídeo OR video OR edição OR Seedance OR Kling OR \"Nano Banana\" OR Veo OR Higgsfield) lang:pt -is:retweet -is:reply","(marketing OR infoproduto OR copy OR criativo OR VSL OR \"tráfego pago\") (vídeo OR video OR IA) lang:pt -is:retweet -is:reply"]'),
  ('radar_follow_queries', '["(\"sigo de volta\" OR \"sigo vcs\" OR \"sdv\" OR \"follow back\" OR \"conhecer criadores\" OR \"quero seguir\" OR \"bora se seguir\") (IA OR conteúdo OR criador OR criadores OR edição OR vídeo OR marketing OR design) lang:pt -is:retweet"]');

-- ───────────────────────── MineR_ ─────────────────────────
create table public.miner_links (
  id          uuid primary key default gen_random_uuid(),
  url         text not null unique check (url ~* '^https?://'),
  platform    text not null check (platform in ('instagram','x','tiktok','youtube','outro')),
  collection  text not null default 'andersonbrito.mp4',   -- perfil/coleção onde ele guardou
  author      text,                                         -- @ de quem postou, quando souber
  note        text not null default '',
  status      text not null default 'inbox' check (status in ('inbox','usado')),
  thumbnail_url text,
  saved_at    timestamptz not null default now(),
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
create index miner_links_status_idx on public.miner_links (status, saved_at desc) where archived_at is null;

create table public.miner_profiles (
  id          uuid primary key default gen_random_uuid(),
  url         text not null unique check (url ~* '^https?://'),
  platform    text not null check (platform in ('instagram','x','tiktok','youtube','outro')),
  handle      text not null,
  note        text not null default '',
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);

-- ───────────────────────── Triggers, RLS e permissões ─────────────────────────
do $$
declare t text;
begin
  foreach t in array array['posts','radar_items','x_goal_entries','x_snapshots','miner_links','miner_profiles'] loop
    execute format('create trigger trg_stamp before insert on public.%I for each row execute function app_private.stamp_origin()', t);
    execute format('create trigger trg_before_update before update on public.%I for each row execute function app_private.before_update()', t);
    execute format('create trigger trg_log after insert or update on public.%I for each row execute function app_private.log_change()', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
alter table public.postador_settings enable row level security;

create policy posts_sel on public.posts for select to authenticated using (app_private.can('postador'));
create policy posts_ins on public.posts for insert to authenticated with check (app_private.can('postador'));
create policy posts_upd on public.posts for update to authenticated using (app_private.can('postador')) with check (app_private.can('postador'));
create policy radar_sel on public.radar_items for select to authenticated using (app_private.can('postador'));
create policy radar_upd on public.radar_items for update to authenticated using (app_private.can('postador')) with check (app_private.can('postador'));
create policy goal_sel on public.x_goal_entries for select to authenticated using (app_private.can('postador'));
create policy goal_ins on public.x_goal_entries for insert to authenticated with check (app_private.can('postador'));
create policy goal_upd on public.x_goal_entries for update to authenticated using (app_private.can('postador')) with check (app_private.can('postador'));
create policy snap_sel on public.x_snapshots for select to authenticated using (app_private.can('postador'));
create policy pset_sel on public.postador_settings for select to authenticated using (app_private.can('postador'));
create policy pset_upd on public.postador_settings for update to authenticated using (app_private.is_owner()) with check (app_private.is_owner());

create policy miner_sel on public.miner_links for select to authenticated using (app_private.can('miner'));
create policy miner_ins on public.miner_links for insert to authenticated with check (app_private.can('miner'));
create policy miner_upd on public.miner_links for update to authenticated using (app_private.can('miner')) with check (app_private.can('miner'));
create policy minerp_sel on public.miner_profiles for select to authenticated using (app_private.can('miner'));
create policy minerp_ins on public.miner_profiles for insert to authenticated with check (app_private.can('miner'));
create policy minerp_upd on public.miner_profiles for update to authenticated using (app_private.can('miner')) with check (app_private.can('miner'));

grant select, insert, update on public.posts, public.x_goal_entries, public.miner_links, public.miner_profiles to authenticated;
grant select, update on public.radar_items to authenticated;
grant select on public.x_snapshots to authenticated;
grant select, update (value, updated_at) on public.postador_settings to authenticated;
grant all on public.posts, public.radar_items, public.x_goal_entries, public.x_snapshots, public.postador_settings, public.miner_links, public.miner_profiles to service_role;
