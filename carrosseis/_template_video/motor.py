"""Motor de template do CarrosseL_ -> vídeo (Reel 9:16 e X 16:9), na identidade de andersonbrito.com (desde 09/11/2026):
fundo #0B0C0E, grade de pontos e brilho nos cantos, vidro, Inter, destaque por tipo (notícia vermelha #FF3B47,
educativo azul #3D8BFF, pessoal verde Matrix #41FF8A). Tipo: campo "tipo" do roteiro (ou a tag da 1ª cena).

Uso (sempre pela fila única de render):
  bash "/Volumes/ANDY 1TB/anderson_Os/07_automacoes/render-fila.sh" \
    python3 ~/Downloads/site/carrosseis/_template_video/motor.py <roteiro.json> --formato ambos

Entrada: roteiro.json (formato no LEIAME.md). Saída: os caminhos "saida_reel" / "saida_x" do roteiro.
Opcional: --quadros 1.5,9,20  (só gera PNGs de teste nesses segundos, sem vídeo)

Camadas, de trás pra frente: fundo #0B0C0E + grid pontilhado em paralaxe, grafo de nós ambiente, partículas de luz com
profundidade, conteúdo da cena (palavra gigante letra por letra, número animado, título com sublinhado na cor do tipo, card de
tweet em vidro com brilho de borda e punch-in, chips), HUD (cantos, timecode, REC, coordenadas, progresso), legenda,
scanlines + vinheta, glitch RGB + flash nos cortes."""
import json, math, os, random, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
FD = os.path.expanduser('~/Library/Fonts/')
MONO = '/System/Library/Fonts/Menlo.ttc'
PEN = '/Volumes/PEN 128GB/'
SFXD = PEN + 'SFX BIBLIOTECA/'
FPS = 30
# Tokens do site (assets/ab.css). CREME = texto, PES = apoio, LAR = destaque do tipo, INK = tinta sobre o destaque.
BG = (11, 12, 14); CREME = (242, 242, 247); PES = (161, 166, 170)
TEMAS = {'noticia': ((255, 59, 71), (43, 4, 7)), 'educativo': ((61, 139, 255), (4, 18, 46)), 'pessoal': ((65, 255, 138), (3, 32, 15))}
LAR, INK = TEMAS['pessoal']
def aplica_tema(R):
    """escolhe a cor de destaque pelo tipo do carrossel (campo "tipo" do roteiro ou tag da 1ª cena)"""
    global LAR, INK
    t = (R.R.get('tipo') or (R.cenas[0].get('tag', '') if R.cenas else '')).lower()
    k = 'noticia' if 'not' in t else 'educativo' if ('educ' in t or 'tutorial' in t or 'prompt' in t) else 'pessoal'
    LAR, INK = TEMAS[k]; return k
AVATAR = os.path.expanduser('~/Downloads/site/painel/carrosseis/perfil/avatar.jpg')

# ---------------------------------------------------------------- utilidades
_f = {}
def F(sz, wt='Black'):
    k = (sz, wt)
    if k not in _f: _f[k] = ImageFont.truetype(f'{FD}Inter-{wt}.otf', int(sz))
    return _f[k]
def FM(sz):
    k = (sz, 'mono')
    if k not in _f: _f[k] = ImageFont.truetype(MONO, int(sz))
    return _f[k]
def cl(x): return max(0.0, min(1.0, x))
def eo(x): x = cl(x); return 1 - (1 - x) ** 3
def back(x, s=1.9): x = cl(x); return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2
def marcado(txt):  # "A *palavra* quente" -> [(palavra, quente)]
    out, hot = [], False
    for part in re.split(r'(\*)', txt):
        if part == '*': hot = not hot; continue
        out += [(w, hot) for w in part.split()]
    return out
_img = {}
def abre(p, larg=None):
    k = (p, larg)
    if k not in _img:
        im = Image.open(p).convert('RGB')
        if larg and im.width > larg: im = im.resize((larg, round(im.height * larg / im.width)), Image.LANCZOS)
        _img[k] = im
    return _img[k]
def put(c, im, cx, cy, a=1.0, s=1.0):
    if a <= .01 or s <= .01: return
    if abs(s - 1) > .004: im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.BICUBIC)
    if a < .999:
        im = im.copy(); im.putalpha(im.getchannel('A').point(lambda v: int(v * a)))
    c.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))
