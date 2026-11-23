# G-MASK — Masks — shapes, pen, feather, invert, keyframes
- **Phase:** 2
- **Reference behaviour:** A mask limits a clip to a shape. Shapes: linear, mirror, circle, rectangle, heart, star, custom pen (click points on the preview). Feather softens the edge; Invert flips inside/outside; maskFeather is keyframeable. The preview shows a 'MASK: <SHAPE>' badge and, in pen mode, 'click to add pen points'. [ASSUMED] The mask applies in the compositor before effects; pen points form a polygon in click order.
- **Where it lives:** Properties panel → Mask & Compositing section.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Mask shape | — | — | None | — | None / linear / mirror / circle / rectangle / heart / star / Custom pen |
| Slider | Mask feather | 0 | 1 | 0 | 0.05 |  |
| Checkbox | Invert mask | — | — | off | — |  |
| Button | Add pen points (mode) | — | — | — | — | Only for pen shape; preview clicks add points |
| Button | Clear pen points | — | — | — | — | Only for pen shape |

## Interactions
Select a clip, pick a mask shape, drag Feather, tick Invert. For pen: choose 'Custom pen', click 'Add pen points', click points on the preview.

## States
Pen mode changes the preview cursor to a crosshair and the badge text. The mask is stored on the clip.

## Result
The clip renders masked in the preview (and export); feather softens the edge; invert swaps the visible area.

## Edge cases
Pen points cannot be dragged after placing (clear and re-click to redo). Mask + chroma key together apply mask first, then keying.

## Evidence
`src/components/MaskPanel.tsx`, `src/lib/masks.ts`, `src/lib/compositor.ts` · Audit: `audit/phase2/G-MASK/`

## Status
MATCH
