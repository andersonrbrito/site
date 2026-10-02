# Status (atualize ao concluir qualquer item)

## Testado
- **Banco** (`painel/dev`, `npm test`, Postgres embutido): migrations aplicam do zero; cadastro público bloqueado; RLS (anon sem acesso, membro sem módulo sem acesso, sem DELETE, histórico imutável); origem/autor carimbados pelo banco; versão, `completed_at`, arquivamento; histórico com valores antigos/novos; RPCs de agente (idempotência, conflito, 404, revogada, rate limit, valores inválidos); busca respeita RLS; token Google ilegível por usuário.
- **Interface** (`painel/dev/harness.html`, Supabase **falso** em memória, no navegador): as 13 rotas renderizam; concluir com Desfazer; captura rápida; criar tarefa/projeto/compromisso; validação preserva campos; edição; conflito de versão; Kanban arrastar e soltar; paleta de comandos; texto com HTML não executa (sem XSS).
- Validações e datas (fuso de SP) com testes unitários.

## Implementado, mas NÃO testado contra serviços reais
- Login com Google, sessão, checagem de membro e todas as telas com o **Supabase de verdade** (não existe projeto ainda).
- Celular físico (só emulação de largura).

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