def texto(t, f, cor):
    bb = f.getbbox(t); im = Image.new('RGBA', (bb[2] - bb[0] + 12, bb[3] - bb[1] + 12), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((6 - bb[0], 6 - bb[1]), t, font=f, fill=cor); return im
def glow(im, raio=18, forca=1.6):
    g = im.filter(ImageFilter.GaussianBlur(raio)); a = g.getchannel('A').point(lambda v: min(255, int(v * forca))); g.putalpha(a); return g

# ---------------------------------------------------------------- roteiro
class Roteiro:
    def __init__(self, path):
        R = json.load(open(path, encoding='utf-8'))
        self.R = R; self.base = os.path.dirname(os.path.abspath(path))
        self.vel = float(R.get('velocidade', 1.0))
        self.T = lambda t: float(t) / self.vel
        self.voz = self.p(R['voz'])
        self.dur = float(R.get('duracao') or self.dur_audio(self.voz))
        self.palavras = []
        for ln in open(self.p(R['palavras']), encoding='utf-8'):
            q = ln.strip().rsplit(' ', 2)
            if len(q) == 3: self.palavras.append((q[0], self.T(q[1]), self.T(q[2])))
        self.cenas = []
        for i, c in enumerate(R['cenas']):
            c = dict(c); c['a'] = self.T(c['t0']); c['b'] = min(self.T(c['t1']), self.dur) if c.get('t1') else None
            for m in c.get('midia', []): m['a'] = self.T(m.get('t', c['t0'])); m['src'] = self.p(m['src'])
            c['chips'] = [(self.T(t), s) for t, s in c.get('chips', [])]
            self.cenas.append(c)
        for i, c in enumerate(self.cenas):
            if c['b'] is None: c['b'] = self.cenas[i + 1]['a'] if i + 1 < len(self.cenas) else self.dur
        self.batidas = self.monta_batidas()
        self.legendas = self.monta_legendas()
    def p(self, x): return x if os.path.isabs(x) else os.path.normpath(os.path.join(self.base, os.path.expanduser(x)))
    @staticmethod
    def dur_audio(f):
        return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)
    def monta_batidas(self):
        """corta cada cena em batidas de 1,5 a 3 s: abre com palavra gigante e depois alterna layouts de mídia"""
        out = []
        for ci, c in enumerate(self.cenas):
            a, b = c['a'], c['b']; tipo = c.get('tipo', 'normal')
            if tipo in ('cta', 'pergunta', 'gigante'):  # tela cheia: corta de novo a cada ~2,4 s (re-entra com glitch)
                n = max(1, math.ceil((b - a) / 2.8)); passo = (b - a) / n
                for k in range(n): out.append(dict(ci=ci, a=a + k * passo, b=a + (k + 1) * passo, modo=tipo, k=k))
                continue
            t = a
            if c.get('palavra') or c.get('numero'):
                g = min(1.4 if tipo != 'hook' else 1.8, (b - a) * .45); out.append(dict(ci=ci, a=t, b=t + g, modo='gigante')); t += g
            modos = ['card', 'cheia'] if c.get('midia') and not c.get('chips') else ['card']
            resto = b - t; n = max(1, round(resto / 2.4)); passo = resto / n
            for k in range(n):
                out.append(dict(ci=ci, a=t + k * passo, b=t + (k + 1) * passo, modo=modos[k % len(modos)], k=k))
        return out
    def monta_legendas(self):
        out, cur = [], []
        for w in self.palavras:
            cur.append(w)
            if len(cur) >= 3 or re.search(r'[.,:?!]$', w[0]) or w[0].startswith('@'): out.append(cur); cur = []
        if cur: out.append(cur)
        return out

