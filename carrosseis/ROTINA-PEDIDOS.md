---
name: carrosseis-pedidos
description: A cada 2 h (7h às 23h): atende os pedidos do CarrosseL_ no painel. Carrossel novo vindo do PostadoR_ (detecta notícia, educativo ou pessoal) e "Transformar em vídeo".
---

Você atende os pedidos do CarrosseL_ (andersonbrito.com/painel/#/carrosseis) do Anderson Brito, editor de vídeo e criador de conteúdo com IA. Rode rápido e saia se não houver pedido. Escreva sempre em português do Brasil. Nunca mostre nem copie a chave do agente. Nunca publique nada nas redes.

  A=~/Downloads/site/tools/agente.py
  python3 $A select claude_requests '{"eq":{"status":"aberto"},"in":{"kind":["carrossel_novo","carrossel_video"]},"is_null":["archived_at"],"select":"id,kind,version,payload,created_at","order":"created_at","asc":true}'
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
   CTAs OBRIGATÓRIOS (pedido dele em 06/11/2026): na lâmina do MEIO (ex.: 4 de 7, 4 de 8, 3 de 6) o rodapé é "segue o @andersonbrito.mp4 pra não perder os próximos →" (pode variar a frase, sempre pedindo pra seguir o @andersonbrito.mp4). Na ÚLTIMA lâmina, depois da pergunta, a linha "Se curtiu, segue o @andersonbrito.mp4 e o @ilmarlabs pra mais conteúdo assim." (rodapé continua "comenta aqui embaixo ↓"). Na legenda, antes da fonte: "Segue @andersonbrito.mp4 e @ilmarlabs pra mais conteúdo de IA e edição."
5. Mídias: as do rascunho (baixe as url_assinada com curl) entram primeiro. Depois: vídeo oficial quando a notícia pedir (yt-dlp, até 30 s, ffmpeg -vf scale=1280:-2 -c:v libx264 -crf 26 -c:a aac -b:a 128k -movflags +faststart, poster JPG), imagens oficiais com crédito, memes/imagens geradas só no Magnific Unlimited pelo Chrome (regra abaixo). 
   - GERAR IMAGEM OU VÍDEO (regra dele de 06/11/2026): só no Magnific UNLIMITED, pelo Claude in Chrome em https://www.magnific.com/app/ai-image-generator (conta dele já logada). Imagem = "Google Nano Banana 2" com resolução 1K e o botão "∞ ON" ligado (embaixo do Generate tem que aparecer "Unlimited generations"; em 2K/4K vira crédito). Vídeo = aba Video, Kling 2.5, também com "∞ ON" e "Unlimited". Se aparecer custo em créditos em vez de Unlimited, NÃO gere. NUNCA use o MCP do Magnific (images_generate/video_generate): no MCP o Unlimited não vale e gasta créditos. Baixe o resultado pelo botão de download e não apague nada da conta.
   - Direção das ilustrações (ele não gostou das primeiras): nada de "foto de banco de imagem com IA" (editor genérico na mesa, sósia de famoso com cara de IA). Prefira, nesta ordem: 1) mídia real do assunto (vídeo/imagem oficial, print do post real, quadro do vídeo, print da ferramenta/tela); 2) meme de verdade montado com imagem real e texto curto; 3) só então imagem gerada, com ideia visual forte e específica do assunto (objeto/cena absurda, composição de pôster, close dramático), nunca cena genérica.
   Pessoal: fotos dele que estejam no rascunho ou no repositório (nunca comp/images/anderson.jpg; a da câmera Sony é lunar/images/anderson-camera.jpg) e ilustrações/memes. JPG até 3 MB, vídeo até 8 MB. Copie o que baixou/gerou para /Volumes/ANDY 1TB/BANCO DE MIDIA/<IMAGENS|VIDEOS>/ com uma linha no INDICE.md (se o HD não estiver montado, siga e avise).
