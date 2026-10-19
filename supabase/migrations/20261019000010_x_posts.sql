-- Anderson OS · migration 0010 · histórico de posts do X com métricas (base do Insights)
-- Escrito só pela Edge Function "postador" (service_role); o painel só lê.
create table public.x_posts (
  id          text primary key,                      -- id do post no X
  created_at  timestamptz not null,
  text        text not null default '',
  kind        text not null default 'texto' check (kind in ('texto','imagem','video','thread','artigo')),
  impressions bigint not null default 0,
  likes       int not null default 0,
  replies     int not null default 0,
  reposts     int not null default 0,
  quotes      int not null default 0,
  bookmarks   int not null default 0,
  updated_at  timestamptz not null default now()
);
create index x_posts_created_idx on public.x_posts (created_at desc);
alter table public.x_posts enable row level security;
create policy xposts_sel on public.x_posts for select to authenticated using (app_private.can('postador'));
grant select on public.x_posts to authenticated;
grant all on public.x_posts to service_role;
