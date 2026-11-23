# N-BACKGROUNDS — Backgrounds & overlays library (Phase 5: 30 items)
- **Phase:** 5
- **Reference behaviour:** No backgrounds/overlays library was observed in the reference (the reference has a Background section in the clip inspector with colour/blur/image modes, and a "Background color" picker — FULL-WALKTHROUGH-2026-11-23.md, inspector Basic/Background). Vidora's library is therefore original, marked ASSUMED: a Backgrounds section in the Media tab's Built-in assets area listing 30 original items — 12 gradients, 8 patterns, 4 grain/dust overlays, 6 frames — each with a live SVG thumbnail; clicking one adds it as a full-canvas background clip on a new track (a sticker clip whose SVG is the background artwork, so it uses the normal clip pipeline: move/scale/opacity/duration, undoable, autosaved).
- **Where it lives:** Catalog in `src/lib/backgrounds.ts` (`BACKGROUND_CATALOG`, 30 entries; `backgroundSvg(id)` renders the SVG); section in `src/components/MediaBrowser.tsx` (Built-in assets); background clips are sticker clips resolved by `backgroundById` in the preview renderer.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| List | Categories | — | — | All | — | All, Gradients, Patterns, Grain & Dust, Frames |
| Buttons | Background cards (30) | — | — | — | — | Live SVG thumbnail; click to add |
| Note | Full-canvas | — | — | — | — | A background clip covers the whole canvas at 16:9 by default |

## Interactions
Open the Media tab, scroll to Built-in assets → Backgrounds, pick a category, click a card — a 5-second background clip is added on a new track at the playhead and selected. Drag its edges to change duration; use Transform to reposition it.

## States
Grain/dust overlays are semi-transparent by design (they sit over video). Frames are transparent in the middle (they frame the video beneath). Gradients/patterns are opaque.

## Result
30 original backgrounds/overlays, all procedural SVG (no image files), all addable as clips, all undoable and autosaved.

## Edge cases
A background clip on the top track covers everything beneath it while it is active (opaque items) — the panel says so. Grain/dust items use a seeded pattern so the same frame always looks the same.

## Evidence
`src/lib/backgrounds.ts` (BACKGROUND_CATALOG, 30 entries) · Audit: `audit/phase5/N-BACKGROUNDS/` (count, every item renders SVG, add-to-timeline works)

## Status
ASSUMED
