# X-AUTOSAVE — Autosave and crash recovery
- **Phase:** 1
- **Reference behaviour:** The project autosaves every 3 seconds while dirty. On load, if an autosave is newer than the saved project, it is restored and a cyan banner on the dashboard says so, with a Dismiss button. [ASSUMED] Autosave and the project list share localStorage; a cleared browser profile loses both (no cloud backup until Phase 8).
- **Where it lives:** Automatic (`src/store/projectStore.ts`, startAutosave); dashboard banner.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text | ● Unsaved / ✓ Saved | — | — | — | — | Top bar save state |
| Banner | Recovered unsaved changes for "<name>" from autosave. | — | — | — | — | Dashboard, with Dismiss button |
| Button | Dismiss | — | — | — | — | Hides the banner |

## Interactions
Edit anything and wait 3 seconds; reload the page.

## States
While dirty the top bar shows '● Unsaved'; after a save it shows '✓ Saved'.

## Result
Edits survive a reload; a newer autosave is restored with the banner shown.

## Edge cases
If the browser profile is cleared, projects are gone (localStorage only). The banner only appears when the autosave is strictly newer than the saved copy.

## Evidence
`src/store/projectStore.ts` (startAutosave, loadWithRecovery, saveNow) · Audit: `audit/phase2/X-AUTOSAVE/`

## Status
MATCH
