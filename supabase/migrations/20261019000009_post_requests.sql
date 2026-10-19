-- Anderson OS · migration 0009 · pedidos de posts ("nova conversa" do Postador)
-- O Anderson escreve um assunto no painel; a rotina do Claude lê os pedidos abertos e gera os rascunhos.
create table public.post_requests (
  id          uuid primary key default gen_random_uuid(),
  topic       text not null check (length(trim(topic)) > 0),
  networks    text not null default 'x' check (networks in ('x','linkedin','ambos')),
  quantity    int not null default 3 check (quantity between 1 and 10),
  status      text not null default 'aberto' check (status in ('aberto','gerando','feito','cancelado')),
  result_note text,
  done_at     timestamptz,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
create trigger trg_stamp before insert on public.post_requests for each row execute function app_private.stamp_origin();
create trigger trg_before_update before update on public.post_requests for each row execute function app_private.before_update();
create trigger trg_log after insert or update on public.post_requests for each row execute function app_private.log_change();
alter table public.post_requests enable row level security;
create policy preq_sel on public.post_requests for select to authenticated using (app_private.can('postador'));
create policy preq_ins on public.post_requests for insert to authenticated with check (app_private.can('postador'));
create policy preq_upd on public.post_requests for update to authenticated using (app_private.can('postador')) with check (app_private.can('postador'));
grant select, insert, update on public.post_requests to authenticated;
grant all on public.post_requests to service_role;
