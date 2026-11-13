# Biblioteca de prompts · Kit Editar com Claude

Por Anderson Brito (@andersonbrito.mp4)

91 prompts prontos, separados por tipo de vídeo. Troque o que está entre [colchetes] pelo seu caso, copie e cole no Claude com a sua pasta de edição aberta. Um pedido por vez dá resultado melhor do que tudo junto.

## Índice

1. Animação toon de notícia (4)
2. Corte de podcast (4)
3. Anúncio de negócio local (4)
4. Carrossel que vira vídeo (3)
5. Talking head (5)
6. Decupagem de bruto (3)
7. Notícia e infográfico (3)
8. Motion tipográfico (3)
9. VSL e apresentação (3)
10. Tutorial de tela (3)
11. React e comentário (3)
12. Bastidor com b-roll (3)
13. Depoimento (3)
14. Contagem e lista (2)
15. Antes e depois (2)
16. Teaser de lançamento (2)
17. Stories em sequência (2)
18. Narração com b-roll (3)
19. Meme com lettering (2)
20. Vinheta e abertura (2)
21. Thumb e capa (2)
22. 9:16 e 16:9 (3)
23. Trilha e efeitos (5)
24. Pedir correção (6)
25. Economia de tokens (4)
26. Preparar a máquina (7)
27. design.md e CLAUDE.md (5)

---

## 1. Animação toon de notícia

Desenho animado feito em código explicando uma notícia.

Vídeo de exemplo: /assets/kit-claude/ex-toon.mp4

### 1. Roteiro e plano do toon

**Quando usar:** Primeiro pedido. Você tem a notícia e quer o desenho animado explicando.

```
Quero um vídeo de animação em código, estilo desenho (toon), explicando esta notícia: [link ou texto da notícia]. Duração: [45] segundos, formato 1080x1920. Antes de desenhar qualquer coisa, me entregue: 1) o roteiro de narração em frases curtas, com os números e a fonte da notícia; 2) a lista de personagens e cenários, cada um descrito em uma linha; 3) a tabela de cenas com tempo, o que aparece e o que se mexe. Não renderize nada até eu aprovar.
```

**O que esperar:** Roteiro, lista de personagens e tabela de cenas em texto, em um ou dois minutos. Nada de vídeo ainda.

**Se der errado, peça assim:**

```
O roteiro ficou longo. Reduza para [45] segundos falados (cerca de 110 palavras) e mantenha só os 3 fatos principais.
```

### 2. Personagens e cenário em SVG

**Quando usar:** Depois de aprovar o roteiro. É aqui que o desenho ganha cara.

```
Desenhe em SVG, no estilo do design.md, os personagens e o cenário aprovados: traço grosso, formas simples, no máximo 5 cores, e cada parte do corpo em um grupo separado (cabeça, olhos, boca, braços) para poder animar. Gere uma folha de teste em PNG com todos lado a lado em render/[nome do vídeo]/personagens.png e me diga o caminho.
```

**O que esperar:** Uma imagem com os personagens lado a lado. Você aprova o traço antes de qualquer animação.

**Se der errado, peça assim:**

```
O personagem [nome] ficou genérico. Refaça com [óculos, barba e camisa verde] e deixe a cabeça maior em relação ao corpo. Mande só ele na folha de teste.
```

### 3. Animar no tempo da narração

**Quando usar:** Você já tem a narração gravada (ou gerada) e os personagens aprovados.

```
Use a skill motion-em-codigo. Transcreva brutos/[narracao.wav] com tempo por palavra e anime as cenas do toon: boca abrindo quando há fala, piscar de olhos, troca de cenário a cada fato novo e um texto de 1 a 3 palavras em cada número citado. Tudo calculado pelo tempo do quadro, sem aleatório. Mande uma prévia de 15 segundos em baixa resolução antes do render completo.
```

**O que esperar:** Prévia de 15 segundos com boca, olhos e textos no tempo da fala.

**Se der errado, peça assim:**

```
Em [0:08] o texto entra antes da palavra. Sincronize todas as entradas com o tempo da transcrição e me mande de 0:05 a 0:12.
```

### 4. Toon sem narração gravada

**Quando usar:** Você ainda não gravou a voz e quer ver o vídeo andando.

```
Não tenho narração. Escreva o texto de um toon sobre [assunto] em [40] segundos e monte o vídeo só com animação e texto na tela, com tempo de leitura de pelo menos 0,35 segundo por palavra. Deixe o projeto pronto para receber áudio: quando eu colocar brutos/narracao.wav, você ressincroniza pelas palavras.
```

**O que esperar:** Um vídeo mudo com texto na tela, que depois aceita a sua voz sem refazer as cenas.

**Se der errado, peça assim:**

```
Coloquei a narração em brutos/narracao.wav. Ressincronize as cenas pelas palavras e tire os textos que repetem o que eu falo.
```

---

## 2. Corte de podcast

Vídeo longo virando verticais: decupagem, cortes, gancho e legenda.

Vídeo de exemplo: /assets/kit-claude/ex-podcast.mp4

### 5. Achar os cortes pelo texto

**Quando usar:** Episódio ou live longa. Comece sempre por aqui: é a etapa mais barata.

```
Transcreva brutos/[episodio.mp4] com tempo por palavra e não olhe quadros. Ache [5] trechos de 30 a 60 segundos que funcionam sozinhos, fora de contexto. Para cada um: início e fim, a frase de abertura, por que funciona e um título de até 6 palavras. Ordene do mais forte para o mais fraco. Não corte nada ainda.
```

**O que esperar:** Uma lista numerada de trechos com tempo e motivo. Você escolhe pelos números.

**Se der errado, peça assim:**

```
O trecho [3] começa no meio de um raciocínio. Recue o início até a pergunta que originou a resposta e me diga a nova duração.
```

### 6. Cortar e enquadrar em vertical

**Quando usar:** Depois de escolher os trechos.

```
Use o modelo corte-podcast do pacote de edição. Corte os trechos [1, 2 e 4] da lista em 1080x1920, enquadrando quem está falando. Se trocar de pessoa, troque o enquadramento no corte, sem movimento de câmera. Comece cada corte na primeira palavra da frase e termine 0,2 segundo depois da última. Salve em render/[episodio]/corte-01.mp4 e assim por diante, e me mande um quadro de cada um para eu conferir o enquadramento.
```

**O que esperar:** Um arquivo por corte, já vertical, e um quadro de cada para conferência.

**Se der errado, peça assim:**

```
No corte [2], em [0:14], o enquadramento cortou a cabeça. Suba o quadro e me mande só esse trecho.
```

### 7. Gancho e legenda nos cortes

**Quando usar:** Os cortes estão enquadrados e falta o que prende nos 3 primeiros segundos.

```
Em cada corte, ponha nos 3 primeiros segundos um título de gancho de até 6 palavras no estilo [amarelo] do legendas-virais e, no vídeo todo, legenda de 1 a 3 palavras por vez com a skill legenda-safe-zone. Pinte só a palavra mais forte de cada frase. Antes de queimar, me mostre o texto do gancho e da legenda de cada corte.
```

**O que esperar:** Os textos para revisar e, depois do seu OK, os cortes legendados.

**Se der errado, peça assim:**

```
O gancho do corte [1] entrega a resposta. Reescreva como pergunta ou promessa, sem contar o final, e me dê 3 opções.
```

### 8. Do episódio aos cortes em um pedido

**Quando usar:** Quando você já confia no processo e quer tudo de uma vez.

```
Use a skill editar-com-ia. De brutos/[episodio.mp4], gere [3] cortes verticais de até [60] segundos: transcreva, escolha os trechos mais fortes pelo texto, corte em 1080x1920 com quem fala enquadrado, gancho de até 6 palavras no começo, legenda de 1 a 3 palavras na zona segura e áudio em -14 LUFS. Pare em dois pontos para o meu OK: na lista de trechos e nos textos de gancho e legenda.
```

**O que esperar:** Duas paradas para aprovação e, no fim, os cortes prontos para postar.

**Se der errado, peça assim:**

```
Aprovados os trechos 1 e 3. Troque o 2 pelo próximo da sua lista e siga.
```

---

## 3. Anúncio de negócio local

Anúncio em motion para loja, restaurante, açaí, clínica.

Vídeo de exemplo: /assets/kit-claude/ex-acai.mp4

### 9. Anúncio de 15 segundos para negócio local

**Quando usar:** Loja, restaurante, açaí, barbearia. Você tem fotos, oferta e contato.

