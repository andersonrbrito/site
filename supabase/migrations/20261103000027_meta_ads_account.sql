-- Anderson OS · migration 0027 · token de usuário da Meta para ler a conta de anúncios (ads_read)
alter table public.meta_accounts drop constraint if exists meta_accounts_kind_check;
alter table public.meta_accounts add constraint meta_accounts_kind_check check (kind in ('instagram','page','ads'));
