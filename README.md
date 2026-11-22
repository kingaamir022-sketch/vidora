# Vidora — Create. Cut. Shine.

A professional video editor. **Phase 1 is complete** (v0.2.0): core editor — projects & media import, timeline editing, speed, basic export — on top of the Phase 0 branding, architecture, project JSON schema and app shell. Effects, audio, captions, AI tools and full export arrive in Phases 2–9 (see [SPEC.md](SPEC.md)).

## Quick start

```bash
npm install
npm run dev      # start the dev server (Vite) — open the URL it prints
npm run build    # type-check + production build into dist/
npm test         # run the Vitest suite
npm run preview  # serve the production build locally
npm run build:assets  # regenerate logo icon-size variants from public/logo.svg
```

Requires **Node.js ≥ 20**.

## What works in Phase 1

- **Dashboard**: new / recent / drafts with rename, duplicate, delete; projects persist in localStorage.
- **Media**: import video/image/audio/GIF (picker + drag-drop), folders, search, thumbnails, metadata (duration, dimensions, size, MIME); add media to the timeline.
- **Timeline**: unlimited tracks, split, trim/move by drag, delete, duplicate, ripple delete, freeze, reverse, crop, rotate, flip, scale, position, opacity, fit/fill, group/ungroup, compound clips, copy/paste, markers, zoom, snapping, customizable shortcuts.
- **Speed**: 0.1x–100x per clip with presets; timeline length follows speed.
- **Preview**: real playback of imported clips on a canvas compositor with clip transforms.
- **Undo/redo**: real command-pattern history; autosave every 3 s + crash recovery.
- **Export**: basic export (480p/720p/1080p, 24/30/60 fps, WebM/MP4 as supported) via MediaRecorder, realtime canvas capture — no audio mix yet (see SPEC.md limits).

## What worked in Phase 0

- **Dashboard**: New Project, Recent (one original sample project), Drafts.
- **Editor shell**: top bar (logo, project name, undo/redo disabled state,
  aspect-ratio selector, Export disabled with a "Phase 1" tooltip), left tool
  tabs (Media, Audio, Text, Stickers, Effects, Transitions, Captions, Filters,
  Adjustment, Templates, AI Tools), center preview with play/pause and
  timecode, right properties panel that follows the active tab, bottom
  multi-track timeline rendering tracks/clips from the project document.
- **Design system**: dark theme default + light theme tokens in
  `design/tokens.json`; original logo, wordmark, favicon, splash screen and
  icon set in `public/`.
- **Project format**: non-destructive JSON document validated by a Zod schema
  (`src/schema/project.ts`).

## Project layout

```
vidora/
├── design/tokens.json        # design tokens (source of truth)
├── docs/ARCHITECTURE.md      # module diagram, folder tree, dependencies
├── LICENSES/                 # MIT license + provenance report
├── public/                   # logo, wordmark, favicon, splash, icons
├── scripts/build-assets.mjs  # regenerates logo icon variants
├── src/
│   ├── components/           # TopBar, LeftTabs, PreviewArea, PropertiesPanel,
│   │                         # TimelineShell, Dashboard, icons (original SVG set)
│   ├── design/tokens.ts      # typed access to design/tokens.json
│   ├── schema/project.ts     # Zod project schema + sample project
│   ├── store/projectStore.ts # Zustand store (undo/redo stacks, view, theme)
│   └── test/                 # Vitest suites
├── SPEC.md                   # full feature checklist, phases 0–9
└── CHANGELOG.md
```

## Originality

All branding, icons, artwork, code and the sample project are original,
created for Vidora. No third-party trademarks, logos, characters, artist
names, song melodies/lyrics or proprietary assets are used. See
[LICENSES/PROVENANCE.md](LICENSES/PROVENANCE.md). License: MIT.

## Tech stack (Phase 0)

React 19 + TypeScript + Vite 6 + Zustand 5 + Tailwind CSS 4 + Zod 3 + Vitest 3.
Backend, AI service, desktop wrapper and mobile arrive in later phases.