```
Crie um anúncio em motion, só com animação em código, para [nome do negócio], que vende [produto] em [bairro e cidade]. Oferta: [oferta e preço]. Chamada final: [peça pelo WhatsApp (11) 90000-0000]. Duração de [15] segundos em 1080x1920. Use as fotos de referencias/[pasta das fotos] e as cores da marca: [cores]. Estrutura: 2 segundos de gancho com o produto, 3 benefícios em telas rápidas, oferta com o preço grande e chamada final parada por 2 segundos. Primeiro me mostre o roteiro em tabela (tempo, texto, o que se mexe).
```

**O que esperar:** Tabela com o roteiro. Depois do OK, uma prévia do anúncio inteiro em baixa resolução.

**Se der errado, peça assim:**

```
O preço está pequeno e some rápido. Deixe o preço ocupando um terço da tela e parado por 2 segundos.
```

### 10. Anúncio sem foto do produto

**Quando usar:** O cliente não mandou material ou as fotos são ruins.

```
Não tenho foto boa de [produto]. Monte o anúncio de [nome do negócio] com ilustração em SVG e ícones do pacote de edição, na paleta [cores]: desenhe o produto em formas simples, anime a montagem dele (um ingrediente ou parte por vez) e feche com oferta e contato. Mostre primeiro o desenho do produto parado para eu aprovar.
```

**O que esperar:** Um desenho do produto para aprovar e, depois, o anúncio animado sem depender de foto.

**Se der errado, peça assim:**

```
O desenho não parece [açaí]. Use [copo transparente, creme roxo, banana e granola por cima] e me mostre de novo.
```

### 11. Três aberturas para testar

**Quando usar:** O anúncio foi aprovado e você quer versões para o tráfego pago.

```
Mantenha o anúncio aprovado e gere mais 2 versões trocando só os 2 primeiros segundos: uma abrindo com uma pergunta e outra com o preço logo de cara. Mesmo som e mesmo final. Nomeie os arquivos como v1, v2 e v3 e me diga o texto de abertura de cada um.
```

**O que esperar:** Três arquivos iguais do segundo 2 em diante, prontos para teste.

**Se der errado, peça assim:**

```
A versão v2 ficou com o mesmo texto da v1. Refaça a abertura com a pergunta "[sua pergunta]".
```

### 12. Versão para feed e para stories

**Quando usar:** Mesmo anúncio em 4:5 e 9:16.

```
Gere o anúncio aprovado também em 1080x1350 (4:5) para o feed. Reposicione textos e produto para o novo quadro em vez de cortar as bordas, e confira com a guia de zona segura do pacote. Mande um quadro de cada cena nos dois formatos, lado a lado.
```

**O que esperar:** Uma folha comparando os dois formatos e o arquivo 4:5.

**Se der errado, peça assim:**

```
Na cena [3] do 4:5 o texto encosta na borda. Deixe pelo menos 80 px de margem em todos os lados.
```

---

## 4. Carrossel que vira vídeo

Lâminas prontas e a versão animada delas.

Vídeo de exemplo: /assets/kit-claude/ex-carrossel.mp4

### 13. Montar o carrossel

**Quando usar:** Você tem o assunto e quer as lâminas prontas.

```
Use o modelo carrossel do pacote de edição. Monte um carrossel de [7] lâminas em 1080x1350 sobre [assunto], no estilo do design.md: capa com gancho de até 7 palavras, uma ideia por lâmina com no máximo 25 palavras e a última com a chamada "[sua chamada]". Me mostre o texto de todas as lâminas antes de gerar as imagens.
```

**O que esperar:** O texto das lâminas para revisar e, depois, as imagens em PNG numeradas.

**Se der errado, peça assim:**

```
A lâmina [4] tem texto demais. Divida em duas e mantenha o total em [8] lâminas.
```

### 14. Transformar o carrossel em vídeo

**Quando usar:** As lâminas existem e você quer um Reels a partir delas.

```
Transforme as lâminas de render/[pasta do carrossel]/ em um vídeo 1080x1920 de [30] segundos: cada lâmina entra com um movimento simples (deslize ou zoom leve), os blocos de texto aparecem na ordem de leitura e ficam tempo suficiente para ler (0,35 segundo por palavra, no mínimo 2 segundos). Centralize a lâmina sobre um fundo do pacote. Som: clique baixo em cada troca. Mande uma prévia das 3 primeiras lâminas.
```

**O que esperar:** Prévia curta com as primeiras lâminas animadas. Aprovando, sai o vídeo completo.

**Se der errado, peça assim:**

```
Está rápido demais para ler. Aumente o tempo de cada lâmina em [1] segundo e tire o zoom.
```

### 15. Do vídeo falado para o carrossel

**Quando usar:** Você já publicou um vídeo e quer reaproveitar o conteúdo.

```
Leia a transcrição de render/[nome do vídeo]/ e transforme o conteúdo em um carrossel de [6] lâminas no modelo carrossel do pacote. Use as minhas frases, encurtadas, sem inventar informação. Capa com o gancho do vídeo. Me mostre o texto antes de gerar.
```

**O que esperar:** Um carrossel fiel ao que você falou, pronto em minutos, sem assistir o vídeo de novo.

**Se der errado, peça assim:**

```
Você mudou o sentido da lâmina [3]. Volte à frase original da transcrição e só encurte.
```

---

## 5. Talking head

Você falando para a câmera, com corte seco e legenda.

### 16. Meu primeiro vídeo

**Quando usar:** Seu primeiro teste. Use um vídeo falado de até 2 minutos.

```
Use a skill editar-com-ia. Edite brutos/[meu-video.mp4] seguindo o design.md e o edicao.md. Objetivo: [ensinar uma dica rápida]. Tire erros, repetições e pausas longas, ponha legenda de 1 a 3 palavras na zona segura, um título de gancho nos 3 primeiros segundos e deixe o áudio em -14 LUFS. Formato 9:16. Antes de renderizar, me mostre o plano em texto e espere o meu OK. Depois me mande uma prévia dos primeiros 20 segundos.
```

**O que esperar:** Primeiro o plano em texto (cortes, gancho, legenda). Depois do OK, uma prévia de 20 segundos em baixa resolução. O vídeo completo sai só quando você aprovar a prévia.

**Se der errado, peça assim:**

```
Assisti a prévia. Em [0:07] a legenda cobre a minha boca: suba 80 px. Em [0:12 a 0:14] corte essa pausa. Gere a v2 só com essas mudanças.
```

### 17. Pedido de edição completo

**Quando usar:** Para os vídeos seguintes, com todas as escolhas no pedido.

```
Use a skill editar-com-ia. Edite brutos/[arquivo.mp4] seguindo o design.md e o edicao.md. Objetivo: [objetivo]. Chamada no fim: [chamada]. Cortes: [poucos, médio ou muitos]. Legenda: [vídeo todo ou só destaques]. Animações: [nenhuma, leve, médio ou pesado]. Trilha e efeitos: [sim ou não]. Formato: [9:16, 16:9 ou os dois]. Antes de renderizar, me mostre o plano em texto e espere o meu OK.
```

**O que esperar:** Um plano que já respeita o seu briefing. Quanto mais campos você preenche, menos idas e vindas.

**Se der errado, peça assim:**

```
O plano está com animação demais. Refaça com animação leve: só o gancho e 2 destaques.
```

### 18. Só o corte seco

**Quando usar:** Você quer limpar a fala e editar o resto por conta própria.

```
Use a skill corte-seco em brutos/[arquivo.mp4]. Me mostre a proposta em texto: o que sai, com tempo, duração e motivo (erro, repetição, silêncio), e o texto corrido do que fica. Só corte depois do meu OK.
```

**O que esperar:** Uma lista numerada de cortes e a duração final estimada. O bruto original não é alterado.

**Se der errado, peça assim:**

```
Aprovado, com ajustes: mantenha o item [4] e não corte nada entre [0:50] e [1:05].
```

### 19. Ficou picotado

**Quando usar:** O corte ficou agressivo e a fala perdeu naturalidade.

```
O vídeo ficou picotado. Refaça o corte com menos intervenções: mantenha de 0,3 a 0,4 segundo entre as frases, não corte dentro de frase e devolva as respirações antes das frases importantes. Me diga quantos cortes eram e quantos ficaram.
```

**O que esperar:** Uma versão com menos cortes e a contagem de antes e depois.

**Se der errado, peça assim:**

