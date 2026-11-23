# F-WHEELS — Lift/gamma/gain colour wheels
- **Phase:** 2 (corrected 0.3.2, live CapCut Web check 2026-11-22)
- **Reference behaviour:** CapCut Web has NO lift/gamma/gain colour wheels anywhere — only sliders. Vidora keeps the wheels because the master spec requires them. This is a deliberate extra, not a bug. HSL and blend modes are covered separately in `docs/behavior/F-BLEND.md` (both present in CapCut Web).
- **Where it lives:** Adjustment left panel → 'Colour wheels' section.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Slider | Lift (shadows) R/G/B | -1 | 1 | 0 | 0.05 | Per channel |
| Slider | Gamma (mid-tones) R/G/B | -1 | 1 | 0 | 0.05 | Per channel |
| Slider | Gain (highlights) R/G/B | -1 | 1 | 0 | 0.05 | Per channel |

## Interactions
Select a clip, open Adjustment, drag the wheel sliders.

## States
Wheels at 0 are neutral.

## Result
Lift/gamma/gain apply live in the preview.

## Edge cases
The wheels' −1–1 range maps to a lift/gamma/gain multiplier around neutral.

## Evidence
`src/components/ColorPanel.tsx`, `src/lib/color.ts` (applyWheel) · Live check: `docs/reference/capcut/WEB-CHECK-2026-11-22.md` §8 · Audit: `audit/phase2/F-WHEELS/`

## Status
INTENTIONAL-DIFF (spec-required extra; CapCut Web has sliders only, no wheels)
