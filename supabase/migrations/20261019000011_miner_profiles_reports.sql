-- Anderson OS · migration 0011 · perfis do MineR_ com nome/foto e relatórios em texto (Insights e Desempenho)

alter table public.miner_profiles add column if not exists display_name text;
alter table public.miner_profiles add column if not exists photo text;   -- URL da foto ou imagem pequena colada (data URL, até ~200 KB)
alter table public.miner_profiles add constraint miner_profiles_photo_size check (photo is null or length(photo) <= 300000);

-- Relatório escrito pelo Claude depois de cada coleta: diagnóstico do perfil + sugestões de melhoria.
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('insights','desempenho')),
  body        text not null check (length(trim(body)) > 0),
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
create index reports_kind_idx on public.reports (kind, created_at desc);
create trigger trg_stamp before insert on public.reports for each row execute function app_private.stamp_origin();
create trigger trg_before_update before update on public.reports for each row execute function app_private.before_update();
create trigger trg_log after insert or update on public.reports for each row execute function app_private.log_change();
alter table public.reports enable row level security;
create policy reports_sel on public.reports for select to authenticated using (app_private.can('postador') or app_private.can('desempenho'));
create policy reports_ins on public.reports for insert to authenticated with check (app_private.can('postador') or app_private.can('desempenho'));
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;
