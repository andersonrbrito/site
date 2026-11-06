# Status (atualize ao concluir qualquer item)

## Em produção no Supabase (projeto anderson-os, Ohio) · 2026-10-19
- Migrations 0001 a 0004 aplicadas; dono = contato@andersonbrito.com; login Google funcionando (testado pelo Anderson).
- MineR_ importado (2 links, 4 perfis).
- Migration 0005 (bucket privado postador-media) aplicada.
- Edge Function `postador` no ar (código em `supabase/functions/postador`, JWT legado desligado, autenticação própria: x-cron-key do Vault ou sessão do dono). Secrets do X configurados pelo Anderson. Testado: tick (200) e insights (594 seguidores, 10 posts).
- Migration 0007: pg_cron a cada minuto (tick), 07h20 Radar, 07h40 Insights (horário de SP).
- Rotina das 7h (Claude) entrega rascunhos direto na tabela posts usando a sessão do Anderson no Chrome.
- **Falta:** LinkedIn na nuvem (app + token nos secrets); botões manuais de Radar/Insights no painel; desligar "Allow new users to sign up".

## Testado
- **Banco** (`painel/dev`, `npm test`, Postgres embutido): migrations aplicam do zero; cadastro público bloqueado; RLS (anon sem acesso, membro sem módulo sem acesso, sem DELETE, histórico imutável); origem/autor carimbados pelo banco; versão, `completed_at`, arquivamento; histórico com valores antigos/novos; RPCs de agente (idempotência, conflito, 404, revogada, rate limit, valores inválidos); busca respeita RLS; token Google ilegível por usuário.
- **Interface** (`painel/dev/harness.html`, Supabase **falso** em memória, no navegador): as 13 rotas renderizam; concluir com Desfazer; captura rápida; criar tarefa/projeto/compromisso; validação preserva campos; edição; conflito de versão; Kanban arrastar e soltar; paleta de comandos; texto com HTML não executa (sem XSS).
- Validações e datas (fuso de SP) com testes unitários.

## Implementado, mas NÃO testado contra serviços reais
- Login com Google, sessão, checagem de membro e todas as telas com o **Supabase de verdade** (não existe projeto ainda).
- Celular físico (só emulação de largura).

## Carrosséis diários (2026-11-05)
- Feito e testado no harness: tela Carrosséis com lista por dia, prévia em canvas estilo print de tweet (foto, nome, selo, @), edição de texto/rodapé/mídia/recorte/ordem das lâminas com salvamento por versão, download PNG (imagem) e MP4 gravado no Chrome (lâmina com vídeo), botão "Transformar em vídeo" (pedido em `claude_requests` kind `carrossel_video`).
- Primeiro carrossel: `painel/carrosseis/claude-financas-pessoais/` (lido do repositório via `diarios.json` até existir a tabela).
- **Pendente:** rodar `supabase/migrations/20261105000028_carrosseis.sql` no SQL Editor (tabela `carrosseis`, `payload` e novo kind em `claude_requests`, `agent_write` aceitando `carrosseis`). Sem ela a tela fica só leitura.
- Rotina diária `carrosseis-diarios-ilmarlabs` (6h45) e rotina `carrosseis-pedidos` (a cada 2 h das 7h às 23h, segue `carrosseis/ROTINA-PEDIDOS.md`: carrossel vindo do PostadoR_ e "Transformar em vídeo") agendadas.

## CarrosseL_ (2026-11-06)
- Nome e ícone novos; menu lateral maior com o padrão "letra final maiúscula + _".
- "Enviar para o CarrosseL_" no editor de rascunho do PostadoR_ (X e LinkedIn) e painel "Pedidos do PostadoR_": testado no harness. Precisa da migration 0029 (`carrossel_novo` e tipo `pessoal`).
- "Enviar pro iPhone": testado no harness com o compartilhar simulado (6 JPG + 1 MP4). No aparelho, a gravação da lâmina com vídeo leva o tempo do vídeo e o iPhone pode gravar sem som.

## Ecossistema (2026-11-06)
- Feito e testado no harness: Map MentaleS_, AgenteS_, PerfiS_, Sticky NoteS_, ponto de notificação no menu e blocos novos no PaineL_. Testes de banco da migration 0030 passando (35).
- **Pendente:** rodar `supabase/migrations/20261106000030_anderson_os_ecossistema.sql` no SQL Editor; carregar matriz e mapa (`ANDY 1TB/anderson_Os/07_automacoes/seed/carregar.py`); criar as rotinas `agentes-sync-painel`, `pautas-diarias-perfis` e `backup-semanal-drive` (prompts em `07_automacoes/rotinas/`). Sem a sincronização o AgenteS_ mostra "nunca".

## Pendente de configuração (depende de você)
1. Projeto Supabase; preencher `painel/js/config.js` (URL e chave publishable).
2. Aplicar `supabase/migrations/*.sql` na ordem; rodar `supabase/seed-owner.example.sql` com seu e-mail Google.
3. Google Cloud: cliente OAuth Web; ativar provedor Google no Supabase; desativar "Allow new users to sign up". Redirects: `https://andersonbrito.com/painel/` (e `http://localhost:8080/painel/` para testes).
4. `git push` (publica sozinho).
5. Backup (ver `DATABASE.md#backup`).

## Planejado
- Edge Functions: API REST + MCP para agentes, criação de chaves, conexão Google (ver `INTEGRATIONS.md`). **Bloqueado até existir o projeto Supabase.**
- Financeiro, Clientes (a tabela `clients` já existe), Casa/Mudança, Carro, Viagens, Ideias de conteúdo, links/arquivos por projeto, Google Calendar/Drive, Storage privado, convite de acesso parcial (modelo pronto em `app_members.modules`, falta tela), gráficos adicionais.

## Limitações conhecidas
- As páginas e o JS são públicos (repositório público). A proteção é o login + RLS; não há como esconder a "casca" no GitHub Pages.
- MCP em claude.ai/ChatGPT pode exigir OAuth (não verificado).
- `spLocalToISO` assume UTC-3 fixo (sem horário de verão desde 2019).
- Roteamento por hash (`#/`), exigência do GitHub Pages.
