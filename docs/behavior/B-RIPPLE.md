# B-RIPPLE — Ripple delete
- **Phase:** 1
- **Reference behaviour:** Ripple delete removes the selected clip and pulls every later clip on the same track left to close the gap. A plain Delete leaves the gap. [ASSUMED] Ripple only affects the same track (not all tracks) — the Phase 1 behaviour, documented here.
- **Where it lives:** Timeline toolbar ('Ripple delete'), shortcut Shift+Delete, right-click menu; 'Ripple' checkbox toggles whether the toolbar Delete button ripples.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Ripple delete | — | — | — | — | Disabled with no selection |
| Checkbox | Ripple | — | — | off | — | When on, the Delete button ripples |
| Shortcut | Shift+Delete | — | — | — | — | Ripple-deletes the selection |

## Interactions
Select a clip and click 'Ripple delete' or press Shift+Delete. Or turn Ripple on and use Delete.

## States
The Ripple checkbox state is shown in the toolbar; the footer does not announce ripple mode.

## Result
The clip is gone and later clips on that track shift left by its duration; total project duration shrinks.

## Edge cases
Clips on other tracks do not move. Ripple-deleting the last clip changes nothing except the removal.

## Evidence
`src/components/TimelineShell.tsx`, `src/lib/timeline.ts` (rippleDeleteClip) · Audit: `audit/phase2/B-RIPPLE/`

## Status
MATCH
