"""Gera words.txt (palavra inicio fim) a partir da narração, com mlx_whisper.
Uso: python3 palavras.py voz.wav words.txt"""
import sys, mlx_whisper
r = mlx_whisper.transcribe(sys.argv[1], language='pt', word_timestamps=True, path_or_hf_repo='mlx-community/whisper-large-v3-turbo')
with open(sys.argv[2], 'w', encoding='utf-8') as f:
    for s in r['segments']:
        for w in s.get('words', []):
            f.write(f"{w['word'].strip()} {w['start']:.2f} {w['end']:.2f}\n")
print('ok', sys.argv[2])
