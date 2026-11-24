# M-DOCKER — Docker image (Phase 9, Section M)

- **Phase:** 9 (built v1.0.0)
- **Reference behaviour:** ASSUMED — standard multi-stage Docker practice for a Vite SPA.
- **Where it lives:** `Dockerfile`, `docker-compose.yml`, `.dockerignore`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Image | vidora | — | — | — | — | Stage 1 `node:20-alpine` builds the app; stage 2 `nginx:alpine` serves `dist/` |
| Compose | vidora service | — | — | — | — | Port `4173:80`; `docker compose up` → open http://localhost:4173 |
| File | .dockerignore | — | — | — | — | Excludes node_modules, dist, audit screenshots, .git, media fixtures |

## Interactions
- `docker build -t vidora .` → image builds; `docker run -p 4173:80 vidora` → the app serves on http://localhost:4173.
- `docker compose up` → same, one command.

## States
- The container serves the static production build only — no server, no database (the app stores projects in the browser, as always).

## Result
Vidora runs anywhere Docker runs, with one command.

## Edge cases
- Docker is not installed on this build VM, so the image was NOT built here — the Dockerfile was written from the standard pattern and its syntax checked, but the first real build must happen on a machine with Docker. The README says so.

## Evidence
Standard Vite + nginx multi-stage Dockerfile pattern.

## Status
ASSUMED
