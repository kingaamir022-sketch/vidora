#!/usr/bin/env python3
"""Vidora Phase 6 — prompt generator.

Emits the checked-in prompt files under generation/prompts/:
  music.json   — 100 AI music track prompts (12 styles x keys/durations)
  sfx.json     — 100 AI sound-effect prompts (20 families x 5 variants)
  clips.json   — 100 AI stock-clip prompts (20 scenes x 5 variants)
  images.json  — 110 AI image prompts (40 textures, 20 frames, 50 stickers)

Deterministic (fixed seed): re-running produces byte-identical JSON.
Every prompt is original Vidora content — no artist names, song titles,
existing melodies, brands, characters or real people's likeness.
Run: python3 generation/make_prompts.py
"""
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "prompts"

RNG = random.Random(20261123)

# ---------------------------------------------------------------- music ----
STYLES = [
    # name, bpm options (must divide the chosen durations into whole bars),
    # scale semitones, progression (semitone roots, one per bar, cycling),
    # drums, bass, pad, arp, melody, energy, mood
    ("Ambient", [64, 80], [0, 2, 4, 7, 9], [0, 5, 7, 3], "none", "off", True, False, True, 0.25, "calm"),
    ("Lo-Fi", [80], [0, 3, 5, 7, 10], [0, -4, 3, 7], "soft", "walk", True, True, True, 0.45, "mellow"),
    ("Cinematic", [96], [0, 2, 3, 5, 7, 8, 10], [0, -4, -2, 7], "soft", "root", True, False, True, 0.6, "epic"),
    ("Electronic", [128], [0, 2, 4, 5, 7, 9, 11], [0, 5, 7, 5], "four", "root", False, True, True, 0.75, "energetic"),
    ("Acoustic", [96], [0, 2, 4, 5, 7, 9, 11], [0, 5, -4, 7], "soft", "root", True, False, True, 0.5, "warm"),
    ("Corporate", [120], [0, 2, 4, 5, 7, 9, 11], [0, 5, 7, -4], "four", "root", True, True, True, 0.65, "uplifting"),
    ("Chillwave", [96], [0, 2, 3, 5, 7, 8, 10], [0, 3, -4, 5], "soft", "walk", True, True, True, 0.5, "dreamy"),
    ("Synthwave", [96, 128], [0, 2, 3, 5, 7, 8, 10], [0, -4, 5, 7], "four", "root", True, True, False, 0.7, "retro"),
    ("Jazz", [96], [0, 2, 3, 5, 6, 7, 9, 10], [0, 5, -4, 7], "break", "walk", True, False, True, 0.55, "smooth"),
    ("Epic", [120], [0, 2, 3, 5, 7, 8, 10], [0, 7, -4, 5], "four", "root", True, False, True, 0.85, "heroic"),
    ("Minimal", [64, 80], [0, 2, 4, 7, 9], [0, 7, 5, 3], "none", "off", True, False, True, 0.2, "quiet"),
    ("Dance", [128], [0, 2, 4, 5, 7, 9, 11], [0, -4, 7, 5], "four", "root", False, True, True, 0.8, "party"),
]

KEYS = [
    ("C major", 60), ("A minor", 57), ("G major", 55), ("E minor", 52),
    ("D major", 62), ("B minor", 59), ("F major", 53), ("D minor", 50),
    ("E major", 64), ("C# minor", 61), ("Bb major", 58), ("G minor", 55),
]

NAME_A = ["Golden", "Silent", "Neon", "Velvet", "Crystal", "Midnight", "Solar",
          "Amber", "Quiet", "Electric", "Lunar", "Crimson", "Misty", "Urban",
          "Cosmic", "Gentle", "Bold", "Dreamy", "Rapid", "Slow", "Hidden",
          "Bright", "Frozen", "Wild", "Soft"]
NAME_B = ["Dawn", "Horizon", "Drive", "Rain", "Skyline", "Bloom", "Tide",
          "Glow", "Pulse", "Field", "Echo", "Harbor", "Meadow", "Summit",
          "River", "Streets", "Waves", "Lights", "Garden", "Storm", "Path",
          "Valley", "Breeze", "Ember", "Orbit"]