```
Ainda está corrido em [0:20 a 0:30]. Nesse trecho, devolva todas as pausas originais.
```

### 20. Três opções de gancho

**Quando usar:** O começo do vídeo está fraco.

```
Leia a transcrição de brutos/[arquivo.mp4] e me proponha 3 opções de gancho visual para os 3 primeiros segundos. Para cada uma: o que aparece na tela, o texto de 1 a 3 palavras e o que seria preciso (print, imagem, animação). Diga qual você escolheria e por quê.
```

**O que esperar:** Três ideias em texto, sem render, para você escolher.

**Se der errado, peça assim:**

```
Gostei da opção [2], mas com o texto "[seu texto]". Monte só esses 3 segundos e me mande.
```

---

## 6. Decupagem de bruto

Mapa do que tem dentro de uma gravação longa.

### 21. Mapa do bruto longo

**Quando usar:** Gravação de 20 minutos ou mais. Você quer saber o que tem dentro sem assistir.

```
Transcreva brutos/[arquivo.mp4] com tempo por palavra e me entregue o mapa da gravação: blocos por assunto com início e fim, resumo de uma linha, nota de 1 a 5 para a força do trecho e marcação de onde há erro, repetição ou silêncio longo. Salve em render/[nome]/decupagem.md. Não olhe quadros e não corte nada.
```

**O que esperar:** Um arquivo de texto com a gravação inteira organizada por assunto. É a base de todo o resto.

**Se der errado, peça assim:**

```
Os blocos ficaram grandes. Quebre em trechos de no máximo [90] segundos.
```

### 22. Vários arquivos da mesma gravação

**Quando usar:** A câmera dividiu a gravação ou você gravou em partes.

```
Liste os arquivos de brutos/[pasta] com duração e data. Transcreva só os primeiros 15 segundos de cada um e proponha a ordem certa e um nome curto para cada, sem espaço e sem acento. Me mostre a tabela de antes e depois e espere o OK. Faça cópias com o nome novo, sem alterar os originais.
```

**O que esperar:** Uma tabela de arquivos na ordem certa, com nomes legíveis.

**Se der errado, peça assim:**

```
O arquivo [nome] é anterior ao [nome]. Corrija a ordem e renumere.
```

### 23. Escolher o melhor take

**Quando usar:** Você repetiu a mesma frase várias vezes na gravação.

```
Na transcrição de brutos/[arquivo.mp4], ache as frases que eu repeti mais de uma vez. Para cada grupo, liste as tentativas com o tempo e indique a melhor pelo texto (completa, sem gaguejo, sem palavra cortada). Em caso de empate, fique com a última. Não corte nada: só me mostre a tabela.
```

**O que esperar:** Uma tabela de takes repetidos com a sua escolha sugerida.

**Se der errado, peça assim:**

```
No grupo [2] prefiro a primeira tentativa. Atualize a tabela e monte só com os takes escolhidos.
```

---

## 7. Notícia e infográfico

Números, gráfico e fonte animados.

### 24. Notícia em infográfico animado

**Quando usar:** Você quer explicar um fato com números, sem aparecer.

```
Monte um vídeo de [40] segundos em 1080x1920 explicando esta notícia: [link ou texto]. Só animação em código no estilo do design.md: uma ideia por tela, os números grandes contando até o valor final, uma linha do tempo quando houver datas e a fonte escrita no rodapé de cada dado. Me mostre primeiro a lista de fatos com a fonte de cada um e o roteiro visual em tabela.
```

**O que esperar:** Lista de fatos com fonte para você conferir e, depois, a prévia do infográfico.

**Se der errado, peça assim:**

```
O dado da tela [3] está sem fonte. Se não houver fonte confiável, tire a tela.
```

### 25. Gráfico animado com os seus dados

**Quando usar:** Você tem os números e quer o gráfico se desenhando.

```
Anime este dado em um gráfico de [barras]: [2022: 10, 2023: 18, 2024: 31]. Título: "[título]". As barras crescem uma por vez em 0,5 segundo cada, o valor aparece em cima de cada uma e a maior fica na cor de destaque do design.md. Duração de [8] segundos, fundo transparente, para eu usar por cima de outro vídeo. Mande um quadro do estado final antes de renderizar.
```

**O que esperar:** Um quadro do gráfico pronto para aprovar e, depois, o clipe com fundo transparente.

**Se der errado, peça assim:**

```
A escala engana: comece o eixo no zero e mostre os valores com uma casa decimal.
```

### 26. Conferir números antes do render

**Quando usar:** Sempre, em vídeo de notícia. Erro de número custa caro.

```
Antes de renderizar, liste todo número, data e nome próprio que aparece na tela ou na narração deste vídeo, com a fonte de onde saiu. Marque o que você não conseguiu confirmar. Não renderize enquanto houver item sem fonte.
```

**O que esperar:** Uma tabela de checagem. Você confere em um minuto o que levaria um render inteiro para descobrir.

**Se der errado, peça assim:**

```
O item [5] está errado: o correto é [valor]. Corrija na tela e na legenda e me mostre o quadro.
```

---

## 8. Motion tipográfico

Só texto em movimento, no ritmo da fala ou da música.

### 27. Tipografia no tempo da fala

**Quando usar:** Você tem só o áudio (narração, trecho de podcast, áudio de WhatsApp).

```
Não tenho vídeo gravado, só o áudio brutos/[audio.wav]. Transcreva com tempo por palavra e monte um vídeo 1080x1920 só com tipografia animada no estilo do design.md: de 1 a 3 palavras por tela, cada grupo entrando no tempo exato da fala, a palavra mais forte de cada frase maior e na cor de destaque. Primeiro o roteiro visual em tabela, depois uma prévia de 15 segundos.
```

**O que esperar:** Tabela de tempos e uma prévia com as palavras entrando junto com a voz.

**Se der errado, peça assim:**

```
As palavras trocam rápido demais. Agrupe em blocos de 2 a 3 palavras e nunca deixe um bloco menos de 0,4 segundo na tela.
```

### 28. Tipografia no ritmo da música

**Quando usar:** Frase curta em cima de uma trilha, sem voz.

```
Analise a batida de referencias/trilhas/[musica.mp3] pelo áudio (detecção de ataques) e me diga o andamento e os tempos das batidas nos primeiros [15] segundos. Depois monte o texto "[sua frase]" entrando uma palavra por batida, com um movimento de escala curto em cada entrada. Mande a lista de tempos antes de animar.
```

**O que esperar:** A lista de batidas com tempo e, depois, o texto pulsando com a música.

**Se der errado, peça assim:**

```
As entradas estão atrasadas em relação à batida. Adiante tudo em [0,08] segundo.
```

### 29. Gancho animado de 3 segundos

**Quando usar:** Só a abertura do vídeo.

```
Crie uma animação para os 3 primeiros segundos: [o título "EDITADO POR IA" digitado letra a letra com cursor piscando]. Dentro da zona segura, com as cores e fontes do design.md, calculada pelo tempo do quadro. Mande um quadro de cada segundo para eu aprovar antes de renderizar.
```

**O que esperar:** Três quadros para aprovar e um clipe de 3 segundos para colocar no começo.

**Se der errado, peça assim:**

```
O texto está pequeno no celular. Aumente até ocupar 80% da largura segura.
```

---

## 9. VSL e apresentação

Vídeo de venda ou de apresentação de produto.

### 30. Roteiro visual da VSL

**Quando usar:** A narração da venda está gravada e falta a imagem.

```
Transcreva brutos/[narracao-vsl.wav] com tempo por palavra e monte o roteiro visual da VSL em tabela: tempo, frase, o que aparece na tela (texto de 1 a 3 palavras, print, número, foto do produto) e o som. Regra: uma informação nova na tela a cada 3 a 5 segundos, nenhuma tela parada por mais de 6. Liste também os prints e fotos que eu preciso te entregar. Não renderize.
```

**O que esperar:** O vídeo inteiro descrito em tabela e a lista do material que falta.

**Se der errado, peça assim:**

```
Entre [1:10 e 1:40] ficou só texto. Proponha 3 imagens ou prints que eu possa gravar para esse trecho.
```

### 31. Cartões de prova

**Quando usar:** Prints de resultado, depoimento ou conversa.

```
Quando a narração disser "[frase]", mostre referencias/prints/[arquivo.png] dentro da moldura de celular do pacote, entrando de baixo para cima e ficando até o fim da frase. Borre nomes, telefones e fotos de terceiros no print. Faça o mesmo para os prints: [lista de arquivos e frases].
```

