#!/usr/bin/env python3
"""Ajudante local do "YouTube download" do painel (Anderson OS).

Roda só no Mac, em http://127.0.0.1:8765, e só aceita pedidos vindos de andersonbrito.com.
O painel (no navegador do próprio Mac) pede: informações do vídeo, download em MP4 numa
resolução escolhida ou só o áudio em MP3. Os arquivos vão para ~/Downloads/YouTube.
Usa yt-dlp + ffmpeg. Use apenas para vídeos seus ou que você tem direito de baixar.
"""
import json, os, subprocess, threading, uuid, shutil, re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 8765
OUT = os.path.expanduser("~/Downloads/YouTube")
ALLOWED = {"https://andersonbrito.com", "http://localhost:8000", "http://127.0.0.1:8000"}
YTDLP = shutil.which("yt-dlp") or "yt-dlp"
JOBS = {}
URL_OK = re.compile(r"^https://(www\.|m\.|music\.)?(youtube\.com|youtu\.be)/", re.I)


def ytdlp(*args):
    return subprocess.run([YTDLP, *args], capture_output=True, text=True, timeout=120)


def info(url):
    r = ytdlp("-J", "--no-playlist", url)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "não consegui ler o vídeo")
    j = json.loads(r.stdout)
    heights = sorted({f.get("height") for f in j.get("formats", []) if f.get("vcodec") not in (None, "none") and f.get("height")}, reverse=True)
    return {"title": j.get("title"), "channel": j.get("channel") or j.get("uploader"), "duration": j.get("duration"),
            "thumbnail": j.get("thumbnail"), "heights": [h for h in heights if h >= 144][:8], "id": j.get("id")}


def run_job(job_id, url, kind, height):
    job = JOBS[job_id]
    os.makedirs(OUT, exist_ok=True)
    tpl = os.path.join(OUT, "%(title).120s [%(id)s]" + (f" {height}p" if kind == "video" and height else "") + ".%(ext)s")
    if kind == "audio":
        args = ["-x", "--audio-format", "mp3", "--audio-quality", "0"]
    else:
        fmt = f"bv*[height<={height}]+ba/b[height<={height}]" if height else "bv*+ba/b"
        args = ["-f", fmt, "--merge-output-format", "mp4", "-S", (f"res:{height}," if height else "res,") + "vcodec:h264,acodec:m4a"]  # resolução primeiro; senão o h264 360p ganha
    cmd = [YTDLP, "--no-playlist", "--newline", "-o", tpl, "--print", "after_move:filepath", *args, url]
    try:
        p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        path = None
        for line in p.stdout:
            line = line.strip()
            m = re.search(r"\[download\]\s+([\d.]+)%", line)
            if m:
                job["progress"] = float(m.group(1))
            elif line.startswith(OUT):
                path = line
            job["log"] = line[-200:]
        p.wait()
        if p.returncode != 0 and "403" in (job.get("log") or "") and not job.get("retried"):
            job["retried"] = True  # 403: atualiza o yt-dlp na hora e tenta de novo uma vez
            import sys
            subprocess.run([sys.executable, "-m", "pip", "install", "-U", "-q", "--pre", "yt-dlp[default]"], capture_output=True)
            return run_job(job_id, url, kind, height)
        if p.returncode != 0 or not path or not os.path.exists(path):
            raise RuntimeError(job.get("log") or "falhou")
        job.update(status="feito", progress=100, path=path, size=os.path.getsize(path))
    except Exception as e:  # noqa: BLE001
        job.update(status="erro", error=str(e)[:300])


class H(BaseHTTPRequestHandler):
    def cors(self):
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Access-Control-Allow-Headers", "content-type")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Private-Network", "true")

    def reply(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def allowed(self):
        if self.headers.get("Origin", "") not in ALLOWED:
            self.reply(403, {"error": "origem não permitida"})
            return False
        return True

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        if not self.allowed():
            return
        if self.path == "/ping":
            return self.reply(200, {"ok": True, "folder": OUT})
        if self.path.startswith("/job/"):
            job = JOBS.get(self.path[5:])
            return self.reply(200 if job else 404, job or {"error": "não encontrado"})
        self.reply(404, {"error": "?"})

    def do_POST(self):
        if not self.allowed():
            return
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0)) or 0) or b"{}")
            url = (body.get("url") or "").strip()
            if not URL_OK.match(url):
                return self.reply(400, {"error": "cole um link do YouTube"})
            if self.path == "/info":
                return self.reply(200, info(url))
            if self.path == "/download":
                kind = "audio" if body.get("kind") == "audio" else "video"
                height = int(body.get("height") or 0) or None
                job_id = uuid.uuid4().hex
                JOBS[job_id] = {"id": job_id, "status": "baixando", "progress": 0}
                threading.Thread(target=run_job, args=(job_id, url, kind, height), daemon=True).start()
                return self.reply(200, {"job": job_id})
            if self.path == "/reveal":
                path = body.get("path") or ""
                if path.startswith(OUT) and os.path.exists(path):
                    subprocess.run(["open", "-R", path])
                    return self.reply(200, {"ok": True})
                return self.reply(404, {"error": "arquivo não está mais na pasta"})
            self.reply(404, {"error": "?"})
        except Exception as e:  # noqa: BLE001
            self.reply(500, {"error": str(e)[:300]})

    def log_message(self, *a):
        pass


def auto_update():
    """O YouTube muda a proteção com frequência (erro 403): atualiza o yt-dlp ao ligar e a cada 24 h."""
    import sys, time
    while True:
        subprocess.run([sys.executable, "-m", "pip", "install", "-U", "-q", "--pre", "yt-dlp[default]"], capture_output=True)
        time.sleep(86400)


if __name__ == "__main__":
    threading.Thread(target=auto_update, daemon=True).start()
    print(f"YouTube download do painel rodando em http://127.0.0.1:{PORT} · arquivos em {OUT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
