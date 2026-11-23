# A-DASH — Dashboard — project lists and new project
- **Phase:** 1
- **Reference behaviour:** The home screen lists the user's projects, most recently updated first, with a New Project action. Drafts are projects with no clips (or flagged draft). [ASSUMED] The list sorts by updated time, newest first — the standard for recent-project lists.
- **Where it lives:** Dashboard view (`src/components/Dashboard.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | New project name (optional) | — | 120 chars | empty | — | Enter creates the project |
| Button | New Project | — | — | — | — | Creates a project with Video 1 + Audio 1 tracks, opens the editor |
| Tabs | Recent / Drafts | — | — | Recent | — | Each shows a count |
| Button | Open project (row click) | — | — | — | — | Opens the editor with that project |

## Interactions
Type a name (optional) and click New Project, or press Enter in the name field. Click a project row to open it. Click Recent/Drafts to switch lists.

## States
Empty list: 'No projects yet.' / 'No drafts yet. …'. A new project is a draft until it has clips. Crash-recovery banner appears when an autosave was restored.

## Result
A new project appears at the top of Recent (and in Drafts), and the editor opens with empty Video 1 and Audio 1 tracks.

## Edge cases
Creating with an empty name uses 'Untitled Project'. Duplicate names are allowed (no uniqueness rule). Deleting the open project returns to the dashboard.

## Evidence
`src/components/Dashboard.tsx`, `src/store/projectStore.ts` (createProject) · Audit: `audit/phase2/A-DASH/`

## Status
MATCH
