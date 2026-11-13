/* ÁREA DE ACESSO · Kit Editar com Claude
   Um script para as três versões. O combo vem de <body data-combo="kit|impacto|estudio">. */
(function () {
  'use strict';
  var D = window.DADOS, L = window.LINKS || {};
  var combo = document.body.getAttribute('data-combo') || 'kit';
  if (!D.COMBOS[combo]) combo = 'kit';
  var app = document.getElementById('app');

  /* ---------- utilidades ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function link(k) { var v = (L[k] || '').trim(); return v || ''; }
  function guarda(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function le(k, pad) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? pad : v; } catch (e) { return pad; } }
  var CL = '<span class="cl"><img src="/assets/kit-claude/logo-claude.svg" alt="" width="18" height="18">Claude</span>';

  function copiar(txt) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(txt).catch(function () { return copiaAntiga(txt); });
    }
    return copiaAntiga(txt);
  }
  function copiaAntiga(txt) {
    return new Promise(function (ok, erro) {
      var ta = document.createElement('textarea');
      ta.value = txt; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length);
      var deu = false;
      try { deu = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      deu ? ok() : erro(new Error('copia'));
    });
  }

  var IC = {
    livro: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7M8 11h5"/>',
    raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    caixa: '<path d="M3 8 12 3l9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    lista: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    doc: '<path d="M6 2h8l5 5v15H6z"/><path d="M14 2v5h5M9 13h6M9 17h6"/>',
    chat: '<path d="M4 4h16v12H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
    onda: '<path d="M3 12h2M7 7v10M11 3v18M15 8v8M19 10v4"/>',
    nota: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    pasta: '<path d="M3 6a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    seta: '<path d="M7 17 17 7M9 7h8v8"/>',
    copia: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
    zap: '<path d="M4 20l1.4-4.2A8 8 0 1 1 8.3 18.6z"/><path d="M9 9c0 3 3 6 6 6l1.2-1.6-2-1-0.9 0.8c-1-.4-1.9-1.3-2.3-2.3l.8-.9-1-2z"/>'
  };
  function ic(n) { return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }

  /* ---------- bloco de código copiável ---------- */
  function cod(txt, rotulo) {
    return '<div class="cod"><pre>' + esc(txt) + '</pre><button type="button" class="bcop mini" data-copia="' + esc(txt) + '">' + ic('copia') + '<span>' + (rotulo || 'copiar') + '</span></button></div>';
  }

  /* ---------- cartão de prompt ---------- */
  var RE = /\[([^\]\n]{1,140})\]/g;
  function campos(txt) {
    var out = [], m; RE.lastIndex = 0;
    while ((m = RE.exec(txt))) if (out.indexOf(m[1]) < 0) out.push(m[1]);
    return out;
  }
  function promptHtml(txt, cs) {
    return esc(txt).replace(RE, function (tudo, ph) {
      var bruto = ph.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      return '<mark data-i="' + cs.indexOf(bruto) + '">[' + ph + ']</mark>';
    });
  }
  function cartao(p, opt) {
    opt = opt || {};
    var cs = campos(p.prompt);
    var t = D.TIPOS.filter(function (x) { return x.id === p.tipo; })[0];
    var h = '<article class="pr vidro' + (opt.compacto ? ' compacto' : '') + '" data-id="' + p.id + '" data-tipo="' + p.tipo + '">';
    h += '<header><div><span class="tag">' + esc(t ? t.nome : p.tipo) + '</span><h4>' + esc(p.titulo) + '</h4></div>' +
      '<button type="button" class="bcop" data-prompt>' + ic('copia') + '<span>copiar</span></button></header>';
    h += '<p class="quando"><b>Quando usar:</b> ' + esc(p.quando_usar) + '</p>';
    h += '<pre class="ptxt">' + promptHtml(p.prompt, cs) + '</pre>';
    if (cs.length) {
      h += '<div class="campos">';
      cs.forEach(function (c, i) {
        h += '<label><span>' + esc(c.length > 34 ? c.slice(0, 32) + '…' : c) + '</span><input type="text" data-i="' + i + '" placeholder="' + esc(c) + '" autocomplete="off" spellcheck="false"></label>';
      });
      h += '</div>';
    }
    h += '<div class="extra"><p><b>O que esperar:</b> ' + esc(p.resultado) + '</p>';
    h += '<div class="errado"><p><b>Se der errado, peça assim:</b> <span class="ctxt">' + esc(p.correcao) + '</span></p>' +
      '<button type="button" class="bcop mini" data-copia="' + esc(p.correcao) + '">' + ic('copia') + '<span>copiar</span></button></div></div>';
    return h + '</article>';
  }
  function porId(id) { return D.PROMPTS.filter(function (p) { return p.id === id; })[0]; }
  function cp(id) { var p = porId(id); return p ? cartao(p, { compacto: true }) : ''; }

  /* ---------- seções ---------- */
  function secTopo() {
    var nav = [['comecar', 'Começar'], ['aula', 'Aula'], ['passos', 'Passo a passo'], ['downloads', 'Downloads'], ['prompts', 'Prompts'], ['suporte', 'Suporte']];
    return '<header class="topo"><div class="wrap">' +
      '<a class="marca" href="#comecar">Kit Editar com ' + CL + '</a>' +
      '<nav aria-label="Seções">' + nav.map(function (n) { return '<a href="#' + n[0] + '">' + n[1] + '</a>'; }).join('') + '</nav>' +
      '</div></header>';
  }

  function secComecar() {
    return '<section id="comecar" class="hero"><div class="wrap">' +
      '<span class="rot">&gt; área de acesso · ' + esc(D.COMBOS[combo].selo) + '</span>' +
      '<h1>Bem-vindo ao Kit Editar com ' + CL + '</h1>' +
      '<p class="lead">Obrigado por comprar. Aqui estão a aula, os arquivos e os prompts. Seguindo o passo a passo, dá para sair do zero e ter um primeiro vídeo editado ainda hoje.</p>' +
      '<div class="comece">' +
      '<a class="vidro" href="#aula"><b class="n">1</b><span><strong>Assista a aula</strong>Veja o processo inteiro uma vez antes de instalar.</span></a>' +
      '<a class="vidro" href="#passos"><b class="n">2</b><span><strong>Siga o passo a passo</strong>Seis etapas, com o prompt pronto em cada uma.</span></a>' +
      '<a class="vidro" href="#prompts"><b class="n">3</b><span><strong>Copie os prompts</strong>' + D.PROMPTS.length + ' pedidos prontos, separados por tipo de vídeo.</span></a>' +
      '</div>' +
      '<p class="aviso-salve">Salve esta página nos favoritos. O link é seu: não compartilhe.</p>' +
      '</div></section>';
  }

  function secAula() {
    var id = link('aula_youtube');
    var corpo = id
      ? '<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0" title="Aula completa do Kit Editar com Claude" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>'
      : '<div class="video vazio"><div><span class="selo-lib">em liberação</span><p><strong>A aula entra aqui.</strong></p><p>O vídeo completo está sendo publicado e aparece neste espaço, sem você precisar de outro link. Enquanto isso, comece pelo passo a passo e pelo e-book.</p></div></div>';
    return '<section id="aula"><div class="wrap">' +
      '<span class="rot">&gt; aula</span><h2>Aula completa em vídeo</h2>' +
      '<p class="lead">O processo inteiro na tela: instalação, pasta, skills e a edição de um vídeo do bruto ao arquivo final.</p>' + corpo +
      '</div></section>';
  }

  function passos() {
    var pc = D.PRECO_CLAUDE;
    var gratis = D.SKILLS_GRATIS.map(function (s) {
      return '<li><div><a href="' + s.url + '" target="_blank" rel="noopener">' + esc(s.nome) + '</a><p>' + esc(s.para) + ' <em>' + esc(s.obs) + '</em></p></div>' +
        '<button type="button" class="bcop mini" data-copia="' + esc(porId('preparar-skill-github').prompt.replace(/\[https:[^\]]+\]/, s.url)) + '">' + ic('copia') + '<span>copiar pedido</span></button></li>';
    }).join('');
    return [
      { id: 'a', t: 'Assinar o ' + CL + ' e instalar o aplicativo', min: '10 min', h:
        '<p>O plano mais barato que inclui o Claude Code é o <strong>' + pc.plano + '</strong>: <strong class="num">' + pc.valor + '</strong> no Brasil (valor conferido em ' + pc.conferido + '). O plano grátis não inclui o Claude Code. O preço pode mudar: confirme na página oficial antes de assinar.</p>' +
        '<ol><li>Crie a conta e assine em <a href="https://claude.com/pricing" target="_blank" rel="noopener">claude.com/pricing</a>.</li>' +
        '<li>Baixe o aplicativo do Claude para Mac ou Windows em <a href="https://claude.com/download" target="_blank" rel="noopener">claude.com/download</a> e entre com a sua conta.</li>' +
        '<li>No aplicativo, abra a aba <strong>Code</strong>. É ali que o Claude trabalha dentro de uma pasta do seu computador.</li></ol>' +
        '<details class="mais"><summary>Prefere o terminal? (opcional)</summary><p>No Mac, abra o Terminal e cole:</p>' + cod('curl -fsSL https://claude.ai/install.sh | bash') +
        '<p>No Windows, abra o PowerShell e cole:</p>' + cod('irm https://claude.ai/install.ps1 | iex') +
        '<p>Depois digite <code>claude</code> dentro da sua pasta de edição. Os comandos são os da documentação oficial: confira lá se algo mudar.</p></details>' },
      { id: 'b', t: 'Downloads obrigatórios', min: '15 min', h:
        '<p>Quatro programas gratuitos precisam estar no computador. Você não instala na mão: o Claude instala e confere.</p>' +
        '<ul class="req"><li><strong>FFmpeg</strong><span>corta, junta, legenda e mede o áudio</span></li><li><strong>Python 3</strong><span>roda os scripts das skills e do pacote</span></li><li><strong>Node.js</strong><span>renderiza as animações em código</span></li><li><strong>Transcritor (Whisper)</strong><span>transforma a fala em texto com o tempo de cada palavra</span></li></ul>' +
        '<p>Crie uma pasta qualquer (por exemplo <code>edicao-de-videos</code>), abra essa pasta na aba Code e envie:</p>' + cp('preparar-instalar') +
        '<p class="nota">O Claude vai pedir permissão antes de rodar comandos. Leia e aprove. Se já tiver coisa instalada, use o pedido abaixo.</p>' + cp('preparar-conferir') },
      { id: 'c', t: 'Criar a pasta de edição e colocar o material do kit', min: '5 min', h:
        '<p>Baixe na seção <a href="#downloads">Downloads</a> o <strong>Pacote de Edição</strong> e os <strong>Modelos de arquivo</strong> e descompacte. Deixe o pacote em um lugar fixo do computador.</p>' +
        cp('preparar-pasta') + cp('preparar-material') +
        '<p class="nota">Seus vídeos gravados vão em <code>brutos/</code>. Tudo que o Claude gera sai em <code>render/</code>. Ele nunca altera os originais.</p>' },
      { id: 'd', t: 'Configurar a IA: instalar as skills', min: '10 min', h:
        '<p>Skill é uma pasta com instruções que ensina o Claude a fazer uma tarefa do jeito certo. O kit traz <strong class="num">' + D.N_SKILLS + '</strong> skills. A pasta de skills fica em <code>~/.claude/skills/</code> no Mac e em <code>C:\\Users\\SEU_USUARIO\\.claude\\skills\\</code> no Windows.</p>' +
        '<h5>1. Skills do kit</h5>' + cp('preparar-skills-kit') +
        '<h5>2. Skills gratuitas do GitHub</h5><p>Opcionais. Instale uma por vez, só as que for usar. O pedido já manda o Claude ler a skill e avisar se ela usa serviço pago.</p>' + cp('preparar-skill-github') +
        '<p>Lista recomendada (o botão copia o pedido já com o endereço):</p><ul class="gratis">' + gratis + '</ul>' +
        '<h5>3. Onde achar mais</h5><div class="vidro dica"><p><a href="https://skillry.dev/skills/output/video" target="_blank" rel="noopener">skillry.dev/skills/output/video</a> é um diretório de skills para agentes como o Claude Code. A página de vídeo reúne skills de filme de lançamento, motion graphics e sobreposições animadas em volta de quem fala (título atrás da pessoa, checklist, gráfico, chamada), com filtro por finalidade e um vídeo de exemplo em cada uma.</p><p>Cada skill tem um botão que copia o pedido de instalação para colar no Claude. Algumas são gratuitas e a maioria exige assinatura do site: veja qual é o caso antes de instalar.</p></div>' +
        '<p class="nota">O catálogo completo, com 69 skills comentadas, está em Downloads.</p>' },
      { id: 'e', t: 'Preencher o design.md e o CLAUDE.md', min: '15 min', h:
        '<p>O <code>design.md</code> é o seu gosto por escrito: cores, fontes, tamanho de legenda, o que é proibido. O <code>CLAUDE.md</code> diz quem você é e como a pasta funciona. O Claude lê os dois antes de cada edição, então você explica uma vez só.</p>' +
        '<p>Coloque de 3 a 5 referências (prints, vídeos que você gosta, sua logo, suas fontes) em <code>referencias/</code> e envie:</p>' + cp('estetica-design') +
        '<p>Sem referência separada? Use este:</p>' + cp('estetica-entrevista') + cp('estetica-claude-md') },
      { id: 'f', t: 'Primeiro vídeo', min: '20 min', h:
        '<p>Escolha um vídeo falado de até 2 minutos, coloque em <code>brutos/</code> e envie o pedido. Troque o nome do arquivo e o objetivo.</p>' + cp('primeiro-video') +
        '<div class="vidro dica"><p><strong>O que esperar.</strong> O Claude transcreve, mostra o plano em texto e espera o seu OK. Depois manda uma prévia curta em baixa resolução. O arquivo final só sai quando você aprovar.</p><p><strong>Como pedir correção.</strong> Assista a prévia e responda com o tempo exato de cada ajuste, um por linha. Evite "melhora aí": diga o tempo e o que mudar.</p></div>' +
        cp('correcao-tempo') + cp('correcao-salvar') +
        '<p class="nota">As primeiras edições saem medianas. É normal. O resultado melhora conforme o <code>edicao.md</code> acumula o seu feedback.</p>' }
    ];
  }
  function secPassos() {
    var ps = passos(), feito = le('acesso-kit-passos', {});
    var h = '<section id="passos"><div class="wrap"><span class="rot">&gt; passo a passo</span><h2>Do zero ao primeiro vídeo</h2>' +
      '<p class="lead">Seis etapas, na ordem. Marque cada uma ao terminar: o progresso fica salvo neste navegador.</p>' +
      '<div class="prog vidro"><div class="barra"><i id="progBarra"></i></div><span id="progTxt"></span></div><div class="passos">';
    ps.forEach(function (p, i) {
      h += '<details class="passo vidro' + (feito[p.id] ? ' ok' : '') + '" id="passo-' + p.id + '"' + (i === 0 ? ' open' : '') + '>' +
        '<summary><b class="n">' + (i + 1) + '</b><span class="tit">' + p.t + '</span><span class="min">' + p.min + '</span></summary>' +
        '<div class="corpo">' + p.h +
        '<label class="feito"><input type="checkbox" data-passo="' + p.id + '"' + (feito[p.id] ? ' checked' : '') + '><span>Etapa concluída</span></label></div></details>';
    });
    return h + '</div></div></section>';
  }

  function secDownloads() {
    var itens = D.DOWNLOADS.filter(function (d) { return d.combos.indexOf(combo) >= 0; });
    var h = '<section id="downloads"><div class="wrap"><span class="rot">&gt; downloads</span><h2>Seus arquivos</h2>' +
      '<p class="lead">Cada botão abre o Google Drive em uma nova aba. Baixe e guarde uma cópia no seu computador.</p><div class="dls">';
    itens.forEach(function (d) {
      var url = link(d.chave);
      var miolo = '<span class="dic">' + ic(d.ic) + '</span><span class="dtx"><strong>' + esc(d.nome) + (d.pack ? ' <i class="selo-pack">seu pack</i>' : '') + '</strong><span>' + esc(d.desc) + '</span><em>' + esc(d.tam) + '</em></span>';
      h += url
        ? '<a class="dl vidro' + (d.pack ? ' pack' : '') + '" href="' + esc(url) + '" target="_blank" rel="noopener" data-chave="' + d.chave + '">' + miolo + '<span class="dacao">' + ic('seta') + 'abrir</span></a>'
        : '<div class="dl vidro off' + (d.pack ? ' pack' : '') + '" aria-disabled="true" data-chave="' + d.chave + '">' + miolo + '<span class="dacao lib">em liberação</span></div>';
    });
    h += '</div>';
    if (combo === 'kit') {
      h += '<aside class="upg vidro"><div><strong>Packs de som (opcional)</strong><p>Esta versão não inclui os packs. O Pack Impacto tem 171 efeitos sonoros e o Pack Estúdio tem 354 efeitos e 33 trilhas, com índice para o Claude escolher.</p></div><a class="bt fantasma" href="' + D.VENDAS + '">Ver os packs</a></aside>';
    }
    h += '<p class="nota">Botão "em liberação" quer dizer que o arquivo está sendo enviado. Ele abre sozinho assim que o link entrar, sem você precisar de outro endereço.</p>';
    return h + '</div></section>';
  }

  function secPrompts() {
    var h = '<section id="prompts"><div class="wrap"><span class="rot">&gt; prompts</span><h2>Biblioteca de prompts para copiar</h2>' +
      '<p class="lead">Escolha o tipo de vídeo, preencha os campos e copie. Cole no Claude com a sua pasta de edição aberta. Um pedido por vez dá resultado melhor do que tudo junto.</p>' +
      '<div class="filtro vidro"><input type="search" id="busca" placeholder="Buscar: legenda, podcast, trilha, erro..." aria-label="Buscar prompt">' +
      '<div class="chips" id="chips" role="tablist"><button type="button" class="chip on" data-tipo="">Todos <i>' + D.PROMPTS.length + '</i></button>';
    D.TIPOS.forEach(function (t) {
      var n = D.PROMPTS.filter(function (p) { return p.tipo === t.id; }).length;
      h += '<button type="button" class="chip" data-tipo="' + t.id + '">' + esc(t.nome) + ' <i>' + n + '</i></button>';
    });
    h += '</div><p class="conta" id="conta" aria-live="polite"></p></div><div id="lista">';
    D.TIPOS.forEach(function (t) {
      var ps = D.PROMPTS.filter(function (p) { return p.tipo === t.id; });
      h += '<section class="grupo' + (t.exemplo ? ' com-ex' : '') + '" data-grupo="' + t.id + '"><header class="gh"><h3>' + esc(t.nome) + '</h3><p>' + esc(t.desc) + '</p></header>';
      if (t.exemplo) h += '<figure class="ex"><video src="' + t.exemplo + '#t=0.5" controls playsinline muted preload="metadata"></video><figcaption>Exemplo feito com estes prompts</figcaption></figure>';
      h += '<div class="cards">' + ps.map(function (p) { return cartao(p); }).join('') + '</div></section>';
    });
    h += '</div><p class="vazio-busca" id="nada" hidden>Nenhum prompt com esse termo. Tente outra palavra ou escolha "Todos".</p>' +
      '<div class="vidro dica"><p><strong>Para escrever os seus.</strong> Diga o arquivo, o formato e o objetivo. Peça o plano em texto antes do render. Dê números ("pausa de até 0,3 segundo", "trilha 3 dB mais baixa") e o tempo ("em 0:12"). Um assunto por mensagem quando for correção. Termine com "salve no edicao.md" quando a correção valer para os próximos vídeos.</p></div>';
    return h + '</div></section>';
  }

  function secSuporte() {
    function b(k, txt, cls) {
      var u = link(k);
      return u ? '<a class="bt ' + (cls || '') + '" href="' + esc(u) + '" target="_blank" rel="noopener">' + ic('zap') + txt + '</a>' : '<span class="bt off">' + txt + ' · em liberação</span>';
    }
    return '<section id="suporte"><div class="wrap"><span class="rot">&gt; suporte</span><h2>Precisa de ajuda?</h2>' +
      '<p class="lead">Travou em alguma etapa ou um link não abriu? Me chame no WhatsApp com um print da tela. No canal eu aviso quando entra material novo.</p>' +
      '<div class="sup">' + b('suporte_whatsapp', 'Falar no WhatsApp') + b('canal_whatsapp', 'Entrar no canal de avisos', 'fantasma') + '</div>' +
      '<div class="vidro uso"><h3>Uso do material</h3><ul>' +
      '<li>A licença é pessoal, de quem comprou. Você pode usar as skills, os modelos, os prompts e os arquivos nos seus vídeos e nos vídeos dos seus clientes.</li>' +
      '<li>Não é permitido revender, redistribuir nem publicar o conteúdo do kit.</li>' +
      '<li>Não compartilhe o link desta página. Ele é o seu acesso.</li>' +
      '<li>Você pode desistir em até 7 dias depois de receber, com devolução do valor pago.</li>' +
      '<li>Material independente, sem vínculo com a Anthropic nem com as outras empresas citadas. Preços e comandos de terceiros mudam: confira na página oficial.</li>' +
      '</ul></div></div></section>' +
      '<footer class="rodape"><div class="wrap">Kit Editar com Claude · Anderson Brito · <a href="https://www.instagram.com/andersonbrito.mp4" target="_blank" rel="noopener">@andersonbrito.mp4</a></div></footer>';
  }

  app.innerHTML = secTopo() + '<main>' + secComecar() + secAula() + secPassos() + secDownloads() + secPrompts() + secSuporte() + '</main><div class="toast" id="toast" role="status" aria-live="polite"></div>';

  /* ---------- interações ---------- */
  var toast = document.getElementById('toast'), tt;
  function avisa(txt) { toast.textContent = txt; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('on'); }, 1800); }
  function marcaBotao(b, ok) {
    var s = b.querySelector('span'), antes = s.getAttribute('data-antes') || s.textContent;
    s.setAttribute('data-antes', antes);
    s.textContent = ok ? 'copiado' : 'selecione e copie';
    b.classList.toggle('feito', ok);
    clearTimeout(b._t); b._t = setTimeout(function () { s.textContent = antes; b.classList.remove('feito'); }, 1800);
  }
  function textoDoCartao(art) {
    var p = porId(art.getAttribute('data-id')), cs = campos(p.prompt), vals = {};
    art.querySelectorAll('.campos input').forEach(function (inp) { var v = inp.value.trim(); if (v) vals[cs[+inp.getAttribute('data-i')]] = v; });
    return p.prompt.replace(RE, function (tudo, ph) { return vals[ph] != null ? vals[ph] : tudo; });
  }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('.bcop');
    if (!b) return;
    var txt = b.hasAttribute('data-prompt') ? textoDoCartao(b.closest('.pr')) : b.getAttribute('data-copia');
    window.__ultimaCopia = txt;
    copiar(txt).then(function () { marcaBotao(b, true); avisa('Copiado. Agora cole no Claude.'); }, function () { marcaBotao(b, false); avisa('Não deu para copiar sozinho. Selecione o texto.'); });
  });
  app.addEventListener('input', function (e) {
    var inp = e.target;
    if (!inp.matches || !inp.matches('.campos input')) return;
    var art = inp.closest('.pr'), i = inp.getAttribute('data-i'), v = inp.value.trim();
    art.querySelectorAll('.ptxt mark[data-i="' + i + '"]').forEach(function (m) {
      m.textContent = v || '[' + inp.placeholder + ']';
      m.classList.toggle('cheio', !!v);
    });
  });

  /* progresso */
  function progresso() {
    var boxes = app.querySelectorAll('input[data-passo]'), n = 0, est = {};
    boxes.forEach(function (c) { est[c.getAttribute('data-passo')] = c.checked; if (c.checked) n++; c.closest('.passo').classList.toggle('ok', c.checked); });
    document.getElementById('progBarra').style.width = (n / boxes.length * 100) + '%';
    document.getElementById('progTxt').innerHTML = '<b class="num">' + n + '</b> de <b class="num">' + boxes.length + '</b> etapas' + (n === boxes.length ? ' · tudo pronto' : '');
    return est;
  }
  app.addEventListener('change', function (e) {
    if (!e.target.matches('input[data-passo]')) return;
    guarda('acesso-kit-passos', progresso());
    if (e.target.checked) {
      var atual = e.target.closest('.passo'), prox = atual.nextElementSibling;
      if (prox && prox.tagName === 'DETAILS') { atual.open = false; prox.open = true; }
    }
  });
  progresso();

  /* filtro */
  var busca = document.getElementById('busca'), chips = document.getElementById('chips'), tipoAtual = '';
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  var indice = {};
  D.PROMPTS.forEach(function (p) { var t = D.TIPOS.filter(function (x) { return x.id === p.tipo; })[0]; indice[p.id] = norm([p.titulo, p.quando_usar, p.prompt, p.resultado, t.nome, t.desc].join(' ')); });
  function filtra() {
    var q = norm(busca.value.trim()), total = 0;
    document.querySelectorAll('#lista .grupo').forEach(function (g) {
      var vis = 0, tipoOk = !tipoAtual || g.getAttribute('data-grupo') === tipoAtual;
      g.querySelectorAll('.pr').forEach(function (a) {
        var ok = tipoOk && (!q || indice[a.getAttribute('data-id')].indexOf(q) >= 0);
        a.hidden = !ok; if (ok) vis++;
      });
      g.hidden = !vis; total += vis;
    });
    document.getElementById('conta').textContent = total + (total === 1 ? ' prompt' : ' prompts');
    document.getElementById('nada').hidden = total > 0;
  }
  busca.addEventListener('input', filtra);
  chips.addEventListener('click', function (e) {
    var c = e.target.closest('.chip'); if (!c) return;
    tipoAtual = c.getAttribute('data-tipo');
    chips.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('on', x === c); });
    filtra();
  });
  filtra();

  /* nav ativa */
  var links = document.querySelectorAll('.topo nav a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + en.target.id;
          a.classList.toggle('on', on);
          if (on && a.scrollIntoView && a.parentNode.scrollWidth > a.parentNode.clientWidth) a.parentNode.scrollLeft = a.offsetLeft - 16;
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main > section').forEach(function (s) { io.observe(s); });
  }

  /* chuva de código leve */
  (function () {
    var cv = document.getElementById('chuva');
    if (!cv || !cv.getContext) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { cv.style.display = 'none'; return; }
    var ctx = cv.getContext('2d'), W, H, cols, y, fs = 15, timer;
    var CH = '01アカサタナハマヤラ<>/{}[]=+*';
    function mede() {
      W = cv.width = innerWidth; H = cv.height = innerHeight;
      cols = Math.ceil(W / (fs * 2.2)); y = [];
      for (var i = 0; i < cols; i++) y[i] = Math.random() * -60;
    }
    function passo() {
      ctx.fillStyle = 'rgba(11,12,14,.12)'; ctx.fillRect(0, 0, W, H);
      ctx.font = fs + 'px ui-monospace,Menlo,monospace';
      for (var i = 0; i < cols; i++) {
        var py = y[i] * fs;
        if (py > 0) { ctx.fillStyle = Math.random() > .92 ? '#d6ffe6' : 'rgba(65,255,138,.75)'; ctx.fillText(CH.charAt(Math.floor(Math.random() * CH.length)), i * fs * 2.2 + 4, py); }
        y[i] = py > H && Math.random() > .975 ? Math.random() * -20 : y[i] + 1;
      }
    }
    function liga() { if (!timer) timer = setInterval(passo, 90); }
    function desliga() { clearInterval(timer); timer = null; }
    mede(); liga();
    var rz; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(mede, 200); });
    document.addEventListener('visibilitychange', function () { document.hidden ? desliga() : liga(); });
  })();
})();
