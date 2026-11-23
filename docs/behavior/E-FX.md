# E-FX — Video effects (Phase 5: 62 GLSL effects)
- **Phase:** 2 → 5 (Phase 5 grows the catalog from 14 to 62 effects; the panel shape is unchanged)
- **Reference behaviour:** The reference Effects tab has two groups — "Video effects" and "Body effects" (desktop screenshot 24; full walkthrough 2026-11-23). Video effects: a search box, quick chips (blur, Countdown, zoom lens, shake, retro, heart, glitter, dynamic, image noise, mosaic), and sections with "View all" — Favorites, Trending, Black Friday, Classic, Hits, B.Duck, Intro & Outro, Wild Pics, Party, Motion, 3D. Body effects (applied to detected bodies) are a Phase 7 candidate, not a Phase 5 gap. Effect names shown in the reference are CapCut content — all 62 Vidora effect names are ORIGINAL. [ASSUMED] Vidora keeps the Phase 2 application model (click to add to the selected clip, intensity + parameter sliders, × to remove) — the reference's per-effect intensity control was never observed; the panel groups effects by category rows (Colour, Light, Distort, Stylize, Retro, Motion) instead of the reference's named rows, because Vidora's rows are original content.
- **Where it lives:** Effects left panel (`src/components/EffectsPanel.tsx`); catalog in `src/lib/effects.ts` (14 CSS/pixel effects) + `src/lib/glslEffects.ts` (62 GLSL effects); WebGL2 renderer in `src/lib/glsl.ts`; compositor step in `src/lib/compositor.ts` (GLSL effects run after the pixel-effects step, on the working canvas).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | Search effects | — | — | empty | — | Substring on name/category |
| List | Categories | — | — | All | — | All, Colour, Light, Distort, Stylize, Retro, Motion |
| Buttons | Effect cards (62) | — | — | — | — | Auto thumbnail per effect; click to add |
| Slider | <Effect> intensity | 0 | 1 | 1 | 0.05 | Per applied effect |
| Slider | <Effect> parameter | per effect | per effect | per effect | per effect step | e.g. Strength, Amount, Radius |
| Button | Remove <effect> (×) | — | — | — | — | Per applied effect |

## Interactions
Select a clip, open the Effects tab, search or pick a category, click an effect card — it is added to the clip and the preview updates live (GLSL effects render through WebGL2; if WebGL2 is unavailable the panel says so and the effect is skipped, never silently faked). Drag intensity/parameter sliders; × removes it.

## States
No clip selected: the panel asks to select one. 'Applied effects' shows 'None yet.' when empty. Intensity 0 leaves the effect with no visible change. WebGL2 missing: GLSL cards show a "WebGL unavailable" note and are disabled; the 14 CSS/pixel effects still work.

## Result
The preview updates live with the effect stack applied (CSS → pixel → GLSL order); the stack is stored on the clip, undoable and autosaved. Every GLSL effect has an auto-generated thumbnail (a test gradient rendered through its shader, cached).

## Edge cases
Adding the same effect twice creates two entries (both apply). A GLSL shader that fails to compile is caught at render time, logged once, and that effect is skipped for the frame (the rest of the stack still renders).

## Evidence
`src/lib/glslEffects.ts` (GLSL_EFFECT_CATALOG, 62 entries), `src/lib/glsl.ts` (renderer), `src/components/EffectsPanel.tsx` · Audit: `audit/phase5/E-FX/` · Desktop screenshot 24-editor-effects-body.png · FULL-WALKTHROUGH-2026-11-23.md (Effects rows)

## Status
MATCH
