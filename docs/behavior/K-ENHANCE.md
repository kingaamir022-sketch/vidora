# K-ENHANCE — Low-light enhance, Retouch, Relight (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's inspector Smart tools list has "Retouch (beauty enhancement)" and "Relight (enhance lighting)"; low-light enhancement is a standard editor tool. Vidora implements all three as real per-frame pixel operations on the selected clip: Low-light = gamma lift + histogram stretch (brightens shadows without blowing highlights); Retouch = skin-tone mask + gentle blur on skin regions only (not a whole-frame blur); Relight = local-contrast lift from a blurred luminance map (dodges dark areas, holds bright ones). All three are sliders, live in the preview, stored per clip. ASSUMED — the reference flow (open tool → adjust → preview updates) is matched; the pixel engines are Vidora's own.
- **Where it lives:** `src/lib/aiTools.ts` (`applyLowLight`, `applyRetouch`, `applyRelight`, `skinMask`), `src/components/AIToolsPanel.tsx` (Enhance section), schema `clip.aiLowLight` / `clip.aiRetouch` / `clip.aiRelight` (0–1), `src/components/PreviewArea.tsx` (ops applied to the base clip frame).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Slider | Low-light | 0 | 1 | 0 | 0.05 | Shadow lift + stretch |
| Slider | Retouch | 0 | 1 | 0 | 0.05 | Skin smoothing strength |
| Slider | Relight | 0 | 1 | 0 | 0.05 | Local contrast / dodge |
| Note | Honest note | — | — | — | — | Pixel operations on the frame; Retouch only smooths skin-toned regions |

## Interactions
- Select a video/image clip, move any slider: the preview updates live. The three sliders combine (low-light first, then retouch, then relight). Set all to 0 to remove the effect.
- Retouch at 0 does nothing; at 1 skin regions are visibly smoothed while eyes/hair/clothes keep their detail.

## States
- No clip selected: sliders disabled with "Select a clip first."
- Image clip: the ops apply to the still image.

## Result
The clip renders enhanced in the preview; the amounts are stored per clip.

## Edge cases
- Very dark frame + Low-light 1: noise is amplified too — the panel note says low-light cannot create detail that is not there.
- No skin tones in frame: Retouch changes nothing visible.
- Performance: ops run at preview resolution (capped); on a slow machine the preview may drop frames with all three at 1.

## Evidence
`src/lib/aiTools.ts`, `src/test/phase7.test.ts` (synthetic frames with known brightness/skin pixels).

## Status
ASSUMED
