# K-SMARTCUT — Smart cut: silence + filler-word removal (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's "Long video to shorts" and transcript-based editing cut dead air; the timeline toolbar has "Transcript-based editing". Vidora's Smart cut analyses the selected clip's real audio (decoded PCM, RMS per 50 ms window) and its caption words: silences below a threshold and filler words (um, uh, hmm, like, you know, er, ah) become cut ranges the user reviews before anything is deleted. Nothing is cut without confirmation. ASSUMED — the reference flow (analyse → review → cut) is the standard shape; thresholds and the filler list are Vidora's own.
- **Where it lives:** `src/lib/aiTools.ts` (`detectSilences`, `FILLER_WORDS`, `findFillerRanges`, `mergeCutRanges`), `src/components/AIToolsPanel.tsx` (Smart Cut section), `src/store/projectStore.ts` (split + delete via existing timeline actions).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Slider | Silence threshold | -60 dB | -20 dB | -40 dB | 1 dB | Below this = silence |
| Number | Min silence | 0.2 s | 2 s | 0.5 s | 0.1 s | Shorter gaps are kept |
| Checkbox | Remove filler words | — | — | on | — | Uses caption words on the project |
| Button | Analyse | — | — | — | — | Lists the ranges found |
| List | Cut ranges | — | — | — | — | Each row: time, length, reason (silence/filler) |
| Button | Cut selected / Cut all | — | — | — | — | Splits the clip at range edges and deletes the ranges |

## Interactions
- Select a video/audio clip, click "Analyse": the panel decodes the clip audio (same decode path as waveforms) and lists silence ranges + filler ranges from the project captions, with counts and total seconds saved.
- Tick ranges, click "Cut selected" (or "Cut all"): the clip is split at every range edge and the range pieces are deleted; the remaining pieces close the gaps (ripple on the same track). Undo (Ctrl+Z) restores the clip.
- No audio / no captions: the matching part of the analysis says so and is skipped.

## States
- No clip selected: "Select a clip first."
- Nothing found: "No silences or filler words found — nothing to cut."
- Analysis running: progress line, buttons disabled.

## Result
The clip is shorter with dead air and fillers removed; the rest of the timeline is unchanged.

## Edge cases
- A range covering the whole clip: refused with "That would delete the whole clip."
- Overlapping silence + filler ranges: merged into one range before cutting.
- Clip with no audio track (image clip): silence analysis skipped, fillers still work from captions.

## Evidence
`src/lib/aiTools.ts`, `src/test/phase7.test.ts` (synthetic PCM with known gaps).

## Status
ASSUMED
