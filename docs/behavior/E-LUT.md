# E-LUT — LUT filters (.cube import) and built-in looks
- **Phase:** 2
- **Reference behaviour:** A .cube LUT recolours the clip with trilinear sampling; intensity blends between the original and the LUT result. Three original Vidora looks are built in. A broken .cube file shows a readable error and changes nothing. [ASSUMED] The LUT applies after effects and before the colour adjustment in the pipeline.
- **Where it lives:** Effects left panel → 'LUT filters (.cube)' section; also the Filters tab.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Buttons | Built-in looks | — | — | — | — | Vidora Warm / Cool Teal / Mono |
| Slider | LUT intensity | 0 | 1 | 1 | 0.05 | 0 = original, 1 = full LUT |
| File input | Import .cube file | — | — | — | — | Accepts .cube files |
| Button | Clear LUT | — | — | — | — | Removes the LUT from the clip |

## Interactions
Select a clip, click a built-in look or import a .cube file; drag LUT intensity; Clear LUT to remove.

## States
Importing a file with a wrong size or entry count shows a readable error and keeps the previous LUT. The schema enforces data.length = size³×3.

## Result
The clip recolours in the preview immediately; the LUT is stored on the clip.

## Edge cases
LUTs are per-clip, not per-project. Importing a second LUT replaces the first.

## Evidence
`src/components/EffectsPanel.tsx`, `src/lib/lut.ts` · Audit: `audit/phase2/E-LUT/`

## Status
MATCH
