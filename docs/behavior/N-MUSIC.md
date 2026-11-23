# N-MUSIC — Procedural music & SFX library (Phase 5: 30 loops, 100 SFX)
- **Phase:** 4 → 5 (Phase 4 shipped 7 loops + 8 SFX; Phase 5 grows them to 30 loops + 100 SFX)
- **Reference behaviour:** The reference Audio tab has Music / Sound effects sub-tabs with a search box, suggestion chips, a Categories tile grid, a Recommended list (cover, title, duration, author) and play + "+" add buttons (full walkthrough 2026-11-23, Audio tab). Track/SFX NAMES and authors shown are CapCut content — all Vidora loop/SFX names are ORIGINAL, and every sound is synthesized in-browser with Web Audio (OfflineAudioContext) from original recipes — no audio files ship, no melodies are copied. [ASSUMED] Vidora keeps the Phase 4 model (Audio tab, Music/SFX sub-tabs, search + chips + categories + Recommended rows, play to preview, "+" to add as an audio clip) and grows the catalog; the reference's exact category list and recommendation order were never observed on desktop.
- **Where it lives:** Recipes in `src/lib/audio.ts` (`ORIGINAL_LOOPS`, 30 entries; `ORIGINAL_SFX`, 100 entries; `renderOriginal`, `playPreview`); Audio tab in `src/components/AudioPanel.tsx`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Sub-tabs | Music / Sound effects | — | — | Music | — | Switches the catalog |
| Text input | Search music / SFX | — | — | empty | — | Substring on name/category/tags |
| Chips | Categories | — | — | All | — | Per sub-tab category list |
| Buttons | Play (per row) | — | — | — | — | Renders the recipe and previews it |
| Buttons | + Add (per row) | — | — | — | — | Renders and adds it as an audio clip on the timeline |

## Interactions
Open the Audio tab, pick Music or Sound effects, search or pick a category, press play on a row to preview it, press "+" to add it — the recipe renders to WAV in the browser and lands as a normal audio clip (volume, fades, EQ, normalize all apply).

## States
Rendering a recipe takes a moment (OfflineAudioContext); the row shows a brief "Rendering…" state. A rendered clip is cached by recipe id for the session so replay is instant.

## Result
30 original loops (8–16 s, BPM-tagged, loopable) and 100 original SFX (0.2–3 s), all synthesized, all addable as clips, undoable and autosaved (the recipe id is stored on the clip; audio is re-rendered from the recipe, never stored as a file).

## Edge cases
A recipe that fails to render shows a readable error and adds nothing. Loops render at their BPM with a clean loop point (the pattern length is a whole number of bars).

## Evidence
`src/lib/audio.ts` (ORIGINAL_LOOPS, ORIGINAL_SFX) · Audit: `audit/phase5/N-MUSIC/` (counts, every recipe renders to non-silent audio, add-to-timeline works)

## Status
ASSUMED
