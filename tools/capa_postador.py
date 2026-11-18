"""Capas do PostadoR_ na estética do site (escuro, verde Matrix, manchete em Inter Black).

  python3 tools/capa_postador.py artigo-x  "Manchete curta" foto.jpg saida.jpg   (1500x600, cabeçalho de artigo do X)
  python3 tools/capa_postador.py artigo-li "Manchete curta" foto.jpg saida.jpg   (1920x1080, capa de artigo do LinkedIn)
  python3 tools/capa_postador.py post-li   "Manchete curta" foto.jpg saida.jpg   (1080x1350, imagem de post do LinkedIn)

A foto (gerada no ChatGPT: o Anderson pelo character sheet, ou o famoso do assunto) é opcional: use "-" para só fundo.
Termine a manchete com "." para o ponto sair verde.
"""
import random, sys
from PIL import Image, ImageDraw, ImageFont, ImageOps

BLACK = "/Users/andersonbrito/Library/Fonts/Inter-Black.otf"
BOLD = "/Users/andersonbrito/Library/Fonts/Inter-Bold.otf"
MONO = "/System/Library/Fonts/Menlo.ttc"
CREAM = (255, 246, 236); VERDE = (0, 255, 102); GRAY = (150, 160, 155); BG = (6, 10, 8)
SIZES = {"artigo-x": (1500, 600), "artigo-li": (1920, 1080), "post-li": (1080, 1350)}


def chuva(d, W, H, alpha_img):
    """Chuva de caracteres verde bem discreta no fundo."""
    rnd = random.Random(7); f = ImageFont.truetype(MONO, 18)
    for x in range(0, W, 26):
        y0 = rnd.randint(-H, 0)
        for i in range(rnd.randint(4, 18)):
            y = y0 + i * 24
            if 0 <= y < H:
                v = int(30 + 90 * i / 18)
                d.text((x, y), rnd.choice("01010110<>/{}=;:+*"), font=f, fill=(0, v, int(v * .4)))


def quebra(texto, fonte, largura):
    linhas, cur = [], ""
    for w in texto.split():
        t = (cur + " " + w).strip()
        if fonte.getlength(t) <= largura or not cur: cur = t
        else: linhas.append(cur); cur = w
    return linhas + [cur]


def capa(modo, titulo, foto, out):
    W, H = SIZES[modo]
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    chuva(d, W, H, im)
    vertical = modo == "post-li"
    if foto and foto != "-":
        f = Image.open(foto).convert("RGB")
        if vertical:  # foto ocupa o topo, manchete embaixo
            ph = int(H * .62); f = ImageOps.fit(f, (W, ph), centering=(.5, .3)); im.paste(f, (0, 0))
            g = Image.linear_gradient("L").resize((W, ph)); m = g.point(lambda v: max(0, (v - 150) * 2.4))
            im.paste(BG, (0, 0, W, ph), m)
        else:  # foto à direita, some no fundo pela esquerda
            pw = int(W * .5); f = ImageOps.fit(f, (pw, H), centering=(.5, .35)); im.paste(f, (W - pw, 0))
            g = Image.linear_gradient("L").rotate(90, expand=True).resize((pw, H)).transpose(Image.FLIP_LEFT_RIGHT)
            im.paste(BG, (W - pw, 0, W, H), g.point(lambda v: min(255, int(v * 1.25))))
        d = ImageDraw.Draw(im)
    pad = int(W * .06)
    tw = W - 2 * pad if vertical else int(W * .56)
    area = (H * .30) if vertical else (H * .55)
    s = int(H * (.11 if vertical else .16))
    while True:
        fb = ImageFont.truetype(BLACK, s); ls = quebra(titulo.upper(), fb, tw)
        if len(ls) * s * 1.02 <= area and len(ls) <= 4: break
        s -= 2
    y = (H - pad - len(ls) * s * 1.02 - s * .3) if vertical else (H - len(ls) * s * 1.02) / 2 + s * .2
    tag = "ARTIGO" if modo.startswith("artigo") else "ANDERSON BRITO"
    ft = ImageFont.truetype(BOLD, max(16, int(s * .28)))
    d.rectangle((pad, y - s * .55, pad + 6, y - s * .2), fill=VERDE)
    d.text((pad + 18, y - s * .55), " ".join(tag), font=ft, fill=VERDE)
    for i, l in enumerate(ls):
        yy = y + i * s * 1.02
        d.text((pad, yy), l, font=fb, fill=CREAM)
        if i == len(ls) - 1 and l.endswith("."):
            d.text((pad + fb.getlength(l[:-1]), yy), ".", font=fb, fill=VERDE)
    fm = ImageFont.truetype(MONO, max(14, int(H * .028)))
    d.text((pad, H - pad * .55), "andersonbrito.com", font=fm, fill=GRAY, anchor="ls")
    im.save(out, quality=90)


if __name__ == "__main__":
    capa(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
