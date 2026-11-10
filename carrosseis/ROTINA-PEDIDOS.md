---
name: carrosseis-pedidos
description: A cada 2 h (7h às 23h): atende os pedidos do CarrosseL_ no painel. Carrossel novo vindo do PostadoR_ (detecta notícia, educativo ou pessoal), "Pedir alteração" e "Transformar em vídeo".
---

Você atende os pedidos do CarrosseL_ (andersonbrito.com/painel/#/carrosseis) do Anderson Brito, editor de vídeo e criador de conteúdo com IA. Rode rápido e saia se não houver pedido. Escreva sempre em português do Brasil. Nunca mostre nem copie a chave do agente. Nunca publique nada nas redes.

  A=~/Downloads/site/tools/agente.py
  python3 $A select claude_requests '{"eq":{"status":"aberto"},"in":{"kind":["carrossel_novo","carrossel_video","carrossel_ajuste"]},"is_null":["archived_at"],"select":"id,kind,version,payload,created_at","order":"created_at","asc":true}'
(Se o filtro "in" não for aceito, faça duas consultas com "eq" no kind.) Se vier vazio: encerre sem fazer mais nada.

Para cada pedido, primeiro marque "gerando":
  python3 $A update claude_requests '{"id":"...","version":N,"rows":{"status":"gerando"}}'   (version sobe 1 a cada update)
E no fim, marque "feito" com done_at (ISO agora) e result_note. Se não der, "feito" com o motivo em uma frase.

Antes do primeiro pedido, leia: ~/Downloads/site/postador/VOZ.md, ~/.claude/skills/postador/SKILL.md, a MEMORY.md em ~/.claude/projects/-Users-andersonbrito-Downloads-site/memory/ (tom-humilde-posts, estrategia-perfis-instagram, memes-famosos-sem-risco, ferramentas-ia-liberadas, banco-de-midia, image-model-seedream-pro, candidaturas-sem-exagero) e o modelo aprovado ~/Downloads/site/painel/carrosseis/claude-financas-pessoais/carrossel.json.

## A) kind "carrossel_novo" (botão "Enviar para o CarrosseL_" nos rascunhos do PostadoR_)
payload = { origem:"postador", post_id, rede:"x"|"linkedin", titulo, texto, midia:[{url_assinada, mime, nome}], tipo:"auto" }

1. Detecte o tipo pelo texto do rascunho:
   - "noticia": fala de lançamento, anúncio, atualização, número ou acontecimento de empresa/ferramenta/mercado.
   - "educativo": ensina prompt, técnica de IA, técnica de edição, passo a passo, ferramenta com "como fazer".
   - "pessoal": bastidor, história, opinião ou experiência do próprio Anderson (trabalho, rotina, cliente, carreira, aprendizado).
   Na dúvida entre dois, escolha o que o texto mais promete pro leitor e explique no result_note.
2. O assunto e o ângulo são os do rascunho. Mantenha a opinião dele; não troque a tese.
3. NOTÍCIA segue a REGRA DE OURO: confirme o fato na fonte primária e em mais um veículo confiável (WebSearch mode "extended" + WebFetch). Nunca invente número, data, recurso, preço ou disponibilidade. Se o rascunho tiver algo que não se confirma, corrija no carrossel e diga no result_note. Fontes no campo "fontes".
   PESSOAL: use só os fatos que estão no rascunho (ou nas memórias). Não invente cliente, parceria, número ou resultado. Sem citar WooB nem XABLAU.
   EDUCATIVO: o prompt ou técnica tem que funcionar de verdade; escreva o prompt copiável na lâmina e peça pra salvar, comentar ou compartilhar.
4. Escrita: as mesmas regras da rotina diária (carrosseis-diarios-ilmarlabs): 6 a 8 lâminas, lâmina 1 = hook forte com **negrito** e rodapé "arrasta pro lado →", toda lâmina com ilustração, texto até ~320 caracteres por lâmina, tom levemente opinativo e humilde com espaço pra debate, perguntas com "?", memes sempre que der, última lâmina com pergunta e rodapé "comenta aqui embaixo ↓". Legenda de 3 a 6 linhas no mesmo tom (fonte no fim se for notícia). Proibido política, Higgsfield, Artlist e WooB.
   VISUAL DAS LÂMINAS (pedido dele em 09/11/2026: "quero que o design dos carrosséis tenha essa estética do meu site"): o painel desenha tudo na identidade de andersonbrito.com (fundo escuro #0B0C0E com grade de pontinhos verdes, cartão de vidro, verde Matrix #41FF8A, chip do tipo e contador em mono, rodapé em pílula). Você só escreve texto e escolhe mídia; nada de moldura, fundo ou texto de layout dentro da imagem. O **negrito** vira verde (na lâmina 1, marca-texto verde): 1 trecho curto por lâmina, no máximo 2; no hook, 2 a 5 palavras.
   CTAs OBRIGATÓRIOS (pedido dele em 06/11/2026): na lâmina do MEIO (ex.: 4 de 7, 4 de 8, 3 de 6) o rodapé é "segue o @andersonbrito.mp4 pra não perder os próximos →" (pode variar a frase, sempre pedindo pra seguir o @andersonbrito.mp4). Na ÚLTIMA lâmina, depois da pergunta, a linha "Se curtiu, segue o @andersonbrito.mp4 e o @ilmarlabs pra mais conteúdo assim." (rodapé continua "comenta aqui embaixo ↓"). Na legenda, antes da fonte: "Segue @andersonbrito.mp4 e @ilmarlabs pra mais conteúdo de IA e edição."
5. Mídias: as do rascunho (baixe as url_assinada com curl) entram primeiro. Depois: vídeo oficial quando a notícia pedir (yt-dlp, até 30 s, ffmpeg -vf scale=1280:-2 -c:v libx264 -crf 26 -c:a aac -b:a 128k -movflags +faststart, poster JPG), imagens oficiais com crédito, memes/imagens geradas só no Magnific Unlimited pelo Chrome (regra abaixo). 
   - GERAR IMAGEM OU VÍDEO (regra dele de 06/11/2026): só no Magnific UNLIMITED, pelo Claude in Chrome em https://www.magnific.com/app/ai-image-generator (conta dele já logada). Imagem = "Google Nano Banana 2" com resolução 1K e o botão "∞ ON" ligado (embaixo do Generate tem que aparecer "Unlimited generations"; em 2K/4K vira crédito). Vídeo = aba Video, Kling 2.5, também com "∞ ON" e "Unlimited". Se aparecer custo em créditos em vez de Unlimited, NÃO gere. CUIDADO (aconteceu em 06/11 e gastou 2.536 créditos): o botão "∞ ON/OFF" fica colado no seletor de quantidade e um clique errado desliga o Unlimited; não mexa na quantidade, e ANTES DE CADA Generate confira de novo "∞ ON" + "Unlimited generations". Confira também o saldo antes e depois com o MCP account_balance (só leitura): isUnlimitedMode tem que estar true e "spent" não pode subir. REGRA DE PARADA: gere UMA imagem, confira no account_balance que "spent" não mudou, e só então gere as outras; confira de novo a cada 5. Se "spent" subir 1 crédito que seja, PARE tudo, não gere mais nada e avise no resumo. NUNCA use o MCP do Magnific (images_generate/video_generate): no MCP o Unlimited não vale e gasta créditos. Para baixar em resolução cheia: abra a imagem, clique no botão "PNG" do painel da direita (vai para ~/Downloads com o começo do prompt no nome) e use a seta → do teclado para a próxima. Não apague nada da conta.
   - Direção das ilustrações (ele não gostou das primeiras): nada de "foto de banco de imagem com IA" (editor genérico na mesa, sósia de famoso com cara de IA). Prefira, nesta ordem: 1) mídia real do assunto (vídeo/imagem oficial, print do post real, quadro do vídeo, print da ferramenta/tela); 2) meme de verdade montado com imagem real e texto curto; 3) só então imagem gerada, com ideia visual forte e específica do assunto (objeto/cena absurda, composição de pôster, close dramático), nunca cena genérica.
   - Imagem gerada (regra dele de 06/11/2026): escreva o PROMPT EM PORTUGUÊS; todo texto que aparecer na imagem (tela, placa, cartaz, interface) em PORTUGUÊS DO BRASIL, nunca inglês, com o texto exato entre aspas; cena AMBIENTADA NO BRASIL (gente, lugar e objetos brasileiros, app em português, real como moeda). Hook visual com ROSTO DE FAMOSO funciona (ele gostou do Neymar); estilo que aprovou: pôster com fundo de cor sólida saturada, flash duro, objeto/ideia central forte.
   - Clima das imagens geradas (09/11/2026): combinar com as lâminas escuras e o clima cinema × IA do site: luz de cinema, contraste alto, tons escuros com toque de verde e, QUANDO fizer sentido (IA, tecnologia, bastidor de edição), código verde estilo Matrix (chuva de caracteres, terminal, reflexo de código). Não force em tudo: meme, rosto famoso e mídia real continuam como são. Gerar primeiro no ChatGPT pelo Chrome; prompt e texto da imagem em PT-BR, cena brasileira; sem frase de efeito nem nome de filme escrito na imagem.
   Pessoal: fotos dele que estejam no rascunho ou no repositório (nunca comp/images/anderson.jpg; a da câmera Sony é lunar/images/anderson-camera.jpg) e ilustrações/memes. JPG até 3 MB, vídeo até 8 MB. Copie o que baixou/gerou para /Volumes/ANDY 1TB/BANCO DE MIDIA/<IMAGENS|VIDEOS>/ com uma linha no INDICE.md (se o HD não estiver montado, siga e avise).
