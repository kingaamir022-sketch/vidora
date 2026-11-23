# H-STICKER — Stickers panel
- **Phase:** 3
- **Reference behaviour:** The Stickers tab shows a search box ("People are searching follow"), a category list — Yours (dropdown), Stickers (expanded) with Trending, Black Friday, Classic, NEW, Animal Meme, Free Fire, Shapes — and a grid of sticker cards, each with a download icon and a Pro diamond badge on some. The full signed-in walkthrough (2026-11-23) adds that Web's Elements tab also has a Stickers section (some Pro). UNKNOWN — desktop evidence still missing: whether a desktop sticker is added by click or by drag; what "Yours" contains; what the "Shapes" category grid shows (only the category name is visible in the screenshot); how a downloaded sticker behaves (download progress? cached?); the full category list beyond what is visible (the list may scroll). All Vidora sticker artwork and names are ORIGINAL procedural SVG — no reference sticker art or names are copied, and Vidora has no downloads or Pro badges: every sticker is built in.
- **Where it lives:** Stickers left panel (`src/components/StickersPanel.tsx`); catalog in `src/lib/stickers.ts` (`STICKER_CATALOG` — 28 base designs × 8 palettes = 224 stickers); rendering in `src/components/PreviewArea.tsx` (`renderStickerFrame`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | Search stickers | — | — | empty | — | Case-insensitive substring on name/category |
| Buttons | Categories (8) | — | — | Faces | — | Faces, Arrows, Shapes, Badges, Speech, Nature, Celebration, Symbols |
| Buttons | Sticker grid | — | — | — | — | 64 shown per page of results; click to add |
| Note | Original artwork | — | — | — | — | Panel states all stickers are original procedural SVG |

## Interactions
Open the Stickers tab, pick a category or type a search, click a sticker — a 3-second sticker clip is added on a text track at the playhead and selected. Move/scale/rotate it with the Transform section; loop animations apply as for text.

## States
No matches: the panel says "No stickers match. Try another word." More than 64 results: the first 64 are shown with a "refine your search" note.

## Result
The sticker renders in the preview at the clip's position/scale/rotation with its loop animation; the clip is stored in the project JSON, undoable and autosaved.

## Edge cases
Search with an empty query shows the selected category. A sticker clip has no source media file — its SVG is stored inline in the clip.

## Evidence
Desktop screenshot 22-editor-stickers.png (search + categories + grid with download/Pro badges; viewed directly) · full signed-in walkthrough 2026-11-23 (`docs/reference/capcut/FULL-WALKTHROUGH-2026-11-23.md`: Web Elements tab has a Stickers section, some Pro) · `src/lib/stickers.ts`, `src/components/StickersPanel.tsx`

## Status
MATCH
