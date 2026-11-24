# M-LENS — Lens correction (real) (Phase 9, Section M)

- **Phase:** 9 (built v1.0.0) — closes BUG-D2 (deferred since Phase 2).
- **Reference behaviour:** ASSUMED — lens correction was not found in CapCut Web either; Vidora implements the standard generic model: a single radial distortion coefficient, adjusted by eye, no camera/lens profiles.
- **Where it lives:** `src/lib/lens.ts` (pure math: `distortPoint`, `lensGrid`); applied in `src/lib/renderFrame.ts` (clip frame is remapped through a tile mesh before compositing); control in `src/components/ColorPanel.tsx` (Adjustment section); strength on the clip `Adjustment` (`lensCorrection` flag + new `lensStrength` −1…1, schema v1.0.0, migrates to 0).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Checkbox | Lens correction | — | — | off | — | Enables the correction for the selected clip |
| Slider | Strength | −1 | 1 | 0 | 0.05 | Negative = barrel fix (bulging lines straighten); positive = pincushion fix. Labelled "Generic correction — no camera profile; adjust by eye." |

## Interactions
- Enable + move the slider → the preview remaps the frame live; 0 = no change.
- The correction also applies in full export (same compositor path).
- Old projects: `lensCorrection` migrates to `false`, `lensStrength` to `0` — nothing changes visually.

## States
- Strength 0 with the box ticked: the frame is unchanged (identity remap).
- Very wide clips: the mesh is 12×12 tiles — fine detail is preserved, edges move smoothly.

## Result
A real, visible barrel/pincushion correction — no longer a stored flag.

## Edge cases
- Centre pixel never moves (distortion is zero at the centre) — verified by unit test.
- Strength at the extremes (±1) can pull edge pixels out of frame; the remap clamps to the frame edge (no transparent holes).

## Evidence
Standard single-coefficient radial distortion model (Brown's model, k1 only). No camera profiles exist in this build; the panel says so.

## Status
ASSUMED
