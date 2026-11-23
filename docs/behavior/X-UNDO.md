# X-UNDO — Undo / redo (command pattern)
- **Phase:** 1
- **Reference behaviour:** Every project mutation pushes the previous document onto the undo stack (capped at 100). Undo/redo buttons show a count in their tooltip and disable at the ends. Shortcuts Ctrl+Z / Ctrl+Shift+Z. [ASSUMED] A new edit clears the redo stack — the standard command-pattern rule.
- **Where it lives:** Top bar Undo/Redo buttons; shortcuts; store (`src/store/projectStore.ts`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Undo | — | — | — | — | Disabled when the stack is empty; tooltip shows count |
| Button | Redo | — | — | — | — | Disabled when the stack is empty; tooltip shows count |
| Shortcut | Ctrl+Z / Ctrl+Shift+Z | — | — | — | — |  |

## Interactions
Click Undo/Redo or press Ctrl+Z / Ctrl+Shift+Z. Drag operations snapshot once at drag start (not per pixel).

## States
Buttons disable at the stack ends; tooltips read 'Undo (n)' / 'Redo (n)' or 'nothing to undo/redo'.

## Result
The project returns to the previous (or next) state, including timeline, transforms, keyframes, effects and masks.

## Edge cases
Undo does not cover dashboard actions (create/rename/duplicate/delete project) or shortcut rebinding — those write localStorage directly.

## Evidence
`src/store/projectStore.ts` (applyProject, undo, redo, snapshot) · Audit: `audit/phase2/X-UNDO/`

## Status
MATCH
