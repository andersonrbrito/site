-- Anderson OS · migration 0024 · Pedidos de vídeo motion (LP /motion)
-- O cliente só preenche depois de falar no WhatsApp: a RPC exige o código de liberação passado lá.
-- Visitante anônimo não lê a tabela; só envia arquivos para motion-pedidos/<uuid>/ e chama a RPC.

create table public.motion_pedidos (
  id           uuid primary key default gen_random_uuid(),
  upload_id    uuid not null unique,
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
  arquivos     jsonb not null default '[]',
  aceite_termo boolean not null check (aceite_termo),
  status       text not null default 'novo' check (status in ('novo','em_producao','alteracao_1','alteracao_2','entregue','cancelado')),
  version      int not null default 1,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  archived_at  timestamptz,
  created_by_user uuid,
  created_by_integration uuid
);

create trigger trg_before_update before update on public.motion_pedidos for each row execute function app_private.before_update();
alter table public.motion_pedidos enable row level security;
create policy motion_pedidos_sel on public.motion_pedidos for select to authenticated using (app_private.can('prompts'));
create policy motion_pedidos_upd on public.motion_pedidos for update to authenticated using (app_private.can('prompts')) with check (app_private.can('prompts'));
grant select, update on public.motion_pedidos to authenticated;
grant all on public.motion_pedidos to service_role;

create or replace function public.submit_motion_pedido(p_codigo text, p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  if upper(trim(coalesce(p_codigo,''))) <> 'ILMAR150' then raise exception 'codigo_invalido'; end if;
  if (p->>'aceite_termo')::boolean is not true then raise exception 'aceite_obrigatorio'; end if;
  insert into public.motion_pedidos (upload_id, responsavel, whatsapp, email, cidade, marca, produto, segmento, objetivo,
    oferta, instagram, site, referencias, observacoes, extras, arquivos, aceite_termo)
  values ((p->>'upload_id')::uuid, p->>'responsavel', p->>'whatsapp', nullif(p->>'email',''), p->>'cidade', p->>'marca',
    nullif(p->>'produto',''), p->>'segmento', p->>'objetivo', p->>'oferta', p->>'instagram', p->>'site', p->>'referencias',
    p->>'observacoes', coalesce(array(select jsonb_array_elements_text(p->'extras')), '{}'), coalesce(p->'arquivos','[]'), true)
  returning id into r;
  return r;
end $$;
revoke all on function public.submit_motion_pedido(text, jsonb) from public;
grant execute on function public.submit_motion_pedido(text, jsonb) to anon, authenticated;

do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('motion-pedidos', 'motion-pedidos', false, 15728640,
            array['image/jpeg','image/png','image/webp','image/svg+xml','application/pdf'])
    on conflict (id) do nothing;
    execute $p$create policy motion_pedidos_anon_ins on storage.objects for insert to anon, authenticated
      with check (bucket_id = 'motion-pedidos')$p$;
    execute $p$create policy motion_pedidos_sel_obj on storage.objects for select to authenticated
      using (bucket_id = 'motion-pedidos' and app_private.can('prompts'))$p$;
  end if;
end $$;
