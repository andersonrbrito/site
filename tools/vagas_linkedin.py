#!/usr/bin/env python3
"""Garimpo de vagas remotas no LinkedIn pela listagem pública (sem navegador, sem login).

Faz todas as buscas (termos x regiões x páginas), filtra por título, ignora o que já está
em jobs (inclusive candidatadas e descartadas), abre a descrição de cada candidata e marca
remoto, inglês exigido, regime e salário. A rotina só lê a saída e decide nota/why/highlight.

Uso:  python3 tools/vagas_linkedin.py [horas=24] > candidatas.json
"""
import html, json, re, subprocess, sys, time, urllib.parse

HORAS = int(sys.argv[1]) if len(sys.argv) > 1 else 24
TERMOS = ["editor de vídeo", "editor de video", "video editor", "editor de criativos", "editor de anúncios",
          "videomaker", "criador de conteúdo", "criador de conteúdo IA", "editor de vídeo IA", "vídeo com IA",
          "AI video", "content creator video", "direct response video", "UGC editor", "editor reels",
          "edição de vídeo", "pós-produção", "editor de vídeo remoto", "editor de vídeo home office", "editor de vídeo freelancer",
          "editor de vídeo júnior", "editor de vídeo pleno", "editor de vídeo sênior", "short form video editor", "youtube video editor",
          "video editor remote", "ads video editor", "creative video editor", "inteligência artificial vídeo", "produtor de vídeo"]
REGIOES = {"Brasil": "106057199"}  # só Brasil (pedido do Anderson, 04/11)
PAGINAS = [0, 25, 50]
# título precisa ter um destes e nenhum dos proibidos
INCLUI = re.compile(r"edi[çc][ãa]o|editor|video|vídeo|videomaker|filmmaker|criador|creator|conte[úu]do|content|ugc|criativ|reels|audiovisual", re.I)
EXCLUI = re.compile(r"motion design|designer|dise[ñn]ador|texto|web\b|revisor|editorial|contenido|creador|analista|coordenador|operador|assistente|writer|seo|growth|desenvolvedor|developer|engineer|engenheir|vendas|sales|sdr|estagi|intern|redator|copywriter|social media manager|analista de dados|professor|tutor|transcri", re.I)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36"

def get(url):
    r = subprocess.run(["curl", "-s", "-m", "20", "-A", UA, "-H", "Accept-Language: pt-BR,pt;q=0.9", url], capture_output=True, text=True)
    return r.stdout

