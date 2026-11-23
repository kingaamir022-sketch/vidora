# G-LAYOUT — Picture-in-picture and split-screen
- **Phase:** 2
- **Reference behaviour:** The layout of the visible clips at the playhead: Full (one clip), PiP (the next visible clip in a corner) or 2/3/4-up split-screen (visible clips side by side). [ASSUMED] PiP shows the next visible clip in the bottom-right corner at quarter size; split-screen divides the frame evenly.
- **Where it lives:** Properties panel → Mask & Compositing → 'Picture-in-picture / split-screen'.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Buttons | Layout | — | — | Full | — | Full / PiP / 2-up / 3-up / 4-up |

## Interactions
Select a clip, click PiP or a split size. Add a second clip on another track at the same time to see it.

## States
The active layout button is highlighted violet. The help text explains that a second clip is needed.

## Result
The preview re-lays out the visible clips at once.

## Edge cases
With only one visible clip, PiP/split show just that clip (no error). Layout is per primary clip, not per project.

## Evidence
`src/components/MaskPanel.tsx`, `src/lib/masks.ts` (layoutRects), `src/components/PreviewArea.tsx` · Audit: `audit/phase2/G-LAYOUT/`

## Status
MATCH
