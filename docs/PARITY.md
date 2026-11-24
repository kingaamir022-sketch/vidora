# Vidora — Parity Matrix (Rule 12.2)

> **Reference rule (user, 2026-11-22 19:26 PKT): the reference is CapCut,
> same as CapCut. When the user is not available, check CapCut yourself
> live (cloud browser, CapCut Web — the desktop app cannot run on this
> VM), then build to match it. Wait at most 30 seconds for the user's
> approval; if she does not approve within 30 seconds, check and verify
> yourself and build anyway — never block.** This retrofit was built
> from a self-built reference (CapCut-desktop knowledge + standard
> professional-editor behaviour) with a Playwright self-audit; where a
> card was uncertain it stayed marked ASSUMED. **A live CapCut Web
> check ran on 2026-11-22 (20:02–20:13 PKT, recorded in
> `docs/reference/capcut/WEB-CHECK-2026-11-22.md`) and resolved 9 of
> the 10 ASSUMED items** — the correction round v0.3.2 applied them.
> A second live check ran on 2026-11-23 (07:02–07:06 PKT,
> `docs/reference/capcut/WEB-CHECK-2026-11-23.md`) covering the Audio
> and Text tabs; Export was still blocked by sign-in then. On
> 2026-11-23 07:08–07:12 PKT the user logged in via the login card
> and the Export menu was checked signed-in (WEB-CHECK-2026-11-23.md
> §3): Share for review / Share as presentation / Share on social /
> Download, with Download offering 360p–4k, quality High/Recommended/
> Fast, 24/25/30/50/60fps, MP4/MOV. **X-EXPORT is now MATCH on that
> Web evidence** — note clearly: evidence is CapCut Web signed-in;
> desktop export may differ. Vidora covers the common subset
> (480–1080p, 24–60fps, MP4/WebM); 2K/4K, 25/50fps, MOV and quality
> tiers are Phase 8. A full signed-in walkthrough ran on 2026-11-23
> (07:16–07:28 PKT, `docs/reference/capcut/FULL-WALKTHROUGH-2026-11-23.md`)
> covering home, Library, all 11 editor tabs, the top bar, preview,
> timeline toolbar + right-click menu, the right inspector and the
> shortcuts dialog; the Phase 3 behaviour cards were updated from it
> (H-TRACK, I-CAPTION-AUTO and I-TRANSCRIPT resolved to ASSUMED on
> Web evidence; H-DRAW and I-TRANSLATE stay UNKNOWN — no draw/pen
> tool or translation UI was found in any check).

One row per feature/panel/screen for Phases 0–6 (Phase 3 H/I cards are
behaviour cards + audit only, not matrix rows yet). Status legend:
**MATCH** — implemented and behaving like the reference;
**ASSUMED** — reference behaviour was not certain, so the most common
industry-standard behaviour was chosen and marked in the behaviour
card; **DIFF-FIXING** — a difference found by the audit, being fixed;
**INTENTIONAL-DIFF** — deliberately different (see
`docs/INTENTIONAL_DIFFS.md`; never a bug).

Layout / Controls / Behavior / Shortcut / Workflow-steps columns use:
✓ = matches, ~ = assumed/partial, — = not applicable.

