# Vidora — Provenance Report (Phase 0)

Every asset in this repo is either **ORIGINAL** (created for Vidora in this
project) or openly licensed. No third-party trademarks, logos, characters,
artist names, song melodies/lyrics, proprietary assets or copied source code.

| Asset | Source / author | License |
|---|---|---|
| App name "Vidora", tagline "Create. Cut. Shine." | Original, created for this project | MIT (this repo) |
| Logo, wordmark, favicon, splash screen (`public/logo.svg`, `wordmark.svg`, `favicon.svg`, `splash.svg`, `logo-dark.svg`, `logo-light.svg`) | Original SVG artwork, created for this project | MIT |
| App icons 16–512px (`public/icons/`) | Original, regenerated from `public/logo.svg` by `scripts/build-assets.mjs` | MIT |
| Icon set (`src/components/icons.tsx`) | Original hand-drawn SVG paths | MIT |
| Design tokens (`design/tokens.json`) | Original | MIT |
| All source code (`src/`, `scripts/`, configs) | Original, written for this project | MIT |
| Sample project "Sunset Coast — Sample Project" (`src/schema/project.ts`) | Original placeholder content (title card only, no real media) | MIT |
| Fonts referenced in tokens/CSS | System font stack only (Inter, system-ui, sans-serif) — no font files ship in Phase 0 | n/a |
| Third-party libraries (React, Vite, Zustand, Zod, Tailwind CSS, TypeScript, Vitest) | Open-source packages, used under their own licenses (MIT/Apache-2.0); see `package.json` and each package's LICENSE | As per package |

## Rules applied

- No trademarks, logos, characters, artist names, song melodies/lyrics or
  proprietary assets anywhere in the repo.
- No copied source code. All code is written for Vidora.
- Future phases (5–6) must extend this report per asset: every effect,
  template, sticker, font, music track, clip and voice gets a row here
  (asset → source/model/license) before it ships.
