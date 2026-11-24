"""Vidora Phase 6 — procedural scene painters (PIL).

Paints the 1920x1080 stills that render_clips.py animates, and the
translucent drifting overlay layer. All artwork is original Vidora
procedural art — no photos, no stock, no copied images.
"""
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1920, 1080


def _hex(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _vgrad(c1, c2, c3=None):
    """Vertical gradient (numpy) as an RGB image."""
    y = np.linspace(0, 1, H)[:, None, None]
    a = np.array(c1, dtype=np.float64)
    b = np.array(c2, dtype=np.float64)
    img = a * (1 - y) + b * y
    if c3 is not None:
        c = np.array(c3, dtype=np.float64)
        mid = y < 0.5
        img = np.where(mid, a * (1 - y * 2) + c * (y * 2), c * (2 - y * 2) + b * (y * 2 - 1))
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8).repeat(W, axis=1))


def _glow(img, cx, cy, r, colour, alpha=160):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.45))
    img.alpha_composite(layer)


def _dots(img, rng, n, colour, rmin=2, rmax=10, ymax=None, alpha=200):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(n):
        x = rng.uniform(0, W)
        y = rng.uniform(0, ymax or H)
        r = rng.uniform(rmin, rmax)
        d.ellipse([x - r, y - r, x + r, y + r], fill=colour + (alpha,))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(2)))


def _sine_bands(img, rng, colour, waves=5, amp=90, thick=26, alpha=170, blur=18):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for w in range(waves):
        y0 = H * (0.15 + 0.7 * w / max(1, waves - 1))
        ph = rng.uniform(0, 6.28)
        fr = rng.uniform(0.0012, 0.0028)
        pts = [(x, y0 + amp * math.sin(x * fr + ph)) for x in range(0, W + 40, 40)]
        d.line(pts, fill=colour + (alpha,), width=thick)
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur)))


def _jitter_palette(palette: list[tuple[int, int, int]], seed: int):
    """Per-variant hue jitter (±22°) so the 5 variants of one scene are
    visibly distinct while staying in-scene. Uses colorsys on 3 colours."""
    import colorsys
    shift = ((seed % 5) - 2) * 0.03
    if shift == 0:
        return palette
    out = []
    for (r, g, b) in palette:
        h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
        r2, g2, b2 = colorsys.hsv_to_rgb((h + shift) % 1.0, s, v)
        out.append((int(r2 * 255), int(g2 * 255), int(b2 * 255)))
    return out


