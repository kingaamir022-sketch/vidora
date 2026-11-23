# B-WAVE — Timeline audio waveform
- **Phase:** 1 (closed in the Phase 2 parity retrofit)
- **Reference behaviour:** Audio clips on the timeline show a waveform of the clip's audio, so the editor can see loud and quiet parts and cut on them. Video clips show thumbnails instead. [ASSUMED] The waveform is drawn from 64 normalised peak buckets computed at import; the reference's waveform density is similar at this zoom.
- **Where it lives:** Timeline audio clip blocks (`src/components/TimelineShell.tsx`); peaks computed at import (`src/lib/media.ts`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Display | Waveform bars | — | — | — | — | 64 white bars, bottom-aligned inside audio clips; height = peak 0–1 |
| Display | Clip thumbnail | — | — | — | — | Video/image clips show the probed thumbnail as the clip background (see B-TRACKS) |

## Interactions
Import an audio file (Media panel), add it to the timeline. The waveform appears on the audio clip at once. No interaction — the waveform is a display, not a control.

## States
Audio clip with peaks: white bars over the emerald clip. Audio clip without peaks (decode failed or old project): solid emerald block with name only. Video/image clips: thumbnail background instead.

## Result
The editor can see the audio's shape on the timeline and trim/split on visible peaks and silences.

## Edge cases
Peaks are computed with `AudioContext.decodeAudioData` at import; if decoding fails (unsupported codec, no AudioContext in the environment) the import still succeeds and the clip simply has no waveform. Peaks are capped at 64 buckets and 0–1; old projects without peaks still validate (the field is optional) and migrate unchanged.

## Evidence
`src/lib/media.ts` (peaksFromSamples, probeAudioPeaks), `src/schema/project.ts` (MediaItem.peaks), `src/components/TimelineShell.tsx` · Audit: `audit/phase2/B-WAVE/`

## Status
MATCH