DURATIONS = [15] * 40 + [30] * 40 + [60] * 20


def bars_for(duration: int, bpm: int) -> int:
    """Whole bars that exactly fill `duration` seconds at `bpm`."""
    bars = duration * bpm / 240.0
    assert abs(bars - round(bars)) < 1e-9, f"{duration}s at {bpm}bpm is not bar-aligned"
    return int(round(bars))


def make_music():
    used_names = set()
    prompts = []
    for i, duration in enumerate(DURATIONS):
        style = STYLES[i % len(STYLES)]
        name, bpms, scale, progression, drums, bass, pad, arp, melody, energy, mood = style
        bpm = RNG.choice([b for b in bpms if abs(duration * b / 240.0 - round(duration * b / 240.0)) < 1e-9] or [96])
        key_name, root = KEYS[(i * 5 + len(style[0])) % len(KEYS)]
        seed = 1000 + i * 37
        # Original descriptive name, unique across the library.
        for _ in range(50):
            track_name = f"{RNG.choice(NAME_A)} {RNG.choice(NAME_B)}"
            if track_name not in used_names:
                used_names.add(track_name)
                break
        prompts.append({
            "id": f"ai-track-{i + 1:03d}",
            "name": track_name,
            "kind": "music",
            "style": name,
            "mood": mood,
            "bpm": bpm,
            "key": key_name,
            "rootMidi": root,
            "scale": scale,
            "progression": progression,
            "duration": duration,
            "bars": bars_for(duration, bpm),
            "loopable": True,
            "seed": seed,
            "drums": drums,
            "bass": bass,
            "pad": pad,
            "arp": arp,
            "melody": melody,
            "energy": energy,
            "tags": [name.lower(), mood, "ai", "instrumental"],
            "prompt": f"Original {mood} {name.lower()} instrumental, {bpm} BPM, {key_name}, "
                      f"{duration} seconds, loopable. No vocals, no samples.",
        })
    return prompts


# ------------------------------------------------------------------- sfx ---
SFX_FAMILIES = [
    # family, count, duration range (s), description
    ("whoosh", 5, (0.5, 1.2), "Air whoosh, filtered noise sweep"),
    ("pop", 5, (0.15, 0.4), "Short sine pop, pitch drop"),
    ("chime", 5, (0.8, 1.6), "Bright bell chime, harmonic decay"),
    ("impact", 5, (0.4, 0.9), "Deep impact thud, low sine + noise"),
    ("riser", 5, (0.8, 2.0), "Rising sweep, noise + pitch climb"),
    ("sweep", 5, (0.4, 1.0), "Downward frequency sweep"),
    ("click", 5, (0.05, 0.15), "UI click, short noise burst"),
    ("bubble", 5, (0.2, 0.6), "Bubble blip, sine pitch rise"),
    ("zap", 5, (0.2, 0.5), "Electric zap, saw sweep down"),
    ("sparkle", 5, (0.6, 1.4), "Sparkle arpeggio, high sine notes"),
    ("snap", 5, (0.1, 0.25), "Finger snap, noise burst + click"),
    ("shimmer", 5, (0.8, 1.8), "Shimmer pad, tremolo high tones"),
    ("thump", 5, (0.25, 0.6), "Soft thump, low sine burst"),
    ("swoosh", 5, (0.4, 1.0), "Fast swoosh, bandpass noise"),
    ("glitch", 5, (0.3, 0.8), "Digital glitch, stepped pitch jumps"),
    ("ding", 5, (0.5, 1.2), "Soft ding, single bell tone"),
    ("slide", 5, (0.4, 1.0), "Slide whistle up, sine glide"),
    ("rumble", 5, (0.8, 2.0), "Low rumble, filtered brown noise"),
    ("twinkle", 5, (0.5, 1.2), "Twinkle notes, pentatonic plucks"),
    ("boom", 5, (0.6, 1.5), "Cinematic boom, sub sine + noise"),
]


