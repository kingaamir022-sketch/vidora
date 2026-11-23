# D-ANIM — In/out/combo animations
- **Phase:** 2
- **Reference behaviour:** Each clip has an in-animation (played at its start) and an out-animation (played at its end), each with a duration. In + out combine — e.g. zoom-in at the start and fade at the end. Kinds: none, fade, slide (left/right/up/down), zoom-in, zoom-out, spin, bounce, pop. [ASSUMED] The animation progress is local time / duration, clamped 0–1, and the out-animation runs over the last <duration> seconds of the clip.
- **Where it lives:** Properties panel → Keyframes & Animation section (Animation in / Animation out).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Animation in kind | — | — | none | — | 11 kinds |
| Number | Animation in duration | 0.05 | 5 | 0.5 | 0.1 | seconds |
| Select | Animation out kind | — | — | none | — | 11 kinds |
| Number | Animation out duration | 0.05 | 5 | 0.5 | 0.1 | seconds |

## Interactions
Select a clip, pick in/out kinds and durations.

## States
Durations clamp to 0.05–5s. The compositor evaluates in+out together each frame.

## Result
The clip animates in at its start and out at its end in the preview and in export.

## Edge cases
If in-duration + out-duration exceed the clip duration, the two animations overlap in the middle (both apply, clamped).

## Evidence
`src/components/KeyframesPanel.tsx`, `src/schema/project.ts` (animationKindSchema), `src/lib/compositor.ts` · Audit: `audit/phase2/D-ANIM/`

## Status
MATCH
