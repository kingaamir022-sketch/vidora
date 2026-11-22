# Vidora — CHANGELOG

All notable changes to Vidora. Format follows Keep a Changelog.

## [0.1.0] — 2026-11-22 — Phase 0

### Added
- Branding: original Vidora logo (rounded-square, play triangle with a
  split/cut line, violet `#7C3AED` → cyan `#06B6D4` gradient), wordmark,
  favicon, splash screen, light/dark logo variants, icon sizes 16–512px.
- Design system: `design/tokens.json` — dark (default) + light themes,
  colour tokens, typography scale, spacing, radius, shadows, motion.
- Original SVG icon set (`src/components/icons.tsx`) for all 11 tool tabs
  plus transport and UI icons.
- Architecture: folder tree, Zod project JSON schema + TypeScript types
  (`src/schema/project.ts`), module diagram (`docs/ARCHITECTURE.md`),
  dependency list.
- Runnable app shell: dashboard (New / Recent / Drafts + one original
  sample project) and editor layout — top bar, left tabs, preview,
  properties panel, timeline shell rendering tracks/clips from the
  project document. Undo/redo show the correct disabled state (empty
  history); Export is disabled with a "Phase 1" tooltip.
- Docs: `SPEC.md` (full checklist, sections A–O, phases 0–9),
  `README.md`, `docs/ARCHITECTURE.md`, `LICENSES/PROVENANCE.md`.
- Tests: Vitest suites for the project schema (valid passes, invalid
  fails) and design tokens (gradient colours present).
- `scripts/build-assets.mjs`: regenerates logo icon variants from
  `public/logo.svg` (`npm run build:assets`).

### Known limits (Phase 0)
- No media import, editing, playback of real media, effects, audio,
  captions, AI tools, export, cloud sync, auth or backend — all land in
  Phases 1–9. The shell never pretends these work: controls for them are
  disabled or labelled with their phase.
