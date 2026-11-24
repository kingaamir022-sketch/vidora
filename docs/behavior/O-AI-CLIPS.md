# O-AI-CLIPS — AI stock clips library (Phase 6, Section O)
- **Phase:** 6 (Section O)
- **Reference behaviour:** CapCut's Video Studio / Seedance page shows AI video cards in a grid with durations (00:15, 00:20) and a Showroom of short films / AI drama rows (O-VIDEO-STUDIO, UNKNOWN — the generation flow and costs were never observed). Vidora's AI Clips section follows the card-grid shape: poster thumbnail, title, duration, category, play-on-hover, + Add. The clips are Vidora Originals: 100 procedural 1080p clips (6 s, 30 fps, H.264) rendered offline by Vidora's own generator (`generation/render_clips.py`, ffmpeg filter graphs from `generation/prompts/clips.json` — animated gradients, particles, geometric motion, light; no real faces, no filmed footage, no stock). ASSUMED — the reference cards are cloud AI videos; Vidora's are local procedural clips in the same grid shape.
- **Where it lives:** `src/lib/aiLibrary.ts` (catalog from `assets/ai-manifest.json`), Clips sub-tab in `src/components/AILibraryPanel.tsx`, files in `public/ai-library/clips/*.mp4` with posters in `public/ai-library/clips/posters/*.jpg`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | Search | — | — | — | — | Name/tags/scene |
| Chips | Scene chips | — | — | All | — | 20 scenes: Aurora, Waves, Particles, Kaleidoscope, Sunrise, Ocean, Bokeh, Nebula, Rain, Snow, Embers, Light streaks, Grid pulse, Bubbles, Clouds, Lava, Starfield, Caustics, Ribbons, Bloom |
| Cards | Clip cards | — | — | — | — | Poster, title, 0:06, scene, + Add |
| Button | + Add | — | — | — | — | Adds MediaItem + video clip |

## Interactions
- Hover a card: the poster is shown (video preview on click plays the MP4 in place). Click +: a MediaItem (kind video, src `/ai-library/clips/<id>.mp4`, 1920×1080, 6 s, thumbnail = poster) is added and placed on the first free video track.
- Missing MP4 file (text-only checkout): the card shows the Drive note and + is disabled; the Generate tab can still make a short clip in-browser.

## States
- Empty search: "No AI clips match this search."
- Missing file: Drive note on the card.

## Result
The clip is a normal video clip on the timeline: split/trim/speed/effects/transitions all work on it.

## Edge cases
- Clip added to a 9:16 project: it letterboxes like any 16:9 clip (fit/fill in the inspector).
- 100 clips × 6 s: the grid paginates by search/category only — no virtual scroll needed at this size.

## Evidence
`generation/prompts/clips.json`, `generation/render_clips.py`, `assets/ai-manifest.json`. Quality: `generation/quality_filter.py` (resolution/duration check, black-frame and frozen-frame gates, poster extraction).

## Status
ASSUMED
