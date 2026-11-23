# J-AUDIO — Audio tab (Music / Sound effects)
- **Phase:** 4
- **Reference behaviour:** The Audio tab opens a wide panel with two sub-tabs: "Music" (selected) and "Sound effects". Music: a "Search music" box, suggestion chips (background music, phonk, Happy New Year, tiktok, happy, hip hop, love, sad, funny, rap), a "Categories" section with "View all" opening a tile grid (RECOMMEND, POP, R&B, PROMISING, MARKETING, TRAVEL, VLOG, FRESH, HEALING, WARM, HIGH TEMPO, BEAT, LOVE, LOVE LESSONS, ROCK, PROMOTION, and more), a "Favorites" section with "View all", then a "Recommended" grid of tracks with cover, title, duration and author. Each track row has a play button (preview) and a "+" button (add to timeline). Sound effects: its own "Search sound effects" box, chips (vine boom, boom, explosion, woosh, glitch, scream, beep, bruh, gasp, wow), "Favorites" (View all), "Categories" and a "Recommended" list with play, name, duration and author. Track/sound NAMES shown in the reference are CapCut content — Vidora's music/SFX must be original or openly licensed (Phase 5/6).
- **Where it lives:** Audio left panel (`src/components/AudioPanel.tsx`); library data in `src/lib/audio.ts` (`ORIGINAL_LOOPS`, `ORIGINAL_SFX`); playback preview via `playPreview` in the same lib.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Sub-tabs | Music / Sound effects | — | — | Music | — | Each has its own search + chips + list |
| Text input | Search music / Search sound effects | — | — | empty | — | Filters rows by name/tag, per sub-tab |
| Chips | Suggestion chips | — | — | — | — | Music and SFX have different chip sets; clicking a chip sets the search text |
| Buttons | Categories / View all | — | — | — | — | Categories open a tile grid; picking a tile filters the list |
| List | Recommended tracks / sounds | — | — | — | — | Cover (generated swatch), title, duration, author "Vidora Originals"; each row: play button + "+" Add button |
| Section | Your imported audio | — | — | — | — | Audio files imported in Media; same play/add rows |
| Section | Voiceover | — | — | — | — | Record button (see J-VOICEOVER) |
| Section | Tools | — | — | — | — | "Detect beats" + "Open mixer" (see J-BEAT, J-MIXER) |

## Interactions
- Click a row's play button: previews that track through a preview element (stops any other preview; button becomes a stop square while playing). Click again to stop.
- Click a row's "+" (or the row's Add button): renders the track if it is a Vidora Original (synthesized in-browser, cached), adds it as an audio clip on the first free audio track at the playhead, and selects it. Imported audio adds its media item the same way.
- Search filters live as you type; chips set the search text; a category tile filters by that category; "All" clears the filter.
- "Open mixer" clears the clip selection so the right panel shows the mixer (see J-MIXER).

## States
- Empty imported-audio section: "No audio imported yet — import an audio file from Media." (The Originals lists are never empty.)
- No search match: "No tracks match '<query>'." with a Clear button.
- While a Vidora Original renders the first time: the Add button shows "…" and is disabled for that row.

## Result
Music/SFX can be previewed and added to the timeline as audio clips; the panel shape matches the reference (sub-tabs, search, chips, categories, recommended rows, play + add).

## Edge cases
- Adding a track while the playhead is past the end of the project extends the project duration (timeline grows, as with any clip).
- Adding when no audio track exists creates "Audio N".
- Preview keeps playing if the panel is closed; it stops when another preview starts or the user presses stop.

## Evidence
WEB-CHECK-2026-11-23.md §1 (Audio tab) · FULL-WALKTHROUGH-2026-11-23.md (Audio tab: play + "+" add buttons; Favorites counts) · `src/components/AudioPanel.tsx`

## Status
ASSUMED — Web evidence only; the desktop Audio tab was never seen, so desktop categories/track contents may differ. The "+"-add and play-preview behaviours were observed in the signed-in Web walkthrough.
