# K-SCRIPT — Script-to-video (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's home "Create with AI" offers Video Studio (prompt → video) and the editor has "Create from reference"; script-to-video turns written lines into a finished sequence. Vidora's version composes tools that already exist: each script line becomes a scene — a generated visual from the Phase 6 in-browser generator (`aiGenerate.ts`: canvas image / dialogue scene), a text overlay with the line, and a narration cue (browser voice in preview; Piper render via the K-TTS pipeline for a real file). "Build video" creates a new project with the scenes in order, one scene per line, each 4 s by default. ASSUMED — the reference flow (write → scenes → video) is the standard shape; the assembly is Vidora's own composition of its generators.
- **Where it lives:** `src/lib/aiTools.ts` (`scriptToScenes`), `src/components/AIToolsPanel.tsx` (Script-to-Video section), `src/lib/aiGenerate.ts` (visuals, reused), `src/store/projectStore.ts` (new-project creation, reused).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Textarea | Script | — | — | — | — | One scene per line; blank lines ignored |
| Number | Seconds per scene | 2 s | 10 s | 4 s | 1 s | — |
| Select | Visual style | — | — | Gradient | — | Gradient / Scene / Dialogue (Phase 6 generator kinds) |
| Checkbox | Add narration cues | — | — | on | — | Text clip TTS per scene (preview voices) |
| Button | Build video | — | — | — | — | New project with the scenes |
| Note | Honest note | — | — | — | — | Visuals are Vidora's local generator; narration is preview voices unless rendered with the Piper pipeline |

## Interactions
- Type or paste a script (one line = one scene), pick the style, click "Build video": a new project "<first line> — Script video" opens with each scene as a 4 s clip (generated visual + text overlay + narration cue). Edit any scene afterwards like a normal project.
- Empty lines are ignored; a single line makes a single-scene video.

## States
- Empty script: build button disabled.
- More than 20 lines: the panel warns the video will be long and caps at 20 scenes per build.

## Result
A new project with the script as a video.

## Edge cases
- Script with one very long line (> 200 chars): the text overlay wraps; the narration cue uses the full line.
- Style "Dialogue": scenes use the two-speaker dialogue generator (names A/B alternate).

## Evidence
`src/lib/aiTools.ts`, `src/test/phase7.test.ts` (script parsing + scene list).

## Status
ASSUMED