**O que esperar:** Os prints entrando no momento certo, com os dados de terceiros protegidos.

**Se der errado, peça assim:**

```
O print está ilegível no celular. Dê zoom na parte que importa: [região do print].
```

### 32. Tela de oferta e chamada final

**Quando usar:** O fechamento do vídeo de venda.

```
Monte a tela de oferta dos últimos [20] segundos: nome do produto, a lista do que a pessoa recebe (um item aparecendo por vez, no tempo em que eu falo), o preço [preço] grande e a chamada "[chamada]" parada por 3 segundos no fim. Sem contagem regressiva falsa e sem preço riscado que nunca existiu.
```

**O que esperar:** Uma tela final limpa, com a lista sincronizada com a fala.

**Se der errado, peça assim:**

```
A lista passa da zona segura. Reduza para [4] itens por tela e divida em duas telas.
```

---

## 10. Tutorial de tela

Gravação de tela com zoom, passos e legenda.

### 33. Tutorial a partir da gravação de tela

**Quando usar:** Você gravou a tela narrando o que faz.

```
Edite brutos/[gravacao-de-tela.mp4], que é uma gravação de tela com a minha voz. Pela transcrição: tire erros e repetições, acelere 4x (em vez de cortar) os trechos sem fala maiores que [2] segundos, ponha um rótulo "Passo 1", "Passo 2" no canto cada vez que eu mudar de etapa e legenda de 1 a 3 palavras fora da área onde eu clico. Me mostre a lista de passos e de trechos acelerados antes de renderizar.
```

**O que esperar:** A lista de passos e esperas. Depois, um tutorial mais curto sem perder nenhuma etapa.

**Se der errado, peça assim:**

```
O passo [3] começou no lugar errado. Ele começa quando eu digo "[frase]".
```

### 34. Zoom nos pontos importantes

**Quando usar:** A tela é grande e o detalhe some no celular.

```
Em [0:12, 0:31 e 0:48] dê zoom de 160% na região [canto superior direito, onde fica o botão Exportar], com entrada suave de 0,3 segundo, e segure por 3 segundos. Marque o ponto com o círculo à mão do pacote. Mande um quadro de cada zoom para eu conferir antes de renderizar.
```

**O que esperar:** Um quadro de cada zoom para validar a região.

**Se der errado, peça assim:**

```
O zoom de [0:31] pegou a área errada. O botão fica [mais à esquerda, no menu lateral].
```

### 35. Tela horizontal em vídeo vertical

**Quando usar:** Gravação 16:9 que precisa virar Reels.

```
Monte a versão 1080x1920 de brutos/[gravacao.mp4]: a tela dentro da moldura de navegador do pacote ocupando a parte de cima, legenda grande embaixo e um fundo do pacote atrás. Onde eu indicar zoom, a moldura mostra só a região ampliada. Mande 10 segundos de prévia.
```

**O que esperar:** Um vertical em que dá para ler a tela no celular.

**Se der errado, peça assim:**

```
A tela ficou pequena. Aumente a moldura até a largura segura inteira e diminua a legenda.
```

---

## 11. React e comentário

Você comentando em cima de outro vídeo.

### 36. React com o original e eu na tela

**Quando usar:** Você gravou o seu comentário e tem o vídeo que está comentando.

```
Monte um react em 1080x1920: o vídeo original brutos/[original.mp4] na parte de cima e a minha gravação brutos/[meu-comentario.mp4] embaixo. Sincronize pelo áudio: quando eu falo, o original pausa e fica com 40% de brilho; quando eu paro, ele volta. Legenda só na minha fala. Antes de montar, me mostre a tabela de quem fala em cada trecho.
```

**O que esperar:** A tabela de trechos e, depois, uma prévia do react. Use só material que você tem direito de usar e dê o crédito na tela.

**Se der errado, peça assim:**

```
Em [0:22] o original voltou enquanto eu ainda falava. Só retome o original 0,3 segundo depois da minha última palavra.
```

### 37. Eu recortado por cima do vídeo

**Quando usar:** Estilo comentarista no canto da tela.

```
Coloque a minha gravação brutos/[meu-comentario.mp4] recortada (sem fundo) no canto inferior [esquerdo] do vídeo brutos/[original.mp4], ocupando um terço da largura, sem cobrir o que importa do original. Se o recorte ficar ruim no cabelo, use uma moldura redonda em vez de recortar. Mande um quadro de teste.
```

**O que esperar:** Um quadro de teste com você posicionado. Recorte sem fundo verde nem sempre fica limpo: a moldura redonda é o plano B.

**Se der errado, peça assim:**

```
O recorte ficou serrilhado. Troque pela moldura redonda com borda na cor de destaque.
```

### 38. Crédito e contexto na tela

**Quando usar:** Todo react.

```
Adicione o crédito do vídeo original no canto superior, dentro da zona segura: "[@perfil ou nome do canal]", visível durante todo o trecho em que o original aparece. Nos 3 primeiros segundos, ponha um título de até 6 palavras dizendo o que eu vou comentar.
```

**O que esperar:** Crédito fixo e título de contexto. Ajuda quem assiste e reduz o risco de denúncia.

**Se der errado, peça assim:**

```
O crédito está cobrindo o rosto de quem fala no original. Mova para o canto oposto.
```

---

## 12. Bastidor com b-roll

Reels de bastidor montado com vários clipes.

### 39. Reels de bastidor com vários clipes

**Quando usar:** Você tem uma pasta com clipes soltos do dia.

```
Liste os clipes de brutos/[pasta] com duração e orientação. Veja um único quadro pequeno de cada um para descrever o que mostra, em uma linha. Depois proponha uma montagem de [20] segundos em 1080x1920: ordem dos clipes, de 1 a 2 segundos cada, começando pelo mais chamativo e terminando no resultado. Não renderize antes do meu OK.
```

**O que esperar:** Uma lista com a descrição de cada clipe e a ordem proposta. Gasta pouco porque olha um quadro por clipe.

**Se der errado, peça assim:**

```
Troque a ordem: comece pelo clipe [nome] e tire o [nome], que está tremido.
```

### 40. Cortes na batida da música

**Quando usar:** A montagem está aprovada e você quer ritmo.

```
Ache os tempos das batidas de referencias/trilhas/[musica.mp3] e ajuste a montagem para cada troca de clipe cair em uma batida. Clipes com movimento ficam 2 batidas, os parados ficam 1. Trilha contínua, sem corte no meio. Mande a prévia completa em baixa resolução.
```

**O que esperar:** A mesma montagem com as trocas encaixadas na música.

**Se der errado, peça assim:**

```
As trocas estão um pouco depois da batida. Adiante todos os cortes em [2] quadros.
```

### 41. Texto contando a história

**Quando usar:** Bastidor sem fala precisa de contexto.

```
Escreva [4] textos curtos, de até 5 palavras cada, que contem a história deste bastidor: [o que aconteceu no dia]. Coloque um a cada 4 ou 5 segundos, no estilo do design.md, dentro da zona segura e sem cobrir a ação. Me mostre os textos antes de aplicar.
```

**O que esperar:** Quatro frases para aprovar e, depois, aplicadas no vídeo.

**Se der errado, peça assim:**

```
Os textos estão genéricos. Use os fatos: [número de horas, local, nome do cliente].
```

---

## 13. Depoimento

Cliente falando, com nome e frase em destaque.

### 42. Melhor trecho de um depoimento

**Quando usar:** O cliente mandou um vídeo ou áudio longo.

```
Transcreva brutos/[depoimento.mp4] e ache o trecho de até [30] segundos em que a pessoa fala do resultado, com número ou fato concreto. Não emende frases distantes para mudar o sentido. Me mostre o texto do trecho e as alternativas antes de cortar.
```

**O que esperar:** O trecho mais forte em texto, com opções. O sentido da fala original é mantido.

**Se der errado, peça assim:**

```
Prefiro começar na frase "[frase]". Ajuste o início e me diga a nova duração.
```

### 43. Nome e frase em destaque

**Quando usar:** O corte está escolhido.

```
No depoimento cortado, coloque o lower third do pacote com "[nome]" e "[cidade ou profissão]" nos primeiros 4 segundos, legenda de 1 a 3 palavras e a frase "[frase mais forte]" em destaque quando ela for dita. Normalize o áudio em -14 LUFS e reduza o ruído de fundo só se a voz continuar natural.
```

**O que esperar:** Depoimento com identificação, legenda e áudio nivelado.