def make_sfx():
    prompts = []
    n = 0
    for family, count, (dmin, dmax), desc in SFX_FAMILIES:
        for v in range(count):
            n += 1
            prompts.append({
                "id": f"ai-sfx-{n:03d}",
                "name": f"{family.capitalize()} {v + 1}",
                "kind": "sfx",
                "family": family,
                "duration": round(RNG.uniform(dmin, dmax), 2),
                "seed": 5000 + n * 13,
                "tags": [family, "ai", "sfx"],
                "prompt": f"Original sound effect: {desc}. No samples, no recordings.",
            })
    return prompts


# ----------------------------------------------------------------- clips ---
CLIP_SCENES = [
    # scene, palette (3 hex colours), motion, description
    ("Aurora", ["#0b1026", "#22d3ee", "#a78bfa"], "drift", "Aurora bands drifting across a night sky"),
    ("Waves", ["#0c4a6e", "#38bdf8", "#e0f2fe"], "flow", "Slow ocean waves, top-down"),
    ("Particles", ["#111827", "#f59e0b", "#fde68a"], "float", "Golden dust particles floating upward"),
    ("Kaleidoscope", ["#1e1b4b", "#ec4899", "#facc15"], "rotate", "Geometric kaleidoscope turning slowly"),
    ("Sunrise", ["#7c2d12", "#fb923c", "#fde68a"], "rise", "Sun rising over a gradient horizon"),
    ("Ocean", ["#082f49", "#0ea5e9", "#67e8f9"], "flow", "Deep ocean swell, gentle motion"),
    ("Bokeh", ["#18181b", "#f472b6", "#fbbf24"], "float", "Soft out-of-focus city lights"),
    ("Nebula", ["#1e1b4b", "#8b5cf6", "#f472b6"], "drift", "Colourful nebula clouds drifting"),
    ("Rain", ["#0f172a", "#64748b", "#bae6fd"], "fall", "Rain streaks on a dark window"),
    ("Snow", ["#1e293b", "#e2e8f0", "#ffffff"], "fall", "Snowflakes falling softly"),
    ("Embers", ["#1c0a00", "#f97316", "#fbbf24"], "rise", "Glowing embers rising in the dark"),
    ("Light streaks", ["#020617", "#22d3ee", "#a5f3fc"], "flow", "Fast light streaks racing past"),
    ("Grid pulse", ["#09090b", "#22c55e", "#a3e635"], "pulse", "Neon grid pulsing with light"),
    ("Bubbles", ["#0c4a6e", "#7dd3fc", "#ffffff"], "rise", "Bubbles rising through blue water"),
    ("Clouds", ["#e0f2fe", "#ffffff", "#bae6fd"], "drift", "Soft clouds drifting in a bright sky"),
    ("Lava", ["#450a0a", "#ef4444", "#fbbf24"], "flow", "Molten lava flowing slowly"),
    ("Starfield", ["#020617", "#ffffff", "#93c5fd"], "drift", "Stars drifting through deep space"),
    ("Caustics", ["#082f49", "#2dd4bf", "#a7f3d0"], "flow", "Water caustics shimmering on a pool floor"),
    ("Ribbons", ["#111827", "#c084fc", "#f0abfc"], "flow", "Silk ribbons flowing in the wind"),
    ("Bloom", ["#3b0764", "#e879f9", "#fde68a"], "pulse", "Soft flowers of light blooming"),
]

CLIP_NAMES_A = ["Golden", "Silent", "Neon", "Velvet", "Crystal", "Midnight", "Solar",
                "Amber", "Quiet", "Electric", "Lunar", "Crimson", "Misty", "Urban",
                "Cosmic", "Gentle", "Bold", "Dreamy", "Hidden", "Bright"]


def make_clips():
    prompts = []
    n = 0
    for scene, palette, motion, desc in CLIP_SCENES:
        for v in range(5):
            n += 1
            prompts.append({
                "id": f"ai-clip-{n:03d}",
                "name": f"{CLIP_NAMES_A[(n * 7) % len(CLIP_NAMES_A)]} {scene}",
                "kind": "clip",
                "scene": scene,
                "palette": palette,
                "motion": motion,
                "duration": 6,
                "width": 1920,
                "height": 1080,
                "fps": 30,
                "seed": 9000 + n * 29,
                "tags": [scene.lower(), motion, "ai", "1080p"],
                "prompt": f"Original procedural stock clip: {desc}. No filmed footage, no real faces, 1080p, 6 seconds.",
            })
    return prompts


