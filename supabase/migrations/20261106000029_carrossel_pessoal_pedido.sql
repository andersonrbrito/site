-- Anderson OS · migration 0029 · CarrosseL_: tipo "pessoal" e pedido de carrossel vindo do PostadoR_
-- O botão "Enviar para o CarrosseL_" nos rascunhos de X e LinkedIn cria um claude_requests kind 'carrossel_novo'
-- (texto do rascunho no payload). A rotina de pedidos detecta se é notícia, educativo ou pessoal e cria o carrossel.

alter table public.carrosseis drop constraint if exists carrosseis_tipo_check;
alter table public.carrosseis add constraint carrosseis_tipo_check check (tipo in ('noticia','educativo','pessoal'));

alter table public.claude_requests drop constraint if exists claude_requests_kind_check;
alter table public.claude_requests add constraint claude_requests_kind_check check (kind in ('ig_insights','carrossel_video','carrossel_novo'));
