# Gera páginas de portfólio por vaga (andersonbrito.com/<slug>/) a partir do estilo de /trabalhos/
import re, os
ROOT = os.path.expanduser("~/Downloads/site")
base = open(f"{ROOT}/trabalhos/index.html").read()
css = re.search(r"<style>[\s\S]*?</style>", base).group(0)
V = {  # vídeo: (arquivo relativo à raiz do site, poster, rótulo, título, texto)
 "viva-franks1": ("dr/videos/viva-franks1.mp4", "dr/images/viva-franks1.jpg", "Criativo · tráfego pago", "Viva America · gancho em pergunta", "Criativo de performance para imigração aos EUA: gancho direto, legenda dinâmica e prova."),
 "viva-franks2": ("dr/videos/viva-franks2.mp4", "dr/images/viva-franks2.jpg", "Criativo · variação", "Viva America · variação de ângulo", "Mesma oferta, outro ângulo e outro gancho, pensado para teste A/B."),
 "viva-ia": ("dr/videos/viva-ia.mp4", "dr/images/viva-ia.jpg", "Criativo com IA", "Viva America · IA + legenda", "Cenas geradas por IA misturadas com a especialista, ritmo de anúncio."),
 "arquibancada": ("dr/videos/arquibancada.mp4", "dr/images/arquibancada.jpg", "Anúncio · e-commerce", "Sua marca na arquibancada", "Anúncio de Copa com oferta clara, entrega rápida e CTA na tela."),
 "thaix": ("dr/videos/thaix-pixar.mp4", "dr/images/thaix-pixar.jpg", "Lead narrativo · 100% IA", "Emagrecimento feminino · estilo Pixar", "Anúncio-história de 2 min: personagens consistentes, vozes por IA, dor → descoberta → prova → CTA. Peça de teste (spec)."),
 "sonho": ("dr/videos/sonho-americano.mp4", "dr/images/sonho-americano.jpg", "Lead · talking head", "Sonho americano vira pesadelo sem plano", "Lead de 90s com dois especialistas, cortes de retenção e legenda palavra a palavra."),
 "eduardo": ("trabalhos/videos/eduardo-schroeder.mp4", "trabalhos/images/poster-eduardo.jpg", "História com IA", "Eduardo Schroeder · Cheirin Bão", "O fundador encontra a versão jovem de si mesmo. Voz clonada e cenas geradas por IA."),
 "bomba": ("assets/bombaatomica/BOMBAATOMICA.mp4", "trabalhos/images/poster-bomba.jpg", "Filme 100% IA", "Filme de época inteiro com IA", "Personagens, cenários e narração gerados e editados do roteiro ao corte final."),
}
P = {
 "tie": dict(tag="Editor de vídeo · Direct Response", h1="Criativos e leads que <em>prendem e convertem.</em>",
   lead="Sou <b>Anderson Brito</b>, editor de vídeo com 10+ anos de audiovisual e Marketing pela FGV. Edito criativos, leads e variações para teste com foco em retenção, clareza e clique, usando IA (voz, avatar, cenas) para entregar volume todo dia.",
   chips=["PJ · 100% remoto · full time", "CapCut · Premiere · DaVinci", "IA: Higgsfield, Kling, Veo, ElevenLabs", "Disponível agora"],
   blocos=[("Criativos para anúncio", "Ganchos, variações e CTAs para teste.", ["viva-franks1","viva-franks2","viva-ia","arquibancada"]),
           ("Leads e micro-leads", "Narrativa com retenção do primeiro ao último segundo.", ["thaix","sonho"])],
   fit=[("Volume e variação","Um corte base vira várias versões de gancho, ritmo, legenda e CTA no mesmo dia."),("Feedback rápido","Aplico ajustes de copy, tráfego e direção criativa sem travar a fila."),("IA no fluxo","Voz, dublagem, avatar, cenas geradas e automação de legendas com Claude."),("Dado acima do ego","Penso em retenção, CTR e conversão, não em vídeo bonito.")]),
 "palazzio": dict(tag="Video designer · Ads · IA", h1="Anúncio curto que <em>prende em 3 segundos.</em>",
   lead="Sou <b>Anderson Brito</b>, editor de vídeo e criador com IA (10+ anos de audiovisual, Marketing pela FGV). Faço anúncios curtos com gancho forte, legenda legível sem som, corte no ritmo da trilha e final que chama para a ação, com imagem, vídeo e voz por IA quando faz sentido.",
   chips=["100% remoto · PJ", "IA: imagem, vídeo e voz", "CapCut · Premiere", "Disponível agora"],
   blocos=[("Anúncios curtos", "Gancho, legenda sem som e CTA.", ["arquibancada","viva-ia","viva-franks1","viva-franks2"]),
           ("História e IA", "Quando o anúncio pede narrativa.", ["thaix","eduardo"])],
   fit=[("Gancho nos 3 primeiros segundos","Começo pela imagem ou frase que para o dedo."),("Legenda para ver sem som","Grande, contrastada e no ritmo da fala."),("Corte na trilha","A edição acompanha a batida."),("CTA claro","O final chama para agendar.")]),
 "novelas": dict(tag="Vídeos com IA · histórias", h1="Histórias com IA, <em>do roteiro ao vídeo.</em>",
   lead="Sou <b>Anderson Brito</b>, editor de vídeo e criador com IA. Crio cenários e personagens consistentes no ChatGPT e Nano Banana, animo no Veo 3 (Flow), Kling e Seedance, e monto a história com voz, ritmo e legenda.",
   chips=["Veo 3 / Flow · Kling · Seedance", "Personagem consistente", "CapCut · Premiere", "Disponível agora"],
   blocos=[("Histórias feitas com IA", "Personagens, cenas e vozes gerados.", ["thaix","bomba","eduardo"]),
           ("Vídeos curtos com IA", "Ritmo de rede social.", ["viva-ia","arquibancada"])],
   fit=[("Personagem igual do começo ao fim","Uso prancha de personagem para não mudar o rosto entre as cenas."),("Roteiro pronto vira vídeo","Recebo o texto e devolvo a história montada."),("Ritmo de novela","Diálogo, reação e gancho para o próximo episódio."),("Ferramentas próprias","Já trabalho no Flow, Kling e Seedance todo dia.")]),
 "dr": dict(tag="Editor de VSL e criativos · Direct Response", h1="VSLs e criativos <em>focados em conversão.</em>",
   lead="Sou <b>Anderson Brito</b>, editor de vídeo com 10+ anos de audiovisual e Marketing pela FGV. Edito leads, VSLs e criativos de performance com velocidade e consistência, usando IA para cenas, voz e variações.",
   chips=["Remoto · full time", "Criativos · leads · VSL", "IA no fluxo", "Disponível agora"],
   blocos=[("Leads e narrativa", "Retenção do início ao CTA.", ["thaix","sonho"]),
           ("Criativos de performance", "Variações para teste.", ["viva-franks1","viva-franks2","viva-ia","arquibancada"])],
   fit=[("Velocidade","Variações de gancho e CTA no mesmo dia."),("Consistência","Padrão de qualidade e legenda em toda a fila."),("Conversão","Edição pensada em retenção e clique."),("IA","Cenas, voz e avatar para escalar criativos.")]),
}
def case(k):
    src, poster, t, h, p = V[k]
    return f'<div class="case"><video src="../{src}" poster="../{poster}" controls playsinline preload="none"></video><span class="t">{t}</span><h3>{h}</h3><p>{p}</p></div>'
