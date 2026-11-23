# I-TRANSCRIPT — Text-based editing (transcript view)
- **Phase:** 3
- **Reference behaviour:** The Web left rail has a separate "Transcript" tab: a "Transcribe" panel with a spoken-language selector (English (US)), a "Select track to transcribe" control showing "No tracks", and a Transcribe button that is disabled with no media (WEB-CHECK-2026-11-23 §4). RESOLVED (Web, signed-in full walkthrough 2026-11-23): the same structure is confirmed, and transcribing a track enables transcript-based editing. Desktop still has NO Transcript tab (the desktop rail ends at AI avatar) — what a transcribed transcript looks like and whether desktop lets you click a word to seek or edit text to change the timeline are still unseen. Vidora's Phase 3 implementation puts the transcript view INSIDE the Captions panel: all cues/words listed, clicking a word seeks the playhead to it, editing cue text updates the cue (and re-times its words). That in-panel placement differs from Web's separate tab — noted here, not hidden.
- **Where it lives:** Transcript section of the Captions panel (`src/components/CaptionsPanel.tsx`); word timing in `src/lib/captions.ts` (`wordAt`, `retimeWords`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Buttons | Transcript words | — | — | — | — | One button per word; click to seek |
| Note | Empty state | — | — | — | — | "No cues yet — the transcript appears here once captions exist." |

## Interactions
In the Captions panel, scroll to Transcript: every cue's words are shown in reading order. Click any word — the playhead jumps to that word's start time. The word under the playhead is highlighted. Edit a cue's text in the Manual section — the transcript updates and the cue's words are re-timed evenly.

## States
No cues: the transcript section shows only the empty note. During playback the active word highlights in step with the preview caption.

## Result
Word-level seeking works from the transcript; text edits flow cue → words → preview consistently.

## Edge cases
A cue with no words (empty text) shows an empty line. Clicking a word seeks even while paused. Word times are the cue's evenly-distributed timings, not measured speech timings (see I-CAPTION-AUTO).

## Evidence
WEB-CHECK-2026-11-23.md §4 (separate "Transcript" tab in Web) · FULL-WALKTHROUGH-2026-11-23.md (same structure confirmed; transcribing enables transcript-based editing; desktop screenshot set has no Transcript tab) · `src/components/CaptionsPanel.tsx`

## Status
ASSUMED — Web Transcript tab structure is now fully known (language + track selectors, disabled Transcribe with no media, transcript-based editing once transcribed); desktop has no Transcript tab at all, and Vidora's in-panel transcript placement is the chosen behaviour (differs from Web's separate tab, noted above).
