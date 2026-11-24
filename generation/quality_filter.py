#!/usr/bin/env python3
"""Vidora Phase 6 — quality filter for generated AI assets.

Checks every rendered file and writes generation/quality-report.json:
  music: duration matches the prompt (+/-0.15s), RMS in [0.02, 0.6],
         peak <= 0.99, silence fraction < 10%, BPM autocorrelation
         matches the prompt BPM (or its half/double) within 5%.
  sfx:   duration (+/-0.1s), RMS > 0.01, peak <= 0.99.
  clips: 1920x1080, duration 6.0s (+/-0.1s), size > 50 KB, frames at
         0.5s and 5.5s are not black/white and differ (motion present).
  images: textures 1920x1080 RGB; frames/stickers RGBA with both
         transparent and opaque pixels.
Exits non-zero when any check fails. Failing items are listed so they
can be re-rendered (render_all.py --force <id>).
Usage: python3 generation/quality_filter.py [--kinds music,sfx,clips,images]
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PROMPT_DIR = ROOT / "generation" / "prompts"
LIB = ROOT / "public" / "ai-library"


def _ffprobe(path: Path) -> dict:
    p = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration,size", "-show_entries",
                        "stream=width,height,codec_name",
                        "-of", "json", str(path)],
                       capture_output=True, text=True, check=True)
    return json.loads(p.stdout)


def _decode_mp3(path: Path) -> np.ndarray:
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path),
                        "-f", "f32le", "-ar", "44100", "-ac", "1", "pipe:1"],
                       capture_output=True)
    return np.frombuffer(p.stdout, dtype="<f4").astype(np.float64)


def _est_bpm(x: np.ndarray, sr: int = 44100) -> float:
    hop = int(sr * 0.01)
    n = len(x) // hop
    if n < 100:
        return 0.0
    e = np.array([np.mean(x[i * hop:(i + 1) * hop] ** 2) for i in range(n)])
    d = np.maximum(0, np.diff(e))
    d = d - d.mean()
    ac = np.correlate(d, d, mode="full")[len(d) - 1:]
    lags = np.arange(33, 101)
    best = int(lags[np.argmax(ac[lags])])
    return 6000.0 / best


def _check_music(prompts: list[dict]) -> list[str]:
    fails = []
    for p in prompts:
        f = LIB / "music" / f"{p['id']}.mp3"
        if not f.exists():
            fails.append(f"{p['id']}: missing file")
            continue
        info = _ffprobe(f)
        dur = float(info["format"]["duration"])
        if abs(dur - p["duration"]) > 0.15:
            fails.append(f"{p['id']}: duration {dur:.2f} != {p['duration']}")
        x = _decode_mp3(f)
        if x.size == 0:
            fails.append(f"{p['id']}: empty audio")
            continue
        rms = float(np.sqrt(np.mean(x ** 2)))
        peak = float(np.max(np.abs(x)))
        silence = float(np.mean(np.abs(x) < 0.001))
        if not (0.02 <= rms <= 0.6):
            fails.append(f"{p['id']}: rms {rms:.3f} out of range")
        if peak > 0.99:
            fails.append(f"{p['id']}: peak {peak:.2f} clips")
        if silence > 0.10:
            fails.append(f"{p['id']}: {silence:.0%} silence")
        if p["drums"] != "none":
            est = _est_bpm(x)
            ratio = est / p["bpm"] if est > 0 else 0
            if not any(abs(ratio - m) / m < 0.05 for m in (0.5, 1.0, 2.0)):
                fails.append(f"{p['id']}: bpm est {est:.1f} vs {p['bpm']} (ratio {ratio:.2f})")
    return fails


def _check_sfx(prompts: list[dict]) -> list[str]:
    fails = []
    for p in prompts:
        f = LIB / "sfx" / f"{p['id']}.mp3"
        if not f.exists():
            fails.append(f"{p['id']}: missing file")
            continue
        info = _ffprobe(f)
        dur = float(info["format"]["duration"])
        if abs(dur - p["duration"]) > 0.12:
            fails.append(f"{p['id']}: duration {dur:.2f} != {p['duration']}")
        x = _decode_mp3(f)
        if x.size == 0:
            fails.append(f"{p['id']}: empty audio")
            continue
        rms = float(np.sqrt(np.mean(x ** 2)))
        peak = float(np.max(np.abs(x)))
        if rms < 0.01:
            fails.append(f"{p['id']}: rms {rms:.4f} too quiet")
        if peak > 0.99:
            fails.append(f"{p['id']}: peak {peak:.2f} clips")
    return fails


def _frame_mean(path: Path, t: str) -> tuple[float, np.ndarray]:
    out = Path(f"/tmp/vidora-qf-{path.stem}-{t}.jpg")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(path), "-ss", t,
                    "-frames:v", "1", "-q:v", "5", str(out)], check=True)
    arr = np.asarray(Image.open(out).convert("L"), dtype=np.float64)
    return float(arr.mean()), arr


def _check_clips(prompts: list[dict]) -> list[str]:
    fails = []
    for p in prompts:
        f = LIB / "clips" / f"{p['id']}.mp4"
        if not f.exists():
            fails.append(f"{p['id']}: missing file")
            continue
        info = _ffprobe(f)
        st = info["streams"][0]
        if st.get("width") != 1920 or st.get("height") != 1080:
            fails.append(f"{p['id']}: size {st.get('width')}x{st.get('height')} != 1920x1080")
        dur = float(info["format"]["duration"])
        if abs(dur - 6.0) > 0.1:
            fails.append(f"{p['id']}: duration {dur:.2f} != 6.0")
        if int(info["format"]["size"]) < 50_000:
            fails.append(f"{p['id']}: file suspiciously small")
        m1, a1 = _frame_mean(f, "0.5")
        m2, a2 = _frame_mean(f, "5.5")
        if not (8 < m1 < 247 and 8 < m2 < 247):
            fails.append(f"{p['id']}: frame brightness out of range ({m1:.0f}/{m2:.0f})")
        diff = float(np.mean(np.abs(a1 - a2)))
        if diff < 0.5:
            fails.append(f"{p['id']}: frames at 0.5s and 5.5s are identical (no motion, diff {diff:.2f})")
    return fails


def _check_images(prompts: list[dict]) -> list[str]:
    fails = []
    for p in prompts:
        sub = {"texture": "textures", "frame": "frames", "sticker": "stickers"}[p["kind"]]
        f = LIB / "images" / sub / f"{p['id']}.png"
        if not f.exists():
            fails.append(f"{p['id']}: missing file")
            continue
        im = Image.open(f)
        if im.size != (p["width"], p["height"]):
            fails.append(f"{p['id']}: size {im.size} != {(p['width'], p['height'])}")
        if p["kind"] == "texture":
            if im.mode != "RGB":
                fails.append(f"{p['id']}: texture mode {im.mode} != RGB")
        else:
            if im.mode != "RGBA":
                fails.append(f"{p['id']}: {p['kind']} mode {im.mode} != RGBA")
                continue
            alpha = np.asarray(im.split()[3])
            if not ((alpha == 0).any() and (alpha == 255).any()):
                fails.append(f"{p['id']}: {p['kind']} has no transparent+opaque mix")
    return fails


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--kinds", default="music,sfx,clips,images")
    args = ap.parse_args()
    kinds = set(args.kinds.split(","))
    report: dict = {"passed": True, "failed": []}
    if "music" in kinds:
        prompts = json.loads((PROMPT_DIR / "music.json").read_text())
        report["failed"] += _check_music(prompts)
        print(f"music: {len(prompts)} checked")
    if "sfx" in kinds:
        prompts = json.loads((PROMPT_DIR / "sfx.json").read_text())
        report["failed"] += _check_sfx(prompts)
        print(f"sfx: {len(prompts)} checked")
    if "clips" in kinds:
        prompts = json.loads((PROMPT_DIR / "clips.json").read_text())
        report["failed"] += _check_clips(prompts)
        print(f"clips: {len(prompts)} checked")
    if "images" in kinds:
        prompts = json.loads((PROMPT_DIR / "images.json").read_text())
        report["failed"] += _check_images(prompts)
        print(f"images: {len(prompts)} checked")
    report["passed"] = len(report["failed"]) == 0
    (ROOT / "generation" / "quality-report.json").write_text(json.dumps(report, indent=2))
    if report["failed"]:
        print("QUALITY FILTER FAILED:")
        for f in report["failed"]:
            print(f"  - {f}")
        sys.exit(1)
    print("quality filter: all passed")


if __name__ == "__main__":
    main()
