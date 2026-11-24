"""Vidora Phase 6 — generation provider adapters (SPEC O pipeline).

A provider renders prompts into media files. Only the `local` provider
is implemented: deterministic numpy/PIL/ffmpeg synthesis on this machine
(CPU-only — GPU-safe mode: no GPU is ever used, by design).
External providers are NOT configured and never called; the registry
below is the extension point for Phase 7+ (add a provider module and
register it here — nothing here fakes a cloud call).
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "generation"))


class LocalProvider:
    """Renders prompts with the local synthesisers."""

    name = "local"
    description = "Deterministic local synthesis (numpy audio, PIL art, ffmpeg video). CPU-only."

    def render_music(self, prompt: dict) -> dict:
        from render_music import render_track
        return render_track(prompt)

    def render_sfx(self, prompt: dict) -> dict:
        from render_sfx import render_sfx
        return render_sfx(prompt)

    def render_clip(self, prompt: dict) -> dict:
        from render_clips import render_clip
        return render_clip(prompt)

    def render_image(self, prompt: dict) -> dict:
        from render_images import render_frame, render_sticker, render_texture
        kind = prompt["kind"]
        if kind == "texture":
            dest = render_texture(prompt)
        elif kind == "frame":
            dest = render_frame(prompt)
        elif kind == "sticker":
            dest = render_sticker(prompt)
        else:
            raise ValueError(f"unknown image kind {kind}")
        sub = {"texture": "textures", "frame": "frames", "sticker": "stickers"}[kind]
        return {
            "id": prompt["id"], "kind": kind, "name": prompt["name"],
            "design": prompt["design"],
            "file": f"/ai-library/images/{sub}/{prompt['id']}.png",
            "width": prompt["width"], "height": prompt["height"],
            "size": dest.stat().st_size, "tags": prompt["tags"], "seed": prompt["seed"],
        }


PROVIDERS = {"local": LocalProvider()}


def get_provider(name: str = "local"):
    if name not in PROVIDERS:
        raise ValueError(f"provider {name!r} is not configured (available: {sorted(PROVIDERS)})")
    return PROVIDERS[name]
