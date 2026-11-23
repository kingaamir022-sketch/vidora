# B-SHORTCUTS — Keyboard shortcuts (editable map)
- **Phase:** 1 (corrected 0.3.2, live CapCut Web check 2026-11-22)
- **Reference behaviour:** Shortcuts work anywhere in the editor except while typing in a field. Every shortcut can be rebound in the Shortcuts dialog; the map persists in localStorage. Ctrl+A selects ALL clips on all tracks (cyan outlines in CapCut Web). A rebound shortcut takes effect immediately and survives reload.
- **Where it lives:** Global key handler (`src/App.tsx`); Shortcuts dialog (Top bar '⌨ Shortcuts').

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Shortcut | Space | — | — | togglePlay | — | Play/pause |
| Shortcut | S | — | — | split | — | Split at playhead |
| Shortcut | M | — | — | addMarker | — | Add marker |
| Shortcut | Delete | — | — | delete | — | Delete selected |
| Shortcut | Shift+Delete | — | — | rippleDelete | — | Ripple delete |
| Shortcut | Ctrl+D | — | — | duplicate | — | Duplicate |
| Shortcut | Ctrl+C / Ctrl+V | — | — | copy/paste | — |  |
| Shortcut | Ctrl+Z / Ctrl+Shift+Z | — | — | undo/redo | — |  |
| Shortcut | Ctrl+A | — | — | selectAll | — | Selects ALL clips on all tracks |
| Button | Reset to defaults | — | — | — | — | In the Shortcuts dialog |

## Interactions
Press a shortcut in the editor. Open '⌨ Shortcuts', click a binding, press the new keys, Reset to restore defaults.

## States
The dialog lists every action with its current binding; rebinding captures the next keypress.

## Result
The action runs (or the binding changes) at once; the map is saved to localStorage (`vidora.shortcuts.v1`).

## Edge cases
Shortcuts are ignored while focus is in an input, textarea, select or content-editable field. Ctrl+A with no clips selects nothing.

## Evidence
`src/lib/shortcuts.ts`, `src/components/ShortcutsPanel.tsx`, `src/App.tsx`, `src/lib/timeline.ts` (allClipIds) · Live check: `docs/reference/capcut/WEB-CHECK-2026-11-22.md` §4 · Audit: `audit/phase2/B-SHORTCUTS/`

## Status
MATCH (live CapCut Web check 2026-11-22)
