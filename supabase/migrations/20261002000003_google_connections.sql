-- Conexão Google (Calendar/Gmail). O refresh token fica CRIPTOGRAFADO (AES-256-GCM no servidor)
-- e a coluna não é legível por usuários autenticados, somente por service_role.
create table public.google_connections (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  google_email      text not null,
  scopes            text[] not null default '{}',
  refresh_token_enc text not null,
  connected_at      timestamptz not null default now()
);
alter table public.google_connections enable row level security;
create policy google_conn_self on public.google_connections for select to authenticated
  using (user_id = auth.uid() and app_private.is_owner());
revoke all on public.google_connections from anon, authenticated;
grant select (user_id, google_email, scopes, connected_at) on public.google_connections to authenticated;
grant all on public.google_connections to service_role;
