-- Anderson OS · migration 0024 · Pedidos de vídeo motion (LP /motion)
-- Lead preenche na LP e envia por WhatsApp ou e-mail; a RPC guarda uma cópia pro painel.
-- Visitante anônimo não lê a tabela; só chama a RPC. Arquivos (logo, fotos) chegam pelo WhatsApp/e-mail.

create table public.motion_pedidos (
  id           uuid primary key default gen_random_uuid(),
  responsavel  text not null check (length(responsavel) between 2 and 120),
  whatsapp     text not null check (length(whatsapp) between 8 and 30),
  email        text check (email is null or length(email) <= 254),
  cidade       text check (length(cidade) <= 120),
  marca        text not null check (length(marca) between 1 and 120),
  produto      text check (length(produto) <= 200),
  segmento     text check (length(segmento) <= 120),
  objetivo     text check (length(objetivo) <= 120),
  oferta       text check (length(oferta) <= 1000),
  instagram    text check (length(instagram) <= 300),
  site         text check (length(site) <= 300),
  referencias  text check (length(referencias) <= 2000),
  observacoes  text check (length(observacoes) <= 2000),
  extras       text[] not null default '{}',
  canal        text check (canal in ('whatsapp','email')),
  aceite_termo boolean not null check (aceite_termo),
  status       text not null default 'novo' check (status in ('novo','contatado','pago','em_producao','alteracao_1','alteracao_2','entregue','cancelado')),
  version      int not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz,
  created_by_user uuid,
  created_by_integration uuid
);

create trigger trg_stamp before insert on public.motion_pedidos for each row execute function app_private.stamp_origin();
create trigger trg_before_update before update on public.motion_pedidos for each row execute function app_private.before_update();
alter table public.motion_pedidos enable row level security;
create policy motion_pedidos_sel on public.motion_pedidos for select to authenticated using (app_private.can('leads'));
create policy motion_pedidos_upd on public.motion_pedidos for update to authenticated using (app_private.can('leads')) with check (app_private.can('leads'));
grant select, update on public.motion_pedidos to authenticated;
grant all on public.motion_pedidos to service_role;

create or replace function public.submit_motion_pedido(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  if (p->>'aceite_termo')::boolean is not true then raise exception 'aceite_obrigatorio'; end if;
  insert into public.motion_pedidos (responsavel, whatsapp, email, cidade, marca, produto, segmento, objetivo,
    oferta, instagram, site, referencias, observacoes, extras, canal, aceite_termo)
  values (p->>'responsavel', p->>'whatsapp', nullif(p->>'email',''), p->>'cidade', p->>'marca',
    nullif(p->>'produto',''), p->>'segmento', p->>'objetivo', p->>'oferta', p->>'instagram', p->>'site', p->>'referencias',
    p->>'observacoes', coalesce(array(select jsonb_array_elements_text(p->'extras')), '{}'), p->>'canal', true)
  returning id into r;
  return r;
end $$;
revoke all on function public.submit_motion_pedido(jsonb) from public;
grant execute on function public.submit_motion_pedido(jsonb) to anon, authenticated;
