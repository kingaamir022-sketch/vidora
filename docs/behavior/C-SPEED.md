# C-SPEED — Constant speed and presets
- **Phase:** 1 (corrected 0.3.2, live CapCut Web check 2026-11-22)
- **Reference behaviour:** Each clip has a constant playback speed. The timeline length of the clip is sourceDuration / speed, so 2× halves it and 0.5× doubles it. CapCut Web: the Speed panel has a slider covering 0.1×–100×, a numeric field, and a Duration field; Normal/Curve tabs. Typing 0.05 clamps to 0.10×; typing 200 clamps to 100×.
- **Where it lives:** Properties panel → Speed section (Normal tab).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Slider | Speed | 0.1 | 100 | 1 | 0.1 | Shows current speed as N× |
| Number | Exact speed | 0.1 | 100 | 1 | 0.1 | Full range; clamps 0.05→0.10, 200→100 |
| Number | Duration (s) | — | — | clip duration | 0.1 | Editing it sets speed = source / duration |
| Tabs | Normal / Curve | — | — | Normal | — | Curve tab notes bezier speed curves are planned |
| Buttons | Speed presets | — | — | 1× | — | 0.25×, 0.5×, 1×, 1.5×, 2×, 4×, 8× |

## Interactions
Select a clip, drag the Speed slider, type an exact speed or a duration, or click a preset.

## States
The active preset button is highlighted violet. The timeline clip label shows the speed when it is not 1×.

## Result
The clip shortens/lengthens on the timeline at once (duration = source / speed); the preview plays at that rate.

## Edge cases
Speed changes are undoable; the source media is never modified. Setting a duration that implies a speed outside 0.1×–100× clamps the speed and the duration follows.

## Evidence
`src/components/PropertiesPanel.tsx`, `src/lib/timeline.ts` (SPEED_PRESETS, durationAtSpeed, speedForDuration, clampSpeed) · Live check: `docs/reference/capcut/WEB-CHECK-2026-11-22.md` §5 · Audit: `audit/phase2/C-SPEED/`

## Status
MATCH (live CapCut Web check 2026-11-22)
