# Integrações (API/MCP, Google, arquivos)

**Estado: planejadas, NÃO implementadas nesta arquitetura estática.** O banco já está pronto para elas (tabelas `integrations`, `idempotency_keys`, `rate_limits`, `google_connections` e as RPCs `agent_*` só executáveis por `service_role`, migrations 0002 e 0003). Falta a camada de servidor, que no GitHub Pages precisa ser **Edge Functions do Supabase**.

## Plano: Edge Function `agent` (REST) e `mcp`
- Autenticação por `Authorization: Bearer aos_<prefixo>_<segredo>`; só o hash fica em `integrations`; comparação em tempo constante; escopos por operação; revogável; limite por minuto (`agent_rate_check`).
- Operações específicas (nada de SQL arbitrário): buscar, listar/consultar/criar/editar/concluir tarefa, listar/criar projeto, adicionar nota, listar/criar compromisso, consultar histórico.
- Origem (`chatgpt`/`claude`/...) vem de `integrations.kind`, definida no banco pelas RPCs.
- Anti-duplicação: `Idempotency-Key` e recusa de tarefa idêntica em 10 min sem chave. Conflito: `expected_version` obrigatório em edição (409 `version_conflict` com a versão atual). Ambiguidade: só título exato e único; senão devolve candidatos (409 `ambiguous`).
- MCP remoto (Streamable HTTP) na mesma função. Clientes como claude.ai e ChatGPT podem exigir OAuth em vez de Bearer fixo: **não verificado**; Claude Code/Codex aceitam cabeçalho Bearer (a validar após o deploy).
- A lógica de referência já foi escrita e testada em Node (commit `474e160` do projeto `anderson-os` fora deste repo, arquivo `src/lib/api/agent.ts`); portar para Deno.
- Criar a chave exige a service role: será uma ação da própria função (só dono), e a tela Configurações passará a oferecer "Criar integração". Hoje a tela lista e revoga integrações existentes.

## Google Calendar e Gmail
- Login: Supabase Auth com Google (escopos básicos).
- Conexão separada (OAuth próprio com PKCE, acesso offline) numa Edge Function que guarda o refresh token **criptografado** (AES-256-GCM, secret `TOKEN_ENCRYPTION_KEY` do Supabase) em `google_connections`, coluna ilegível para usuários. Exige que a conta conectada seja a do login.
- Escopos propostos: `calendar.events`, `calendar.readonly`, `gmail.readonly`.
- Google Cloud: ativar APIs Calendar e Gmail, tela de consentimento Externo, cliente OAuth Web. **Em modo "Testando" o refresh token expira em 7 dias**; para uso contínuo, publicar como "Em produção" (aviso de app não verificado, aceitável para uso pessoal).
- Fonte oficial da agenda (proposta): `events` do painel como mestre com `google_event_id`/`etag`; primeiro painel para Google; depois leitura com tratamento de duplicatas, alterações e falhas. Até lá a interface diz "não configurado".

## Arquivos locais
O site hospedado não acessa o Finder. Arquivos do Mac: ferramentas locais do Claude/Codex com pastas autorizadas. Nuvem: Drive ou Storage privado (futuro, só sob pedido). Caminho local não abre no iPhone: marcar como "link local (só neste Mac)".
