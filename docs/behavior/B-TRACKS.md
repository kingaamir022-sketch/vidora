# B-TRACKS — Timeline tracks — add, lock, hide, mute
- **Phase:** 1
- **Reference behaviour:** The timeline has unlimited tracks of kind video, audio or text. Each track header shows its name, kind and lock/hide/mute controls. New projects start with Video 1 and Audio 1. [ASSUMED] A locked track cannot be edited; a hidden track is dimmed and excluded from the preview; a muted audio track is silent — the standard meanings.
- **Where it lives:** Timeline left header column (`src/components/TimelineShell.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | + Video track | — | — | — | — | Appends a video track |
| Button | + Audio | — | — | — | — | Appends an audio track |
| Button | + Text | — | — | — | — | Appends a text track |
| Button | Lock (🔒/🔓) | — | — | unlocked | — | Per track |
| Button | Hide (👁/🙈) | — | — | visible | — | Per track |
| Button | Mute (🔊/🔇) | — | — | — | — | Per track |

## Interactions
Click '+ Video track' / '+ Audio' / '+ Text'. Click a track header to select it. Click lock/hide/mute to toggle.

## States
Hidden track rows render at 35% opacity. A new track is named '<Kind> <n>'.

## Result
The track appears (or its state changes) immediately; hidden video tracks disappear from the preview.

## Edge cases
Adding a track while a clip is selected does not move the selection. Track headers have no rename control yet (Phase 8).

## Evidence
`src/components/TimelineShell.tsx`, `src/store/projectStore.ts` (addTrack, setTrackProp) · Audit: `audit/phase2/B-TRACKS/`

## Status
MATCH
