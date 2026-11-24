#!/usr/bin/env python3
"""Vidora Phase 6 — AI image renderer (offline, CPU-only).

Renders the prompts in generation/prompts/images.json with PIL:
  40 textures (1920x1080 PNG), 20 transparent frames (1920x1080 PNG),
  50 transparent PNG stickers (512x512). All artwork is original Vidora
  procedural art — no photos, no stock, no copied images.

Usage: python3 generation/render_images.py [--only ai-texture-01,...]
Output: public/ai-library/images/{textures,frames,stickers}/<id>.png
"""
import argparse
import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PROMPTS = ROOT / "generation" / "prompts" / "images.json"
OUT = ROOT / "public" / "ai-library" / "images"


def _hex(h: str):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _vgrad(w, h, c1, c2):
    y = np.linspace(0, 1, h)[:, None, None]
    a = np.array(c1, dtype=float)
    b = np.array(c2, dtype=float)
    img = a * (1 - y) + b * y
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8).repeat(w, axis=1))


def _blobs(img, rng, colours, n=14, rmin=120, rmax=420, alpha=90):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    W, H = img.size
    for _ in range(n):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        r = rng.uniform(rmin, rmax)
        d.ellipse([x - r, y - r, x + r, y + r], fill=rng.choice(colours) + (alpha,))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(60)))


