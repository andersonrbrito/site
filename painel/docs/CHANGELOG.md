# Changelog

## 2026-10-19 (noite) · Estúdio, Portfólios e ajustes
- Estúdio no PostadoR_: escolhe um post (rascunho, publicado ou dos mais vistos do X) e gera card PNG 4:5 e Reel em vídeo 9:16 (MP4 no Chrome) no visual MineR_, direto no navegador; "Pedir vídeo com IA" vira pedido de roteiro com prompts.
- Menu Portfólios (página própria com filtros no ar/offline e data).
- Botões "Buscar agora" (Radar) e "Atualizar agora" (Insights) chamando a Edge Function com a sessão do dono.
- Curvas suaves nos gráficos; views por dia no Insights em curva (como no Otto).
- Teto de gasto do X em US$15 e limite de leituras em 50/dia.

## 2026-10-19 (tarde) · PostadoR_, Insights estilo Otto, Desempenho e Início novo
- PostadoR_ com cara de painel próprio: abas grandes com ícone (Rascunhos, Histórico, Radar, Insights, Pedir posts); post abre na hora sem recarregar; "novo post" só salva quando tem texto/mídia.
- Pedir posts (tabela post_requests, migration 0009): o Claude atende de hora em hora (8h às 22h) e na rotina das 7h.
- Alertas de queda (seguidores verificados/impressões) na meta.
- Insights no formato do Otto: cartões das contas, engajamento em donut com meta de 2%, mapa anual de views, views por dia (30 dias) com picos, desempenho por tipo de conteúdo, melhores posts com "Recriar", coleta dos posts. Base: x_posts (migration 0010), carga de 1 ano feita (190 posts).
- Desempenho (social_stats/reel_stats, migration 0008): gráficos de X e Instagram e últimos 12 Reels. Coleta diária pela rotina das 7h via Chrome.
- Início: saudação com apelido do dia (Caveat), clima de Osasco (Open-Meteo) com tema do tempo, atualização do dia, atalhos (consoles, Google Admin, biblioteca de anúncios e agendador da Meta), portfólios do site com status (gerado por dev/gen-portfolios.py), ícones das redes no topo e IAs favoritas na barra.

## 2026-10-19 · Foco em Postador, MineR_ e Agenda
- Identidade visual MineR_ (preto #050706, laranja #FF4F32, Geist/Geist Mono, grade técnica, logo ANDERSON_OS).
- Menu reduzido a Início, Postador, MineR_ e Agenda (+ Configurações). Tarefas, Projetos, Inbox, Hoje e Histórico ficam desativados em `modules.js` (tabelas preservadas, nada apagado).
- Início novo: meta de monetização do X, fila do Postador, aposta viral do dia, Radar, últimos garimpos e agenda.
- Postador (`views/postador.js`): fila com editor (salvamento automático com versão, contador estilo X, thread com `---`, mídia por botão/arrastar/colar no Storage privado), Calendário, Radar (conversas e "sigo de volta", só verificados) e Insights com meta.
- MineR_ (`views/miner.js`): garimpo de links com coleções, inbox/usado, perfis de referência; dados importados do export do ChatGPT.
- Agenda (`views/agenda.js`): embed do Google Agenda com as 3 contas (contato@, DOTI, theilmar) + feriados.
- Migrations 0004 (tabelas Postador/MineR_ com RLS) e 0005 (bucket postador-media). Testes de RLS novos (31 no total).
- Barra do topo: ações rápidas (+ Post no X, + LinkedIn, + Garimpar) no lugar da captura de tarefas.

## 0.3.0
- Painel migrado para o repositório do site (`painel/`), páginas estáticas em JavaScript puro, sem servidor; mesmo domínio.
- Mantidos: schema/RLS/histórico (migrations), design no padrão do site, paleta de comandos, Kanban com arrastar e soltar, desfazer, linha do tempo.
- Teste local com Supabase falso; testes de banco e unitários em `painel/dev`.
- Correção: formulários liam o FormData depois de desabilitar os campos.

## 2026-10-19 (tarde)
- Postar agora publica na hora pela Edge Function (`action=publish`), sem caixa de confirmação.
- Agenda de horários estilo reserva no editor: dia, horas de 02h a 23h, ocupadas riscadas, sugeridas em destaque, hora manual e contador N/10 por dia.
- Cabeçalho mais alto, ícones maiores e botão "Meu site".
- Financeiro (em construção) no menu lateral; portfólios saíram do Início (ficam só em Portfólios).
- MineR_: perfis com link, nome, @ e foto (automática pelo @ ou colada); saiu a lista "Todos os perfis".
- Resumo do Claude no topo de Insights e Desempenho (tabela `reports`, migration 0011). Cron do Radar e Insights às 5h20/5h40 (0012).
- Insights do X saiu do PostadoR_ e foi pra página Desempenho. Botão "Atualizar insights do Instagram" (pedido em `claude_requests`, a rotina de hora em hora lê o Instagram e grava um resumo em `reports` kind instagram).
- Novos módulos: Prompts (links e prompts próprios) e Meu setup (equipamentos e sugestões de upgrade). Migration 0013.
- Menu lateral: "PostadoR_".
- Social (Instagram + Página do Facebook): caixa de entrada de comentários, DMs e leads, resposta pelo painel, respostas automáticas por palavra-chave e conexão das contas por login da Meta. Edge Function `meta` (webhook + OAuth), migration 0014, página /privacidade.

## 2026-10-20
- PostadoR_: agenda mostra só os posts do dia escolhido, por faixa de hora (11:05 marca 11:00, com o horário exato embaixo). Radar com post embutido do X, botão "Abrir post" e "Remover". Recusados arquivados toda segunda (migration 0015).
- Desempenho: "Relatório diário do X" e "Relatório diário do Instagram"; códigos de Reel no texto viram link.
- Desempenho em abas (X | Instagram); Reels com capa e nome tirado da legenda (tabela ig_media, migration 0016, preenchida pela função meta).
- YouTube download: página no painel + ajudante local no Mac (tools/yt-helper, LaunchAgent), histórico em yt_downloads (migration 0017).
- Rotinas do Claude sem navegador: porta ?action=agente na função meta (chave de integração, escrita via agent_write, migration 0018) + tools/agente.py; Instagram (insights e views dos Reels) pela API. Só a página de monetização do X continua no Chrome.
- Início: meta semanal (+1000 seguidores no @andersonbrito.mp4, até sexta) e quadro da estratégia dos perfis. Rotinas podem gravar no MineR_ e 15 perfis de referência (migration 0019). Rotina diária de garimpo (6h).
- Início refeito: cursos e atalhos no topo; metas lado a lado (Instagram com seguidores + meta semanal | X); fila do PostadoR_ logo abaixo; 'Pra replicar hoje' do garimpo; coluna lateral com próximos compromissos (agenda_cache), calendário e histórico do PostadoR_. MineR_: perfis com seguidores, bloco Pra replicar, ideia/destino/formato nos cards, fonte no padrão do Instagram. Fontes +1px em todo o painel. Curso Brainstorm Academy. Migration 0020.
