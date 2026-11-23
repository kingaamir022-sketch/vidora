# G-CHROMA — Chroma key
- **Phase:** 2
- **Reference behaviour:** Chroma key removes a chosen colour (e.g. a green screen) with tolerance and smoothness controls, per clip, per pixel in the compositor. [ASSUMED] Tolerance is a colour-distance threshold (0 = exact colour only, 1 = everything); smoothness feathers the key edge.
- **Where it lives:** Properties panel → Mask & Compositing → 'Chroma key'.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Checkbox | Enable (chroma key) | — | — | off | — |  |
| Color | Key colour | — | — | #00FF00 | — | Colour picker |
| Slider | Chroma tolerance | 0 | 1 | 0.3 | 0.05 |  |
| Slider | Chroma smoothness | 0 | 1 | 0.1 | 0.05 |  |

## Interactions
Select a clip, enable chroma key, pick the key colour, drag tolerance/smoothness.

## States
Controls are visible only when the section is open; they are disabled in effect until Enable is ticked.

## Result
Matching pixels become transparent in the preview, revealing lower tracks or the background.

## Edge cases
Very high tolerance keys out skin tones and similar colours too — lower it until only the screen disappears. Default key colour is green.

## Evidence
`src/components/MaskPanel.tsx`, `src/lib/compositor.ts` · Audit: `audit/phase2/G-CHROMA/`

## Status
MATCH