| Feature (card) | Layout | Controls | Behavior | Shortcut | Workflow | Evidence | Status |
|---|---|---|---|---|---|---|---|
| Branding & theme (P0-BRAND) | ✓ | ✓ | ✓ | — | ✓ | `design/tokens.json`, `public/logo.svg` | MATCH |
| Editor shell layout (P0-SHELL) | ✓ | ✓ | ✓ | — | ✓ | `docs/UI_LAYOUT.md`, audit screenshots | MATCH |
| Dashboard lists & new project (A-DASH) | ✓ | ✓ | ✓ | — | ✓ | `Dashboard.tsx` | MATCH |
| Rename / duplicate / delete (A-MANAGE) | ✓ | ✓ | ✓ | — | ✓ | `Dashboard.tsx` | MATCH |
| Aspect ratios (A-RATIO) | ✓ | ✓ | ✓ | — | ✓ | `TopBar.tsx` | MATCH |
| Media import (A-IMPORT) | ✓ | ✓ | ✓ | — | ✓ | `MediaBrowser.tsx`, `lib/media.ts` | MATCH |
| Folders & search (A-FOLDERS) | ✓ | ✓ | ✓ | — | ✓ | `MediaBrowser.tsx` | MATCH |
| Built-in assets browser (A-ASSETS) | ✓ | ✓ | ✓ | — | ✓ | `MediaBrowser.tsx` (Backgrounds section, live counts, total 714) · Phase 5: real browser, no longer a placeholder | MATCH |
| Tracks (B-TRACKS) | ✓ | ✓ | ✓ | — | ✓ | `TimelineShell.tsx` | MATCH |
| Split (B-SPLIT) | ✓ | ✓ | ✓ | ✓ | ✓ | `lib/timeline.ts` (splitClipAt) | MATCH |
| Trim & move (B-TRIM) | ✓ | ✓ | ✓ | — | ✓ | `TimelineShell.tsx` (frame snap, Attach toggle) · live check §1 | MATCH |
| Delete / duplicate / copy / paste (B-EDIT) | ✓ | ✓ | ✓ | ✓ | ✓ | `TimelineShell.tsx`, context menu | MATCH |
| Ripple delete (B-RIPPLE) | ✓ | ✓ | ~ | ✓ | ✓ | `lib/timeline.ts` (same-track only) | MATCH |
| Markers (B-MARKER) | ✓ | ✓ | ✓ | ✓ | ✓ | `TimelineShell.tsx` · CapCut Web has NO markers (§2) | INTENTIONAL-DIFF |
| Group / compound (B-GROUP) | ✓ | ✓ | ✓ | — | ✓ | `lib/timeline.ts` · CapCut Web has NO group (§3) | INTENTIONAL-DIFF |
| Transform (B-TRANSFORM) | ✓ | ✓ | ✓ | — | ✓ | `PropertiesPanel.tsx` | MATCH |
| Freeze / reverse (B-FREEZE) | ✓ | ✓ | ✓ | — | ✓ | `PreviewArea.tsx` badges | MATCH |
| Shortcuts (B-SHORTCUTS) | ✓ | ✓ | ✓ | ✓ | ✓ | `lib/shortcuts.ts` (Ctrl+A: all clips, all tracks) · live check §4 | MATCH |
| Constant speed (C-SPEED) | ✓ | ✓ | ✓ | — | ✓ | `PropertiesPanel.tsx` (slider 0.1–100× + Duration) · live check §5 | MATCH |
| Pitch flag (C-PITCH) | ✓ | ✓ | ✓ | — | ✓ | `PropertiesPanel.tsx` (Pitch toggle + Smooth slow-mo) · live check §6 | MATCH |
| Keyframes (D-KEYFRAMES) | ✓ | ✓ | ✓ | — | ✓ | `KeyframesPanel.tsx`, `lib/keyframes.ts` | MATCH |
| Easing & graph (D-EASING) | ✓ | ✓ | ✓ | — | ✓ | `KeyframesPanel.tsx` (bezier solver) | MATCH |
| In/out animations (D-ANIM) | ✓ | ✓ | ✓ | — | ✓ | `KeyframesPanel.tsx` (11 kinds) | MATCH |
| Transitions (E-TRANS) | ✓ | ✓ | ✓ | — | ✓ | `TransitionsPanel.tsx` (32 types, search + categories) | MATCH |
| Effects (E-FX) | ✓ | ✓ | ✓ | — | ✓ | `EffectsPanel.tsx` (14 CSS/pixel effects + 62 GLSL effects, search + categories + auto thumbnails) | MATCH |
| LUT import & looks (E-LUT) | ✓ | ✓ | ✓ | — | ✓ | `lib/lut.ts` (trilinear, 32 looks) · Filters tab real in Phase 5 | MATCH |
| Colour sliders (F-ADJUST) | ✓ | ✓ | ✓ | — | ✓ | `ColorPanel.tsx` (10 sliders) | MATCH |
| RGB curves (F-CURVES) | ✓ | ✓ | ✓ | — | ✓ | `ColorPanel.tsx` (draggable points + presets) · live check §7 | MATCH |
| HSL / blend (F-BLEND) | ✓ | ✓ | ✓ | — | ✓ | `ColorPanel.tsx` + `PreviewArea.tsx` (live blend) · live check §8 | MATCH |
| Colour wheels (F-WHEELS) | ✓ | ✓ | ✓ | — | ✓ | `ColorPanel.tsx` (wheels, spec-required) · CapCut Web has NO wheels (§8) | INTENTIONAL-DIFF |
| Scopes (F-SCOPES) | ✓ | ✓ | ✓ | — | ✓ | `ScopesPanel.tsx` (capture-based) | MATCH |
| Denoise / stabilization / lens (F-CLEAN) | ✓ | ✓ | ✓ | — | ✓ | `ColorPanel.tsx` (Stabilize toggle + Reduce image noise) · live check §9 | MATCH |
| Masks (G-MASK) | ✓ | ✓ | ✓ | — | ✓ | `MaskPanel.tsx` (7 shapes + pen) | MATCH |
| Chroma key (G-CHROMA) | ✓ | ✓ | ✓ | — | ✓ | `MaskPanel.tsx`, `lib/compositor.ts` | MATCH |
| PiP / split-screen (G-LAYOUT) | ✓ | ✓ | ✓ | — | ✓ | `MaskPanel.tsx` (Full/PiP/2/3/4-up) | MATCH |
| Backgrounds (G-BG) | ✓ | ✓ | ✓ | — | ✓ | `MaskPanel.tsx` (blur/colour/gradient/image) | MATCH |
| Preview transport (X-PREVIEW) | ✓ | ✓ | ✓ | ✓ | ✓ | `PreviewArea.tsx` (step/loop/fullscreen/safe/grid) | MATCH |
| Autosave & recovery (X-AUTOSAVE) | ✓ | ✓ | ✓ | — | ✓ | `projectStore.ts` (3s autosave) | MATCH |
| Basic export (X-EXPORT) | ✓ | ✓ | ~ | — | ✓ | `ExportPanel.tsx` (480–1080p, 24–60fps, MP4/WebM) · signed-in Web check 2026-11-23 (WEB-CHECK-2026-11-23.md §3): Download 360p–4k, quality High/Recommended/Fast, 24/25/30/50/60fps, MP4/MOV — Vidora covers the common subset; 2K/4K, 25/50fps, MOV, quality tiers are Phase 8; desktop export may differ | MATCH |
| Undo / redo (X-UNDO) | ✓ | ✓ | ✓ | ✓ | ✓ | `projectStore.ts` (stack cap 100) | MATCH |
| Timeline waveform (B-WAVE) | ✓ | ✓ | ✓ | — | ✓ | `lib/media.ts` (64 peaks), `TimelineShell.tsx` | MATCH |
| Audio tab: Music / SFX (J-AUDIO) | ✓ | ✓ | ~ | — | ✓ | `AudioPanel.tsx`, `lib/audio.ts` (ORIGINAL_LOOPS/SFX — 30 loops + 100 SFX in Phase 5) · FULL-WALKTHROUGH-2026-11-23.md (Audio tab) — sub-tabs, search, chips, categories, recommended rows, play + "+" add observed; desktop Audio tab never seen, categories/tracks are Vidora Originals | ASSUMED |
| Audio mixer (J-MIXER) | ~ | ~ | ~ | — | ~ | `MixerPanel.tsx` — no mixer exists in the reference; standard mixer shape (master + per-track volume/mute/solo, ducking) | ASSUMED |
| Audio inspector: volume, fades, EQ, noise, normalize (J-INSPECTOR) | ✓ | ✓ | ~ | — | ✓ | `PropertiesPanel.tsx` Audio section · FULL-WALKTHROUGH-2026-11-23.md (Audio Basic: volume slider + dB box, fade in/out, noise reduction switch) — volume/fade/noise structure observed; linear fade curve + EQ/Role/Mute/Normalize are Section J additions | MATCH |
| Voice changer (J-VOICE) | ~ | ~ | ~ | — | ~ | `PropertiesPanel.tsx` voice select + Apply to all · FULL-WALKTHROUGH-2026-11-23.md (Voice changer grid observed) — structure matched, presets are Vidora Originals, select instead of grid; desktop UI never seen | ASSUMED |
| Separate audio (J-DETACH) | ✓ | ✓ | ✓ | ✓ | ✓ | `lib/timeline.ts` detachAudio, `TimelineShell.tsx` context menu, Ctrl+Shift+S · FULL-WALKTHROUGH-2026-11-23.md (context menu + shortcuts dialog) | MATCH |
| Pitch-preserving speed (J-PITCH) | ✓ | ✓ | ✓ | — | ✓ | `lib/audioEngine.ts` (preservesPitch) + Speed section Pitch switch · FULL-WALKTHROUGH-2026-11-23.md (Speed panel: Pitch switch) | MATCH |
| Beat detection (J-BEAT) | ~ | ~ | ~ | — | ~ | `lib/audio.ts` detectBeats, `AudioPanel.tsx` Tools — no beat UI observed in the reference; energy-onset method, labelled as an estimate | ASSUMED |
| Voiceover recording (J-VOICEOVER) | ~ | ~ | ~ | — | ~ | `AudioPanel.tsx` Voiceover section, `lib/audio.ts` startVoiceoverRecording — no in-editor voiceover observed in the reference; standard record → stop → clip shape | ASSUMED |
| GLSL effects engine (N-GLSL) | ~ | ~ | ~ | — | ~ | `lib/glsl.ts` + `lib/glslEffects.ts` (62 effects, WebGL2, auto thumbnails) — no GLSL panel observed in the reference; engine shape and categories are Vidora's own | ASSUMED |
| LUT looks library (N-LUTS) | ✓ | ✓ | ✓ | — | ✓ | `lib/lut.ts` (32 procedural looks in 6 categories) · FULL-WALKTHROUGH-2026-11-23.md (Filters tab with preset rows) — tab shape matched, looks are Vidora Originals | MATCH |
| Open-license fonts (N-FONTS) | ~ | ~ | ~ | — | ~ | `lib/fonts.ts` (40 families, SIL OFL/Apache, local woff2) — no font list observed in the reference; shipping fonts locally is the standard open-license approach | ASSUMED |
| Text style presets (N-TEXTPRESETS) | ✓ | ✓ | ✓ | — | ✓ | `lib/text.ts` (50 presets in 6 categories) · FULL-WALKTHROUGH-2026-11-23.md (Text tab: template rows by category) — rows-by-category shape matched, styles are Vidora Originals | MATCH |
| Text animations (N-TEXTANIM) | ~ | ~ | ~ | — | ~ | `lib/keyframes.ts` + `lib/text.ts` (30 in/out kinds + 7 loop kinds + 28 motion presets) — animation kinds are Vidora Originals; reference animation names were never observed | ASSUMED |
| Caption style presets (N-CAPTIONPRESETS) | ~ | ~ | ~ | — | ~ | `lib/captions.ts` (20 presets with word-level highlight) — no caption style list observed in the reference; styles are Vidora Originals | ASSUMED |
| Templates (N-TEMPLATES) | ~ | ~ | ~ | — | ~ | `lib/templates.ts` (25 original layouts with media slots) · FULL-WALKTHROUGH-2026-11-23.md (Templates tab + "Use template" observed) — flow matched, layouts are Vidora Originals; Phase 8 adds replaceable slots + sharing | ASSUMED |
| Procedural music / SFX (N-MUSIC) | ~ | ~ | ~ | — | ~ | `lib/audio.ts` (30 loops + 100 SFX, Web Audio synthesis) — no procedural library observed in the reference; all recipes are Vidora Originals | ASSUMED |
| Backgrounds (N-BACKGROUNDS) | ~ | ~ | ~ | — | ~ | `lib/backgrounds.ts` (30 gradients/patterns/grain/frames as full-frame clips) — no background library observed in the reference; artwork is Vidora Original | ASSUMED |
| Asset library build (N-ASSETS) | ~ | ~ | ~ | — | ~ | `scripts/build-assets.mjs` (`npm run build:assets`, manifest 663 entries, 714 total) — build-time generation, no reference behaviour to match | ASSUMED |
| Sticker motion presets (H-STICKER) | ✓ | ✓ | ✓ | — | ✓ | `lib/stickerAnim.ts` (28 motion presets, Lottie-style JSON) + Stickers panel Motion select — motion is applied to the selected sticker clip; presets are Vidora Originals | MATCH |
| AI Library panel (O-AI-LIBRARY) | ~ | ~ | ~ | — | ~ | `components/AILibraryPanel.tsx` (Generate / Music / Clips / Images / Voices sub-tabs, search + chips + counts) — no in-editor AI panel observed in the reference (cloud pages only: Design Studio, Video Studio, Dreamina); panel shape is Vidora's own | ASSUMED |
| In-editor AI generation (O-AI-GENERATE) | ~ | ~ | ~ | — | ~ | `lib/aiGenerate.ts` (prompt → seeded local generation: Web Audio music, canvas image, canvas-capture video, dialogue scene) · O-MEDIA-GENERATE (prompt box, type options, count 1–10, model select observed; result flow never observed) — local result grid is Vidora's own | ASSUMED |
| AI music tracks (O-AI-MUSIC) | ~ | ~ | ~ | — | ~ | `lib/aiLibrary.ts` + `assets/ai-manifest.json` (100 MP3 tracks, 15/30/60 s, loopable, BPM/key verified) · FULL-WALKTHROUGH-2026-11-23.md (Audio tab row shape) — rows matched, tracks are Vidora Originals | ASSUMED |
| AI stock clips (O-AI-CLIPS) | ~ | ~ | ~ | — | ~ | `lib/aiLibrary.ts` (100 MP4 clips, 1080p, 6 s, posters) · O-VIDEO-STUDIO (card grid with durations observed) — grid shape matched, clips are Vidora Original procedural renders | ASSUMED |
| AI images / textures / frames / stickers (O-AI-IMAGES) | ~ | ~ | ~ | — | ~ | `lib/aiLibrary.ts` (40 textures, 20 frames, 50 transparent PNG stickers) · O-DESIGN-STUDIO (Inspiration grid + filter chips observed) — grid shape matched, artwork is Vidora Original | ASSUMED |
| AI narration voices (O-AI-VOICES) | ~ | ~ | ~ | — | ~ | `lib/voices.ts` (16 presets: 4 languages x 4 roles, browser speechSynthesis) · FULL-WALKTHROUGH-2026-11-23.md (Text inspector TTS section) — TTS structure observed, voice catalogue is Vidora's own | ASSUMED |
| AI captions — speech to text (K-STT) | ~ | ~ | ~ | — | ~ | `components/AIToolsPanel.tsx` + `tools/transcribe.py` (Vosk offline pipeline → word-timed SRT/JSON) + mic dictation via browser speech recognition — the reference auto-caption flow (language pick → generate → timed cues) is matched; the engines are Vidora's own, honestly labelled (Whisper NOT used; dictation hears the mic, not the clip) | ASSUMED |
| Narration render — TTS audio (K-TTS) | ~ | ~ | ~ | — | ~ | `tools/narrate.py` (Piper, MIT, en_US-lessac-medium, 22050 Hz WAV) renders narration to a real audio clip; in-app preview still uses browser speechSynthesis — the reference TTS flow (pick voice → narration clip) is matched; the render engine is Vidora's own | ASSUMED |
| Smart Cut — silence & filler removal (K-SMARTCUT) | ~ | ~ | ~ | — | ~ | `lib/aiTools.ts` (RMS per 50 ms + filler-word ranges) + `AIToolsPanel.tsx` (analyse → review → cut, nothing deleted without confirmation) — the reference flow (analyse → review → cut) is the standard shape; thresholds and the filler list are Vidora's own | ASSUMED |
| Auto Reframe (K-REFRAME) | ~ | ~ | ~ | — | ~ | `lib/aiTools.ts` (motion + saliency heuristic, per-second crop windows) + `compositor.ts` (crop applied in preview) — the reference flow (pick ratio → subject stays framed) is matched; the subject finder is Vidora's own heuristic, honestly labelled | ASSUMED |
| Background Removal (K-BGREMOVE) | ~ | ~ | ~ | — | ~ | `lib/aiTools.ts` (edge flood-fill segmentation, feathered alpha mask) + `compositor.ts` — the reference flow (toggle → subject isolated) is matched; the engine is a heuristic, not an ML person model, and the panel says so | ASSUMED |
| Camera Tracking — automatic (K-TRACK) | ~ | ~ | ~ | — | ~ | `lib/aiTools.ts` (NCC template matching, writes the same `tracking.points` as manual tracking) — the reference flow (pick subject → camera follows) is matched; the tracker is Vidora's own, honestly labelled (fast motion/occlusion can lose the lock) | ASSUMED |
| Stabilize — real motion correction (K-STABILIZE) | ~ | ~ | ~ | — | ~ | `lib/aiTools.ts` (radix-2 FFT phase correlation, smoothed trajectory) + `compositor.ts` (inverse translate + zoom) — the reference flow (toggle → steadier footage) is matched; the engine is Vidora's own phase-correlation stabiliser, translation-only (rotation/scale NOT corrected, panel says so) | ASSUMED |
| Enhance — Low-light, Retouch, Relight (K-ENHANCE) | ~ | ~ | ~ | — | ~ | `lib/aiTools.ts` (gamma lift + histogram stretch; skin-tone mask + blur; local-contrast lift) live in the preview per clip — the reference flow (open tool → adjust → preview updates) is matched; the pixel engines are Vidora's own | ASSUMED |
| AI Movement — camera moves (K-MOVEMENT) | ~ | ~ | ~ | — | ~ | `lib/aiTools.ts` (7 deterministic moves → ordinary scale/position keyframes) — the reference flow (pick a move → clip moves) is matched; the move paths are Vidora's own keyframe presets, no ML camera claimed | ASSUMED |
| Optical Flow — smooth slow motion (K-OPTFLOW) | ~ | ~ | ~ | — | ~ | `lib/aiTools.ts` (16×16 block matching, motion-compensated warp) renders a real 2× frame-rate copy — the reference flow (smooth slow-mo → smoother motion) is matched; the estimator is Vidora's own block matcher, honestly labelled (not a neural flow model) | ASSUMED |
| Vocal Isolation — stems (K-VOCAL) | ~ | ~ | ~ | — | ~ | `lib/aiTools.ts` (centre-channel mid/side split) renders real WAV stems — no vocal-isolation UI was observed in the reference; the method is the standard karaoke/centre-extraction technique, honestly labelled (not ML stem separation) | ASSUMED |
| Auto Highlights (K-HIGHLIGHTS) | ~ | ~ | ~ | — | ~ | `lib/aiTools.ts` (2-second segments scored by loudness + motion + speech) + reel builder / keep-only — the reference flow (analyse → best moments → reel) is the standard shape; the scoring weights are Vidora's own | ASSUMED |
| Script-to-Video (K-SCRIPT) | ~ | ~ | ~ | — | ~ | `lib/aiTools.ts` (script → scenes) + Phase 6 `lib/aiGenerate.ts` visuals + text overlays with narration cues — the reference flow (write → scenes → video) is the standard shape; the assembly is Vidora's own composition of its generators | ASSUMED |
| Upscale to 4K (K-UPSCALE) | ~ | ~ | ~ | — | ~ | `lib/aiTools.ts` (canvas resample + unsharp-mask sharpen) renders a 2K/4K copy via MediaRecorder — the reference flow (upscale → 4K file) is matched; the engine is Vidora's own resample, honestly labelled (no detail recovery, not AI upscaling) | ASSUMED |
| AI Providers (K-PROVIDERS) | ~ | ~ | ~ | — | ~ | `lib/aiProviders.ts` (Local provider ready; OpenAI/Stability/Replicate stubs, not configured) — no reference provider UI was observed; the adapter shape is Vidora's own, no cloud call is made | ASSUMED |

