-- Anderson OS · migration 0026 · Trampos: vaga descartada é apagada de vez (pedido do Anderson, 03/11/2026).
-- Exceção consciente à regra "sem DELETE": vaga descartada não precisa de histórico.
create policy jobs_del on public.jobs for delete to authenticated using (app_private.can('trampos'));
grant delete on public.jobs to authenticated;
delete from public.jobs where status = 'descartada';
