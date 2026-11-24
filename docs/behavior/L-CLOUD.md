# L-CLOUD — Cloud backup (Phase 8, Section L)

- **Phase:** 8 (built v0.9.0)
- **Reference behaviour:** ASSUMED — CapCut's Library page says "Your generated assets sync across CapCut web, mobile, and desktop" (screenshot 17-library-empty.png), i.e. cloud sync is a server account feature. Vidora has no server and the user's budget is zero, so there is no account sync. The honest local-first equivalent, designed around what exists: the user's Google Drive is the cloud — a Vidora backup is a `.vidora` bundle file the user saves into their Drive `All softwares / Vidora` folder (the same folder the release zips live in). The panel says this plainly: "Vidora has no server. A backup is a file — save it to your Drive folder and it is your cloud copy."
- **Where it lives:** Dashboard "Backups" section (`src/components/Dashboard.tsx`); bundle logic in `src/lib/cloudBackup.ts`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Back up this project | — | — | — | — | Downloads `<name>-<date>.vidora` (project JSON + comments + shared-with list + media metadata) |
| Button | Import backup | — | — | — | — | File picker for a `.vidora` file; creates a NEW project (never overwrites) |
| List | Backups | — | — | — | — | Local record of bundles made in this browser: project name, date, size; "Download again" is NOT available (the file lives in Downloads/Drive, not in the browser) — the list is a record, labelled as such |
| Button | Restore (per backup record) | — | — | — | — | Opens the file picker: pick the same `.vidora` file to restore it |
| Note | Media note | — | — | — | — | "Media files are NOT inside the bundle (they are large). After restore, re-import the same files — clips re-link automatically by file name and size." |

## Interactions
- Back up → the bundle downloads; a record is added to the Backups list.
- Import a bundle → validated (kind + version); a new project appears on the dashboard with "(restored)" in its name; its clips show "Media missing — re-import" badges until the files are re-imported.
- Re-import a file with the same name AND size as a bundle's media entry → every clip using that media gets its source back automatically (re-link by name+size); the badge clears.
- Import a broken/non-Vidora file → readable error "This is not a Vidora backup file".

## States
- No backups: empty state "No backups yet — back up a project and keep the file in your Drive folder".
- Restored project with missing media: clips show the missing-media badge; the project still opens and edits.

## Result
A project can be saved as a file, moved (e.g. to Drive), and restored on any machine with Vidora, with media re-linking by name+size.

## Edge cases
- Bundle from a newer Vidora version → rejected with "This backup was made by a newer Vidora (vX) — update first".
- Two files with the same name but different sizes → no re-link (size must match too).
- Bundle media entry with a name that matches two files in the project → the first match wins; the panel lists which files re-linked.

## Evidence
CapCut Library sync line (screenshot 17); no server exists for Vidora — the file-based design is stated in the panel and in SPEC.md Phase 8.

## Status
ASSUMED (local-first file backup as the honest cloud equivalent)
