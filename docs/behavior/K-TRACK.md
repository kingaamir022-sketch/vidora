# K-TRACK — Camera tracking, automatic (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's inspector Smart tools list has "Camera tracking (Pro; camera follows a selected subject)" and the full walkthrough notes it follows a selected subject. Vidora's Phase 3 tracking is manual track points (BUG-D9). Phase 7 adds automatic tracking: the user clicks the subject once in the preview (or uses the frame centre), and a normalised cross-correlation template tracker follows that patch frame by frame (downscaled, search window around the last position), writing the same `tracking.points` the manual tool uses — so the overlay follows the subject and the points stay editable by hand afterwards. ASSUMED — the reference flow (pick subject → camera follows) is matched; the tracker is Vidora's own NCC template matcher, honestly labelled.
- **Where it lives:** `src/lib/aiTools.ts` (`trackTemplate`, `nccAt`), `src/components/AIToolsPanel.tsx` (Camera Tracking section), schema `clip.tracking` (reused from Phase 3), `src/components/PreviewArea.tsx` (overlay follows `trackingPositionAt`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Pick subject & track | — | — | — | — | Click the subject in the preview first, or centre is used |
| Button | Track from centre | — | — | — | — | No click needed |
| Number | Track every | 0.1 s | 1 s | 0.25 s | 0.05 s | Point spacing |
| Button | Clear tracking | — | — | — | — | Removes the points |
| Note | Honest note | — | — | — | — | Template matching; fast motion, occlusion or a subject that changes shape can lose the lock — the points stay editable |

## Interactions
- Select an overlay clip (text/sticker) that should follow a subject, click "Pick subject & track", then click the subject in the preview: the tracker samples the clip's video frames from the playhead to the clip end and writes track points. Play to watch the overlay follow.
- "Track from centre" skips the click. "Clear tracking" removes the points; manual points (Phase 3) can be added afterwards.

## States
- No overlay clip selected: "Select a text or sticker clip first."
- Lock lost mid-track: points stop at the last good match and the panel says at which time.
- Tracking running: progress line, buttons disabled.

## Result
The overlay clip follows the subject across the clip; the track points are normal manual points afterwards.

## Edge cases
- Subject leaves the frame: tracking stops at the last visible position.
- Very short clip (< 1 s): at least 2 points are written.
- The tracked clip is a video clip itself: tracking still works (points are stored on the clip and move its overlay position).

## Evidence
`src/lib/aiTools.ts`, `src/test/phase7.test.ts` (synthetic moving-dot frames).

## Status
ASSUMED
