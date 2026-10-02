# Anderson OS (painel): instruções para qualquer agente (Claude, ChatGPT/Codex, outros)

Painel pessoal privado de Anderson Brito, hospedado **neste mesmo repositório** (`andersonbrito.com/painel/`, GitHub Pages). Banco único no Supabase, compartilhado por: painel web, ChatGPT e Claude. **Nunca crie cópias, bancos ou arquivos paralelos de dados.**

## Leia primeiro
`painel/docs/STATUS.md` (o que existe, falta e está bloqueado) → `ARCHITECTURE.md` → `DATABASE.md` → `INTEGRATIONS.md`.

## Regras inegociáveis
1. **O repositório é PÚBLICO e o site é estático.** Nada secreto em arquivos: só a URL e a chave *publishable* do Supabase (públicas por definição) em `painel/js/config.js`. `service_role`, secrets do Google e chaves de integração nunca entram no Git (ficam como secrets das Edge Functions no Supabase).
2. **A segurança dos dados é do banco, não das páginas.** As páginas do painel são públicas; sem login Google + registro em `app_members` o RLS devolve nada. Toda tabela nova: RLS ligada, policy com `app_private.can('<modulo>')`, triggers (`stamp_origin`, `before_update`, `log_change`) e sem DELETE (arquivar com `archived_at`).
3. **Mudanças no banco = nova migration** em `supabase/migrations/` (nunca editar migration aplicada; nunca drop/recreate tabela com dados).
4. **Histórico, versão e origem são do banco** (triggers). A origem de agentes vem da chave da integração, nunca do corpo do pedido. Agentes não enviam SQL: só operações específicas (RPCs `agent_*` via Edge Function).
5. **Edição concorrente:** toda atualização usa `.eq("version", v)`; em conflito, nunca sobrescreva: avise e peça releitura. Mutação por título só com título exato e único; senão devolva candidatos.
6. **Sem XSS:** montar DOM só com `h()` de `js/util.js` (texto vira nó de texto). Proibido `innerHTML` com dados.
7. **Datas:** fuso `America/Sao_Paulo`; prazo sem horário é `date` (não use `new Date("YYYY-MM-DD")`); use `js/util.js`.
8. **Idioma:** português do Brasil. Sem travessão em textos para o usuário. Sem emojis na interface.
9. **Não chame de pronto o que só existe visualmente.** Atualize `docs/STATUS.md` e `docs/CHANGELOG.md`.
10. **Não quebre o site público:** o painel vive só em `painel/`, `supabase/`. Não altere as demais páginas.

## Fluxo
- Branch por mudança maior; duas IAs não mexem na mesma branch ao mesmo tempo. Antes: `git status`, `git log -5`, ler `docs/STATUS.md`.
- Testes: `cd painel/dev && npm install && npm test` (migrations/RLS/histórico com Postgres embutido + validações). Interface: abrir `painel/dev/harness.html` por um servidor local (Supabase falso em memória, só teste).
- Novo módulo: linha em `js/modules.js` + `js/views/<id>.js` + migration. Começa com `enabled:false`.

## Mapa
`painel/index.html` · `css/painel.css` · `js/app.js` (login, roteador por hash) · `js/shell.js` (menus, paleta, atalhos) · `js/views/*` · `js/util.js` · `js/data.js` · `js/ui.js` · `js/kanban.js` · `js/config.js` · `vendor/supabase.js` (supabase-js 2.117.2, UMD) · `dev/` (testes, harness) · `docs/`
