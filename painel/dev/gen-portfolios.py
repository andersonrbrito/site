"""Regenera painel/js/portfolios.js: rode na raiz do site com `python3 painel/dev/gen-portfolios.py`."""
import os, re, subprocess, json, datetime
skip = {"index.html", "editor.html"}
pages = [f for f in os.listdir(".") if f.endswith(".html") and f not in skip]
pages += [d + "/index.html" for d in os.listdir(".") if os.path.isfile(os.path.join(d, "index.html")) and d not in ("painel",)]
seen, stack = set(), ["index.html"]
while stack:
    f = stack.pop()
    if f in seen or not os.path.exists(f): continue
    seen.add(f)
    for h in re.findall(r'href="([^"#?]+)"', open(f, errors="ignore").read()):
        if h.startswith(("http", "mailto", "tel", "assets")): continue
        h = h.lstrip("/")
        if os.path.isdir(h): h = h.rstrip("/") + "/index.html"
        stack.append(h)
out = []
for p in pages:
    tracked = subprocess.run(["git", "ls-files", "--error-unmatch", p], capture_output=True).returncode == 0
    date = subprocess.run(["git", "log", "-1", "--format=%cs", "--", p], capture_output=True, text=True).stdout.strip() if tracked else ""
    date = date or datetime.date.fromtimestamp(os.path.getmtime(p)).isoformat()
    t = re.search(r"<title>(.*?)</title>", open(p, errors="ignore").read(), re.S)
    url = p.replace("/index.html", "/")
    out.append({"path": url, "title": (t.group(1).strip() if t else url)[:90], "online": tracked, "linked": p in seen, "updated": date})
out.sort(key=lambda x: x["updated"], reverse=True)
open("painel/js/portfolios.js", "w").write("// Gerado por painel/dev/gen-portfolios.py\nexport const PORTFOLIOS = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
print(len(out), "páginas")
