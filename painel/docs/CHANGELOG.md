# Changelog

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
