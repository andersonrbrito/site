-- Anderson OS · migration 0015 · posts recusados saem da lista uma vez por semana (arquivados, sem DELETE)
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then return; end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'posts_rejected_weekly';
  -- toda segunda 06:00 UTC (03:00 SP): arquiva recusados há mais de 7 dias
  perform cron.schedule('posts_rejected_weekly', '0 6 * * 1',
    $c$update public.posts set archived_at = now() where status = 'rejected' and archived_at is null and updated_at < now() - interval '7 days'$c$);
end $$;
