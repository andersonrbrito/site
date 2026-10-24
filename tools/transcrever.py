#!/usr/bin/env python3
"""Assiste um vídeo pelo áudio: baixa (link do Instagram, X, YouTube ou arquivo local) e transcreve com faster-whisper.
Uso: ~/Downloads/site/woob/_tools/venv/bin/python ~/Downloads/site/tools/transcrever.py <link-ou-arquivo> [--modelo small]
Saída: a transcrição com tempos no stdout (e .txt ao lado do áudio em /tmp/transcricoes/)."""
import os, subprocess, sys, hashlib
from faster_whisper import WhisperModel

src = sys.argv[1]; modelo = sys.argv[sys.argv.index("--modelo") + 1] if "--modelo" in sys.argv else "small"
os.makedirs("/tmp/transcricoes", exist_ok=True)
base = "/tmp/transcricoes/" + hashlib.md5(src.encode()).hexdigest()[:10]
wav = base + ".wav"
if not os.path.exists(wav):
    entrada = src
    if src.startswith("http"):
        subprocess.run(["yt-dlp", "-q", "--no-playlist", "-x", "--audio-format", "wav", "-o", base + ".%(ext)s", src], check=True)
        entrada = base + ".wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", entrada, "-ac", "1", "-ar", "16000", wav + ".tmp.wav"], check=True)
    os.replace(wav + ".tmp.wav", wav)
segs, info = WhisperModel(modelo, compute_type="int8").transcribe(wav, vad_filter=True)
linhas = [f"[{s.start:6.1f}s] {s.text.strip()}" for s in segs]
open(base + ".txt", "w").write("\n".join(linhas))
print(f"(idioma: {info.language}, {info.duration:.0f}s)")
print("\n".join(linhas))
