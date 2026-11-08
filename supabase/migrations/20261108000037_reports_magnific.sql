-- Créditos do Magnific na tela inicial: cada verificação vira um report kind 'magnific' (dados jsonb).
alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind in ('insights','desempenho','instagram','facebook','perfil','magnific'));
