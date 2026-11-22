# Vidora — SPEC & Checklist

**App:** Vidora — "Create. Cut. Shine." · **Current version:** 0.2.0 (Phase 1)
**Status legend:** DONE = shipped and verified in this repo · PENDING = not started
· IN PROGRESS = under active work. Nothing is skipped silently: anything
postponed is listed here.

## Phase 0 — Branding, architecture, skeleton — DONE (v0.1.0)

- [x] App name Vidora, tagline "Create. Cut. Shine."
- [x] Original logo SVG: rounded-square, play triangle with split/cut line,
      gradient violet `#7C3AED` → cyan `#06B6D4`
- [x] logo.svg, icon sizes 16/32/48/192/512, favicon, splash screen, wordmark,
      light/dark variants (`public/`)
- [x] Design system: dark default + light theme, colour tokens, typography
      scale, spacing, radius, shadows, original SVG icon set
- [x] Tokens stored in `design/tokens.json` (+ typed accessor `src/design/tokens.ts`)
- [x] Folder tree, project JSON schema (Zod + TypeScript types), module
      diagram (`docs/ARCHITECTURE.md`), dependency list
- [x] Runnable skeleton: React + TypeScript + Vite + Zustand + Tailwind CSS
- [x] App shell: top bar, 11 left tabs, center preview, right properties,
      bottom timeline shell, dashboard (New / Recent / Drafts + 1 sample project)
- [x] `LICENSES/` + provenance report (every asset ORIGINAL, MIT/CC0 note)
- [x] Tests: project-schema suite + tokens suite; `npm test` passes
- [x] `npm install`, `npm run build` verified; `CHANGELOG.md` (0.1.0)

## Phase 1 — Sections A + B + C — DONE (v0.2.0, verified: `npm run build` green, 58 modules; `npm test` 38/38)

### A. Project & Media
- [x] Dashboard: new, recent, drafts, rename, duplicate, delete (Zustand + localStorage, verified in code + manual script below)
- [x] Ratios 9:16, 16:9, 1:1, 4:5, 21:9, custom (custom width/height inputs in TopBar; preview + resolution follow it)
- [x] Import video/image/audio/GIF, drag-drop, folders, search, thumbnails, metadata (real probing: duration, dimensions, size, MIME; thumbnails via canvas)
- [ ] Built-in asset browser — PARTIAL: panel exists and honestly labels Phase 5/6 content as not yet built; no fake assets. Cloud sync + version history: PENDING (Phase 8)

### B. Timeline & Basic Editing
- [x] Unlimited tracks (add video/audio/text); split, trim (drag edges), delete, duplicate, ripple delete
- [x] Freeze frame, reverse, crop, rotate, flip, mirror (flip H/V), scale, position, opacity
- [x] Fit/fill, group/ungroup, compound clips (basic), copy/paste, markers
- [x] Customizable keyboard shortcuts (Shortcuts panel, editable map persisted in localStorage; defaults: S split, M marker, Ctrl+Z/Y undo/redo, Space play/pause, Ctrl+D duplicate, Ctrl+C/V copy/paste, Delete, Shift+Delete ripple delete)
- [x] Command pattern undo/redo now real for timeline edits; autosave every 3 s + crash recovery (autosave notice on dashboard)

### C. Speed
- [x] Constant 0.1x–100x, speed presets (0.25/0.5/1/1.5/2/4/8x); timeline length = sourceDuration / speed (tested)
- [ ] Speed curve (bezier points + presets) — PENDING, moved to Phase 2 scope (keyframes engine); not silently skipped, listed here
- [ ] Optical-flow slow motion — PENDING (needs model/GPU work, Phase 7)
- [x] Pitch preservation — flag stored in project JSON; playback uses browser rate control. The Web Audio pitch-preserving path is labelled in the UI as Phase 2/4 work, not faked.