def paint_scene(prompt: dict, path: Path) -> None:
    scene = prompt["scene"]
    pal = _jitter_palette([_hex(c) for c in prompt["palette"]], prompt["seed"])
    rng = random.Random(prompt["seed"])
    img = _vgrad(pal[0], pal[1], pal[2] if len(pal) > 2 else None).convert("RGBA")
    c1, c2 = pal[1], pal[2] if len(pal) > 2 else pal[0]
    if scene == "Aurora":
        _sine_bands(img, rng, c1, waves=4, amp=110, thick=30)
        _sine_bands(img, rng, c2, waves=3, amp=80, thick=18, alpha=130)
        _dots(img, rng, 120, (255, 255, 255), 1, 3, alpha=180)
    elif scene == "Waves":
        _sine_bands(img, rng, c2, waves=7, amp=60, thick=22, alpha=150, blur=10)
        _dots(img, rng, 60, (255, 255, 255), 2, 5, alpha=120)
    elif scene == "Particles":
        _dots(img, rng, 260, c1, 2, 9, alpha=190)
        _dots(img, rng, 120, c2, 1, 5, alpha=160)
    elif scene == "Kaleidoscope":
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        cx, cy = W // 2, H // 2
        for k in range(12):
            ang = k * math.pi / 6
            pts = [(cx, cy),
                   (cx + 900 * math.cos(ang), cy + 900 * math.sin(ang)),
                   (cx + 900 * math.cos(ang + 0.5), cy + 900 * math.sin(ang + 0.5))]
            d.polygon(pts, fill=(c1 if k % 2 else c2) + (90,))
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(6)))
        _glow(img, cx, cy, 260, (255, 255, 255), 90)
    elif scene == "Sunrise":
        # Darker sky up top, bright sun disc low on the horizon.
        img = _vgrad((40, 16, 8), pal[1], pal[2]).convert("RGBA")
        d0 = ImageDraw.Draw(img)
        d0.rectangle([0, int(H * 0.72), W, H], fill=pal[0])
        _glow(img, W // 2, H * 0.72, 460, c2, 210)
        _glow(img, W // 2, H * 0.72, 200, (255, 244, 214), 235)
        d = ImageDraw.Draw(img)
        d.ellipse([W // 2 - 120, H * 0.72 - 120, W // 2 + 120, H * 0.72 + 120],
                  fill=(255, 248, 220, 255))
        _sine_bands(img, rng, (255, 255, 255), waves=2, amp=30, thick=10, alpha=90, blur=24)
    elif scene == "Ocean":
        _sine_bands(img, rng, c2, waves=8, amp=70, thick=26, alpha=140, blur=14)
        _glow(img, W * 0.7, H * 0.3, 300, c2, 80)
    elif scene == "Bokeh":
        _dots(img, rng, 90, c1, 18, 70, alpha=110)
        _dots(img, rng, 60, c2, 10, 46, alpha=120)
        _dots(img, rng, 40, (255, 255, 255), 6, 22, alpha=140)
    elif scene == "Nebula":
        for _ in range(26):
            _glow(img, rng.uniform(0, W), rng.uniform(0, H), rng.uniform(120, 380),
                  rng.choice([c1, c2, (255, 255, 255)]), rng.randint(50, 120))
        _dots(img, rng, 200, (255, 255, 255), 1, 3, alpha=200)
    elif scene == "Rain":
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for _ in range(320):
            x = rng.uniform(0, W)
            y = rng.uniform(0, H)
            ln = rng.uniform(30, 90)
            d.line([(x, y), (x - ln * 0.25, y + ln)], fill=(200, 220, 255, 130), width=2)
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(1)))
    elif scene == "Snow":
        _dots(img, rng, 420, (255, 255, 255), 2, 8, alpha=210)
    elif scene == "Embers":
        _dots(img, rng, 200, c1, 2, 8, ymax=H, alpha=200)
        _dots(img, rng, 120, c2, 1, 5, ymax=H, alpha=180)
        _glow(img, W // 2, H, 500, c1, 110)
    elif scene == "Light streaks":
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for _ in range(26):
            y = rng.uniform(0, H)
            d.line([(0, y), (W, y + rng.uniform(-160, 160))], fill=c1 + (150,), width=rng.randint(3, 9))
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(3)))
        _dots(img, rng, 80, (255, 255, 255), 1, 4, alpha=160)
    elif scene == "Grid pulse":
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for x in range(0, W, 120):
            d.line([(x, 0), (x, H)], fill=c1 + (120,), width=3)
        for y in range(0, H, 120):
            d.line([(0, y), (W, y)], fill=c1 + (120,), width=3)
        img.alpha_composite(layer)
        _glow(img, W // 2, H // 2, 320, c2, 120)
    elif scene == "Bubbles":
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for _ in range(70):
            x = rng.uniform(0, W)
            y = rng.uniform(0, H)
            r = rng.uniform(8, 60)
            d.ellipse([x - r, y - r, x + r, y + r], outline=(255, 255, 255, 150), width=3)
            d.ellipse([x - r * 0.4, y - r * 0.4, x - r * 0.1, y - r * 0.1], fill=(255, 255, 255, 170))
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(1)))
    elif scene == "Clouds":
        for _ in range(22):
            _glow(img, rng.uniform(0, W), rng.uniform(H * 0.1, H * 0.9),
                  rng.uniform(140, 320), (255, 255, 255), rng.randint(90, 150))
    elif scene == "Lava":
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for _ in range(14):
            x, y = rng.uniform(0, W), rng.uniform(0, H)
            pts = [(x, y)]
            for _ in range(9):
                x += rng.uniform(-160, 160)
                y += rng.uniform(-60, 60)
                pts.append((x, y))
            d.line(pts, fill=c2 + (200,), width=rng.randint(4, 10))
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(4)))
        _glow(img, W * 0.3, H * 0.7, 300, c1, 120)
    elif scene == "Starfield":
        _dots(img, rng, 500, (255, 255, 255), 1, 3, alpha=220)
        _dots(img, rng, 60, c1, 2, 5, alpha=180)
        _glow(img, W * 0.75, H * 0.3, 200, c2, 70)
    elif scene == "Caustics":
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for _ in range(40):
            x, y = rng.uniform(0, W), rng.uniform(0, H)
            r = rng.uniform(30, 130)
            d.arc([x - r, y - r, x + r, y + r], rng.uniform(0, 180), rng.uniform(180, 360),
                  fill=c2 + (130,), width=6)
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(6)))
    elif scene == "Ribbons":
        _sine_bands(img, rng, c1, waves=4, amp=160, thick=34, alpha=160, blur=12)
        _sine_bands(img, rng, c2, waves=3, amp=120, thick=20, alpha=130, blur=12)
    elif scene == "Bloom":
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        cx, cy = W // 2, H // 2
        for k in range(10):
            ang = k * math.pi / 5
            x2 = cx + 620 * math.cos(ang)
            y2 = cy + 420 * math.sin(ang)
            d.ellipse([min(cx, x2) - 130, min(cy, y2) - 90, max(cx, x2) + 130, max(cy, y2) + 90],
                      fill=(c1 if k % 2 else c2) + (110,))
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(10)))
        _glow(img, cx, cy, 200, (255, 255, 255), 130)
    # Gentle film grain so flat gradients never band.
    arr = np.asarray(img.convert("RGB")).astype(np.int16)
    grain = np.random.RandomState(prompt["seed"]).randint(-6, 7, size=arr.shape[:2])[..., None]
    arr = np.clip(arr + grain, 0, 255).astype(np.uint8)
    Image.fromarray(arr).convert("RGB").save(path)


def paint_overlay(prompt: dict, path: Path) -> None:
    """Translucent drifting layer: soft dots/blobs in the scene palette.
    Painted at half resolution (960x540) and upscaled — it is soft blobs,
    so half-res is visually identical and ~4x faster than 46 full-res
    Gaussian blurs."""
    rng = random.Random(prompt["seed"] + 77)
    pal = [_hex(c) for c in prompt["palette"]]
    small = Image.new("RGBA", (W // 2, H // 2), (0, 0, 0, 0))
    # Reuse _glow/_dots on the small canvas by temporarily scaling coords.
    for _ in range(46):
        cx, cy = rng.uniform(0, W // 2), rng.uniform(0, H // 2)
        r = rng.uniform(15, 60)
        colour = rng.choice(pal[1:])
        layer = Image.new("RGBA", (W // 2, H // 2), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour + (rng.randint(40, 90),))
        small.alpha_composite(layer.filter(ImageFilter.GaussianBlur(r * 0.45)))
    d = ImageDraw.Draw(small)
    for _ in range(60):
        x, y = rng.uniform(0, W // 2), rng.uniform(0, H // 2)
        r = rng.uniform(0.5, 2)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 110))
    small.resize((W, H), Image.BILINEAR).save(path)