**Se der errado, peça assim:**

```
A voz ficou metálica depois da limpeza. Volte ao áudio original e só normalize.
```

### 44. Compilado de vários clientes

**Quando usar:** Três ou mais depoimentos curtos.

```
Monte um compilado de [45] segundos com os depoimentos de brutos/[pasta]: uma frase forte de cada pessoa, de 5 a 10 segundos, com o nome de cada uma na tela. Ordene do resultado mais concreto para o mais geral, iguale o volume entre as vozes e feche com a tela "[chamada]". Me mostre as frases escolhidas antes.
```

**O que esperar:** As frases escolhidas para aprovação e, depois, o compilado com as vozes no mesmo volume.

**Se der errado, peça assim:**

```
A pessoa [nome] está bem mais baixa que as outras. Iguale pelo volume da fala, não pelo pico.
```

---

## 14. Contagem e lista

Top 5, 3 erros, 7 dicas.

### 45. Top 5 com contador

**Quando usar:** Vídeo falado em formato de lista.

```
Em brutos/[arquivo.mp4] eu cito [5] itens. Pela transcrição, ache o momento em que começo cada um. Coloque o contador do pacote ("1/5", "2/5") no canto e o nome de cada item em até 3 palavras entrando quando eu falo a palavra-chave: [item 1, item 2, item 3, item 4, item 5]. Barra de progresso fina no topo da zona segura. Me mostre a tabela de tempos antes.
```

**O que esperar:** A tabela com o tempo de cada item e, depois, o vídeo com contador e barra.

**Se der errado, peça assim:**

```
O item [3] entra cedo. Ele começa quando eu digo "[frase]".
```

### 46. Lista só em animação

**Quando usar:** Você não gravou nada e quer um vídeo de lista.

```
Monte um vídeo de [25] segundos em 1080x1920, só com animação em código no estilo do design.md, com a lista "[título da lista]": [item 1; item 2; item 3; item 4; item 5]. Do último para o primeiro, cada item com número grande, nome em até 4 palavras e um ícone do pacote. O primeiro lugar fica 1 segundo a mais na tela. Mande a prévia inteira em baixa resolução.
```

**O que esperar:** Um vídeo de contagem pronto para receber trilha ou a sua narração.

**Se der errado, peça assim:**

```
O ícone do item [2] não tem relação com o assunto. Troque por [ícone] ou tire.
```

---

## 15. Antes e depois

Comparação lado a lado ou em sequência.

### 47. Antes e depois lado a lado

**Quando usar:** Duas imagens ou dois vídeos do mesmo objeto.

```
Monte um antes e depois em 1080x1920 com referencias/[antes] e referencias/[depois]: tela dividida ao meio com uma linha que desliza da esquerda para a direita em [3] segundos revelando o depois, rótulos "ANTES" e "DEPOIS" dentro da zona segura e 2 segundos parados no fim. Alinhe as duas imagens pelo mesmo enquadramento antes de animar e me mostre o quadro alinhado.
```

**O que esperar:** Um quadro de alinhamento para aprovar e o clipe com a revelação.

**Se der errado, peça assim:**

```
As duas imagens não estão na mesma escala. Aumente o antes em [8]% e alinhe pela [linha do horizonte].
```

### 48. Antes, processo e depois

**Quando usar:** Transformação com etapas (reforma, edição, maquiagem, obra).

```
Monte uma sequência de [20] segundos com os arquivos de brutos/[pasta], na ordem: antes (2 segundos, parado), processo (clipes de 1 segundo, acelerados quando forem longos) e depois (3 segundos, com zoom lento). Texto de 1 a 3 palavras em cada fase. Um impacto sonoro só na revelação do depois.
```

**O que esperar:** Uma sequência curta em que o resultado aparece no fim, com um único som forte.

**Se der errado, peça assim:**

```
A revelação ficou sem peso. Deixe 0,3 segundo de tela preta e silêncio antes do depois.
```

---

## 16. Teaser de lançamento

Trailer curto com data.

### 49. Teaser de lançamento

**Quando usar:** Produto, curso, evento ou vídeo novo com data marcada.

```
Monte um teaser de [15] segundos em 1080x1920 para o lançamento de [produto], no dia [data]. Estrutura: 3 clipes ou imagens de até 1 segundo cada sem revelar o produto inteiro, uma frase de até 5 palavras, o nome do produto e a data parada por 2 segundos. Use o material de referencias/[pasta] e o estilo do design.md. Roteiro em tabela primeiro.
```

**O que esperar:** Um roteiro em tabela e, depois, um teaser que termina na data.

**Se der errado, peça assim:**

```
Está mostrando demais. Use só detalhes e recortes do produto, nunca ele inteiro.
```

### 50. Série de contagem regressiva

**Quando usar:** Faltam poucos dias e você quer um vídeo por dia.

```
A partir do teaser aprovado, gere [3] versões de 6 segundos para os dias que antecedem o lançamento: "Faltam 3 dias", "Faltam 2 dias", "É amanhã". Mesmo visual, mudando só o texto e um detalhe de cor. Nomeie os arquivos com o dia de publicação.
```

**O que esperar:** Uma série curta e consistente, pronta para agendar.

**Se der errado, peça assim:**

```
As três versões estão idênticas além do texto. Troque também o clipe de fundo em cada uma.
```

---

## 17. Stories em sequência

Um assunto dividido em partes de 15 segundos.

### 51. Dividir um vídeo em stories

**Quando usar:** Vídeo falado mais longo que vai para os stories.

```
Divida render/[nome do vídeo]/final.mp4 em partes de até [15] segundos para stories. Corte sempre no fim de uma frase, nunca no meio da palavra. Numere no canto ("1/5") e deixe livre a área de cima e de baixo, onde o aplicativo põe os botões. Me mostre onde cai cada corte antes de exportar.
```

**O que esperar:** A lista de cortes por frase e os arquivos numerados na ordem.

**Se der errado, peça assim:**

```
A parte [3] termina no meio de uma ideia. Junte com a 4 e corte na frase seguinte.
```

### 52. Sequência de stories do zero

**Quando usar:** Você quer contar algo em telas, sem gravar.

```
Monte uma sequência de [5] stories em 1080x1920 sobre [assunto], no estilo do design.md: o primeiro com uma pergunta, os do meio com uma ideia cada em até 20 palavras e o último com a chamada "[chamada]". Deixe um espaço vazio marcado onde eu vou colar a caixinha de pergunta ou o link. Exporte em PNG e me mostre a folha com todos.
```

**O que esperar:** Cinco imagens e uma folha de conferência, com espaço reservado para os adesivos do aplicativo.

**Se der errado, peça assim:**

```
O story [2] está com texto demais para 5 segundos. Corte para no máximo 12 palavras.
```

---

## 18. Narração com b-roll

Voz em off coberta por imagens.

### 53. Lista de b-roll a partir da narração

**Quando usar:** Você tem a voz e precisa saber o que filmar ou buscar.

```
Transcreva brutos/[narracao.wav] e me entregue a lista de b-roll: para cada frase, o tempo, o que a imagem deveria mostrar e se dá para resolver com clipe, foto, print ou animação. Marque os trechos em que a imagem é obrigatória e os que podem ficar com texto na tela.
```

**O que esperar:** Uma lista de imagens por frase. Serve de roteiro de filmagem ou de busca.

**Se der errado, peça assim:**

```
Tem pedido de imagem que eu não consigo filmar. Para os itens [4 e 7], proponha uma alternativa com animação.
```

### 54. Cobrir a narração com os clipes

**Quando usar:** Os clipes estão na pasta.

```
Monte um vídeo com a narração brutos/[narracao.wav] e os clipes de brutos/[pasta de b-roll]. Olhe um quadro pequeno de cada clipe para saber o que mostra, e case cada um com a frase que ele ilustra. Troque de imagem a cada 2 a 4 segundos, sempre em fim de frase ou em vírgula. Áudio dos clipes mudo. Me mostre a tabela de frase e clipe antes de montar.
```

**O que esperar:** A tabela que casa frase com clipe e, depois, a prévia com a narração coberta.

**Se der errado, peça assim:**

```
O clipe de [0:15] não tem relação com a frase. Troque por [nome do clipe] ou por texto na tela.
```

### 55. Narração em cima de fotos

**Quando usar:** Só fotos paradas, sem vídeo.