# ---------------------------------------------------------------- images ---
TEXTURE_KINDS = ["gradient-mesh", "noise-grain", "stripes", "dots", "waves",
                 "marble", "grid", "hex", "checker", "radial"]
FRAME_KINDS = ["thin-line", "double-line", "rounded", "corner-flourish", "vignette",
               "film-strip", "polaroid", "neon-glow", "gold-foil", "torn-edge"]
STICKER_DESIGNS = ["star", "heart", "bolt", "arrow", "badge", "flower", "sun",
                   "moon", "crown", "gem", "leaf", "drop", "cloud", "flame", "music-note",
                   "camera", "rocket", "diamond", "shield", "key", "bell", "gift", "trophy",
                   "anchor", "compass", "feather", "butterfly", "snowflake", "shell", "pearl",
                   "lantern", "kite", "balloon", "cactus", "wave", "mountain", "planet",
                   "comet", "prism", "mask", "scroll", "wand", "coin", "cup", "book",
                   "pen", "globe", "hourglass", "puzzle", "ribbon"]


def make_images():
    prompts = []
    n = 0
    palettes = [["#7c3aed", "#06b6d4"], ["#f59e0b", "#ef4444"], ["#10b981", "#06b6d4"],
                ["#ec4899", "#8b5cf6"], ["#facc15", "#f97316"], ["#22d3ee", "#3b82f6"],
                ["#a78bfa", "#f472b6"], ["#34d399", "#fbbf24"]]
    for i in range(40):
        n += 1
        kind = TEXTURE_KINDS[i % len(TEXTURE_KINDS)]
        pal = palettes[i % len(palettes)]
        prompts.append({
            "id": f"ai-texture-{i + 1:02d}", "name": f"{kind.replace('-', ' ').title()} {i // len(TEXTURE_KINDS) + 1}",
            "kind": "texture", "design": kind, "palette": pal, "width": 1920, "height": 1080,
            "seed": 20000 + i * 17, "tags": ["texture", kind, "ai"],
            "prompt": f"Original procedural texture: {kind}, palette {pal[0]} to {pal[1]}. No photos.",
        })
    for i in range(20):
        n += 1
        kind = FRAME_KINDS[i % len(FRAME_KINDS)]
        pal = palettes[(i + 2) % len(palettes)]
        prompts.append({
            "id": f"ai-frame-{i + 1:02d}", "name": f"{kind.replace('-', ' ').title()} Frame {(i // len(FRAME_KINDS)) + 1}",
            "kind": "frame", "design": kind, "palette": pal, "width": 1920, "height": 1080,
            "seed": 30000 + i * 19, "tags": ["frame", kind, "ai"],
            "prompt": f"Original transparent frame border: {kind}, transparent centre. No photos.",
        })
    for i, design in enumerate(STICKER_DESIGNS):
        n += 1
        pal = palettes[i % len(palettes)]
        prompts.append({
            "id": f"ai-sticker-{i + 1:02d}", "name": f"{design.replace('-', ' ').title()} Sticker",
            "kind": "sticker", "design": design, "palette": pal, "width": 512, "height": 512,
            "seed": 40000 + i * 23, "tags": ["sticker", design, "ai", "transparent"],
            "prompt": f"Original transparent PNG sticker: a {design} drawn in flat vector style, palette {pal[0]} / {pal[1]}. No copied artwork.",
        })
    return prompts


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    data = {
        "music.json": make_music(),
        "sfx.json": make_sfx(),
        "clips.json": make_clips(),
        "images.json": make_images(),
    }
    for name, rows in data.items():
        (OUT / name).write_text(f"{json.dumps(rows, indent=2)}\n", encoding="utf-8")
        print(f"{name}: {len(rows)} prompts")
    print(f"total: {sum(len(v) for v in data.values())} prompts")


if __name__ == "__main__":
    main()
