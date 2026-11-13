"""Converte prospects de agências (CSV do GPT ou JSON das pesquisas) em linhas de prospects e grava via agente.py."""
import csv, json, re, subprocess, sys

def digits(s):
    m = re.search(r"\+?55\s?\(?(\d{2})\)?\s?(9?\d{4})[-\s]?(\d{4})", s or "")
    return (m.group(1) + m.group(2) + m.group(3)) if m else None

def email(s):
    m = re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", s or ""); return m.group(0) if m else None

def handle(u):
    m = re.search(r"instagram\.com/([\w.]+)", u or ""); return m.group(1) if m else (u.lstrip("@") if u and re.fullmatch(r"@?[\w.]+", u) else None)

def nv(s): return None if not s or "não verificado" in s else s

def row(pesquisa, a):
    cidade, uf = (a.get("cidade") or ""), None
    m = re.search(r"/([A-Z]{2})\b", cidade)
    if m: uf = m.group(1); cidade = cidade[:m.start()].split(";")[0].strip()
    pri = (a.get("prioridade") or "C")[0]
    dec = " ".join(x for x in [nv(a.get("decisor_nome_publico")), "(" + a["decisor_cargo"] + ")" if nv(a.get("decisor_cargo")) else None] if x)
    partes = [f"Prioridade {pri}", nv(a.get("especialidade")) and "Faz: " + a["especialidade"],
              dec and "Contato: " + dec, nv(a.get("evidencia_clientes")) and "Clientes: " + a["evidencia_clientes"],
              nv(a.get("gancho")) and "Vi: " + a["gancho"], nv(a.get("gancho_personalizado")) and "Ideia: " + a["gancho_personalizado"],
              nv(a.get("linkedin")) and "LinkedIn: " + a["linkedin"], nv(a.get("limites_verificacao")) and "Atenção: " + a["limites_verificacao"]]
    notas = " · ".join(p for p in partes if p)[:1000]
    site = nv(a.get("site"))
    return {"pesquisa": pesquisa, "cidade": cidade[:120] or None, "uf": uf, "segmento": "Agência",
            "nome": a["agencia"][:160], "instagram": handle(nv(a.get("instagram"))),
            "seguidores": None, "whatsapp": digits(a.get("contato_corporativo") or a.get("whatsapp") or ""),
            "email": email(a.get("contato_corporativo") or a.get("email") or ""), "site": site and site[:300],
            "destaque": pri == "A", "notas": notas or None}

if __name__ == "__main__":
    pesquisa, path = sys.argv[1], sys.argv[2]
    src = list(csv.DictReader(open(path, encoding="utf-8-sig"))) if path.endswith(".csv") else json.load(open(path))
    rows = [row(pesquisa, a) for a in src if a.get("agencia")]
    if "--dry" in sys.argv: print(json.dumps(rows[:2], ensure_ascii=False, indent=1)); print(len(rows)); sys.exit()
    for i in range(0, len(rows), 25):
        r = subprocess.run(["python3", "tools/agente.py", "insert", "prospects", json.dumps(rows[i:i+25], ensure_ascii=False)], capture_output=True, text=True)
        print(r.stdout[-300:], r.stderr[-300:])
