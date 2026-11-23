# A-RATIO — Aspect ratios
- **Phase:** 1
- **Reference behaviour:** The project has one aspect ratio; the preview box and the project resolution follow it. Standard ratios are offered plus a custom size. [ASSUMED] Changing the ratio keeps the clips and only changes the frame the preview draws into — the standard behaviour.
- **Where it lives:** Top bar, 'Aspect ratio' select (`src/components/TopBar.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Aspect ratio | — | — | 16:9 | — | Options: 9:16, 16:9, 1:1, 4:5, 21:9, custom |
| Number | Custom width | 1 | 7680 | 1920 | 1 | Only when ratio = custom |
| Number | Custom height | 1 | 7680 | 1080 | 1 | Only when ratio = custom |

## Interactions
Pick a ratio from the select. Pick 'custom' and type width × height.

## States
The select always shows the current ratio; the custom inputs appear only for 'custom'.

## Result
The preview box changes shape at once (9:16 tall, 1:1 square, 21:9 wide); the project resolution updates (e.g. 9:16 → 1080×1920).

## Edge cases
Typing 0 or a non-number in a custom field falls back to 1920 / 1080. Ratio changes are undoable.

## Evidence
`src/components/TopBar.tsx`, `src/schema/project.ts` (resolutionForRatio) · Audit: `audit/phase2/A-RATIO/`

## Status
MATCH
