# K-STABILIZE — Real motion stabilization (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's inspector Basic panel has a "Stabilize" toggle (Pro) and the Cleanup panel shows it too; Vidora's toggle was a stored flag only (BUG-D1). Phase 7 makes it real: translation-only stabilization by phase correlation — consecutive sampled frames (downscaled to 160×90) are correlated with a radix-2 FFT phase-correlation peak, giving a per-frame camera translation; the trajectory is low-pass smoothed and the inverse translation is applied in the preview (with a small zoom-in to hide the borders). Rotation, scale and rolling-shutter wobble are NOT corrected, and the panel says so. ASSUMED — the reference flow (toggle → steadier footage) is matched; the engine is Vidora's own phase-correlation stabiliser.
- **Where it lives:** `src/lib/aiTools.ts` (`estimateStabilization`, `phaseCorrelation`, `fft2d`, `smoothTrajectory`), `src/components/AIToolsPanel.tsx` (Stabilize section), schema `clip.aiStabilize` + `clip.aiStabilization` (per-sample dx/dy at 4 Hz), `src/components/PreviewArea.tsx` (inverse translation applied to the base clip frame).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Toggle | Stabilize | — | — | off | — | Stored per clip; needs analysis first |
| Slider | Smoothing | 0 | 1 | 0.6 | 0.05 | Higher = steadier but laggier |
| Slider | Zoom to hide borders | 1.0× | 1.2× | 1.05× | 0.01× | Crops the wobble edges |
| Button | Analyse motion | — | — | — | — | Samples the clip and stores the trajectory |
| Note | Honest note | — | — | — | — | Translation only; rotation/scale/rolling shutter are not corrected |

## Interactions
- Select a video clip, click "Analyse motion": the panel samples the clip (4 frames/sec), reports the average shake in pixels, and stores the trajectory. Turn the toggle on: the preview steadies. Move Smoothing to taste; Zoom hides the borders that appear when the frame is shifted.
- Re-analyse after trimming the clip (the trajectory is per clip time).

## States
- No video clip selected: "Select a video clip first."
- Static clip (no motion): "No camera shake found — nothing to stabilise."
- Analysis running: progress line.

## Result
Shaky footage plays steadier in the preview; the trajectory is stored per clip.

## Edge cases
- Clip with a moving subject and a static camera: the correlation locks onto the background (correct — the camera is the thing being steadied).
- Very dark / featureless frames: correlation peak is weak; those samples are skipped and the trajectory interpolates.
- Clip shorter than 1 s: a single zero offset is stored.

## Evidence
`src/lib/aiTools.ts`, `src/test/phase7.test.ts` (synthetic frames shifted by known amounts).

## Status
ASSUMED
