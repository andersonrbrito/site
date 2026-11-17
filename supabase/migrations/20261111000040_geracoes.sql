-- Anderson OS · migration 0040 · GeradoR_ (nome provisório): pedidos de geração de vídeo, imagem e áudio com IA
-- A página grava o pedido (status 'fila'); o ajudante local do Mac executa (API, MCP ou Claude no Chrome),
-- salva o arquivo no banco de mídia e a página atualiza a linha (gerando > pronto/erro) com a sessão do Anderson.
-- Sem DELETE: tirar da galeria = archived_at. Nenhum segredo aqui: chaves de API ficam só no Mac.

create table if not exists public.geracoes (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('video','imagem','audio')),
  modo          text check (length(modo) <= 40),                      -- t2v, i2v, tts, sfx...
  modelo        text not null check (length(modelo) between 1 and 80), -- id do catálogo (js/gerador-data.js)
  modelo_nome   text check (length(modelo_nome) <= 120),
  provedor      text not null check (length(provedor) between 1 and 40),
  caminho       text not null check (caminho in ('api','mcp','chrome')),
  nome          text not null check (length(nome) between 1 and 80),
  prompt        text not null default '' check (length(prompt) <= 20000),
  opcoes        jsonb not null default '{}' check (jsonb_typeof(opcoes) = 'object'),
  anexos        jsonb not null default '[]' check (jsonb_typeof(anexos) = 'array'),
  status        text not null default 'fila' check (status in ('fila','gerando','pronto','erro','cancelado')),
  progresso     int not null default 0 check (progresso between 0 and 100),
  resultado     jsonb check (resultado is null or jsonb_typeof(resultado) = 'object'), -- { arquivos:[{url,nome,mime,caminho_local,largura,altura,duracao}], id_externo }
  tamanho_bytes bigint check (tamanho_bytes is null or tamanho_bytes >= 0),
  custo         jsonb,                                                -- { creditos, usd } quando o provedor informar
  erro          text check (length(erro) <= 1000),
  started_at    timestamptz,
  done_at       timestamptz,
  version       int not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  archived_at   timestamptz,
  source        text not null default 'painel',
  created_by_user uuid,
  created_by_integration uuid
);
create index if not exists geracoes_created_idx on public.geracoes (created_at desc) where archived_at is null;
create index if not exists geracoes_ativas_idx on public.geracoes (status) where status in ('fila','gerando');

create trigger trg_stamp before insert on public.geracoes for each row execute function app_private.stamp_origin();
create trigger trg_before_update before update on public.geracoes for each row execute function app_private.before_update();
create trigger trg_log after insert or update on public.geracoes for each row execute function app_private.log_change();
-- ponto no menu acende quando uma geração termina (pronta ou com erro)
create trigger trg_event after insert or update on public.geracoes for each row execute function app_private.emit_event('gerador', 'nome', 'pronto|erro');

alter table public.geracoes enable row level security;
create policy geracoes_sel on public.geracoes for select to authenticated using (app_private.can('gerador'));
create policy geracoes_ins on public.geracoes for insert to authenticated with check (app_private.can('gerador'));
create policy geracoes_upd on public.geracoes for update to authenticated using (app_private.can('gerador')) with check (app_private.can('gerador'));
grant select, insert, update on public.geracoes to authenticated;
grant all on public.geracoes to service_role;
