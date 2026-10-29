from gerar import render, HERE
IMG = f"file://{HERE}/img/"
T = {"bg":"#0b0b0b","fg":"#FFF3E5","fg2":"rgba(255,243,229,.72)","mute":"rgba(255,243,229,.45)","acc":"#FF8A00","line":"rgba(255,243,229,.14)"}
H = "@andersonbrito.mp4"
frame = lambda n, tot=8: f'<div class="top"><span>{H}</span><span>{n:02d} / {tot:02d}</span></div>'
def txt(n, inner, extra=""):
    return f'{extra}{frame(n)}<div class="s" style="justify-content:center;gap:48px">{inner}</div><div class="bot"><span>liberdade</span><span>arrasta →</span></div>'
S = [
# 1 capa
f'''<div class="bgimg" style="background-image:url({IMG}liberdade-capa.jpg);background-position:50% 70%"></div>
<div class="shade" style="background:linear-gradient(180deg,rgba(11,11,11,.92) 0%,rgba(11,11,11,.35) 34%,rgba(11,11,11,0) 55%,rgba(11,11,11,.85) 100%)"></div>
<div class="top"><span>dólar</span><span>liberdade</span><span>patrimônio</span></div>
<div class="s" style="padding-top:118px">
 <div class="h" style="font-size:112px;text-align:center">Não preciso<br>do governo</div>
 <div class="grow"></div>
 <div style="text-align:center"><div class="ser" style="font-size:96px;line-height:.95">e foi isso que me salvou</div><div class="ser acc" style="font-size:96px;line-height:.95">na segunda-feira</div></div>
</div>
<div class="bot"><span>{H}</span><span>arrasta →</span></div>''',
# 2
txt(2, '<div class="eyebrow">Domingo</div><div class="h2">Eu fiquei triste com o resultado.</div><div class="p">Não vou fingir que não. Fiquei.</div>'),
# 3
txt(3, '<div class="eyebrow">Segunda-feira</div><div class="h2">Aí eu lembrei de <span class="ser acc">três coisas.</span></div><div class="list"><div class="li"><i>i.</i><span>Parte da minha renda é em dólar.</span></div><div class="li"><i>ii.</i><span>Não recebo nada do governo.</span></div><div class="li"><i>iii.</i><span>Não dependo dele pra viver.</span></div></div>'),
# 4
txt(4, '<div class="h2">O governo atrapalha?</div><div class="h2 ser acc" style="font-size:110px">Atrapalha.</div><div class="rule"></div><div class="p">Mesmo assim, prefiro mil vezes estar <b>desse lado</b> do que precisar dele.</div>'),
# 5
txt(5, '<div class="p" style="font-size:58px;color:var(--fg)">Muita gente milita por político porque, de algum jeito,</div><div class="h" style="font-size:140px">precisa<br><span class="ser acc">dele.</span></div>'),
# 6 imagem janela
f'''<div class="bgimg" style="background-image:url({IMG}liberdade-janela.jpg);background-position:50% 40%"></div>
<div class="shade" style="background:linear-gradient(180deg,rgba(11,11,11,.0) 40%,rgba(11,11,11,.92) 78%)"></div>
{frame(6)}
<div class="s" style="justify-content:flex-end;gap:28px;padding-bottom:130px">
 <div class="h2">Eu nunca vou<br>me aposentar.</div>
 <div class="p">Vou ter <b>investimento</b> e <b>patrimônio</b> guardado pra me sustentar.</div>
</div><div class="bot"><span>liberdade</span><span>arrasta →</span></div>''',
# 7
txt(7, '<div class="eyebrow">Pra mim, liberdade é</div><div class="h2" style="font-size:96px">a eleição mudar o meu humor,</div><div class="h2 ser acc" style="font-size:120px">mas não o meu mês.</div>'),
# 8 cta
f'''{frame(8)}<div class="s" style="justify-content:center;align-items:center;text-align:center;gap:40px">
 <div class="ser" style="font-size:150px;line-height:.9">E você,</div>
 <div class="h" style="font-size:120px">depende<br>de quem<span class="acc">?</span></div>
 <div class="rule" style="margin-top:20px"></div>
 <div class="eyebrow" style="color:var(--mute)">comenta aqui · {H}</div>
</div>''',
]
print(render("liberdade", T, S, {"titulo":"Não preciso do governo","perfil":"@andersonbrito.mp4","legenda":"Domingo eu fiquei triste. Segunda lembrei que parte da minha renda é em dólar, que não recebo nada do governo e que não dependo dele.\n\nO resultado da eleição muda meu humor, mas não meu mês.\n\nE você, depende de quem?","criado":"2026-10-28"}))
