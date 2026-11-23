# J-BEAT — Beat detection (markers + auto-cut)
- **Phase:** 4
- **Reference behaviour:** The reference has NO beat-detection UI that was observed (no "detect beats" button, no beat markers, no auto-cut in the signed-in Web walkthrough or the desktop screenshots). Beat detection is a Section J requirement, built to the industry-standard shape: analyse the waveform energy, mark the beats, optionally cut there. ASSUMED.
- **Where it lives:** "Detect beats" in the Audio panel Tools section (`AudioPanel.tsx`); pure detection in `src/lib/audio.ts` (`detectBeats`); store action `addBeatMarkers()` in `src/store/projectStore.ts` (creates markers; "Cut at beats" splits via existing `splitClipAt`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Detect beats | — | — | — | — | Needs an audio clip selected on the timeline; otherwise disabled with "Select an audio clip first" |
| Button | Cut at beats | — | — | — | — | Enabled after beats are detected for the selected clip; splits the clip at every beat time |

## Interactions
- Click "Detect beats": the selected clip's waveform peaks (64 buckets) are analysed; beat times are stored on the clip's selection state and shown as temporary beat ticks on the timeline ruler (violet ticks). A note shows "12 beats found (~128 BPM estimate)".
- Click "Add beat markers": creates a marker at each beat time (label "Beat", existing marker colour). Markers are undoable.
- Click "Cut at beats": splits the selected audio clip at each beat time (one undo step); the clip becomes one clip per beat.

## States
- No audio clip selected: both buttons disabled with the note above.
- Clip shorter than 2 s or with no peaks: "Not enough audio to detect beats."
- Detection runs instantly (peaks are already computed at import).

## Result
Beat times are energy onsets: consecutive peak-bucket energy rises above mean + 1 standard deviation, with a minimum gap of 0.25 s between beats. BPM estimate = 60 / median beat gap.

## Edge cases
- Beats near the clip edges (within 0.1 s of start/end) are dropped — cutting there would make slivers.
- "Cut at beats" on a clip that already has keyframes: keyframes split with the clip (existing split behaviour).
- The estimate is honest: the panel says "Estimated from waveform energy — not true BPM analysis."

## Evidence
No reference UI (Section J requirement) · `src/lib/audio.ts`, `src/store/projectStore.ts`, `src/components/AudioPanel.tsx`

## Status
ASSUMED — no beat detection was observed in the reference; method follows the standard energy-onset approach.
