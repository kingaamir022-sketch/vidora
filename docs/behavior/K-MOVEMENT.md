# K-MOVEMENT — AI movement / dynamic camera moves (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's inspector Smart tools list has "AI movement (dynamic camera movements)". Vidora's version is a deterministic camera-move generator: pick a move (Zoom in, Zoom out, Pan left, Pan right, Tilt up, Tilt down, Dolly-in arc) and the tool writes scale/position keyframes across the selected clip (the existing keyframe engine plays them), so the move is real, editable and undoable afterwards. No ML camera is claimed. ASSUMED — the reference flow (pick a move → clip moves) is matched; the move paths are Vidora's own keyframe presets.
- **Where it lives:** `src/lib/aiTools.ts` (`cameraMoveKeyframes`, `CAMERA_MOVES`), `src/components/AIToolsPanel.tsx` (AI Movement section), schema `clip.aiMovement` (kind, 'none' = no move), keyframes in `clip.keyframes` (standard engine).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Camera move | — | — | Zoom in | — | Zoom in/out, Pan left/right, Tilt up/down, Dolly arc |
| Slider | Strength | 0.1 | 1 | 0.5 | 0.05 | How far the camera travels |
| Button | Apply move | — | — | — | — | Writes scale/position keyframes |
| Button | Clear move | — | — | — | — | Removes the move keyframes |
| Note | Honest note | — | — | — | — | Keyframed camera path, not an ML camera; edit the keyframes afterwards |

## Interactions
- Select a video/image clip, pick a move and strength, click "Apply move": scale/position keyframes appear across the clip and the preview moves as the playhead scrubs. Open the Keyframes panel to edit or delete individual points.
- "Clear move" removes only the keyframes this tool wrote (tagged by property + the move id).

## States
- No clip selected: "Select a clip first."
- Clip already has a move: the select shows it; applying another replaces it.

## Result
The clip plays with a smooth camera move; the move is ordinary keyframes.

## Edge cases
- Clip shorter than 0.5 s: the move still applies (2 keyframes, start/end).
- Image clip: the move applies the same way (Ken Burns effect).
- Strength 1 + Zoom in: scale reaches ~1.5× at the end; the preview crops accordingly.

## Evidence
`src/lib/aiTools.ts`, `src/test/phase7.test.ts` (keyframe values at start/end).

## Status
ASSUMED
