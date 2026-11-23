# B-TRANSFORM — Transform — opacity, scale, rotation, position, flip, fit/fill, crop
- **Phase:** 1
- **Reference behaviour:** The selected clip's geometry is edited in the Properties panel and applied live in the preview. Values are stored in the project JSON and are undoable and keyframeable (see D-KEYFRAMES).
- **Where it lives:** Properties panel → Transform and Crop sections.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Number | Opacity | 0 | 1 | 1 | 0.05 |  |
| Number | Scale | 0.05 | 10 | 1 | 0.05 |  |
| Number | Rotation° | -360 | 360 | 0 | 1 |  |
| Number | Position X % | -100 | 100 | 0 | 1 |  |
| Number | Position Y % | -100 | 100 | 0 | 1 |  |
| Checkbox | Flip horizontal | — | — | off | — |  |
| Checkbox | Flip vertical | — | — | off | — |  |
| Select | Fit / fill | — | — | Fit | — | Fit = letterbox, Fill = crop to frame |
| Number | Crop x / y / width / height | 0 | 1 | 0/0/1/1 | 0.05 | 0–1 source rectangle |
| Button | Clear crop | — | — | — | — | Removes the crop |

## Interactions
Select a clip, change any Transform/Crop field in the Properties panel.

## States
Out-of-range numbers are clamped (opacity 0–1). The preview updates on every change.

## Result
The clip redraws with the new geometry in the preview and in export.

## Edge cases
Crop values outside 0–1 are accepted by the input but clamped by the compositor's source rectangle. Rotation beyond ±360° wraps in the compositor (cos/sin).

## Evidence
`src/components/PropertiesPanel.tsx`, `src/lib/compositor.ts` · Audit: `audit/phase2/B-TRANSFORM/`

## Status
MATCH
