# Motor de vídeo do CarrosseL_ (template premium cyberpunk)

Transforma um carrossel em vídeo **Reel 1080x1920** e **X 1920x1080**, no manual `~/Downloads/andersonbrito_marca/design.md`
(fundo #1E1E1E com grid pontilhado, laranja #FF8A00, pêssego #FFDCA9, Creato Display, safe zone do Reels) com a camada
cyberpunk em todo o vídeo:
- partículas de luz com profundidade (atrás e na frente do conteúdo);
- grafo de nós ambiente e grafo ligando título, card e chips;
- HUD com cantos, "ANDERSON.BRITO // CARROSSEL_", timecode, REC piscando, coordenadas de SP e progresso por cena;
- glitch RGB, fatias deslocadas e flash em todo corte;
- scanlines leves e vinheta;
- palavra gigante entrando letra por letra, ou número contando;
- título com palavras entrando com overshoot e sublinhado laranja animado;
- card de tweet em vidro com brilho de borda e punch-in alternado;
- chips com pop e legenda palavra por palavra;
- CTA com avatar e anel girando.

Ritmo e som:
- cada cena é cortada em batidas de 1,5 a 3 s;
- SFX do PEN em cada entrada: whoosh, glitch, impacto no gancho, pop nos chips;
- trilha baixa (-35 LUFS) sob a voz.

## Comando (sempre pela fila única)
```
bash "/Volumes/ANDY 1TB/anderson_Os/07_automacoes/render-fila.sh" \
  python3 ~/Downloads/site/carrosseis/_template_video/motor.py <pasta>/roteiro.json --formato ambos
```
- `--formato reel|x|ambos`.
- `--quadros 1.5,9,20` gera só PNGs de teste em `<pasta>/quadros/` (use antes do render completo).
- O ffmpeg roda com `-threads 2`.
- Leva vários minutos por formato: rode em segundo plano.

## roteiro.json
```json
{
 "voz": "voz.wav",                 // narração (voz clonada; caminho relativo à pasta do roteiro)
 "palavras": "words.txt",          // uma palavra por linha: "palavra inicio fim" (segundos da voz ORIGINAL)
 "velocidade": 1.12,               // se a voz foi acelerada no arquivo final (1.0 = não)
 "trilha": "/Volumes/PEN 128GB/TRILHAS/...mp3",
 "saida_reel": "~/Downloads/site/painel/carrosseis/<slug>/video-reel.mp4",
 "saida_x": "~/Downloads/site/painel/carrosseis/<slug>/video-x.mp4",
 "cenas": [
  {"t0": 0, "t1": 5.2, "tipo": "hook", "tag": "notícia", "numero": "99%",
   "titulo": "A Anthropic *matou* 99% dos apps", "midia": [{"src": "gancho.jpg"}]},
  {"t0": 5.2, "t1": 7, "tipo": "gigante", "palavra": "CALMA.", "subtitulo": "*eu explico*"},
  {"t0": 7, "t1": 16, "tag": "personal finance", "palavra": "SUA CONTA", "titulo": "O Claude *lê sua conta*",
   "titulo2": [9.7, "Chama *Personal Finance*"],
   "midia": [{"src": ".../02-video.mp4", "tipo": "video", "credito": "vídeo: @claudeai"}]},
  {"t0": 16, "t1": 22, "titulo": "O que ele *faz*", "midia": [{"src": "a.jpg"}, {"t": 19, "src": "b.jpg"}],
   "chips": [[16.8, "soma gastos"], [18.6, "avisa o que vence"]], "sons": [[20, "dinheiro"]]},
  {"t0": 22, "t1": 27, "tipo": "cta", "linhas": ["SEGUE O", "@andersonbrito.mp4", "pra não perder os próximos"]},
  {"t0": 48, "t1": 50.9, "tipo": "pergunta", "palavra": "PRÓXIMO ALVO?", "subtitulo": "*comenta* aqui embaixo"},
  {"t0": 50.9, "tipo": "cta", "linhas": ["SEGUE", "@andersonbrito.mp4", "@ilmarlabs"]}
 ]
}
```

Regras das cenas:
- **Tempos:** `t0`, `t1`, `t` dos chips, da troca de mídia e do `titulo2` são em segundos da voz original. O motor divide pela `velocidade`.
- **Destaque:** `*texto*` deixa a palavra laranja, com sublinhado animado.
- **Tipos:**
  - `hook`: abre com número ou palavra gigante e depois mostra o card.
  - `normal` (padrão): palavra gigante, se tiver, e depois o card.
  - `gigante`: tela só de palavra.
  - `pergunta`: palavra gigante com subtítulo.
  - `cta`: avatar, anel girando e linhas.
- **Mídia:**
  - `tipo: "video"` usa os quadros do vídeo e põe o som dele baixo (-24 dB). `"som": false` desliga o som.
  - `inicio` corta o começo do vídeo.
- **Sons extras** (`sons`): `impacto`, `impacto2`, `whoosh`, `whoosh2`, `whoosh3`, `glitch`, `glitch2`, `pop`, `click`, `riser`, `dinheiro`.
- **Cena com chips** fica sempre no layout de card, pra os chips não cobrirem a mídia.
- **CTAs obrigatórios:** uma cena `cta` no meio ("SEGUE O" + @andersonbrito.mp4) e outra no fim (@andersonbrito.mp4 + @ilmarlabs).

## Como a rotina monta o roteiro
1. **Narração:** escreva o roteiro e gere com a voz clonada (Magnific `audio_tts`, voiceId 183468, source "mine"). É a única voz do Anderson; não gaste crédito em mais nada.
2. **Tempo por palavra:** `python3 ~/Downloads/site/carrosseis/_template_video/palavras.py voz.wav words.txt` (mlx_whisper, já instalado). Use `velocidade: 1.0` quando transcrever o arquivo final.
3. **Cenas:** uma por lâmina do carrossel, mais as cenas `cta` do meio e do fim. Os tempos saem de `words.txt`.
4. **Teste:** gere `--quadros` em 6 a 10 segundos, monte a grade e confira a lista do passo 4 de `ROTINA-PEDIDOS.md`.
5. **Render:** rode o render completo e confira a grade de quadros (1 por segundo) antes de entregar.

Exemplo completo e testado: `exemplo-claude-financas/` (gera `video-reel-v2.mp4` e `video-x-v2.mp4`).
