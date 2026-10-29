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
f'''<div class="bgimg" style="background-image:url({IMG}doom-ref.webp);background-size:auto 760px;background-position:62% 0;background-repeat:no-repeat;height:760px"></div>
<div class="shade" style="background:linear-gradient(180deg,rgba(12,20,17,.55) 0%,rgba(12,20,17,0) 25%,rgba(12,20,17,0) 40%,#0c1411 57%)"></div>
<div class="top"><span>tutorial</span><span>IA</span><span>instagram</span></div>
<div class="s" style="justify-content:flex-end;gap:26px;padding-bottom:120px">
 <div class="eyebrow" style="color:var(--green)">Em 5 minutos</div>
 <div class="h" style="font-size:118px">Posts estáticos<br><span class="ser acc" style="font-size:132px">infinitos</span></div>
 <div class="p" style="font-size:40px">Como eu trocaria o personagem de qualquer post viral. Sem pensar em composição.</div>
</div><div class="bot"><span>{H}</span><span>arrasta →</span></div>''',
txt(2, '<div class="eyebrow">Antes, a composição</div><div class="h2">Todo post que para o dedo tem <span class="ser acc">três coisas:</span></div><div class="list"><div class="li"><i>i.</i><span>Gancho visual que faz parar.</span></div><div class="li"><i>ii.</i><span>Texto simples, rápido de ler.</span></div><div class="li"><i>iii.</i><span>Mensagem clara e objetiva.</span></div></div>'),
txt(3, step(1)+'<div class="h2">Ache imagens com <span class="ser acc">prompt público.</span></div><div class="rule"></div><div class="p">Assim você pula a parte de pensar composição e estilo. O ponto de partida já está pronto, <b>sem copiar ninguém.</b></div>'),
f'''<div class="bgimg" style="background-image:url({IMG}doom-laptop.jpg);background-size:1080px auto;background-position:center 0;background-repeat:no-repeat;height:900px"></div>
<div class="shade" style="background:linear-gradient(180deg,rgba(12,20,17,.5) 0%,rgba(12,20,17,0) 18%,rgba(12,20,17,0) 45%,#0c1411 66%)"></div>
{frame(4)}<div class="s" style="justify-content:flex-end;gap:30px;padding-bottom:120px">
 {step(2)}<div class="h2" style="font-size:80px">Jogue a referência e o seu personagem numa IA.</div>
 <div class="p" style="font-size:40px">Pode ser o Gemini grátis. Peça pra ele <b>trocar o personagem</b> do post pelo seu e adaptar o texto. O Doom vira o Robert, o Robert vira você.</div>
</div><div class="bot"><span>posts infinitos</span><span>arrasta →</span></div>''',
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
