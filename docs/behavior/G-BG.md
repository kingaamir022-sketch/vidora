# G-BG — Backgrounds — blur, colour, gradient, image
- **Phase:** 2
- **Reference behaviour:** The background behind a clip (visible where the clip does not fill the frame, e.g. Fit mode or PiP): blurred frame, solid colour, gradient or an image URL. [ASSUMED] The default background is the blurred frame — the standard 'blurred background' look for vertical video in a wide frame.
- **Where it lives:** Properties panel → Mask & Compositing → 'Background'.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Background | — | — | blur | — | Blurred frame / Colour / Gradient / Image (from media) |
| Color | Background colour | — | — | #000000 | — | Only for Colour |
| Text | Background gradient | — | — | linear-gradient(135deg, #7C3AED, #06B6D4) | — | Only for Gradient; CSS gradient text |
| Text | Background image URL | — | — | empty | — | Only for Image; https://… or media URL |

## Interactions
Select a clip, pick a background type, set its colour/gradient/URL.

## States
Only the control for the chosen type is shown.

## Result
The preview background changes behind the clip at once.

## Edge cases
A gradient with fewer than two hex colours falls back to the Vidora violet→cyan gradient. A broken image URL shows nothing (the frame stays black behind the clip).

## Evidence
`src/components/MaskPanel.tsx`, `src/components/PreviewArea.tsx` · Audit: `audit/phase2/G-BG/`

## Status
MATCH
