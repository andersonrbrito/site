#!/usr/bin/env python3
"""MineR_ em modo reel: baixa o vídeo de cada link garimpado (yt-dlp) e sobe pro Storage.
Arquivos: aprovacoes/miner/<id>.mp4 e aprovacoes/miner/<id>.txt (copy/legenda do post original).
O painel acha o vídeo pelo id do link, sem coluna nova no banco.

Uso:  python3 tools/miner_baixar.py [limite]      (padrão: 30 links por vez, só os que ainda não têm vídeo)
"""
import json, os, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from agente import call, subir

LIM = int(sys.argv[1]) if len(sys.argv) > 1 else 30
FEITOS = os.path.expanduser("~/.config/anderson-os/miner_baixados.json")
feitos = set(json.load(open(FEITOS))) if os.path.exists(FEITOS) else set()

r = call("agente", {"op": "select", "table": "miner_links", "select": "id,url,platform,note", "is_null": ["archived_at"], "order": "saved_at", "limit": 1000})
links = [l for l in r.get("data", []) if l["id"] not in feitos and l["platform"] in ("instagram", "tiktok", "x", "youtube")][:LIM]
print(f"{len(links)} links para baixar")
ok = falha = 0
for l in links:
    with tempfile.TemporaryDirectory() as d:
        mp4 = os.path.join(d, f"{l['id']}.mp4")
        cmd = ["yt-dlp", "-q", "--no-warnings", "--no-playlist", "-f", "b[ext=mp4][height<=1280]/bv*[height<=1280]+ba/b",
               "--merge-output-format", "mp4", "--write-info-json", "-o", mp4, l["url"]]
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if p.returncode or not os.path.exists(mp4):
            falha += 1; print("  falhou:", l["url"], (p.stderr or "").strip().splitlines()[-1:] ); continue
        info = {}
        for f in os.listdir(d):
            if f.endswith(".info.json"): info = json.load(open(os.path.join(d, f)))
        txt = os.path.join(d, f"{l['id']}.txt")
        open(txt, "w").write((info.get("description") or info.get("title") or "").strip())
        subir(mp4, "miner"); subir(txt, "miner")
        feitos.add(l["id"]); ok += 1; print("  ok:", l["url"])
        json.dump(sorted(feitos), open(FEITOS, "w"))
print(json.dumps({"baixados": ok, "falhas": falha}))
