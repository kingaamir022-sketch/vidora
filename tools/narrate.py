#!/usr/bin/env python3
"""Vidora offline narration render (Phase 7, K-TTS).

Renders text to a 22050 Hz WAV with Piper (MIT), CPU-only, fully
offline after the voice download. The WAV imports into Vidora as a
normal audio clip, so narration becomes a real clip on the timeline.

Usage:
    python3 tools/narrate.py "Hello, welcome to Vidora." --out narration.wav
    python3 tools/narrate.py --file script.txt --out narration.wav
    echo "Hello" | python3 tools/narrate.py --out narration.wav

Voice: en_US-lessac-medium (CC-BY 4.0, rhasspy/piper-voices),
downloaded once into tools/models/ (see tools/README.md). Long text is
split into sentences and concatenated. The voice files are NOT part of
the GitHub snapshot or the Drive zip; download them on a fresh machine.
"""
import argparse
import os
import re
import subprocess
import sys
import tempfile
import wave

HERE = os.path.dirname(__file__)
VOICE = os.path.join(HERE, "models", "en_US-lessac-medium.onnx")
VOICE_JSON = VOICE + ".json"
MAX_CHUNK = 800


def split_sentences(text: str):
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        while len(p) > MAX_CHUNK:
            cut = p.rfind(" ", 0, MAX_CHUNK)
            cut = cut if cut > 100 else MAX_CHUNK
            chunks.append(p[:cut].strip())
            p = p[cut:].strip()
        if p:
            chunks.append(p)
    return chunks


def render_chunk(piper_bin: str, voice: str, text: str, out_wav: str) -> None:
    cmd = [piper_bin, "--model", voice, "--output_file", out_wav]
    r = subprocess.run(cmd, input=text.encode("utf-8"), capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f"piper failed: {r.stderr.decode('utf-8', 'replace').strip()}")


def concat_wavs(paths, out_path: str) -> None:
    frames = b""
    params = None
    for p in paths:
        with wave.open(p, "rb") as wf:
            if params is None:
                params = wf.getparams()
            frames += wf.readframes(wf.getnframes())
    with wave.open(out_path, "wb") as wf:
        wf.setparams(params)
        wf.writeframes(frames)


def main() -> int:
    ap = argparse.ArgumentParser(description="Offline TTS render with Piper (Vidora Phase 7)")
    ap.add_argument("text", nargs="?", help="text to speak (or omit with --file / stdin)")
    ap.add_argument("--file", help="read text from this file")
    ap.add_argument("--voice", default=VOICE, help="Piper .onnx voice model")
    ap.add_argument("--out", required=True, help="output .wav path")
    args = ap.parse_args()

    if args.file:
        with open(args.file, encoding="utf-8") as f:
            text = f.read()
    elif args.text:
        text = args.text
    else:
        text = sys.stdin.read()
    text = text.strip()
    if not text:
        print("No text to speak.", file=sys.stderr)
        return 2
    if not os.path.isfile(args.voice):
        print(f"Voice model not found: {args.voice}", file=sys.stderr)
        print("Run: bash tools/download-models.sh  (or see tools/README.md)", file=sys.stderr)
        return 2

    piper_bin = os.path.join(HERE, ".venv", "bin", "piper")
    if not os.path.isfile(piper_bin):
        piper_bin = "piper"  # fall back to a system piper

    chunks = split_sentences(text)
    with tempfile.TemporaryDirectory() as tmp:
        parts = []
        for i, c in enumerate(chunks):
            p = os.path.join(tmp, f"chunk{i:03d}.wav")
            render_chunk(piper_bin, args.voice, c, p)
            parts.append(p)
        concat_wavs(parts, args.out)
    with wave.open(args.out, "rb") as wf:
        secs = wf.getnframes() / wf.getframerate()
    print(f"rendered {len(chunks)} chunk(s), {secs:.1f}s -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