def limpa(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()

def campo(bloco, classe):
    m = re.search(r'class="[^"]*' + classe + r'[^"]*"[^>]*>([\s\S]*?)</(?:h3|h4|span|a|div)>', bloco)
    return limpa(m.group(1)) if m else ""

def ja_vistas():
    out = subprocess.run([sys.executable, __file__.replace("vagas_linkedin.py", "agente.py"), "select", "jobs",
                          '{"select":"url","limit":5000}'], capture_output=True, text=True).stdout
    try: return {re.sub(r"\D", "", r["url"].split("/view/")[-1]) for r in json.loads(out)["data"] if "/view/" in r["url"]}
    except Exception: return set()

def listar():
    achadas = {}
    for termo in TERMOS:
        for regiao, geo in REGIOES.items():
            for start in PAGINAS:
                q = urllib.parse.urlencode({"keywords": termo, "f_WT": "2", "f_TPR": f"r{HORAS*3600}", "geoId": geo, "sortBy": "DD", "start": start})
                pag = get("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?" + q)
                blocos = pag.split("<li>")[1:]
                for b in blocos:
                    m = re.search(r"jobPosting:(\d+)", b)
                    if not m: continue
                    jid = m.group(1)
                    t = campo(b, "base-search-card__title")
                    if jid in achadas or not INCLUI.search(t) or EXCLUI.search(t): continue
                    achadas[jid] = {"id": jid, "titulo": t, "empresa": campo(b, "base-search-card__subtitle"),
                                    "local": campo(b, "job-search-card__location"), "salario_lista": campo(b, "job-search-card__salary-info"),
                                    "busca": f"{termo} · {regiao}"}
                if len(blocos) < 10: break  # sem 2ª página
                time.sleep(0.8)
    return achadas

INGLES_FORTE = re.compile(r"fluent english|english fluency|strong english|excellent english|advanced english|native english|inglês fluente|inglês avançado|ingl[êe]s (?:intermedi[áa]rio|avan[çc]ado|fluente)|C1|C2|calls? in english", re.I)
REMOTO = re.compile(r"100% remot|remot[oa]|home[ -]?office|trabalho à distância|\bremote\b|work from home|wfh|anywhere", re.I)
PRESENCIAL = re.compile(r"presencial|on-site|onsite|in-office|in office|h[íi]brid|hybrid|\d ?x na semana no escrit|dias? (?:no|de) escrit|resid(?:ir|ente|a) (?:na|em) (?:grande )?[A-Z]", re.I)

def detalhar(v):
    pag = get(f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{v['id']}")
    desc = limpa((re.search(r'show-more-less-html__markup[^>]*>([\s\S]*?)</div>', pag) or [None, ""])[1])
    crit = limpa((re.search(r'description__job-criteria-list[^>]*>([\s\S]*?)</ul>', pag) or [None, ""])[1])
    sal = limpa((re.search(r'compensation__salary[^>]*>([\s\S]*?)</div>', pag) or [None, ""])[1])
    pt = len(re.findall(r"\b(você|vídeo|edição|experiência|conteúdo|não|são)\b", desc, re.I))
    es = len(re.findall(r"\b(usted|experiencia|edición|contenido|nuestro|trabajo|años)\b", desc, re.I))
    en = len(re.findall(r"\b(you|the|and|with|experience|editing)\b", desc, re.I))
    regime = "PJ" if re.search(r"\bPJ\b|pessoa jur[íi]dica", desc) else "CLT" if re.search(r"\bCLT\b", desc) else \
             "freela" if re.search(r"freela|freelance|contractor|por projeto|por v[íi]deo", desc, re.I) else "?"
    v.update({"url": f"https://www.linkedin.com/jobs/view/{v['id']}/", "idioma": max((pt, "pt"), (en, "en"), (es, "es"))[1],
              "ingles_exigido": bool(INGLES_FORTE.search(desc)), "presencial_ou_hibrido": bool(PRESENCIAL.search(desc)),
              "regime": regime, "salario": sal or v.pop("salario_lista", "") or None, "criterios": crit[:160], "descricao": desc[:1400], "descricao_completa": desc, "trecho_local": [m.group(0) for m in re.finditer(r".{0,70}(?:remot|home office|presencial|h[íi]brid|escrit[óo]rio).{0,70}", desc, re.I)][:4]})
    v.pop("salario_lista", None)
    return v

if __name__ == "__main__":
    vistas = ja_vistas()
    novas = [v for v in listar().values() if v["id"] not in vistas]
    saida = []
    for v in novas:
        d = detalhar(v); time.sleep(0.6)
        if d["presencial_ou_hibrido"] or PRESENCIAL.search(d["titulo"]) or PRESENCIAL.search(d["local"]): continue
        # o filtro "remoto" do LinkedIn não é confiável: só passa se a própria vaga disser que é remota
        if not REMOTO.search(d["titulo"] + " " + d["descricao_completa"]): continue
        if d["idioma"] != "pt": continue  # só vaga brasileira, em português
        if not re.search(r"brasil|brazil", d["local"], re.I): continue
        d.pop("descricao_completa", None)
        saida.append(d)
    print(json.dumps({"janela_horas": HORAS, "ja_no_painel": len(vistas), "encontradas": len(novas), "candidatas": saida}, ensure_ascii=False, indent=1))
