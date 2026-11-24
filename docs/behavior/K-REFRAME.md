# K-REFRAME — Auto reframe (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's inspector Smart tools list has "Auto reframe (Pro; change aspect ratios)" and the preview floating toolbar has "Auto reframe". Vidora's Auto reframe samples the selected video clip (one frame per second, downscaled), finds the subject by motion + saliency (frame differencing against a running background, centre-weighted), smooths the subject path, and stores a crop window per second that keeps the subject inside the target ratio. The preview applies the crop; the stored windows are per-clip data, editable by re-running. ASSUMED — the reference flow (pick ratio → subject stays framed) is matched; the subject finder is Vidora's own motion/saliency heuristic, honestly labelled.
- **Where it lives:** `src/lib/aiTools.ts` (`analyzeReframe`, `reframeWindowAt`), `src/components/AIToolsPanel.tsx` (Auto Reframe section), schema `clip.aiReframe`, `src/components/PreviewArea.tsx` (crop applied to the base clip frame).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Target ratio | — | — | 9:16 | — | 9:16, 1:1, 4:5, 16:9 |
| Button | Analyse & apply | — | — | — | — | Samples the clip, stores crop windows |
| Button | Clear reframe | — | — | — | — | Removes the stored windows |
| Note | Honest note | — | — | — | — | Motion/saliency heuristic; a static subject with a busy background may drift |

## Interactions
- Select a video clip, pick a ratio, click "Analyse & apply": the panel samples frames, shows "subject found in N of M samples" and the crop is applied — the preview reframes as the playhead moves. Scrub to check the subject stays in frame.
- Re-run with another ratio to replace the windows. "Clear reframe" restores the full frame.

## States
- No video clip selected: "Select a video clip first."
- No subject found (static frame, no motion): "No moving subject found — the centre crop is used instead."
- Analysis running: progress line.

## Result
The clip plays reframed to the target ratio with the subject kept in frame; the project ratio itself is unchanged (reframe is per clip).

## Edge cases
- Clip shorter than 1 s: a single centre window is stored.
- Subject leaves the frame: the window eases back to centre instead of jumping.
- Image clip: a single static window (subject = saliency centre) is stored.

## Evidence
`src/lib/aiTools.ts`, `src/test/phase7.test.ts` (synthetic moving-dot frames).

## Status
ASSUMED
