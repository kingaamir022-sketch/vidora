# H-SHAPE — Shapes
- **Phase:** 3
- **Reference behaviour:** The Stickers tab's category list includes a "Shapes" entry (desktop screenshot 22, bottom of the Stickers section). UNKNOWN — the full signed-in walkthrough (2026-11-23) also showed no Shapes grid anywhere (Web's Elements tab has Stock videos, Photos, AI avatars and Stickers — no Shapes section): what the desktop Shapes grid contains (no shape is visible in the screenshot — only the category name); whether desktop shapes have a fill-colour picker, outlines, or sizes; how a desktop shape is added (click? drag?). Vidora's shapes are ORIGINAL procedural SVG: rectangle, circle, triangle, star, heart, arrow, line, speech bubble, badge, frame — each with a fill-colour picker, added as a 3s sticker clip.
- **Where it lives:** Shapes section of the Stickers panel (`src/components/StickersPanel.tsx`); shape definitions and SVG generation in `src/lib/stickers.ts` (`SHAPE_DEFS`, `shapeSvg`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Colour | Fill colour | — | — | #7C3AED | — | Applies to the next shape added |
| Buttons | Shapes (10) | — | — | — | — | Rectangle, Circle, Triangle, Star, Heart, Arrow, Line, Speech Bubble, Badge, Frame |

## Interactions
In the Stickers panel, pick a fill colour, click a shape — a 3-second shape clip is added on a text track at the playhead. Transform, opacity and loop animations apply as for stickers.

## States
The fill colour picker shows the current fill as a hex value. Each shape button previews the shape in the current fill colour.

## Result
The shape renders in the preview; the clip stores the shape's SVG inline (kind 'shape'), undoable and autosaved.

## Edge cases
An invalid fill colour falls back to Vidora violet (#7C3AED). The Frame shape is an outline (stroke only, no fill).

## Evidence
Desktop screenshot 22-editor-stickers.png (the "Shapes" category name in the Stickers section — grid contents NOT visible) · the full signed-in walkthrough 2026-11-23 (`docs/reference/capcut/FULL-WALKTHROUGH-2026-11-23.md`) shows no Shapes grid either (Elements: Stock videos, Photos, AI avatars, Stickers) · `src/lib/stickers.ts` (`SHAPE_DEFS`, `shapeSvg`)

## Status
UNKNOWN
