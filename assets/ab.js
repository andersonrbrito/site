/* andersonbrito.com — comportamento comum (home, /bio, /links) */
(() => {
  const WA = '5511992392104';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ICONS = '/assets/icons.svg';
  const ic = id => `<svg><use href="${ICONS}#${id}"/></svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
      nome: 'Edição de vídeo', cor: 'var(--red-pill)', emoji: '🔴',
      servicos: [['🎯', 'Criativos pra anúncio'], ['🎬', 'VSL'], ['📱', 'Reels e conteúdo recorrente'], ['✨', 'Vídeo motion'], ['🎤', 'Cobertura de evento'], ['📷', 'Fotografia'], ['💬', 'Outro']],
      material: [['✅', 'Sim, tenho o bruto'], ['🧩', 'Tenho uma parte'], ['🎥', 'Não, preciso gravar'], ['🤔', 'Ainda não sei']]
    },
    blue: {
      nome: 'Vídeos com IA', cor: 'var(--blue-pill)', emoji: '🔵',
      servicos: [['🔥', 'Vídeo viral com IA'], ['🧑‍🎤', 'Influencer ou personagem de IA'], ['📣', 'Anúncio com IA'], ['🎞️', 'Clipe ou trailer com IA'], ['🏪', 'Vídeo de IA pro meu negócio'], ['💬', 'Outro']],
      material: [['🖼️', 'Tenho fotos e vídeos da marca'], ['💡', 'Tenho só a ideia'], ['🎨', 'Quero que você crie a ideia'], ['🤔', 'Ainda não sei']]
    }
  };
  const PILL_POS = { red: [25.8, 65], blue: [76, 65.5] }; // centro de cada pílula na imagem, em %

  let scene = null, sheet = null;

  const buildScene = () => {
    const el = document.createElement('div');
    el.className = 'pills';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Escolha uma pílula');
    el.innerHTML = `
      <button class="pills-x" type="button" aria-label="Fechar">${ic('i-x')}</button>
      <div class="pills-stage">
        <img src="/assets/cine/pilulas.jpg" alt="Duas mãos estendidas, uma com a pílula vermelha e outra com a azul" draggable="false">
        <div class="pills-dark"></div>
        <div class="pills-glow"></div>
        <button class="pill-hit red" type="button" style="left:${PILL_POS.red[0]}%;top:${PILL_POS.red[1]}%" aria-label="Pílula vermelha: edição de vídeo"><span class="pill-label">Edição de vídeo</span></button>
        <button class="pill-hit blue" type="button" style="left:${PILL_POS.blue[0]}%;top:${PILL_POS.blue[1]}%" aria-label="Pílula azul: vídeos com IA"><span class="pill-label">Vídeos com IA</span></button>
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

  const message = () => {
    const p = PILLS[state.pill];
    const opt = [['Empresa / @', state.empresa], ['Referência', state.ref]].filter(([, v]) => v.trim()).map(([k, v]) => `${k}: ${v.trim()}`);
    return [
      `Oi Anderson! Vim do site e tomei a pílula ${state.pill === 'red' ? 'vermelha' : 'azul'} ${p.emoji} (${p.nome.toLowerCase()}).`,
      '',
      `• Preciso de: ${state.servicos.join(', ')}`,
      `• Prazo: ${state.prazo}`,
      `• Volume: ${state.volume}`,
      `• Material: ${state.material}`,
      `• Investimento: ${state.verba}`,
      '',
      `Nome: ${state.nome.trim()}`,
      ...opt,
      ...(state.msg.trim() ? ['', state.msg.trim()] : [])
    ].join('\n');
  };

  const render = () => {
    const body = $('#shBody', sheet), prog = $('#prog', sheet), next = $('#shNext', sheet), back = $('#shBack', sheet);
    const total = steps.length + 1;
    $$('i', prog).forEach((b, i) => b.classList.toggle('on', i <= cur));
    $('#shCount', sheet).textContent = `PASSO ${cur + 1} DE ${total}`;
    back.textContent = cur === 0 ? 'Trocar pílula' : 'Voltar';
    if (cur < steps.length) {
      const st = steps[cur];
      next.textContent = 'Continuar';
      if (st.form) {
        body.innerHTML = `<div class="q">${st.q}</div><div class="q-hint">Só o nome é obrigatório.</div>
          <div class="field"><label for="fNome">Nome</label><input id="fNome" autocomplete="name" value="${esc(state.nome)}" placeholder="Como posso te chamar?"></div>
          <div class="field"><label for="fEmp">Empresa ou @ do Instagram</label><input id="fEmp" autocomplete="organization" value="${esc(state.empresa)}" placeholder="Opcional"></div>
          <div class="field"><label for="fRef">Link de referência</label><input id="fRef" inputmode="url" value="${esc(state.ref)}" placeholder="Um vídeo que você gosta (opcional)"></div>
          <div class="field"><label for="fMsg">Conte mais</label><textarea id="fMsg" placeholder="Produto, público, objetivo... (opcional)">${esc(state.msg)}</textarea></div>`;
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
      next.textContent = 'Enviar no WhatsApp';
      const rows = [['Escolha', PILLS[state.pill].nome], ['Preciso de', state.servicos.join(', ')], ['Prazo', state.prazo], ['Volume', state.volume], ['Material', state.material], ['Investimento', state.verba], ['Nome', state.nome]];
      if (state.empresa.trim()) rows.push(['Empresa', state.empresa]);
      body.innerHTML = `<div class="q">Resumo</div><div class="q-hint">Abre o WhatsApp com a mensagem pronta.</div>
        <div class="list sum">${rows.map(([k, v]) => `<div class="row"><span class="row-t"><span>${k}</span><b>${esc(v)}</b></span></div>`).join('')}</div>
        <p class="q-hint" style="margin-top:14px">Prefere e-mail? <a style="color:var(--matrix)" href="mailto:contato@andersonbrito.com?subject=${encodeURIComponent('Pedido pelo site — ' + state.nome.trim())}&body=${encodeURIComponent(message())}">Enviar por e-mail</a></p>`;
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
      { k: 'servicos', q: 'O que você precisa?', hint: 'Pode marcar mais de uma opção.', multi: true, two: true, opts: p.servicos },
      { k: 'prazo', q: 'Pra quando?', opts: [['⚡', 'Urgente (até 3 dias)'], ['📅', 'Nesta semana'], ['🗓️', 'Neste mês'], ['🌿', 'Sem pressa']] },
      { k: 'volume', q: 'Quantos vídeos?', opts: [['1️⃣', '1 vídeo'], ['🔢', 'De 2 a 5'], ['📦', 'De 6 a 10'], ['🔁', 'Recorrente todo mês']] },
      { k: 'material', q: pill === 'red' ? 'Já tem material gravado?' : 'O que você já tem?', opts: p.material },
      { k: 'verba', q: 'Quanto pretende investir?', opts: [['💵', 'Até R$ 500'], ['💰', 'R$ 500 a R$ 1.500'], ['🏦', 'R$ 1.500 a R$ 5.000'], ['🚀', 'Acima de R$ 5.000'], ['📝', 'Prefiro receber um orçamento']] },
      { k: 'dados', q: 'Seus dados', form: true }
    ];
    cur = 0;
    sheet.dataset.pill = pill;
    sheet.style.setProperty('--pc', p.cor);
    $('.sh-title i', sheet).style.background = p.cor;
    $('.sh-title span', sheet).textContent = p.nome;
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
  if (location.hash === '#pedido-guiado') openScene();
})();