```
Monte o vídeo da narração brutos/[narracao.wav] com as fotos de referencias/[pasta]. Cada foto com um movimento lento (zoom de 100% para 108% ou deslize), nunca parada e nunca cortando rosto. Fotos horizontais em vídeo vertical ficam sobre um fundo do pacote, sem esticar. Legenda de 1 a 3 palavras.
```

**O que esperar:** Um vídeo com movimento suave em cada foto, sem distorção.

**Se der errado, peça assim:**

```
O zoom está enjoativo. Alterne: uma foto com zoom para dentro, a próxima com deslize lateral.
```

---

## 19. Meme com lettering

Texto em cima de um clipe curto.

### 56. Meme com texto em cima

**Quando usar:** Clipe curto de reação com uma frase.

```
No clipe brutos/[clipe.mp4], coloque o texto "[frase do meme]" na parte de cima, dentro da zona segura, em caixa alta, branco com contorno preto, no máximo 2 linhas. O texto fica do começo ao fim. Corte o clipe para [6] segundos terminando logo depois da reação. Não mexa no áudio original.
```

**O que esperar:** O clipe curto com o texto fixo, pronto para postar.

**Se der errado, peça assim:**

```
O texto está quebrando em 3 linhas. Diminua a fonte até caber em 2, sem passar da largura segura.
```

### 57. Texto de destaque no ponto da piada

**Quando usar:** A graça está em uma palavra ou em um momento exato.

```
No clipe brutos/[clipe.mp4], em [0:03], faça entrar a palavra "[palavra]" no estilo [vermelho] do legendas-virais, com um zoom rápido de 110% no rosto e um único efeito sonoro curto. Nada antes disso: o começo fica limpo para a piada funcionar.
```

**O que esperar:** Um único destaque no tempo certo. Menos efeito, mais graça.

**Se der errado, peça assim:**

```
O destaque entrou depois da reação. Adiante para [0:02,6].
```

---

## 20. Vinheta e abertura

Abertura, encerramento e tela final.

### 58. Vinheta de abertura

**Quando usar:** Uma abertura curta para todos os vídeos do canal.

```
Crie uma vinheta de [3] segundos em 1920x1080 e em 1080x1920 com o nome "[nome do canal]", no estilo do design.md: [o nome se monta letra a letra e um traço sublinha no fim]. Fundo [transparente ou cor]. Um som curto na entrada. Calculada pelo tempo do quadro. Mande 3 quadros (início, meio e fim) antes de renderizar.
```

**O que esperar:** Três quadros para aprovar e a vinheta nos dois formatos, reutilizável.

**Se der errado, peça assim:**

```
Está longa para Reels. Faça uma versão de 1,5 segundo só com o final da animação.
```

### 59. Tela final com chamada

**Quando usar:** O encerramento padrão dos seus vídeos.

```
Crie uma tela final de [4] segundos com "[chamada, por exemplo: siga para a parte 2]" e o meu arroba [@perfil], no estilo do design.md, com a seta do pacote apontando para onde fica o botão de seguir. Salve como modelo em render/_modelos/tela-final para eu reaproveitar, com o texto fácil de trocar.
```

**O que esperar:** Uma tela final reaproveitável em que você só troca o texto.

**Se der errado, peça assim:**

```
A seta aponta para o lugar errado no Instagram. Aponte para [o canto inferior esquerdo, onde fica o nome do perfil].
```

---

## 21. Thumb e capa

Capa do vídeo a partir de um quadro.

### 60. Capa a partir de um quadro do vídeo

**Quando usar:** O vídeo está pronto e falta a capa.

```
Gere uma grade com um quadro a cada [3] segundos de render/[nome]/final.mp4, em tamanho pequeno, e escolha os 3 melhores para capa (rosto nítido, olhos abertos, expressão forte). Me mostre os 3. Depois que eu escolher, monte a capa em [1080x1920] com o texto "[texto de até 4 palavras]" grande, no estilo do design.md, sem cobrir o rosto.
```

**O que esperar:** Três candidatos para escolher e, depois, a capa pronta em PNG.

**Se der errado, peça assim:**

```
O texto some quando a capa aparece pequena no perfil. Deixe o texto no terço central e aumente 30%.
```

### 61. Três variações de capa

**Quando usar:** Você quer testar texto e cor.

```
Com o mesmo quadro, gere 3 capas: uma com o texto "[opção 1]", uma com "[opção 2]" e uma só com a imagem e um elemento de destaque (círculo ou seta do pacote). Mostre as três lado a lado, em tamanho de miniatura, para eu ver qual lê melhor pequena.
```

**O que esperar:** Uma folha com as três capas no tamanho em que o público realmente vê.

**Se der errado, peça assim:**

```
Nenhuma lê bem pequena. Reduza o texto para 2 palavras e aumente o contraste com o fundo.
```

---

## 22. 9:16 e 16:9

O mesmo vídeo em mais de um formato.

### 62. Segundo formato do mesmo vídeo

**Quando usar:** A versão vertical está aprovada e falta a horizontal (ou o contrário).

```
Use a skill vertical-e-horizontal. A versão [9:16] está aprovada. Gere agora a [16:9] a partir da montagem limpa (sem texto queimado), refazendo a posição da legenda e dos textos para o novo formato. Mesmo corte e mesmo som. Antes, me diga como pretende enquadrar e me mande uma prévia de 10 segundos.
```

**O que esperar:** Uma explicação do enquadramento, uma prévia e depois o segundo arquivo com os textos reposicionados.

**Se der errado, peça assim:**

```
No horizontal o meu rosto ficou pequeno. Aproxime o enquadramento em [15]% e mantenha os olhos no terço de cima.
```

### 63. Conferir antes de postar

**Quando usar:** Sempre, antes de publicar.

```
Use a skill conferir-render em render/[nome]/[arquivo.mp4]. Quero: dados do arquivo, quadros pretos ou congelados, grade de quadros a cada [5] segundos com as faixas proibidas marcadas, volume e picos, e o checklist final. Diga o que você mediu, o que viu por amostra e o que só eu posso julgar.
```

**O que esperar:** Um relatório curto separando o que foi medido do que depende do seu olho.

**Se der errado, peça assim:**

```
Você disse que está tudo certo, mas em [0:41] a legenda sai da zona segura. Confira de novo esse trecho quadro a quadro.
```

### 64. Reduzir o tamanho do arquivo

**Quando usar:** O arquivo passou do limite do WhatsApp, do e-mail ou da plataforma.

```
O arquivo final ficou com [tamanho atual] e eu preciso de no máximo [limite] MB. Reencode mantendo a resolução e a melhor qualidade possível dentro do limite, sem mexer no áudio. Me diga o tamanho final e se dá para notar perda.
```

**O que esperar:** Uma cópia menor, com o original preservado.

**Se der errado, peça assim:**

```
Deu para notar perda nas áreas escuras. Refaça em duas passadas e, se não couber, reduza para 720p.
```

---

## 23. Trilha e efeitos

Efeitos sonoros, música e volume final.

### 65. Som completo

**Quando usar:** O vídeo está montado e mudo de efeitos.

```
Use a skill som-e-trilha. Coloque efeitos sonoros nas entradas de texto e de cartão (clique, papel e whoosh baixos), no máximo 2 ou 3 impactos nos momentos principais, e a trilha referencias/trilhas/[arquivo.mp3] contínua e baixa, com a voz sempre acima. Normalize em -14 LUFS. Me mostre antes a tabela de efeitos com tempo e volume.
```

**O que esperar:** Uma tabela de sons para aprovar e, depois, o vídeo com mixagem equilibrada.

**Se der errado, peça assim:**

```
Tem efeito demais. Tire todos os sons das legendas e deixe só nas entradas de cartão e nos 2 impactos.
```

### 66. Usar o pack de som do kit

**Quando usar:** Você tem o Pack Impacto ou o Pack Estúdio.

```
Meu pack de som fica em [caminho da pasta do pack]. Leia o LEIA-ME e o indice.csv de lá, sem ouvir nem listar arquivo por arquivo, e salve um resumo das categorias em referencias/sons.md. A partir de agora, escolha os efeitos e as trilhas por esse índice, sempre respeitando os volumes sugeridos no LEIA-ME.
```

**O que esperar:** O Claude passa a conhecer a sua biblioteca pelo índice, sem gastar limite abrindo cada som.

**Se der errado, peça assim:**

```
Você usou o mesmo whoosh 6 vezes. Varie entre pelo menos 3 arquivos da mesma categoria.
```

### 67. Escolher onde vão os impactos

