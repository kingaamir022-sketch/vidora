# F-ADJUST — Colour sliders — brightness to sharpen
- **Phase:** 2
- **Reference behaviour:** Ten adjustment sliders change the clip's colour live in the preview. All values are stored per clip in the adjustment object and are keyframeable via the brightness property. [ASSUMED] Slider ranges are centred on 0 (neutral) except Sharpen (0–1) and Hue (−180–180°).
- **Desktop evidence (2026-11-23) — layout difference, noted for a later review, NO score change and NO Phase 2 rebuild in this round:** desktop has a DEDICATED Adjustment tab (desktop screenshot 28) with an "Add adjustment" button and Yours / Brand presets / LUT sections plus saved preset cards (one shown with a thumbnail and a name). Vidora puts its colour sliders in the Adjustment tab's panel (the right Properties panel holds clip Transform/Speed). The controls exist in Vidora; only the placement differs. Whether the desktop "Add adjustment" opens sliders, and what a saved preset stores, is UNKNOWN — full check pending.
- **Where it lives:** Adjustment left panel (`src/components/ColorPanel.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Slider | Brightness | -1 | 1 | 0 | 0.05 |  |
| Slider | Contrast | -1 | 1 | 0 | 0.05 |  |
| Slider | Saturation | -1 | 1 | 0 | 0.05 |  |
| Slider | Exposure | -2 | 2 | 0 | 0.1 |  |
| Slider | Highlights | -1 | 1 | 0 | 0.05 |  |
| Slider | Shadows | -1 | 1 | 0 | 0.05 |  |
| Slider | Temperature | -1 | 1 | 0 | 0.05 |  |
| Slider | Tint | -1 | 1 | 0 | 0.05 |  |
| Slider | Hue | -180 | 180 | 0 | 1 | degrees |
| Slider | Sharpen | 0 | 1 | 0 | 0.05 | 3×3 convolution |

## Interactions
Select a clip, open the Adjustment tab, drag any slider.

## States
Each slider shows its value to 2 decimals. With no clip selected the panel asks to select one. A Reset button restores all defaults.

## Result
The preview recolours live; values persist in the project.

## Edge cases
Exposure ±2 is the widest range; dragging beyond a range end stops at the limit. Sharpen 0 means no sharpening pass.

## Evidence
`src/components/ColorPanel.tsx`, `src/lib/color.ts` · Audit: `audit/phase2/F-ADJUST/` · Desktop screenshot 28-editor-adjustment.png (dedicated Adjustment tab: Add adjustment + Yours/Brand presets/LUT + saved preset cards — layout difference vs Vidora, noted for later review)

## Status
MATCH
