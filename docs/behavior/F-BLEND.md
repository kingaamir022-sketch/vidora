# F-BLEND — HSL and blend modes
- **Phase:** 2 (corrected 0.3.2, live CapCut Web check 2026-11-22)
- **Reference behaviour:** HSL IS present in CapCut Web (per-colour swatches with Hue/Saturation/Lightness sliders + number fields). Blend modes ARE present in the Basic panel as a "Blend" dropdown — Normal, Overlay, Screen, Darken, Brighten, Hard light, Multiply, Soft light, Linear burn, Color burn, Color dodge — plus Opacity 0–100%. The blend applies live to the preview. Vidora matches: HSL sliders, the same dropdown (Linear burn omitted — it has no canvas/CSS equivalent), live in the preview; blend opacity is the clip's Transform → Opacity.
- **Where it lives:** Adjustment left panel → 'HSL' section and 'Blend mode' dropdown.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Slider | HSL hue | -180 | 180 | 0 | 1 | degrees |
| Slider | HSL saturation | -1 | 1 | 0 | 0.05 |  |
| Slider | HSL lightness | -1 | 1 | 0 | 0.05 |  |
| Select | Blend mode | — | — | normal | — | Normal, Overlay, Screen, Darken, Brighten, Hard light, Multiply, Soft light, Color burn, Color dodge, Difference |
| Number | Opacity (Transform) | 0 | 1 | 1 | 0.05 | Blend opacity, in the Properties panel |

## Interactions
Select a clip, open Adjustment, drag HSL sliders or pick a blend mode; the preview updates at once.

## States
The blend dropdown shows the current mode; the panel explains that Linear burn is not offered (no canvas equivalent).

## Result
HSL and blend mode apply live in the preview and in export (export records the preview canvas).

## Edge cases
Blend 'normal' composites as source-over. Difference and the burn/dodge modes need visible layers beneath the clip to show an effect.

## Evidence
`src/components/ColorPanel.tsx`, `src/components/PreviewArea.tsx` (drawBlended), `src/lib/color.ts` (canvasBlendMode) · Live check: `docs/reference/capcut/WEB-CHECK-2026-11-22.md` §8 · Audit: `audit/phase2/F-WHEELS/`

## Status
MATCH (live CapCut Web check 2026-11-22)