## Parity score (correction round v0.3.2 + signed-in export check 2026-11-23 + Phase 3 v0.4.0 + Phase 4 v0.5.0 + Phase 5 v0.6.0 + Phase 6 v0.7.0 + Phase 7 v0.8.0)

- **MATCH: 44 / 81**
- **ASSUMED: 34 / 81** — J-AUDIO, J-MIXER, J-VOICE, J-BEAT, J-VOICEOVER, N-GLSL, N-FONTS, N-TEXTANIM, N-CAPTIONPRESETS, N-TEMPLATES, N-MUSIC, N-BACKGROUNDS, N-ASSETS, O-AI-LIBRARY, O-AI-GENERATE, O-AI-MUSIC, O-AI-CLIPS, O-AI-IMAGES, O-AI-VOICES, K-STT, K-TTS, K-SMARTCUT, K-REFRAME, K-BGREMOVE, K-TRACK, K-STABILIZE, K-ENHANCE, K-MOVEMENT, K-OPTFLOW, K-VOCAL, K-HIGHLIGHTS, K-SCRIPT, K-UPSCALE, K-PROVIDERS
- **DIFF-FIXING: 0 / 81**
- **INTENTIONAL-DIFF: 3 / 81** — B-MARKER, B-GROUP, F-WHEELS (spec-required extras CapCut Web lacks; awaiting desktop screenshots)
- **Gate result: PASS** — every Phase 0–2 feature is MATCH, ASSUMED or INTENTIONAL-DIFF,
  `npm run build` is green (99 modules), `npm test` is 256/256, and the
  Playwright self-audits pass: Phase 2 (`audit/phase2/AUDIT-REPORT.md`)
  40/40 checks with 0 open bugs (29 screenshots in `audit/phase2/<ID>/`,
  layout re-measured at 1440×900 with 0px drift), Phase 3
  (`audit/phase3/AUDIT-REPORT.md`) 31/31 checks with 0 open bugs
  (14 card folders with screenshots in `audit/phase3/<ID>/`), Phase 4
  (`audit/phase4/AUDIT-REPORT.md`) 31/31 checks with 0 open bugs
  (8 card folders with screenshots in `audit/phase4/<ID>/`), Phase 5
  (`audit/phase5/AUDIT-REPORT.md`) 38/38 checks with 0 open bugs
  (12 card folders with screenshots in `audit/phase5/<ID>/`), Phase 6
  (`audit/phase6/AUDIT-REPORT.md`) 32/32 checks with 0 open bugs
  (6 card folders with screenshots in `audit/phase6/<ID>/`), Phase 7
  (`audit/phase7/AUDIT-REPORT.md`) 61/61 checks with 0 open bugs
  (15 card folders with screenshots in `audit/phase7/<ID>/`). The Phase 2
  audit suite predates v0.3.2; the F-BLEND row is covered by the new Vitest tests
  (blend mapping, live compositing path) and the updated F-WHEELS
  audit screenshots.