### Core export (Phase 1 scope)
- [x] Basic export: Export panel 480p/720p/1080p, 24/30/60 fps, WebM/MP4 as the browser supports, via MediaRecorder recording the preview canvas in real time. **Honest limits:** realtime only (export takes as long as the video), no audio mix in Phase 1, no 4K/H.265/VP9 choice/bitrate control/GIF/background queue — those are Phase 8. The panel and this SPEC state them; the app never claims a full offline render.

## Phase 2 — Sections D + E + F + G — PENDING

### D. Keyframes & Animation
- [ ] Keyframes for position, scale, rotation, opacity, volume, filters, masks
- [ ] Easing (linear/ease/bezier/graph editor); in/out/combo animations for video, text, stickers

### E. Transitions, Effects, Filters
- [ ] Transitions with duration control; video effects with parameters
- [ ] LUT filters (.cube import) with intensity slider

### F. Color & Adjustment
- [ ] Brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, hue, sharpen
- [ ] Curves, HSL, color wheels, scopes (waveform/vectorscope/histogram), blend modes
- [ ] Stabilization, denoise, lens correction

### G. Masks & Compositing
- [ ] Linear, mirror, circle, rectangle, heart, star, custom pen mask; feather, invert, mask keyframes
- [ ] Chroma key, picture-in-picture, split-screen layouts
- [ ] Background blur/color/gradient/image

## Phase 3 — Sections H + I — PENDING

### H. Text & Graphics
- [ ] Text tool (Google Fonts + custom upload), size, color, gradient, stroke, shadow, glow, background box
- [ ] Alignment, spacing, text templates, animated text
- [ ] Stickers, emojis, shapes, GIFs, drawing/pen tool, motion tracking

### I. Captions & Speech
- [ ] Auto captions (Whisper, multi-language, word-level highlight), style presets
- [ ] SRT/VTT import/export, translation, lyrics sync
- [ ] Text-to-speech (multiple voices/languages), text-based editing via transcript

## Phase 4 — Section J (Audio) — PENDING

- [ ] Multi-track mixer, waveform, fades, volume keyframes, extract/detach audio
- [ ] Voiceover recording, beat detection (auto markers + auto-cut)
- [ ] Noise reduction, voice enhancement, equalizer, voice changer, ducking, normalization
- [ ] Pitch control, vocal isolation/stem separation

## Phase 5 — Section N (Procedural Asset Library) — PENDING

- [ ] 60+ GLSL effects with auto thumbnails
- [ ] 30+ GLSL transitions
- [ ] 30+ procedurally generated .cube LUT looks with thumbnails
- [ ] 200+ original SVG stickers/shapes (+ animated variants, Lottie-style JSON)
- [ ] 40+ open-license fonts + license file
- [ ] 50+ text style presets, 30+ text animations
- [ ] 20+ caption style presets with word-level highlight
- [ ] 25+ original templates
- [ ] Procedural music/SFX via Tone.js/Web Audio (30 loops, 100 SFX)
- [ ] Backgrounds/overlays: gradients, patterns, noise, film dust, frames
- [ ] `npm run build:assets` regenerates everything + license report
- [ ] `/assets` + `manifest.json` (id, name, category, tags, license)

## Phase 6 — Section O (AI-Generated Content Library) — PENDING

- [ ] Pilot: 5 music tracks + 5 clips, quality review, then scale
- [ ] 100+ original instrumental music tracks (15s/30s/60s + loopable; BPM/key detected)
- [ ] 200+ original SFX
- [ ] 100+ original stock clips (5–10s, 1080p, no real faces)
- [ ] Images, textures, frames, transparent-PNG stickers
- [ ] TTS voices (English, Urdu, Hindi, Arabic)
- [ ] Pipeline: `/generation/prompts/*.json`, provider adapters, quality filter,
      resume support, GPU-safe mode, provenance manifest
- [ ] STRICT: no existing songs/melodies/lyrics, no artist/brand names, no logos,
      characters or real people's likeness in prompts

