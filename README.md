# Vidora — Create. Cut. Shine.

A professional video editor. **Phase 4 is complete** (v0.5.0): audio (Audio tab with Music/Sound effects and 6 original music loops + 8 original SFX synthesized in-browser, full audio inspector with volume/fades/EQ/noise reduction/normalize/voice changer, separate audio, mixer with ducking, beat detection, voiceover recording, pitch-preserving speed) — on top of the Phase 3 text/stickers/captions work, the Phase 2 keyframes/effects/colour/masks work, the Phase 1 core editor and the Phase 0 branding, architecture, project JSON schema and app shell. AI tools, templates and full export arrive in Phases 5–9 (see [SPEC.md](SPEC.md)).

## Parity & self-audit (Rules 12/13/14)

- Behaviour cards for every Phase 0–4 feature: [docs/behavior/](docs/behavior/) (one card per feature, with controls, ranges, defaults, interactions and edge cases).
- Parity matrix: [docs/PARITY.md](docs/PARITY.md) — MATCH 40 / ASSUMED 6 / INTENTIONAL-DIFF 3 / 49, gate PASS (Phases 0–2 + Phase 4 rows; Phase 3 cards carry their own status: MATCH 5 / ASSUMED 3 / UNKNOWN 6). Layout reference: [docs/UI_LAYOUT.md](docs/UI_LAYOUT.md). Intentional diffs: [docs/INTENTIONAL_DIFFS.md](docs/INTENTIONAL_DIFFS.md). Bug log: [docs/BUGS.md](docs/BUGS.md).
- Run the self-audits yourself (needs Node ≥ 20; uses the Playwright Chromium headless shell already on the machine):

```bash
npm run audit          # builds, serves the production build, drives it in headless Chromium
                       # 40 checks, screenshots into audit/phase2/<card-ID>/, report in audit/phase2/AUDIT-REPORT.md
npm run audit:phase3   # Phase 3: 31 checks, screenshots into audit/phase3/<card-ID>/, report in audit/phase3/AUDIT-REPORT.md
npm run audit:phase4   # Phase 4: 31 checks, screenshots into audit/phase4/<card-ID>/, report in audit/phase4/AUDIT-REPORT.md
```

## Quick start

```bash
npm install
npm run dev      # start the dev server (Vite) — open the URL it prints
npm run build    # type-check + production build into dist/
npm test         # run the Vitest suite (184 tests)
npm run preview  # serve the production build locally
npm run audit    # build + Playwright self-audit, Phases 0–2 (see above)
npm run audit:phase3  # build + Playwright self-audit, Phase 3 (see above)
npm run audit:phase4  # build + Playwright self-audit, Phase 4 (see above)
npm run build:assets  # regenerate logo icon-size variants from public/logo.svg
```

Requires **Node.js ≥ 20**.

## What works in Phase 4

- **Audio tab**: Music / Sound effects sub-tabs, search, suggestion chips, categories + View all, Recommended rows with play-preview and "+" add; 6 original music loops + 8 original SFX synthesized in-browser (Vidora Originals), your imported audio listed the same way, Voiceover section, Tools (Detect beats / Cut at beats / Open mixer).
- **Audio inspector**: volume slider + dB readout + numeric input, volume keyframes, fade in/out 0–10 s, role (Music/Voice/SFX), 3-band EQ ±12 dB, noise reduction (high-pass + compressor — the panel says plainly it does not remove background voices or room noise), mute, Normalize to −1 dBFS, voice changer (8 original presets) + Apply to all.
- **Separate audio**: right-click a video clip → "Separate audio (Ctrl+Shift+S)", or the inspector button, or the shortcut; the video is muted and its audio moves to its own track, linked back.
- **Mixer**: master volume, ducking (music drops under voice), per-track volume/mute/solo — shown in the right panel when no clip is selected; Solo buttons also on timeline track headers.
- **Audio engine**: one AudioContext routes every sounding clip (audio + video audio) through volume/fades/keyframes/EQ/voice/noise/ducking/mute/solo; falls back to plain element volume if Web Audio is unavailable. Pitch-preserving speed is real (browser `preservesPitch`).
- **Beat detection**: energy-onset beats with a BPM estimate (labelled as an estimate), Add beat markers, Cut at beats.
- **Voiceover**: record from the microphone, stop, and the clip lands on the timeline at the playhead.

## What works in Phase 3

- **Text & graphics**: Text panel (Templates/Effects/AI text FX sub-tabs; AI text FX is an honest Phase 7 note), Add heading/body, 14 original text style presets, full inspector (font, size, bold/italic/underline, alignment, line spacing, fill/gradient, stroke, background box, shadow, glow, opacity, transform, Apply to all), In/Out/Loop text animations; 224 original procedural SVG stickers with search + categories, 10 original SVG shapes with fill colour, freehand drawing on the preview, manual motion tracking (attach an overlay to a video clip, place track points — automatic detection is Phase 7).
- **Captions & speech**: Auto captions from a pasted transcript with word-level highlight (honest substitute — real Whisper speech-to-text is Phase 7), 8 original caption styles, manual cues (add/split/edit/delete, click to seek), SRT/VTT import + export, per-cue manual translation, in-panel transcript (click a word to seek), browser text-to-speech (voice, rate, pitch, preview, narration clips).

## What works in Phase 2

- **Keyframes & animation**: keyframes for position/scale/rotation/opacity/volume/brightness/mask feather, easing (linear/ease/ease-in/ease-out/bezier + graph editor), in/out/combo animations (fade, slides, zooms, spin, bounce, pop).
- **Effects & filters**: 14 video effects with intensity + parameters; 8 transitions with duration + direction; .cube LUT import with intensity + 3 built-in Vidora looks.
- **Colour & adjustment**: brightness/contrast/saturation/exposure/highlights/shadows/temperature/tint/hue/sharpen, RGB curves editor, HSL, lift/gamma/gain wheels, blend modes (stored), scopes (waveform/vectorscope/histogram from the preview frame), denoise. Stabilization and lens correction are stored flags only, honestly labelled deferred.
- **Masks & compositing**: linear/mirror/circle/rectangle/heart/star/pen masks, feather, invert, mask keyframes, chroma key, PiP and 2/3/4-up split-screen, background blur/colour/gradient/image.
- **Preview compositor**: `src/lib/compositor.ts` applies keyframes, effects, LUT, colour, masks and chroma key per frame (pixel work capped at 960 px working width).

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
│   │                         # KeyframesPanel, EffectsPanel, TransitionsPanel,
│   │                         # ColorPanel, ScopesPanel, MaskPanel (Phase 2)
│   ├── lib/                  # timeline, media, shortcuts, exporter (Phase 1)
│   │                         # keyframes, effects, lut, color, masks,
│   │                         # transitions, scopes, compositor (Phase 2)
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
