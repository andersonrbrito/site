-- PostadoR_: artigos extensos (X e LinkedIn) ficam em posts com kind 'artigo'.
-- Artigo nunca é agendado pelo robô: o botão do painel cria um pedido 'artigo_postar'
-- e o Claude publica pelo Chrome (x.com/compose/articles e linkedin.com/article/new).
alter table public.posts add column if not exists kind text not null default 'post';
alter table public.posts drop constraint if exists posts_kind_check;
alter table public.posts add constraint posts_kind_check check (kind in ('post','artigo'));
alter table public.posts add column if not exists article_id uuid references public.posts(id) on delete set null; -- rascunho que divulga um artigo
alter table public.posts drop constraint if exists posts_artigo_sem_agenda;
alter table public.posts add constraint posts_artigo_sem_agenda check (kind <> 'artigo' or status in ('pending','posted','rejected'));

alter table public.claude_requests drop constraint if exists claude_requests_kind_check;
alter table public.claude_requests add constraint claude_requests_kind_check check (kind in ('ig_insights','carrossel_video','carrossel_novo','carrossel_ajuste','artigo_postar'));
