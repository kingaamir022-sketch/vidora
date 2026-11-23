# H-TRACK — Motion tracking (manual)
- **Phase:** 3
- **Reference behaviour:** RESOLVED (Web, signed-in full walkthrough 2026-11-23): the reference HAS camera tracking — Smart tools → "Camera tracking (Pro; camera follows a selected subject)". How the subject is picked and whether tracking writes keyframes was not shown, and no desktop tracking UI has been seen. Vidora's implementation is a deliberately honest MANUAL substitute: an overlay clip (text/sticker) attaches to a target video/image clip, and the user places track points by clicking on the preview at different playhead times; the overlay's position interpolates between the points. The UI labels this plainly: "Manual tracking points — automatic detection is Phase 7". No fake auto-tracking is claimed.
- **Where it lives:** Tracking section of the right Properties panel (`src/components/PropertiesPanel.tsx`); point placement in `src/components/PreviewArea.tsx` (`onCanvasPointerDown` when tracking mode is on); interpolation in `src/components/PreviewArea.tsx` (`trackingPositionAt`); stored on the clip (`clip.tracking: { targetClipId, points: { time, x, y }[] }`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Follow clip | — | — | Not attached | — | Lists video/image clips except the selected one |
| Toggle | Add track points | — | — | off | — | While on, clicks on the preview add a point at the playhead |
| List | Track points | — | — | — | — | Shows time → x, y per point |
| Button | Clear track points | — | — | — | — | Removes all points (keeps the attachment) |

## Interactions
Select an overlay clip, pick a target clip in "Follow clip", click "Add track points", move the playhead and click on the preview at each time — a point is added at that time and position. Scrub the playhead: the overlay follows the interpolated path.

## States
Not attached: no tracking controls beyond the dropdown. Attached with no points: the overlay stays at its Transform position. With 1 point: the overlay sits at that point for the whole clip. With 2+ points: linear interpolation between them; before the first / after the last point the nearest point holds.

## Result
The overlay's centre follows the manual path during playback and scrubbing; points are stored in the project JSON, undoable and autosaved.

## Edge cases
A point added within 0.05s of an existing point replaces it. Detaching (choosing "Not attached") removes the whole tracking object. Tracking points are absolute preview coordinates (0–1), independent of the clip's Transform position.

## Evidence
Reference: FULL-WALKTHROUGH-2026-11-23.md (Smart tools → "Camera tracking (Pro; camera follows a selected subject)" — Web signed-in evidence; desktop tracking UI unseen) · `src/components/PropertiesPanel.tsx`, `src/components/PreviewArea.tsx`

## Status
ASSUMED — reference camera tracking exists (Web, Smart tools, Pro); how the subject is picked and whether it writes keyframes is still unknown, and Vidora's manual track points are the chosen honest substitute (auto detection is Phase 7).
