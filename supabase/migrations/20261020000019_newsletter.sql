-- Anderson OS · migration 0019 · Newsletter: e-mails captados nas páginas públicas (download de skills etc.)
-- Visitante anônimo NÃO lê nem insere direto na tabela: só chama a RPC subscribe_newsletter (valida e-mail + aceite).

create table public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' and length(email) <= 254),
  consent         boolean not null check (consent),
  source          text not null default 'site' check (length(source) <= 80),
  unsubscribed_at timestamptz,
  version         int not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz,
  created_by_user uuid,
  created_by_integration uuid
);

create trigger trg_before_update before update on public.newsletter_subscribers for each row execute function app_private.before_update();
alter table public.newsletter_subscribers enable row level security;
create policy newsletter_sel on public.newsletter_subscribers for select to authenticated using (app_private.can('prompts'));
create policy newsletter_upd on public.newsletter_subscribers for update to authenticated using (app_private.can('prompts')) with check (app_private.can('prompts'));
grant select, update on public.newsletter_subscribers to authenticated;
grant all on public.newsletter_subscribers to service_role;

create or replace function public.subscribe_newsletter(p_email text, p_consent boolean, p_source text default 'site')
returns boolean language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email));
begin
  if p_consent is not true then raise exception 'consent_required'; end if;
  if e !~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' or length(e) > 254 then raise exception 'invalid_email'; end if;
  insert into public.newsletter_subscribers (email, consent, source)
  values (e, true, left(coalesce(p_source, 'site'), 80))
  on conflict (email) do update set unsubscribed_at = null, updated_at = now();
  return true;
end $$;
revoke all on function public.subscribe_newsletter(text, boolean, text) from public;
grant execute on function public.subscribe_newsletter(text, boolean, text) to anon, authenticated;
