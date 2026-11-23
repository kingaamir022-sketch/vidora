# A-FOLDERS — Media folders and search
- **Phase:** 1
- **Reference behaviour:** The media library can be organised into folders and filtered by name. New imports go into the currently selected folder. [ASSUMED] Search is a case-insensitive substring match on the file name.
- **Desktop evidence (2026-11-23):** the desktop Media panel's "Yours" section holds Favorites, My presets and Brand assets (desktop screenshot 20) — a different organisation from Vidora's user-created folders. The desktop panel has no folder picker like Vidora's; its sub-nav is Media / Timeline / Subprojects with sections Yours / Generate / Spaces / Library / Dreamina (desktop screenshot 19). Vidora keeps its folders + search because the master spec requires them; the desktop Yours structure is noted for a later library review (Phase 8), not a Phase 1 rebuild.
- **Where it lives:** Media left panel.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Media folder | — | — | All media | — | Lists all folders |
| Text input | + Folder (new folder name) | — | 80 chars | empty | — | Enter/button creates the folder |
| Text input | Search media… | — | — | empty | — | Filters the list as you type |

## Interactions
Pick a folder to view it; type a folder name and add it; type in Search to filter.

## States
No matches: the media list is empty (no 'no results' message yet).

## Result
Only items in the selected folder (or all, for 'All media') matching the search text are shown.

## Edge cases
Folder names are trimmed and capped at 80 chars; an empty folder name is ignored. There is no rename/delete for folders yet (Phase 8 library work).

## Evidence
`src/components/MediaBrowser.tsx`, `src/store/projectStore.ts` (addFolder) · Audit: `audit/phase2/A-FOLDERS/` · Desktop screenshots 19-editor-media-import.png, 20-editor-media-yours.png (Yours = Favorites/My presets/Brand assets; sub-nav Media/Timeline/Subprojects)

## Status
MATCH
