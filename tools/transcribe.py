#!/usr/bin/env python3
"""Vidora offline speech-to-text (Phase 7, K-STT).

Transcribes an audio file to timed words using Vosk (Apache-2.0),
CPU-only, fully offline after the model download. Outputs an .srt file
(importable in Vidora's Captions tab) and a .words.json file with
per-word start/end times.

Usage:
    python3 tools/transcribe.py clip.mp3
    python3 tools/transcribe.py clip.wav --model tools/models/vosk-en-small --out out.srt

Model: vosk-model-small-en-us-0.15 (Apache-2.0), downloaded once into
tools/models/vosk-en-small (see tools/README.md). The model is NOT part
of the GitHub snapshot or the Drive zip; download it on a fresh machine.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import wave

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "vosk-en-small")


def to_wav_16k(src: str, tmp: str) -> str:
    """Convert any ffmpeg-readable audio to 16 kHz mono 16-bit WAV."""
    out = os.path.join(tmp, "audio.wav")
    cmd = [
        "ffmpeg", "-y", "-v", "error", "-i", src,
        "-ac", "1", "-ar", "16000", "-sample_fmt", "s16", out,
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg failed on {src}: {r.stderr.strip()}")
    return out


def srt_time(t: float) -> str:
    ms = max(0, int(round(t * 1000)))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def words_to_srt(words, words_per_cue=8):
    cues = []
    for i in range(0, len(words), words_per_cue):
        chunk = words[i:i + words_per_cue]
        text = " ".join(w["word"] for w in chunk)
        cues.append((chunk[0]["start"], chunk[-1]["end"], text))
    out = []
    for n, (start, end, text) in enumerate(cues, 1):
        out.append(f"{n}\n{srt_time(start)} --> {srt_time(end)}\n{text}\n")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description="Offline STT with Vosk (Vidora Phase 7)")
    ap.add_argument("audio", help="audio/video file to transcribe")
    ap.add_argument("--model", default=MODEL_DIR, help="Vosk model directory")
    ap.add_argument("--out", help="output .srt path (default: <audio>.srt)")
    args = ap.parse_args()

    if not os.path.isdir(args.model):
        print(f"Model not found: {args.model}", file=sys.stderr)
        print("Run: bash tools/download-models.sh  (or see tools/README.md)", file=sys.stderr)
        return 2
    if not os.path.isfile(args.audio):
        print(f"No such file: {args.audio}", file=sys.stderr)
        return 2

    from vosk import KaldiRecognizer, Model

    out_srt = args.out or (os.path.splitext(args.audio)[0] + ".srt")
    out_json = os.path.splitext(out_srt)[0] + ".words.json"

    with tempfile.TemporaryDirectory() as tmp:
        wav = to_wav_16k(args.audio, tmp)
        model = Model(args.model)
        rec = KaldiRecognizer(model, 16000)
        rec.SetWords(True)
        words = []
        with wave.open(wav, "rb") as wf:
            while True:
                data = wf.readframes(4000)
                if not data:
                    break
                if rec.AcceptWaveform(data):
                    words.extend(json.loads(rec.Result()).get("result", []))
        words.extend(json.loads(rec.FinalResult()).get("result", []))

    words = [{"word": w["word"], "start": round(w["start"], 3), "end": round(w["end"], 3)}
             for w in words]
    with open(out_srt, "w", encoding="utf-8") as f:
        f.write(words_to_srt(words))
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump({"words": words}, f, indent=1)
    print(f"transcribed {len(words)} words -> {out_srt} + {out_json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
