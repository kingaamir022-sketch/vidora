# B-FREEZE — Freeze frame and reverse
- **Phase:** 1
- **Reference behaviour:** Freeze holds one frame for the clip's whole duration; Reverse plays the clip backwards. Both are per-clip flags with a badge on the preview. [ASSUMED] Reversing also reverses the audio of that clip through the same rate logic — the video element plays backwards via the compositor's time mapping.
- **Where it lives:** Timeline toolbar (Freeze / Reverse), Properties panel buttons, right-click menu.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Freeze | — | — | — | — | Toggles frozen |
| Button | Reverse | — | — | — | — | Toggles reversed |
| Button | Freeze frame / Unfreeze frame | — | — | — | — | Properties panel |
| Button | Reverse / Un-reverse | — | — | — | — | Properties panel |

## Interactions
Select a clip and click Freeze or Reverse (toolbar, properties, or right-click menu).

## States
Frozen clips show a cyan 'FREEZE FRAME' badge; reversed clips show a violet 'REVERSED' badge on the preview.

## Result
A frozen clip shows its source-start frame for its whole duration; a reversed clip plays from end to start.

## Edge cases
Freeze + Reverse together: the frozen frame wins (the clip shows its source-start frame). Speed still applies to the frozen clip's duration mapping.

## Evidence
`src/components/TimelineShell.tsx`, `src/components/PropertiesPanel.tsx`, `src/components/PreviewArea.tsx` · Audit: `audit/phase2/B-FREEZE/`

## Status
MATCH