**Quando usar:** Para não exagerar no som forte.

```
Pela transcrição e pela tabela de animações, quais são os 2 ou 3 momentos deste vídeo que merecem um efeito de impacto? Justifique cada um em uma linha. Todo o resto fica com som discreto ou sem som.
```

**O que esperar:** Dois ou três pontos justificados. O impacto funciona porque é raro.

**Se der errado, peça assim:**

```
Troque o impacto de [0:10] pelo de [0:27], que é a virada do vídeo.
```

### 68. A música está alta

**Quando usar:** A trilha disputa com a voz.

```
A música está alta. Baixe a trilha [3] dB no vídeo todo, confira pelos números que a voz fica pelo menos 12 dB acima dela, normalize de novo em -14 LUFS e me mande 15 segundos de prévia. Salve o novo volume da trilha como regra no edicao.md.
```

**O que esperar:** Prévia com a voz na frente e a regra salva para os próximos vídeos.

**Se der errado, peça assim:**

```
Agora a trilha sumiu. Suba 1,5 dB e mantenha esse valor como padrão.
```

### 69. Só normalizar o volume

**Quando usar:** O vídeo veio de outro editor e só o volume está errado.

```
Não mexa em nada da edição. Só normalize o áudio de render/[nome]/[arquivo.mp4] para -14 LUFS com pico de até -1,5 dBTP, em duas passadas, sem reencodar o vídeo. Me mostre o volume antes e depois.
```

**O que esperar:** O mesmo vídeo, com o volume padrão das plataformas e a imagem intacta.

**Se der errado, peça assim:**

```
O pico estourou em [0:33]. Aplique um limitador antes da normalização e meça de novo.
```

---

## 24. Pedir correção

Feedback com tempo exato e regra salva.

### 70. Feedback com tempo exato

**Quando usar:** Depois de assistir qualquer prévia. É o prompt que você mais vai usar.

```
Assisti a prévia. Corrija:
1. [0:12] a letra está grande demais
2. [0:20 a 0:22] corte essa pausa
3. [0:31] o cartão entra antes de eu falar, atrase
4. [final] segure o último texto por mais 1 segundo
5. [vídeo todo] a música está alta
Gere a v2 só com essas mudanças e me diga o que mudou em cada item.
```

**O que esperar:** Uma v2 que mexe só no que você apontou, com o relatório item por item.

**Se der errado, peça assim:**

```
Você mudou coisa que eu não pedi em [0:40]. Volte esse trecho para como estava na v1.
```

### 71. Pedir uma prévia curta

**Quando usar:** Antes de qualquer render completo.

```
Use a skill previa-e-feedback. Renderize só os primeiros [20] segundos em baixa resolução, com o tempo aparecendo no canto da tela. Confira você mesmo antes de me mostrar e me diga o caminho do arquivo.
```

**O que esperar:** Um arquivo leve com o relógio na tela, para você apontar o tempo exato.

**Se der errado, peça assim:**

```
Quero ver outro trecho: renderize de [0:45 a 1:05] do mesmo jeito.
```

### 72. O corte comeu uma palavra

**Quando usar:** O erro mais comum de corte seco.

```
Em [0:18] o corte comeu o fim da palavra "[palavra]". Refaça esse ponto de corte deixando uma folga depois da palavra, confira os outros cortes pelo mesmo critério e me mande uma prévia só desse trecho com 2 segundos antes e depois.
```

**O que esperar:** O ponto corrigido e uma revisão dos demais cortes.

**Se der errado, peça assim:**

```
Agora sobrou uma respiração. Deixe a folga em 0,1 segundo.
```

### 73. Salvar a correção como regra

**Quando usar:** No fim de toda edição. É o que faz o próximo vídeo sair melhor.

```
Salve todas as correções desta edição no edicao.md, seção "Feedback acumulado", cada uma como uma regra geral de uma frase, com número quando houver, e a origem (vídeo e tempo). O que for regra de estética vai também para o design.md. Me mostre as linhas que você adicionou.
```

**O que esperar:** As regras novas escritas no seu arquivo. O Claude lê isso antes da próxima edição.

**Se der errado, peça assim:**

```
A regra [3] ficou específica demais deste vídeo. Reescreva de um jeito que valha para todos.
```

### 74. Deu erro

**Quando usar:** Apareceu uma mensagem de erro e você não sabe o que é.

```
Deu esse erro (print anexado). Descubra a causa, corrija e me avise quando estiver resolvido. Me explique em uma frase o que era.
```

**O que esperar:** Na maioria das vezes ele resolve sozinho e explica em linguagem simples.

**Se der errado, peça assim:**

```
O erro continua. Pare de repetir a mesma tentativa: me diga 2 caminhos diferentes e qual você recomenda.
```

### 75. Aprovado, pode finalizar

**Quando usar:** A prévia está do jeito que você quer.

```
Aprovado. Renderize o vídeo completo em qualidade final, confira o render com a skill conferir-render e me entregue o relatório com o caminho do arquivo.
```

**O que esperar:** O arquivo final e o relatório de conferência.

**Se der errado, peça assim:**

```
O final ficou diferente da prévia em [0:50]. Compare os dois e me diga o que mudou.
```

---

## 25. Economia de tokens

Gastar menos do seu limite de uso.

### 76. Regras para gastar menos

**Quando usar:** No começo de toda sessão de edição, se a skill economia-de-tokens não estiver instalada.

```
Nesta sessão, siga estas regras para economizar o meu limite: trabalhe pela transcrição antes de olhar qualquer quadro; quando precisar ver imagem, use uma grade pequena de poucos quadros e só do trecho necessário; nunca abra o vídeo inteiro quadro a quadro; não releia arquivos que você já leu; mostre o plano em texto antes de renderizar; e faça prévias curtas em baixa resolução.
```

**O que esperar:** Edições que consomem bem menos do seu limite, porque texto é barato e imagem é cara.

**Se der errado, peça assim:**

```
Você abriu quadros demais. Daqui em diante, me pergunte antes de olhar qualquer imagem.
```

### 77. Retomar em uma sessão nova

**Quando usar:** A conversa ficou longa ou você voltou no dia seguinte. Sessão nova gasta menos.

```
Estou retomando a edição do vídeo [nome]. Leia design.md, edicao.md e os arquivos de texto em render/[nome]/ (briefing, plano, notas e feedback). Me diga em 5 linhas em que ponto paramos e qual é o próximo passo. Não renderize nada ainda.
```

**O que esperar:** Um resumo curto do ponto em que o trabalho parou, sem reprocessar o vídeo.

**Se der errado, peça assim:**

```
Faltou contexto. Antes de eu fechar esta sessão, escreva em render/[nome]/notas.md tudo que a próxima sessão precisa saber.
```

### 78. Analisar uma referência sem assistir

**Quando usar:** Você quer aprender com o vídeo de outro criador.

```
Analise referencias/[referencia.mp4] sem assistir quadro a quadro: use os dados do arquivo, a contagem de trocas de cena e uma grade pequena de quadros. Me diga o ritmo de corte (segundos por plano), como é a legenda (tamanho aproximado, posição, quantas palavras por vez), as cores dominantes e o tipo de animação. O que dali vale levar para o meu design.md?
```

**O que esperar:** Um raio X da referência em números, por uma fração do custo de assistir.

**Se der errado, peça assim:**

```
Quero mais detalhe só do gancho: analise os primeiros 3 segundos com 1 quadro a cada meio segundo.
```

### 79. Só o plano, sem render

**Quando usar:** Você quer decidir antes de gastar.

```
Não renderize nada. Transcreva brutos/[arquivo.mp4] e me entregue só o plano de edição em texto: gancho dos 3 primeiros segundos, lista de cortes com tempo e motivo, textos de 1 a 3 palavras com o tempo de entrada, onde entra efeito sonoro (no máximo 2 ou 3 impactos) e a duração final estimada.
```

**O que esperar:** O vídeo inteiro decidido em texto. Corrigir texto leva segundos, corrigir render leva minutos.

**Se der errado, peça assim:**

```
O plano passou de [60] segundos. Proponha o que sai para caber, sem cortar palavra pela metade.
```

---

## 26. Preparar a máquina

Instalação, pasta e skills.

### 80. Instalar tudo que precisa

**Quando usar:** Primeiro pedido no computador novo.

