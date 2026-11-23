# F-CURVES — RGB curves editor
- **Phase:** 2 (corrected 0.3.2, live CapCut Web check 2026-11-22)
- **Reference behaviour:** Per-channel RGB curves: clicking the line adds a point, dragging a point bends the curve, reset restores a straight line. CapCut Web's Curves tab has white/R/G/B channels and presets: Custom, Lighten, Darken, Fade, Contrast, Cool tone, Warm tone, Vintage. Points sort by x and the curve interpolates linearly between them.
- **Where it lives:** Adjustment left panel → 'RGB curves' section.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Buttons | Channel R / G / B | — | — | R | — | Active channel highlighted |
| SVG | RGB curves editor | — | — | — | — | 100×100 viewBox, crosshair cursor; click adds, drag moves |
| Buttons | Curve presets | — | — | Custom | — | Custom, Lighten, Darken, Fade, Contrast, Cool tone, Warm tone, Vintage (apply to the active channel) |
| Button | Reset curve | — | — | — | — | Restores [(0,0),(1,1)] for the active channel |
| Text | <n> point(s) on the <CH> curve. | — | — | — | — | Read-only count |

## Interactions
Open Adjustment, click inside the curve box to add a point at that x/y; drag a point to move it (it cannot cross its neighbours); switch channel with R/G/B; apply a preset; Reset to clear.

## States
The active channel's polyline is drawn in its colour (red/green/blue); points are white circles with a violet ring.

## Result
The preview applies the curve for that channel immediately.

## Edge cases
A dragged point is clamped between its neighbours so the curve stays a function of x. Clicking the same x twice adds a duplicate point (harmless; they sort together). Points cannot be individually deleted yet (Reset clears — Phase 8 polish).

## Evidence
`src/components/ColorPanel.tsx`, `src/lib/color.ts` (moveCurvePoint, curvePreset) · Live check: `docs/reference/capcut/WEB-CHECK-2026-11-22.md` §7 · Audit: `audit/phase2/F-CURVES/`

## Status
MATCH (live CapCut Web check 2026-11-22)
