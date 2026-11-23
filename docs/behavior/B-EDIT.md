# B-EDIT — Delete, duplicate, copy, paste
- **Phase:** 1
- **Reference behaviour:** Basic clip editing: delete removes the selected clip(s); duplicate places a copy after the original; copy/paste appends copies at the end of the same track. All are undoable. [ASSUMED] Paste appends at the end of the track rather than at the playhead — the Phase 1 behaviour, documented here so the reference comparison is explicit.
- **Where it lives:** Timeline toolbar, shortcuts, right-click menu.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Delete | — | — | — | — | Disabled with no selection |
| Button | Duplicate | — | — | — | — | Disabled with no selection |
| Button | Copy | — | — | — | — | Disabled with no selection |
| Button | Paste | — | — | — | — | Always enabled (uses clipboard) |
| Shortcut | Delete / Ctrl+D / Ctrl+C / Ctrl+V | — | — | — | — | As labelled |

## Interactions
Select clip(s) — Ctrl+click adds to the selection — then click the toolbar button or use the shortcut or right-click menu.

## States
Toolbar buttons disable when nothing is selected (except Paste).

## Result
Delete removes the clip(s); Duplicate inserts '<name> copy' after the original; Paste appends clipboard copies at the track end and selects them.

## Edge cases
Pasting with an empty clipboard does nothing. Deleting the only clip leaves an empty track (the track itself stays).

## Evidence
`src/components/TimelineShell.tsx`, `src/lib/timeline.ts`, `src/store/projectStore.ts` · Audit: `audit/phase2/B-EDIT/`

## Status
MATCH
