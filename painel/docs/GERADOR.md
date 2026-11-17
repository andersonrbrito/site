# ForjadoR_ (módulo `gerador`): geração de vídeo, imagem e áudio com IA

**Estado em 2026-11-11:** interface pronta e execução construída para UMA conexão: Magnific pelo Chrome (plano Unlimited). Testado com Claude falso (nenhuma geração real ainda, nenhum crédito gasto). Módulo segue `enabled:false`. Falta: Anderson rodar a migration 0040, reiniciar o ajudante e autorizar o primeiro teste real.

## Arquivos
- `js/views/gerador.js` (tela), `js/gerador-core.js` (lógica pura), `js/gerador-data.js` (catálogo: 10 provedores, 75 modelos, vozes, `LIGADAS`), `js/gerador-exec.js` (conversa com o ajudante), `css/gerador.css`.
- `tools/yt-helper/gerador.py` (execução) e rotas em `tools/yt-helper/server.py`. Prompt por conexão em `tools/gerador/prompts/<provedor>-<caminho>.md`.
- `supabase/migrations/20261111000040_geracoes.sql` (tabela `geracoes`).
- Testes: `dev/tests/gerador.test.js`. Harness: `dev/harness.html?on=gerador#/gerador` (fila simulada pelo mock).

## Como um pedido anda
1. A página grava a linha em `geracoes` (status `fila`). Conexão que gasta créditos, cobra por uso ou vídeo acima de 720p exige segundo clique.
2. No Mac, a página entrega o pedido ao ajudante (`POST http://127.0.0.1:8765/gerar`, id do job = id da linha, anexos em base64). O ajudante roda um pedido por vez: Claude em segundo plano com o prompt fixo da conexão e só as ferramentas daquela conexão (Magnific pelo Chrome libera só `mcp__claude-in-chrome__*`, então o MCP do Magnific, que gasta créditos, fica fora do alcance).
3. O prompt manda conferir na tela que a geração é Unlimited antes de gerar; se aparecer custo, não gera e devolve erro.
4. O resultado é baixado para `/Volumes/ANDY 1TB/BANCO DE MIDIA/<VIDEOS|IMAGENS|AUDIO>/AAAA-MM-DD_<nome>_<provedor>.ext` com linha no `INDICE.md`.
5. A página consulta `GET /job/<id>` a cada 4 s e atualiza a linha (gerando, pronto, erro). A galeria mostra o arquivo por `GET /midia/<id>` (só no Mac; sem cópia no Supabase, por decisão do Anderson: pesaria demais).
6. Pelo celular: pedido sem anexo fica em `fila` e é entregue quando o painel abrir no Mac. Pedido com anexo só pelo Mac (o arquivo sai do aparelho).

## Travas
- Só conexões em `LIGADOS` (ajudante) e `LIGADAS` (página) executam. Hoje: `magnific:chrome` e `kinovi:api`.
- Kinovi (2026-11-17): API paga por uso, chave só no Keychain do Mac (`security add-generic-password -U -a kinovi -s anderson-os-gerador -w`). Ligados: Seedance 2.0 Mini, Fast e Pro e Seedance 2.5 (480p e 720p; o 2.5 até 30 s, sem geração real ainda), Nano Banana 2 (2K e 4K) e GPT Image 2. Anexos sobem para o próprio Kinovi (24 h). A API não cancela tarefa em andamento.
- Kie.ai e fal.ai: sem conta nem plano (decisão adiada). Ficam no catálogo como referência e a página bloqueia o envio.
- Uma geração por pedido, sem repetir sozinho. Nunca compra, troca de plano ou apaga.
- Higgsfield fora do catálogo. Vozes da WooB fora da lista.
- Vídeo abre em 720p ou menos.

## Provedores
| Provedor | Conta | Caminho | Situação |
|---|---|---|---|
| Magnific | contato | Chrome (Unlimited) | execução construída |
| Magnific | contato | MCP (gasta créditos) | catalogado, não ligado |
| Google Flow | contato / theilmar | Chrome | catalogado |
| Google AI Studio | theilmar | Chrome / API | catalogado |
| ChatGPT | contato | Chrome | catalogado |
| Grok Imagine | theilmar | Chrome / API | catalogado |
| Real Oficial | conector `ro_*` | MCP e Chrome | catalogado: Vídeo com IA (MiniMax Real H3 Ultra incluso no plano, mais 12 modelos por crédito), Imagem com IA (GPT Image 2 e 2.5 inclusos), XABLAU, Real Fantasia e Voz e áudio a levantar na tela |
| Kinovi | chave no Keychain | API | execução construída, sem geração real ainda |
| Kie.ai, fal.ai | nenhuma | API | sem plano, bloqueados |

## Próximos passos
1. Migration 0040, reiniciar o ajudante, um teste real Unlimited (imagem Nano Banana 2 1K ou Kling 2.5 720p 5 s).
2. Ligar ChatGPT imagem e Flow contato (Chrome).
3. Real Oficial pelo conector, começando pelos modelos inclusos no plano.
4. Áudio: ElevenLabs no Magnific com a voz Anderson Brito (id 183468).
