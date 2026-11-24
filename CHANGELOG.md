# Vidora — CHANGELOG

All notable changes to Vidora. Format follows Keep a Changelog.

## [0.8.0] — 2026-11-24 — Phase 7: AI tools (Section K)

AI tools, all real local implementations (deterministic, CPU-only) or honest labelled heuristics — nothing faked, no cloud call, no ML claimed where none exists. New "Tools" sub-tab on the AI Tools tab (`src/components/AIToolsPanel.tsx`, 15 sections): AI Captions (mic dictation via browser speech recognition + offline Vosk pipeline `tools/transcribe.py` → word-timed SRT/`.words.json`; Whisper itself is NOT used), Narration render (offline Piper pipeline `tools/narrate.py`, en_US-lessac-medium, 22050 Hz WAV → real audio clip), Smart Cut (real RMS silence detection + filler-word ranges from captions, review before cutting, ripple-delete), Auto Reframe (motion + saliency heuristic, per-second crop windows, 9:16/16:9/1:1/4:5), Background Removal (edge flood-fill segmentation, feathered alpha mask, live in preview — NOT an ML person model), Camera Tracking (NCC template matching, writes the same `tracking.points` as manual tracking), Stabilize (real FFT phase-correlation translation correction + zoom to hide borders; rotation/scale NOT corrected), Enhance (low-light gamma lift, skin-tone retouch, local-contrast relight, live per clip), AI Movement (7 camera moves → ordinary editable keyframes), Optical Flow (real 16×16 block matching + motion-compensated warp → 2× frame-rate copy), Vocal Isolation (centre-channel mid/side stems → WAV clips, NOT ML separation), Auto Highlights (2-second segments scored by loudness + motion + speech → reel or keep-only), Script-to-Video (one line = one scene, Phase 6 generator visuals + text overlays + narration cues), Upscale to 4K (honest resample + sharpen, NOT AI detail recovery), AI Providers (`src/lib/aiProviders.ts` — Local ready; OpenAI/Stability/Replicate stubs, not configured). New pure library `src/lib/aiTools.ts` (silence/filler detection, FFT + phase correlation, stabilization, segmentation, enhance ops, NCC tracking, motion vectors + frame interpolation, highlight scoring, bilinear upscale, camera moves, script scenes). Schema v0.8.0: per-clip `aiLowLight`/`aiRetouch`/`aiRelight`/`aiBgRemove`/`aiBgThreshold`/`aiStabilize`/`aiStabilization`/`aiStabilizeSmooth`/`aiStabilizeZoom`/`aiReframe`/`aiMovement`/`aiOpticalFlow`/`aiVocalMode`; old documents migrate with defaults. Offline pipelines under `tools/` (Vosk model + Piper voice download-on-demand via `tools/download-models.sh`; models are NOT in the GitHub snapshot or the Drive zip). Closes BUG-D1, BUG-D6, BUG-D8, BUG-D9, BUG-D10 (partial — export still has no audio mix, BUG-D5 Phase 8), BUG-D12.