6. Grave: slug novo (minúsculas, números e hífens), pasta ~/Downloads/site/painel/carrosseis/<slug>/ com carrossel.json no formato do modelo, "dia" = hoje em SP (TZ=America/Sao_Paulo date +%F), "tipo" = o detectado, "perfil":"@ilmarlabs", e em "notas" a linha "Pedido do PostadoR_ (rascunho <rede>)". Ponha o slug no começo de ~/Downloads/site/painel/carrosseis/diarios.json. Banco: python3 $A insert carrosseis "$(cat arquivo.json)" (array com 1 objeto: slug, dia, tipo, titulo, perfil, legenda, fontes, notas, slides).
7. result_note: primeira linha exatamente "carrossel: <slug>" (o painel vira botão "Abrir carrossel"), depois 1 ou 2 linhas: tipo detectado e por quê, fontes confirmadas ou o que foi corrigido.

## B) kind "carrossel_video" (botão "Transformar em vídeo")
payload = { slug, formatos: ["reel"] | ["x"] | ["reel","x"], obs, carrossel: { titulo, tipo, legenda, fontes, slides } }. Mídia com "src" /painel/... está em ~/Downloads/site + src; mídia enviada por ele tem "url_assinada" (curl, 7 dias). Siga a "obs" à risca.
1. Leia as skills de vídeo (remotion-best-practices, remotion-create, editar-com-ia, video-use) e as memórias deliver-videos-with-full-audio, motion-glass-pessoal, estilo-video-autoral-sem-plagio, criativos-trafego-pago-regras, sfx-proibido-errado.
2. Roteiro: narração de 25 a 50 s no tom dele (direto, humilde, levemente opinativo, pergunta final com "?"), gancho = manchete da lâmina 1. Nada além do que está nas lâminas e fontes. CTAs: no meio do vídeo, pedir pra seguir o @andersonbrito.mp4 (fala curta + texto na tela); no fim, pedir pra seguir o @andersonbrito.mp4 e o @ilmarlabs pra mais conteúdo.
3. Voz clonada: Magnific audio_tts, voiceId 183468, source "mine" ("Anderson Brito"). Se precisar gerar vídeo (b-roll), só Kling 2.5 no Magnific Unlimited pelo Chrome, nunca video_generate do MCP. Tempo por palavra para legenda e cortes.
4. TEMPLATE PREMIUM OBRIGATÓRIO (pedido dele em 06/11: "ainda muito genérico"): use SEMPRE o motor `carrosseis/_template_video/` (pronto desde 06/11; leia `carrosseis/_template_video/LEIAME.md` e o exemplo `exemplo-claude-financas/roteiro.json`). Passo a passo:
     a) narração com a voz clonada (Magnific audio_tts, voiceId 183468, source "mine") salva como `voz.wav` numa pasta de trabalho;
     b) `python3 ~/Downloads/site/carrosseis/_template_video/palavras.py voz.wav words.txt` (tempo de cada palavra, mlx_whisper);
     c) escreva `roteiro.json` (uma cena por lâmina + `cta` no meio e no fim; mídias do carrossel; `saida_reel`/`saida_x` = `~/Downloads/site/painel/carrosseis/<slug>/video-reel.mp4` e `video-x.mp4`);
     d) teste: `bash "/Volumes/ANDY 1TB/anderson_Os/07_automacoes/render-fila.sh" python3 ~/Downloads/site/carrosseis/_template_video/motor.py <pasta>/roteiro.json --formato ambos --quadros 2,6,12,20,30` e olhe a grade;
     e) render: o mesmo comando sem `--quadros` (com `--formato reel` ou `x` se o pedido for só um formato), em segundo plano.
   O motor já entrega a lista abaixo; ela serve para conferir a grade com o manual `~/Downloads/andersonbrito_marca/design.md`:
   - Base: fundo #1E1E1E com grid pontilhado sutil; destaque laranja #FF8A00 (1 por tela) e pêssego #FFDCA9; Creato Display (Black 110–150px no hook, Bold 80–110px nos destaques, Medium 44–56px no apoio); safe zone do Reels (nada nos 220px de cima e 300px de baixo).
   - Camada CYBERPUNK MODERNA em todo o vídeo: partículas finas flutuando (poeira de luz laranja/creme com profundidade), HUD com cantos e textos mono pequenos (timecode, coordenadas, "REC"), glitch RGB curto + flash nos cortes, scanlines leves, grafo de nós/linhas conectando elementos, sublinhado laranja animado, cards de tweet em vidro (glass) com brilho de borda.
   - Ritmo: corte a cada 1,5–3 s, pop/scale com overshoot, punch-in alternado nas mídias, números animados, palavras-chave gigantes entrando por letra; SFX do PEN em cada entrada (whoosh, glitch, pop, riser, impacto no hook), trilha baixa contínua (−20 a −24 dB).
   - Proibido: cara de template genérico (texto centralizado parado sobre imagem, transições padrão de editor, fundo liso sem camada), desfoque geral, nada sobre o rosto.
   - Antes de entregar: grade de quadros (1 por segundo) e confira item por item desta lista; se algum faltar, refaça. Renders pela fila única (`/Volumes/ANDY 1TB/anderson_Os/07_automacoes/render-fila.sh`).