# ---------------------------------------------------------------- camadas fixas
class Cena:
    def __init__(self, R, fmt):
        self.R = R; self.fmt = fmt
        self.W, self.H = (1080, 1920) if fmt == 'reel' else (1920, 1080)
        W, H = self.W, self.H
        # zona útil: no Reels nada nos 220px de cima e 300px de baixo
        self.top, self.bot = (230, 1610) if fmt == 'reel' else (70, 1010)
        g = Image.new('RGBA', (W + 48, H + 48), BG + (255,)); d = ImageDraw.Draw(g)
        yy, xx = np.mgrid[0:H + 48, 0:W + 48]; D = max(W, H)
        luz = np.clip(.16 * (1 - np.hypot(xx - (W + 48), yy) / (D * .75)), 0, 1) + np.clip(.12 * (1 - np.hypot(xx, yy - (H + 48)) / (D * .65)), 0, 1)
        a = np.array(g, np.float32); a[..., :3] = a[..., :3] * (1 - luz[..., None]) + np.array(LAR, np.float32) * luz[..., None]
        g = Image.fromarray(a.astype(np.uint8), 'RGBA'); d = ImageDraw.Draw(g)
        for x in range(0, W + 48, 48):
            for y in range(0, H + 48, 48): d.ellipse([x - 2, y - 2, x + 2, y + 2], fill=LAR + (34,))
        self.grid = g
        sl = np.zeros((H, W, 4), np.uint8); sl[::3, :, 3] = 16; self.scan = Image.fromarray(sl, 'RGBA')
        yy, xx = np.mgrid[0:H, 0:W]; r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
        v = np.zeros((H, W, 4), np.uint8); v[..., 3] = (np.clip(r - .55, 0, 1) * 150).astype(np.uint8); self.vin = Image.fromarray(v, 'RGBA')
        rnd = random.Random(7)
        self.part = [dict(x=rnd.uniform(0, W), y=rnd.uniform(0, H), z=rnd.random() ** 1.6, v=rnd.uniform(12, 46), f=rnd.uniform(0, 6.3),
                          cor=rnd.choice([LAR, LAR, PES, CREME])) for _ in range(170 if fmt == 'reel' else 190)]
        self.spr = {}
        self.nos = [dict(x=rnd.uniform(0, W), y=rnd.uniform(0, H), vx=rnd.uniform(-9, 9), vy=rnd.uniform(-7, 7)) for _ in range(16)]
        av = Image.open(AVATAR).convert('RGB').resize((84, 84), Image.LANCZOS); m = Image.new('L', (84, 84), 0)
        ImageDraw.Draw(m).ellipse([0, 0, 83, 83], fill=255); self.av = av.convert('RGBA'); self.av.putalpha(m)
        self.vid = {}; self.bordas = {}; self.letras = {}

    # ----- fundo, grafo e partículas
    def fundo(self, t):
        ox = int((t * 7) % 48); oy = int((t * 11) % 48)
        return self.grid.crop((ox, oy, ox + self.W, oy + self.H)).copy()
    def grafo(self, c, t):
        d = ImageDraw.Draw(c); P = []
        for n in self.nos:
            x = (n['x'] + n['vx'] * t) % self.W; y = (n['y'] + n['vy'] * t) % self.H; P.append((x, y))
        for i in range(len(P)):
            for j in range(i + 1, len(P)):
                dx = P[i][0] - P[j][0]; dy = P[i][1] - P[j][1]; dist = math.hypot(dx, dy)
                if dist < 330: d.line([P[i], P[j]], fill=LAR + (int(46 * (1 - dist / 330)),), width=1)
        for x, y in P: d.rectangle([x - 3, y - 3, x + 3, y + 3], outline=PES + (70,), width=1)
    def sprite(self, r, cor):
        k = (r, cor)
        if k not in self.spr:
            s = int(r * 6 + 8); im = Image.new('RGBA', (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
            d.ellipse([s / 2 - r * 2.2, s / 2 - r * 2.2, s / 2 + r * 2.2, s / 2 + r * 2.2], fill=cor + (60,))
            im = im.filter(ImageFilter.GaussianBlur(r * 1.1 + 1)); d = ImageDraw.Draw(im)
            d.ellipse([s / 2 - r * .7, s / 2 - r * .7, s / 2 + r * .7, s / 2 + r * .7], fill=cor + (235,)); self.spr[k] = im
        return self.spr[k]
    def particulas(self, c, t, frente):
        for p in self.part:
            if (p['z'] > .55) != frente: continue
            r = round(1 + p['z'] * 6); y = (p['y'] - p['v'] * (.4 + p['z']) * t) % (self.H + 40) - 20
            x = p['x'] + math.sin(t * .6 + p['f']) * (14 + 30 * p['z'])
            tw = .55 + .45 * math.sin(t * 2.3 + p['f'] * 3)
            s = self.sprite(r, p['cor'])
            if tw < .98: s = s.copy(); s.putalpha(s.getchannel('A').point(lambda v, k=tw * (.5 + .5 * p['z']): int(v * k)))
            c.alpha_composite(s, (int(x - s.width / 2), int(y - s.height / 2)))

    # ----- peças
    def tag(self, txt):
        f = F(30, 'Bold'); tw = f.getlength(txt.upper()); im = Image.new('RGBA', (int(tw) + 48, 52), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle([0, 0, im.width - 1, 51], 26, fill=LAR + (255,)); d.text((24, 26), txt.upper(), font=f, fill=INK, anchor='lm'); return im
    def chip(self, txt):
        f = F(40 if self.fmt == 'reel' else 36, 'Bold'); tw = f.getlength(txt); im = Image.new('RGBA', (int(tw) + 86, 78), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle([0, 0, im.width - 1, 77], 20, fill=(24, 27, 28, 225), outline=LAR + (200,), width=2)
        d.rectangle([24, 33, 36, 45], fill=LAR); d.text((54, 39), txt, font=f, fill=CREME, anchor='lm'); return im
    def vidro(self, w, h, foto, zoom, ox, oy, cred=None):
        """card de tweet em vidro: cabeçalho do perfil, mídia com punch-in, borda com brilho"""
        pad, cab = 22, 112
        im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle([0, 0, w - 1, h - 1], 30, fill=CREME + (26,))
        im.alpha_composite(self.av, (pad, pad + 4))
        d.text((pad + 104, pad + 26), 'Anderson Brito', font=F(34, 'Bold'), fill=CREME, anchor='lm')
        vx = pad + 104 + F(34, 'Bold').getlength('Anderson Brito') + 22
        d.ellipse([vx - 14, pad + 12, vx + 14, pad + 40], fill=LAR); d.line([(vx - 7, pad + 26), (vx - 2, pad + 32), (vx + 8, pad + 20)], fill=INK, width=4)
        d.text((pad + 104, pad + 66), '@andersonbrito.mp4', font=FM(26), fill=PES, anchor='lm')
        mw, mh = w - pad * 2, h - cab - pad
        if foto is not None:
            sc = max(mw / foto.width, mh / foto.height) * zoom; fw, fh = int(foto.width * sc), int(foto.height * sc)
            fr = foto.resize((fw, fh), Image.BICUBIC)
            x0 = int((fw - mw) * (.5 + ox)); y0 = int((fh - mh) * (.5 + oy)); x0 = max(0, min(fw - mw, x0)); y0 = max(0, min(fh - mh, y0))
            fr = fr.crop((x0, y0, x0 + mw, y0 + mh)).convert('RGBA'); m = Image.new('L', (mw, mh), 0)
            ImageDraw.Draw(m).rounded_rectangle([0, 0, mw - 1, mh - 1], 20, fill=255); fr.putalpha(m); im.alpha_composite(fr, (pad, cab))
        if cred: d.text((w - pad - 6, h - pad - 14), cred, font=FM(22), fill=CREME + (200,), anchor='rb')
        if (w, h) not in self.bordas:
            borda = Image.new('RGBA', (w, h), (0, 0, 0, 0)); ImageDraw.Draw(borda).rounded_rectangle([1, 1, w - 2, h - 2], 30, outline=LAR + (255,), width=3)
            base = Image.new('RGBA', (w + 80, h + 80), (0, 0, 0, 0)); base.alpha_composite(glow(borda, 16, 2.2), (40, 40)); self.bordas[(w, h)] = (base, borda)
        base, borda = self.bordas[(w, h)]
        out = base.copy(); out.alpha_composite(im, (40, 40)); out.alpha_composite(borda, (40, 40)); return out
    def foto_em(self, m, t):
        if m.get('tipo') == 'video':
            if m['src'] not in self.vid:
                pasta = os.path.join(AQUI, '.cache', re.sub(r'\W', '_', m['src'])[-60:]); os.makedirs(pasta, exist_ok=True)
                if not os.listdir(pasta):
                    subprocess.run(['ffmpeg', '-v', 'error', '-threads', '2', '-ss', str(m.get('inicio', 0)), '-i', m['src'], '-t', '20', '-vf', 'fps=15,scale=1100:-2', f'{pasta}/q_%04d.jpg'], check=True)
                self.vid[m['src']] = sorted(os.path.join(pasta, f) for f in os.listdir(pasta))
            q = self.vid[m['src']]; return abre(q[min(len(q) - 1, int(max(0, t - m['a']) * 15))])
        return abre(m['src'], 1600)
    def midia_atual(self, cena, t):
        ms = [m for m in cena.get('midia', []) if m['a'] <= t + 1e-3]
        return ms[-1] if ms else (cena['midia'][0] if cena.get('midia') else None)

    # ----- título com palavras entrando + sublinhado na cor do tipo
    def titulo(self, c, txt, cx, cy, maxw, t, t0, tam, topo=None):
        toks = marcado(txt.upper())
        while True:
            f = F(tam); sp = f.getlength(' '); linhas, cur, w = [], [], 0
            for p, hot in toks:
                ww = f.getlength(p)
                if cur and w + sp + ww > maxw: linhas.append((cur, w)); cur, w = [], 0
                cur.append((p, hot, ww)); w += (sp if len(cur) > 1 else 0) + ww
            if cur: linhas.append((cur, w))
            if len(linhas) <= 4 or tam < 60: break
            tam -= 6
        lh = tam * 1.04; y = (topo if topo is not None else cy - lh * len(linhas) / 2); d = ImageDraw.Draw(c); k = 0
        for pal, lw in linhas:
            x = cx - lw / 2
            for p, hot, ww in pal:
                q = (t - t0 - k * .06) / .26; k += 1
                if q > 0:
                    sc = .55 + .45 * back(q); im = texto(p, F(tam), LAR if hot else CREME)
                    put(c, im, x + ww / 2, y + lh / 2 + 26 * (1 - eo(q)), cl(q * 2.5), sc)
                    if hot:
                        u = eo((t - t0 - k * .06 - .2) / .3)
                        if u > 0: d.rectangle([x, y + lh - 4, x + ww * u, y + lh + 6], fill=LAR)
                x += ww + sp
            y += lh
        return y

    # ----- palavra gigante letra por letra (ou número animado)
    def gigante(self, c, palavra, numero, t, t0, cy):
        W = self.W; maxw = W - 180
        if numero:
            m = re.match(r'([^\d]*)(\d+)(.*)', numero); pre, n, suf = m.group(1), int(m.group(2)), m.group(3)
            v = int(round(n * eo((t - t0) / .9))); palavra = f'{pre}{v}{suf}'
        tam = 330 if self.fmt == 'reel' else 300
        while F(tam).getlength(palavra) > maxw and tam > 60: tam -= 8
        f = F(tam); x = W / 2 - f.getlength(palavra) / 2
        for i, ch in enumerate(palavra):
            cw = f.getlength(ch); q = (t - t0 - (0 if numero else i * .045)) / .3
            if q > 0 and ch.strip():
                cor = LAR if (numero or i % 5 == 0) else CREME; k = (ch, tam, cor)
                if k not in self.letras: im0 = texto(ch, f, cor); self.letras[k] = (im0, glow(im0, 22, 1.4))
                im, gl = self.letras[k]
                if q < 1.4: put(c, gl, x + cw / 2, cy, .55 * cl(q * 2))
                put(c, im, x + cw / 2, cy + 60 * (1 - eo(q)), cl(q * 3), .5 + .5 * back(q))
            x += cw

    # ----- HUD
    def hud(self, c, t, ci, ncenas, tag):
        W, H = self.W, self.H; d = ImageDraw.Draw(c); m = 56 if self.fmt == 'reel' else 46
        y0, y1 = (self.top - 10, self.bot + 10) if self.fmt == 'reel' else (m, H - m)
        for x, y, sx, sy in [(m, y0, 1, 1), (W - m, y0, -1, 1), (m, y1, 1, -1), (W - m, y1, -1, -1)]:
            d.line([x, y, x + 54 * sx, y], fill=LAR, width=4); d.line([x, y, x, y + 54 * sy], fill=LAR, width=4)
        f = FM(24); yt = y0 + 22
        d.text((m + 26, yt), 'ANDERSON.BRITO // CARROSSEL_', font=f, fill=CREME + (210,))
        tc = f'{int(t // 60):02d}:{int(t % 60):02d}:{int((t % 1) * 30):02d}'
        d.text((W - m - 26, yt), tc, font=f, fill=CREME + (210,), anchor='ra')
        if int(t * 2) % 2 == 0: d.ellipse([W - m - 60 - f.getlength(tc), yt + 4, W - m - 44 - f.getlength(tc), yt + 20], fill=(255, 60, 40))
        d.text((W - m - 70 - f.getlength(tc), yt), 'REC', font=f, fill=(255, 60, 40), anchor='ra')
        yb = y1 - 46
        d.text((m + 26, yb), f'LAT -23.5505  LON -46.6333  //  CENA {ci + 1:02d}/{ncenas:02d}', font=f, fill=PES + (190,))
        bx = W - m - 26 - ncenas * 22
        for i in range(ncenas): d.rectangle([bx + i * 22, yb + 4, bx + i * 22 + 14, yb + 18], fill=LAR if i <= ci else None, outline=PES + (160,))
        if tag:
            im = self.tag(tag); c.alpha_composite(im, (m + 22, int(yt + 44)))

    # ----- legenda (palavra atual na cor do tipo)
    def legenda(self, c, t):
        for grp in self.R.legendas:
            a = grp[0][1]; b = grp[-1][2] + .3
            if a <= t < b:
                f = F(52 if self.fmt == 'reel' else 46, 'Bold'); sp = f.getlength(' ')
                ws = [(w, s, e, f.getlength(w)) for w, s, e in grp]; tot = sum(x[3] for x in ws) + sp * (len(ws) - 1)
                if self.fmt == 'reel': y, cx = self.bot - 150, self.W / 2
                else:
                    bt = next((b for b in self.R.batidas if b['a'] <= t < b['b']), self.R.batidas[-1])
                    cheio = bt['modo'] in ('gigante', 'pergunta', 'cta')
                    y, cx = (self.H - 150, self.W / 2) if cheio else (self.H - 170, 110 + 360)
                x = cx - tot / 2
                fundo = Image.new('RGBA', (int(tot) + 56, 84), (0, 0, 0, 0))
                ImageDraw.Draw(fundo).rounded_rectangle([0, 0, fundo.width - 1, 83], 18, fill=(18, 18, 18, 190)); put(c, fundo, cx, y)
                d = ImageDraw.Draw(c)
                for w, s, e, ww in ws:
                    d.text((x, y), w, font=f, fill=LAR if s <= t < e + .05 else CREME, anchor='lm'); x += ww + sp
                return

    # ----- cada batida
    def conteudo(self, c, t, bt):
        cena = self.R.cenas[bt['ci']]; W, H = self.W, self.H; modo = bt['modo']; t0 = bt['a']; reel = self.fmt == 'reel'
        dentro = t - t0
        if modo == 'gigante' or (modo in ('pergunta',)):
            cy = H / 2 - (40 if reel else 30)
            self.gigante(c, cena.get('palavra', '?') if modo != 'pergunta' else cena.get('palavra', '?'), cena.get('numero'), t, t0, cy)
            if cena.get('subtitulo'): self.titulo(c, cena['subtitulo'], W / 2, cy + (260 if reel else 210), W - 240, t, t0 + .35, 64 if reel else 56)
            return
        if modo == 'cta':
            linhas = cena.get('linhas', ['SEGUE', '@andersonbrito.mp4'])
            pos = []; ra = 120 if reel else 95; ya = H / 2 - (330 if reel else 250)
            av = self.av.resize((ra * 2, ra * 2), Image.LANCZOS); qa = eo(dentro / .35)
            anel = Image.new('RGBA', (ra * 2 + 60, ra * 2 + 60), (0, 0, 0, 0)); da = ImageDraw.Draw(anel); rot = dentro * 90
            for k2 in range(12): da.arc([6, 6, ra * 2 + 54, ra * 2 + 54], rot + k2 * 30, rot + k2 * 30 + 18, fill=LAR, width=6)
            put(c, glow(anel, 14, 1.6), W / 2, ya, qa); put(c, anel, W / 2, ya, qa, .8 + .2 * back(dentro / .4)); put(c, av, W / 2, ya, qa, .8 + .2 * back(dentro / .4))
            y = ya + ra + (150 if reel else 110)
            for i, ln in enumerate(linhas):
                tam = 150 if i == 0 else (78 if reel else 70)
                im = texto(ln, F(tam, 'Black' if i == 0 else 'Bold'), CREME if i == 0 else LAR)
                q = (dentro - i * .18) / .3
                if q > 0: put(c, glow(im, 18, 1.2), W / 2, y, .5 * cl(q)); put(c, im, W / 2, y + 30 * (1 - eo(q)), cl(q * 2), .6 + .4 * back(q)); pos.append((W / 2, y))
                y += 190 if i == 0 else 110
            d = ImageDraw.Draw(c)
            for i in range(len(pos)): d.line([(W / 2 - 330, ya), (pos[i][0] - 330, pos[i][1])], fill=LAR + (110,), width=2); d.rectangle([W / 2 - 336, pos[i][1] - 6, W / 2 - 324, pos[i][1] + 6], fill=INK, outline=LAR, width=2)
            return
        # card / cheia
        m = self.midia_atual(cena, t); foto = self.foto_em(m, t) if m else None
        zin = 1.0 + .09 * eo(dentro / max(.5, bt['b'] - t0)) if bt.get('k', 0) % 2 == 0 else 1.09 - .09 * eo(dentro / max(.5, bt['b'] - t0))
        ox = .08 * math.sin(bt.get('k', 0) * 2.1); oy = -.1
        tit = cena.get('titulo2') if cena.get('titulo2') and t >= self.R.T(cena['titulo2'][0]) else None
        txt = tit[1] if tit else cena.get('titulo', '')
        ttin = self.R.T(cena['titulo2'][0]) if tit else t0
        nch = len(cena['chips']); a = eo(dentro / .25)
        if reel:
            topo = self.top + 112
            yt = self.titulo(c, txt, W / 2, 0, 900, t, ttin, 78 if modo == 'cheia' else 96, topo=topo) if txt else topo
            ychip = self.bot - 250 - 96 * (nch - 1) if nch else None
            y0 = yt + 34; y1 = (ychip - 70) if nch else self.bot - 225
            ch = max(320, int(y1 - y0)); cw = W - 110 if modo == 'cheia' else 900
            if foto is not None:
                card = self.vidro(cw, ch, foto, zin + (.06 if modo == 'cheia' else 0), ox, oy, m.get('credito'))
                put(c, card, W / 2, y0 + ch / 2 + 50 * (1 - a), a, .93 + .07 * back(dentro / .32))
            nodos = [(W / 2, yt + 6), (W / 2 - cw / 2 + 10, y0 + 40), (W / 2 + cw / 2 - 10, y0 + 40)]
            xchip = W / 2
        else:
            colw = 640 if modo == 'cheia' else 720; esq = 110
            cw, ch = (1060, 900) if modo == 'cheia' else (960, 860)
            cxm = W - 90 - cw / 2
            if foto is not None:
                card = self.vidro(cw, ch, foto, zin + (.06 if modo == 'cheia' else 0), ox, oy, m.get('credito'))
                put(c, card, cxm, H / 2 + 20 + 40 * (1 - a), a, .93 + .07 * back(dentro / .32))
            yt = self.titulo(c, txt, esq + colw / 2, H / 2 - 20, colw, t, ttin, 84 if modo != 'cheia' else 72, topo=190 if nch else None) if txt else 300
            if not nch and txt: pass
            nodos = [(esq + colw / 2, yt + 6), (cxm - cw / 2 + 30, H / 2 - 200), (cxm - cw / 2 + 30, H / 2 + 200)]
            ychip = yt + 80; xchip = esq + colw / 2
        d = ImageDraw.Draw(c); vis = eo((dentro - .2) / .4)
        if vis > 0 and foto is not None:  # grafo ligando título, card e chips
            for a_, b_ in zip(nodos, nodos[1:] + nodos[:1]):
                d.line([a_, (a_[0] + (b_[0] - a_[0]) * vis, a_[1] + (b_[1] - a_[1]) * vis)], fill=LAR + (120,), width=2)
            for x, y in nodos: d.rectangle([x - 6, y - 6, x + 6, y + 6], fill=INK, outline=LAR, width=2)
        for i, (tc, s) in enumerate(cena['chips']):
            if t >= tc:
                q = (t - tc) / .28; im = self.chip(s); yy = ychip + i * 96
                put(c, im, xchip + 60 * (1 - eo(q)), yy, cl(q * 2), .7 + .3 * back(q))
                if foto is not None and not reel: d.line([(xchip + im.width / 2 + 60 * (1 - eo(q)), yy), nodos[1]], fill=LAR + (70,), width=1)

    def quadro(self, t):
        R = self.R; W, H = self.W, self.H
        bt = next((b for b in R.batidas if b['a'] <= t < b['b']), R.batidas[-1])
        ci = bt['ci']; cena = R.cenas[ci]
        c = self.fundo(t); self.grafo(c, t); self.particulas(c, t, False)
        # punch geral no começo de cada batida
        self.conteudo(c, t, bt)
        self.particulas(c, t, True)
        self.hud(c, t, ci, len(R.cenas), cena.get('tag', ''))
        self.legenda(c, t)
        c.alpha_composite(self.scan); c.alpha_composite(self.vin)
        out = np.asarray(c.convert('RGB')).copy()
        k = t - bt['a']
        if k < .16:  # glitch RGB + fatias deslocadas + flash no corte
            rnd = random.Random(int(t * FPS) * 7 + ci); sh = int(18 * (1 - k / .16)) + 4
            out[..., 0] = np.roll(out[..., 0], sh, axis=1); out[..., 2] = np.roll(out[..., 2], -sh, axis=1)
            for _ in range(6):
                y = rnd.randint(0, H - 60); hh = rnd.randint(8, 60); out[y:y + hh] = np.roll(out[y:y + hh], rnd.randint(-80, 80), axis=1)
            fl = max(0, 1 - k / .08) * (.6 if bt['modo'] == 'gigante' else .3)
            if fl > 0: out = (out * (1 - fl) + np.array(CREME) * fl).astype(np.uint8)
        return out

# ---------------------------------------------------------------- áudio
SONS = {'impacto': 'Hits e Impactos/01 Layered Hits - Cinematix SFX.wav', 'impacto2': 'Hits e Impactos/04 Layered Hits - Cinematix SFX.wav',
        'whoosh': 'Whooshes e Transicoes/15 Quick A.wav', 'whoosh2': 'Whooshes e Transicoes/04 Flyby A.wav', 'whoosh3': 'Whooshes e Transicoes/06 Flyby C.wav',
        'glitch': 'Glitch e Estatica/Glitch (1).wav', 'glitch2': 'Glitch e Estatica/Glitch (2).wav',
        'pop': 'Cliques e UI/Pop up Sound effect ( 256kbps cbr ).mp3', 'click': 'Cliques e UI/Ni Sound - Modern UI - Perfect Click.wav',
        'riser': 'Risers Reverses e Drops/DROP.mp3', 'dinheiro': 'Dinheiro e Caixa/cha ching.wav'}
def audio(R, saida):
    pistas = [(0.0, 'impacto', -5)]
    for i, b in enumerate(R.batidas[1:]):
        pistas.append((max(0, b['a'] - .1), ['whoosh', 'whoosh2', 'whoosh3'][i % 3], -11))
        pistas.append((b['a'], 'glitch' if i % 2 else 'glitch2', -15))
        if b['modo'] == 'gigante': pistas.append((b['a'], 'impacto2', -12))
    for c in R.cenas:
        for tc, _ in c['chips']: pistas.append((tc, 'pop', -12))
        for t, s in c.get('sons', []): pistas.append((R.T(t), s, -10))
        if c.get('tipo') == 'cta': pistas.append((c['a'] + .05, 'click', -8))
    trilha = R.p(R.R['trilha']); ins = ['-i', R.voz, '-i', trilha]
    fl = ['[0]loudnorm=I=-15:TP=-1.5:LRA=11,aresample=48000,aformat=channel_layouts=stereo[v]',
          f'[1]atrim=0:{R.dur},loudnorm=I=-35:TP=-9,afade=t=in:d=0.3,afade=t=out:st={R.dur - 1.6}:d=1.6,aresample=48000,aformat=channel_layouts=stereo[m]']
    lab = ['[v]', '[m]']; n = 2
    for c in R.cenas:
        for m in c.get('midia', []):
            if m.get('tipo') == 'video' and m.get('som', True):
                fim = c['b'] - m['a']; ms = int(m['a'] * 1000); ins += ['-ss', str(m.get('inicio', 0)), '-i', m['src']]
                fl.append(f'[{n}:a]atrim=0:{fim:.2f},volume=-24dB,afade=t=out:st={max(0, fim - .5):.2f}:d=0.5,adelay={ms}|{ms},aresample=48000,aformat=channel_layouts=stereo[o{n}]'); lab.append(f'[o{n}]'); n += 1
    for t, k, g in pistas:
        ins += ['-i', SFXD + SONS[k]]; ms = int(t * 1000)
        fl.append(f'[{n}:a]atrim=0:2.5,aformat=channel_layouts=stereo,volume={g}dB,adelay={ms}|{ms},aresample=48000[s{n}]'); lab.append(f'[s{n}]'); n += 1
    fl.append(''.join(lab) + f'amix=inputs={len(lab)}:normalize=0:duration=longest,atrim=0:{R.dur},alimiter=limit=0.95[a]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-threads', '2', *ins, '-filter_complex', ';'.join(fl), '-map', '[a]', '-ar', '48000', '-ac', '2', saida], check=True)

def render(R, fmt, saida, mix):
    S = Cena(R, fmt)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{S.W}x{S.H}', '-r', str(FPS), '-i', '-', '-i', mix,
                          '-threads', '2', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k',
                          '-shortest', '-movflags', '+faststart', saida], stdin=subprocess.PIPE)
    n = int(R.dur * FPS)
    for i in range(n):
        p.stdin.write(S.quadro(i / FPS).tobytes())
        if i % 150 == 0: print(f'{fmt} {i}/{n}', flush=True)
    p.stdin.close(); p.wait(); print('ok', saida)

if __name__ == '__main__':
    a = sys.argv[1:]; rot = a[0]
    fmt = a[a.index('--formato') + 1] if '--formato' in a else 'ambos'
    R = Roteiro(rot); print('tema:', aplica_tema(R)); fmts = ['reel', 'x'] if fmt == 'ambos' else [fmt]
    if '--quadros' in a:
        ts = [float(x) for x in a[a.index('--quadros') + 1].split(',')]; od = a[a.index('--saida') + 1] if '--saida' in a else os.path.join(R.base, 'quadros')
        os.makedirs(od, exist_ok=True)
        for f in fmts:
            S = Cena(R, f)
            for t in ts: Image.fromarray(S.quadro(t)).save(f'{od}/{f}_{t:05.2f}.jpg', quality=85)
        print('quadros em', od); sys.exit()
    mix = os.path.join(R.base, '.mix.wav'); audio(R, mix)
    for f in fmts: render(R, f, R.p(R.R['saida_' + f]), mix)
