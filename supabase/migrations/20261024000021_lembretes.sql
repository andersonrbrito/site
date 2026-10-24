-- Anderson OS · migration 0021 · lembretes do Início (dumps/tbt do @ander.sbrito) marcados como feitos
create table public.reminder_done (
  key        text primary key,          -- ex.: dump-semana:2026-10-26
  done_at    timestamptz not null default now(),
  created_by_user uuid default auth.uid()
);
alter table public.reminder_done enable row level security;
create policy reminder_done_sel on public.reminder_done for select to authenticated using (app_private.can('agenda'));
create policy reminder_done_ins on public.reminder_done for insert to authenticated with check (app_private.can('agenda'));
grant select, insert on public.reminder_done to authenticated;
grant all on public.reminder_done to service_role;
