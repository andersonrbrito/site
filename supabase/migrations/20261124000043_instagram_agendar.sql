-- Anderson OS · migration 0043 · AprovaçõeS_: agendar direto no Instagram de cada perfil.
-- Cada conta do Instagram conectada fica ligada a um perfil (perfis.slug). No painel, "Agendar" põe a peça em
-- status 'agendado' com o horário; a função "meta" (cron a cada minuto) publica na conta do perfil e marca 'publicado'.
-- A mídia continua no Storage até a publicação (aprovar manualmente segue apagando, como antes).

alter table public.meta_accounts add column if not exists perfil text;  -- slug de perfis (null = conta principal)
grant select (perfil) on public.meta_accounts to authenticated;

alter table public.aprovacoes add column if not exists agendar_em timestamptz;   -- quando publicar no Instagram
alter table public.aprovacoes add column if not exists ig_container text;        -- id do contêiner na Meta (vídeo processando)
alter table public.aprovacoes add column if not exists ig_erro text check (length(ig_erro) <= 1000);
alter table public.aprovacoes drop constraint if exists aprovacoes_status_check;
alter table public.aprovacoes add constraint aprovacoes_status_check
  check (status in ('pendente','aprovado','ajustar','reprovado','publicado','agendado'));
create index if not exists aprovacoes_agendar on public.aprovacoes (agendar_em) where status = 'agendado';

-- Cron: publica as peças agendadas (a função meta faz no máximo algumas por minuto)
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then return; end if;
  execute $f$
    create or replace function app_private.call_meta(p_action text) returns void
    language plpgsql security definer set search_path = '' as $b$
    begin
      perform net.http_post(
        url := 'https://lotdkxouotewqyiztdcd.supabase.co/functions/v1/meta?action=' || p_action,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', public.postador_cron_key()),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000);
    end $b$;
  $f$;
  perform cron.unschedule(jobid) from cron.job where jobname = 'meta_publicar';
  perform cron.schedule('meta_publicar', '* * * * *', $c$select app_private.call_meta('publicar')$c$);
end $$;
