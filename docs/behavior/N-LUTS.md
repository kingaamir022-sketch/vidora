# N-LUTS — Procedural LUT library (Phase 5: 32 looks)
- **Phase:** 5
- **Reference behaviour:** See F-FILTERS (the Filters tab). This card covers the library itself: 32 original procedural looks, each a size-8 3D LUT generated from a colour transform in `src/lib/lut.ts`, each with an auto thumbnail (a test gradient sampled through the LUT) and a `.cube` file in `assets/luts/` written by `npm run build:assets`. All look names are ORIGINAL. Categories: Warm (6), Cool (6), Film (6), Mono (4), Vivid (5), Soft (5).
- **Where it lives:** `src/lib/lut.ts` (`BUILTIN_LUTS`, 32 entries; `generateLut`, `lutToCubeText`, `parseCube`, `sampleLut`, `applyLutToPixels`); `.cube` files in `assets/luts/`; thumbnails in `src/components/EffectsPanel.tsx` (`lutThumbnail`, cached data URL).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| (none — library) | — | — | — | — | — | Surfaced by the Filters tab; see F-FILTERS |

## Interactions
None directly — the Filters tab applies looks; `npm run build:assets` regenerates the `.cube` files from the catalog.

## States
Every look's `.cube` file round-trips: `parseCube(lutToCubeText(name, 8, data))` returns the same size and data within 1e-6. A look with intensity 0 is a no-op in the compositor.

## Result
32 looks, each usable on any clip, each exportable as a standard `.cube` file a user can take elsewhere.

## Edge cases
`.cube` files are size 8 (512 RGB entries) — small by design so the library stays light; the parser accepts size 2–64 for imports.

## Evidence
`src/lib/lut.ts`, `assets/luts/*.cube` (32 files) · Audit: `audit/phase5/N-LUTS/` (round-trip check for all 32 + thumbnail presence)

## Status
MATCH
