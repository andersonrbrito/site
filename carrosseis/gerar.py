"""Gera carrosséis 1080x1350 (4:5) a partir de HTML, renderizado no Chrome headless.
Uso: python3 gerar.py <slug>   (lê SLIDES[slug], salva em ../painel/carrosseis/<slug>/NN.jpg e index.json)"""
import json, os, subprocess, sys, tempfile, pathlib
CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FONT = os.path.expanduser("~/Library/Fonts/CreatoDisplay-")
HERE = pathlib.Path(__file__).parent
import base64
FONTS = {k: base64.b64encode(open(FONT + n + ".otf", "rb").read()).decode() for k, n in [("L","Light"),("M","Medium"),("B","Bold"),("K","Black")]}
CSS = """
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
@font-face{font-family:Creato;font-weight:300;src:url(data:font/otf;base64,%(L)s)}
@font-face{font-family:Creato;font-weight:500;src:url(data:font/otf;base64,%(M)s)}
@font-face{font-family:Creato;font-weight:700;src:url(data:font/otf;base64,%(B)s)}
@font-face{font-family:Creato;font-weight:900;src:url(data:font/otf;base64,%(K)s)}
*{margin:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden}
body{background:var(--bg);color:var(--fg);font-family:Creato,sans-serif;position:relative}
.s{position:absolute;inset:0;padding:110px 100px;display:flex;flex-direction:column}
.bgimg{position:absolute;inset:0;background-size:cover;background-position:center}
.shade{position:absolute;inset:0}
.top,.bot{position:absolute;left:100px;right:100px;display:flex;justify-content:space-between;font:500 22px Creato;letter-spacing:.22em;text-transform:uppercase;color:var(--mute)}
.top{top:56px}.bot{bottom:52px}
.eyebrow{font:700 24px Creato;letter-spacing:.28em;text-transform:uppercase;color:var(--acc)}
.h{font:900 112px/0.92 Creato;letter-spacing:-.035em;text-transform:uppercase}
.h2{font:900 92px/0.98 Creato;letter-spacing:-.03em}
.ser{font-family:'Instrument Serif',serif;font-style:italic;font-weight:400;letter-spacing:-.01em;text-transform:none}
.p{font:300 46px/1.28 Creato;color:var(--fg2);max-width:860px}
.p b{font-weight:700;color:var(--fg)}
.acc{color:var(--acc)}
.rule{width:84px;height:4px;background:var(--acc)}
.list{display:flex;flex-direction:column;gap:38px}
.li{display:grid;grid-template-columns:110px 1fr;align-items:baseline;border-top:1px solid var(--line);padding-top:30px}
.li i{font:400 76px 'Instrument Serif';font-style:italic;color:var(--acc)}
.li span{font:500 46px/1.2 Creato}
.grow{flex:1}
"""
def page(vars_, body):
    v = ";".join(f"--{k}:{x}" for k, x in vars_.items())
    return f"<html><head><meta charset=utf-8><style>:root{{{v}}}{CSS % FONTS}</style></head><body>{body}</body></html>"

def render(slug, theme, slides, meta):
    out = HERE.parent / "painel" / "carrosseis" / slug; out.mkdir(parents=True, exist_ok=True)
    tmp = pathlib.Path(tempfile.mkdtemp()); files = []
    for i, body in enumerate(slides, 1):
        hp = tmp / f"{i}.html"; hp.write_text(page(theme, body))
        png = tmp / f"{i}.png"
        subprocess.run([CH, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
                        "--virtual-time-budget=4000", "--window-size=1080,1350", f"--screenshot={png}", f"file://{hp}"], capture_output=True)
        jpg = out / f"{i:02d}.jpg"
        subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "92", str(png), "--out", str(jpg)], capture_output=True)
        files.append(jpg.name)
    (out / "index.json").write_text(json.dumps({**meta, "slug": slug, "slides": files}, ensure_ascii=False, indent=1))
    return out