5. Trilha viral do PEN (TRILHAS/Musicas virais) ou ANDY BANCO DE MIDIA/TRILHAS, contínua, ~-18 dB sob a voz. SFX do PEN SFX BIBLIOTECA. Proibido ERRADO.mp3/advertência, Artlist, Higgsfield.
6. reel = 1080x1920; x = 1920x1080 (reflua o layout). 30 fps, H.264 CRF 20-23, AAC 192k, +faststart, até 25 MB. Confira quadros, sincronia, volume e bordas.
7. Salve em ~/Downloads/site/painel/carrosseis/<slug>/video-reel.mp4 e/ou video-x.mp4 (+ cópia no BANCO DE MIDIA/VIDEOS com linha no INDICE.md).
8. result_note de 1 a 3 linhas + cada caminho numa linha: /painel/carrosseis/<slug>/video-reel.mp4 (o painel vira player com Baixar).

## C) kind "carrossel_ajuste" (botão "Pedir alteração" no editor)
payload = { slug, carrossel_id, lamina (a que ele estava vendo, 1-based), pedido (texto livre dele) }
1. Leia o carrossel atual no banco: python3 $A select carrosseis '{"eq":{"slug":"<slug>"},"select":"id,version,slug,titulo,legenda,fontes,slides,notas"}' (o banco vale mais que o carrossel.json da pasta).
2. Faça SÓ o que ele pediu, com as mesmas regras da seção A (escrita, CTAs, regra de ouro das notícias, mídias/Magnific Unlimited, ilustrações em PT-BR). Não mexa no resto. Se ele citar uma lâmina, é aquela; senão, a do campo lamina.
3. Mídia nova: grave em ~/Downloads/site/painel/carrosseis/<slug>/ e aponte no slide como nas outras lâminas (mesmo formato do carrossel.json). Mídia que ele mesmo subiu (midia.path) não é apagada.
4. Grave: python3 $A update carrosseis '{"id":"<id>","version":N,"rows":{"slides":[...],"legenda":"...","notas":"..."}}' e atualize também o carrossel.json da pasta. Status continua o que estava.
5. result_note: 1 ou 2 linhas dizendo o que mudou (ex.: "Lâmina 3: dado trocado para 5,2% (IBGE, out/26). Lâmina 5: meme novo.").

## Publicar no site (uma vez, no fim, com tudo que você criou nesta rodada)
No ~/Downloads/site, commit SÓ dos caminhos criados/alterados: git add <caminhos> && git commit -m "carrosseis: pedidos <dia>" -- <caminhos> && git push. Termine a mensagem com a linha "Co-Authored-By: Claude <noreply@anthropic.com>". Nunca use force; se recusar, git pull --rebase --autostash e push de novo; se ainda falhar, avise. Marque os pedidos como "feito" só depois do push.

## Resumo final (curto)
Quais pedidos atendeu, o tipo detectado de cada carrossel e o que ficou pendente.
