# M-ACCESS — Accessibility pass (Phase 9, Section M)

- **Phase:** 9 (built v1.0.0)
- **Reference behaviour:** ASSUMED — standard WCAG-style practice for an editor: every control reachable by keyboard, every dialog announced, visible focus, no colour-only meaning.
- **Where it lives:** Swept across `src/components/*.tsx` + `src/index.css` (focus-visible rings); dialog semantics in `ExportPanel.tsx`, `ShortcutsPanel.tsx`, `SettingsDialog.tsx`, `AccountPanel.tsx`, `UserGuideDialog.tsx`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Attribute | `aria-label` on icon-only buttons | — | — | — | — | Undo, Redo, Play/Pause, tab rail icons, timeline toolbar icons |
| Attribute | `role="dialog"` + `aria-modal="true"` | — | — | — | — | Every modal dialog; labelled by its heading (`aria-labelledby`) |
| Key | Esc | — | — | — | — | Closes the topmost dialog (export, shortcuts, settings, guide, account) |
| Key | Tab / Shift+Tab | — | — | — | — | Moves through controls in a sensible order; focus ring is always visible |
| Style | Focus ring | — | — | — | — | 2px violet outline on `:focus-visible`, in both themes |
| Text | Status text | — | — | — | — | Save state, errors and "Media missing" are text, never colour alone |

## Interactions
- Open any dialog with the keyboard → focus lands on the dialog's first control; Esc returns focus to the button that opened it.
- Timeline clips are `role="button"` with an accessible name (clip name + start time).

## States
- Light theme: focus ring stays visible (violet on light grey).

## Result
The app is usable by keyboard alone; dialogs are announced; nothing important is conveyed by colour only.

## Edge cases
- Focus ring on the canvas/preview area: the preview is not a focusable control — keyboard transport works globally (Space, S, Ctrl+Z) as before.

## Evidence
Standard editor accessibility practice; no CapCut accessibility evidence was collected.

## Status
ASSUMED
