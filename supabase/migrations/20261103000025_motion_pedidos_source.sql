-- Anderson OS · migration 0025 · motion_pedidos precisa da coluna source (exigida pelo trigger stamp_origin)
alter table public.motion_pedidos add column if not exists source text not null default 'lp';