def render_texture(p: dict) -> Path:
    rng = random.Random(p["seed"])
    c1, c2 = _hex(p["palette"][0]), _hex(p["palette"][1])
    W, H = p["width"], p["height"]
    img = _vgrad(W, H, c1, c2).convert("RGBA")
    kind = p["design"]
    if kind == "gradient-mesh":
        _blobs(img, rng, [c1, c2, (255, 255, 255)])
    elif kind == "noise-grain":
        arr = np.asarray(img.convert("RGB")).astype(np.int16)
        grain = np.random.RandomState(p["seed"] + 5).randint(-22, 23, size=arr.shape[:2])[..., None]
        arr = np.clip(arr + grain, 0, 255).astype(np.uint8)
        img = Image.fromarray(arr).convert("RGBA")
    elif kind == "stripes":
        d = ImageDraw.Draw(img)
        for x in range(0, W, 90):
            d.rectangle([x, 0, x + 45, H], fill=(255, 255, 255, 28))
    elif kind == "dots":
        d = ImageDraw.Draw(img)
        for x in range(40, W, 90):
            for y in range(40, H, 90):
                d.ellipse([x - 14, y - 14, x + 14, y + 14], fill=(255, 255, 255, 46))
    elif kind == "waves":
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for w in range(6):
            y0 = H * (0.12 + 0.75 * w / 5)
            pts = [(x, y0 + 60 * math.sin(x * 0.002 + w)) for x in range(0, W + 40, 40)]
            d.line(pts, fill=(255, 255, 255, 60), width=16)
        img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(8)))
    elif kind == "marble":
        arr = np.asarray(img.convert("RGB")).astype(np.float64)
        xx = np.linspace(0, 6, W)[None, :]
        yy = np.linspace(0, 4, H)[:, None]
        veins = (np.sin(xx * 2 + yy * 3 + np.sin(yy * 5) * 1.5) > 0.86)
        arr[veins] = [255, 255, 255]
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA")
    elif kind == "grid":
        d = ImageDraw.Draw(img)
        for x in range(0, W, 110):
            d.line([(x, 0), (x, H)], fill=(255, 255, 255, 40), width=3)
        for y in range(0, H, 110):
            d.line([(0, y), (W, y)], fill=(255, 255, 255, 40), width=3)
    elif kind == "hex":
        d = ImageDraw.Draw(img)
        for row, y in enumerate(range(0, H, 96)):
            for col, x in enumerate(range(0, W, 110)):
                ox = 55 if row % 2 else 0
                cx, cy = x + ox, y
                pts = [(cx + 40 * math.cos(math.pi / 3 * k + math.pi / 6),
                        cy + 40 * math.sin(math.pi / 3 * k + math.pi / 6)) for k in range(6)]
                d.polygon(pts, outline=(255, 255, 255, 60))
    elif kind == "checker":
        d = ImageDraw.Draw(img)
        for y in range(0, H, 120):
            for x in range(0, W, 120):
                if (x // 120 + y // 120) % 2 == 0:
                    d.rectangle([x, y, x + 120, y + 120], fill=(255, 255, 255, 30))
    elif kind == "radial":
        cx, cy = W // 2, H // 2
        maxr = math.hypot(cx, cy)
        yy, xx = np.mgrid[0:H, 0:W]
        dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / maxr
        a = np.array(c2, dtype=float)[None, None, :]
        b = np.array(c1, dtype=float)[None, None, :]
        arr = (b * (1 - dist[..., None]) + a * dist[..., None])
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA")
    dest = OUT / "textures" / f"{p['id']}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(dest)
    return dest


def render_frame(p: dict) -> Path:
    rng = random.Random(p["seed"])
    c1, c2 = _hex(p["palette"][0]), _hex(p["palette"][1])
    W, H = p["width"], p["height"]
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    kind = p["design"]
    m = 46
    if kind == "thin-line":
        d.rectangle([m, m, W - m, H - m], outline=c1 + (255,), width=6)
    elif kind == "double-line":
        d.rectangle([m, m, W - m, H - m], outline=c1 + (255,), width=6)
        d.rectangle([m + 26, m + 26, W - m - 26, H - m - 26], outline=c2 + (255,), width=3)
    elif kind == "rounded":
        d.rounded_rectangle([m, m, W - m, H - m], radius=60, outline=c1 + (255,), width=8)
    elif kind == "corner-flourish":
        for (x0, y0, sx, sy) in [(m, m, 1, 1), (W - m, m, -1, 1), (m, H - m, 1, -1), (W - m, H - m, -1, -1)]:
            d.line([(x0, y0), (x0 + 190 * sx, y0)], fill=c1 + (255,), width=8)
            d.line([(x0, y0), (x0, y0 + 190 * sy)], fill=c1 + (255,), width=8)
            d.ellipse([x0 - 16, y0 - 16, x0 + 16, y0 + 16], fill=c2 + (255,))
    elif kind == "vignette":
        layer = Image.new("L", (W, H), 0)
        dv = ImageDraw.Draw(layer)
        # Fully opaque at the edge (was 170: no pixel ever reached alpha
        # 255, so the frame failed the transparent+opaque check, BUG-P6-009).
        dv.rectangle([0, 0, W, H], fill=255)
        dv.rectangle([m * 2, m * 2, W - m * 2, H - m * 2], fill=0)
        layer = layer.filter(ImageFilter.GaussianBlur(90))
        dark = Image.new("RGBA", (W, H), (0, 0, 0, 255))
        img.paste(dark, (0, 0), layer)
        # GaussianBlur darkens the canvas edge (max alpha 245, never
        # 255), so the frame failed the transparent+opaque check
        # (BUG-P6-009): a solid rim at the very edge restores full
        # opacity there — visually just the darkest part of the vignette.
        d.rectangle([0, 0, W - 1, H - 1], outline=(0, 0, 0, 255), width=12)
    elif kind == "film-strip":
        d.rectangle([0, 0, 110, H], fill=(20, 20, 20, 235))
        d.rectangle([W - 110, 0, W, H], fill=(20, 20, 20, 235))
        for y in range(30, H, 90):
            d.rounded_rectangle([28, y, 82, y + 52], radius=8, fill=(240, 240, 240, 255))
            d.rounded_rectangle([W - 82, y, W - 28, y + 52], radius=8, fill=(240, 240, 240, 255))
    elif kind == "polaroid":
        d.rectangle([0, 0, W, H], outline=(255, 255, 255, 255), width=64)
        d.rectangle([0, H - 190, W, H], fill=(255, 255, 255, 255))
    elif kind == "neon-glow":
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        dg = ImageDraw.Draw(glow)
        dg.rectangle([m, m, W - m, H - m], outline=c1 + (255,), width=10)
        glow = glow.filter(ImageFilter.GaussianBlur(16))
        img.alpha_composite(glow)
        d.rectangle([m, m, W - m, H - m], outline=(255, 255, 255, 255), width=4)
    elif kind == "gold-foil":
        grad = _vgrad(1, H, (212, 175, 55), (146, 111, 52)).resize((W, H))
        mask = Image.new("L", (W, H), 0)
        dm = ImageDraw.Draw(mask)
        dm.rectangle([m, m, W - m, H - m], outline=255, width=14)
        img.paste(Image.new("RGBA", (W, H), (0, 0, 0, 0)), (0, 0))
        gold = grad.convert("RGBA")
        img.paste(gold, (0, 0), mask)
    elif kind == "torn-edge":
        pts = []
        for x in range(0, W + 1, 90):
            pts.append((x, m + rng.uniform(-14, 14)))
        for y in range(0, H + 1, 90):
            pts.append((W - m + rng.uniform(-14, 14), y))
        for x in range(W, -1, -90):
            pts.append((x, H - m + rng.uniform(-14, 14)))
        for y in range(H, -1, -90):
            pts.append((m + rng.uniform(-14, 14), y))
        d.polygon(pts, outline=c1 + (255,))
        d.line(pts + [pts[0]], fill=c1 + (255,), width=8, joint="curve")
    dest = OUT / "frames" / f"{p['id']}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest)
    return dest


def _star(d, cx, cy, r, colour, points=5):
    pts = []
    for k in range(points * 2):
        rr = r if k % 2 == 0 else r * 0.45
        ang = -math.pi / 2 + k * math.pi / points
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    d.polygon(pts, fill=colour)


def _heart(d, cx, cy, s, colour):
    d.ellipse([cx - s, cy - s * 0.7, cx, cy + s * 0.3], fill=colour)
    d.ellipse([cx, cy - s * 0.7, cx + s, cy + s * 0.3], fill=colour)
    d.polygon([(cx - s, cy), (cx + s, cy), (cx, cy + s)], fill=colour)


def render_sticker(p: dict) -> Path:
    rng = random.Random(p["seed"])
    c1, c2 = _hex(p["palette"][0]), _hex(p["palette"][1])
    S = 512
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = S // 2, S // 2
    design = p["design"]
    white = (255, 255, 255, 255)
    if design == "star":
        _star(d, cx, cy, 190, c1 + (255,))
    elif design == "heart":
        _heart(d, cx, cy, 150, c1 + (255,))
    elif design == "bolt":
        d.polygon([(cx + 40, cy - 190), (cx - 90, cy + 30), (cx - 10, cy + 30),
                   (cx - 40, cy + 190), (cx + 90, cy - 30), (cx + 10, cy - 30)], fill=c1 + (255,))
    elif design == "arrow":
        d.polygon([(cx - 150, cy - 40), (cx + 60, cy - 40), (cx + 60, cy - 110),
                   (cx + 190, cy), (cx + 60, cy + 110), (cx + 60, cy + 40),
                   (cx - 150, cy + 40)], fill=c1 + (255,))
    elif design == "badge":
        _star(d, cx, cy, 180, c1 + (255,), points=12)
        d.ellipse([cx - 90, cy - 90, cx + 90, cy + 90], fill=c2 + (255,))
        _star(d, cx, cy, 60, white, points=5)
    elif design == "flower":
        for k in range(8):
            ang = k * math.pi / 4
            x, y = cx + 105 * math.cos(ang), cy + 105 * math.sin(ang)
            d.ellipse([x - 62, y - 62, x + 62, y + 62], fill=c1 + (255,))
        d.ellipse([cx - 62, cy - 62, cx + 62, cy + 62], fill=c2 + (255,))
    elif design == "sun":
        d.ellipse([cx - 110, cy - 110, cx + 110, cy + 110], fill=c1 + (255,))
        for k in range(12):
            ang = k * math.pi / 6
            x1, y1 = cx + 140 * math.cos(ang), cy + 140 * math.sin(ang)
            x2, y2 = cx + 195 * math.cos(ang), cy + 195 * math.sin(ang)
            d.line([(x1, y1), (x2, y2)], fill=c1 + (255,), width=18)
    elif design == "moon":
        d.ellipse([cx - 170, cy - 170, cx + 170, cy + 170], fill=c1 + (255,))
        d.ellipse([cx - 110, cy - 190, cx + 190, cy + 130], fill=(0, 0, 0, 0))
        # cut-out via mask: draw bg-coloured crescent instead
        img2 = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        d2 = ImageDraw.Draw(img2)
        d2.ellipse([cx - 170, cy - 170, cx + 170, cy + 170], fill=c1 + (255,))
        mask = Image.new("L", (S, S), 0)
        dm = ImageDraw.Draw(mask)
        dm.ellipse([cx - 100, cy - 200, cx + 200, cy + 140], fill=255)
        img = Image.composite(Image.new("RGBA", (S, S), (0, 0, 0, 0)), img2, mask)
        d = ImageDraw.Draw(img)
    elif design == "crown":
        d.polygon([(cx - 170, cy + 110), (cx - 170, cy - 40), (cx - 85, cy + 30),
                   (cx, cy - 130), (cx + 85, cy + 30), (cx + 170, cy - 40),
                   (cx + 170, cy + 110)], fill=c1 + (255,))
        d.ellipse([cx - 30, cy - 160, cx + 30, cy - 100], fill=c2 + (255,))
    elif design == "gem":
        d.polygon([(cx - 130, cy - 60), (cx + 130, cy - 60), (cx + 90, cy + 140), (cx - 90, cy + 140)], fill=c1 + (255,))
        d.polygon([(cx - 130, cy - 60), (cx, cy - 140), (cx + 130, cy - 60)], fill=c2 + (255,))
        d.line([(cx - 130, cy - 60), (cx + 130, cy - 60)], fill=white, width=8)
    elif design == "leaf":
        d.ellipse([cx - 60, cy - 180, cx + 160, cy + 120], fill=c1 + (255,))
        d.line([(cx - 40, cy + 140), (cx + 40, cy - 160)], fill=c2 + (255,), width=14)
    elif design == "drop":
        d.polygon([(cx, cy - 190), (cx + 130, cy + 40), (cx, cy + 170), (cx - 130, cy + 40)], fill=c1 + (255,))
        d.ellipse([cx - 130, cy - 20, cx + 130, cy + 170], fill=c1 + (255,))
    elif design == "cloud":
        for (ox, oy, r) in [(-110, 30, 80), (-30, -30, 100), (60, 10, 90), (120, 50, 70)]:
            d.ellipse([cx + ox - r, cy + oy - r, cx + ox + r, cy + oy + r], fill=c1 + (255,))
        d.rectangle([cx - 180, cy, cx + 180, cy + 90], fill=c1 + (255,))
    elif design == "flame":
        d.polygon([(cx, cy - 190), (cx + 110, cy - 20), (cx + 60, cy + 60), (cx + 130, cy + 90),
                   (cx + 60, cy + 170), (cx - 60, cy + 170), (cx - 130, cy + 90), (cx - 60, cy + 60),
                   (cx - 110, cy - 20)], fill=c1 + (255,))
        d.ellipse([cx - 55, cy + 20, cx + 55, cy + 150], fill=c2 + (255,))
    elif design == "music-note":
        d.ellipse([cx - 120, cy + 60, cx - 20, cy + 140], fill=c1 + (255,))
        d.ellipse([cx + 60, cy + 20, cx + 160, cy + 100], fill=c1 + (255,))
        d.rectangle([cx - 40, cy - 160, cx - 20, cy + 100], fill=c1 + (255,))
        d.rectangle([cx + 140, cy - 120, cx + 160, cy + 60], fill=c1 + (255,))
        d.polygon([(cx - 40, cy - 160), (cx + 160, cy - 120), (cx + 160, cy - 80), (cx - 40, cy - 120)], fill=c1 + (255,))
    elif design == "camera":
        d.rounded_rectangle([cx - 180, cy - 100, cx + 180, cy + 130], radius=36, fill=c1 + (255,))
        d.ellipse([cx - 80, cy - 70, cx + 80, cy + 90], fill=c2 + (255,))
        d.ellipse([cx - 45, cy - 35, cx + 45, cy + 55], fill=(30, 30, 40, 255))
        d.rectangle([cx - 70, cy - 140, cx + 70, cy - 100], fill=c1 + (255,))
    elif design == "rocket":
        d.polygon([(cx, cy - 190), (cx + 80, cy - 20), (cx + 60, cy + 110), (cx - 60, cy + 110), (cx - 80, cy - 20)], fill=c1 + (255,))
        d.ellipse([cx - 38, cy - 110, cx + 38, cy - 34], fill=c2 + (255,))
        d.polygon([(cx - 80, cy + 60), (cx - 150, cy + 160), (cx - 60, cy + 120)], fill=c2 + (255,))
        d.polygon([(cx + 80, cy + 60), (cx + 150, cy + 160), (cx + 60, cy + 120)], fill=c2 + (255,))
        _star(d, cx, cy + 185, 26, (255, 200, 80, 255), points=4)
    elif design == "diamond":
        d.polygon([(cx, cy - 150), (cx + 140, cy), (cx, cy + 150), (cx - 140, cy)], fill=c1 + (255,))
        d.polygon([(cx, cy - 150), (cx + 140, cy), (cx, cy)], fill=c2 + (255,))
    elif design == "shield":
        d.polygon([(cx - 140, cy - 150), (cx + 140, cy - 150), (cx + 140, cy + 30),
                   (cx, cy + 180), (cx - 140, cy + 30)], fill=c1 + (255,))
        _star(d, cx, cy - 20, 55, white, points=5)
    elif design == "key":
        d.ellipse([cx - 150, cy - 90, cx - 10, cy + 50], outline=c1 + (255,), width=26)
        d.line([(cx - 30, cy - 20), (cx + 150, cy - 20)], fill=c1 + (255,), width=26)
        d.line([(cx + 90, cy - 20), (cx + 90, cy + 50)], fill=c1 + (255,), width=22)
        d.line([(cx + 140, cy - 20), (cx + 140, cy + 30)], fill=c1 + (255,), width=22)
    elif design == "bell":
        d.polygon([(cx - 130, cy - 40), (cx - 90, cy - 160), (cx + 90, cy - 160), (cx + 130, cy - 40)], fill=c1 + (255,))
        d.ellipse([cx - 150, cy - 60, cx + 150, cy + 30], fill=c1 + (255,))
        d.ellipse([cx - 26, cy + 40, cx + 26, cy + 92], fill=c2 + (255,))
        d.rectangle([cx - 150, cy - 160, cx + 150, cy - 120], fill=c1 + (255,))
    elif design == "gift":
        d.rectangle([cx - 140, cy - 40, cx + 140, cy + 150], fill=c1 + (255,))
        d.rectangle([cx - 22, cy - 40, cx + 22, cy + 150], fill=c2 + (255,))
        d.rectangle([cx - 150, cy - 90, cx + 150, cy - 40], fill=c1 + (255,))
        d.ellipse([cx - 70, cy - 180, cx, cy - 90], outline=c2 + (255,), width=16)
        d.ellipse([cx, cy - 180, cx + 70, cy - 90], outline=c2 + (255,), width=16)
    elif design == "trophy":
        d.polygon([(cx - 90, cy - 170), (cx + 90, cy - 170), (cx + 60, cy + 20), (cx - 60, cy + 20)], fill=c1 + (255,))
        d.rectangle([cx - 16, cy + 20, cx + 16, cy + 110], fill=c1 + (255,))
        d.rectangle([cx - 80, cy + 110, cx + 80, cy + 150], fill=c1 + (255,))
        d.arc([cx - 190, cy - 170, cx - 60, cy - 20], 90, 270, fill=c2 + (255,), width=18)
        d.arc([cx + 60, cy - 170, cx + 190, cy - 20], -90, 90, fill=c2 + (255,), width=18)
    elif design == "anchor":
        d.ellipse([cx - 45, cy - 180, cx + 45, cy - 90], outline=c1 + (255,), width=22)
        d.line([(cx, cy - 135), (cx, cy + 140)], fill=c1 + (255,), width=24)
        d.line([(cx - 130, cy - 70), (cx + 130, cy - 70)], fill=c1 + (255,), width=24)
        d.arc([cx - 150, cy - 40, cx + 150, cy + 180], 0, 180, fill=c1 + (255,), width=26)
    elif design == "compass":
        d.ellipse([cx - 160, cy - 160, cx + 160, cy + 160], fill=c1 + (255,))
        d.ellipse([cx - 125, cy - 125, cx + 125, cy + 125], fill=(255, 255, 255, 255))
        d.polygon([(cx, cy - 110), (cx + 34, cy), (cx, cy + 110), (cx - 34, cy)], fill=c2 + (255,))
        d.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=c1 + (255,))
    elif design == "feather":
        d.ellipse([cx - 70, cy - 180, cx + 110, cy + 100], fill=c1 + (255,))
        d.line([(cx - 30, cy + 140), (cx + 30, cy - 160)], fill=c2 + (255,), width=14)
        d.line([(cx + 30, cy - 40), (cx + 110, cy - 90)], fill=c2 + (255,), width=10)
    elif design == "butterfly":
        for sx in (-1, 1):
            d.ellipse([cx + sx * 130 - 80, cy - 120, cx + sx * 130 + 80, cy], fill=c1 + (255,))
            d.ellipse([cx + sx * 100 - 60, cy + 10, cx + sx * 100 + 60, cy + 110], fill=c2 + (255,))
        d.ellipse([cx - 22, cy - 110, cx + 22, cy + 120], fill=(40, 40, 50, 255))
    elif design == "snowflake":
        for k in range(6):
            ang = k * math.pi / 3
            x2, y2 = cx + 170 * math.cos(ang), cy + 170 * math.sin(ang)
            d.line([(cx, cy), (x2, y2)], fill=c1 + (255,), width=16)
            for s in (0.6,):
                mx, my = cx + 170 * s * math.cos(ang), cy + 170 * s * math.sin(ang)
                d.line([(mx, my), (mx + 46 * math.cos(ang + 0.6), my + 46 * math.sin(ang + 0.6))], fill=c1 + (255,), width=10)
                d.line([(mx, my), (mx + 46 * math.cos(ang - 0.6), my + 46 * math.sin(ang - 0.6))], fill=c1 + (255,), width=10)
    elif design == "shell":
        for k in range(7):
            ang = math.pi + k * math.pi / 6
            x2, y2 = cx + 170 * math.cos(ang), cy + 40 + 150 * math.sin(ang)
            d.line([(cx, cy + 60), (x2, y2)], fill=c1 + (255,), width=16)
        d.pieslice([cx - 170, cy - 130, cx + 170, cy + 130], 180, 360, fill=c2 + (255,))
    elif design == "pearl":
        d.ellipse([cx - 130, cy - 130, cx + 130, cy + 130], fill=c1 + (255,))
        d.ellipse([cx - 90, cy - 100, cx - 10, cy - 20], fill=(255, 255, 255, 200))
        d.arc([cx - 160, cy - 40, cx + 160, cy + 190], 0, 180, fill=c2 + (255,), width=16)
    elif design == "lantern":
        d.rounded_rectangle([cx - 110, cy - 120, cx + 110, cy + 130], radius=60, fill=c1 + (255,))
        d.rectangle([cx - 50, cy - 160, cx + 50, cy - 120], fill=c2 + (255,))
        d.rectangle([cx - 50, cy + 130, cx + 50, cy + 160], fill=c2 + (255,))
        d.ellipse([cx - 45, cy - 60, cx + 45, cy + 60], fill=(255, 240, 180, 255))
    elif design == "kite":
        d.polygon([(cx, cy - 180), (cx + 130, cy), (cx, cy + 190), (cx - 130, cy)], fill=c1 + (255,))
        d.line([(cx, cy - 180), (cx, cy + 190)], fill=white, width=8)
        d.line([(cx - 130, cy), (cx + 130, cy)], fill=white, width=8)
        d.polygon([(cx - 20, cy + 190), (cx + 20, cy + 190), (cx, cy + 240)], fill=c2 + (255,))
    elif design == "balloon":
        d.ellipse([cx - 130, cy - 180, cx + 130, cy + 60], fill=c1 + (255,))
        d.polygon([(cx - 30, cy + 50), (cx + 30, cy + 50), (cx, cy + 100)], fill=c1 + (255,))
        d.line([(cx, cy + 100), (cx, cy + 210)], fill=c2 + (255,), width=8)
    elif design == "cactus":
        d.rounded_rectangle([cx - 45, cy - 170, cx + 45, cy + 160], radius=40, fill=c1 + (255,))
        d.rounded_rectangle([cx - 150, cy - 40, cx - 80, cy + 80], radius=30, fill=c1 + (255,))
        d.rounded_rectangle([cx + 80, cy - 90, cx + 150, cy + 40], radius=30, fill=c1 + (255,))
        d.rectangle([cx - 90, cy + 160, cx + 90, cy + 195], fill=c2 + (255,))
    elif design == "wave":
        for w in range(3):
            y0 = cy - 90 + w * 90
            pts = [(x, y0 + 46 * math.sin(x * 0.02 + w * 1.4)) for x in range(cx - 190, cx + 191, 20)]
            d.line(pts, fill=c1 + (255,), width=34)
    elif design == "mountain":
        d.polygon([(cx - 190, cy + 150), (cx - 60, cy - 120), (cx + 40, cy + 40), (cx + 110, cy - 170), (cx + 190, cy + 150)], fill=c1 + (255,))
        d.polygon([(cx + 110, cy - 170), (cx + 150, cy - 90), (cx + 80, cy - 60)], fill=(255, 255, 255, 255))
        d.rectangle([cx - 190, cy + 150, cx + 190, cy + 180], fill=c2 + (255,))
    elif design == "planet":
        d.ellipse([cx - 120, cy - 120, cx + 120, cy + 120], fill=c1 + (255,))
        d.ellipse([cx - 190, cy - 30, cx + 190, cy + 30], outline=c2 + (255,), width=18)
    elif design == "comet":
        d.ellipse([cx + 40, cy - 130, cx + 170, cy], fill=c1 + (255,))
        for i in range(4):
            d.line([(cx + 40 - i * 30, cy - 65 - i * 8), (cx - 170, cy + 40 + i * 22)], fill=c2 + (255,), width=14 - i * 2)
    elif design == "prism":
        d.polygon([(cx, cy - 160), (cx + 140, cy + 110), (cx - 140, cy + 110)], outline=c1 + (255,), width=22)
        d.line([(cx - 170, cy - 60), (cx - 60, cy - 60)], fill=c2 + (255,), width=12)
        d.line([(cx + 20, cy + 20), (cx + 150, cy + 90)], fill=c2 + (255,), width=12)
    elif design == "mask":
        d.ellipse([cx - 160, cy - 110, cx + 160, cy + 110], fill=c1 + (255,))
        d.ellipse([cx - 110, cy - 40, cx - 20, cy + 10], fill=(30, 30, 40, 255))
        d.ellipse([cx + 20, cy - 40, cx + 110, cy + 10], fill=(30, 30, 40, 255))
        d.arc([cx - 70, cy + 10, cx + 70, cy + 90], 0, 180, fill=(30, 30, 40, 255), width=14)
    elif design == "scroll":
        d.rounded_rectangle([cx - 150, cy - 110, cx + 150, cy + 110], radius=20, fill=c1 + (255,))
        d.line([(cx - 100, cy - 50), (cx + 100, cy - 50)], fill=white, width=10)
        d.line([(cx - 100, cy), (cx + 100, cy)], fill=white, width=10)
        d.line([(cx - 100, cy + 50), (cx + 40, cy + 50)], fill=white, width=10)
    elif design == "wand":
        d.line([(cx - 120, cy + 130), (cx + 120, cy - 130)], fill=c1 + (255,), width=20)
        _star(d, cx + 130, cy - 140, 52, c2 + (255,), points=4)
        _star(d, cx + 60, cy - 60, 26, (255, 220, 120, 255), points=4)
    elif design == "coin":
        d.ellipse([cx - 140, cy - 140, cx + 140, cy + 140], fill=c1 + (255,))
        d.ellipse([cx - 105, cy - 105, cx + 105, cy + 105], outline=white, width=10)
        _star(d, cx, cy, 62, white, points=5)
    elif design == "cup":
        d.polygon([(cx - 110, cy - 120), (cx + 110, cy - 120), (cx + 80, cy + 110), (cx - 80, cy + 110)], fill=c1 + (255,))
        d.arc([cx + 80, cy - 90, cx + 190, cy + 40], -90, 90, fill=c1 + (255,), width=20)
        d.line([(cx - 70, cy - 160), (cx + 70, cy - 160)], fill=c2 + (255,), width=14)
    elif design == "book":
        d.rounded_rectangle([cx - 150, cy - 120, cx + 150, cy + 130], radius=18, fill=c1 + (255,))
        d.rectangle([cx - 12, cy - 120, cx + 12, cy + 130], fill=c2 + (255,))
        d.line([(cx - 110, cy - 60), (cx - 30, cy - 60)], fill=white, width=10)
        d.line([(cx + 30, cy - 60), (cx + 110, cy - 60)], fill=white, width=10)
        d.line([(cx - 110, cy), (cx - 30, cy)], fill=white, width=10)
        d.line([(cx + 30, cy), (cx + 110, cy)], fill=white, width=10)
    elif design == "pen":
        d.polygon([(cx - 140, cy + 100), (cx + 60, cy - 140), (cx + 140, cy - 100), (cx - 60, cy + 140)], fill=c1 + (255,))
        d.polygon([(cx - 140, cy + 100), (cx - 170, cy + 170), (cx - 60, cy + 140)], fill=c2 + (255,))
    elif design == "globe":
        d.ellipse([cx - 150, cy - 150, cx + 150, cy + 150], fill=c1 + (255,))
        d.ellipse([cx - 60, cy - 150, cx + 60, cy + 150], outline=white, width=10)
        d.line([(cx - 150, cy), (cx + 150, cy)], fill=white, width=10)
        d.ellipse([cx - 150, cy - 150, cx + 150, cy + 150], outline=c2 + (255,), width=8)
    elif design == "hourglass":
        d.polygon([(cx - 120, cy - 170), (cx + 120, cy - 170), (cx, cy), (cx - 120, cy + 170), (cx + 120, cy + 170), (cx, cy)], fill=c1 + (255,))
        d.rectangle([cx - 140, cy - 180, cx + 140, cy - 150], fill=c2 + (255,))
        d.rectangle([cx - 140, cy + 150, cx + 140, cy + 180], fill=c2 + (255,))
    elif design == "puzzle":
        d.rounded_rectangle([cx - 110, cy - 110, cx + 110, cy + 110], radius=24, fill=c1 + (255,))
        d.ellipse([cx - 26, cy - 150, cx + 26, cy - 70], fill=c1 + (255,))
        d.ellipse([cx + 70, cy - 26, cx + 150, cy + 26], fill=c1 + (255,))
    elif design == "ribbon":
        d.polygon([(cx - 170, cy - 60), (cx + 170, cy - 60), (cx + 170, cy + 40), (cx - 170, cy + 40)], fill=c1 + (255,))
        d.polygon([(cx - 170, cy - 60), (cx - 110, cy - 10), (cx - 170, cy + 40)], fill=c2 + (255,))
        d.polygon([(cx + 170, cy - 60), (cx + 110, cy - 10), (cx + 170, cy + 40)], fill=c2 + (255,))
        d.polygon([(cx - 40, cy - 90), (cx + 40, cy - 90), (cx + 60, cy + 70), (cx - 60, cy + 70)], fill=c2 + (255,))
    else:
        _star(d, cx, cy, 150, c1 + (255,))
    # White outline for pop: draw the shape mask edge (cheap approximation —
    # outline is drawn by stroking the alpha mask).
    alpha = img.split()[3]
    edge = alpha.filter(ImageFilter.FIND_EDGES).point(lambda v: 255 if v > 30 else 0)
    outline = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    od = ImageDraw.Draw(outline)
    # Dilate the edge by pasting the mask shifted in 4 directions (white halo).
    halo = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    for dx, dy in ((6, 0), (-6, 0), (0, 6), (0, -6), (4, 4), (-4, -4), (4, -4), (-4, 4)):
        shifted = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        shifted.paste(Image.new("RGBA", (S, S), (255, 255, 255, 255)), (dx, dy), alpha)
        halo = Image.alpha_composite(halo, shifted)
    img = Image.alpha_composite(halo, img)
    dest = OUT / "stickers" / f"{p['id']}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest)
    return dest



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
    done = []
    for p in prompts:
        if p["kind"] == "texture":
            dest = render_texture(p)
        elif p["kind"] == "frame":
            dest = render_frame(p)
        elif p["kind"] == "sticker":
            dest = render_sticker(p)
        else:
            raise ValueError(p["kind"])
        done.append({"id": p["id"], "kind": p["kind"], "name": p["name"],
                     "design": p["design"], "file": f"/ai-library/images/{p['kind']}s/{p['id']}.png"
                     if p["kind"] == "sticker" else f"/ai-library/images/{p['kind']}s/{p['id']}.png",
                     "width": p["width"], "height": p["height"],
                     "size": dest.stat().st_size, "tags": p["tags"], "seed": p["seed"]})
    _merge_state("state-images.json", done)
    print(f"rendered {len(done)} images")


if __name__ == "__main__":
    main()
