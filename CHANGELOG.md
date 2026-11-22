# Vidora — CHANGELOG

All notable changes to Vidora. Format follows Keep a Changelog.

## [0.3.0] — 2026-11-22 — Phase 2 (Sections D + E + F + G)

### Added
- Keyframes & animation (D): keyframes for positionX/Y, scale, rotation, opacity, volume, brightness, maskFeather (add at playhead, edit time/value, delete); easing linear/ease/ease-in/ease-out/bezier (cubic-bezier solver, per-keyframe control points) + SVG graph editor with playhead line; in/out/combo animations (fade, 4 slide directions, zoom-in/out, spin, bounce, pop) with durations, evaluated in the compositor.
- Transitions, effects, filters (E): 8 transitions (fade, dissolve, slide, push, zoom, wipe, blur, spin) with duration + direction, rendered from the previous clip; 14 real video effects with intensity + parameters (Blur, Brightness, Grayscale, Sepia, Invert, Hue Rotate, Contrast, Saturate, Pixelate, Vignette, RGB Split, Glitch, Glow, Vivid); .cube LUT import (real parser with readable errors, trilinear sampling) + intensity slider + 3 built-in original looks (Vidora Warm / Cool Teal / Mono).
- Colour & adjustment (F): brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, hue, sharpen (3×3 convolution), RGB curves editor (click to add points), HSL, lift/gamma/gain colour wheels, blend modes (stored per clip); scopes (waveform, vectorscope, histogram) drawn from the captured preview frame; denoise as a real light soften.
- Masks & compositing (G): linear, mirror, circle, rectangle, heart, star and custom pen masks (click points on the preview), feather, invert, mask keyframes; chroma key (colour picker, tolerance, smoothness); PiP and 2/3/4-up split-screen; background blur/colour/gradient/image.
- Compositor (`src/lib/compositor.ts`): keyframe-evaluated transforms + animations, CSS + pixel effects, LUT, full per-pixel adjustment, masks, chroma key; pixel work capped at 960 px working width for smooth preview.
- Schema v0.3.0: new clip fields (`adjustment`, `animationIn/Out`, `transitionIn`, `lut` with length validation, `mask`, `chromaKey`, `layoutMode/Slot`, `background`); keyframes gained `id` + bezier points; v0.1.0/v0.2.0 documents still validate and migrate.
- Tests: keyframes, effects, LUT, colour, masks, transitions, scopes, schema v0.3.0 — suite now 79 tests (was 38).

### Fixed
- Heart-mask polygon points overshot the unit square (y up to 1.003) — formula corrected (found by the new masks test).

### Known limits (Phase 2, honest)
- Blend modes are stored per clip and applied in the full export render (Phase 8); the live preview composites clips normally. Stabilization and lens correction are stored as flags only (stabilization needs motion analysis, Phase 7; lens correction needs a camera profile, Phase 8) — the UI labels them deferred and never fakes them. Pitch preservation is still a flag (Web Audio path is Phase 4). Export is still realtime canvas capture (Phase 8). Optical-flow slow motion is Phase 7.

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
- Export is realtime canvas capture only: no audio mix, no 4K, no H.265/VP9 choice, no bitrate control, GIF or background queue (Phase 8). Pitch preservation is a stored flag; the Web Audio pitch-preserving path is Phase 4 work. Speed curve landed in Phase 2 via the keyframes engine; optical flow is Phase 7. Cloud sync and version history are Phase 8. Built-in assets are Phase 5/6.

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