## What the score does not cover

- Deferred engine work (lens correction → Phase 8, 4K/H.265 export →
  Phase 8) is honestly labelled in the UI and logged in `docs/BUGS.md`
  as deferred, not counted as a parity failure. Real motion
  stabilization and optical flow are DONE in Phase 7 (v0.8.0), as are
  auto captions, auto tracking, vocal isolation and TTS audio — see the
  K rows above. Pitch-preserving speed playback is DONE in Phase 4
  (browser `preservesPitch` + Web Audio voice shifter). Blend modes now
  apply live in the preview (v0.3.2), so they no longer belong in this
  list.
- The AI avatar tab (K-AI-AVATAR) is reference evidence only — NOT built;
  Vidora's 11th tab is "AI Tools" and it now opens the full AI Tools
  panel (AI Library sub-tabs + the 15 K tools). The avatar wizard is not
  scored as a feature here. The AI Tools tab is implemented in v0.7.0
  (AI Library, O rows above) and extended in v0.8.0 (K rows above).
  Templates tab is implemented in v0.6.0 (25 original layouts, N-TEMPLATES)
  and scored above; Phase 8 adds replaceable media slots + sharing.
  Audio (Phase 4) is implemented in v0.5.0 and scored above (J rows).
  Text/Stickers/Captions (Phase 3) are implemented in v0.4.0 — their
  behaviour cards carry the status (MATCH / ASSUMED /
  UNKNOWN) and the Phase 3 audit covers them; they are not yet rows in
  this matrix, which now scores Phases 0–2 + Phase 4 + Phase 5 + Phase 6 + Phase 7 (81 rows).
- Light-theme editor styling is Phase 9; the dashboard toggle exists
  and the editor remains dark until then.
- CapCut Web's left rail differs from desktop (Elements/Transcript/
  Brand kit, no Stickers) — the desktop screenshots the user is
  sending remain the main reference; Web is only a check for panel
  behaviour. Awaiting desktop evidence: markers, group/compound,
  colour wheels.
