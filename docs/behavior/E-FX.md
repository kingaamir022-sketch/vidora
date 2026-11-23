# E-FX — Video effects
- **Phase:** 2
- **Reference behaviour:** Fourteen real video effects, each with an intensity slider and its own parameters, applied in the preview and stored on the clip. Effects: Blur, Brightness, Grayscale, Sepia, Invert, Hue Rotate, Contrast, Saturate, Pixelate, Vignette, RGB Split, Glitch, Glow, Vivid. [ASSUMED] Effects apply in the order they were added (top of the applied list first).
- **Desktop evidence (2026-11-23):** the Effects tab has TWO groups — "Video effects" and "Body effects" (desktop screenshot 24). Body effects has its own categories: Trending, Pro, Hits, Clone, Glowing lines, Stroke, shown as a grid of named cards with download icons and Pro diamond badges. Vidora's Phase 2 effects are clip effects (the Video-effects group only); body effects are a Phase 7 candidate, not a Phase 2 parity gap. Effect names shown in the reference are CapCut content — Vidora's 14 effects keep original names.
- **Where it lives:** Effects left panel (`src/components/EffectsPanel.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Buttons | Video effects (14) | — | — | — | — | Click to add to the selected clip |
| Slider | <Effect> intensity | 0 | 1 | 1 | 0.05 | Per applied effect |
| Slider | <Effect> parameter | per effect | per effect | per effect | per effect step | e.g. Pixelate size, Blur radius |
| Button | Remove <effect> (×) | — | — | — | — | Per applied effect |

## Interactions
Select a clip, open the Effects tab, click an effect to add it; drag its intensity/parameter sliders; × removes it.

## States
No clip selected: the panel asks to select one. 'Applied effects' shows 'None yet.' when empty. Intensity 0 leaves the effect with no visible change.

## Result
The preview updates live with the effect stack applied; the stack is stored on the clip, undoable and autosaved.

## Edge cases
Adding the same effect twice creates two entries (both apply). Removing an effect re-renders without it at once.

## Evidence
`src/components/EffectsPanel.tsx`, `src/lib/effects.ts` (EFFECT_CATALOG) · Audit: `audit/phase2/E-FX/` · Desktop screenshot 24-editor-effects-body.png (Video/Body effects groups; Body categories Trending/Pro/Hits/Clone/Glowing lines/Stroke)

## Status
MATCH
