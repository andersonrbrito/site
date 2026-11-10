# Portfólio /tie/ no padrão do site (base dr.html)
import re
src=open('dr.html').read()
head=src[:src.index('<main class="main">')]
tail=src[src.index('</main>'):]
head=re.sub(r'<title>[\s\S]*?</title>','<meta name="robots" content="noindex">\n  <title>Anderson Brito · Portfólio TIE Digital</title>',head,count=1)
def tags(x): return ''.join(f'<span class="tag">{t}</span>' for t in x)
def v(s,t,p,tg,h=False):
    return f'<div class="card vcard"><div class="vbox{" h" if h else ""}"><video src="/dr/videos/{s}.mp4" poster="/dr/images/{s}.jpg" controls playsinline preload="none"></video></div><div class="vcap"><b>{t}</b><p>{p}</p><div class="tagrow">{tags(tg)}</div></div></div>'
def yt(i,t,p,tg):
    return f'<div class="card vcard"><div class="vbox h"><iframe src="https://www.youtube.com/embed/{i}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div><div class="vcap"><b>{t}</b><p>{p}</p><div class="tagrow">{tags(tg)}</div></div></div>'
def sec(i,h,sm,cards,wide=False):
    return f'<section id="{i}"><div class="sec-h"><h2>{h}</h2><small>{sm}</small></div><div class="vgrid{" wide" if wide else ""}">{"".join(cards)}</div></section>'
main=f'''<main class="main">
        <nav class="topnav m-first" aria-label="Menu do site">
          <a href="/">Início</a><a href="/bio/">Bio</a><a href="/trabalhos/" aria-current="page">Portfólio</a><a href="/#produtos">Produtos</a><a href="/aprenda.html">Guias</a><a href="/links/">Links</a>
        </nav>
        <section id="inicio" class="m-first">
          <div class="card p-hero">
            <div>
              <div class="eyebrow"><span class="dot"></span>Direct Response · Nutra · IA</div>
              <h1>Portfólio para a TIE Digital</h1>
              <p>Criativos, leads e VSL para tráfego pago. Edição com IA: voz, avatar, cenas geradas e variações de gancho para teste.</p>
              <div class="role" style="margin-top:12px"><span class="tag">PJ · 100% remoto · full time</span><span class="tag">Início imediato</span></div>
            </div>
            <div class="p-photo"><img src="/lunar/images/anderson-camera.jpg" alt="Anderson Brito"></div>
          </div>
        </section>
        {sec("nutra","Nutra e saúde","2 vídeos",[
          v("india-mandioca","UGC com IA · maca peruana","Avatar 100% IA apresentando o suplemento, com fala e produto na mão. Formato TikTok Shop.",["Nutra","UGC IA"]),
          v("thaix-pixar","Lead narrativo · emagrecimento","História em estilo Pixar: dor, descoberta, prova e CTA. Personagens consistentes e vozes por IA.",["Lead","Emagrecimento","100% IA"])])}
        {sec("criativos","Criativos","4 vídeos",[
          v("viva-ia","Viva America · IA + legenda","Cenas geradas por IA com a especialista. Imigração para os EUA.",["Criativo","IA"]),
          v("woob-game","WooB · sozinho vs. com agência","Comparação em formato de jogo para captar clientes da agência.",["Criativo","Motion"]),
          v("woob-parallax","WooB · parallax","Criativo com camadas em parallax e CTA na tela.",["Criativo","Motion"]),
          v("king-panda","King Panda · anúncio","Anúncio curto com cena gerada por IA e gancho visual.",["Criativo","IA"])])}
        {sec("dr","Criativos DR horizontais","2 vídeos",[
          yt("CoLNWRrsCuw","Criativo DR #01","Criativo focado em retenção e CTA direto.",["DR"]),
          yt("enlFNG9VjIA","Criativo DR #02","Gancho nos 3 primeiros segundos.",["DR"])],wide=True)}
        {sec("vsl","VSL e filmes","2 vídeos",[
          v("vsl-cheirin","VSL de vendas · Cheirin Bão","Trecho de 4 min da VSL de franquia (36 min no total), editada para a Escola do Franchising.",["VSL"],h=True),
          v("viva-america","Viva America · filme","Filme curto de marca para imigração aos EUA.",["Filme","IA"],h=True)],wide=True)}
        <section id="contato">
          <div class="sec-h"><h2>Como eu trabalho</h2></div>
          <div class="card card-pad"><div class="list">
            <div class="row"><span class="row-t"><b>Volume</b><span>Um corte base vira várias versões de gancho, ritmo, legenda e CTA no mesmo dia.</span></span></div>
            <div class="row"><span class="row-t"><b>IA no fluxo</b><span>Kling, Veo, Seedance, Nano Banana, ElevenLabs e Claude para legenda e cortes em lote.</span></span></div>
            <div class="row"><span class="row-t"><b>Feedback</b><span>Ajustes de copy, tráfego e direção criativa aplicados rápido.</span></span></div>
            <div class="row"><span class="row-t"><b>Ferramentas</b><span>CapCut, Premiere e DaVinci.</span></span></div>
          </div></div>
        </section>
      '''
tail=re.sub(r'<div class="tl-clips">[\s\S]*?</div>','''<div class="tl-clips">
        <a class="clip" href="#sobre" data-sec="sobre" style="--cc:var(--c-iris)"><span>Sobre</span></a>
        <a class="clip" href="#nutra" data-sec="nutra" style="--cc:var(--c-forest)"><span>Nutra</span></a>
        <a class="clip" href="#criativos" data-sec="criativos" style="--cc:var(--c-violet)"><span>Criativos</span></a>
        <a class="clip" href="#vsl" data-sec="vsl" style="--cc:var(--c-mango)"><span>VSL</span></a>
        <a class="clip" href="#contato" data-sec="contato" style="--cc:var(--c-rose)"><span>Contato</span></a>
      </div>''',tail,count=1)
tail=re.sub(r'<script>\s*// Filtro[\s\S]*?</script>','',tail)
open('tie/index.html','w').write(head+main+tail)
print("ok")
