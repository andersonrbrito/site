#!/usr/bin/env python3
"""Acesso das rotinas do Claude ao banco do painel, sem navegador.
A chave fica em ~/.config/anderson-os/agent.key (fora do Git, só este Mac).

Exemplos:
  agente.py select post_requests '{"eq":{"status":"aberto"},"is_null":["archived_at"]}'
  agente.py insert posts '[{"network":"x","title":"...","body":"...","notes":"..."}]'
  agente.py upsert social_stats '[{"day":"2026-10-21","platform":"x","followers":600,"data":{}}]'
  agente.py update post_requests '{"id":"...","version":3,"rows":{"status":"feito","result_note":"3 rascunhos"}}'
  agente.py meta ig_insights      (números do Instagram pela API oficial, via função "meta")
  agente.py enviar kairos /Volumes/.../versiculo_01.mp4 '{"titulo":"Versículo 1","legenda":"...","tipo":"reel","ferramentas":"Python + Kling 2.5 Unlimited","creditos":0}' [--capa capa.jpg] [--extra lamina2.png ...]
      JSON também aceita "sugestao_em" (ex.: "2026-11-07T18:30:00-03:00") e "sugestao_nota" (por que esse horário).
  agente.py update aprovacoes '{"id":"...","version":N,"rows":{"sugestao_em":"2026-11-07T18:30:00-03:00","sugestao_nota":"pico após as 18h"}}'
      (só muda a sugestão de uma peça já enviada, sem mexer no status)
      (envia para AprovaçõeS_ no painel: sobe o arquivo no Storage e cria/atualiza a linha; reenviar o mesmo arquivo volta para "pendente")
Saída: JSON no stdout."""
import json, os, sys, urllib.request

BASE = "https://avyzkygunshncwwbmzll.supabase.co/functions/v1/"
KEY = open(os.path.expanduser("~/.config/anderson-os/agent.key")).read().strip()

def call(fn, body):
    # curl usa os certificados do macOS (o Python do python.org não vem com eles configurados)
    import subprocess
    url = BASE + ("meta?action=agente" if fn == "agente" else fn)
    r = subprocess.run(["curl", "-s", "-X", "POST", url, "-H", "Content-Type: application/json", "-H", f"x-agent-key: {KEY}",
                        "--data-binary", "@-", "-m", "300"], input=json.dumps(body), capture_output=True, text=True)
    try: return json.loads(r.stdout)
    except ValueError: return {"error": r.stdout[:300] or r.stderr[:300]}

def subir(local, perfil):
    """Sobe um arquivo para aprovacoes/<perfil>/<nome> no Storage privado e devolve o caminho."""
    import mimetypes, re, subprocess
    nome = re.sub(r"[^\w.-]+", "_", os.path.basename(local))[:160]
    path = f"aprovacoes/{perfil}/{nome}"
    r = call("agente", {"op": "upload_url", "path": path})
    if "signedUrl" not in r: raise SystemExit(json.dumps({"error": r.get("error", "sem URL de upload"), "arquivo": local}))
    mime = mimetypes.guess_type(local)[0] or "application/octet-stream"
    up = subprocess.run(["curl", "-s", "-X", "PUT", r["signedUrl"], "-H", f"Content-Type: {mime}", "-H", "x-upsert: true",
                         "--data-binary", f"@{local}", "-m", "900"], capture_output=True, text=True)
    if '"error"' in up.stdout or up.returncode: raise SystemExit(json.dumps({"error": up.stdout[:300] or up.stderr[:300], "arquivo": local}))
    return path

if __name__ == "__main__":
    if sys.argv[1] == "enviar":
        perfil, arquivo, meta = sys.argv[2], sys.argv[3], json.loads(sys.argv[4])
        rest = sys.argv[5:]; capa = None; extras = []
        i = 0
        while i < len(rest):
            if rest[i] == "--capa": capa = rest[i + 1]; i += 2
            elif rest[i] == "--extra": extras.append(rest[i + 1]); i += 2
            else: i += 1
        row = {"arquivo": subir(arquivo, perfil), "perfil": perfil, "tipo": meta.get("tipo", "reel"), "titulo": meta["titulo"],
               "legenda": meta.get("legenda"), "local_path": meta.get("local_path", os.path.abspath(arquivo)),
               "ferramentas": meta.get("ferramentas"), "creditos": int(meta.get("creditos", 0)),
               "capa": subir(capa, perfil) if capa else None, "extras": [subir(x, perfil) for x in extras],
               "sugestao_em": meta.get("sugestao_em"), "sugestao_nota": meta.get("sugestao_nota")}
        print(json.dumps(call("agente", {"op": "upsert", "table": "aprovacoes", "rows": [row]}), ensure_ascii=True))
        sys.exit(0)
    op, arg = sys.argv[1], sys.argv[2]
    extra = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    if op == "meta": out = call("meta?action=" + arg, {})
    elif op in ("insert", "upsert"): out = call("agente", {"op": op, "table": arg, "rows": extra})
    elif op == "update": out = call("agente", {"op": "update", "table": arg, **extra})
    else: out = call("agente", {"op": "select", "table": arg, **extra})
    print(json.dumps(out, ensure_ascii=True, indent=1))
