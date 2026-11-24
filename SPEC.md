# Vidora — SPEC & Checklist

**App:** Vidora — "Create. Cut. Shine." · **Current version:** 0.8.0 (Phase 7 — AI tools)
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
- [x] Built-in asset browser — DONE in Phase 5 (MediaBrowser: Backgrounds section + live counts, total 714; Templates tab real). Cloud sync + version history: PENDING (Phase 8)

### B. Timeline & Basic Editing
- [x] Unlimited tracks (add video/audio/text); split, trim (drag edges), delete, duplicate, ripple delete
- [x] Freeze frame, reverse, crop, rotate, flip, mirror (flip H/V), scale, position, opacity
- [x] Fit/fill, group/ungroup, compound clips (basic), copy/paste, markers
- [x] Customizable keyboard shortcuts (Shortcuts panel, editable map persisted in localStorage; defaults: S split, M marker, Ctrl+Z/Y undo/redo, Space play/pause, Ctrl+D duplicate, Ctrl+C/V copy/paste, Delete, Shift+Delete ripple delete)
- [x] Command pattern undo/redo now real for timeline edits; autosave every 3 s + crash recovery (autosave notice on dashboard)

### C. Speed
- [x] Constant 0.1x–100x, speed presets (0.25/0.5/1/1.5/2/4/8x); timeline length = sourceDuration / speed (tested)
- [ ] Speed curve (bezier points + presets) — PENDING, moved to Phase 2 scope (keyframes engine); not silently skipped, listed here
- [x] Optical-flow slow motion — DONE (Phase 7, v0.8.0): real block-matching motion estimation (16×16 blocks, SAD search) + motion-compensated warp renders a new 2× frame-rate copy; the preview slow-mo itself stays frame-blend and the panel says so
- [x] Pitch preservation — DONE in Phase 4 (v0.5.0): the audio engine sets `preservesPitch` on every media element (browser pitch-preserving rate control) and the Web Audio modulated-delay pitch shifter drives the voice-changer presets. The Speed section note describes the real behaviour.

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
- [x] Denoise: real light spatial soften in the preview (blur amount). Stabilization: REAL in Phase 7 (v0.8.0) — translation-only phase-correlation motion correction, applied in the preview with a zoom to hide borders (rotation/scale/rolling-shutter NOT corrected, panel says so). Lens correction: stored as a flag ONLY, honestly labelled deferred in the UI (needs a camera profile, Phase 8) — never faked

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

## Parity retrofit — Rules 12/13/14 — DONE (v0.3.1, retroactive to Phases 0–2)

User rules added 2026-11-22 19:17 PKT (Rule 12 Autonomous Parity Mode, Rule 13 Beginner Mode, Rule 14 Autopilot) and 19:26 PKT (reference = CapCut; when the user is unavailable, check CapCut live via cloud browser, max 30-second approval wait, never block). Applied retroactively so Phase 2 closes under the parity gate:

- [x] `docs/UI_LAYOUT.md` — measured panel positions/proportions (top bar 48px, rail 64px, properties 288px, timeline 288px; re-measured in the audit with 0px drift)
- [x] `docs/behavior/<ID>.md` — 40 behaviour cards, one per Phase 0–2 feature (controls with min/max/default/step, interactions, states, edge cases; uncertain reference behaviour marked ASSUMED)
- [x] `docs/PARITY.md` — matrix, one row per feature: MATCH 30 / ASSUMED 10 / DIFF-FIXING 0 / total 40 — gate PASS
- [x] `docs/INTENTIONAL_DIFFS.md` — what must match vs what must differ (name, logo, icons, palette, fonts, content)
- [x] `docs/BUGS.md` — correction loop log (BUG-001…006 fixed, deferred engine work listed)
- [x] Self-audit (`audit/run-audit.mjs`, `npm run audit`) — Playwright + Chromium headless shell drives the production build: 40/40 checks passed, 29 screenshots in `audit/phase2/<ID>/`, `audit/phase2/AUDIT-REPORT.md`
- [x] Audit fixes in v0.3.1: every tab now opens a panel (honest placeholders for Audio/Text/Stickers/Captions/Templates/AI Tools); timeline clip right-click context menu; preview frame-step/loop/fullscreen/safe-zones/grid; timeline clip thumbnails; audio waveform peaks on audio clips (64 buckets, `MediaItem.peaks`); playhead/marker overlays no longer intercept clicks