6. Grave: slug novo (minúsculas, números e hífens), pasta ~/Downloads/site/painel/carrosseis/<slug>/ com carrossel.json no formato do modelo, "dia" = hoje em SP (TZ=America/Sao_Paulo date +%F), "tipo" = o detectado, "perfil":"@ilmarlabs", e em "notas" a linha "Pedido do PostadoR_ (rascunho <rede>)". Ponha o slug no começo de ~/Downloads/site/painel/carrosseis/diarios.json. Banco: python3 $A insert carrosseis "$(cat arquivo.json)" (array com 1 objeto: slug, dia, tipo, titulo, perfil, legenda, fontes, notas, slides).
7. result_note: primeira linha exatamente "carrossel: <slug>" (o painel vira botão "Abrir carrossel"), depois 1 ou 2 linhas: tipo detectado e por quê, fontes confirmadas ou o que foi corrigido.

## B) kind "carrossel_video" (botão "Transformar em vídeo")
payload = { slug, formatos: ["reel"] | ["x"] | ["reel","x"], obs, carrossel: { titulo, tipo, legenda, fontes, slides } }. Mídia com "src" /painel/... está em ~/Downloads/site + src; mídia enviada por ele tem "url_assinada" (curl, 7 dias). Siga a "obs" à risca.
1. Leia as skills de vídeo (remotion-best-practices, remotion-create, editar-com-ia, video-use) e as memórias deliver-videos-with-full-audio, motion-glass-pessoal, estilo-video-autoral-sem-plagio, criativos-trafego-pago-regras, sfx-proibido-errado.
2. Roteiro: narração de 25 a 50 s no tom dele (direto, humilde, levemente opinativo, pergunta final com "?"), gancho = manchete da lâmina 1. Nada além do que está nas lâminas e fontes. CTAs: no meio do vídeo, pedir pra seguir o @andersonbrito.mp4 (fala curta + texto na tela); no fim, pedir pra seguir o @andersonbrito.mp4 e o @ilmarlabs pra mais conteúdo.
3. Voz clonada: Magnific audio_tts, voiceId 183468, source "mine" ("Anderson Brito"). Se precisar gerar vídeo (b-roll), só Kling 2.5 no Magnific Unlimited pelo Chrome, nunca video_generate do MCP. Tempo por palavra para legenda e cortes.
4. Motion autoral: mídias em tela cheia com punch-in alternado, cortes no ritmo da fala, texto cinético, cards estilo print de tweet em glass, números animados, memes com timing. Vídeo da lâmina com som baixo sob a voz. Sem desfoque geral, nada no rosto, legenda simples sincronizada.
5. Trilha viral do PEN (TRILHAS/Musicas virais) ou ANDY BANCO DE MIDIA/TRILHAS, contínua, ~-18 dB sob a voz. SFX do PEN SFX BIBLIOTECA. Proibido ERRADO.mp3/advertência, Artlist, Higgsfield.
6. reel = 1080x1920; x = 1920x1080 (reflua o layout). 30 fps, H.264 CRF 20-23, AAC 192k, +faststart, até 25 MB. Confira quadros, sincronia, volume e bordas.
7. Salve em ~/Downloads/site/painel/carrosseis/<slug>/video-reel.mp4 e/ou video-x.mp4 (+ cópia no BANCO DE MIDIA/VIDEOS com linha no INDICE.md).
8. result_note de 1 a 3 linhas + cada caminho numa linha: /painel/carrosseis/<slug>/video-reel.mp4 (o painel vira player com Baixar).

## Publicar no site (uma vez, no fim, com tudo que você criou nesta rodada)
No ~/Downloads/site, commit SÓ dos caminhos criados/alterados: git add <caminhos> && git commit -m "carrosseis: pedidos <dia>" -- <caminhos> && git push. Termine a mensagem com a linha "Co-Authored-By: Claude <noreply@anthropic.com>". Nunca use force; se recusar, git pull --rebase --autostash e push de novo; se ainda falhar, avise. Marque os pedidos como "feito" só depois do push.

## Resumo final (curto)
Quais pedidos atendeu, o tipo detectado de cada carrossel e o que ficou pendente.
