/* andersonbrito.com — comportamento comum (home, /bio, /links) */
(() => {
  const WA = '5511992392104';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ICONS = '/assets/icons.svg';
  const ic = id => `<svg><use href="${ICONS}#${id}"/></svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ── Idioma: português (padrão) e inglês ─────────────────── */
  const EN = {
    'Editor de vídeo': 'Video editor', 'Criador de conteúdo IA': 'AI content creator', 'Criador de conteúdo digital': 'Digital content creator',
    'Agente da Skynet': 'Skynet agent', '| Especialista em conteúdo viral: +100 milhões de views nos últimos 6 meses.': '| Viral content specialist: 100M+ views in the last 6 months.',
    'Fazer pedido': 'Start an order', 'Saber mais': 'About me', 'Início': 'Home', 'Contato': 'Contact', 'O que eu tenho feito': "What I've been up to",
    '10 mil seguidores · 1,5 mi de views/mês': '10K followers · 1.5M views/month', 'Portfólio': 'Portfolio',
    'Criativos, eventos, institucional, motion e IA. CV em PT e EN.': 'Ads, events, corporate, motion and AI. Resume in PT and EN.',
    'Produtos': 'Products', 'Guias': 'Guides', 'Parcerias': 'Partners', 'Pedido': 'Order', 'Fazer um pedido': 'Start an order',
    'Responda 5 perguntas rápidas e eu farei uma oferta que você não vai poder recusar.': "Answer 5 quick questions and I'll make you an offer you can't refuse.",
    'Começar': 'Start', 'Criativos para o seu negócio': 'Ad creatives for your business', 'Pronto em 24h. 2 alterações inclusas.': 'Ready in 24h. 2 revisions included.',
    'Vídeo de IA viral': 'Viral AI video', 'Seja um influencer artificial, ou tenha o seu.': 'Become an AI influencer, or get your own.',
    'Direct response para tráfego pago.': 'Direct response for paid traffic.', 'Projetos com IA': 'AI projects', 'Personagens e campanhas com IA.': 'AI characters and campaigns.',
    'Imagem e vídeo': 'Image and video', 'Imagem, vídeo e voz': 'Image, video and voice', 'X, LinkedIn e Threads': 'X, LinkedIn and Threads', 'Cortes com IA': 'AI clips',
    'Guias e prompts grátis': 'Free guides and prompts', 'Editar com IA, carrossel, restauração 4K.': 'AI editing, carousels, 4K restoration.',
    'Por onde passei': "Where I've worked", 'Vice-Presidência': 'Vice-Presidency', 'Comunicação institucional': 'Corporate communications',
    'Criativos e eventos': 'Ads and events', 'Criador de conteúdo': 'Content creator', 'IA generativa': 'Generative AI', 'Formação': 'Education',
    'Executive MBA e Bacharelado': "Executive MBA and Bachelor's", 'Marketing e mídias digitais': 'Marketing and digital media', 'Certificação': 'Certificate',
    'Cinema e direção': 'Film and directing', 'Centro Universitário': 'University Center', 'Comunicação audiovisual': 'Audiovisual communication',
    '© 2026 Anderson Brito · Alphaville, SP': '© 2026 Anderson Brito · São Paulo, Brazil', 'Privacidade': 'Privacy', 'Sobre': 'About',
    'Sequência 01': 'Sequence 01', 'Sequência 02': 'Sequence 02', 'Fotos': 'Photos', 'Islândia': 'Iceland', 'Acima das nuvens': 'Above the clouds',
    'Fotógrafo': 'Photographer', 'Estúdio': 'Studio', 'Trajetória': 'Career', 'Vídeo': 'Video', 'Ativar som': 'Unmute', 'Silenciar': 'Mute',
    '+100 mi': '100M+', 'views em 6 meses': 'views in 6 months', '1,5 mi': '1.5M', 'views por mês no IG': 'monthly IG views', '10+ anos': '10+ years',
    'de audiovisual': 'in film and video', 'Atual': 'Now', 'Desde 2015': 'Since 2015',
    'Conteúdo com IA generativa, do roteiro à publicação. Vídeos virais para CazéTV e TNT Sports.': 'Generative AI content, from script to publishing. Viral videos for CazéTV and TNT Sports.',
    'Criativos, Reels, videoaulas e eventos para cerca de 200 franquias.': 'Ads, Reels, video lessons and events for about 200 franchises.',
    'Editor e produtor': 'Editor and producer', 'Criativos, VSL e direct response para Instagram, TikTok e YouTube.': 'Ads, VSLs and direct response for Instagram, TikTok and YouTube.',
    'FGV · Vice-Presidência': 'FGV · Vice-Presidency', 'Redes sociais, site, palestras, entrevistas e audiências públicas.': 'Social media, website, talks, interviews and public hearings.',
    'Shows, esportes, eventos e retratos.': 'Concerts, sports, events and portraits.', 'Gestão com ênfase em marketing e mídias digitais.': 'Management with a focus on marketing and digital media.',
    'Bacharelado em Marketing': "Bachelor's in Marketing", 'Redes': 'Social', 'Ferramentas de IA': 'AI tools', 'Mais': 'More', 'Pronto em 24h': 'Ready in 24h',
    'Seja um influencer artificial, ou tenha o seu': 'Become an AI influencer, or get your own', 'Personagens e campanhas': 'Characters and campaigns',
    'Vídeo de apresentação e trajetória': 'Intro video and career', 'Trabalhos e CV': 'Work and resume', 'Editar com IA, carrossel, restauração 4K': 'AI editing, carousels, 4K restoration',
    'Entrar no site': 'Visit the website', 'Ganhe treinando robôs': 'Get paid to train robots', 'Loja': 'Shop', 'Carreira': 'Career', 'Estudos': 'Studies'
  };
  const TITLES = {
    '/': 'Anderson Brito — Video Editor, Motion and AI | Viral Content, Ads and VSL',
    '/bio/': 'Bio — Anderson Brito | Video Editor, Viral Content and AI',
    '/links/': 'Links — Anderson Brito'
  };
  let LANG = 'pt';
  try { LANG = new URLSearchParams(location.search).get('lang') || localStorage.getItem('ab_lang') || 'pt'; } catch {}
  if (LANG !== 'en') LANG = 'pt';
  const tr = (pt, en) => (LANG === 'en' ? en : pt);
  const ptText = new WeakMap(), ptTitle = document.title;
  const applyLang = () => {
    document.documentElement.lang = LANG === 'en' ? 'en' : 'pt-BR';
    document.title = LANG === 'en' ? (TITLES[location.pathname] || ptTitle) : ptTitle;
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement && !n.parentElement.closest('script,style,.pills,.sheet-wrap,[data-en-html]') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!ptText.has(n)) { const k = n.nodeValue.trim(); if (!EN[k]) continue; ptText.set(n, n.nodeValue); }
      const pt = ptText.get(n), k = pt.trim();
      n.nodeValue = LANG === 'en' ? pt.replace(k, EN[k]) : pt;
    }
    $$('[data-en-html]').forEach(el => { if (!el.dataset.ptHtml) el.dataset.ptHtml = el.innerHTML; el.innerHTML = LANG === 'en' ? el.dataset.enHtml : el.dataset.ptHtml; });
    $$('[data-s]').forEach(el => { if (!el.dataset.sPt) el.dataset.sPt = el.dataset.s; el.dataset.s = LANG === 'en' ? (EN[el.dataset.sPt] || el.dataset.sPt) : el.dataset.sPt; });
    $$('[data-lang-toggle]').forEach(b => { b.textContent = LANG === 'en' ? 'PT' : 'EN'; b.setAttribute('aria-label', LANG === 'en' ? 'Mudar para português' : 'Switch to English'); });
    document.dispatchEvent(new CustomEvent('ab:lang', { detail: LANG }));
  };
  window.abLang = () => LANG;

  /* ── Chuva de código (Matrix) ───────────────────────────── */
  const GLYPHS = 'アイウエオカキクケコサシスセソタチツテト01ABRITO<>/{}=+*';
  const rain = (cv, o) => {
    const ctx = cv.getContext('2d');
    let cols = [], w = 0, h = 0, raf = 0, last = 0, running = false;
    const size = () => {
      const r = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height; cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      cols = Array.from({ length: Math.ceil(w / o.fs) }, () => Math.random() < o.density ? Math.random() * -h / o.fs : null);
    };
    const tick = t => {
      raf = requestAnimationFrame(tick);
      if (t - last < o.step) return; last = t;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = `rgba(0,0,0,${o.fade})`; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = `500 ${o.fs}px "JetBrains Mono", ui-monospace, monospace`;
      cols.forEach((y, i) => {
        if (y === null || Math.random() > o.speed) return;
        ctx.fillStyle = Math.random() > .96 ? o.head : o.color;
        ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * o.fs, y * o.fs);
        cols[i] = y * o.fs > h && Math.random() > .975 ? 0 : y + 1;
      });
    };
    const start = () => { if (running) return; running = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    size(); addEventListener('resize', size);
    return { start, stop, size };
  };

  // só começa quando a pessoa começa a navegar (rolar, tocar e arrastar, teclado)
  const bgRains = [];
  const banner = $('#rain'), bg = $('#bgRain');
  if (!reduce) {
    if (banner) bgRains.push({ el: banner, r: rain(banner, { fs: 13, density: 1, speed: .55, step: 60, fade: .18, color: 'rgba(65,255,138,.85)', head: '#d6ffe6' }) });
    if (bg) bgRains.push({ el: bg, r: rain(bg, { fs: 15, density: .45, speed: .6, step: 80, fade: .05, color: 'rgba(65,255,138,.8)', head: '#d6ffe6' }) });
  }
  let rainStarted = false;
  const startRain = () => {
    if (rainStarted || !bgRains.length) return;
    rainStarted = true;
    document.documentElement.classList.add('rain-on');
    bgRains.forEach(({ el, r }) => {
      new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? r.start() : r.stop())).observe(el);
    });
    document.addEventListener('visibilitychange', () => bgRains.forEach(({ r }) => (document.hidden ? r.stop() : r.start())));
    ['scroll', 'wheel', 'touchmove', 'keydown'].forEach(ev => removeEventListener(ev, startRain));
  };
  ['scroll', 'wheel', 'touchmove', 'keydown'].forEach(ev => addEventListener(ev, startRain, { passive: true }));

  /* ── Timeline: agulha, timecode e clipe ativo seguem a rolagem ── */
  const ph = $('#ph'), tc = $('#tc'), clips = $$('.clip');
  if (ph && clips.length) {
    const secs = clips.map(c => document.getElementById(c.dataset.sec));
    const fmt = p => {
      const total = p * 150, m = Math.floor(total / 60), s = Math.floor(total % 60), f = Math.floor((total % 1) * 30);
      return `00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')};${String(f).padStart(2, '0')}`;
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      ph.style.left = (p * 100) + '%';
      if (tc) tc.textContent = fmt(p);
      let on = 0;
      secs.forEach((s, i) => { if (s && i > 0 && s.getBoundingClientRect().top < innerHeight * .45) on = i; });
      if (p > .985) on = secs.length - 1;
      clips.forEach((c, i) => c.classList.toggle('on', i === on));
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    onScroll();
    clips[0].addEventListener('click', e => { if (secs[0] && secs[0].id === 'sobre') { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); } });
  }

  /* ── Pedido: primeiro a escolha das pílulas, depois o formulário ── */
  const PILLS = {
    red: {
      nome: ['Edição de vídeo', 'Video editing'], cor: 'var(--red-pill)', emoji: '🔴',
      servicos: [['🎯', 'Criativos pra anúncio', 'Ad creatives'], ['🎬', 'VSL', 'VSL'], ['📱', 'Reels e conteúdo recorrente', 'Reels and recurring content'], ['✨', 'Vídeo motion', 'Motion video'], ['🎤', 'Cobertura de evento', 'Event coverage'], ['📷', 'Fotografia', 'Photography'], ['💬', 'Outro', 'Other']],
      material: [['✅', 'Sim, tenho o bruto', 'Yes, I have raw footage'], ['🧩', 'Tenho uma parte', 'I have some of it'], ['🎥', 'Não, preciso gravar', 'No, it needs to be shot'], ['🤔', 'Ainda não sei', 'Not sure yet']]
    },
    blue: {
      nome: ['Vídeos com IA', 'AI videos'], cor: 'var(--blue-pill)', emoji: '🔵',
      servicos: [['🔥', 'Vídeo viral com IA', 'Viral AI video'], ['🧑‍🎤', 'Influencer ou personagem de IA', 'AI influencer or character'], ['📣', 'Anúncio com IA', 'AI ad'], ['🎞️', 'Clipe ou trailer com IA', 'AI music video or trailer'], ['🏪', 'Vídeo de IA pro meu negócio', 'AI video for my business'], ['💬', 'Outro', 'Other']],
      material: [['🖼️', 'Tenho fotos e vídeos da marca', 'I have brand photos and videos'], ['💡', 'Tenho só a ideia', 'I only have the idea'], ['🎨', 'Quero que você crie a ideia', 'I want you to create the idea'], ['🤔', 'Ainda não sei', 'Not sure yet']]
    }
  };
  const PILL_POS = { red: [25.8, 65], blue: [76, 65.5] }; // centro de cada pílula na imagem, em %

  let scene = null, sheet = null;

  const buildScene = () => {
    const el = document.createElement('div');
    el.className = 'pills';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', tr('Escolha uma pílula', 'Choose a pill'));
    el.innerHTML = `
      <button class="pills-x" type="button" aria-label="${tr('Fechar', 'Close')}">${ic('i-x')}</button>
      <div class="pills-stage">
        <img src="/assets/cine/pilulas.jpg" alt="${tr('Duas mãos estendidas, uma com a pílula vermelha e outra com a azul', 'Two outstretched hands, one holding the red pill and the other the blue pill')}" draggable="false">
        <div class="pills-dark"></div>
        <div class="pills-glow"></div>
        <button class="pill-hit red" type="button" style="left:${PILL_POS.red[0]}%;top:${PILL_POS.red[1]}%" aria-label="${tr('Pílula vermelha: edição de vídeo', 'Red pill: video editing')}"><span class="pill-label">${tr('Edição de vídeo', 'Video editing')}</span></button>
        <button class="pill-hit blue" type="button" style="left:${PILL_POS.blue[0]}%;top:${PILL_POS.blue[1]}%" aria-label="${tr('Pílula azul: vídeos com IA', 'Blue pill: AI videos')}"><span class="pill-label">${tr('Vídeos com IA', 'AI videos')}</span></button>
      </div>
      <canvas class="fx" aria-hidden="true"></canvas>
      <div class="pills-flash"></div>
      <div class="pills-cursor" aria-hidden="true"></div>`;
    document.body.appendChild(el);
    const stage = $('.pills-stage', el), cursor = $('.pills-cursor', el);
    const isTouch = matchMedia('(hover: none)').matches;
    if (isTouch) el.classList.add('touch');
    let locked = false;

    const aim = (cx, cy) => {
      const r = stage.getBoundingClientRect();
      const x = (cx - r.left) / r.width * 100, y = (cy - r.top) / r.height * 100;
      stage.style.setProperty('--x', x + '%');
      stage.style.setProperty('--y', y + '%');
      el.style.setProperty('--fx', cx + 'px');
      el.style.setProperty('--fy', cy + 'px');
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      const d = k => Math.hypot(x - PILL_POS[k][0], (y - PILL_POS[k][1]) * (r.height / r.width));
      const hot = d('red') < 15 ? 'red' : d('blue') < 15 ? 'blue' : '';
      if (hot) el.dataset.hot = hot; else delete el.dataset.hot;
    };
    el.addEventListener('pointermove', e => { if (!locked) aim(e.clientX, e.clientY); });
    el.addEventListener('pointerdown', e => { if (!locked) aim(e.clientX, e.clientY); });
    stage.style.setProperty('--r', isTouch ? '230px' : '150px');

    const burst = color => {
      const cv = $('canvas.fx', el), ctx = cv.getContext('2d');
      const d = Math.min(devicePixelRatio || 1, 2), w = innerWidth, h = innerHeight, fs = 16;
      cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      const cols = Array.from({ length: Math.ceil(w / fs) }, () => Math.random() * -h / fs * .6);
      const t0 = performance.now();
      const loop = t => {
        const k = (t - t0) / 1300;
        if (k > 1) { ctx.clearRect(0, 0, w, h); return; }
        requestAnimationFrame(loop);
        ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(0, 0, w, h);
        ctx.font = `600 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
        cols.forEach((y, i) => {
          ctx.fillStyle = Math.random() > .9 ? '#fff' : color;
          ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * fs, y * fs);
          cols[i] = y + 1 + k * 3;
        });
      };
      requestAnimationFrame(loop);
    };

    const choose = pill => {
      if (locked) return;
      locked = true;
      el.dataset.hot = pill;
      if (navigator.vibrate) navigator.vibrate(pill === 'red' ? [30, 40, 60] : 50);
      if (!reduce) {
        el.classList.add('take-' + pill);
        burst(pill === 'red' ? 'rgba(255,59,71,.9)' : 'rgba(61,139,255,.9)');
      }
      setTimeout(() => {
        closeScene(true);
        openSheet(pill);
      }, reduce ? 150 : 1250);
    };
    $('.pill-hit.red', el).addEventListener('click', () => choose('red'));
    $('.pill-hit.blue', el).addEventListener('click', () => choose('blue'));
    // teclado: Tab acende a pílula em foco, como se o ponteiro estivesse nela
    $$('.pill-hit', el).forEach(b => b.addEventListener('focus', () => {
      if (locked || !b.matches(':focus-visible')) return;
      const k = b.classList.contains('red') ? 'red' : 'blue', r = stage.getBoundingClientRect();
      aim(r.left + r.width * PILL_POS[k][0] / 100, r.top + r.height * PILL_POS[k][1] / 100);
    }));
    $('.pills-x', el).addEventListener('click', () => closeScene());
    el.reset = () => { locked = false; el.classList.remove('take-red', 'take-blue'); delete el.dataset.hot; };
    return el;
  };

  const openScene = () => {
    if (!scene) scene = buildScene();
    scene.reset();
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => scene.classList.add('show'));
    const r = $('.pills-stage', scene).getBoundingClientRect();
    scene.style.setProperty('--fx', innerWidth / 2 + 'px');
    scene.style.setProperty('--fy', innerHeight / 2 + 'px');
    $('.pills-cursor', scene).style.transform = `translate(${r.left + r.width / 2}px, ${r.top + r.height * .55}px)`;
  };
  const closeScene = keepLock => {
    if (!scene) return;
    scene.classList.remove('show');
    if (!keepLock) document.body.style.overflow = '';
  };

  /* Folha do formulário */
  const state = { pill: '', servicos: [], prazo: '', volume: '', material: '', nome: '', empresa: '', ref: '', msg: '' };
  let cur = 0, steps = [];

  const buildSheet = () => {
    const el = document.createElement('div');
    el.className = 'sheet-wrap';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="sheet-bg" data-close></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="shTitle">
        <div class="grab"></div>
        <div class="sh-head">
          <div><div class="sh-title" id="shTitle"><i></i><span>Pedido</span></div><div class="sh-count" id="shCount"></div></div>
          <button class="x" type="button" data-close aria-label="Fechar">${ic('i-x')}</button>
        </div>
        <div class="prog" id="prog"></div>
        <div class="sh-body" id="shBody"></div>
        <div class="sh-foot">
          <button class="btn btn-ghost" type="button" id="shBack">Voltar</button>
          <button class="btn btn-pr" type="button" id="shNext">Continuar</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    $$('[data-close]', el).forEach(b => b.addEventListener('click', closeSheet));
    $('#shBack', el).addEventListener('click', () => { if (cur === 0) { closeSheet(); openScene(); return; } cur--; render(); });
    $('#shNext', el).addEventListener('click', () => {
      if (!valid()) return;
      if (cur < steps.length) { cur++; render(); return; }
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(message())}`, '_blank', 'noopener');
      closeSheet();
    });
    return el;
  };

  const valid = () => {
    if (cur >= steps.length) return true;
    const st = steps[cur];
    if (st.form) return state.nome.trim().length > 1;
    return st.multi ? state[st.k].length > 0 : !!state[st.k];
  };
  const sync = () => { $('#shNext', sheet).disabled = !valid(); };

  const L = o => (Array.isArray(o) ? tr(o[0], o[1]) : o);
  const opts = arr => arr.map(([e, pt, en]) => [e, en ? tr(pt, en) : pt]);

  const message = () => {
    const p = PILLS[state.pill];
    const opt = [[tr('Empresa / @', 'Company / @'), state.empresa], [tr('Referência', 'Reference'), state.ref]].filter(([, v]) => v.trim()).map(([k, v]) => `${k}: ${v.trim()}`);
    return [
      tr(`Oi Anderson! Vim do site e tomei a pílula ${state.pill === 'red' ? 'vermelha' : 'azul'} ${p.emoji} (${L(p.nome).toLowerCase()}).`,
         `Hi Anderson! I came from your website and took the ${state.pill === 'red' ? 'red' : 'blue'} pill ${p.emoji} (${L(p.nome).toLowerCase()}).`),
      '',
      `• ${tr('Preciso de', 'I need')}: ${state.servicos.join(', ')}`,
      `• ${tr('Prazo', 'Deadline')}: ${state.prazo}`,
      `• ${tr('Volume', 'Volume')}: ${state.volume}`,
      `• ${tr('Material', 'Footage')}: ${state.material}`,
      `• ${tr('Investimento', 'Budget')}: ${state.verba}`,
      '',
      `${tr('Nome', 'Name')}: ${state.nome.trim()}`,
      ...opt,
      ...(state.msg.trim() ? ['', state.msg.trim()] : [])
    ].join('\n');
  };

  const render = () => {
    const body = $('#shBody', sheet), prog = $('#prog', sheet), next = $('#shNext', sheet), back = $('#shBack', sheet);
    const total = steps.length + 1;
    $$('i', prog).forEach((b, i) => b.classList.toggle('on', i <= cur));
    $('#shCount', sheet).textContent = tr(`PASSO ${cur + 1} DE ${total}`, `STEP ${cur + 1} OF ${total}`);
    back.textContent = cur === 0 ? tr('Trocar pílula', 'Switch pill') : tr('Voltar', 'Back');
    if (cur < steps.length) {
      const st = steps[cur];
      next.textContent = tr('Continuar', 'Continue');
      if (st.form) {
        body.innerHTML = `<div class="q">${st.q}</div><div class="q-hint">${tr('Só o nome é obrigatório.', 'Only your name is required.')}</div>
          <div class="field"><label for="fNome">${tr('Nome', 'Name')}</label><input id="fNome" autocomplete="name" value="${esc(state.nome)}" placeholder="${tr('Como posso te chamar?', 'What should I call you?')}"></div>
          <div class="field"><label for="fEmp">${tr('Empresa ou @ do Instagram', 'Company or Instagram @')}</label><input id="fEmp" autocomplete="organization" value="${esc(state.empresa)}" placeholder="${tr('Opcional', 'Optional')}"></div>
          <div class="field"><label for="fRef">${tr('Link de referência', 'Reference link')}</label><input id="fRef" inputmode="url" value="${esc(state.ref)}" placeholder="${tr('Um vídeo que você gosta (opcional)', 'A video you like (optional)')}"></div>
          <div class="field"><label for="fMsg">${tr('Conte mais', 'Tell me more')}</label><textarea id="fMsg" placeholder="${tr('Produto, público, objetivo... (opcional)', 'Product, audience, goal... (optional)')}">${esc(state.msg)}</textarea></div>`;
        [['fNome', 'nome'], ['fEmp', 'empresa'], ['fRef', 'ref'], ['fMsg', 'msg']].forEach(([id, k]) => $('#' + id, body).addEventListener('input', e => { state[k] = e.target.value; sync(); }));
      } else {
        const sel = v => st.multi ? state[st.k].includes(v) : state[st.k] === v;
        body.innerHTML = `<div class="q">${st.q}</div>${st.hint ? `<div class="q-hint">${st.hint}</div>` : ''}
          <div class="opts${st.two ? ' two' : ''}">${st.opts.map(([e, t]) => `<button type="button" class="opt${sel(t) ? ' on' : ''}" data-v="${esc(t)}"><em>${e}</em><span>${t}</span><span class="ck">${ic('i-check')}</span></button>`).join('')}</div>`;
        $$('.opt', body).forEach(b => b.addEventListener('click', () => {
          const v = b.dataset.v;
          if (st.multi) {
            const a = state[st.k], i = a.indexOf(v);
            i > -1 ? a.splice(i, 1) : a.push(v);
            b.classList.toggle('on');
            sync();
          } else {
            state[st.k] = v;
            $$('.opt', body).forEach(o => o.classList.toggle('on', o === b));
            sync();
            setTimeout(() => { if (steps[cur] && steps[cur].k === st.k) { cur++; render(); } }, 220);
          }
        }));
      }
    } else {
      next.textContent = tr('Enviar no WhatsApp', 'Send on WhatsApp');
      const rows = [[tr('Escolha', 'Choice'), L(PILLS[state.pill].nome)], [tr('Preciso de', 'I need'), state.servicos.join(', ')], [tr('Prazo', 'Deadline'), state.prazo], [tr('Volume', 'Volume'), state.volume], [tr('Material', 'Footage'), state.material], [tr('Investimento', 'Budget'), state.verba], [tr('Nome', 'Name'), state.nome]];
      if (state.empresa.trim()) rows.push([tr('Empresa', 'Company'), state.empresa]);
      body.innerHTML = `<div class="q">${tr('Resumo', 'Summary')}</div><div class="q-hint">${tr('Abre o WhatsApp com a mensagem pronta.', 'Opens WhatsApp with the message ready.')}</div>
        <div class="list sum">${rows.map(([k, v]) => `<div class="row"><span class="row-t"><span>${k}</span><b>${esc(v)}</b></span></div>`).join('')}</div>
        <p class="q-hint" style="margin-top:14px">${tr('Prefere e-mail?', 'Prefer email?')} <a style="color:var(--matrix)" href="mailto:contato@andersonbrito.com?subject=${encodeURIComponent(tr('Pedido pelo site — ', 'Website order — ') + state.nome.trim())}&body=${encodeURIComponent(message())}">${tr('Enviar por e-mail', 'Send by email')}</a></p>`;
    }
    body.scrollTop = 0;
    sync();
  };

  const openSheet = pill => {
    if (!sheet) sheet = buildSheet();
    if (state.pill !== pill) { state.servicos = []; state.material = ''; }
    state.pill = pill;
    const p = PILLS[pill];
    steps = [
      { k: 'servicos', q: tr('O que você precisa?', 'What do you need?'), hint: tr('Pode marcar mais de uma opção.', 'You can pick more than one.'), multi: true, two: true, opts: opts(p.servicos) },
      { k: 'prazo', q: tr('Pra quando?', 'When do you need it?'), opts: opts([['⚡', 'Urgente (até 3 dias)', 'Urgent (within 3 days)'], ['📅', 'Nesta semana', 'This week'], ['🗓️', 'Neste mês', 'This month'], ['🌿', 'Sem pressa', 'No rush']]) },
      { k: 'volume', q: tr('Quantos vídeos?', 'How many videos?'), opts: opts([['1️⃣', '1 vídeo', '1 video'], ['🔢', 'De 2 a 5', '2 to 5'], ['📦', 'De 6 a 10', '6 to 10'], ['🔁', 'Recorrente todo mês', 'Monthly, ongoing']]) },
      { k: 'material', q: pill === 'red' ? tr('Já tem material gravado?', 'Do you have footage?') : tr('O que você já tem?', 'What do you have so far?'), opts: opts(p.material) },
      { k: 'verba', q: tr('Quanto pretende investir?', "What's your budget?"), opts: opts([['💵', 'Até R$ 500', 'Up to R$ 500'], ['💰', 'R$ 500 a R$ 1.500', 'R$ 500 to R$ 1,500'], ['🏦', 'R$ 1.500 a R$ 5.000', 'R$ 1,500 to R$ 5,000'], ['🚀', 'Acima de R$ 5.000', 'Over R$ 5,000'], ['📝', 'Prefiro receber um orçamento', "I'd rather get a quote"]]) },
      { k: 'dados', q: tr('Seus dados', 'Your details'), form: true }
    ];
    cur = 0;
    sheet.dataset.pill = pill;
    sheet.style.setProperty('--pc', p.cor);
    $('.sh-title i', sheet).style.background = p.cor;
    $('.sh-title span', sheet).textContent = L(p.nome);
    $('#prog', sheet).innerHTML = steps.map(() => '<i></i>').join('') + '<i></i>';
    render();
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const closeSheet = () => {
    if (!sheet) return;
    sheet.classList.remove('open');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  $$('[data-open-form]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openScene(); }));
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (sheet && sheet.classList.contains('open')) closeSheet();
    else if (scene && scene.classList.contains('show')) closeScene();
  });

  // Botão de idioma (canto da faixa superior): troca na hora e lembra a escolha.
  // A cena das pílulas e o formulário são montados de novo no idioma escolhido.
  $$('[data-lang-toggle]').forEach(b => b.addEventListener('click', () => {
    LANG = LANG === 'en' ? 'pt' : 'en';
    try { localStorage.setItem('ab_lang', LANG); } catch {}
    if (scene) { scene.parentNode.removeChild(scene); scene = null; }
    if (sheet) { sheet.parentNode.removeChild(sheet); sheet = null; state.servicos = []; state.prazo = state.volume = state.material = state.verba = ''; }
    applyLang();
  }));
  applyLang();
  if (location.hash === '#pedido-guiado') openScene();
})();
