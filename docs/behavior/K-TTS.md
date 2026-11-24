# K-TTS — Narration render / offline TTS (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's Text inspector has a TTS section (voice pick → narration) and the home "Magic tools" list includes "Text to speech". Vidora's narration clips speak during preview only via browser speechSynthesis (BUG-D10). Phase 7 adds a real render: the offline pipeline `tools/narrate.py` (Piper, MIT, CPU-only, voice `en_US-lessac-medium`, CC-BY) renders any text to a 22050 Hz WAV that imports as a normal audio clip — so narration becomes a real clip on the timeline (volume, fades, EQ, ducking all work) and will be included when the Phase 8 audio-mix export lands. In-app preview still uses speechSynthesis (already built). The panel says plainly that the render step is the local script, not a cloud voice. ASSUMED — the reference TTS flow (pick voice → narration clip) is matched; the render engine is Vidora's own.
- **Where it lives:** `src/components/AIToolsPanel.tsx` (Narration section), `tools/narrate.py`, `tools/models/en_US-lessac-medium.onnx` (downloaded, not in GitHub/Drive), `src/lib/tts.ts` (preview helpers, unchanged).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Textarea | Narration text | — | — | — | — | Any text; one WAV per render |
| Select | Voice | — | — | Lessac (US English) | — | Only the downloaded voice is listed; others say "not downloaded" |
| Button | Render narration WAV | — | — | — | — | Shows the exact command to run (script path) |
| Button | Import WAV | — | — | — | — | Normal media import; the WAV becomes an audio clip |
| Note | Honest note | — | — | — | — | Preview = browser voices; rendered file = Piper voice; export mix is Phase 8 |

## Interactions
- Type text, click "Render narration WAV": the panel shows the exact `tools/narrate.py` command (with the text saved to a file when it is long) and the expected output path. After running it, "Import WAV" adds it as an audio clip on the first free audio track.
- 16 narration voices (Phase 6) remain the preview voices; the rendered WAV uses the single downloaded Piper voice unless more voices are downloaded (README lists how).

## States
- Empty text: render button disabled.
- Model missing: the section says the model is not downloaded and gives the download command.

## Result
A real audio clip with the narration, on the timeline, playable in preview.

## Edge cases
- Very long text (> 5000 chars): the script splits into chunks and concatenates; the panel says so.
- Text with characters the voice cannot pronounce: Piper substitutes; the WAV still renders.

## Evidence
`tools/narrate.py`, `tools/README.md`, `tools/test_pipeline.sh` (Piper→Vosk loop).

## Status
ASSUMED
