-- Anderson OS · migration 0012 · Radar 05h20 e Insights 05h40 (horário de SP = 08h20/08h40 UTC)
do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then return; end if;
  perform cron.unschedule(jobid) from cron.job where jobname in ('postador_radar', 'postador_insights');
  perform cron.schedule('postador_radar', '20 8 * * *', $c$select app_private.call_postador('radar')$c$);
  perform cron.schedule('postador_insights', '40 8 * * *', $c$select app_private.call_postador('insights')$c$);
end $$;
