# A-MANAGE — Dashboard — rename, duplicate, delete
- **Phase:** 1
- **Reference behaviour:** Each project row offers Rename, Duplicate and Delete. Delete asks for confirmation before removing anything. [ASSUMED] Rename commits on Enter or blur, cancels on Escape — the standard inline-rename pattern.
- **Where it lives:** Dashboard project rows.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Rename | — | — | — | — | Turns the name into an inline input |
| Text input | Rename project | — | 120 chars | current name | — | Enter/blur commits, Escape cancels |
| Button | Duplicate | — | — | — | — | Creates '<name> copy' at the top of the list |
| Button | Delete | — | — | — | — | First click arms 'Confirm delete' |
| Button | Confirm delete | — | — | — | — | Deletes the project and its autosave |

## Interactions
Click Rename, edit, press Enter. Click Duplicate for a copy. Click Delete twice (arm, then confirm).

## States
Delete armed: the button turns red and reads 'Confirm delete'. Rename input autofocuses.

## Result
Rename updates the row immediately; Duplicate creates an independent copy; Delete removes the row (and its autosave) at once.

## Edge cases
Renaming to an empty/blank name is ignored (old name kept — the store trims and rejects empty). Deleting a project that is open in the editor closes it to the dashboard.

## Evidence
`src/components/Dashboard.tsx`, `src/store/projectStore.ts` · Audit: `audit/phase2/A-MANAGE/`

## Status
MATCH
