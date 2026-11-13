/* DADOS DA ÁREA DE ACESSO · Kit Editar com Claude
   Conteúdo das três versões. O que muda entre elas é só o combo (kit, impacto, estudio).
   PROMPTS é o array que vai virar o Google Docs: {id, tipo, titulo, quando_usar, prompt, resultado, correcao, exemplo}.
   Campos editáveis: tudo que estiver entre [colchetes] vira um campo na página. */
(function (root) {
  var PRECO_CLAUDE = { plano: 'Claude Pro', valor: 'R$110 por mês', conferido: 'novembro de 2026' };
  var N_SKILLS = 13;

  var TIPOS = [
    { id: 'toon', nome: 'Animação toon de notícia', exemplo: '/assets/kit-claude/ex-toon.mp4', desc: 'Desenho animado feito em código explicando uma notícia.' },
    { id: 'podcast', nome: 'Corte de podcast', exemplo: '/assets/kit-claude/ex-podcast.mp4', desc: 'Vídeo longo virando verticais: decupagem, cortes, gancho e legenda.' },
    { id: 'anuncio', nome: 'Anúncio de negócio local', exemplo: '/assets/kit-claude/ex-acai.mp4', desc: 'Anúncio em motion para loja, restaurante, açaí, clínica.' },
    { id: 'carrossel', nome: 'Carrossel que vira vídeo', exemplo: '/assets/kit-claude/ex-carrossel.mp4', desc: 'Lâminas prontas e a versão animada delas.' },
    { id: 'talking', nome: 'Talking head', desc: 'Você falando para a câmera, com corte seco e legenda.' },
    { id: 'decupagem', nome: 'Decupagem de bruto', desc: 'Mapa do que tem dentro de uma gravação longa.' },
    { id: 'noticia', nome: 'Notícia e infográfico', desc: 'Números, gráfico e fonte animados.' },
    { id: 'kinetic', nome: 'Motion tipográfico', desc: 'Só texto em movimento, no ritmo da fala ou da música.' },
    { id: 'vsl', nome: 'VSL e apresentação', desc: 'Vídeo de venda ou de apresentação de produto.' },
    { id: 'tela', nome: 'Tutorial de tela', desc: 'Gravação de tela com zoom, passos e legenda.' },
    { id: 'react', nome: 'React e comentário', desc: 'Você comentando em cima de outro vídeo.' },
    { id: 'bastidor', nome: 'Bastidor com b-roll', desc: 'Reels de bastidor montado com vários clipes.' },
    { id: 'depoimento', nome: 'Depoimento', desc: 'Cliente falando, com nome e frase em destaque.' },
    { id: 'lista', nome: 'Contagem e lista', desc: 'Top 5, 3 erros, 7 dicas.' },
    { id: 'antesdepois', nome: 'Antes e depois', desc: 'Comparação lado a lado ou em sequência.' },
    { id: 'teaser', nome: 'Teaser de lançamento', desc: 'Trailer curto com data.' },
    { id: 'stories', nome: 'Stories em sequência', desc: 'Um assunto dividido em partes de 15 segundos.' },
    { id: 'narracao', nome: 'Narração com b-roll', desc: 'Voz em off coberta por imagens.' },
    { id: 'meme', nome: 'Meme com lettering', desc: 'Texto em cima de um clipe curto.' },
    { id: 'vinheta', nome: 'Vinheta e abertura', desc: 'Abertura, encerramento e tela final.' },
    { id: 'thumb', nome: 'Thumb e capa', desc: 'Capa do vídeo a partir de um quadro.' },
    { id: 'formatos', nome: '9:16 e 16:9', desc: 'O mesmo vídeo em mais de um formato.' },
    { id: 'som', nome: 'Trilha e efeitos', desc: 'Efeitos sonoros, música e volume final.' },
    { id: 'correcao', nome: 'Pedir correção', desc: 'Feedback com tempo exato e regra salva.' },
    { id: 'tokens', nome: 'Economia de tokens', desc: 'Gastar menos do seu limite de uso.' },
    { id: 'preparar', nome: 'Preparar a máquina', desc: 'Instalação, pasta e skills.' },
    { id: 'estetica', nome: 'design.md e CLAUDE.md', desc: 'Ensinar o seu gosto ao Claude.' }
  ];

  var PROMPTS = [];
  function P(tipo, id, titulo, quando_usar, prompt, resultado, correcao) {
    var t = TIPOS.filter(function (x) { return x.id === tipo; })[0];
    PROMPTS.push({ id: id, tipo: tipo, titulo: titulo, quando_usar: quando_usar, prompt: prompt, resultado: resultado, correcao: correcao, exemplo: (t && t.exemplo) || '' });
  }

  /* ---------- 1. TOON ---------- */
  P('toon', 'toon-roteiro', 'Roteiro e plano do toon',
    'Primeiro pedido. Você tem a notícia e quer o desenho animado explicando.',
    `Quero um vídeo de animação em código, estilo desenho (toon), explicando esta notícia: [link ou texto da notícia]. Duração: [45] segundos, formato 1080x1920. Antes de desenhar qualquer coisa, me entregue: 1) o roteiro de narração em frases curtas, com os números e a fonte da notícia; 2) a lista de personagens e cenários, cada um descrito em uma linha; 3) a tabela de cenas com tempo, o que aparece e o que se mexe. Não renderize nada até eu aprovar.`,
    'Roteiro, lista de personagens e tabela de cenas em texto, em um ou dois minutos. Nada de vídeo ainda.',
    `O roteiro ficou longo. Reduza para [45] segundos falados (cerca de 110 palavras) e mantenha só os 3 fatos principais.`);
  P('toon', 'toon-personagens', 'Personagens e cenário em SVG',
    'Depois de aprovar o roteiro. É aqui que o desenho ganha cara.',
    `Desenhe em SVG, no estilo do design.md, os personagens e o cenário aprovados: traço grosso, formas simples, no máximo 5 cores, e cada parte do corpo em um grupo separado (cabeça, olhos, boca, braços) para poder animar. Gere uma folha de teste em PNG com todos lado a lado em render/[nome do vídeo]/personagens.png e me diga o caminho.`,
    'Uma imagem com os personagens lado a lado. Você aprova o traço antes de qualquer animação.',
    `O personagem [nome] ficou genérico. Refaça com [óculos, barba e camisa verde] e deixe a cabeça maior em relação ao corpo. Mande só ele na folha de teste.`);
  P('toon', 'toon-animar', 'Animar no tempo da narração',
    'Você já tem a narração gravada (ou gerada) e os personagens aprovados.',
    `Use a skill motion-em-codigo. Transcreva brutos/[narracao.wav] com tempo por palavra e anime as cenas do toon: boca abrindo quando há fala, piscar de olhos, troca de cenário a cada fato novo e um texto de 1 a 3 palavras em cada número citado. Tudo calculado pelo tempo do quadro, sem aleatório. Mande uma prévia de 15 segundos em baixa resolução antes do render completo.`,
    'Prévia de 15 segundos com boca, olhos e textos no tempo da fala.',
    `Em [0:08] o texto entra antes da palavra. Sincronize todas as entradas com o tempo da transcrição e me mande de 0:05 a 0:12.`);
  P('toon', 'toon-sem-narracao', 'Toon sem narração gravada',
    'Você ainda não gravou a voz e quer ver o vídeo andando.',
    `Não tenho narração. Escreva o texto de um toon sobre [assunto] em [40] segundos e monte o vídeo só com animação e texto na tela, com tempo de leitura de pelo menos 0,35 segundo por palavra. Deixe o projeto pronto para receber áudio: quando eu colocar brutos/narracao.wav, você ressincroniza pelas palavras.`,
    'Um vídeo mudo com texto na tela, que depois aceita a sua voz sem refazer as cenas.',
    `Coloquei a narração em brutos/narracao.wav. Ressincronize as cenas pelas palavras e tire os textos que repetem o que eu falo.`);

  /* ---------- 2. PODCAST ---------- */
  P('podcast', 'podcast-achar', 'Achar os cortes pelo texto',
    'Episódio ou live longa. Comece sempre por aqui: é a etapa mais barata.',
    `Transcreva brutos/[episodio.mp4] com tempo por palavra e não olhe quadros. Ache [5] trechos de 30 a 60 segundos que funcionam sozinhos, fora de contexto. Para cada um: início e fim, a frase de abertura, por que funciona e um título de até 6 palavras. Ordene do mais forte para o mais fraco. Não corte nada ainda.`,
    'Uma lista numerada de trechos com tempo e motivo. Você escolhe pelos números.',
    `O trecho [3] começa no meio de um raciocínio. Recue o início até a pergunta que originou a resposta e me diga a nova duração.`);
  P('podcast', 'podcast-cortar', 'Cortar e enquadrar em vertical',
    'Depois de escolher os trechos.',
    `Use o modelo corte-podcast do pacote de edição. Corte os trechos [1, 2 e 4] da lista em 1080x1920, enquadrando quem está falando. Se trocar de pessoa, troque o enquadramento no corte, sem movimento de câmera. Comece cada corte na primeira palavra da frase e termine 0,2 segundo depois da última. Salve em render/[episodio]/corte-01.mp4 e assim por diante, e me mande um quadro de cada um para eu conferir o enquadramento.`,
    'Um arquivo por corte, já vertical, e um quadro de cada para conferência.',
    `No corte [2], em [0:14], o enquadramento cortou a cabeça. Suba o quadro e me mande só esse trecho.`);
  P('podcast', 'podcast-gancho', 'Gancho e legenda nos cortes',
    'Os cortes estão enquadrados e falta o que prende nos 3 primeiros segundos.',
    `Em cada corte, ponha nos 3 primeiros segundos um título de gancho de até 6 palavras no estilo [amarelo] do legendas-virais e, no vídeo todo, legenda de 1 a 3 palavras por vez com a skill legenda-safe-zone. Pinte só a palavra mais forte de cada frase. Antes de queimar, me mostre o texto do gancho e da legenda de cada corte.`,
    'Os textos para revisar e, depois do seu OK, os cortes legendados.',
    `O gancho do corte [1] entrega a resposta. Reescreva como pergunta ou promessa, sem contar o final, e me dê 3 opções.`);
  P('podcast', 'podcast-lote', 'Do episódio aos cortes em um pedido',
    'Quando você já confia no processo e quer tudo de uma vez.',
    `Use a skill editar-com-ia. De brutos/[episodio.mp4], gere [3] cortes verticais de até [60] segundos: transcreva, escolha os trechos mais fortes pelo texto, corte em 1080x1920 com quem fala enquadrado, gancho de até 6 palavras no começo, legenda de 1 a 3 palavras na zona segura e áudio em -14 LUFS. Pare em dois pontos para o meu OK: na lista de trechos e nos textos de gancho e legenda.`,
    'Duas paradas para aprovação e, no fim, os cortes prontos para postar.',
    `Aprovados os trechos 1 e 3. Troque o 2 pelo próximo da sua lista e siga.`);

  /* ---------- 3. ANÚNCIO ---------- */
  P('anuncio', 'anuncio-local', 'Anúncio de 15 segundos para negócio local',
    'Loja, restaurante, açaí, barbearia. Você tem fotos, oferta e contato.',
    `Crie um anúncio em motion, só com animação em código, para [nome do negócio], que vende [produto] em [bairro e cidade]. Oferta: [oferta e preço]. Chamada final: [peça pelo WhatsApp (11) 90000-0000]. Duração de [15] segundos em 1080x1920. Use as fotos de referencias/[pasta das fotos] e as cores da marca: [cores]. Estrutura: 2 segundos de gancho com o produto, 3 benefícios em telas rápidas, oferta com o preço grande e chamada final parada por 2 segundos. Primeiro me mostre o roteiro em tabela (tempo, texto, o que se mexe).`,
    'Tabela com o roteiro. Depois do OK, uma prévia do anúncio inteiro em baixa resolução.',
    `O preço está pequeno e some rápido. Deixe o preço ocupando um terço da tela e parado por 2 segundos.`);
  P('anuncio', 'anuncio-sem-foto', 'Anúncio sem foto do produto',
    'O cliente não mandou material ou as fotos são ruins.',
    `Não tenho foto boa de [produto]. Monte o anúncio de [nome do negócio] com ilustração em SVG e ícones do pacote de edição, na paleta [cores]: desenhe o produto em formas simples, anime a montagem dele (um ingrediente ou parte por vez) e feche com oferta e contato. Mostre primeiro o desenho do produto parado para eu aprovar.`,
    'Um desenho do produto para aprovar e, depois, o anúncio animado sem depender de foto.',
    `O desenho não parece [açaí]. Use [copo transparente, creme roxo, banana e granola por cima] e me mostre de novo.`);
  P('anuncio', 'anuncio-ganchos', 'Três aberturas para testar',
    'O anúncio foi aprovado e você quer versões para o tráfego pago.',
    `Mantenha o anúncio aprovado e gere mais 2 versões trocando só os 2 primeiros segundos: uma abrindo com uma pergunta e outra com o preço logo de cara. Mesmo som e mesmo final. Nomeie os arquivos como v1, v2 e v3 e me diga o texto de abertura de cada um.`,
    'Três arquivos iguais do segundo 2 em diante, prontos para teste.',
    `A versão v2 ficou com o mesmo texto da v1. Refaça a abertura com a pergunta "[sua pergunta]".`);
  P('anuncio', 'anuncio-formatos', 'Versão para feed e para stories',
    'Mesmo anúncio em 4:5 e 9:16.',
    `Gere o anúncio aprovado também em 1080x1350 (4:5) para o feed. Reposicione textos e produto para o novo quadro em vez de cortar as bordas, e confira com a guia de zona segura do pacote. Mande um quadro de cada cena nos dois formatos, lado a lado.`,
    'Uma folha comparando os dois formatos e o arquivo 4:5.',
    `Na cena [3] do 4:5 o texto encosta na borda. Deixe pelo menos 80 px de margem em todos os lados.`);

  /* ---------- 4. CARROSSEL ---------- */
  P('carrossel', 'carrossel-criar', 'Montar o carrossel',
    'Você tem o assunto e quer as lâminas prontas.',
    `Use o modelo carrossel do pacote de edição. Monte um carrossel de [7] lâminas em 1080x1350 sobre [assunto], no estilo do design.md: capa com gancho de até 7 palavras, uma ideia por lâmina com no máximo 25 palavras e a última com a chamada "[sua chamada]". Me mostre o texto de todas as lâminas antes de gerar as imagens.`,
    'O texto das lâminas para revisar e, depois, as imagens em PNG numeradas.',
    `A lâmina [4] tem texto demais. Divida em duas e mantenha o total em [8] lâminas.`);
  P('carrossel', 'carrossel-video', 'Transformar o carrossel em vídeo',
    'As lâminas existem e você quer um Reels a partir delas.',
    `Transforme as lâminas de render/[pasta do carrossel]/ em um vídeo 1080x1920 de [30] segundos: cada lâmina entra com um movimento simples (deslize ou zoom leve), os blocos de texto aparecem na ordem de leitura e ficam tempo suficiente para ler (0,35 segundo por palavra, no mínimo 2 segundos). Centralize a lâmina sobre um fundo do pacote. Som: clique baixo em cada troca. Mande uma prévia das 3 primeiras lâminas.`,
    'Prévia curta com as primeiras lâminas animadas. Aprovando, sai o vídeo completo.',
    `Está rápido demais para ler. Aumente o tempo de cada lâmina em [1] segundo e tire o zoom.`);
  P('carrossel', 'carrossel-do-video', 'Do vídeo falado para o carrossel',
    'Você já publicou um vídeo e quer reaproveitar o conteúdo.',
    `Leia a transcrição de render/[nome do vídeo]/ e transforme o conteúdo em um carrossel de [6] lâminas no modelo carrossel do pacote. Use as minhas frases, encurtadas, sem inventar informação. Capa com o gancho do vídeo. Me mostre o texto antes de gerar.`,
    'Um carrossel fiel ao que você falou, pronto em minutos, sem assistir o vídeo de novo.',
    `Você mudou o sentido da lâmina [3]. Volte à frase original da transcrição e só encurte.`);

  /* ---------- 5. TALKING HEAD ---------- */
  P('talking', 'primeiro-video', 'Meu primeiro vídeo',
    'Seu primeiro teste. Use um vídeo falado de até 2 minutos.',
    `Use a skill editar-com-ia. Edite brutos/[meu-video.mp4] seguindo o design.md e o edicao.md. Objetivo: [ensinar uma dica rápida]. Tire erros, repetições e pausas longas, ponha legenda de 1 a 3 palavras na zona segura, um título de gancho nos 3 primeiros segundos e deixe o áudio em -14 LUFS. Formato 9:16. Antes de renderizar, me mostre o plano em texto e espere o meu OK. Depois me mande uma prévia dos primeiros 20 segundos.`,
    'Primeiro o plano em texto (cortes, gancho, legenda). Depois do OK, uma prévia de 20 segundos em baixa resolução. O vídeo completo sai só quando você aprovar a prévia.',
    `Assisti a prévia. Em [0:07] a legenda cobre a minha boca: suba 80 px. Em [0:12 a 0:14] corte essa pausa. Gere a v2 só com essas mudanças.`);
  P('talking', 'talking-completo', 'Pedido de edição completo',
    'Para os vídeos seguintes, com todas as escolhas no pedido.',
    `Use a skill editar-com-ia. Edite brutos/[arquivo.mp4] seguindo o design.md e o edicao.md. Objetivo: [objetivo]. Chamada no fim: [chamada]. Cortes: [poucos, médio ou muitos]. Legenda: [vídeo todo ou só destaques]. Animações: [nenhuma, leve, médio ou pesado]. Trilha e efeitos: [sim ou não]. Formato: [9:16, 16:9 ou os dois]. Antes de renderizar, me mostre o plano em texto e espere o meu OK.`,
    'Um plano que já respeita o seu briefing. Quanto mais campos você preenche, menos idas e vindas.',
    `O plano está com animação demais. Refaça com animação leve: só o gancho e 2 destaques.`);
  P('talking', 'talking-corte', 'Só o corte seco',
    'Você quer limpar a fala e editar o resto por conta própria.',
    `Use a skill corte-seco em brutos/[arquivo.mp4]. Me mostre a proposta em texto: o que sai, com tempo, duração e motivo (erro, repetição, silêncio), e o texto corrido do que fica. Só corte depois do meu OK.`,
    'Uma lista numerada de cortes e a duração final estimada. O bruto original não é alterado.',
    `Aprovado, com ajustes: mantenha o item [4] e não corte nada entre [0:50] e [1:05].`);
  P('talking', 'talking-ritmo', 'Ficou picotado',
    'O corte ficou agressivo e a fala perdeu naturalidade.',
    `O vídeo ficou picotado. Refaça o corte com menos intervenções: mantenha de 0,3 a 0,4 segundo entre as frases, não corte dentro de frase e devolva as respirações antes das frases importantes. Me diga quantos cortes eram e quantos ficaram.`,
    'Uma versão com menos cortes e a contagem de antes e depois.',
    `Ainda está corrido em [0:20 a 0:30]. Nesse trecho, devolva todas as pausas originais.`);
  P('talking', 'talking-gancho', 'Três opções de gancho',
    'O começo do vídeo está fraco.',
    `Leia a transcrição de brutos/[arquivo.mp4] e me proponha 3 opções de gancho visual para os 3 primeiros segundos. Para cada uma: o que aparece na tela, o texto de 1 a 3 palavras e o que seria preciso (print, imagem, animação). Diga qual você escolheria e por quê.`,
    'Três ideias em texto, sem render, para você escolher.',
    `Gostei da opção [2], mas com o texto "[seu texto]". Monte só esses 3 segundos e me mande.`);

  /* ---------- 6. DECUPAGEM ---------- */
  P('decupagem', 'decupagem-mapa', 'Mapa do bruto longo',
    'Gravação de 20 minutos ou mais. Você quer saber o que tem dentro sem assistir.',
    `Transcreva brutos/[arquivo.mp4] com tempo por palavra e me entregue o mapa da gravação: blocos por assunto com início e fim, resumo de uma linha, nota de 1 a 5 para a força do trecho e marcação de onde há erro, repetição ou silêncio longo. Salve em render/[nome]/decupagem.md. Não olhe quadros e não corte nada.`,
    'Um arquivo de texto com a gravação inteira organizada por assunto. É a base de todo o resto.',
    `Os blocos ficaram grandes. Quebre em trechos de no máximo [90] segundos.`);
  P('decupagem', 'decupagem-varios', 'Vários arquivos da mesma gravação',
    'A câmera dividiu a gravação ou você gravou em partes.',
    `Liste os arquivos de brutos/[pasta] com duração e data. Transcreva só os primeiros 15 segundos de cada um e proponha a ordem certa e um nome curto para cada, sem espaço e sem acento. Me mostre a tabela de antes e depois e espere o OK. Faça cópias com o nome novo, sem alterar os originais.`,
    'Uma tabela de arquivos na ordem certa, com nomes legíveis.',
    `O arquivo [nome] é anterior ao [nome]. Corrija a ordem e renumere.`);
  P('decupagem', 'decupagem-takes', 'Escolher o melhor take',
    'Você repetiu a mesma frase várias vezes na gravação.',
    `Na transcrição de brutos/[arquivo.mp4], ache as frases que eu repeti mais de uma vez. Para cada grupo, liste as tentativas com o tempo e indique a melhor pelo texto (completa, sem gaguejo, sem palavra cortada). Em caso de empate, fique com a última. Não corte nada: só me mostre a tabela.`,
    'Uma tabela de takes repetidos com a sua escolha sugerida.',
    `No grupo [2] prefiro a primeira tentativa. Atualize a tabela e monte só com os takes escolhidos.`);

  /* ---------- 7. NOTÍCIA / INFOGRÁFICO ---------- */
  P('noticia', 'noticia-infografico', 'Notícia em infográfico animado',
    'Você quer explicar um fato com números, sem aparecer.',
    `Monte um vídeo de [40] segundos em 1080x1920 explicando esta notícia: [link ou texto]. Só animação em código no estilo do design.md: uma ideia por tela, os números grandes contando até o valor final, uma linha do tempo quando houver datas e a fonte escrita no rodapé de cada dado. Me mostre primeiro a lista de fatos com a fonte de cada um e o roteiro visual em tabela.`,
    'Lista de fatos com fonte para você conferir e, depois, a prévia do infográfico.',
    `O dado da tela [3] está sem fonte. Se não houver fonte confiável, tire a tela.`);
  P('noticia', 'noticia-grafico', 'Gráfico animado com os seus dados',
    'Você tem os números e quer o gráfico se desenhando.',
    `Anime este dado em um gráfico de [barras]: [2022: 10, 2023: 18, 2024: 31]. Título: "[título]". As barras crescem uma por vez em 0,5 segundo cada, o valor aparece em cima de cada uma e a maior fica na cor de destaque do design.md. Duração de [8] segundos, fundo transparente, para eu usar por cima de outro vídeo. Mande um quadro do estado final antes de renderizar.`,
    'Um quadro do gráfico pronto para aprovar e, depois, o clipe com fundo transparente.',
    `A escala engana: comece o eixo no zero e mostre os valores com uma casa decimal.`);
  P('noticia', 'noticia-conferir', 'Conferir números antes do render',
    'Sempre, em vídeo de notícia. Erro de número custa caro.',
    `Antes de renderizar, liste todo número, data e nome próprio que aparece na tela ou na narração deste vídeo, com a fonte de onde saiu. Marque o que você não conseguiu confirmar. Não renderize enquanto houver item sem fonte.`,
    'Uma tabela de checagem. Você confere em um minuto o que levaria um render inteiro para descobrir.',
    `O item [5] está errado: o correto é [valor]. Corrija na tela e na legenda e me mostre o quadro.`);

  /* ---------- 8. MOTION TIPOGRÁFICO ---------- */
  P('kinetic', 'kinetic-fala', 'Tipografia no tempo da fala',
    'Você tem só o áudio (narração, trecho de podcast, áudio de WhatsApp).',
    `Não tenho vídeo gravado, só o áudio brutos/[audio.wav]. Transcreva com tempo por palavra e monte um vídeo 1080x1920 só com tipografia animada no estilo do design.md: de 1 a 3 palavras por tela, cada grupo entrando no tempo exato da fala, a palavra mais forte de cada frase maior e na cor de destaque. Primeiro o roteiro visual em tabela, depois uma prévia de 15 segundos.`,
    'Tabela de tempos e uma prévia com as palavras entrando junto com a voz.',
    `As palavras trocam rápido demais. Agrupe em blocos de 2 a 3 palavras e nunca deixe um bloco menos de 0,4 segundo na tela.`);
  P('kinetic', 'kinetic-musica', 'Tipografia no ritmo da música',
    'Frase curta em cima de uma trilha, sem voz.',
    `Analise a batida de referencias/trilhas/[musica.mp3] pelo áudio (detecção de ataques) e me diga o andamento e os tempos das batidas nos primeiros [15] segundos. Depois monte o texto "[sua frase]" entrando uma palavra por batida, com um movimento de escala curto em cada entrada. Mande a lista de tempos antes de animar.`,
    'A lista de batidas com tempo e, depois, o texto pulsando com a música.',
    `As entradas estão atrasadas em relação à batida. Adiante tudo em [0,08] segundo.`);
  P('kinetic', 'kinetic-gancho', 'Gancho animado de 3 segundos',
    'Só a abertura do vídeo.',
    `Crie uma animação para os 3 primeiros segundos: [o título "EDITADO POR IA" digitado letra a letra com cursor piscando]. Dentro da zona segura, com as cores e fontes do design.md, calculada pelo tempo do quadro. Mande um quadro de cada segundo para eu aprovar antes de renderizar.`,
    'Três quadros para aprovar e um clipe de 3 segundos para colocar no começo.',
    `O texto está pequeno no celular. Aumente até ocupar 80% da largura segura.`);

  /* ---------- 9. VSL ---------- */
  P('vsl', 'vsl-roteiro-visual', 'Roteiro visual da VSL',
    'A narração da venda está gravada e falta a imagem.',
    `Transcreva brutos/[narracao-vsl.wav] com tempo por palavra e monte o roteiro visual da VSL em tabela: tempo, frase, o que aparece na tela (texto de 1 a 3 palavras, print, número, foto do produto) e o som. Regra: uma informação nova na tela a cada 3 a 5 segundos, nenhuma tela parada por mais de 6. Liste também os prints e fotos que eu preciso te entregar. Não renderize.`,
    'O vídeo inteiro descrito em tabela e a lista do material que falta.',
    `Entre [1:10 e 1:40] ficou só texto. Proponha 3 imagens ou prints que eu possa gravar para esse trecho.`);
  P('vsl', 'vsl-provas', 'Cartões de prova',
    'Prints de resultado, depoimento ou conversa.',
    `Quando a narração disser "[frase]", mostre referencias/prints/[arquivo.png] dentro da moldura de celular do pacote, entrando de baixo para cima e ficando até o fim da frase. Borre nomes, telefones e fotos de terceiros no print. Faça o mesmo para os prints: [lista de arquivos e frases].`,
    'Os prints entrando no momento certo, com os dados de terceiros protegidos.',
    `O print está ilegível no celular. Dê zoom na parte que importa: [região do print].`);
  P('vsl', 'vsl-oferta', 'Tela de oferta e chamada final',
    'O fechamento do vídeo de venda.',
    `Monte a tela de oferta dos últimos [20] segundos: nome do produto, a lista do que a pessoa recebe (um item aparecendo por vez, no tempo em que eu falo), o preço [preço] grande e a chamada "[chamada]" parada por 3 segundos no fim. Sem contagem regressiva falsa e sem preço riscado que nunca existiu.`,
    'Uma tela final limpa, com a lista sincronizada com a fala.',
    `A lista passa da zona segura. Reduza para [4] itens por tela e divida em duas telas.`);

  /* ---------- 10. TUTORIAL DE TELA ---------- */
  P('tela', 'tela-tutorial', 'Tutorial a partir da gravação de tela',
    'Você gravou a tela narrando o que faz.',
    `Edite brutos/[gravacao-de-tela.mp4], que é uma gravação de tela com a minha voz. Pela transcrição: tire erros e repetições, acelere 4x (em vez de cortar) os trechos sem fala maiores que [2] segundos, ponha um rótulo "Passo 1", "Passo 2" no canto cada vez que eu mudar de etapa e legenda de 1 a 3 palavras fora da área onde eu clico. Me mostre a lista de passos e de trechos acelerados antes de renderizar.`,
    'A lista de passos e esperas. Depois, um tutorial mais curto sem perder nenhuma etapa.',
    `O passo [3] começou no lugar errado. Ele começa quando eu digo "[frase]".`);
  P('tela', 'tela-zoom', 'Zoom nos pontos importantes',
    'A tela é grande e o detalhe some no celular.',
    `Em [0:12, 0:31 e 0:48] dê zoom de 160% na região [canto superior direito, onde fica o botão Exportar], com entrada suave de 0,3 segundo, e segure por 3 segundos. Marque o ponto com o círculo à mão do pacote. Mande um quadro de cada zoom para eu conferir antes de renderizar.`,
    'Um quadro de cada zoom para validar a região.',
    `O zoom de [0:31] pegou a área errada. O botão fica [mais à esquerda, no menu lateral].`);
  P('tela', 'tela-vertical', 'Tela horizontal em vídeo vertical',
    'Gravação 16:9 que precisa virar Reels.',
    `Monte a versão 1080x1920 de brutos/[gravacao.mp4]: a tela dentro da moldura de navegador do pacote ocupando a parte de cima, legenda grande embaixo e um fundo do pacote atrás. Onde eu indicar zoom, a moldura mostra só a região ampliada. Mande 10 segundos de prévia.`,
    'Um vertical em que dá para ler a tela no celular.',
    `A tela ficou pequena. Aumente a moldura até a largura segura inteira e diminua a legenda.`);

  /* ---------- 11. REACT ---------- */
  P('react', 'react-montar', 'React com o original e eu na tela',
    'Você gravou o seu comentário e tem o vídeo que está comentando.',
    `Monte um react em 1080x1920: o vídeo original brutos/[original.mp4] na parte de cima e a minha gravação brutos/[meu-comentario.mp4] embaixo. Sincronize pelo áudio: quando eu falo, o original pausa e fica com 40% de brilho; quando eu paro, ele volta. Legenda só na minha fala. Antes de montar, me mostre a tabela de quem fala em cada trecho.`,
    'A tabela de trechos e, depois, uma prévia do react. Use só material que você tem direito de usar e dê o crédito na tela.',
    `Em [0:22] o original voltou enquanto eu ainda falava. Só retome o original 0,3 segundo depois da minha última palavra.`);
  P('react', 'react-recorte', 'Eu recortado por cima do vídeo',
    'Estilo comentarista no canto da tela.',
    `Coloque a minha gravação brutos/[meu-comentario.mp4] recortada (sem fundo) no canto inferior [esquerdo] do vídeo brutos/[original.mp4], ocupando um terço da largura, sem cobrir o que importa do original. Se o recorte ficar ruim no cabelo, use uma moldura redonda em vez de recortar. Mande um quadro de teste.`,
    'Um quadro de teste com você posicionado. Recorte sem fundo verde nem sempre fica limpo: a moldura redonda é o plano B.',
    `O recorte ficou serrilhado. Troque pela moldura redonda com borda na cor de destaque.`);
  P('react', 'react-credito', 'Crédito e contexto na tela',
    'Todo react.',
    `Adicione o crédito do vídeo original no canto superior, dentro da zona segura: "[@perfil ou nome do canal]", visível durante todo o trecho em que o original aparece. Nos 3 primeiros segundos, ponha um título de até 6 palavras dizendo o que eu vou comentar.`,
    'Crédito fixo e título de contexto. Ajuda quem assiste e reduz o risco de denúncia.',
    `O crédito está cobrindo o rosto de quem fala no original. Mova para o canto oposto.`);

  /* ---------- 12. BASTIDOR ---------- */
  P('bastidor', 'bastidor-montagem', 'Reels de bastidor com vários clipes',
    'Você tem uma pasta com clipes soltos do dia.',
    `Liste os clipes de brutos/[pasta] com duração e orientação. Veja um único quadro pequeno de cada um para descrever o que mostra, em uma linha. Depois proponha uma montagem de [20] segundos em 1080x1920: ordem dos clipes, de 1 a 2 segundos cada, começando pelo mais chamativo e terminando no resultado. Não renderize antes do meu OK.`,
    'Uma lista com a descrição de cada clipe e a ordem proposta. Gasta pouco porque olha um quadro por clipe.',
    `Troque a ordem: comece pelo clipe [nome] e tire o [nome], que está tremido.`);
  P('bastidor', 'bastidor-batida', 'Cortes na batida da música',
    'A montagem está aprovada e você quer ritmo.',
    `Ache os tempos das batidas de referencias/trilhas/[musica.mp3] e ajuste a montagem para cada troca de clipe cair em uma batida. Clipes com movimento ficam 2 batidas, os parados ficam 1. Trilha contínua, sem corte no meio. Mande a prévia completa em baixa resolução.`,
    'A mesma montagem com as trocas encaixadas na música.',
    `As trocas estão um pouco depois da batida. Adiante todos os cortes em [2] quadros.`);
  P('bastidor', 'bastidor-texto', 'Texto contando a história',
    'Bastidor sem fala precisa de contexto.',
    `Escreva [4] textos curtos, de até 5 palavras cada, que contem a história deste bastidor: [o que aconteceu no dia]. Coloque um a cada 4 ou 5 segundos, no estilo do design.md, dentro da zona segura e sem cobrir a ação. Me mostre os textos antes de aplicar.`,
    'Quatro frases para aprovar e, depois, aplicadas no vídeo.',
    `Os textos estão genéricos. Use os fatos: [número de horas, local, nome do cliente].`);

  /* ---------- 13. DEPOIMENTO ---------- */
  P('depoimento', 'depoimento-corte', 'Melhor trecho de um depoimento',
    'O cliente mandou um vídeo ou áudio longo.',
    `Transcreva brutos/[depoimento.mp4] e ache o trecho de até [30] segundos em que a pessoa fala do resultado, com número ou fato concreto. Não emende frases distantes para mudar o sentido. Me mostre o texto do trecho e as alternativas antes de cortar.`,
    'O trecho mais forte em texto, com opções. O sentido da fala original é mantido.',
    `Prefiro começar na frase "[frase]". Ajuste o início e me diga a nova duração.`);
  P('depoimento', 'depoimento-cartao', 'Nome e frase em destaque',
    'O corte está escolhido.',
    `No depoimento cortado, coloque o lower third do pacote com "[nome]" e "[cidade ou profissão]" nos primeiros 4 segundos, legenda de 1 a 3 palavras e a frase "[frase mais forte]" em destaque quando ela for dita. Normalize o áudio em -14 LUFS e reduza o ruído de fundo só se a voz continuar natural.`,
    'Depoimento com identificação, legenda e áudio nivelado.',
    `A voz ficou metálica depois da limpeza. Volte ao áudio original e só normalize.`);
  P('depoimento', 'depoimento-compilado', 'Compilado de vários clientes',
    'Três ou mais depoimentos curtos.',
    `Monte um compilado de [45] segundos com os depoimentos de brutos/[pasta]: uma frase forte de cada pessoa, de 5 a 10 segundos, com o nome de cada uma na tela. Ordene do resultado mais concreto para o mais geral, iguale o volume entre as vozes e feche com a tela "[chamada]". Me mostre as frases escolhidas antes.`,
    'As frases escolhidas para aprovação e, depois, o compilado com as vozes no mesmo volume.',
    `A pessoa [nome] está bem mais baixa que as outras. Iguale pelo volume da fala, não pelo pico.`);

  /* ---------- 14. LISTA ---------- */
  P('lista', 'lista-top5', 'Top 5 com contador',
    'Vídeo falado em formato de lista.',
    `Em brutos/[arquivo.mp4] eu cito [5] itens. Pela transcrição, ache o momento em que começo cada um. Coloque o contador do pacote ("1/5", "2/5") no canto e o nome de cada item em até 3 palavras entrando quando eu falo a palavra-chave: [item 1, item 2, item 3, item 4, item 5]. Barra de progresso fina no topo da zona segura. Me mostre a tabela de tempos antes.`,
    'A tabela com o tempo de cada item e, depois, o vídeo com contador e barra.',
    `O item [3] entra cedo. Ele começa quando eu digo "[frase]".`);
  P('lista', 'lista-codigo', 'Lista só em animação',
    'Você não gravou nada e quer um vídeo de lista.',
    `Monte um vídeo de [25] segundos em 1080x1920, só com animação em código no estilo do design.md, com a lista "[título da lista]": [item 1; item 2; item 3; item 4; item 5]. Do último para o primeiro, cada item com número grande, nome em até 4 palavras e um ícone do pacote. O primeiro lugar fica 1 segundo a mais na tela. Mande a prévia inteira em baixa resolução.`,
    'Um vídeo de contagem pronto para receber trilha ou a sua narração.',
    `O ícone do item [2] não tem relação com o assunto. Troque por [ícone] ou tire.`);

  /* ---------- 15. ANTES E DEPOIS ---------- */
  P('antesdepois', 'antes-depois-lado', 'Antes e depois lado a lado',
    'Duas imagens ou dois vídeos do mesmo objeto.',
    `Monte um antes e depois em 1080x1920 com referencias/[antes] e referencias/[depois]: tela dividida ao meio com uma linha que desliza da esquerda para a direita em [3] segundos revelando o depois, rótulos "ANTES" e "DEPOIS" dentro da zona segura e 2 segundos parados no fim. Alinhe as duas imagens pelo mesmo enquadramento antes de animar e me mostre o quadro alinhado.`,
    'Um quadro de alinhamento para aprovar e o clipe com a revelação.',
    `As duas imagens não estão na mesma escala. Aumente o antes em [8]% e alinhe pela [linha do horizonte].`);
  P('antesdepois', 'antes-depois-sequencia', 'Antes, processo e depois',
    'Transformação com etapas (reforma, edição, maquiagem, obra).',
    `Monte uma sequência de [20] segundos com os arquivos de brutos/[pasta], na ordem: antes (2 segundos, parado), processo (clipes de 1 segundo, acelerados quando forem longos) e depois (3 segundos, com zoom lento). Texto de 1 a 3 palavras em cada fase. Um impacto sonoro só na revelação do depois.`,
    'Uma sequência curta em que o resultado aparece no fim, com um único som forte.',
    `A revelação ficou sem peso. Deixe 0,3 segundo de tela preta e silêncio antes do depois.`);

  /* ---------- 16. TEASER ---------- */
  P('teaser', 'teaser-lancamento', 'Teaser de lançamento',
    'Produto, curso, evento ou vídeo novo com data marcada.',
    `Monte um teaser de [15] segundos em 1080x1920 para o lançamento de [produto], no dia [data]. Estrutura: 3 clipes ou imagens de até 1 segundo cada sem revelar o produto inteiro, uma frase de até 5 palavras, o nome do produto e a data parada por 2 segundos. Use o material de referencias/[pasta] e o estilo do design.md. Roteiro em tabela primeiro.`,
    'Um roteiro em tabela e, depois, um teaser que termina na data.',
    `Está mostrando demais. Use só detalhes e recortes do produto, nunca ele inteiro.`);
  P('teaser', 'teaser-contagem', 'Série de contagem regressiva',
    'Faltam poucos dias e você quer um vídeo por dia.',
    `A partir do teaser aprovado, gere [3] versões de 6 segundos para os dias que antecedem o lançamento: "Faltam 3 dias", "Faltam 2 dias", "É amanhã". Mesmo visual, mudando só o texto e um detalhe de cor. Nomeie os arquivos com o dia de publicação.`,
    'Uma série curta e consistente, pronta para agendar.',
    `As três versões estão idênticas além do texto. Troque também o clipe de fundo em cada uma.`);

  /* ---------- 17. STORIES ---------- */
  P('stories', 'stories-dividir', 'Dividir um vídeo em stories',
    'Vídeo falado mais longo que vai para os stories.',
    `Divida render/[nome do vídeo]/final.mp4 em partes de até [15] segundos para stories. Corte sempre no fim de uma frase, nunca no meio da palavra. Numere no canto ("1/5") e deixe livre a área de cima e de baixo, onde o aplicativo põe os botões. Me mostre onde cai cada corte antes de exportar.`,
    'A lista de cortes por frase e os arquivos numerados na ordem.',
    `A parte [3] termina no meio de uma ideia. Junte com a 4 e corte na frase seguinte.`);
  P('stories', 'stories-sequencia', 'Sequência de stories do zero',
    'Você quer contar algo em telas, sem gravar.',
    `Monte uma sequência de [5] stories em 1080x1920 sobre [assunto], no estilo do design.md: o primeiro com uma pergunta, os do meio com uma ideia cada em até 20 palavras e o último com a chamada "[chamada]". Deixe um espaço vazio marcado onde eu vou colar a caixinha de pergunta ou o link. Exporte em PNG e me mostre a folha com todos.`,
    'Cinco imagens e uma folha de conferência, com espaço reservado para os adesivos do aplicativo.',
    `O story [2] está com texto demais para 5 segundos. Corte para no máximo 12 palavras.`);

  /* ---------- 18. NARRAÇÃO + B-ROLL ---------- */
  P('narracao', 'narracao-lista', 'Lista de b-roll a partir da narração',
    'Você tem a voz e precisa saber o que filmar ou buscar.',
    `Transcreva brutos/[narracao.wav] e me entregue a lista de b-roll: para cada frase, o tempo, o que a imagem deveria mostrar e se dá para resolver com clipe, foto, print ou animação. Marque os trechos em que a imagem é obrigatória e os que podem ficar com texto na tela.`,
    'Uma lista de imagens por frase. Serve de roteiro de filmagem ou de busca.',
    `Tem pedido de imagem que eu não consigo filmar. Para os itens [4 e 7], proponha uma alternativa com animação.`);
  P('narracao', 'narracao-montar', 'Cobrir a narração com os clipes',
    'Os clipes estão na pasta.',
    `Monte um vídeo com a narração brutos/[narracao.wav] e os clipes de brutos/[pasta de b-roll]. Olhe um quadro pequeno de cada clipe para saber o que mostra, e case cada um com a frase que ele ilustra. Troque de imagem a cada 2 a 4 segundos, sempre em fim de frase ou em vírgula. Áudio dos clipes mudo. Me mostre a tabela de frase e clipe antes de montar.`,
    'A tabela que casa frase com clipe e, depois, a prévia com a narração coberta.',
    `O clipe de [0:15] não tem relação com a frase. Troque por [nome do clipe] ou por texto na tela.`);
  P('narracao', 'narracao-fotos', 'Narração em cima de fotos',
    'Só fotos paradas, sem vídeo.',
    `Monte o vídeo da narração brutos/[narracao.wav] com as fotos de referencias/[pasta]. Cada foto com um movimento lento (zoom de 100% para 108% ou deslize), nunca parada e nunca cortando rosto. Fotos horizontais em vídeo vertical ficam sobre um fundo do pacote, sem esticar. Legenda de 1 a 3 palavras.`,
    'Um vídeo com movimento suave em cada foto, sem distorção.',
    `O zoom está enjoativo. Alterne: uma foto com zoom para dentro, a próxima com deslize lateral.`);

  /* ---------- 19. MEME ---------- */
  P('meme', 'meme-lettering', 'Meme com texto em cima',
    'Clipe curto de reação com uma frase.',
    `No clipe brutos/[clipe.mp4], coloque o texto "[frase do meme]" na parte de cima, dentro da zona segura, em caixa alta, branco com contorno preto, no máximo 2 linhas. O texto fica do começo ao fim. Corte o clipe para [6] segundos terminando logo depois da reação. Não mexa no áudio original.`,
    'O clipe curto com o texto fixo, pronto para postar.',
    `O texto está quebrando em 3 linhas. Diminua a fonte até caber em 2, sem passar da largura segura.`);
  P('meme', 'meme-destaque', 'Texto de destaque no ponto da piada',
    'A graça está em uma palavra ou em um momento exato.',
    `No clipe brutos/[clipe.mp4], em [0:03], faça entrar a palavra "[palavra]" no estilo [vermelho] do legendas-virais, com um zoom rápido de 110% no rosto e um único efeito sonoro curto. Nada antes disso: o começo fica limpo para a piada funcionar.`,
    'Um único destaque no tempo certo. Menos efeito, mais graça.',
    `O destaque entrou depois da reação. Adiante para [0:02,6].`);

  /* ---------- 20. VINHETA ---------- */
  P('vinheta', 'vinheta-abertura', 'Vinheta de abertura',
    'Uma abertura curta para todos os vídeos do canal.',
    `Crie uma vinheta de [3] segundos em 1920x1080 e em 1080x1920 com o nome "[nome do canal]", no estilo do design.md: [o nome se monta letra a letra e um traço sublinha no fim]. Fundo [transparente ou cor]. Um som curto na entrada. Calculada pelo tempo do quadro. Mande 3 quadros (início, meio e fim) antes de renderizar.`,
    'Três quadros para aprovar e a vinheta nos dois formatos, reutilizável.',
    `Está longa para Reels. Faça uma versão de 1,5 segundo só com o final da animação.`);
  P('vinheta', 'vinheta-final', 'Tela final com chamada',
    'O encerramento padrão dos seus vídeos.',
    `Crie uma tela final de [4] segundos com "[chamada, por exemplo: siga para a parte 2]" e o meu arroba [@perfil], no estilo do design.md, com a seta do pacote apontando para onde fica o botão de seguir. Salve como modelo em render/_modelos/tela-final para eu reaproveitar, com o texto fácil de trocar.`,
    'Uma tela final reaproveitável em que você só troca o texto.',
    `A seta aponta para o lugar errado no Instagram. Aponte para [o canto inferior esquerdo, onde fica o nome do perfil].`);

  /* ---------- 21. THUMB ---------- */
  P('thumb', 'thumb-quadro', 'Capa a partir de um quadro do vídeo',
    'O vídeo está pronto e falta a capa.',
    `Gere uma grade com um quadro a cada [3] segundos de render/[nome]/final.mp4, em tamanho pequeno, e escolha os 3 melhores para capa (rosto nítido, olhos abertos, expressão forte). Me mostre os 3. Depois que eu escolher, monte a capa em [1080x1920] com o texto "[texto de até 4 palavras]" grande, no estilo do design.md, sem cobrir o rosto.`,
    'Três candidatos para escolher e, depois, a capa pronta em PNG.',
    `O texto some quando a capa aparece pequena no perfil. Deixe o texto no terço central e aumente 30%.`);
  P('thumb', 'thumb-variacoes', 'Três variações de capa',
    'Você quer testar texto e cor.',
    `Com o mesmo quadro, gere 3 capas: uma com o texto "[opção 1]", uma com "[opção 2]" e uma só com a imagem e um elemento de destaque (círculo ou seta do pacote). Mostre as três lado a lado, em tamanho de miniatura, para eu ver qual lê melhor pequena.`,
    'Uma folha com as três capas no tamanho em que o público realmente vê.',
    `Nenhuma lê bem pequena. Reduza o texto para 2 palavras e aumente o contraste com o fundo.`);

  /* ---------- 22. FORMATOS ---------- */
  P('formatos', 'formatos-segundo', 'Segundo formato do mesmo vídeo',
    'A versão vertical está aprovada e falta a horizontal (ou o contrário).',
    `Use a skill vertical-e-horizontal. A versão [9:16] está aprovada. Gere agora a [16:9] a partir da montagem limpa (sem texto queimado), refazendo a posição da legenda e dos textos para o novo formato. Mesmo corte e mesmo som. Antes, me diga como pretende enquadrar e me mande uma prévia de 10 segundos.`,
    'Uma explicação do enquadramento, uma prévia e depois o segundo arquivo com os textos reposicionados.',
    `No horizontal o meu rosto ficou pequeno. Aproxime o enquadramento em [15]% e mantenha os olhos no terço de cima.`);
  P('formatos', 'formatos-conferir', 'Conferir antes de postar',
    'Sempre, antes de publicar.',
    `Use a skill conferir-render em render/[nome]/[arquivo.mp4]. Quero: dados do arquivo, quadros pretos ou congelados, grade de quadros a cada [5] segundos com as faixas proibidas marcadas, volume e picos, e o checklist final. Diga o que você mediu, o que viu por amostra e o que só eu posso julgar.`,
    'Um relatório curto separando o que foi medido do que depende do seu olho.',
    `Você disse que está tudo certo, mas em [0:41] a legenda sai da zona segura. Confira de novo esse trecho quadro a quadro.`);
  P('formatos', 'formatos-tamanho', 'Reduzir o tamanho do arquivo',
    'O arquivo passou do limite do WhatsApp, do e-mail ou da plataforma.',
    `O arquivo final ficou com [tamanho atual] e eu preciso de no máximo [limite] MB. Reencode mantendo a resolução e a melhor qualidade possível dentro do limite, sem mexer no áudio. Me diga o tamanho final e se dá para notar perda.`,
    'Uma cópia menor, com o original preservado.',
    `Deu para notar perda nas áreas escuras. Refaça em duas passadas e, se não couber, reduza para 720p.`);

  /* ---------- 23. SOM ---------- */
  P('som', 'som-completo', 'Som completo',
    'O vídeo está montado e mudo de efeitos.',
    `Use a skill som-e-trilha. Coloque efeitos sonoros nas entradas de texto e de cartão (clique, papel e whoosh baixos), no máximo 2 ou 3 impactos nos momentos principais, e a trilha referencias/trilhas/[arquivo.mp3] contínua e baixa, com a voz sempre acima. Normalize em -14 LUFS. Me mostre antes a tabela de efeitos com tempo e volume.`,
    'Uma tabela de sons para aprovar e, depois, o vídeo com mixagem equilibrada.',
    `Tem efeito demais. Tire todos os sons das legendas e deixe só nas entradas de cartão e nos 2 impactos.`);
  P('som', 'som-pack', 'Usar o pack de som do kit',
    'Você tem o Pack Impacto ou o Pack Estúdio.',
    `Meu pack de som fica em [caminho da pasta do pack]. Leia o LEIA-ME e o indice.csv de lá, sem ouvir nem listar arquivo por arquivo, e salve um resumo das categorias em referencias/sons.md. A partir de agora, escolha os efeitos e as trilhas por esse índice, sempre respeitando os volumes sugeridos no LEIA-ME.`,
    'O Claude passa a conhecer a sua biblioteca pelo índice, sem gastar limite abrindo cada som.',
    `Você usou o mesmo whoosh 6 vezes. Varie entre pelo menos 3 arquivos da mesma categoria.`);
  P('som', 'som-impactos', 'Escolher onde vão os impactos',
    'Para não exagerar no som forte.',
    `Pela transcrição e pela tabela de animações, quais são os 2 ou 3 momentos deste vídeo que merecem um efeito de impacto? Justifique cada um em uma linha. Todo o resto fica com som discreto ou sem som.`,
    'Dois ou três pontos justificados. O impacto funciona porque é raro.',
    `Troque o impacto de [0:10] pelo de [0:27], que é a virada do vídeo.`);
  P('som', 'som-trilha-alta', 'A música está alta',
    'A trilha disputa com a voz.',
    `A música está alta. Baixe a trilha [3] dB no vídeo todo, confira pelos números que a voz fica pelo menos 12 dB acima dela, normalize de novo em -14 LUFS e me mande 15 segundos de prévia. Salve o novo volume da trilha como regra no edicao.md.`,
    'Prévia com a voz na frente e a regra salva para os próximos vídeos.',
    `Agora a trilha sumiu. Suba 1,5 dB e mantenha esse valor como padrão.`);
  P('som', 'som-normalizar', 'Só normalizar o volume',
    'O vídeo veio de outro editor e só o volume está errado.',
    `Não mexa em nada da edição. Só normalize o áudio de render/[nome]/[arquivo.mp4] para -14 LUFS com pico de até -1,5 dBTP, em duas passadas, sem reencodar o vídeo. Me mostre o volume antes e depois.`,
    'O mesmo vídeo, com o volume padrão das plataformas e a imagem intacta.',
    `O pico estourou em [0:33]. Aplique um limitador antes da normalização e meça de novo.`);

  /* ---------- 24. CORREÇÃO ---------- */
  P('correcao', 'correcao-tempo', 'Feedback com tempo exato',
    'Depois de assistir qualquer prévia. É o prompt que você mais vai usar.',
    `Assisti a prévia. Corrija:
1. [0:12] a letra está grande demais
2. [0:20 a 0:22] corte essa pausa
3. [0:31] o cartão entra antes de eu falar, atrase
4. [final] segure o último texto por mais 1 segundo
5. [vídeo todo] a música está alta
Gere a v2 só com essas mudanças e me diga o que mudou em cada item.`,
    'Uma v2 que mexe só no que você apontou, com o relatório item por item.',
    `Você mudou coisa que eu não pedi em [0:40]. Volte esse trecho para como estava na v1.`);
  P('correcao', 'correcao-previa', 'Pedir uma prévia curta',
    'Antes de qualquer render completo.',
    `Use a skill previa-e-feedback. Renderize só os primeiros [20] segundos em baixa resolução, com o tempo aparecendo no canto da tela. Confira você mesmo antes de me mostrar e me diga o caminho do arquivo.`,
    'Um arquivo leve com o relógio na tela, para você apontar o tempo exato.',
    `Quero ver outro trecho: renderize de [0:45 a 1:05] do mesmo jeito.`);
  P('correcao', 'correcao-palavra', 'O corte comeu uma palavra',
    'O erro mais comum de corte seco.',
    `Em [0:18] o corte comeu o fim da palavra "[palavra]". Refaça esse ponto de corte deixando uma folga depois da palavra, confira os outros cortes pelo mesmo critério e me mande uma prévia só desse trecho com 2 segundos antes e depois.`,
    'O ponto corrigido e uma revisão dos demais cortes.',
    `Agora sobrou uma respiração. Deixe a folga em 0,1 segundo.`);
  P('correcao', 'correcao-salvar', 'Salvar a correção como regra',
    'No fim de toda edição. É o que faz o próximo vídeo sair melhor.',
    `Salve todas as correções desta edição no edicao.md, seção "Feedback acumulado", cada uma como uma regra geral de uma frase, com número quando houver, e a origem (vídeo e tempo). O que for regra de estética vai também para o design.md. Me mostre as linhas que você adicionou.`,
    'As regras novas escritas no seu arquivo. O Claude lê isso antes da próxima edição.',
    `A regra [3] ficou específica demais deste vídeo. Reescreva de um jeito que valha para todos.`);
  P('correcao', 'correcao-erro', 'Deu erro',
    'Apareceu uma mensagem de erro e você não sabe o que é.',
    `Deu esse erro (print anexado). Descubra a causa, corrija e me avise quando estiver resolvido. Me explique em uma frase o que era.`,
    'Na maioria das vezes ele resolve sozinho e explica em linguagem simples.',
    `O erro continua. Pare de repetir a mesma tentativa: me diga 2 caminhos diferentes e qual você recomenda.`);
  P('correcao', 'correcao-aprovado', 'Aprovado, pode finalizar',
    'A prévia está do jeito que você quer.',
    `Aprovado. Renderize o vídeo completo em qualidade final, confira o render com a skill conferir-render e me entregue o relatório com o caminho do arquivo.`,
    'O arquivo final e o relatório de conferência.',
    `O final ficou diferente da prévia em [0:50]. Compare os dois e me diga o que mudou.`);

  /* ---------- 25. TOKENS ---------- */
  P('tokens', 'tokens-regras', 'Regras para gastar menos',
    'No começo de toda sessão de edição, se a skill economia-de-tokens não estiver instalada.',
    `Nesta sessão, siga estas regras para economizar o meu limite: trabalhe pela transcrição antes de olhar qualquer quadro; quando precisar ver imagem, use uma grade pequena de poucos quadros e só do trecho necessário; nunca abra o vídeo inteiro quadro a quadro; não releia arquivos que você já leu; mostre o plano em texto antes de renderizar; e faça prévias curtas em baixa resolução.`,
    'Edições que consomem bem menos do seu limite, porque texto é barato e imagem é cara.',
    `Você abriu quadros demais. Daqui em diante, me pergunte antes de olhar qualquer imagem.`);
  P('tokens', 'tokens-retomar', 'Retomar em uma sessão nova',
    'A conversa ficou longa ou você voltou no dia seguinte. Sessão nova gasta menos.',
    `Estou retomando a edição do vídeo [nome]. Leia design.md, edicao.md e os arquivos de texto em render/[nome]/ (briefing, plano, notas e feedback). Me diga em 5 linhas em que ponto paramos e qual é o próximo passo. Não renderize nada ainda.`,
    'Um resumo curto do ponto em que o trabalho parou, sem reprocessar o vídeo.',
    `Faltou contexto. Antes de eu fechar esta sessão, escreva em render/[nome]/notas.md tudo que a próxima sessão precisa saber.`);
  P('tokens', 'tokens-referencia', 'Analisar uma referência sem assistir',
    'Você quer aprender com o vídeo de outro criador.',
    `Analise referencias/[referencia.mp4] sem assistir quadro a quadro: use os dados do arquivo, a contagem de trocas de cena e uma grade pequena de quadros. Me diga o ritmo de corte (segundos por plano), como é a legenda (tamanho aproximado, posição, quantas palavras por vez), as cores dominantes e o tipo de animação. O que dali vale levar para o meu design.md?`,
    'Um raio X da referência em números, por uma fração do custo de assistir.',
    `Quero mais detalhe só do gancho: analise os primeiros 3 segundos com 1 quadro a cada meio segundo.`);
  P('tokens', 'tokens-plano', 'Só o plano, sem render',
    'Você quer decidir antes de gastar.',
    `Não renderize nada. Transcreva brutos/[arquivo.mp4] e me entregue só o plano de edição em texto: gancho dos 3 primeiros segundos, lista de cortes com tempo e motivo, textos de 1 a 3 palavras com o tempo de entrada, onde entra efeito sonoro (no máximo 2 ou 3 impactos) e a duração final estimada.`,
    'O vídeo inteiro decidido em texto. Corrigir texto leva segundos, corrigir render leva minutos.',
    `O plano passou de [60] segundos. Proponha o que sai para caber, sem cortar palavra pela metade.`);

  /* ---------- 26. PREPARAR ---------- */
  P('preparar', 'preparar-instalar', 'Instalar tudo que precisa',
    'Primeiro pedido no computador novo.',
    `Prepare este computador para eu editar vídeos com você. Verifique e instale o que faltar: FFmpeg e FFprobe (confira se o FFmpeg tem os filtros ass e drawtext, usados para legenda e texto), Python 3 com pillow e numpy, um transcritor com tempo por palavra (faster-whisper) e Node.js. Antes de instalar cada coisa, me diga o que é e para que serve. No fim, faça um teste rápido de cada um e me mostre uma tabela com nome, se está instalado e a versão.`,
    'O Claude pede permissão para rodar os comandos, instala o que falta e termina com uma tabela de conferência. Leva de 5 a 20 minutos, conforme a internet.',
    `A tabela mostra que [FFmpeg] falhou. Descubra a causa, tente outro método de instalação e teste de novo.`);
  P('preparar', 'preparar-conferir', 'Conferir sem instalar nada',
    'Você já tem coisa instalada e quer só o diagnóstico.',
    `Não instale nada. Só confira o que este computador já tem para edição de vídeo: FFmpeg, FFprobe, Python, Whisper ou faster-whisper, Node.js e Remotion. Me mostre uma tabela com o nome, se está instalado e a versão.`,
    'Uma tabela com o que existe e o que falta.',
    `Instale só o que está faltando na tabela, um por vez, me avisando antes de cada um.`);
  P('preparar', 'preparar-pasta', 'Criar a pasta de edição',
    'Depois de instalar, dentro da pasta que você escolheu.',
    `Crie nesta pasta a estrutura de edição: brutos/, referencias/ (com subpastas fontes/, trilhas/, sfx/ e prints/) e render/. Não mova nenhum arquivo que já esteja aqui sem me perguntar.`,
    'Três pastas principais prontas. Brutos entram em brutos/ e tudo que o Claude gera sai em render/.',
    `Já tenho arquivos soltos aqui. Liste e proponha para onde cada um vai, sem mover nada ainda.`);
  P('preparar', 'preparar-material', 'Colocar o material do kit no lugar',
    'Você baixou os arquivos do kit e descompactou.',
    `Baixei o material do kit em [caminho da pasta de downloads]. Copie os arquivos de modelos/ (CLAUDE.md, design.md, edicao.md, briefing-de-video.md, checklist-publicacao.md) para a raiz desta pasta de edição, sem sobrescrever nada que já exista. O pacote-de-edicao fica onde está: leia o LEIA-ME dele e guarde o caminho no CLAUDE.md para usar nas próximas edições.`,
    'Os modelos na raiz da sua pasta e o Claude sabendo onde fica o pacote de edição.',
    `Você copiou por cima do meu design.md. Restaure o meu e salve o do kit como design-exemplo.md.`);
  P('preparar', 'preparar-skills-kit', 'Instalar as skills do kit',
    'Com o arquivo skills-anderson-brito.zip baixado.',
    `Instale as skills do kit. O arquivo está em [caminho do skills-anderson-brito.zip]. Descompacte e copie cada pasta para a minha pasta de skills do Claude (~/.claude/skills/ no Mac, C:\\Users\\MEU_USUARIO\\.claude\\skills\\ no Windows), uma pasta por skill com o SKILL.md na raiz. Copie também a pasta legendas-virais de dentro do pacote-de-edicao. Não sobrescreva skill com o mesmo nome sem me perguntar. No fim, liste o que foi instalado.`,
    'A lista das skills instaladas. Feche e abra o Claude para ele enxergar as novas.',
    `A skill [nome] não aparece quando eu digito a barra. Confira se o SKILL.md está na raiz da pasta dela e me diga o caminho.`);
  P('preparar', 'preparar-skill-github', 'Instalar uma skill gratuita do GitHub',
    'Para cada skill de terceiros da lista recomendada. Uma por vez.',
    `Instale a skill deste repositório: [https://github.com/remotion-dev/skills]. Antes de instalar, leia o README e o SKILL.md e me diga em 5 linhas: o que ela faz, que programas ela instala, qual é a licença e se ela usa algum serviço pago ou envia arquivos para fora do meu computador. Só instale em ~/.claude/skills/ depois do meu OK, seguindo o comando do README.`,
    'Um resumo do que a skill faz e do que ela exige, antes de qualquer instalação.',
    `Essa skill pede chave de um serviço pago. Não instale. Me diga se alguma skill do kit faz a mesma coisa.`);
  P('preparar', 'preparar-teste', 'Testar a transcrição',
    'Para confirmar que tudo funciona antes do primeiro vídeo.',
    `Faça um teste de transcrição: pegue os primeiros 30 segundos de brutos/[arquivo.mp4], transcreva em português com tempo por palavra e me mostre o texto e quanto tempo levou. Se errar muitas palavras, sugira um modelo maior.`,
    'O texto dos primeiros 30 segundos e o tempo gasto. Se saiu certo, a máquina está pronta.',
    `Errou nomes próprios. Guarde esta lista no edicao.md para corrigir sempre: [lista de nomes e termos].`);

  /* ---------- 27. ESTÉTICA ---------- */
  P('estetica', 'estetica-design', 'Criar o seu design.md',
    'Uma vez, no começo. Coloque de 3 a 5 referências em referencias/ antes.',
    `Use a skill manual-de-estetica. Analise tudo que está em referencias/ e crie o design.md na raiz: identidade e tom, cores (hex e uso), tipografia (fontes, pesos e tamanhos), elementos gráficos, layout 9:16 e 16:9 com zonas seguras, movimento, som e a lista do que é proibido. Antes de gravar, me mostre o rascunho e me pergunte o que faltar.`,
    'Um rascunho do seu manual de estética e algumas perguntas. Depois das respostas, o arquivo salvo.',
    `Isso está parecido com o exemplo do kit. Refaça a partir das minhas referências: [o que você quer diferente].`);
  P('estetica', 'estetica-entrevista', 'Não tenho referência, me entreviste',
    'Você não sabe descrever o seu estilo.',
    `Não tenho referências separadas. Me entreviste para montar o design.md: faça até 8 perguntas curtas, uma por vez, sobre o meu público, o tom, cores que eu gosto e que eu odeio, criadores que eu admiro e o que eu nunca quero ver nos meus vídeos. Depois escreva o design.md e gere uma cartela de teste em 1080x1920 para eu ver as cores e fontes na prática.`,
    'Uma conversa curta e, no fim, o design.md com uma imagem de teste.',
    `As cores da cartela ficaram sem contraste. Garanta que o texto principal seja legível sobre o fundo e me mostre de novo.`);
  P('estetica', 'estetica-claude-md', 'Preencher o CLAUDE.md',
    'Logo depois de copiar os modelos do kit.',
    `Use o modelo CLAUDE.md que está nesta pasta e preencha com os meus dados. Meu perfil é [@perfil], meu conteúdo é sobre [assunto], meu público é [público] e eu publico em [plataformas]. Preencha a seção de ferramentas com o que está instalado nesta máquina e anote onde fica o pacote de edição. Mantenha o arquivo curto.`,
    'Um CLAUDE.md curto, que o Claude lê sozinho toda vez que você abre a pasta.',
    `Ficou longo. Corte para no máximo 40 linhas e deixe só o que muda o seu comportamento.`);
  P('estetica', 'estetica-base-kit', 'Partir do exemplo do kit',
    'Você gostou da estrutura do design.md do kit e quer adaptar.',
    `Quero partir do exemplo de design.md do kit, mas com a minha identidade. Mantenha a estrutura e as zonas seguras. Troque as cores por [suas cores], as fontes por [suas fontes] e reescreva Identidade, Elementos gráficos e Proibido a partir do que eu te contar. Me faça as perguntas necessárias antes.`,
    'O mesmo esqueleto, com a sua cara.',
    `Atualize o design.md: [a legenda agora é em caixa alta e o destaque passa a ser amarelo]. Mude só isso e registre no Histórico.`);
  P('estetica', 'estetica-revisar', 'Revisar depois de alguns vídeos',
    'A cada 5 ou 10 vídeos.',
    `Leia o design.md e a seção "Feedback acumulado" do edicao.md. Tem regra de estética no feedback que ainda não está no design.md? Tem regra contraditória entre os dois? Liste e proponha a correção. Só altere depois do meu OK.`,
    'Uma lista de ajustes para manter os dois arquivos coerentes.',
    `Aprovados os itens [1 e 3]. O item 2 fica como está.`);

  /* ---------- SKILLS GRATUITAS RECOMENDADAS ---------- */
  var SKILLS_GRATIS = [
    { nome: 'Remotion Agent Skills', url: 'https://github.com/remotion-dev/skills', para: 'Ensinam o Claude a usar o Remotion (vídeo em React): criar projeto, legendas, render, mapas.', obs: 'O Remotion tem licença própria para empresas. Leia antes de usar em empresa.' },
    { nome: 'HyperFrames', url: 'https://github.com/heygen-com/hyperframes', para: 'O Claude escreve HTML e a ferramenta renderiza como vídeo. Alternativa ao Remotion para quem prefere HTML e CSS.', obs: 'Licença Apache-2.0. Peça em partes para não gastar limite demais.' },
    { nome: 'lemo-opuscar', url: 'https://github.com/lemomo-ai/lemo-opuscar', para: 'Curtas feitos em código em estilos visuais prontos (aquarela, pintura a óleo, vista explodida).', obs: 'Licença MIT. Bom para vinheta e explicativo.' },
    { nome: 'claude-video (watch)', url: 'https://github.com/bradautomates/claude-video', para: 'Faz o Claude analisar um vídeo de referência por quadros e transcrição, de forma econômica.', obs: 'Licença MIT. Instala pelo aplicativo, em Customize, Plugins.' },
    { nome: 'video-use', url: 'https://github.com/browser-use/video-use', para: 'Skill completa de edição por conversa: transcreve, corta, legenda e monta.', obs: 'Licença MIT. Usa uma chave paga de transcrição de terceiros. As skills do kit transcrevem no seu computador.' },
    { nome: 'svg-diagram', url: 'https://github.com/pkt-lab/svg-diagram', para: 'Diagramas e fluxogramas em SVG para usar como imagem de apoio em vídeo explicativo.', obs: 'Licença MIT.' },
    { nome: 'Skills da Anthropic', url: 'https://github.com/anthropics/skills', para: 'Repositório oficial de exemplos. Bom para ver como uma skill bem escrita é organizada.', obs: 'Licença varia por skill.' }
  ];

  /* ---------- DOWNLOADS ---------- */
  var DOWNLOADS = [
    { chave: 'ebook', ic: 'livro', nome: 'E-book Editar Vídeo com Claude', desc: 'As aulas práticas em PDF, do primeiro vídeo ao motion em código.', tam: 'PDF · 2,2 MB', combos: ['kit', 'impacto', 'estudio'] },
    { chave: 'manual_rapido', ic: 'raio', nome: 'Manual rápido', desc: 'O resumo para começar hoje: o que instalar, a pasta e o primeiro pedido.', tam: 'PDF · leitura de 5 minutos', combos: ['kit', 'impacto', 'estudio'] },
    { chave: 'pacote_edicao_zip', ic: 'caixa', nome: 'Pacote de Edição', desc: '15 estilos de texto em destaque, 298 ícones, 36 elementos de motion, fundos, guias de zona segura e 3 projetos prontos.', tam: 'ZIP · 292 MB', combos: ['kit', 'impacto', 'estudio'] },
    { chave: 'skills_zip', ic: 'chip', nome: 'Skills do kit', desc: 'As ' + N_SKILLS + ' skills do método, prontas para copiar para a pasta de skills do Claude.', tam: 'ZIP · 40 KB', combos: ['kit', 'impacto', 'estudio'] },
    { chave: 'catalogo_skills', ic: 'lista', nome: 'Catálogo de skills', desc: '69 skills separadas por categoria: o que cada uma faz, quando usar e de onde vem.', tam: 'Documento · 22 KB', combos: ['kit', 'impacto', 'estudio'] },
    { chave: 'modelos_zip', ic: 'doc', nome: 'Modelos de arquivo', desc: 'CLAUDE.md, design.md, edicao.md, briefing de vídeo e checklist de publicação.', tam: 'ZIP · 5 arquivos de texto', combos: ['kit', 'impacto', 'estudio'] },
    { chave: 'prompts_doc', ic: 'chat', nome: 'Biblioteca de prompts', desc: 'Os mesmos prompts desta página em um Google Docs, para copiar e adaptar.', tam: 'Google Docs · abre no navegador', combos: ['kit', 'impacto', 'estudio'] },
    { chave: 'pack_impacto_zip', ic: 'onda', nome: 'Pack Impacto', desc: '171 efeitos sonoros em WAV, separados por categoria, com índice para o Claude escolher.', tam: 'ZIP · 55 MB', combos: ['impacto'], pack: true },
    { chave: 'pack_estudio_zip', ic: 'nota', nome: 'Pack Estúdio', desc: '354 efeitos sonoros em WAV e 33 trilhas instrumentais sem voz, com índice. Já inclui tudo do Pack Impacto.', tam: 'ZIP · 238 MB', combos: ['estudio'], pack: true },
    { chave: 'pasta_drive', ic: 'pasta', nome: 'Pasta completa no Drive', desc: 'Todos os arquivos acima em uma pasta só, para quem prefere baixar de uma vez.', tam: 'Google Drive', combos: ['kit', 'impacto', 'estudio'] }
  ];

  var COMBOS = {
    kit: { nome: 'Kit Editar com Claude', selo: 'Kit' },
    impacto: { nome: 'Kit + Pack Impacto', selo: 'Kit + Pack Impacto' },
    estudio: { nome: 'Kit + Pack Estúdio', selo: 'Kit + Pack Estúdio' }
  };

  var DADOS = { PRECO_CLAUDE: PRECO_CLAUDE, N_SKILLS: N_SKILLS, TIPOS: TIPOS, PROMPTS: PROMPTS, SKILLS_GRATIS: SKILLS_GRATIS, DOWNLOADS: DOWNLOADS, COMBOS: COMBOS, VENDAS: '/editar-com-claude.html#comprar' };
  root.DADOS = DADOS;
  if (typeof module !== 'undefined' && module.exports) module.exports = DADOS;
})(typeof window !== 'undefined' ? window : globalThis);
