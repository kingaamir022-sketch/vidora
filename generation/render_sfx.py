#!/usr/bin/env python3
"""Vidora Phase 6 — AI sound-effect renderer (offline, CPU-only).

Renders the prompts in generation/prompts/sfx.json to MP3 files with
numpy synthesis (generation/synth.py). 100 new SFX; together with the
100 Phase 5 Web Audio SFX the library totals 200+.

Usage: python3 generation/render_sfx.py [--only ai-sfx-001,...]
Output: public/ai-library/sfx/<id>.mp3
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "generation"))
from synth import (SR, add_noise, add_tone, edge_fade, midi_freq, normalize,
                   peaks_buckets, write_mp3)

PROMPTS = ROOT / "generation" / "prompts" / "sfx.json"
OUTDIR = ROOT / "public" / "ai-library" / "sfx"


def _render_family(out: np.ndarray, prompt: dict, rng: np.random.RandomState) -> None:
    fam = prompt["family"]
    dur = prompt["duration"]
    jitter = 0.9 + 0.2 * rng.rand()
    if fam == "whoosh":
        add_noise(out, 0, dur, 0.5, "lowpass", 400, freq_end=4000, rng=rng)
        add_noise(out, 0, dur, 0.25, "highpass", 800, rng=rng)
    elif fam == "pop":
        add_tone(out, 620 * jitter, 0, dur, 0.7, "sine", freq_end=150)
    elif fam == "chime":
        f = 880 * jitter
        for h, g in ((1, 0.5), (2, 0.25), (3, 0.12)):
            add_tone(out, f * h, 0, dur, g, "sine", attack=0.005)
    elif fam == "impact":
        add_tone(out, 120, 0, dur, 0.8, "sine", freq_end=38)
        add_noise(out, 0, 0.2, 0.4, "lowpass", 900, rng=rng)
    elif fam == "riser":
        add_noise(out, 0, dur, 0.45, "highpass", 300, freq_end=5000, rng=rng)
        add_tone(out, 200, 0, dur, 0.2, "sine", freq_end=1200)
    elif fam == "sweep":
        add_tone(out, 2000 * jitter, 0, dur, 0.4, "sine", freq_end=180)
    elif fam == "click":
        add_noise(out, 0, dur, 0.6, "highpass", 2500, rng=rng)
    elif fam == "bubble":
        add_tone(out, 300 * jitter, 0, dur, 0.55, "sine", freq_end=950)
    elif fam == "zap":
        add_tone(out, 1200 * jitter, 0, dur, 0.4, "saw", freq_end=90)
    elif fam == "sparkle":
        base = 72 + int(rng.randint(0, 5))
        for i in range(6):
            m = base + [0, 3, 5, 7, 10, 12][i]
            add_tone(out, midi_freq(m), i * dur / 6, dur / 3, 0.3, "sine")
    elif fam == "snap":
        add_noise(out, 0, 0.06, 0.7, "highpass", 1500, rng=rng)
        add_tone(out, 2400, 0, 0.05, 0.25, "sine")
    elif fam == "shimmer":
        f = 1568 * jitter
        t = np.arange(int(dur * SR)) / SR
        sig = np.sin(2 * np.pi * f * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * t))
        sig += 0.4 * np.sin(2 * np.pi * f * 1.5 * t)
        env = np.exp(-3 * t / dur)
        out[:len(sig)] += 0.4 * sig * env
    elif fam == "thump":
        add_tone(out, 95 * jitter, 0, dur, 0.8, "sine", freq_end=48)
    elif fam == "swoosh":
        add_noise(out, 0, dur, 0.5, "lowpass", 900, freq_end=4500, rng=rng)
    elif fam == "glitch":
        steps = 6
        for i in range(steps):
            f = rng.choice([220, 330, 440, 660, 880, 110])
            add_tone(out, f, i * dur / steps, dur / steps, 0.35, "saw")
    elif fam == "ding":
        f = 1046 * jitter
        add_tone(out, f, 0, dur, 0.55, "sine")
        add_tone(out, f * 2.76, 0, dur * 0.6, 0.15, "sine")
    elif fam == "slide":
        add_tone(out, 420 * jitter, 0, dur, 0.45, "sine", freq_end=920)
    elif fam == "rumble":
        add_noise(out, 0, dur, 0.6, "lowpass", 160, rng=rng)
        add_tone(out, 55, 0, dur, 0.3, "sine")
    elif fam == "twinkle":
        base = 76 + int(rng.randint(0, 4))
        for i, deg in enumerate([0, 2, 4, 7, 9]):
            add_tone(out, midi_freq(base + deg), i * dur / 5, dur / 2.5, 0.3, "triangle")
    elif fam == "boom":
        add_tone(out, 62, 0, dur, 0.85, "sine", freq_end=28)
        add_noise(out, 0, dur * 0.5, 0.35, "lowpass", 500, rng=rng)
    else:
        raise ValueError(f"unknown sfx family {fam}")


def render_sfx(prompt: dict) -> dict:
    rng = np.random.RandomState(prompt["seed"])
    dur = prompt["duration"]
    out = np.zeros(int(round(dur * SR)), dtype=np.float64)
    _render_family(out, prompt, rng)
    # MP3 encoding overshoots sharp transients: a 0.89 float peak decoded
    # back at 1.00-1.06 (BUG-P6-007). 0.80 leaves headroom for the overshoot.
    out = normalize(edge_fade(out, ms=3.0), peak=0.80)
    peaks = peaks_buckets(out, 16)
    rms = round(float(np.sqrt(np.mean(out ** 2))), 4)
    path = OUTDIR / f"{prompt['id']}.mp3"
    OUTDIR.mkdir(parents=True, exist_ok=True)
    write_mp3(out, str(path))
    return {
        "id": prompt["id"], "name": prompt["name"], "kind": "sfx",
        "family": prompt["family"], "duration": dur,
        "file": f"/ai-library/sfx/{prompt['id']}.mp3",
        "size": path.stat().st_size, "peaks": peaks, "rms": rms,
        "tags": prompt["tags"], "seed": prompt["seed"],
    }



def _merge_state(fname: str, new_entries: list[dict]) -> None:
    """Merge new entries into the per-kind state file by id (never loses
    entries rendered by an earlier --only run)."""
    path = ROOT / "generation" / fname
    old = json.loads(path.read_text()) if path.exists() else []
    by_id = {e["id"]: e for e in old}
    for e in new_entries:
        by_id[e["id"]] = e
    path.write_text(json.dumps(sorted(by_id.values(), key=lambda e: e["id"]), indent=2))

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    prompts = json.loads(PROMPTS.read_text())
    if args.only:
        wanted = set(args.only.split(","))
        prompts = [p for p in prompts if p["id"] in wanted]
    entries = []
    for p in prompts:
        e = render_sfx(p)
        entries.append(e)
    _merge_state("state-sfx.json", entries)
    print(f"rendered {len(entries)} sfx")


if __name__ == "__main__":
    main()
