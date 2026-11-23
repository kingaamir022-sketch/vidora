# I-CAPTION-MANUAL — Manual captions
- **Phase:** 3
- **Reference behaviour:** The Web Captions panel lists "Manual captions" — enter captions manually (FULL-WALKTHROUGH-2026-11-23). UNKNOWN — desktop evidence still missing: the DESKTOP manual-captions UI (desktop screenshot 26 shows no manual-captions editor — only Auto captions, Templates, Auto lyrics and the Generate/Delete bar); how a manual cue is added, edited or deleted on desktop; whether desktop lets you set cue start/end times or split a cue; whether desktop manual captions support word-level timing. Vidora's implementation: a cue list with start/end/text fields, click a cue to seek, split cue at playhead, add cue at playhead, delete per cue.
- **Where it lives:** Manual captions section of the Captions panel (`src/components/CaptionsPanel.tsx`); cue helpers in `src/lib/captions.ts` (`splitCue`, `mergeCues`, `cueAt`, `wordAt`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Add cue at playhead | — | — | — | — | New 2s cue ("New caption") at the playhead |
| Button | Split cue at playhead | — | — | — | — | Splits the cue under the playhead into two |
| Number | Cue start (s) | 0 | — | cue start | 0.1 | Per cue |
| Number | Cue end (s) | 0 | — | cue end | 0.1 | Per cue |
| Text input | Cue text | — | — | — | — | Per cue; re-times the cue's words on edit |
| Button | Delete cue (×) | — | — | — | — | Per cue |

## Interactions
Click a cue's timecode to seek the playhead to it. Edit start/end/text inline — the cue list re-sorts by start time and the cue's words are re-timed evenly. With the playhead inside a cue, "Split cue at playhead" divides it into two halves (words go to the side holding their midpoint).

## States
The cue under the playhead is highlighted in the list and on the preview. An empty cue list shows "No captions yet."

## Result
Cues are stored at project level, undoable and autosaved; the preview shows the active cue with word-level highlight.

## Edge cases
Splitting at the very start/end of a cue (within 0.01s) does nothing. Editing a cue's text to empty leaves an empty cue (its words list becomes empty). Start/end are not range-checked against neighbouring cues — overlapping cues are allowed and the earliest-starting cue wins in the preview.

## Evidence
WEB-CHECK-2026-11-23.md §4 ("Manual captions" listed in the Web Captions panel) · FULL-WALKTHROUGH-2026-11-23.md ("Manual captions" — enter captions manually; desktop screenshot 26 is silent on manual editing) · `src/lib/captions.ts`, `src/components/CaptionsPanel.tsx`

## Status
UNKNOWN
