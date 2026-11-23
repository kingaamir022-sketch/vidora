# D-KEYFRAMES — Keyframes — add, edit, delete
- **Phase:** 2
- **Reference behaviour:** Keyframes animate a clip property over the clip's own time. Add one at the playhead, edit its time/value, delete it. Values interpolate between keyframes in the preview. Properties: positionX, positionY, scale, rotation, opacity, volume, brightness, maskFeather. [ASSUMED] Interpolation between two keyframes is linear in value unless an easing is set on the later keyframe (see D-EASING).
- **Where it lives:** Properties panel → Keyframes & Animation section.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Property | — | — | opacity | — | 8 properties (see above) |
| Button | + Add keyframe at <local>s | — | — | — | — | Adds at the playhead's position inside the clip |
| Number | Keyframe time | 0 | clip duration | playhead | 0.1 | Per keyframe row, seconds |
| Number | Keyframe value | — | — | current value | 0.05 | Per keyframe row |
| Button | Delete keyframe (×) | — | — | — | — | Per keyframe row |

## Interactions
Pick a property, move the playhead, click '+ Add keyframe'. Edit time/value in the row; click × to delete.

## States
No keyframes: 'No keyframes for <property> yet.' Rows sort by time. Adding at an existing time replaces that keyframe's value.

## Result
The preview interpolates the property while scrubbing or playing; the change is undoable and autosaved.

## Edge cases
A keyframe time outside the clip is clamped into the clip on evaluation. Deleting the only keyframe returns the property to its base value.

## Evidence
`src/components/KeyframesPanel.tsx`, `src/lib/keyframes.ts`, `src/schema/project.ts` (KEYFRAME_PROPERTIES) · Audit: `audit/phase2/D-KEYFRAMES/`

## Status
MATCH
