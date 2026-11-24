#!/usr/bin/env python3
"""Vidora Phase 6 — AI music track renderer (offline, CPU-only).

Renders the prompts in generation/prompts/music.json to MP3 files with
numpy synthesis (generation/synth.py): chord pads, bass, drums, arpeggios
and a seeded melody walk. No samples, no recordings, no existing melodies.

Usage:
  python3 generation/render_music.py [--only ai-track-001,ai-track-002]
  python3 generation/render_music.py --pilot   # first 5 tracks only
Output: public/ai-library/music/<id>.mp3
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "generation"))
from synth import (SR, add_noise, add_pad, add_tone, edge_fade, midi_freq,
                   normalize, peaks_buckets, write_mp3)

PROMPTS = ROOT / "generation" / "prompts" / "music.json"
OUTDIR = ROOT / "public" / "ai-library" / "music"


def _drums(out, prompt, rng):
    bpm = prompt["bpm"]
    bars = prompt["bars"]
    bar_len = 240.0 / bpm
    step = 15.0 / bpm  # 16th note
    kind = prompt["drums"]
    energy = prompt["energy"]
    for bar in range(bars):
        t0 = bar * bar_len
        if kind == "four":
            for s in (0, 4, 8, 12):
                add_tone(out, 150, t0 + s * step, 0.25, 0.6, "sine", freq_end=45)
            for s in (4, 12):
                add_noise(out, t0 + s * step, 0.15, 0.28 * energy + 0.1, "highpass", 1800, rng=rng)
                add_tone(out, 180, t0 + s * step, 0.1, 0.15, "triangle")
            for s in range(0, 16, 2):
                add_noise(out, t0 + s * step, 0.05, 0.10, "highpass", 7000, rng=rng)
        elif kind == "soft":
            for s in (0, 8):
                add_tone(out, 150, t0 + s * step, 0.25, 0.45, "sine", freq_end=45)
            add_noise(out, t0 + 4 * step, 0.15, 0.2, "highpass", 1800, rng=rng)
            add_tone(out, 180, t0 + 4 * step, 0.1, 0.1, "triangle")
            for s in (2, 6, 10, 14):
                add_noise(out, t0 + s * step, 0.05, 0.07, "highpass", 7000, rng=rng)
        elif kind == "break":
            # Syncopated kicks (0/7/10) keep the break feel, but the
            # downbeat was undetectable (BPM estimator read 4/3 or 2/3
            # of 96) — accented hats on every beat were not enough
            # (kicks dominate the onset envelope), so soft kicks on
            # beats 2/3/4 mark the quarter-note pulse as well (BUG-P6-006).
            for s in (0, 7, 10):
                add_tone(out, 150, t0 + s * step, 0.25, 0.5, "sine", freq_end=45)
            for s in (4, 8, 12):
                add_tone(out, 150, t0 + s * step, 0.25, 0.4, "sine", freq_end=45)
            for s in (4, 12):
                add_noise(out, t0 + s * step, 0.15, 0.25, "highpass", 1800, rng=rng)
                add_tone(out, 180, t0 + s * step, 0.1, 0.12, "triangle")
            for s in range(16):
                gain = 0.12 if s % 4 == 0 else 0.05
                add_noise(out, t0 + s * step, 0.04, gain, "highpass", 7000, rng=rng)


def _chord_tones(root_midi: int, scale: list[int]) -> list[int]:
    """Root + third + fifth from the track scale (minor third when the
    scale's third degree is 3 semitones, else major)."""
    third = 3 if 3 in scale else 4
    return [root_midi, root_midi + third, root_midi + 7]


def render_track(prompt: dict) -> dict:
    bpm = prompt["bpm"]
    bars = prompt["bars"]
    duration = prompt["duration"]
    rng = np.random.RandomState(prompt["seed"])
    out = np.zeros(int(round(duration * SR)), dtype=np.float64)
    bar_len = 240.0 / bpm
    step16 = 15.0 / bpm
    step8 = 30.0 / bpm
    root = prompt["rootMidi"]
    scale = prompt["scale"]
    prog = prompt["progression"]
    energy = prompt["energy"]

    _drums(out, prompt, rng)

    for bar in range(bars):
        t0 = bar * bar_len
        chord_root = root + prog[bar % len(prog)]
        tones = _chord_tones(chord_root, scale)
        # Pad: one chord per bar.
        if prompt["pad"]:
            add_pad(out, [midi_freq(m) for m in tones], t0, bar_len, 0.10 + 0.08 * energy)
        # Bass.
        if prompt["bass"] == "root":
            add_tone(out, midi_freq(chord_root - 12), t0, bar_len * 0.5, 0.30, "sine")
            add_tone(out, midi_freq(chord_root - 12), t0 + bar_len * 0.5, bar_len * 0.5, 0.26, "sine")
        elif prompt["bass"] == "walk":
            walk = [chord_root - 12, chord_root - 5, chord_root - 7, chord_root - 4]
            for i, m in enumerate(walk):
                add_tone(out, midi_freq(m), t0 + i * bar_len / 4, bar_len / 4, 0.28, "sine")
        # Arpeggio: 16th-note cycle of chord tones + octave.
        if prompt["arp"]:
            seq = tones + [tones[0] + 12, tones[2] + 12, tones[1] + 12]
            for i in range(16):
                m = seq[i % len(seq)]
                add_tone(out, midi_freq(m + 12), t0 + i * step16, 0.22, 0.09 + 0.05 * energy, "triangle")

    # Melody: seeded walk on the scale, 8th-note grid, rests by energy.
    if prompt["melody"]:
        degree = 4
        n_steps = int(duration / step8)
        for i in range(n_steps):
            t = i * step8
            r = rng.rand()
            if r < 0.30:
                continue  # rest — leaves breathing room
            move = rng.choice([-2, -1, -1, 0, 1, 1, 2])
            degree = int(np.clip(degree + move, 0, len(scale) * 2 - 1))
            octave = 12 * (degree // len(scale))
            midi = root + 12 + octave + scale[degree % len(scale)]
            gain = 0.10 + 0.06 * energy
            add_tone(out, midi_freq(midi), t, step8 * 0.9, gain, "triangle")

    out = normalize(edge_fade(out, ms=5.0))
    peaks = peaks_buckets(out, 32)
    rms = round(float(np.sqrt(np.mean(out ** 2))), 4)
    peak = round(float(np.max(np.abs(out))), 4)
    path = OUTDIR / f"{prompt['id']}.mp3"
    OUTDIR.mkdir(parents=True, exist_ok=True)
    write_mp3(out, str(path))
    return {
        "id": prompt["id"], "name": prompt["name"], "kind": "music",
        "style": prompt["style"], "mood": prompt["mood"], "bpm": bpm,
        "key": prompt["key"], "duration": duration, "loopable": prompt["loopable"],
        "file": f"/ai-library/music/{prompt['id']}.mp3",
        "size": path.stat().st_size, "peaks": peaks, "rms": rms, "peak": peak,
        "tags": prompt["tags"], "seed": prompt["seed"],
        "pattern": {k: prompt[k] for k in
                    ("rootMidi", "scale", "progression", "bars", "drums",
                     "bass", "pad", "arp", "melody", "energy")},
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
    ap.add_argument("--pilot", action="store_true")
    args = ap.parse_args()
    prompts = json.loads(PROMPTS.read_text())
    if args.pilot:
        prompts = prompts[:5]
    elif args.only:
        wanted = set(args.only.split(","))
        prompts = [p for p in prompts if p["id"] in wanted]
    entries = []
    for p in prompts:
        e = render_track(p)
        entries.append(e)
        print(f"{e['id']}: {e['name']} ({e['style']}, {e['bpm']} BPM, {e['duration']}s) "
              f"rms={e['rms']} peak={e['peak']} size={e['size']}")
    _merge_state("state-music.json", entries)
    print(f"rendered {len(entries)} tracks")


if __name__ == "__main__":
    main()