```
Prepare este computador para eu editar vídeos com você. Verifique e instale o que faltar: FFmpeg e FFprobe (confira se o FFmpeg tem os filtros ass e drawtext, usados para legenda e texto), Python 3 com pillow e numpy, um transcritor com tempo por palavra (faster-whisper) e Node.js. Antes de instalar cada coisa, me diga o que é e para que serve. No fim, faça um teste rápido de cada um e me mostre uma tabela com nome, se está instalado e a versão.
```

**O que esperar:** O Claude pede permissão para rodar os comandos, instala o que falta e termina com uma tabela de conferência. Leva de 5 a 20 minutos, conforme a internet.

**Se der errado, peça assim:**

```
A tabela mostra que [FFmpeg] falhou. Descubra a causa, tente outro método de instalação e teste de novo.
```

### 81. Conferir sem instalar nada

**Quando usar:** Você já tem coisa instalada e quer só o diagnóstico.

```
Não instale nada. Só confira o que este computador já tem para edição de vídeo: FFmpeg, FFprobe, Python, Whisper ou faster-whisper, Node.js e Remotion. Me mostre uma tabela com o nome, se está instalado e a versão.
```

**O que esperar:** Uma tabela com o que existe e o que falta.

**Se der errado, peça assim:**

```
Instale só o que está faltando na tabela, um por vez, me avisando antes de cada um.
```

### 82. Criar a pasta de edição

**Quando usar:** Depois de instalar, dentro da pasta que você escolheu.

```
Crie nesta pasta a estrutura de edição: brutos/, referencias/ (com subpastas fontes/, trilhas/, sfx/ e prints/) e render/. Não mova nenhum arquivo que já esteja aqui sem me perguntar.
```

**O que esperar:** Três pastas principais prontas. Brutos entram em brutos/ e tudo que o Claude gera sai em render/.

**Se der errado, peça assim:**

```
Já tenho arquivos soltos aqui. Liste e proponha para onde cada um vai, sem mover nada ainda.
```

### 83. Colocar o material do kit no lugar

**Quando usar:** Você baixou os arquivos do kit e descompactou.

```
Baixei o material do kit em [caminho da pasta de downloads]. Copie os arquivos de modelos/ (CLAUDE.md, design.md, edicao.md, briefing-de-video.md, checklist-publicacao.md) para a raiz desta pasta de edição, sem sobrescrever nada que já exista. O pacote-de-edicao fica onde está: leia o LEIA-ME dele e guarde o caminho no CLAUDE.md para usar nas próximas edições.
```

**O que esperar:** Os modelos na raiz da sua pasta e o Claude sabendo onde fica o pacote de edição.

**Se der errado, peça assim:**

```
Você copiou por cima do meu design.md. Restaure o meu e salve o do kit como design-exemplo.md.
```

### 84. Instalar as skills do kit

**Quando usar:** Com o arquivo skills-anderson-brito.zip baixado.

```
Instale as skills do kit. O arquivo está em [caminho do skills-anderson-brito.zip]. Descompacte e copie cada pasta para a minha pasta de skills do Claude (~/.claude/skills/ no Mac, C:\Users\MEU_USUARIO\.claude\skills\ no Windows), uma pasta por skill com o SKILL.md na raiz. Copie também a pasta legendas-virais de dentro do pacote-de-edicao. Não sobrescreva skill com o mesmo nome sem me perguntar. No fim, liste o que foi instalado.
```

**O que esperar:** A lista das skills instaladas. Feche e abra o Claude para ele enxergar as novas.

**Se der errado, peça assim:**

```
A skill [nome] não aparece quando eu digito a barra. Confira se o SKILL.md está na raiz da pasta dela e me diga o caminho.
```

### 85. Instalar uma skill gratuita do GitHub

**Quando usar:** Para cada skill de terceiros da lista recomendada. Uma por vez.

```
Instale a skill deste repositório: [https://github.com/remotion-dev/skills]. Antes de instalar, leia o README e o SKILL.md e me diga em 5 linhas: o que ela faz, que programas ela instala, qual é a licença e se ela usa algum serviço pago ou envia arquivos para fora do meu computador. Só instale em ~/.claude/skills/ depois do meu OK, seguindo o comando do README.
```

**O que esperar:** Um resumo do que a skill faz e do que ela exige, antes de qualquer instalação.

**Se der errado, peça assim:**

```
Essa skill pede chave de um serviço pago. Não instale. Me diga se alguma skill do kit faz a mesma coisa.
```

### 86. Testar a transcrição

**Quando usar:** Para confirmar que tudo funciona antes do primeiro vídeo.

```
Faça um teste de transcrição: pegue os primeiros 30 segundos de brutos/[arquivo.mp4], transcreva em português com tempo por palavra e me mostre o texto e quanto tempo levou. Se errar muitas palavras, sugira um modelo maior.
```

**O que esperar:** O texto dos primeiros 30 segundos e o tempo gasto. Se saiu certo, a máquina está pronta.

**Se der errado, peça assim:**

```
Errou nomes próprios. Guarde esta lista no edicao.md para corrigir sempre: [lista de nomes e termos].
```

---

## 27. design.md e CLAUDE.md

Ensinar o seu gosto ao Claude.

### 87. Criar o seu design.md

**Quando usar:** Uma vez, no começo. Coloque de 3 a 5 referências em referencias/ antes.

```
Use a skill manual-de-estetica. Analise tudo que está em referencias/ e crie o design.md na raiz: identidade e tom, cores (hex e uso), tipografia (fontes, pesos e tamanhos), elementos gráficos, layout 9:16 e 16:9 com zonas seguras, movimento, som e a lista do que é proibido. Antes de gravar, me mostre o rascunho e me pergunte o que faltar.
```

**O que esperar:** Um rascunho do seu manual de estética e algumas perguntas. Depois das respostas, o arquivo salvo.

**Se der errado, peça assim:**

```
Isso está parecido com o exemplo do kit. Refaça a partir das minhas referências: [o que você quer diferente].
```

### 88. Não tenho referência, me entreviste

**Quando usar:** Você não sabe descrever o seu estilo.

```
Não tenho referências separadas. Me entreviste para montar o design.md: faça até 8 perguntas curtas, uma por vez, sobre o meu público, o tom, cores que eu gosto e que eu odeio, criadores que eu admiro e o que eu nunca quero ver nos meus vídeos. Depois escreva o design.md e gere uma cartela de teste em 1080x1920 para eu ver as cores e fontes na prática.
```

**O que esperar:** Uma conversa curta e, no fim, o design.md com uma imagem de teste.

**Se der errado, peça assim:**

```
As cores da cartela ficaram sem contraste. Garanta que o texto principal seja legível sobre o fundo e me mostre de novo.
```

### 89. Preencher o CLAUDE.md

**Quando usar:** Logo depois de copiar os modelos do kit.

```
Use o modelo CLAUDE.md que está nesta pasta e preencha com os meus dados. Meu perfil é [@perfil], meu conteúdo é sobre [assunto], meu público é [público] e eu publico em [plataformas]. Preencha a seção de ferramentas com o que está instalado nesta máquina e anote onde fica o pacote de edição. Mantenha o arquivo curto.
```

**O que esperar:** Um CLAUDE.md curto, que o Claude lê sozinho toda vez que você abre a pasta.

**Se der errado, peça assim:**

```
Ficou longo. Corte para no máximo 40 linhas e deixe só o que muda o seu comportamento.
```

### 90. Partir do exemplo do kit

**Quando usar:** Você gostou da estrutura do design.md do kit e quer adaptar.

```
Quero partir do exemplo de design.md do kit, mas com a minha identidade. Mantenha a estrutura e as zonas seguras. Troque as cores por [suas cores], as fontes por [suas fontes] e reescreva Identidade, Elementos gráficos e Proibido a partir do que eu te contar. Me faça as perguntas necessárias antes.
```

**O que esperar:** O mesmo esqueleto, com a sua cara.

**Se der errado, peça assim:**

```
Atualize o design.md: [a legenda agora é em caixa alta e o destaque passa a ser amarelo]. Mude só isso e registre no Histórico.
```

### 91. Revisar depois de alguns vídeos

**Quando usar:** A cada 5 ou 10 vídeos.

```
Leia o design.md e a seção "Feedback acumulado" do edicao.md. Tem regra de estética no feedback que ainda não está no design.md? Tem regra contraditória entre os dois? Liste e proponha a correção. Só altere depois do meu OK.
```

**O que esperar:** Uma lista de ajustes para manter os dois arquivos coerentes.

**Se der errado, peça assim:**

```
Aprovados os itens [1 e 3]. O item 2 fica como está.
```
