# Vidora — Create. Cut. Shine.

A professional video editor. **v1.0.0 — complete.** All nine build phases are done (Phases 0–9), verified by build + 308 tests + Playwright self-audits with zero open bugs.

- **Phase 0–1**: branding (original logo, violet → cyan), project JSON schema, dashboard, import with real probing/thumbnails, unlimited tracks, split/trim/duplicate/ripple/freeze/reverse/crop/rotate/flip, markers, customizable shortcuts, undo/redo, autosave + crash recovery, speed 0.1×–100×.
- **Phase 2**: keyframes + easing + bezier graph editor, animations, 8 transitions, 14 effects, .cube LUT import + 3 original looks, colour/adjustment (curves/HSL/wheels/blend modes), scopes, masks, chroma key, PiP/split-screen, backgrounds.
- **Phase 3**: text, stickers, shapes, drawing, manual motion tracking, captions (auto/manual/styles/SRT/VTT/.ass import, transcript, translation, TTS).
- **Phase 4**: audio — volume + keyframes, fades, EQ, noise reduction (honest limits), voice changer (8 original presets), separate audio, mixer + ducking, beat detection, voiceover recording, pitch-preserving speed.
- **Phase 5**: procedural asset library — 62 GLSL effects, 32 transitions, 32 LUTs, 232 SVG stickers, 28 motion presets, 40 open-license fonts, 50 text presets, 30+ text animations, 20 caption presets, 25 templates, 30 music loops + 100 SFX, 30 backgrounds (`npm run build:assets` regenerates it all).
- **Phase 6**: AI-generated library, all original and local — 100 AI music tracks, 100 AI SFX, 100 AI stock clips (1080p), 110 AI images, 16 narration voices.
- **Phase 7**: 15 AI tools — AI captions (offline Vosk), narration (offline Piper), Smart Cut, Auto Reframe, background removal, camera tracking, stabilize (real FFT phase correlation), enhance, AI movement, optical flow, vocal isolation, auto highlights, script-to-video, upscale, provider registry (Local only).
- **Phase 8**: 35 templates with replaceable media slots, full offline export (MP4/MOV/WebM, 360p–4K, 24–60 fps, H.264/VP9, real audio mix, background queue, WAV/GIF/cover/frames), `.vidora` cloud backup files, timecoded review comments, social sharing, presentation mode.
- **Phase 9**: onboarding tour + user guide, localization (English/Urdu/Hindi/Arabic RTL), local accounts (first = OWNER, later = CUSTOMER read-only), subscription hooks (structure only — Pro is not sold), local-only opt-in diagnostics, accessibility (focus rings, dialog semantics), thumbnail/probe cache, finished light theme, generic lens correction, .ass import, CI + Docker, final docs.

All branding, icons, fonts, effects, templates, stickers, music, clips and voices are **original or openly licensed** (SIL OFL, Apache, CC0, MIT). Nothing is copied. See [`LICENSES/`](LICENSES/) and the provenance report (`npm run build:assets` regenerates it).

## Quick start

```bash
npm install
npm run dev      # start the dev server (Vite) — open the URL it prints
npm run build    # type-check + production build into dist/
npm test         # run the Vitest suite (308 tests)
npm run preview  # serve the production build locally
npm run build:assets  # regenerate the procedural asset library (manifest, .cube LUTs, animated stickers, fonts, licenses, provenance)
```

Requires **Node.js ≥ 20**. No server, no database, no account — projects live in your browser's localStorage. AI models (Vosk ~41 MB, Piper ~63 MB) are download-on-demand via `tools/download-models.sh`; they are not in the repo.

## Run it with Docker

```bash
docker build -t vidora:1.0.0 .
docker compose up   # serves on http://localhost:4173
```

**Note:** the Docker image was never built on the build VM (Docker is not installed there) — the first real build needs a machine with Docker.

## Parity & self-audit (Rules 12/13/14)

- Behaviour cards for every feature: [docs/behavior/](docs/behavior/) (one card per feature — controls, ranges, defaults, interactions, edge cases).
- Parity matrix: [docs/PARITY.md](docs/PARITY.md) — **MATCH 47 / ASSUMED 50 / INTENTIONAL-DIFF 3 / total 100**, gate PASS. Layout reference: [docs/UI_LAYOUT.md](docs/UI_LAYOUT.md). Intentional diffs: [docs/INTENTIONAL_DIFFS.md](docs/INTENTIONAL_DIFFS.md). Bug log: [docs/BUGS.md](docs/BUGS.md) (0 open).
- Run the self-audits yourself (needs Node ≥ 20; uses the Playwright Chromium headless shell already on the machine — fixtures are regenerated in-script because /tmp is wiped on restarts):

```bash
npm run audit:phase9  # Phase 9: 66 checks, screenshots into audit/phase9/<card-ID>/
npm run audit:phase8  # Phase 8: 61 checks (real export verified with ffprobe)
npm run audit:phase7  # Phase 7: 61 checks
npm run audit:phase6  # Phase 6: 32 checks
npm run audit:phase5  # Phase 5: 38 checks
npm run audit:phase4  # Phase 4: 31 checks
npm run audit:phase3  # Phase 3: 31 checks
npm run audit         # Phases 0–2: 40 checks
```

Each writes its report to `audit/phase<N>/AUDIT-REPORT.md`. CI (`.github/workflows/ci.yml`) runs build + test + lint on every push; Playwright audits are NOT in CI (they need the headless shell + ffmpeg).

## User guide

[docs/USER-GUIDE.md](docs/USER-GUIDE.md) — the whole app in simple language: first project, cutting, text, audio, effects, captions, AI tools, export, backup, accounts, settings.

## Honest limits (labelled in the UI too)

- No H.265 export (no browser encoder exists); no MP3 (audio-only is WAV); GIF has no audio and caps at 10 fps / 320 px / first 30 s.
- Voice-changer presets are preview-only (they do not survive export); reversed clips are silent, as in preview.
- AI tools are real local implementations or honestly labelled heuristics — background removal is edge flood-fill, not an ML person model; vocal isolation is centre-channel stems, not ML separation; upscale is resample + sharpen, not AI detail recovery.
- Lens correction is generic (no camera profile — adjust by eye). Stabilization corrects translation only, not rotation/scale/rolling-shutter wobble.
- AI captions need the Vosk model downloaded first (`tools/download-models.sh`); narration needs the Piper voice. TTS voices are the browser's speech synthesis.
- Export files are built in the browser; finished-file Blobs live in memory only (re-download until the app closes). `.vidora` bundles carry project JSON + media metadata, not the media files themselves — restore re-links media by file name + size.
- Accounts and subscriptions are local-only: no cloud sign-in, no Google sign-in, no payment provider, Pro is not sold. Projects, accounts and diagnostics never leave your computer.
- The Docker image has never been built (Docker was not on the build VM).