for slug, d in P.items():
    blocos = "".join(f'<section><div class="wrap"><span class="kicker">{k}</span><h2>{s}</h2><div class="cases">{"".join(case(x) for x in ids)}</div></div></section>' for k, s, ids in d["blocos"])
    fit = "".join(f"<div><b>{a}</b><span>{b}</span></div>" for a, b in d["fit"])
    html = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Anderson Brito: editor de vídeo</title><meta name="robots" content="noindex">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
{css}</head><body>
<header class="hero"><div class="wrap hero-grid"><div>
<span class="tag">{d['tag']}</span><h1>{d['h1']}</h1><p class="lead">{d['lead']}</p>
<a class="cta" href="https://wa.me/5511948577950" target="_blank" rel="noopener">Falar com o Anderson →</a>
<div class="chips">{''.join(f'<span>{c}</span>' for c in d['chips'])}</div></div>
<div class="me"><img src="../trabalhos/images/anderson-camera.jpg" alt="Anderson Brito"></div></div></header>
{blocos}
<section><div class="wrap"><span class="kicker">Como eu trabalho</span><h2>O que você ganha comigo.</h2><div class="fit">{fit}</div>
<div class="nums"><div><b>25M+</b><span>views em um vídeo (collab CazéTV)</span></div><div><b>10+ anos</b><span>de audiovisual</span></div><div><b>FGV</b><span>Marketing e MBA</span></div></div></div></section>
<footer><div class="wrap"><h2>Pronto para começar agora.</h2><p class="contacts">contato@andersonbrito.com · (11) 94857-7950 · @andersonbrito.mp4 · <a href="../trabalhos/">portfólio completo</a></p></div></footer>
</body></html>"""
    os.makedirs(f"{ROOT}/{slug}", exist_ok=True); open(f"{ROOT}/{slug}/index.html", "w").write(html)
    print("ok", slug)
