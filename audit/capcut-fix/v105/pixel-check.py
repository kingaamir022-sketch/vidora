#!/usr/bin/env python3
"""Pixel proof for v1.0.5 item 1: sample each dashboard template card's
thumb region in verify-templates.png and report the share of non-black
pixels. A fixed card shows its background SVG + title text (well above
black); the bug showed pure #141414/black (near 0%).
Reads card rects from verify.json (templateCards[].thumbRect, CSS px ==
PNG px at deviceScaleFactor 1). Appends results to verify.json.
Run: python3 audit/capcut-fix/v105/pixel-check.py
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path('/home/hatch/workspace/vidora')
OUT = ROOT / 'audit' / 'capcut-fix' / 'v105'
verify_path = OUT / 'verify.json'
checks = json.loads(verify_path.read_text())
img = Image.open(OUT / 'verify-templates.png').convert('RGB')
print('screenshot size:', img.size)

results = {}
ok = True
for card in checks.get('templateCards', []):
    r = card['thumbRect']
    x0, y0, w, h = r['x'], r['y'], r['w'], r['h']
    if w <= 0 or h <= 0:
        results[card['name']] = {'nonBlackPct': 0.0, 'verdict': 'FAIL — zero-size thumb'}
        ok = False
        continue
    px = img.crop((x0, y0, x0 + w, y0 + h))
    data = list(px.getdata())
    nonblack = sum(1 for (r_, g_, b_) in data if max(r_, g_, b_) > 40)
    pct = round(100.0 * nonblack / max(1, len(data)), 1)
    mean = round(sum(max(r_, g_, b_) for (r_, g_, b_) in data) / max(1, len(data)), 1)
    verdict = 'PASS' if pct >= 5.0 else 'FAIL — still black'
    if pct < 5.0:
        ok = False
    results[card['name']] = {'nonBlackPct': pct, 'meanMaxChannel': mean, 'verdict': verdict}
    print(f"{card['name']}: non-black {pct}% mean {mean} -> {verdict}")

checks['templateCardPixels'] = results
checks['templateCardPixelsOk'] = ok
verify_path.write_text(json.dumps(checks, indent=1))
print('PIXEL CHECK:', 'PASS' if ok else 'FAIL')
raise SystemExit(0 if ok else 1)
