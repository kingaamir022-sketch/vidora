# N-ASSETS — Asset build + manifest (Phase 5: `npm run build:assets`)
- **Phase:** 5 (Phase 0 shipped logo-icon generation only; Phase 5 makes `build:assets` regenerate the whole library)
- **Reference behaviour:** None — this is Vidora's own tooling, marked ASSUMED. `npm run build:assets` regenerates every derived asset from the TypeScript catalogs (the single source of truth) and writes a license report. It is idempotent and safe to run twice: outputs are deterministic, downloads are skipped when the file already exists, and a failed download never deletes an existing file.
- **Where it lives:** `scripts/build-assets.mjs` (Node 24 — imports the `.ts` catalogs directly via type stripping); outputs: `assets/manifest.json` (every catalog entry: id, name, category, tags, license), `assets/luts/*.cube` (30), `assets/stickers/animated/*.json` (28 Lottie-style specs), `assets/fonts/manifest.json` + `public/fonts/fonts.css` + `public/fonts/*.woff2` (40, downloaded from Google Fonts), `LICENSES/OFL-1.1.txt`, `LICENSES/Apache-2.0.txt`, and the generated Phase 5 section of `LICENSES/PROVENANCE.md` (between `<!-- PHASE-5-BEGIN -->` / `<!-- PHASE-5-END -->` markers).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Command | `npm run build:assets` | — | — | — | — | Prints a per-section summary with counts |

## Interactions
Run `npm run build:assets` after editing any catalog. It prints what it wrote (icons, manifest entries, LUT files, animated sticker files, fonts downloaded/skipped, license report rows) and exits non-zero with a readable error if a catalog count drops below its Phase 5 minimum (effects 62, transitions 32, LUTs 30, stickers 224, fonts 40, text presets 50, caption presets 20, templates 25, loops 30, SFX 100, backgrounds 30).

## States
Offline run: font downloads are skipped with a warning (existing files stay); everything else still regenerates. A catalog below its minimum fails the run loudly instead of writing a short manifest.

## Result
`assets/manifest.json` lists every asset with id/name/category/tags/license; the license report lists every asset's source and license; the app reads the manifest at runtime for the Built-in assets browser counts.

## Edge cases
The manifest is JSON (text) and ships in the GitHub snapshot. Font `.woff2` files are binary and are NOT in the GitHub snapshot (connector is text-only) — they ship in the Drive archive; the app falls back to system stacks when a file is missing.

## Evidence
`scripts/build-assets.mjs`, `assets/manifest.json` · Audit: `audit/phase5/N-ASSETS/` (build:assets runs clean twice, manifest counts match the catalogs, license report lists every asset)

## Status
ASSUMED
