#!/usr/bin/env python3
"""SkillS_ > Painel: sincroniza as skills do Mac com o painel e aplica a escolha do Anderson.

1. Lê ~/.claude/skills/*/SKILL.md, ~/.claude/skills_desligadas/* e as skills dos plugins instalados.
2. Faz upsert em skills_catalogo (slug, nome, descrição, categoria, arquivos, caminho, instalada).
   A coluna "escolha" é do Anderson: o banco nunca deixa o agente mexer nela.
3. Aplica a escolha: 'desligada' tira a pasta de ~/.claude/skills (guarda em ~/.claude/skills_desligadas),
   'ativa' devolve. 'avaliar' não mexe. Plugins não são movidos (liga/desliga pelo app).

Uso:  python3 tools/skills_sync.py            (sincroniza e aplica)
      python3 tools/skills_sync.py --so-ler   (só mostra o que faria)
"""
import json, os, re, shutil, sys
sys.path.insert(0, os.path.dirname(__file__))
from agente import call

HOME = os.path.expanduser("~/.claude")
ATIVAS, DESLIG = f"{HOME}/skills", f"{HOME}/skills_desligadas"
SO_LER = "--so-ler" in sys.argv

# categoria por nome (o painel deixa reclassificar depois, se precisar)
CAT = [(r"remotion|motion|lemo|opuscar|hq|glass|anima", "motion"), (r"legenda|caption", "legenda"), (r"estilo-", "estilo"),
       (r"edit|video|corte|clip|watch|blockout|shotlist|seedance", "video"), (r"post|analise|vidiq|conteudo|marketing|carrossel", "conteudo"),
       (r"design|refero|svg|image|thumb|marp|slides", "design"), (r"docx|pdf|pptx|xlsx|docs", "docs")]
def categoria(slug):
    return next((c for r, c in CAT if re.search(r, slug)), "sistema")

def frontmatter(md):
    m = re.match(r"---\s*\n(.*?)\n---", md, re.S)
    out = {}
    if m:
        for linha in m.group(1).splitlines():
            if ":" in linha and not linha.startswith(" "):
                k, v = linha.split(":", 1); out[k.strip()] = v.strip().strip('"')
    return out

def arquivos(pasta):
    lst = []
    for raiz, _, fs in os.walk(pasta):
        for f in fs:
            if f.startswith(".") or f.startswith("._"): continue
            p = os.path.join(raiz, f); lst.append({"nome": os.path.relpath(p, pasta), "bytes": os.path.getsize(p)})
    return sorted(lst, key=lambda x: x["nome"])[:80]

def ler(pasta, tipo="skill", plugin=None):
    md_path = os.path.join(pasta, "SKILL.md")
    if not os.path.exists(md_path): return None
    md = open(md_path, encoding="utf-8", errors="ignore").read()
    fm = frontmatter(md); slug = os.path.basename(pasta.rstrip("/"))
    if plugin: slug = f"{plugin}:{slug}"
    fonte = re.search(r"https?://[^\s)>\"]+", md)
    return {"slug": slug[:80], "nome": (fm.get("name") or slug)[:120], "descricao": (fm.get("description") or "")[:2000],
            "categoria": categoria(slug), "tipo": tipo, "caminho": pasta[:500], "arquivos": arquivos(pasta),
            "fonte_url": fonte.group(0)[:500] if fonte else None}

itens = []
for base, inst in ((ATIVAS, True), (DESLIG, False)):
    if not os.path.isdir(base): continue
    for d in sorted(os.listdir(base)):
        if d in ("synced",) or d.startswith("."): continue
        it = ler(os.path.join(base, d))
        if it: it["instalada"] = inst; itens.append(it)
# skills de plugins instalados
try:
    plugs = json.load(open(f"{HOME}/plugins/installed_plugins.json")).get("plugins", {})
    for nome, regs in plugs.items():
        for reg in regs if isinstance(regs, list) else [regs]:
            raiz = reg.get("installPath") or ""
            for sk in sorted(os.listdir(os.path.join(raiz, "skills"))) if os.path.isdir(os.path.join(raiz, "skills")) else []:
                it = ler(os.path.join(raiz, "skills", sk), "plugin", nome.split("@")[0])
                if it: it["instalada"] = True; itens.append(it)
except (OSError, ValueError):
    pass

from datetime import datetime, timezone
agora = datetime.now(timezone.utc).isoformat()
for it in itens: it["sincronizado_em"] = agora
print(f"{len(itens)} skills encontradas")

# slugs já no banco (para marcar as que chegaram agora como 'nova')
r = call("agente", {"op": "select", "table": "skills_catalogo", "select": "slug,escolha,tipo,instalada,caminho", "limit": 1000})
banco = {x["slug"]: x for x in r.get("data", [])} if isinstance(r.get("data"), list) else {}
if "error" in r: print("aviso:", r["error"])
for it in itens: it["origem"] = "instalada" if it["slug"] in banco or not banco else "nova"

if not SO_LER and itens:
    # upsert precisa das mesmas chaves em todas as linhas
    chaves = sorted({k for it in itens for k in it})
    linhas = [{k: it.get(k) for k in chaves} for it in itens]
    for i in range(0, len(linhas), 50):
        print(call("agente", {"op": "upsert", "table": "skills_catalogo", "rows": linhas[i:i + 50]}))

# aplicar a escolha (só skills do usuário, plugins não)
movidas = []
for slug, x in banco.items():
    if x.get("tipo") == "plugin" or ":" in slug: continue
    ativa, deslig = os.path.join(ATIVAS, slug), os.path.join(DESLIG, slug)
    if x["escolha"] == "desligada" and os.path.isdir(ativa):
        movidas.append(f"desligou {slug}")
        if not SO_LER: os.makedirs(DESLIG, exist_ok=True); shutil.move(ativa, deslig)
    elif x["escolha"] == "ativa" and os.path.isdir(deslig) and not os.path.exists(ativa):
        movidas.append(f"ligou {slug}")
        if not SO_LER: shutil.move(deslig, ativa)
print(json.dumps({"skills": len(itens), "movidas": movidas, "so_ler": SO_LER}, ensure_ascii=False))
