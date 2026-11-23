# H-DRAW — Drawing / pen tool
- **Phase:** 3
- **Reference behaviour:** UNKNOWN — the full signed-in walkthrough (2026-11-23 07:16–07:28 PKT, `docs/reference/capcut/FULL-WALKTHROUGH-2026-11-23.md`, "Still open") also found NO drawing/pen tool anywhere in the reference — no draw mode, pen colour, or stroke UI in the 30 desktop screenshots, the two Web checks, or the full signed-in walkthrough. Desktop evidence is still missing entirely, so the reference behaviour stays UNKNOWN. This card records the VIDORA implementation only. Vidora's tool: a "Draw" mode in the Stickers panel; drag on the preview to draw freehand strokes (colour + width pickers); strokes are stored on a drawing clip and rendered in the preview; a Clear button removes them.
- **Where it lives:** Draw section of the Stickers panel (`src/components/StickersPanel.tsx`); pointer handling in `src/components/PreviewArea.tsx` (`onCanvasPointerDown/Move/Up`); rendering in `src/components/PreviewArea.tsx` (`renderDrawingFrame`); strokes stored on the clip (`clip.drawing.strokes`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Toggle | Draw on the preview | — | — | off | — | While on, the preview cursor is a crosshair |
| Colour | Pen colour | — | — | #FFFFFF | — | Applies to the next stroke |
| Slider | Pen width | 1 | 40 | 4 | 1 | px (scaled to preview size) |
| Button | Clear drawing strokes | — | — | — | — | Shown when a drawing clip is selected |

## Interactions
In the Stickers panel click "Draw on the preview", then drag on the preview: each drag is one stroke. Releasing the mouse stores the stroke. Drawing with a drawing clip selected appends to it; otherwise a new 5s drawing clip is created at the playhead. Click the toggle again to stop drawing.

## States
Draw mode on: the transport bar shows "· drawing". Strokes render as round-capped polylines in their colour/width. A stroke with fewer than 2 points is discarded.

## Result
Strokes appear on the preview immediately and persist on the drawing clip in the project JSON, undoable and autosaved.

## Edge cases
Draw mode, mask pen mode and tracking-point mode share the preview pointer: draw mode wins while it is on. Points are stored normalised (0–1) so strokes survive aspect-ratio changes.

## Evidence
No reference evidence found in desktop screenshots 01–30, WEB-CHECK-2026-11-22.md / WEB-CHECK-2026-11-23.md, or the full signed-in walkthrough 2026-11-23 (`docs/reference/capcut/FULL-WALKTHROUGH-2026-11-23.md`, "Still open: draw/pen tool") — the drawing tool is spec-built (SPEC H) and no reference draw tool has been found in any check so far · `src/components/StickersPanel.tsx`, `src/components/PreviewArea.tsx`

## Status
UNKNOWN
