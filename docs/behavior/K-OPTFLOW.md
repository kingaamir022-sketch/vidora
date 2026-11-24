# K-OPTFLOW — Optical-flow smooth slow motion (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's inspector Smart tools list has "Optical flow (smoother motion by …)" and the Speed panel has a "Smooth slow-mo" switch; Vidora's switch was a stored flag only (BUG-D6). Phase 7 makes it real as an offline render: block-matching motion estimation (16×16 blocks, sum-of-absolute-differences search) finds per-block motion vectors between consecutive frames, and intermediate frames are motion-compensated warps — so a slowed clip gets real in-between frames instead of duplicated ones. The render produces a new media item at 2× frame rate; the preview slow-mo itself stays frame-blend (the panel says so). ASSUMED — the reference flow (smooth slow-mo → smoother motion) is matched; the estimator is Vidora's own block matcher, honestly labelled.
- **Where it lives:** `src/lib/aiTools.ts` (`estimateMotionVectors`, `interpolateFrame`), `src/components/AIToolsPanel.tsx` (Optical Flow section), schema `clip.aiOpticalFlow` (flag: render with flow), offline render in the panel via canvas + MediaRecorder.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Toggle | Smooth slow-mo (optical flow) | — | — | off | — | Stored per clip; preview uses frame blend |
| Button | Render 2× frames | — | — | — | — | Offline render → new media item at 2× fps |
| Select | Block size | — | — | 16 px | — | 8 / 16 / 32 px (smaller = finer, slower) |
| Note | Honest note | — | — | — | — | Block-match interpolation, not a neural flow model; fast/complex motion can smear |

## Interactions
- Select a video clip with speed < 1 (or set the Speed first), turn the toggle on, click "Render 2× frames": the panel renders the clip offline (canvas draws original + interpolated frames, MediaRecorder captures at 2× fps) and adds the result as a new media item, "… (flow 2×)". The new clip replaces the slowed clip on request ("Use rendered clip" button).
- Block size 8 is finer but ~4× slower; 32 is fastest and coarsest.

## States
- No video clip selected: "Select a video clip first."
- Clip speed is 1×: the render still works (2× fps version of the same motion).
- Render running: progress bar (frames done / total), cancellable.

## Result
A new 2×-fps media item with motion-compensated in-between frames; the original clip is untouched.

## Edge cases
- Clip longer than 30 s: the panel warns the render will take a while and offers to trim first.
- Scene cut inside the clip: vectors across the cut are nonsense — the renderer detects large frame differences and falls back to a plain blend for that pair.
- Render cancelled: the partial file is discarded, nothing is added.

## Evidence
`src/lib/aiTools.ts`, `src/test/phase7.test.ts` (synthetic translating square: interpolated frame matches the midpoint).

## Status
ASSUMED
