# Banco de dados

Migrations em `supabase/migrations` (ordem por nome). `painel/dev/tests/db.test.ts` aplica todas num Postgres embutido (PGlite) com stubs do schema `auth`/roles e verifica RLS, histórico, versão, idempotência.

## Tabelas
| Tabela | Função |
|---|---|
| `allowed_emails` | quem pode existir como usuário (trigger bloqueia outros cadastros) |
| `app_members` | usuário → papel (`owner`/`member`) e `modules` liberados |
| `integrations` | chaves de agentes (só hash), escopos, revogação, último uso |
| `idempotency_keys`, `rate_limits` | anti-duplicação e limite por minuto (somente service_role) |
| `clients`, `projects`, `tasks`, `notes`, `events` | domínio. `seq` gera ids legíveis (T-12, P-3) |
| `change_log` | histórico imutável (entidade, ação, autor, origem, campos, valores antigos/novos) |

Comuns às tabelas de domínio: `version` (controle otimista), `created_at/updated_at`, `archived_at`, `source` (`painel|chatgpt|claude|codex|outro|api`), `created_by_user/integration` (carimbados por trigger, ignorando o cliente).

## Permissões (RLS)
- `anon`: nada. `authenticated`: precisa estar em `app_members`; cada tabela exige `app_private.can('<modulo>')` (dono = tudo). Sem DELETE para ninguém.
- `change_log`, `integrations`, `allowed_emails`: leitura só do dono. Revogar integração: dono (coluna `revoked_at`).
- RPCs `agent_*`: executáveis só por `service_role`.
- `search_all(q)`: `security invoker`, então a busca respeita RLS.

## Convenções de status
Tarefa: inbox, a_fazer, em_andamento, aguardando, concluido, cancelado. Prioridade: baixa, normal, alta, urgente. Projeto: etapa (briefing, producao, revisao, aprovacao, entrega) separada de `payment_status`.

## Como evoluir
Nova migration `YYYYMMDDHHMMSS_descricao.sql`. Preserve dados (add column com default, nunca drop/recreate). Nova tabela: ligar RLS, policies, triggers (veja o bloco `do $$` em 0001), módulo em `painel/js/modules.js`.
Financeiro futuro: valores em `numeric(14,2)` ou centavos `bigint`, nunca `float`; previsto separado de recebido.

## Backup
Supabase: backups diários só em planos pagos; no plano gratuito faça dump manual: `supabase db dump -f backup.sql` (ou pg_dump com a connection string, guardada fora do Git). Recomendado: dump semanal para armazenamento privado. Restauração: criar projeto novo, aplicar o dump, reconfigurar Auth/variáveis. Teste a restauração antes de depender dela. **Não configurado ainda.**
