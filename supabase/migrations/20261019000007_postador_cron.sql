-- Anderson OS · migration 0007 · agendamento da Edge Function "postador"
-- O segredo do cron é gerado no Vault e nunca sai do banco: o cron manda no cabeçalho x-cron-key
-- e a função confere chamando postador_cron_key() (só service_role executa).
-- Só roda no Supabase (onde existem vault, pg_cron e pg_net).
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron')
     or not exists (select 1 from information_schema.schemata where schema_name = 'vault') then
    raise notice 'sem pg_cron/vault: agendamento ignorado (ambiente de teste)';
    return;
  end if;

  create extension if not exists pg_cron;
  create extension if not exists pg_net;

  if not exists (select 1 from vault.secrets where name = 'postador_cron_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'postador_cron_key', 'chave do cron do postador');
  end if;

  execute $f$
    create or replace function public.postador_cron_key() returns text
    language sql stable security definer set search_path = '' as $b$
      select decrypted_secret from vault.decrypted_secrets where name = 'postador_cron_key' limit 1
    $b$;
  $f$;
  execute 'revoke all on function public.postador_cron_key() from public, anon, authenticated';
  execute 'grant execute on function public.postador_cron_key() to service_role';

  execute $f$
    create or replace function app_private.call_postador(p_action text) returns void
    language plpgsql security definer set search_path = '' as $b$
    begin
      perform net.http_post(
        url := 'https://avyzkygunshncwwbmzll.supabase.co/functions/v1/postador?action=' || p_action,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', public.postador_cron_key()),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000);
    end $b$;
  $f$;

  -- A cada minuto: publica o que está vencido. 07:20 (SP) Radar. 07:40 (SP) Insights. (cron em UTC)
  perform cron.unschedule(jobid) from cron.job where jobname in ('postador_tick', 'postador_radar', 'postador_insights');
  perform cron.schedule('postador_tick', '* * * * *', $c$select app_private.call_postador('tick')$c$);
  perform cron.schedule('postador_radar', '20 10 * * *', $c$select app_private.call_postador('radar')$c$);
  perform cron.schedule('postador_insights', '40 10 * * *', $c$select app_private.call_postador('insights')$c$);
end $$;
