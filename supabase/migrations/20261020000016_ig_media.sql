-- Anderson OS · migration 0016 · posts do Instagram (legenda, capa, link) vindos da API, pra mostrar o nome do Reel em vez do código
create table public.ig_media (
  shortcode   text primary key,
  media_id    text not null,
  media_type  text,
  caption     text,
  permalink   text,
  thumbnail   text,
  posted_at   timestamptz,
  likes       int,
  comments    int,
  updated_at  timestamptz not null default now()
);
alter table public.ig_media enable row level security;
create policy ig_media_sel on public.ig_media for select to authenticated using (app_private.can('desempenho') or app_private.can('social'));
grant select on public.ig_media to authenticated;
grant all on public.ig_media to service_role;
