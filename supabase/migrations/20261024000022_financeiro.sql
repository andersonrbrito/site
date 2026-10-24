-- Anderson OS · migration 0022 · Financeiro: assinaturas por cartão (roxo = pessoal, cinza = empresa)
create table public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  card        text not null check (card in ('roxo','cinza')),
  name        text not null check (length(trim(name)) > 0),
  site        text,                                   -- domínio para o ícone (ex.: canva.com)
  amount      numeric(12,2) not null check (amount >= 0),
  currency    text not null default 'BRL' check (currency in ('BRL','USD','EUR','EGP','TRY','GBP')),
  period      text not null default 'mensal' check (period in ('mensal','trimestral','semestral','anual')),
  billing_day int check (billing_day between 1 and 31),
  billing_month int check (billing_month between 1 and 12),   -- para anual/semestral/trimestral
  starts_on   date,                                   -- começa a cobrar a partir de
  note        text,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz,
  source      text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
create trigger trg_stamp before insert on public.subscriptions for each row execute function app_private.stamp_origin();
create trigger trg_before_update before update on public.subscriptions for each row execute function app_private.before_update();
create trigger trg_log after insert or update on public.subscriptions for each row execute function app_private.log_change();
alter table public.subscriptions enable row level security;
create policy subs_sel on public.subscriptions for select to authenticated using (app_private.can('financeiro'));
create policy subs_ins on public.subscriptions for insert to authenticated with check (app_private.can('financeiro'));
create policy subs_upd on public.subscriptions for update to authenticated using (app_private.can('financeiro')) with check (app_private.can('financeiro'));
grant select, insert, update on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;

insert into public.subscriptions (card, name, site, amount, currency, period, billing_day, billing_month, starts_on, note) values
  ('cinza','Sjinn','sjinn.ai',30,'USD','mensal',null,null,'2026-11-01',null),
  ('cinza','X Premium','x.com',28,'BRL','mensal',8,null,null,null),
  ('cinza','Adobe Creative Cloud','adobe.com',225,'BRL','mensal',null,null,null,null),
  ('cinza','CapCut Pro','capcut.com',65.90,'BRL','mensal',null,null,null,null),
  ('cinza','Meta Verified','meta.com',53.90,'BRL','mensal',null,null,null,null),
  ('cinza','ChatGPT Plus','openai.com',99.90,'BRL','mensal',null,null,null,null),
  ('cinza','Claude Max 2x','claude.ai',550,'BRL','mensal',null,null,'2026-11-01',null),
  ('cinza','Canva Pro','canva.com',1000,'EGP','anual',null,11,null,'anual, cobra todo novembro'),
  ('cinza','Google','google.com',170.80,'TRY','mensal',null,null,null,null),
  ('cinza','X API (PostadoR_)','developer.x.com',15,'USD','mensal',null,null,null,'pay-per-use: valor = teto de gasto mensal; o real varia com o uso'),
  ('roxo','Google','google.com',23.99,'BRL','mensal',null,null,null,null),
  ('roxo','Spotify Duo','spotify.com',31.90,'BRL','mensal',23,null,null,null);
