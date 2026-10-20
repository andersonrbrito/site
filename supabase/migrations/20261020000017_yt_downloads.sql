-- Anderson OS · migration 0017 · histórico do "YouTube download" (o download roda no ajudante local do Mac)
create table public.yt_downloads (
  id          uuid primary key default gen_random_uuid(),
  url         text not null check (url ~* '^https://'),
  video_id    text,
  title       text,
  channel     text,
  thumbnail   text,
  kind        text not null check (kind in ('video','audio')),
  quality     text,
  status      text not null default 'baixando' check (status in ('baixando','feito','erro')),
  file_path   text,
  size_bytes  bigint,
  error       text,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
create trigger trg_stamp before insert on public.yt_downloads for each row execute function app_private.stamp_origin();
create trigger trg_before_update before update on public.yt_downloads for each row execute function app_private.before_update();
alter table public.yt_downloads enable row level security;
create policy yt_sel on public.yt_downloads for select to authenticated using (app_private.can('youtube'));
create policy yt_ins on public.yt_downloads for insert to authenticated with check (app_private.can('youtube'));
create policy yt_upd on public.yt_downloads for update to authenticated using (app_private.can('youtube')) with check (app_private.can('youtube'));
grant select, insert, update on public.yt_downloads to authenticated;
grant all on public.yt_downloads to service_role;