Behaviour cards: 15 new K cards (all ASSUMED — the reference flows are matched; the engines are Vidora's own, honestly labelled) + K-AI-AVATAR reference-only card (avatar wizard NOT built). Parity score now **MATCH 44 / ASSUMED 34 / INTENTIONAL-DIFF 3 / total 81**.

### Fixed
- Phase correlation sign (BUG-P7-001): the cross-power spectrum used Fa·conj(Fb), peaking at the negative shift; now conj(Fa)·Fb returns the true shift.
- Correlation peak double-scaling (BUG-P7-002): the peak was divided by n after the inverse FFT already scales by 1/n, so it read ~0.0005 and never passed the 0.05 motion threshold.
- Stabilization applied backwards (BUG-P7-003): the compositor used `sx + dx`; moving the image right by c needs the source window at `sx − dx`.
- "Average shake" misnomer (BUG-P7-004): was mean |path| (a smooth pan read as huge shake); now mean |raw − smoothed| deviation.
- K-STT card correction (BUG-P7-007): dictation is microphone-only — the browser cannot listen to a clip file; the panel already said so.

### Tests
- Suite now 256 tests (was 228): new `src/test/phase7.test.ts` (28 tests: silence/filler detection, reframe windows, FFT round-trip, phase correlation recovering a known +5/+3 shift, growing camera path, background mask, enhance ops, centre-channel stem split, template tracking, optical-flow midpoint + motion vectors, highlight ranking, upscale, camera moves, script scenes, providers, schema v0.8.0 migration). Build 99 modules, tests 256/256, Phase 7 self-audit `npm run audit:phase7` **61/61, 0 open bugs** (`audit/phase7/AUDIT-REPORT.md`, 15 card folders with screenshots, fixtures regenerated in-script: test-av.mp4 + shaky test-shaky.mp4 + stereo test-gaps.wav with a 2 s silence); Phase 6 regression **32/32**, Phase 5 **38/38**, Phase 4 **31/31**.

## [0.7.0] — 2026-11-23 — Phase 6: AI-generated content library (Section O)

AI-generated library, all original (local procedural synthesis — no external service, no stock downloads): 100 AI music tracks (MP3 128k, 40×15 s + 40×30 s + 20×60 s, 12 styles, bar-aligned, loopable, BPM/key detected), 100 AI SFX (20 families × 5; total SFX 200 with Phase 5), 100 AI stock clips (1080p 6 s MP4 + JPG posters, 20 scenes × 5 variants), 110 AI images (40 textures, 20 frames, 50 transparent PNG stickers), 16 AI narration voices (English/Urdu/Hindi/Arabic × Narrator/Warm/Energetic/Calm, browser speechSynthesis). AI Library panel on the AI Tools tab (Generate / Music / Clips / Images / Voices sub-tabs, search + chips, play previews, "+ Add" to timeline, missing-file note when the library is not installed); in-browser generation (prompt → seeded Web Audio music, canvas image, canvas-capture video, dialogue scene) with a Web Audio fallback when an MP3 is missing. Pipeline under `generation/` (deterministic prompt generator, numpy music synthesis, PIL scene painters + ffmpeg motion graph, quality filter with BPM autocorrelation, resume support, CPU-only GPU-safe mode, provenance manifest `assets/ai-manifest.json`). Pilot (5 tracks + 5 clips + sample images) reviewed before scaling: waveforms/spectrograms clean, real motion in every clip, frames/stickers transparent — two pilot fixes (per-variant hue jitter, stronger Sunrise). `npm run build:assets` enforces the Phase 6 floors and validates the AI manifest. Verification: build 96 modules, tests 228/228, quality filter all passed (100/100/100/110), Phase 6 audit 32/32, Phase 5 regression 38/38, Phase 4 regression 31/31. The quality filter caught 5 real defects after the full render (Acoustic/Jazz micro-silence, Jazz BPM ambiguity, SFX MP3 overshoot, static pulse motion, vignette alpha) — all fixed and re-verified (BUG-P6-005..009).

## [0.6.0] — 2026-11-23 — Phase 5: procedural asset library (Section N)

Procedural asset library, all original or openly licensed: 62 GLSL effects (WebGL2 renderer `src/lib/glsl.ts` + catalog `src/lib/glslEffects.ts`, 6 categories, search + category chips + auto thumbnails, applied effects show intensity + p1/p2 sliders; disabled with a note when WebGL2 is missing), 32 transitions (24 new deterministic canvas-2D draw cases), 32 procedural LUT looks (6 categories, `.cube` files in `assets/luts/`, thumbnails by gradient sampling), 232 original SVG stickers (29 designs × 8 palettes) + 28 animated motion presets (Lottie-style JSON in `assets/stickers/animated/`, selectable per sticker clip and per text clip), 40 open-license fonts (SIL OFL 1.1 except JetBrains Mono Apache-2.0; latin woff2 in `public/fonts/` + `fonts.css`, real license texts in `LICENSES/`), 50 text style presets, 30 in/out + 7 loop + 28 motion text animations, 20 caption style presets with per-preset word highlight, 25 original templates ("Use template" always starts a new project; media slots show their label on the canvas), 30 procedural music loops + 100 SFX (Web Audio recipes — Tone.js not installed; the Web Audio path already satisfies the spec), 30 backgrounds (gradients/patterns/grain/frames as full-frame clips). `npm run build:assets` regenerates the library (`assets/manifest.json`, 663 entries / 714 total, 32 `.cube` files, 28 animated JSON files, font downloads, license texts, provenance report) and enforces every count floor. MediaBrowser shows live counts + a Backgrounds section; the Templates tab is wired to a real TemplatesPanel (AI Tools still uses the placeholder).

Behaviour cards: 10 new N cards (N-GLSL, N-LUTS, N-FONTS, N-TEXTPRESETS, N-TEXTANIM, N-CAPTIONPRESETS, N-TEMPLATES, N-MUSIC, N-BACKGROUNDS, N-ASSETS) + E-FX, E-TRANS, F-FILTERS, A-ASSETS, H-STICKER updated. Parity score now **MATCH 44 / ASSUMED 13 / INTENTIONAL-DIFF 3 / total 60** — A-ASSETS ASSUMED → MATCH; new rows: MATCH N-LUTS, N-TEXTPRESETS, H-STICKER motion; ASSUMED N-GLSL, N-FONTS, N-TEXTANIM, N-CAPTIONPRESETS, N-TEMPLATES, N-MUSIC, N-BACKGROUNDS, N-ASSETS.

### Fixed
- Preview compositing (BUG-P5-001): the preview drew only the last visible clip, so a text/sticker overlay hid the video underneath. It now composites all visible clips bottom-to-top (backgrounds → base video/image with its transition-in → overlays), and background clips render full-frame.
- Template sticker ids that did not exist in the sticker catalog (e.g. 'sparkle', 'rocket'): templates now resolve by base design id with a first-palette fallback, and the ids were corrected to real designs.
- Template animation kinds 'zoom'/'slide' were not valid schema kinds: corrected to 'zoom-in'/'slide-left'.
- The schema's 28 motion-* loop kinds used generic names with no motion behind them: aligned to the real motion spec ids (motion-heart, motion-star, …), so every kind actually moves.

### Tests
- Suite now 210 tests (was 184): new `src/test/phase5.test.ts` (26 tests: catalog floors, GLSL shader assembly, transition schema coverage, LUT round-trips within 1e-6, fonts, text presets/animations, caption presets, templates, music/SFX shape, backgrounds, motion specs). Build 92 modules, tests 210/210, Phase 5 self-audit `npm run audit:phase5` **38/38, 0 open bugs** (`audit/phase5/AUDIT-REPORT.md`, 12 card folders with screenshots); Phase 4 regression audit **31/31**.

## [0.5.0] — 2026-11-23 — Phase 4: audio (Section J)

Audio tab: Music / Sound effects sub-tabs with search, suggestion chips, categories + View all tile grid, Recommended rows (cover swatch, title, duration, author) with play-preview and "+" add buttons. 6 original music loops (Calm Pad, Soft Pulse, Night Drive, Morning Light, Deep Focus, Gentle Rain) + 8 original SFX (Soft Pop, Air Whoosh, Bright Chime, Deep Thud, Tick Click, Sparkle, Rising Sweep, Quick Blip), all synthesized in-browser with Web Audio and cached — no reference track or sound names anywhere. Imported audio lists the same way. Audio inspector: volume slider + dB readout + numeric input, volume keyframes (Phase 2 engine), fade in/out 0–10 s, role (Music/Voice/SFX), 3-band EQ ±12 dB, noise reduction (high-pass + compressor; the panel says plainly it does not remove background voices or room noise — real voice isolation is Phase 7), mute, Normalize to −1 dBFS from the probed peak level, voice changer (8 original presets: None, Deep Voice, Bright Voice, Radio Booth, Telephone, Cave Echo, Robot, Warm Studio) + Apply to all. Separate audio (detach): context menu + inspector button + Ctrl+Shift+S; the video is muted and marked audioDetached, the new audio clip links back via linkedClipId. Mixer panel (no clip selected): master volume, ducking (music drops under voice, 0–24 dB, default 12), per-track volume/mute/solo; track-header Solo buttons. Audio engine (`src/lib/audioEngine.ts`): one AudioContext; every sounding clip (audio clips + video clips' embedded audio) routes through per-clip chains with per-tick effective gain (fades, keyframes, ducking, mute/solo, master); falls back to plain element volume when Web Audio is unavailable. Pitch-preserving speed is real now (browser `preservesPitch`; BUG-D4 closed) — the Speed note was corrected to say so (BUG-P4-003). Beat detection (energy onsets, BPM estimate, labelled as an estimate) with Add beat markers + Cut at beats (multi-split). Voiceover recording (getUserMedia + MediaRecorder) with a recorded-seconds fallback for webm files whose duration cannot be probed (BUG-P4-001). Project JSON is v0.5.0: `mixer` (masterVolume, ducking, duckAmountDb), clip `audioDetached`/`audioRole`/`eq`/`fadeIn`/`fadeOut`/`muted`/`noiseReduction`/`voice`/`linkedClipId`, track `solo`/`volume`, media `peakLevel`; old documents migrate with defaults.

Behaviour cards: 8 new J cards (J-AUDIO, J-INSPECTOR, J-MIXER, J-VOICE, J-DETACH, J-PITCH, J-BEAT, J-VOICEOVER). Parity score now **MATCH 40 / ASSUMED 6 / INTENTIONAL-DIFF 3 / total 49** — J rows added to `docs/PARITY.md` (MATCH: J-INSPECTOR, J-DETACH, J-PITCH; ASSUMED: J-AUDIO, J-MIXER, J-VOICE, J-BEAT, J-VOICEOVER).

### Fixed
- Voiceover clips could silently vanish when the recorded webm had no finite duration (BUG-P4-001): the store now falls back to the recorded seconds, and very short recordings show "Recording too short — nothing saved."
- The Speed-section note misdescribed pitch preservation as a Web Audio pitch shifter (BUG-P4-003): it now names the browser's pitch-preserving playback, with the shifter correctly attributed to voice-changer presets.
- The Phase 4 audit harness read the markers baseline while a clip was selected (BUG-P4-002): baseline is now read in the no-clip (mixer) state.

### Tests
- Suite now 184 tests (was 147): new `src/test/audio.test.ts` (29 tests: fades, keyframe volume, audibility matrix, ducking, effective gain, normalize, beat detection, WAV header, voice-preset + Originals originality, render failure without OfflineAudioContext), timeline detach/multi-split/audio placement (5 tests), schema v0.5.0 migration defaults + range validation (2 tests), Ctrl+Shift+S shortcut (1 test). Build 84 modules, tests 184/184, Phase 4 self-audit `npm run audit:phase4` **31/31, 0 open bugs** (`audit/phase4/AUDIT-REPORT.md`, 8 card folders with screenshots).

## [0.4.0] — 2026-11-23 — Phase 3: text, stickers, captions (Sections H + I)

Text & graphics (H): Text panel with Templates/Effects/AI text FX sub-tabs (AI text FX is an honest Phase 7 note), Add heading/body, 14 original text style presets, full inspector (font, size 8–200, bold/italic/underline, alignment, line spacing, fill/gradient, stroke, background box, shadow, glow, opacity, transform, Apply to all), In/Out/Loop animations (8 original loop kinds). Stickers panel: 224 original procedural SVG stickers (28 designs × 8 palettes) with search + 8 categories, 10 original SVG shapes with fill colour, freehand drawing on the preview (colour + width, Clear button). Motion tracking: manual track points on an overlay clip (automatic detection is Phase 7 — the reference has Camera tracking, Pro, in Smart tools). Captions & speech (I): Auto captions from a pasted transcript with word-level highlight (honest substitute — real Whisper STT is Phase 7), 8 original caption styles, manual cue list (add/split/edit/delete, click to seek), SRT/VTT import + export (real parser, readable errors; .ass not supported, panel says so), per-cue manual translation (machine translation is Phase 7), in-panel transcript (click a word to seek), browser text-to-speech (voice, rate, pitch, preview, narration clips that speak during preview; rendered TTS audio in export is Phase 4/7).

Behaviour cards updated from the full signed-in CapCut Web walkthrough 2026-11-23 (07:16–07:28 PKT, `docs/reference/capcut/FULL-WALKTHROUGH-2026-11-23.md`): H-TRACK, I-CAPTION-AUTO and I-TRANSCRIPT resolved to ASSUMED on Web evidence; H-DRAW and I-TRANSLATE stay UNKNOWN (no draw/pen tool or translation UI found in any check); desktop Text/Audio tabs and desktop export still unseen. Parity score for the Phase 0–2 matrix stays **MATCH 37 / ASSUMED 1 (A-ASSETS) / INTENTIONAL-DIFF 3 / total 41**; Phase 3 cards: MATCH 5 / ASSUMED 3 / UNKNOWN 6 (see SPEC.md).

### Fixed
- Overlay clips (text, sticker, shape, drawing) no longer stack on one text track and cover each other: `addClipToTextTrack` (moved to `src/lib/timeline.ts` as a pure function) now picks the first unlocked text track where the clip's time range is free, and opens a new text track otherwise (BUG-P3-001, found by the Phase 3 audit; 4 new unit tests).

### Tests
- Suite now 147 tests (was 143): overlay placement (4 tests). Build 80 modules, tests 147/147, Phase 3 self-audit `npm run audit:phase3` **31/31, 0 open bugs** (`audit/phase3/AUDIT-REPORT.md`, 14 card folders with screenshots). The audit harness itself had a bug (BUG-P3-002: ruler seek assumed 36px/s and never scrolled the ruler into view — now reads the live zoom, default 24px/s).

## [0.3.2] — 2026-11-22 — Correction round (Rule 12.6): live CapCut Web check

A live CapCut Web check ran 2026-11-22 20:02–20:13 PKT (no sign-in; recorded in `docs/reference/capcut/WEB-CHECK-2026-11-22.md`) and resolved 9 of the 10 ASSUMED items from the v0.3.1 retrofit. This round applies those findings. Parity score now **MATCH 36 / ASSUMED 2 / INTENTIONAL-DIFF 3 / total 41**.

### Fixed
- Ctrl+A now selects ALL clips on all tracks (was: first clip only). New `allClipIds` in `src/lib/timeline.ts`, `selectAllClips` store action (BUG-007).
- Timeline snapping is now frame-level (project fps, default 30) with an "Attach" magnet toggle in the timeline toolbar, on by default (was: 0.25s threshold, labelled "Snap"). New `snapToFrame`/`snapTime` in `src/lib/timeline.ts`; ruler seeks quantize to the nearest frame (BUG-008).
- Speed slider now runs 0.1–100× (was: 0.1–8×) with a Duration field; typed speeds clamp as CapCut does (0.05→0.10×, 200→100×). Normal/Curve tabs in the Speed section; `speedForDuration` + `setClipDuration` added (BUG-009).
- Speed panel now has a Pitch on/off toggle (disabled at 0.1×/100×, like CapCut) and a Smooth slow-mo switch; `smoothSlowMo` added to the clip schema (default false). Pitch-preserving playback stays Phase 4 and the UI says so (BUG-010).
- RGB curve points are now draggable (was: add-only) and curve presets exist: Custom, Lighten, Darken, Fade, Contrast, Cool tone, Warm tone, Vintage. New `moveCurvePoint`/`curvePreset` in `src/lib/color.ts` (BUG-011).
- Blend mode is now live in the preview compositor (was: export-only). New `drawBlended` helper in `PreviewArea.tsx` applies `globalCompositeOperation` per clip; dropdown lists CapCut's modes (Normal, Overlay, Screen, Darken, Brighten, Hard light, Multiply, Soft light, Color burn, Color dodge; Linear burn omitted — no canvas equivalent); opacity lives under Transform → Opacity. Schema now accepts `color-burn`/`color-dodge` (BUG-012, closes BUG-D3).
- Cleanup panel: denoise renamed to "Reduce image noise" (CapCut's name) and the stabilization checkbox is now labelled "Stabilize" (CapCut's Pro toggle). The real motion engine stays Phase 7 and the UI says so; lens correction was not found in CapCut Web either (BUG-013).

### Changed
- B-MARKER, B-GROUP, F-WHEELS are now INTENTIONAL-DIFF: CapCut Web has no markers, no group/compound, and no colour wheels — Vidora keeps all three because the master spec requires them. Awaiting the user's desktop screenshots before any change here.
- New behaviour card `docs/behavior/F-BLEND.md` (HSL + blend, MATCH); F-WHEELS is now wheels-only. `docs/PARITY.md` re-scored (MATCH 36 / ASSUMED 2 / INTENTIONAL-DIFF 3 / 41), `docs/BUGS.md` logged BUG-007…BUG-013 and closed BUG-D3, `docs/INTENTIONAL_DIFFS.md` updated.
- Export stays ASSUMED: the live check could not verify it (sign-in blocked), so no export option is claimed to match CapCut yet.

### Tests
- Suite now 92 tests (was 82): frame snapping + magnet on/off, allClipIds across tracks, speed clamps, curve drag/presets, blend-mode mapping, `smoothSlowMo` schema default. Build 73 modules, tests 92/92, audit 40/40 (audit suite predates v0.3.2; the new F-BLEND row is covered by the new Vitest tests).

## [0.3.1] — 2026-11-22 — Parity retrofit for Phases 0–2 (Rules 12/13/14)

### Added
- Parity docs (Rule 12): `docs/UI_LAYOUT.md` (measured panel positions/proportions), 40 behaviour cards in `docs/behavior/<ID>.md` (controls with min/max/default/step, interactions, states, edge cases; uncertain reference behaviour marked ASSUMED), `docs/PARITY.md` (matrix: MATCH 30 / ASSUMED 10 / DIFF-FIXING 0 / 40 — gate PASS), `docs/INTENTIONAL_DIFFS.md`, `docs/BUGS.md` (correction-loop log).
- Self-audit (`audit/run-audit.mjs`, `npm run audit`): Playwright + Chromium headless shell drives the production build — 40/40 checks passed, 29 screenshots in `audit/phase2/<ID>/`, report in `audit/phase2/AUDIT-REPORT.md`, layout re-measured at 1440×900 with 0px drift.
- Every left tab now opens a panel: honest placeholder panels (`src/components/PlaceholderPanel.tsx`) for Audio (Phase 4), Text/Stickers/Captions (Phase 3), Templates (Phase 8), AI Tools (Phase 7).
- Timeline clip right-click context menu (Split, Duplicate, Copy, Paste, Freeze, Reverse, Ripple delete, Delete).
- Preview transport: frame-step buttons (−1f/+1f), Loop toggle, Fullscreen, safe-zones overlay (90% action-safe / 80% title-safe), thirds grid.
- Timeline clip thumbnails (media thumbnails as clip backgrounds) and audio waveform peaks: imported audio is decoded at import and stored as 64 normalised peak buckets (`MediaItem.peaks`, optional so old projects still validate); audio clips draw the waveform. Unit-tested (`src/test/media.test.ts`, 3 tests).

### Fixed
- Playhead/marker overlay lines in the timeline intercepted clicks on the clip beneath them — overlays are now `pointer-events-none` (found by the Playwright audit, BUG-006).

### Notes
- Reference rule recorded (user, 2026-11-22 19:26 PKT): the reference is CapCut; when the user is unavailable, check CapCut live via cloud browser, max 30-second approval wait, never block. The live CapCut Web check ran 2026-11-22 20:02–20:13 PKT (no sign-in) and resolved 9 of the 10 ASSUMED items; the v0.3.2 correction round applied them. Only Export stayed ASSUMED (sign-in blocked).

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
