# L-EXPORT-AUDIO — Audio-only, GIF, image sequence, cover frame (Phase 8, Section L)

- **Phase:** 8 (built v0.9.0)
- **Reference behaviour:** ASSUMED — the CapCut Web export menu offers only video Download (MP4/MOV); no audio-only, GIF, frame-sequence or cover-frame option was observed. These are standard professional-editor export kinds (DaVinci/Premiere offer them), chosen as the common industry behaviour. The SPEC.md Phase 8 list names them explicitly ("Audio-only, image sequence, cover frame").
- **Where it lives:** Export dialog "More export kinds" section (`src/components/ExportPanel.tsx`); engine in `src/lib/exportEngine.ts`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Export audio (WAV) | — | — | — | — | 48 kHz 16-bit stereo WAV of the full audio mix |
| Button | Export GIF | — | — | — | — | Animated GIF, 10 fps, max 320 px wide, no audio |
| Button | Export image sequence | — | — | — | — | One PNG per frame (at the chosen fps), downloaded as a zip of files |
| Button | Export cover frame | — | — | — | — | One PNG of the frame at the chosen time (default: first frame) |
| Number input | Cover time (seconds) | 0 | duration | 0 | 0.1 | Only for cover frame |
| Select | GIF width | 160 | 320 | 320 | — | GIF is capped at 320 px — the panel says so |

## Interactions
- Click any kind → a job enters the queue with that kind; progress and result behave like L-EXPORT-QUEUE.
- Audio (WAV): the same OfflineAudioContext mix as video export (volume, fades, ducking, mute/solo, master) is rendered and written as WAV. MP3 is NOT offered — no MP3 encoder is bundled; the panel says "WAV only — MP3 needs an external encoder".
- GIF: frames are rendered at 10 fps and quantised (gifenc); the panel warns "GIF has no audio and no smooth motion — 10 fps".
- Image sequence: one PNG per frame at the export fps; for a 10 s 30 fps project that is 300 files — the panel warns before starting and the files download one by one (browsers cannot zip without a library — the panel says "files download one by one").
- Cover frame: renders the single frame at the chosen time and downloads it as PNG.

## States
- Same job states as the queue (Queued/Running/Done/Failed/Cancelled).

## Result
Real files: a WAV with the project audio mix (verified by header + duration in the audit), a GIF with the GIF89a header and the right frame count, PNG frames, a PNG cover.

## Edge cases
- Project with no audio at all → audio export produces 0 s of silence? No — the button is disabled with "This project has no audio".
- Image sequence on a 60 s 60 fps project → 3,600 files; the panel requires a confirm ("This will download 3,600 files. Continue?").
- GIF of a project longer than 30 s → capped at the first 30 s with a note ("GIF export is limited to the first 30 seconds").

## Evidence
SPEC.md Phase 8 scope list; standard editor behaviour (no CapCut evidence for these kinds).

## Status
ASSUMED
