# Changelog

## 2026-11-09 (noite) · CarrosseL_: cor por tipo
- Destaque das lâminas muda com o tipo do carrossel: notícia avermelhada (#FF3B47), educativo azulado (#3D8BFF), pessoal no verde Matrix (#41FF8A). Vale para negrito, marca-texto da lâmina 1, selo, anel do avatar, brilhos e grade do fundo, ponto do chip, botão de play e rodapé. Cores das pílulas de `assets/ab.css`.
- Topo sem o chip do tipo (Notícia/Educativo/Pessoal): fica só o contador "01 / 07", agora em Arial.

## 2026-11-10 · PortfólioS_: só os portfólios de verdade
- `painel/dev/gen-portfolios.py` passou a usar uma lista fixa com os 9 portfólios indicados pelo Anderson (lunar, trabalhos, portfolio.html, dr.html, comp, xablau, condzxyz, videos-ia, brasilparalelo) em vez de varrer todas as páginas do site; `js/portfolios.js` regenerado.

## 2026-11-09 · CarrosseL_: lâminas com a estética do site
- `js/carrossel-render.js` redesenhado com os tokens de `assets/ab.css`: fundo #0B0C0E com grade de pontos verdes (22 px) e brilhos verdes nos cantos, cartão de vidro (rgba(24,27,28,.74), borda fina, cantos grandes), texto #F2F2F7 e apoio #A1A6AA, SF Pro/Inter nos textos e JetBrains Mono nos rótulos (maiúsculas, espaçamento .09em). Fim do visual de print de tweet branco.
- Topo com chip do tipo (Notícia, Educativo, Pessoal) e contador "01 / 07"; avatar com anel verde, selo verde com check escuro, @ em mono; **negrito** em verde Matrix (na lâmina 1, marca-texto verde com tinta #03200F); crédito da mídia numa pílula escura; rodapé ("arrasta pro lado →", CTAs, "comenta aqui embaixo ↓") numa pílula de contorno verde; botão de play verde nas lâminas com vídeo. Mesmas safe zones e mesmo formato 1080×1350.
- `draw()` e `recordVideoSlide()` aceitam `info = { total, tipo }` (opcional); a view passa o tipo e o total. Prévias com fundo escuro em `css/painel.css`.
- `dev/laminas.html`: prévia local das lâminas de carrosséis do repositório (grade ou lâmina única em 1080×1350), para conferir o visual sem banco.
- Rotinas `carrosseis-diarios-ilmarlabs` e `carrosseis/ROTINA-PEDIDOS.md` atualizadas: visual novo, negrito econômico e imagens geradas no clima cinema × IA com código verde quando fizer sentido.

## 2026-11-09 · v3.0: identidade do site no painel
- Visual igual ao de andersonbrito.com: UI escura do Premiere, verde Matrix (#41FF8A) no lugar do laranja, vidro, cantos grandes e botões em pílula estilo iOS; fontes do sistema/Inter + JetBrains Mono. Sem as áreas fixas do site (faixa e coluna da esquerda). Bloco "v3" no fim de `css/painel.css`.
- Chuva de código Matrix (`js/matrix.js`) só no dia em que a meta de +1.000 seguidores da semana é batida: a home detecta a meta batida hoje e liga a chuva até 23:59 (Brasília) em todas as telas do painel naquele aparelho.

## 2026-11-09 · LeadS_: aba Pesquisas
- Base de prospecção (`prospects`) com 118 contatos iniciais, script por segmento, botões Direct (copia e abre), WhatsApp Business (texto pronto), e-mail, status e "Pedir nova pesquisa". Migration 0039.

## 2026-11-07 · CarrosseL_: aprovar e botões organizados; UX no celular
- CarrosseL_ (editor): barra de decisão com o status atual e só os botões que valem para ele (Aprovar/Descartar no rascunho, Marcar como postado/Voltar no aprovado), com Desfazer. Ações agrupadas em "Postar" (Enviar pro iPhone, Copiar legenda, Baixar lâminas) e "Criar" (Transformar em vídeo); ferramentas da lâmina agrupadas em "Esta lâmina". O seletor de status solto saiu.
- CarrosseL_ (lista): filtros por status com contagem (A aprovar, Aprovados, Postados, Descartados) além dos filtros por tipo.
- Celular: filtros do AprovaçõeS_ e do CarrosseL_ numa linha só com rolagem lateral; fim do vão vazio no meio do card de aprovação (também no desktop); botões com 40 px de altura; texto explicativo do AprovaçõeS_ escondido no celular; menu de baixo com rótulos menores; PaineL_ sem rolagem lateral (grade e títulos que estouravam a largura).

## 2026-11-07 · Legenda no iPhone
- `copiarTexto` (js/ui.js): o campo temporário deixou de ser readonly e a seleção usa Range explícito (o Safari do iOS não seleciona campo readonly, e a cópia falhava em silêncio).
- AprovaçõeS_: botão "Legenda pro iPhone" (onde o navegador tem compartilhar, ex.: Safari do Mac e do iPhone) manda só o texto da legenda por AirDrop/Mensagens/Notas, para quando a área de transferência do Mac não passa para o iPhone.

## 2026-11-07 · AprovaçõeS_: botão Baixar
- Todo card tem "Baixar" (ou "Baixar (n)"), em qualquer aba: baixa no Mac o arquivo principal, os extras (vídeo B, thumbs, lâminas) e a capa. Usa `download=` na URL assinada para o Supabase entregar como anexo. Substitui o "Baixar" que só existia na aba Aprovados.

## 2026-11-06 (noite) · Relatório diário por perfil e arquivar pendente
- Migration 0036: o agente pode arquivar uma peça PRÓPRIA ainda pendente em AprovaçõeS_ (`update aprovacoes {"arquivar":true}`), útil para juntar versões B/C no card da A. Também cria `reports.kind = 'perfil'` com as colunas `perfil` e `dados` (jsonb: seguidores, delta_dia, semana_delta, meta_semana).
- PerfiS_: cada perfil novo mostra "Meta da semana" (+N / 100 seguidores) com barra e abre o relatório do dia (avaliação e recomendações), navegando pelos últimos 14 dias. O @andersonbrito.mp4 não entra na rotina.
- Teste novo de relatório por perfil (39 passando).

## 2026-11-06 (noite) · AprovaçõeS_: galeria do carrossel e copiar confiável
- Carrossel em galeria: todas as lâminas lado a lado (deslizar), contador "n/total", setas, miniaturas clicáveis e tela cheia ao tocar (setas do teclado e botão fechar). Imagem única também abre em tela cheia.
- Copiar confiável em todo o painel (`copiarTexto` em `js/ui.js`): copia dentro do toque usando os dois caminhos (execCommand síncrono + Clipboard API) e, se o navegador bloquear os dois, abre uma janela com o texto já selecionado para copiar na mão. O aviso mostra quantos caracteres foram copiados. Aplicado em AprovaçõeS_, CarrosseL_, StúdiO_, Prompts, InfluencerS_ e PostadoR_ (Afiliações fica para depois: tem alteração em andamento de outra sessão).
- "Enviar pro iPhone" (AprovaçõeS_, CarrosseL_, StúdiO_): a legenda agora é copiada no primeiro toque, antes de baixar os arquivos (o Safari bloqueava a cópia feita depois da espera).
- E-books (PDF) em AprovaçõeS_: quando `arquivo` é .pdf, mostra a `capa` grande com selo "E-BOOK · PDF" e botões "Abrir PDF" e "Baixar PDF"; o "Enviar pro iPhone" manda o próprio PDF (application/pdf). Chip do tipo aparece como "e-book".
- Harness: itens de teste de carrossel e de e-book em `dev/mock-supabase.js`.

## 2026-11-06 (noite) · v2.2: AprovaçõeS_
- Nova página AprovaçõeS_: conteúdo dos agentes com prévia (vídeo/imagem do Storage privado), legenda com copiar, e Aprovar / Pedir ajuste (comentário que o agente lê) / Reprovar / Marcar publicado. Ponto no menu e bloco "Para aprovar" no PaineL_.
- Agentes enviam com `tools/agente.py enviar <perfil> <arquivo> '<json>'` (URL assinada de upload pela função meta, só em aprovacoes/).
- Migration 0033: tabela aprovacoes (agente sempre entra como pendente; reenvio volta para pendente e acende o ponto).

## 2026-11-06 (tarde) · v2.1: aero glass, NoteS_, StúdiO_, ProdutoS_, e-mails, busca
- Visual aero glass em todo o painel (vidro fosco, cantos suaves, luz difusa) e letras de descrição maiores.
- Barra superior: versão do painel ao lado do logo, data maior, botão verde do WhatsApp Business e busca ao vivo (páginas, perfis, notas, produtos, carrosséis, posts, garimpo e pautas). Ctrl K e / focam a busca. Supabase nos botões de ferramentas.
- NoteS_ (antes Sticky NoteS_): notas estilo Keep em texto livre ou lista com check, e stickies. No PaineL_, a lateral tem o botão + Sticky e os stickies presos.
- StúdiO_: carrosséis que viraram vídeo (o Estúdio saiu do PostadoR_).
- ProdutoS_: PDFs no Storage privado, preço, status e botão da Kiwify.
- CursoS_: mostra os cursos dos favoritos (os mesmos do PaineL_) + resumos.
- PaineL_: bloco de e-mails importantes (rotina lê o Gmail a cada 2 h).
- PerfiS_: cartões com foto, ícone da rede clicável e seguidores do dia.
- DesempenhO_: Instagram primeiro, dados à esquerda e gráficos à direita, anúncios no topo ocultos com botão de olho, aba Facebook refeita (nome do Reel, miniatura, gráfico de barras, relatório).
- Map MentaleS_: nós de imagem (enviar, colar ou arrastar arquivo), letras maiores (A+ / A−), mapa do ecossistema v2 com fotos.
- Migration 0031: notas tipo/título/itens, perfis com foto/seguidores, produtos, emails, relatório facebook, bucket anderson-os-arquivos, acesso de dono para theilmar@gmail.com.

## 2026-11-06 · Ecossistema: Map MentaleS_, AgenteS_, PerfiS_, Sticky NoteS_ e notificações
- Map MentaleS_ (`#/mapa`): mapa mental editável em canvas infinito (zoom, pan, pinça), nós, textos, grupos que arrastam o conteúdo, conexões com rótulo/cor, notas e links por nó, seleção múltipla e em área, desfazer/refazer, autosave com versão + rascunho local, export/import JSON, export PNG, vários mapas, tela cheia.
- AgenteS_ (`#/agentes`): tarefas agendadas do Claude com status real (sincronizadas por rotina), execuções com resumo/erro, filtros e pedidos Rodar agora / Pausar / Retomar (`claude_requests` kind `agente_*`).
- PerfiS_ (`#/perfis`): matriz do ecossistema por perfil (editável), pautas do dia (aquecimento, oração, react, contagem) e meta de R$ 3.000 de faturamento com registro de vendas por origem.
- Sticky NoteS_ (`#/notas`): notas arrastáveis/redimensionáveis, cores, tags, link, fixar no PaineL_.
- PaineL_: bloco da meta, resumo de AgenteS_ e pautas, notas fixadas (substitui o quadro antigo de estratégia).
- Notificações: ponto no menu por módulo com novidade de agente/rotina; apaga ao abrir; regra automática para módulos novos via trigger `app_private.emit_event`.
- `h()` passa a aplicar variáveis CSS (`--c`, `--bar-c`) em `style` (antes eram ignoradas).
- Migration 0030: `mapas`, `sticky_notes`, `agent_jobs`, `agent_runs`, `perfis`, `pautas`, `receitas`, `app_events`, `module_seen`, RPCs `module_news`/`mark_module_seen`, `agent_write` aceita as tabelas novas.

## 2026-11-06 · CarrosseL_ e menu
- Carrosséis virou CarrosseL_ (ícone de carrossel). Menu lateral maior e com o padrão de letra final maiúscula + "_" (menos Agenda, Meu setup e Configurações); Meu setup ficou junto de Configurações.
- "Enviar para o CarrosseL_" nos rascunhos de X e LinkedIn do PostadoR_: vira pedido (`claude_requests` kind `carrossel_novo`) e a rotina de pedidos monta o carrossel detectando notícia, educativo ou pessoal. Painel "Pedidos do PostadoR_" no CarrosseL_.
- "Enviar pro iPhone" no carrossel: gera as lâminas (JPG e MP4) e abre o compartilhar do sistema (no iPhone salva na galeria; no Mac, AirDrop), com a legenda copiada.
- Migration 0029: tipo `pessoal` em `carrosseis` e kind `carrossel_novo`.

## 2026-11-05 · Carrosséis diários
- Carrosséis estilo print de tweet para o @ilmarlabs (2 notícias + 2 educativos por dia, rotina das 6h45): prévia em canvas, edição de texto e mídia por lâmina, download PNG/MP4, status e botão "Transformar em vídeo" (Reel, X ou os dois).
- Migration 0028: tabela `carrosseis`, `claude_requests.payload` e kind `carrossel_video`, `agent_write` aceita `carrosseis`.
- Primeiro carrossel: Claude Personal Finance.

## 2026-11-04 · Afiliações
- Magnific nas Afiliações (link de indicação + botão para copiar o cupom).

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
- Início: botão Ocultar (próximos compromissos, pra replicar), cursos e ferramentas em duas linhas com nome, parabéns ao bater meta, bloco X PostadoR_ x manual x total (também no Desempenho). MineR_: ocultar no Pra replicar e botão Excluir. Garimpo usa Whisper (tools/transcrever.py) e salva capa.
- Trampos: página de vagas remotas (tabela jobs, migration 0023), busca 3x/dia (5h, 13h, 18h) pela rotina.

## 2026-11-02 · Influencers
- Nova página Influencers (só dono): vitrine por personagem com ícone da rede, link do perfil, e-mail de login (sem senha) e pasta no ANDY 1TB/TIK TOK. Índia Narah cadastrada.
- Trampos: "Descartar" esconde a vaga do painel (fica só o registro para não repetir na busca); aba Descartadas removida.

## 2026-11-08
- Tela inicial: módulo Créditos Magnific (verifica só no clique, via ajudante local + Claude em segundo plano; migration 0037).
- YT downloaD_: "Mostrar no Finder" voltou a funcionar.
- PromptS_ virou SkillS_: catálogo de skills, plugins e repositórios do GitHub por categoria, com "uso"/"recomendo" e necessidade (dados em js/skills-data.js). Prompts salvos continuam embaixo.
- AprovaçõeS_: "Baixar" junta vários arquivos num .zip único (antes o Chrome bloqueava na 1ª vez); "Legenda pro iPhone" mostra QR que abre o card no iPhone com botão Copiar.
- AprovaçõeS_: "Baixar" voltou a salvar arquivos separados (sem .zip), baixados em sequência pelo navegador.
- CarrosseL_: botão "Pedir alteração" (pedido carrossel_ajuste, migration 0038), "Pegar mídia de outra lâmina" (trocar/copiar), e "Enviar pro iPhone" não trava mais no "Tocar de novo".
- StúdiO_: botão "⬇" baixa o vídeo em MP4. CarrosseL_: marcar como postado tira o carrossel da tela (fica arquivado no banco); chip "Postados" saiu.
