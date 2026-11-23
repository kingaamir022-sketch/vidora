# J-DETACH — Separate audio (detach audio onto its own track)
- **Phase:** 4
- **Reference behaviour:** The reference clip right-click menu has "Separate audio (Ctrl Shift S) — detaches the audio onto its own track". The shortcuts dialog also lists "Separate audio Ctrl Shift S". The timeline track header has a link icon (link/unlink the clip's audio and video). No toolbar button for it was observed.
- **Where it lives:** Context menu + keyboard shortcut + inspector button (`TimelineShell.tsx`, `PropertiesPanel.tsx`, `src/lib/shortcuts.ts`); pure operation in `src/lib/timeline.ts` (`detachAudio`); store action `detachAudio()` in `src/store/projectStore.ts`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Context menu item | Separate audio (Ctrl+Shift+S) | — | — | — | — | On video clips with audio only |
| Shortcut | Ctrl+Shift+S | — | — | — | — | Same action; listed in the Shortcuts dialog |
| Button | Separate audio | — | — | — | — | In the clip Audio section (video clips only) |

## Interactions
- Run on a selected video clip: creates an audio clip on the first free audio track (or a new "Audio N" track) at the same start/duration, same media, same volume, named "<clip name> (audio)", with `linkedClipId` pointing at the video clip. The video clip is muted (`muted: true`, `audioDetached: true`) so its sound does not double. One undo step reverses both.
- The new audio clip is selected after the operation.

## States
- Video clip with `audioDetached: true`: the menu item / button is disabled and reads "Audio already separated".
- Image/text/sticker/audio clip selected: the item is hidden (audio clips have no video to separate from).
- Video clip whose media has no audio track: the item is disabled with the note "This clip has no audio".

## Result
After detach, the timeline has an independent audio clip that can be trimmed, moved, faded, or deleted without touching the video clip; the video clip plays silent.

## Edge cases
- Detach at a trimmed video clip: the audio clip copies the same sourceStart/duration/speed, so it stays in sync.
- Deleting the video clip afterwards leaves the audio clip in place (it is independent once created).
- Detach while the video clip is reversed: allowed; the audio clip is created with the same speed, and reversed audio is muted (see J-INSPECTOR).

## Evidence
FULL-WALKTHROUGH-2026-11-23.md (clip right-click menu: Separate audio Ctrl Shift S; shortcuts dialog; track-header link icon) · `src/lib/timeline.ts`, `src/store/projectStore.ts`

## Status
MATCH — observed in the reference context menu and shortcuts dialog.
