# N-CAPTIONPRESETS — Caption style presets (Phase 5: 23 presets, word highlight)
- **Phase:** 3 → 5 (Phase 3 shipped 8 caption styles; Phase 5 grows them to 23 (Word category: word-pop, word-karaoke, word-bounce) and adds word-level highlight)
- **Reference behaviour:** The reference Captions tab has template styles (Favorites/Trending/Classic/NEW/Hits/Word) plus Auto captions / Auto lyrics / Generate / Delete (desktop screenshot 26). Style NAMES shown are CapCut content — all 23 Vidora caption preset names are ORIGINAL. [ASSUMED] Vidora keeps the Phase 3 model (style picker in the Captions panel; the active style applies to all cues in the project) and adds word-level highlight: the word active at the playhead renders in the preset's `highlight` colour (and `highlightBackground` when set) while the other words stay in the base colour — the reference's karaoke-style looks suggest this, but the exact highlight behaviour was never observed, so it is marked ASSUMED.
- **Where it lives:** `src/lib/captions.ts` (`CAPTION_STYLE_PRESETS`, 23 entries; `CaptionStylePreset` gains `highlight` + `highlightBackground`); picker in `src/components/CaptionsPanel.tsx`; rendering in `src/components/PreviewArea.tsx` (caption overlay uses `wordAt` to highlight the active word).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Buttons | Style presets (23) | — | — | Classic Box | — | Grid with a live sample line; click to apply |
| Note | Word highlight | — | — | — | — | Active word renders in the preset's highlight colour |

## Interactions
Open the Captions tab, pick a style — all cues re-render in it at once, and during playback the active word highlights. The choice is stored on the project (`captionStyleId`), undoable and autosaved.

## States
No cues yet: the picker still works (the style applies when cues are generated). A cue with no words: renders as a plain line, no highlight.

## Result
20 original caption presets, each with base colour/background/font size/position plus a highlight colour; the active word is visually distinct at every playhead position.

## Edge cases
Word timings are the cue's evenly-distributed timings (Phase 3 behaviour) — highlight follows the same timings. Highlight colour defaults to the base colour when a preset does not set one.

## Evidence
`src/lib/captions.ts` (CAPTION_STYLE_PRESETS, 23 entries) · Audit: `audit/phase5/N-CAPTIONPRESETS/` (count, every preset applies, active word highlights)

## Status
ASSUMED
