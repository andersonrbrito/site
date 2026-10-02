# Arquitetura

## Visão
```
andersonbrito.com/painel/  (páginas estáticas no GitHub Pages, mesmo repositório do site)
        │  login Google (Supabase Auth, PKCE)  +  supabase-js (chave publishable)
        ▼
Supabase Postgres  ←  RLS: só membros autorizados  ←  Edge Functions (API REST/MCP para agentes, futuras)
```
- **Interface:** JavaScript puro (ES modules) sem build, no padrão visual do site. Roteamento por hash (`#/tarefas`) porque o GitHub Pages não tem reescrita de rotas.
- **Dados:** supabase-js direto do navegador. O **RLS é a barreira real**: sem sessão Google de um e-mail em `allowed_emails`/`app_members`, as tabelas não devolvem nada.
- **Login restrito:** cadastro público bloqueado por trigger em `auth.users` + allowlist; além disso desative "Allow new users to sign up" no Supabase.
- **Histórico, versão, origem:** triggers do banco; valem igual para painel, ChatGPT e Claude.
- **Servidor:** não existe no GitHub Pages. O que exige segredo (API para agentes, MCP, token do Google) roda em **Edge Functions do Supabase**, onde os secrets ficam fora do Git. Ainda não implementadas (ver STATUS).

## O que é público e o que não é
O repositório e as páginas são públicos: qualquer pessoa pode ler o código e ver a tela de login, mas não os dados. Público por definição: URL do projeto e chave *publishable*. **Nunca** no repositório: `service_role`, secrets do Google, chaves `aos_...`.

## Decisões
- **Mesmo repositório e domínio** (pedido do Anderson): sem DNS novo, deploy = `git push`.
- Sem framework/build para manter o padrão do site (arquivos simples) e o deploy trivial.
- supabase-js salvo em `vendor/` (sem CDN de terceiros em runtime).
- Sem DELETE: arquivamento (`archived_at`), recuperável. Histórico imutável.
- `due_date` é `date`; compromissos com hora são `timestamptz`.

## Design e UX
Mesma linguagem do site: tema escuro de editor de vídeo, barra de menu/ferramentas, painéis com cabeçalho mono, Exo 2 / DM Sans / IBM Plex Mono, azul `#3DA7FF`. Paleta de comandos (Ctrl/Cmd+K ou `/`), atalhos (`C` captura, `G` depois `H/T/I/A/J/P`), Kanban com arrastar e soltar, atualização otimista com Desfazer, falhas por toast sem perder o digitado, esqueletos de carregamento, linha do tempo de 14 dias.

## Publicação
Já é o próprio site: `git push` na `main` publica em `andersonbrito.com/painel/`. Para funcionar, preencher `painel/js/config.js` (URL e chave publishable) e configurar Supabase/Google (README).
Backup/recuperação: ver `DATABASE.md#backup`.
