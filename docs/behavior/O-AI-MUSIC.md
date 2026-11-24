# O-AI-MUSIC — AI music tracks library (Phase 6, Section O)
- **Phase:** 6 (Section O)
- **Reference behaviour:** CapCut's Audio tab shows Music / Sound effects sub-tabs with search, chips, category grids and Recommended rows (cover, title, duration, author) with play + "+" add (FULL-WALKTHROUGH-2026-11-23.md, Audio tab). Vidora's AI Music section follows that row shape: cover swatch, title, BPM, key, duration, mood, play + "+" add. The tracks are Vidora Originals: 100 instrumental tracks rendered offline by Vidora's own generator (`generation/render_music.py`, numpy synthesis from `generation/prompts/music.json` — chord progressions, bass, drums, arpeggios; no samples, no existing melodies). Durations 15 s / 30 s / 60 s (bar-aligned; 15 s and 30 s tracks are loopable). BPM and key are generation parameters, verified after rendering by the quality filter (onset autocorrelation BPM check). ASSUMED — the reference track list is a cloud catalogue; Vidora's is a local file library in the same row shape.
- **Where it lives:** `src/lib/aiLibrary.ts` (catalog, loaded from `assets/ai-manifest.json`), Music sub-tab in `src/components/AILibraryPanel.tsx`, files in `public/ai-library/music/*.mp3`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | Search | — | — | — | — | Name/tags/mood |
| Chips | Style chips | — | — | All | — | 12 styles: Ambient, Lo-Fi, Cinematic, Electronic, Acoustic, Corporate, Chillwave, Synthwave, Jazz, Epic, Minimal, Dance |
| Text | Count line | — | — | — | — | "100 AI tracks · 12 styles" |
| Rows | Track rows | — | — | — | — | Swatch, name, BPM, key, duration, mood, ▶, + |
| Button | Play (▶) | — | — | — | — | Plays the MP3; stops on second click or another row |
| Button | + Add | — | — | — | — | Adds MediaItem + audio clip |

## Interactions
- Search / chip filters the rows. ▶ plays the track (one at a time). + adds the track to the project media (kind audio, mime audio/mpeg, duration/BPM/key/peaks from the manifest) and places an audio clip on the first free audio track.
- Missing MP3 file (text-only checkout): the row shows "in-browser version" and ▶/+ render the same pattern with Web Audio (`renderAiTrack`) instead — the track still works.
- Loopable tracks (15 s / 30 s): the row shows a "Loop" badge; the added clip loops cleanly because the file is bar-aligned with no fade tail.

## States
- Empty search: "No AI tracks match this search."
- File missing + Web Audio unavailable: the row shows "Could not play here — full library in the Drive release."

## Result
The track is a normal audio clip on the timeline: volume, fades, EQ, keyframes, beat detection and mixer all work on it.

## Edge cases
- 60 s track added to a 10 s project: timeline extends; trim/split work normally.
- Same track added twice: two separate media items/clips (no dedupe — the user may want the track twice).

## Evidence
`generation/prompts/music.json`, `generation/render_music.py`, `assets/ai-manifest.json`, `src/lib/aiLibrary.ts`. Quality: `generation/quality_filter.py` (BPM autocorrelation check, RMS/peak/clipping/silence gates).

## Status
ASSUMED
