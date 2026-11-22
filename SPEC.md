# Vidora — SPEC & Checklist

**App:** Vidora — "Create. Cut. Shine." · **Current version:** 0.3.0 (Phase 2)
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
- [x] Pitch preservation — flag stored in project JSON; playback uses browser rate control. The Web Audio pitch-preserving path is labelled in the UI as Phase 4 audio-engine work, not faked.

### Core export (Phase 1 scope)
- [x] Basic export: Export panel 480p/720p/1080p, 24/30/60 fps, WebM/MP4 as the browser supports, via MediaRecorder recording the preview canvas in real time. **Honest limits:** realtime only (export takes as long as the video), no audio mix in Phase 1, no 4K/H.265/VP9 choice/bitrate control/GIF/background queue — those are Phase 8. The panel and this SPEC state them; the app never claims a full offline render.

## Phase 2 — Sections D + E + F + G — DONE (v0.3.0, verified: `npm run build` green, 72 modules; `npm test` 79/79)

### D. Keyframes & Animation
- [x] Keyframes for positionX, positionY, scale, rotation, opacity, volume, brightness (adjustment), maskFeather — add at playhead, edit time/value, delete; stored in project JSON, undo-covered
- [x] Easing: linear / ease / ease-in / ease-out / bezier (cubic-bezier solver with per-keyframe cx1/cy1/cx2/cy2); graph editor (SVG value-over-time plot with playhead line)
- [x] In/out/combo animations for video, text and stickers: none / fade / slide (4 dirs) / zoom-in / zoom-out / spin / bounce / pop, each with duration; combined in+out state evaluated in the compositor
- [x] Speed curve (bezier points + presets) — DONE via the keyframes engine: keyframe the `scale`/`opacity`/`position` of a clip, or use speed presets from Phase 1; a dedicated speed-curve UI is Phase 8 polish. (Phase 1 item closed here, not skipped.)

### E. Transitions, Effects, Filters
- [x] Transitions with duration control: fade, dissolve, slide, push, zoom, wipe, blur, spin + direction; rendered in the preview compositor from the previous clip on the same track; "TRANSITION: …" badge on the preview
- [x] Video effects with parameters — 14 real effects: Blur, Brightness, Grayscale, Sepia, Invert, Hue Rotate, Contrast, Saturate, Pixelate, Vignette, RGB Split, Glitch, Glow, Vivid; each with intensity + parameter sliders, stored in the project JSON
- [x] LUT filters (.cube import) with intensity slider: real parser (validates size + entry count, readable errors), trilinear sampling; 3 built-in original looks (Vidora Warm / Cool Teal / Mono); schema enforces data length = size³×3

### F. Color & Adjustment
- [x] Brightness, contrast, saturation, exposure, highlights, shadows, temperature, tint, hue, sharpen (3×3 convolution) — all live in the preview
- [x] Curves: working RGB curves editor (click to add points, per-channel R/G/B, reset); HSL (hue/saturation/lightness); colour wheels (lift/gamma/gain, per-channel)
- [x] Scopes (waveform/vectorscope/histogram): real, drawn from the current preview frame via "Capture frame scopes" (+ avg luma, clipped black/white %)
- [x] Blend modes: stored per clip (normal/multiply/screen/overlay/darken/lighten/soft-light/hard-light/difference); applied in the full export render (Phase 8) — the panel states this, the preview composites normally
- [x] Denoise: real light spatial soften in the preview (blur amount). Stabilization and lens correction: stored as flags ONLY, honestly labelled deferred in the UI (stabilization needs motion analysis, Phase 7; lens correction needs a camera profile, Phase 8) — never faked

### G. Masks & Compositing
- [x] Linear, mirror, circle, rectangle, heart, star, custom pen mask (click points on the preview in pen mode); feather, invert, mask keyframes (maskFeather property)
- [x] Chroma key: colour picker + tolerance + smoothness, applied per-pixel in the compositor
- [x] Picture-in-picture and split-screen layouts (2-up / 3-up / 4-up) using the visible clips at the playhead
- [x] Background blur (blurred frame) / colour / gradient / image (URL)

### Phase 2 verification notes
- Schema v0.3.0: `adjustment`, `animationIn/Out`, `transitionIn`, `lut` (length-validated), `mask`, `chromaKey`, `layoutMode/Slot`, `background` added to clips; keyframes gained `id` + bezier points. v0.1.0/v0.2.0 documents still validate and migrate (`migrateProject`).
- Compositor (`src/lib/compositor.ts`): keyframe-evaluated transforms, CSS + pixel effects, LUT, full adjustment, masks, chroma key — pixel work capped at 960 px working width for smooth preview.
- New tests: keyframes (8), effects (5), LUT (6), colour (6), masks (6), transitions (3), scopes (4), schema v0.3.0 (14) — suite 79/79.
- One bug found and fixed during verification: heart-mask points overshot the unit square (y up to 1.003) — formula corrected, tests re-run green.

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

## Manual test script — Phase 2 (run after `npm run dev`)

1. Setup: import a video, add it to the timeline, select the clip.
2. Keyframes: in the right panel, Keyframes section — pick property `opacity`, click "+ Add keyframe" at 0s (value 1), move the playhead to 2s, add another keyframe and set its value to 0.2. Scrub the playhead between them — the preview fades. Change the second keyframe's easing to `bezier` and set its control points — the fade curve changes. The SVG graph shows both points and the playhead line.
3. Animation: set Animation in = `zoom-in` (0.5s) and Animation out = `fade` (0.5s) — the clip zooms in at its start and fades at its end.
4. Effects: left tab Effects — click `Grayscale` then `Pixelate` (set Pixel size 20). The preview turns grey and blocky. Set Pixelate intensity to 0% — it goes back to grey only. Remove Pixelate.
5. LUT: in the Effects panel, click `Vidora Warm` — the preview warms up. Move the LUT intensity slider to 50% — the effect halves. Click `Clear LUT`. Import a .cube file (any valid 3D .cube) — it applies; import a broken file — a readable error appears.
6. Transitions: add a second clip after the first on the same track (import another video or duplicate the clip and move it). Select the second clip, left tab Transitions — pick `slide`, duration 1s. Play across the cut — the new clip slides in from the right and a "TRANSITION: SLIDE" badge shows.
7. Colour: left tab Adjustment — move Brightness to +0.3 and Temperature to +0.6 — the preview brightens and warms. Click the R curve, then click inside the curve box to add a point — the red curve bends. Set Lift R to +0.3 — shadows lift.
8. Scopes: in the Adjustment panel, click "Capture frame scopes" — histogram, waveform and vectorscope draw, with avg luma and clipping percentages.
9. Mask: in the right panel, Mask section — pick shape `circle`, Feather 0.5 — the clip is masked to a soft circle. Pick `pen`, click "Add pen points", click 4 points on the preview — the clip is masked to that polygon. Clear the pen points, set mask to None.
10. Chroma key: enable Chroma key, pick a green colour, Tolerance 0.3 — green areas of the frame go transparent (try it on a clip with a green background).
11. PiP / split-screen: add a second clip on another track at the same time as the first. In the Mask panel, set layout to `PiP` — the second clip appears in the corner. Set layout to `split2` — the two clips sit side by side. Set Background to `colour` and pick red — the letterbox area turns red. Back to `full`.
12. Undo: press Ctrl+Z repeatedly — the mask, layout, colour, LUT and keyframe changes undo one by one. Ctrl+Shift+Z redoes them. Reload the page after 3+ s — everything persists (autosave).

Expected: every step above works. Any deviation is a Phase 2 bug — report it before Phase 3 starts.

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
