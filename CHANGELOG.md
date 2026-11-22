# Vidora — CHANGELOG

All notable changes to Vidora. Format follows Keep a Changelog.

## [0.2.0] — 2026-11-22 — Phase 1 (Sections A + B + C)

### Added
- Project & Media (A): dashboard with real new/recent/drafts, rename, duplicate, delete (Zustand + localStorage); ratios 9:16/16:9/1:1/4:5/21:9/custom with custom width/height; import video/image/audio/GIF via picker and drag-drop with real metadata probing (duration, dimensions, size, MIME) and canvas thumbnails; folders, search; built-in asset panel honestly labelled Phase 5/6.
- Timeline & basic editing (B): unlimited tracks (add video/audio/text, lock/hide/mute); split, edge-trim by drag, move by drag, delete, duplicate, ripple delete, freeze frame, reverse, crop, rotate, flip H/V, scale, position, opacity, fit/fill; group/ungroup, basic compound clips, copy/paste, markers; customizable keyboard shortcuts (editable, persisted) + global shortcut handling.
- Speed (C): constant 0.1x–100x per clip with presets; timeline length = sourceDuration / speed; pitch-preservation flag in project JSON.
- Command pattern undo/redo now real for all project mutations; autosave every 3 s + crash recovery with a dashboard notice.
- Preview: canvas compositor playing imported video/image/audio clips with clip transforms (opacity, scale, rotation, flip, position, fit/fill, crop), playhead, seek, timecode.
- Basic export: Export panel (480p/720p/1080p, 24/30/60 fps, WebM/MP4 as supported) recording the preview canvas via MediaRecorder in real time.
- Schema v0.2.0: media items, folders, custom ratio, clip speed/reverse/freeze/crop/fit/flip/position/volume/mediaId/groupId/compoundId; v0.1.0 documents still validate and migrate.
- Tests: timeline ops (split/trim/delete/duplicate/ripple/move/group/compound), speed, shortcuts, export helpers, schema v0.2.0 — suite now 38 tests.

### Known limits (Phase 1, honest)
- Export is realtime canvas capture only: no audio mix, no 4K, no H.265/VP9 choice, no bitrate control, GIF or background queue (Phase 8). Pitch preservation is a stored flag; the Web Audio pitch-preserving path is Phase 2/4 work. Speed curves and optical-flow slow motion are not in Phase 1 (speed curve → Phase 2, optical flow → Phase 7). Cloud sync and version history are Phase 8. Built-in assets are Phase 5/6.

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
