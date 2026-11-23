# A-ASSETS — Built-in assets browser (Phase 5: real library)
- **Phase:** 1 → 5 (Phase 1–4 showed an honest placeholder; Phase 5 makes it a real browser)
- **Reference behaviour:** The reference's asset browsers (Effects rows, Transitions rows, Filters rows, Elements, Library) share one shape: a search box, category chips/rows, and a grid of cards with thumbnails (FULL-WALKTHROUGH-2026-11-23.md). Vidora's Built-in assets section in the Media tab follows that shape: a search box, category rows for each library (Effects, Transitions, LUTs, Stickers, Backgrounds, Fonts, Templates, Music, SFX), and cards with live thumbnails. Every item is ORIGINAL procedural content — no stock downloads, no reference names. [ASSUMED] Clicking a card adds the asset to the project (effect/LUT to the selected clip, sticker/background/template to the timeline, music/SFX as an audio clip); the reference's per-item add behaviour was never observed per library, so Vidora uses one consistent click-to-add rule and says so in the panel.
- **Where it lives:** Built-in assets section in `src/components/MediaBrowser.tsx`; counts from `assets/manifest.json` (`src/lib/assetLibrary.ts` — `ASSET_LIBRARY_SUMMARY`); each library's own panel still holds its full browser (Effects, Transitions, Filters, Stickers, Audio, Templates).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | Search assets | — | — | empty | — | Substring across all libraries |
| List | Library rows | — | — | — | — | Effects (62), Transitions (32), LUTs (32), Stickers (232), Backgrounds (30), Fonts (40), Templates (25), Music (30), SFX (100) |
| Buttons | Asset cards | — | — | — | — | Live thumbnail; click to add |
| Note | Original content | — | — | — | — | Panel states every asset is original/procedural |

## Interactions
Open the Media tab, scroll to Built-in assets, search or pick a library row, click a card — the asset is added (see the per-library cards for what "added" means). Counts come from the generated manifest, so they always match the catalogs.

## States
Search with no matches: "No assets match. Try another word." A library with zero items (never in Phase 5): the row shows "0 items — not built yet" instead of fake cards.

## Result
One honest browser for the whole procedural library; every card is a real asset that works when clicked.

## Edge cases
The browser never shows a download icon or a Pro badge — everything is built in.

## Evidence
`src/components/MediaBrowser.tsx`, `assets/manifest.json` · Audit: `audit/phase5/A-ASSETS/` (counts match manifest, search works, a card from each row adds)

## Status
MATCH
