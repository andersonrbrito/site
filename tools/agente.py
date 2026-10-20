#!/usr/bin/env python3
"""Acesso das rotinas do Claude ao banco do painel, sem navegador.
A chave fica em ~/.config/anderson-os/agent.key (fora do Git, só este Mac).

Exemplos:
  agente.py select post_requests '{"eq":{"status":"aberto"},"is_null":["archived_at"]}'
  agente.py insert posts '[{"network":"x","title":"...","body":"...","notes":"..."}]'
  agente.py upsert social_stats '[{"day":"2026-10-21","platform":"x","followers":600,"data":{}}]'
  agente.py update post_requests '{"id":"...","version":3,"rows":{"status":"feito","result_note":"3 rascunhos"}}'
  agente.py meta ig_insights      (números do Instagram pela API oficial, via função "meta")
Saída: JSON no stdout."""
import json, os, sys, urllib.request

BASE = "https://avyzkygunshncwwbmzll.supabase.co/functions/v1/"
KEY = open(os.path.expanduser("~/.config/anderson-os/agent.key")).read().strip()

def call(fn, body):
    # curl usa os certificados do macOS (o Python do python.org não vem com eles configurados)
    import subprocess
    url = BASE + ("meta?action=agente" if fn == "agente" else fn)
    r = subprocess.run(["curl", "-s", "-X", "POST", url, "-H", "Content-Type: application/json", "-H", f"x-agent-key: {KEY}",
                        "--data-binary", "@-", "-m", "120"], input=json.dumps(body), capture_output=True, text=True)
    try: return json.loads(r.stdout)
    except ValueError: return {"error": r.stdout[:300] or r.stderr[:300]}

if __name__ == "__main__":
    op, arg = sys.argv[1], sys.argv[2]
    extra = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    if op == "meta": out = call("meta?action=" + arg, {})
    elif op in ("insert", "upsert"): out = call("agente", {"op": op, "table": arg, "rows": extra})
    elif op == "update": out = call("agente", {"op": "update", "table": arg, **extra})
    else: out = call("agente", {"op": "select", "table": arg, **extra})
    print(json.dumps(out, ensure_ascii=False, indent=1))
