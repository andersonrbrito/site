-- Anderson OS · migration 0006 · barra de favoritos (sites agrupados por tipo)
create table public.favorites (
  id          uuid primary key default gen_random_uuid(),
  grp         text not null default 'Geral' check (length(trim(grp)) > 0),
  name        text not null check (length(trim(name)) > 0),
  url         text not null check (url ~* '^https?://'),
  position    int not null default 0,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
create trigger trg_stamp before insert on public.favorites for each row execute function app_private.stamp_origin();
create trigger trg_before_update before update on public.favorites for each row execute function app_private.before_update();
create trigger trg_log after insert or update on public.favorites for each row execute function app_private.log_change();
alter table public.favorites enable row level security;
create policy fav_sel on public.favorites for select to authenticated using (app_private.can('favoritos'));
create policy fav_ins on public.favorites for insert to authenticated with check (app_private.can('favoritos'));
create policy fav_upd on public.favorites for update to authenticated using (app_private.can('favoritos')) with check (app_private.can('favoritos'));
grant select, insert, update on public.favorites to authenticated;
grant all on public.favorites to service_role;

insert into public.favorites (grp, name, url, position) values
  ('Cursos', 'Leo Baltazar', 'https://leobaltazar.com/', 1),
  ('Cursos', 'Curso Kiwify', 'https://members.kiwify.com/?club=e5ca4402-8ae3-4b24-822d-47317e40caca', 2),
  ('Cursos', 'WooB', 'https://members.kiwify.com/?club=5269a082-376a-4457-ad30-f21952192ac2', 3),
  ('Cursos', 'Reels Virais com IA', 'https://congruous-vacation-cd5.notion.site/Reels-Virais-com-IA-256813c1576f80f59829d2cd677547e8', 4);
