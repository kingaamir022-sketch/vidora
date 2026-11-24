# M-CI — Continuous integration (Phase 9, Section M)

- **Phase:** 9 (built v1.0.0)
- **Reference behaviour:** ASSUMED — standard GitHub Actions practice for a Vite + Vitest app.
- **Where it lives:** `.github/workflows/ci.yml`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Workflow | CI | — | — | — | — | Runs on every push and pull request to `main` |
| Job | build-and-test | — | — | — | — | Node 20, `npm ci`, `npm run build`, `npm test` (Vitest), `npm run lint` (tsc) |

## Interactions
- Push to `main` → the workflow runs; a red run means the build or the tests failed.
- Playwright audits are NOT in CI (they need a browser binary + ffmpeg and take minutes); the workflow file says so, and the audits run locally via `npm run audit:phase<N>`.

## States
- Node version is pinned by `engines` in package.json (>= 20) and by the workflow (20.x).

## Result
Every push is checked: the app must build and all tests must pass.

## Edge cases
- `npm ci` needs `package-lock.json` — it is committed (it already is).

## Evidence
GitHub Actions documentation, standard Vite/Vitest CI shape.

## Status
ASSUMED
