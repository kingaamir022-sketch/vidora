# K-BGREMOVE — Background removal (no green screen) (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's inspector Smart tools list has "Remove background (Pro)". Vidora's version is a heuristic edge segmentation, not an ML person model: the frame is downscaled, the background is the colour region connected to the frame edges (flood fill with a colour-distance threshold), and the result is a feathered alpha mask applied in the preview. It works on plain or simply textured backgrounds; it does not reliably cut out a person from a busy background, and the panel says so plainly. Chroma key (green screen) remains the precise tool and is unchanged. ASSUMED — the reference flow (toggle → subject isolated) is matched; the engine is Vidora's own heuristic.
- **Where it lives:** `src/lib/aiTools.ts` (`segmentBackground`, `applyAlphaMask`), `src/components/AIToolsPanel.tsx` (Background Removal section), schema `clip.aiBgRemove` + `clip.aiBgThreshold`, `src/components/PreviewArea.tsx` (mask applied to the base clip frame).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Toggle | Remove background | — | — | off | — | Stored per clip |
| Slider | Edge tolerance | 5 | 80 | 25 | 1 | Colour distance from edge pixels |
| Slider | Feather | 0 | 10 px | 3 px | 1 px | Soft edge on the mask |
| Note | Honest note | — | — | — | — | Heuristic edge segmentation; plain backgrounds work best; true ML person cutout needs a model |

## Interactions
- Select a video/image clip, turn the toggle on: the preview isolates the subject against transparency (checkerboard behind it in the preview background). Move the tolerance slider until the background is gone without eating the subject; feather softens the edge.
- Works together with the Background setting (blur/colour/gradient) — the isolated subject sits on the chosen background.

## States
- Toggle off: no processing, full frame.
- Busy background: parts of the background survive; the note explains why and suggests chroma key or a plainer background.

## Result
The clip renders with its background removed in the preview; the mask is stored per clip.

## Edge cases
- Subject touches the frame edge: the flood fill can leak into the subject — lower the tolerance.
- Image clip: mask computed once from the still image.
- Video clip: mask recomputed per frame in the preview (downscaled, capped at preview resolution).

## Evidence
`src/lib/aiTools.ts`, `src/test/phase7.test.ts` (synthetic solid-background frames).

## Status
ASSUMED