## Phase 7 — Section K (AI Tools) — PENDING

- [ ] Background removal (no green screen), auto reframe
- [ ] Smart cut (silence and filler-word removal), upscaler to 4K
- [ ] Low-light enhance, retouch, auto highlights, script-to-video
- [ ] AI image generation (provider adapters with free/open-source alternatives)

## Phase 8 — Section L (Templates, Export, Share) — PENDING

- [ ] Template system with replaceable media slots
- [ ] Export 480p–4K, 24–60fps, bitrate, H.264/H.265/VP9, MP4/MOV/WebM/GIF
- [ ] Audio-only, image sequence, cover frame, background export queue
- [ ] Share helpers via official APIs; team collaboration (shared projects, comments)

## Phase 9 — Section M (Polish) — PENDING

- [ ] Onboarding tour, tooltips
- [ ] Localization (English, Urdu, Hindi, Arabic with RTL)
- [ ] Auth (email/Google), subscription hooks, analytics, error logging
- [ ] Accessibility, GPU optimization, caching
- [ ] Full tests, CI/CD, Docker, documentation

## Manual test script — Phase 1 (run after `npm run dev`)

1. Dashboard: create a project named "Phase 1 test" — it opens in the editor and appears in Recent. Back on the dashboard, Rename it, Duplicate it, then Delete the copy (confirm). The original stays.
2. Media: in the Media panel, click Import and pick a video file (or drag one in). It appears with a thumbnail, name, size, duration and dimensions. Search for part of its name — only it matches. Add it to the timeline: a clip appears on Video 1.
3. Preview: press Space — the video plays on the canvas and the timecode advances; press Space again to pause. Drag the seek slider.
4. Timeline: click the clip to select it. Press S with the playhead inside the clip — it splits into two. Drag the right edge of the first half to trim it. Press Ctrl+Z — the trim undoes. Press Ctrl+Z again — the split undoes. Press Ctrl+Shift+Z — the split redoes.
5. Speed: with the clip selected, set Speed to 2× in the right panel — the clip shortens to half its length on the timeline. Set it to 0.5× — it doubles.
6. Transform: set Opacity 0.5, Rotation 15, check Flip horizontal — the preview updates. Click Freeze — "FREEZE FRAME" shows on the preview. Click Reverse — "REVERSED" shows.
7. Markers & tracks: press M — a marker appears on the ruler. Click "+ Video track" — a new track appears.
8. Ratio: change the aspect ratio to 9:16 — the preview canvas changes shape. Choose "custom" and enter 1280×720 — the preview becomes 16:9-sized custom.
9. Autosave: wait 3+ seconds, reload the page — the project and its clips are still there. (Crash recovery: the dashboard shows a recovery notice only if an autosave is newer than the saved project.)
10. Export: click Export, keep 720p/30fps/WebM, click Export — after the video's duration a .webm file downloads. Note: it records the preview in real time and has no audio yet (Phase 1 limit, stated in the panel).
11. Shortcuts: click "⌨ Shortcuts", click the Split row, press "X" — Split is now X. Reset to defaults afterwards.

Expected: every step above works. Any deviation is a Phase 1 bug — report it before Phase 2 starts.

## Manual test script — Phase 0 (kept for reference)

1. Open the app: the dashboard shows "Your projects" with a "New Project"
   button and one Recent entry, "Sunset Coast — Sample Project".
2. Click the sample project: the editor opens with the top bar showing the
   project name, undo/redo buttons, an aspect-ratio selector and an Export button.
3. Click each left tab (Media … AI Tools): the right panel heading follows
   the tab.
4. In Preview, click Play/Pause: the icon toggles.
5. Change the aspect ratio to 9:16: the preview canvas changes shape.
6. In the timeline, the sample project's Video 1 track shows one clip,
   "Sunset Coast — Title Card", and Audio 1 is empty.
7. Click the logo in the top bar: you return to the dashboard.
