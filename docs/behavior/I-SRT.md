# I-SRT — SRT / VTT import & export
- **Phase:** 3
- **Reference behaviour:** The Web Captions panel offers "Upload caption file (.srt, .ass, .lrc)" (WEB-CHECK-2026-11-23 §4, re-confirmed by the full signed-in walkthrough 2026-11-23). UNKNOWN — desktop evidence still missing: the DESKTOP caption-file upload (desktop screenshot 26 shows no upload control); whether desktop supports .vtt at all; whether desktop can EXPORT captions (no export control was seen); how desktop reports a bad file; whether desktop keeps word-level timing from an imported file. Vidora supports .srt and .vtt import (real parser, readable errors) and .srt/.vtt export (download). .ass is NOT supported in this build — the panel says so plainly.
- **Where it lives:** Import/export section of the Captions panel (`src/components/CaptionsPanel.tsx`); parsing/serializing in `src/lib/captions.ts` (`parseSrt`, `parseVtt`, `parseCaptionFile`, `serializeSrt`, `serializeVtt`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| File input | Import caption file (.srt / .vtt) | — | — | — | — | .ass is rejected with a plain message |
| Button | Export .srt | — | — | — | — | Disabled with no cues; downloads a file |
| Button | Export .vtt | — | — | — | — | Disabled with no cues; downloads a file |
| Text | Import error / success | — | — | — | — | Readable message under the file input |

## Interactions
Choose a .srt or .vtt file — its cues are parsed (index numbers optional in .srt; WEBVTT header required in .vtt; HTML tags stripped from .vtt text) and merged into the project, sorted by start time. Click Export .srt/.vtt to download the current cues. A bad file shows a readable error (e.g. "Bad timecode line…", "Caption end is not after its start…") and imports nothing.

## States
Import success shows "Imported <name>." Imported cues get word-level timing by re-timing their words evenly across each cue.

## Result
Imported cues appear in the cue list and on the preview; exported files re-import cleanly (round-trip unit-tested).

## Edge cases
An empty file, a file with no valid cues, a cue with end ≤ start, or a .vtt without a WEBVTT header all fail with a readable error and import nothing. .ass files are rejected outright. Cue text with multiple lines is kept as one cue.

## Evidence
WEB-CHECK-2026-11-23.md §4 (Upload caption file .srt/.ass/.lrc) · FULL-WALKTHROUGH-2026-11-23.md (same upload control re-confirmed; desktop screenshot 26 is silent on upload/export) · `src/lib/captions.ts`

## Status
UNKNOWN
