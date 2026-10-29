from gerar import render, HERE
IMG = f"file://{HERE}/img/"
T = {"bg":"#0c1411","fg":"#FFF3E5","fg2":"rgba(255,243,229,.72)","mute":"rgba(255,243,229,.42)","acc":"#FF8A00","line":"rgba(92,184,138,.22)","green":"#5CB88A"}
H = "@andersonbrito.mp4"; N = 7
frame = lambda n: f'<div class="top"><span>{H}</span><span>{n:02d} / {N:02d}</span></div>'
glow = '<div class="shade" style="background:radial-gradient(80% 60% at 85% 10%,rgba(31,92,69,.55),transparent 70%)"></div>'
def txt(n, inner):
    return f'{glow}{frame(n)}<div class="s" style="justify-content:center;gap:44px">{inner}</div><div class="bot"><span>posts infinitos</span><span>arrasta →</span></div>'
step = lambda k: f'<div class="eyebrow" style="color:var(--green)">Passo {k}</div>'
S = [
# capa no estilo do post do André: foto de estúdio, palavra gigante atrás da cabeça (fundo → palavra → recorte)
f'''<div class="bgimg" style="background-image:url({IMG}doom-cadeira.jpg);background-size:1080px auto;background-position:50% 100%;background-repeat:no-repeat;background-color:#f1f1ef"></div>
<div style="position:absolute;left:0;right:0;top:150px;text-align:center"><div class="h" style="font-size:330px;line-height:.8;letter-spacing:-.06em;color:#FF8A00">Posts</div></div>
<div class="bgimg" style="background-image:url({IMG}doom-cadeira-recorte.png);background-size:1080px auto;background-position:50% 100%;background-repeat:no-repeat"></div>
<div class="top" style="color:#1E1E1E;opacity:.6"><span>tutorial</span><span>{H}</span><span>IA</span></div>
<div style="position:absolute;left:56px;top:470px;width:220px;color:#1E1E1E;font:500 40px/1.05 Creato">estáticos<br><span class="ser" style="font-size:64px;color:#1F6B4A">infinitos</span></div>
<div style="position:absolute;right:56px;top:470px;width:200px;text-align:right;color:#1E1E1E;font:500 30px/1.15 Creato">em <b style="font-weight:900">5 minutos</b>, sem pensar em composição</div>
<div class="bot" style="color:#1E1E1E;opacity:.6"><span>arrasta →</span><span>01 / 07</span></div>''',
txt(2, '<div class="eyebrow">Antes, a composição</div><div class="h2">Todo post que para o dedo tem <span class="ser acc">três coisas:</span></div><div class="list"><div class="li"><i>i.</i><span>Gancho visual que faz parar.</span></div><div class="li"><i>ii.</i><span>Texto simples, rápido de ler.</span></div><div class="li"><i>iii.</i><span>Mensagem clara e objetiva.</span></div></div>'),
txt(3, step(1)+'<div class="h2">Ache imagens com <span class="ser acc">prompt público.</span></div><div class="rule"></div><div class="p">Assim você pula a parte de pensar composição e estilo. O ponto de partida já está pronto, <b>sem copiar ninguém.</b></div>'),
f'''<div class="bgimg" style="background-image:url({IMG}rdj-cadeira.jpg);background-size:1080px auto;background-position:50% 100%;background-repeat:no-repeat;background-color:#f1f1ef"></div>
<div style="position:absolute;right:0;top:170px;width:700px;text-align:center"><div class="h" style="font-size:250px;line-height:.8;letter-spacing:-.06em;color:#1F6B4A">Você</div></div>
<div class="bgimg" style="background-image:url({IMG}rdj-cadeira-recorte.png);background-size:1080px auto;background-position:50% 100%;background-repeat:no-repeat"></div>
<div class="top" style="color:#1E1E1E;opacity:.6"><span>{H}</span><span>04 / 07</span></div>
<div style="position:absolute;left:60px;top:150px;width:300px;color:#1E1E1E;display:flex;flex-direction:column;gap:18px">
 <div class="eyebrow" style="color:#1F6B4A">Passo 2</div>
 <div style="font:900 44px/1 Creato;letter-spacing:-.02em">Jogue a referência e o seu personagem numa IA.</div>
 <div style="font:300 27px/1.3 Creato">Pode ser o Gemini grátis. Peça pra <b style="font-weight:700">trocar o personagem</b> e adaptar o texto.</div>
 <div class="ser" style="font-size:42px;line-height:1;color:#FF8A00">O Doom vira o Robert. O Robert vira você.</div>
</div>
<div class="bot" style="color:#1E1E1E;opacity:.6"><span>posts infinitos</span><span>arrasta →</span></div>''',
txt(5, step(3)+'<div class="h" style="font-size:150px">Pronto<span class="acc">.</span></div><div class="p">Não gostou do resultado? Gere de novo ou <b>peça ajustes</b>. Em 5 minutos o post do dia está feito.</div>'),
txt(6, '<div class="eyebrow">O que nenhum tutorial resolve</div><div class="h2">Sem estratégia, é só uma imagem <span class="ser acc">bonita.</span></div><div class="list"><div class="li"><i>i.</i><span>Qual é o objetivo do post?</span></div><div class="li"><i>ii.</i><span>Que uso estratégico ele tem?</span></div><div class="li"><i>iii.</i><span>Qual pilar do perfil ele sustenta?</span></div></div>'),
f'''{glow}{frame(7)}<div class="s" style="justify-content:center;align-items:center;text-align:center;gap:38px">
 <div class="ser" style="font-size:120px;line-height:.95">Conteúdo bom é</div>
 <div class="h" style="font-size:104px">consciente,<br>intencional<br><span class="acc">e com objetivo.</span></div>
 <div class="rule" style="margin-top:16px"></div>
 <div class="eyebrow" style="color:var(--mute)">salva pra testar · {H}</div>
 <div style="font:500 22px Creato;color:var(--mute);letter-spacing:.1em">método de @andrevalentim_</div>
</div>''',
]
print(render("posts-infinitos", T, S, {"titulo":"Posts estáticos infinitos","perfil":"@andersonbrito.mp4","legenda":"Tutorial pra criar posts estáticos infinitos trocando o personagem de qualquer post viral.\n\n1. Ache imagens com prompt público\n2. Jogue a referência e seu personagem numa IA\n3. Ajuste até ficar bom\n\nMas sem estratégia é só uma imagem bonita. Qual é o objetivo do seu próximo post?\n\nMétodo do @andrevalentim_","criado":"2026-10-28"}))