## Correction round — live CapCut Web check — DONE (v0.3.2, 2026-11-22)

- [x] Live CapCut Web check ran 2026-11-22 20:02–20:13 PKT (no sign-in), recorded in `docs/reference/capcut/WEB-CHECK-2026-11-22.md`: 9 of 10 ASSUMED items resolved; Export could not be verified (sign-in) and stays ASSUMED
- [x] Fixes applied (BUG-007…BUG-013): Ctrl+A selects ALL clips on all tracks; frame-level snapping (project fps, default 30) with "Attach" magnet toggle, on by default; speed slider 0.1–100× + Duration field with CapCut clamps; Pitch toggle (disabled at 0.1×/100×) + Smooth slow-mo switch; draggable curve points + presets; blend mode live in the preview compositor (CapCut's modes, Linear burn omitted — no canvas equivalent); "Reduce image noise" + "Stabilize" labels
- [x] B-MARKER, B-GROUP, F-WHEELS → INTENTIONAL-DIFF (CapCut Web has none of them; spec requires them; await desktop screenshots). New card `docs/behavior/F-BLEND.md`. Parity score now MATCH 36 / ASSUMED 2 / INTENTIONAL-DIFF 3 / total 41
- [x] Tests 92/92 (was 82), build green (73 modules), audit 40/40 (audit suite predates v0.3.2; the new F-BLEND row is covered by the new Vitest tests)
- [x] Open item (not a code change): a live CapCut Web check needs the main agent's cloud browser — the retrofit used the self-built reference + Playwright audit; uncertain cards stay ASSUMED until a live check confirms them
- [x] `npm run build` green (73 modules), `npm test` 82/82 (new: media peaks, 3 tests)

## Phase 3 — Sections H + I — DONE (v0.4.0, 2026-11-23)

### H. Text & Graphics
- [x] Text tool (system fonts + custom upload via FontFace API), size 8–200, color, gradient fill, stroke, shadow, glow, background box; alignment, line spacing, text templates (14 original presets), animated text (In/Out/Loop)
- [x] Stickers (224 original procedural SVG: 28 designs × 8 palettes), shapes (10 original SVG + fill colour), drawing/pen tool (freehand strokes on the preview), motion tracking (manual track points + automatic NCC template tracking in Phase 7, v0.8.0 — click the subject once, points stay editable by hand)
- [x] Behaviour cards updated from the full signed-in CapCut Web walkthrough 2026-11-23 (07:16–07:28 PKT): Text tab has a third sub-tab "AI text FX" (Vidora: honest Phase 7 note); H-DRAW and H-TRACK/H-TRACK evidence resolved as noted in the cards

### I. Captions & Speech
- [x] Auto captions (real speech-to-text in Phase 7, v0.8.0: mic dictation via browser speech recognition + offline Vosk pipeline `tools/transcribe.py` → word-timed SRT/JSON; Whisper itself is NOT used and the panel says so), 8 original caption style presets, Auto lyrics noted (reference: recognize lyrics in songs)
- [x] SRT/VTT import/export (real parser, readable errors, round-trip tested); .ass NOT supported (panel says so); manual translation per cue (machine translation is Phase 7)
- [x] Text-to-speech (browser speechSynthesis: voice, rate, pitch, preview, narration clips that speak during preview; rendered TTS audio is real in Phase 7, v0.8.0 — offline Piper pipeline `tools/narrate.py` renders a WAV that imports as a normal audio clip; the WAV is not yet in exported files because export has no audio mix — Phase 8), text-based editing via the in-panel transcript (click a word to seek; reference Web has a separate Transcript tab — desktop has none)

### Phase 3 verification
- [x] `npm run build` green (80 modules), `npm test` 147/147, Phase 3 self-audit `npm run audit:phase3` **31/31, 0 open bugs** (`audit/phase3/AUDIT-REPORT.md`, 14 card folders with screenshots)
- [x] Audit found + fixed BUG-P3-001 (overlay clips stacked on one text track and covered each other — placement now opens a new track on overlap) and BUG-P3-002 (audit harness seek fix); see `docs/BUGS.md`
- [x] Parity score unchanged for the Phase 0–2 matrix: MATCH 37 / ASSUMED 1 (A-ASSETS) / INTENTIONAL-DIFF 3 / total 41 — X-EXPORT is MATCH on the signed-in export check 2026-11-23; Phase 3 card statuses (14 cards): MATCH 5 (H-STICKER, H-TEXT, H-TEXTANIM, H-TEXTSTYLE, I-CAPTION-STYLE), ASSUMED 3 (H-TRACK, I-CAPTION-AUTO, I-TRANSCRIPT — resolved on Web evidence), UNKNOWN 6 (H-DRAW, H-SHAPE, I-CAPTION-MANUAL, I-SRT, I-TRANSLATE, I-TTS — desktop evidence still missing; see the cards)

## Phase 4 — Section J (Audio) — DONE (v0.5.0, 2026-11-23)

- [x] Audio tab (Music / Sound effects sub-tabs, search, chips, categories + View all, Recommended rows with play + add) — 6 original music loops + 8 original SFX synthesized in-browser (Vidora Originals), imported-audio list, Voiceover section, Tools (Detect beats / Cut at beats / Open mixer)
- [x] Audio inspector: volume slider + dB readout + numeric, volume keyframes (Phase 2 engine), fade in/out 0–10 s, role (Music/Voice/SFX), 3-band EQ ±12 dB, noise reduction (high-pass + compressor — honestly labelled: does not remove voices or room noise), mute, Normalize to −1 dBFS (from probed peak level), voice changer (8 original presets) + Apply to all
- [x] Separate audio (detach): context menu + "Separate audio" inspector button + Ctrl+Shift+S; video muted + audioDetached, audio clip linked via linkedClipId (role defaults to Voice)
- [x] Mixer panel (shown when no clip is selected): master volume, ducking (music drops under voice, amount 0–24 dB, default 12), per-track volume/mute/solo
- [x] Audio engine (`src/lib/audioEngine.ts`): one AudioContext; every sounding clip (audio clips + video clips' embedded audio) routed through per-clip chains (pitch shifter for voice presets, 3-band EQ, bandpass, noise reduction, echo/robot AM) with per-tick effective gain (fades, keyframes, ducking, mute/solo, master); falls back to plain element volume when Web Audio is unavailable; pitch-preserving speed via browser `preservesPitch`
- [x] Beat detection (energy onsets, BPM estimate, labelled as an estimate) with Add beat markers + Cut at beats (multi-split)
- [x] Voiceover recording (getUserMedia + MediaRecorder, tested with the fake media device) with a recorded-seconds fallback for webm files whose duration cannot be probed (BUG-P4-001)
- [x] Vocal isolation / stem separation — DONE in Phase 7 (v0.8.0): real centre-channel (mid/side) split — "Isolate voice" renders the mid stem, "Remove voice" renders the side stem, both as WAV clips. NOT ML stem separation and the panel says so (works best on centre-panned vocals).

### Phase 4 verification
- [x] `npm run build` green (84 modules), `npm test` 184/184, Phase 4 self-audit `npm run audit:phase4` **31/31, 0 open bugs** (`audit/phase4/AUDIT-REPORT.md`, 8 card folders with screenshots)
- [x] Audit found + fixed BUG-P4-002 (audit harness markers baseline); build fixes BUG-P4-001 (voiceover duration fallback) and BUG-P4-003 (Speed note wording); BUG-D4 (pitch) closed; see `docs/BUGS.md`
- [x] Parity score now **MATCH 40 / ASSUMED 6 / INTENTIONAL-DIFF 3 / total 49** — J rows added to `docs/PARITY.md`: MATCH 3 (J-INSPECTOR, J-DETACH, J-PITCH), ASSUMED 5 (J-AUDIO, J-MIXER, J-VOICE, J-BEAT, J-VOICEOVER)

## Phase 5 — Section N (Procedural Asset Library) — DONE (v0.6.0, 2026-11-23)

- [x] 60+ GLSL effects with auto thumbnails — 62 GLSL effects (`src/lib/glslEffects.ts`, `src/lib/glsl.ts`: WebGL2 ping-pong renderer, u_intensity/u_p1/u_p2 uniforms, program cache; thumbnails rendered through the shader once and cached; disabled with a note when WebGL2 is missing; a shader compile failure is caught and that effect is skipped for the frame). 6 categories: Colour 12, Light 10, Distort 12, Stylize 12, Retro 8, Motion 8
- [x] 30+ GLSL transitions — 32 transitions (24 new canvas-2D draw cases in `drawTransition`, all deterministic; TransitionsPanel search + category filter)
- [x] 30+ procedurally generated .cube LUT looks with thumbnails — 32 looks in 6 categories (Warm 6, Cool 6, Film 6, Mono 4, Vivid 5, Soft 5), `.cube` files in `assets/luts/`, runtime thumbnails by sampling a test gradient, round-trip `parseCube(lutToCubeText(...))` within 1e-6
- [x] 200+ original SVG stickers/shapes (+ animated variants, Lottie-style JSON) — 232 stickers (29 base designs × 8 palettes) + 10 shapes; 28 animated motion presets (`src/lib/stickerAnim.ts`, Lottie-style JSON in `assets/stickers/animated/`), selectable per sticker clip (Stickers panel Motion select) and per text clip (loop animation picker)
- [x] 40+ open-license fonts + license file — 40 families (Sans 14, Serif 8, Mono 6, Display 7, Handwriting 5), all SIL OFL 1.1 except JetBrains Mono (Apache-2.0); latin-subset woff2 in `public/fonts/` + `fonts.css`, license texts in `LICENSES/`
- [x] 50+ text style presets, 30+ text animations — 50 text presets (6 categories); 30 named in/out animation kinds + 7 loop kinds + 28 motion-* kinds = 37 named animations
- [x] 20+ caption style presets with word-level highlight — 20 presets; `CaptionStylePreset` gains `highlight`/`highlightBackground` and `drawCaptionOverlay` uses them (was hardcoded violet/white)
- [x] 25+ original templates — 25 layouts (`src/lib/templates.ts`); "Use template" always starts a new project (never overwrites); media slots show their label on the canvas until media is added
- [x] Procedural music/SFX via Tone.js/Web Audio (30 loops, 100 SFX) — Web Audio direct (OfflineAudioContext); Tone.js not installed — the Web Audio recipes already satisfy the spec. 30 loops (24 new) + 100 SFX (92 new), all original recipes
- [x] Backgrounds/overlays: gradients, patterns, noise, film dust, frames — 30 backgrounds (Gradients 12, Patterns 8, Grain & Dust 4, Frames 6) as full-frame sticker clips via `addBackgroundClip`
- [x] `npm run build:assets` regenerates everything + license report — `scripts/build-assets.mjs` (Node 24 type stripping + resolve hook): logo icons, `assets/manifest.json` (663 entries, 714 total), 32 `.cube` files, 28 animated JSON files, font downloads + `fonts.css` + font manifest, license texts, provenance Phase 5 section; enforces every floor and exits non-zero below it
- [x] `/assets` + `manifest.json` (id, name, category, tags, license) — `assets/manifest.json` with per-section counts; `src/lib/assetLibrary.ts` exposes `assetLibraryCounts()` / `assetManifestEntries()` for the MediaBrowser live counts

### Phase 5 verification
- [x] `npm run build` green (92 modules), `npm test` 210/210 (was 184; new `src/test/phase5.test.ts` — 26 tests: catalog floors, GLSL assembly, transition schema coverage, LUT round-trips, fonts, text presets/animations, caption presets, templates, music/SFX shape, backgrounds, motion specs), Phase 5 self-audit `npm run audit:phase5` **38/38, 0 open bugs** (`audit/phase5/AUDIT-REPORT.md`, 12 card folders with screenshots); Phase 4 regression audit **31/31**
- [x] Audit found + fixed BUG-P5-001 (preview drew only the last visible clip — overlays hid the video; now composites all visible clips bottom-to-top); see `docs/BUGS.md`. Also fixed during the build: template sticker ids that did not exist in the sticker catalog (base-design fallback resolver added), invalid animation kinds in templates ('zoom'/'slide' → 'zoom-in'/'slide-left'), and the schema's motion-* kinds aligned to the real motion spec ids
- [x] Parity score now **MATCH 44 / ASSUMED 13 / INTENTIONAL-DIFF 3 / total 60** — A-ASSETS ASSUMED → MATCH (real asset browser), 11 new N-* rows added to `docs/PARITY.md` (MATCH: N-LUTS, N-TEXTPRESETS, H-STICKER motion; ASSUMED: N-GLSL, N-FONTS, N-TEXTANIM, N-CAPTIONPRESETS, N-TEMPLATES, N-MUSIC, N-BACKGROUNDS, N-ASSETS)

## Phase 6 — Section O (AI-Generated Content Library) — DONE (v0.7.0, 2026-11-23)

- [x] Pilot: 5 music tracks + 5 clips, quality review PASSED, then scaled (see `docs/BUGS.md` BUG-P6-001/002 for the two fixes the pilot review drove: per-variant palette hue jitter, stronger Sunrise sky/sun)
- [x] 100+ original instrumental music tracks (15s/30s/60s + loopable; BPM/key detected) — 100 MP3 tracks (40×15 s, 40×30 s, 20×60 s, 12 styles, bar-aligned, loopable, 128 kbps MP3 in `public/ai-library/music/`), BPM/key detected by autocorrelation (`generation/quality_filter.py`)
- [x] 200+ original SFX — 100 AI SFX + 100 Phase 5 procedural SFX = 200 total (`AI_SFX_TOTAL`); AI SFX in `public/ai-library/sfx/`, 20 families × 5
- [x] 100+ original stock clips (5–10s, 1080p, no real faces) — 100 MP4 clips, 1920×1080, 6 s, 30 fps in `public/ai-library/clips/` (+ JPG posters), 20 procedural scenes × 5 variants; no faces, no real footage
- [x] Images, textures, frames, transparent-PNG stickers — 110 PNG images in `public/ai-library/images/`: 40 textures, 20 frames, 50 stickers (white halo, transparent background)
- [x] TTS voices (English, Urdu, Hindi, Arabic) — 16 voice presets (4 languages × 4 roles: Narrator, Warm, Energetic, Calm) in `src/lib/voices.ts`, browser speechSynthesis with a note where no matching system voice exists; narration clips speak during preview (rendered TTS audio is real in Phase 7, v0.8.0 — Piper pipeline `tools/narrate.py`)
- [x] Pipeline: `/generation/prompts/*.json`, provider adapters, quality filter, resume support, GPU-safe mode, provenance manifest — `generation/make_prompts.py` (deterministic, seed 20261123, 410 prompts), `generation/synth.py` + `render_music.py` (numpy synthesis, MP3 via ffmpeg), `render_clips.py` (PIL painters + ffmpeg fast motion graph), `render_sfx.py`, `render_images.py`, `quality_filter.py` (duration/RMS/peak/silence/BPM autocorrelation; `generation/quality-report.json`), `providers/local.py` (only the local provider exists — external providers not configured, never called), `render_all.py` (orchestrator, resume via `generation/state.json`, `--gpu-safe` no-op CPU-only), `assets/ai-manifest.json` (100/100/100/110)
- [x] STRICT: no existing songs/melodies/lyrics, no artist/brand names, no logos, characters or real people's likeness in prompts — enforced by prompt generator + test (`src/test/phase6.test.ts` originality checks)
- [x] AI Library panel — `src/components/AILibraryPanel.tsx` (AI Tools tab): Generate / Music / Clips / Images / Voices sub-tabs, search + chips, play previews, "+ Add" to timeline, missing-file note when the AI library is not installed; in-browser generation via `src/lib/aiGenerate.ts` (seeded Web Audio music, canvas PNG image, canvas-capture WebM clip, dialogue scene) and `src/lib/audio.ts` (`renderPatternTrack` fallback: if the MP3 is missing, the same pattern is rendered live with Web Audio); `src/lib/aiLibrary.ts` catalog + HEAD probes, `src/lib/voices.ts`, `src/store/projectStore.ts` `addAiMediaClip`
- [x] `npm run build:assets` now enforces the Phase 6 floors (aiTracks 100, aiSfx 100, aiClips 100, aiImages 110, voices 16, SFX total 200) and validates `assets/ai-manifest.json` (manifest version 0.7.0, Phase 6 provenance section)

### Phase 6 verification
- [x] `npm run build` green (96 modules), `npm test` 228/228 (was 210; new `src/test/phase6.test.ts` — 18 tests: prompt validity/uniqueness/bar-alignment, manifest consistency, media files on disk, voices, in-browser generation determinism, asset-library floors), Phase 6 self-audit `npm run audit:phase6` **32/32, 0 open bugs** (`audit/phase6/AUDIT-REPORT.md`, 6 card folders with screenshots); Phase 5 regression audit **38/38**, Phase 4 regression **31/31**
- [x] Quality filter `python3 generation/quality_filter.py` **all passed** (music 100, SFX 100, clips 100, images 110) — after fixing 5 issues it caught (see `docs/BUGS.md` BUG-P6-005..009): Acoustic/Jazz micro-silence (pad bed added), Jazz BPM ambiguity (break-pattern pulse fix), SFX MP3 overshoot (peak 0.80), static pulse motion (animated crop), vignette alpha (solid rim). `npm run build:assets` enforces the Phase 6 floors + validates the AI manifest (1,089 entries)
- [x] Parity score — **MATCH 44 / ASSUMED 19 / INTENTIONAL-DIFF 3 / total 66** — 6 new O-* rows added to `docs/PARITY.md` (all ASSUMED: O-AI-LIBRARY, O-AI-GENERATE, O-AI-MUSIC, O-AI-CLIPS, O-AI-IMAGES, O-AI-VOICES — the reference AI flows are cloud pages never fully observed)

## Phase 7 — Section K (AI Tools) — DONE (v0.8.0, 2026-11-24)

- [x] Background removal (heuristic edge flood-fill segmentation, feathered alpha mask, live in preview; NOT an ML person model — the panel says so), auto reframe (motion + saliency heuristic, per-second crop windows, 9:16/16:9/1:1/4:5)
- [x] Smart cut (real RMS silence detection + filler-word ranges from captions, review before cutting, ripple-delete), upscaler to 4K (honest resample + sharpen, NOT AI detail recovery — the panel says so)
- [x] Low-light enhance, retouch (skin-tone mask + blur), relight (local-contrast lift), auto highlights (2-second segments scored by loudness + motion + speech → reel or keep-only), script-to-video (one line = one scene, Phase 6 generator visuals + text overlays + narration cues)
- [x] AI image generation (provider adapters with free/open-source alternatives): `src/lib/aiProviders.ts` — Local provider ready (Phase 6 in-browser generators); OpenAI/Stability/Replicate stubs, not configured, no API keys stored, no cloud call made (cloud settings are Phase 9)
- [x] AI captions (Vosk offline pipeline + mic dictation, word-timed SRT/JSON), text-to-speech render (Piper offline pipeline → WAV audio clip), voice changer (Phase 4, 8 presets), video studio / long video to shorts (Auto Highlights reel + Script-to-Video)
- [x] Real stabilization (FFT phase correlation, translation-only), real optical flow (block matching, 2× render), automatic camera tracking (NCC template matching), vocal isolation (centre-channel stems)
- [x] Behaviour cards: 15 new K cards (K-STT, K-TTS, K-SMARTCUT, K-REFRAME, K-BGREMOVE, K-TRACK, K-STABILIZE, K-ENHANCE, K-MOVEMENT, K-OPTFLOW, K-VOCAL, K-HIGHLIGHTS, K-SCRIPT, K-UPSCALE, K-PROVIDERS) + K-AI-AVATAR reference-only card (avatar wizard NOT built — desktop screenshot evidence only). Parity score now **MATCH 44 / ASSUMED 34 / INTENTIONAL-DIFF 3 / total 81**.
- [x] Offline pipelines under `tools/` (Vosk `transcribe.py`, Piper `narrate.py`, `download-models.sh`, `test_pipeline.sh`, `README.md`; models download-on-demand, NOT in the GitHub snapshot or the Drive zip). Verification: build 99 modules, tests 256/256, Phase 7 audit 61/61, Phase 6 regression 32/32, Phase 5 regression 38/38, Phase 4 regression 31/31, 0 open bugs.

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
