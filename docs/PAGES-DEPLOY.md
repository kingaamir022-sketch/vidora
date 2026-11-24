# Vidora on GitHub Pages — deploy notes

**Live URL:** https://kingaamir022-sketch.github.io/vidora/
(no install needed — open the link in a browser and use Vidora directly.)

## How it works

Vidora is a static Vite + React app, so GitHub Pages can host it with no
server. The site is a **project Pages site**, which lives under the subpath
`/vidora/` — every asset URL in the build must sit under that subpath, or
the app loads a blank page with 404s.

- `vite.config.ts` reads the deploy base from the environment:
  `base: process.env.VITE_BASE || '/'`. Local dev/preview keep `/`; the
  Pages workflow builds with `VITE_BASE=/vidora/`.
- Vite rewrites the URLs in `index.html` (favicon, fonts.css, JS/CSS
  bundles) with the base automatically at build time.
- Runtime absolute paths are base-aware by hand:
  - `src/lib/aiLibrary.ts` — the AI-library manifest stores root-absolute
    paths (`/ai-library/...`); `withBase()` prefixes them with
    `import.meta.env.BASE_URL` when the catalog is built. All consumers
    (panel, audio/video preview, availability probes) read the prefixed
    values, so no other file needs the base.
  - `src/components/TopBar.tsx`, `src/components/Dashboard.tsx` — the
    logo uses `` `${import.meta.env.BASE_URL}logo.svg` ``.
  - `public/fonts/fonts.css` — the 40 `@font-face` URLs are relative
    (`url('./inter.woff2')`, …). Vite copies `public/` verbatim, so
    absolute URLs there would have broken under `/vidora/`; relative
    URLs resolve against the CSS file's own location and work at any base.
- No client-side router exists in the app (no react-router), so no
  `404.html` SPA fallback is needed — every view is the same page.

## Workflow

`.github/workflows/pages.yml` (added after v1.0.0; GitHub Apps cannot
create workflow files, so it was added via the GitHub website):

- Triggers: every push to `main`, plus manual `workflow_dispatch`.
- Permissions: `pages: write`, `id-token: write`, `contents: read`.
- Steps: `actions/checkout@v4` → `setup-node@v4` (Node 20, npm cache) →
  `npm ci` → `npm run build` with `VITE_BASE=/vidora/` →
  `actions/upload-pages-artifact@v3` (path `dist`) →
  `actions/deploy-pages@v4`.
- Concurrency group `pages`, `cancel-in-progress: false` — a running
  deploy is never cancelled halfway (a half-published site is worse
  than a queued one).

## First-time setup (repo settings, one time)

1. Repo → **Settings → Pages → Build and deployment → Source** →
   **GitHub Actions** (not "Deploy from a branch").
2. Push to `main` (or run the workflow manually from the **Actions** tab).
3. Wait for the green run, then open the live URL above.

## Known limits (honest)

- **No ffmpeg.wasm in the app at all** — export uses `mediabunny`
  (WebCodecs), not ffmpeg.wasm, and there is no `SharedArrayBuffer` use
  in `src/`. GitHub Pages sends no COOP/COEP headers, but nothing in
  Vidora needs them, so this is not a limit in practice.
- The offline AI models (Vosk ~41 MB, Piper ~63 MB) are download-on-demand
  and are **not** served from Pages — AI captions / narration need the
  models installed locally (see `tools/download-models.sh`). On Pages,
  those two tools report the models as missing instead of working.
- Projects live in the browser's `localStorage` — per browser, per
  device. Cloud backup (`.vidora` files, Phase 8) is the way to move a
  project between machines.
- The AI library media (~97 MB, 510 files) ships inside `dist/`, so the
  first load downloads what the library panel actually requests (music
  and clips load on demand, not all at once).

## Local verification (how the deploy was checked)

- `npm test` — 313/313 (23 files), including the new
  `src/test/pages.test.ts` (base-aware library paths).
- `npm run build` (default base) and `VITE_BASE=/vidora/ npm run build`
  both pass; the Pages build emits `/vidora/assets/...`,
  `/vidora/favicon.svg`, `/vidora/fonts/fonts.css`.
- Smoke test: `dist/` served under `/vidora/` in a local static server,
  driven by Playwright (headless shell) — app renders, logo loads from
  `/vidora/logo.svg`, AI-library MP3/poster, `fonts.css` and a woff2 all
  return 200, zero failed requests, zero console errors.
