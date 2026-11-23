# A-IMPORT — Media import — picker, drag-drop, metadata, thumbnails
- **Phase:** 1
- **Reference behaviour:** Media is imported from the user's files into the project library. Each item is probed for real metadata and a thumbnail frame. Supported types are video, image, audio and GIF. [ASSUMED] Imported files stay as local object URLs in the browser session (no upload); the project stores the reference, not the bytes.
- **Desktop evidence (2026-11-23):** the Media panel has a left sub-nav — Import (expanded), Media, Timeline, Subprojects — and collapsible sections Yours, Generate (AI badge), Spaces, Library, Dreamina (desktop screenshot 19). The Import drop zone reads "Drag and drop videos, photos, and audio files here" with an "Import" button, and below it "No media? Create with these tools" with three buttons: Generate, AI avatars, Record. The "Yours" section holds Favorites, My presets and Brand assets, with the empty state "Your favorite items will appear here. Go to Library" (desktop screenshot 20). Vidora's Media panel has import + folders + search only; Generate/Spaces/Library/Dreamina are Phase 5–8 scope and are honestly labelled in the panel. How the desktop sub-nav entries (Timeline, Subprojects) behave is UNKNOWN — full check pending.
- **Where it lives:** Media left panel (`src/components/MediaBrowser.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Import files | — | — | — | — | Opens the OS file picker |
| File input | accept video/*,image/*,audio/*,.gif | — | — | — | — | Multiple files allowed |
| Drop zone | Media panel drop area | — | — | — | — | Drag files onto the panel; highlight while dragging |
| Button | Add to timeline | — | — | — | — | Per media item; appends a clip to the matching track |

## Interactions
Click 'Import files' and pick files, or drag files onto the Media panel. While importing, the panel shows 'Importing…'. Click 'Add to timeline' on an item to place it.

## States
Importing: button disabled with 'Importing…' text. Each item shows a thumbnail, name, duration/dimensions/size/MIME.

## Result
The item appears in the library with a real thumbnail (first video frame / scaled image) and probed metadata; 'Add to timeline' creates a clip at the end of the matching track.

## Edge cases
An unsupported file type is skipped by the picker (accept filter); a file whose probe fails produces no item. Images/GIFs default to 5s on the timeline. Audio items have no thumbnail (they are audio).

## Evidence
`src/components/MediaBrowser.tsx`, `src/lib/media.ts` (importFile, probeVideo, probeImage) · Audit: `audit/phase2/A-IMPORT/` · Desktop screenshots 19-editor-media-import.png, 20-editor-media-yours.png (sub-nav Media/Timeline/Subprojects; sections Yours/Generate/Spaces/Library/Dreamina; import drop zone + Generate/AI avatars/Record)

## Status
MATCH
