# F-SCOPES — Scopes — waveform, vectorscope, histogram
- **Phase:** 2
- **Reference behaviour:** Scopes are drawn from the currently captured preview frame (not live video): click 'Capture frame scopes' and the histogram, luma waveform and vectorscope render, with average luma and clipped black/white percentages. [ASSUMED] Scopes reflect the composited frame at the current playhead, including effects and adjustments.
- **Where it lives:** Adjustment left panel → 'Scopes' section (`src/components/ScopesPanel.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Capture frame scopes | — | — | — | — | Captures the current preview frame |
| Canvas | Histogram | — | — | 240×64 | — | Drawn after capture |
| Canvas | Waveform (luma) | — | — | 240×64 | — | Drawn after capture |
| Canvas | Vectorscope | — | — | 120×120 | — | Drawn after capture |
| Text | Avg luma / clipped black / clipped white | — | — | — | — | Read-only, after capture |

## Interactions
Select a clip, move the playhead to the frame to check, click 'Capture frame scopes'.

## States
Before capture: only the button and an empty hint. After capture: three canvases + the info line.

## Result
The three scopes draw from the captured frame; the info line reports avg luma and clipping %.

## Edge cases
Scopes are a still snapshot — move the playhead and capture again to update them. Capturing with no clip shows the empty preview frame's scopes.

## Evidence
`src/components/ScopesPanel.tsx`, `src/lib/scopes.ts` · Audit: `audit/phase2/F-SCOPES/`

## Status
MATCH
