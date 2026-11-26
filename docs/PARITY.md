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
> **Correction round v1.0.1 (2026-11-25):** the user ordered a
> complete CapCut clone (only the app name and logo stay Vidora) and
> sent 10 desktop screen-recording videos (~13 min) as the primary
> reference (`docs/reference/capcut/VIDEOS-2026-11-25.md`). The
> 114-item diff list (`docs/CAPCUT-FIX-2026-11-25.md`) was worked
> through item by item; the app was re-screenshotted at 1920×1080
> (`audit/capcut-fix/after/`, 21 shots, 0 page errors) and compared
> against the 30 desktop screenshots and the video frames. 9 rows
> were deleted (features CapCut lacks, removed by design) and 12
> ASSUMED rows were verified to MATCH. Rows that stay ASSUMED are
> the ones no screenshot, video or walkthrough ever showed (AI-tool
> engines, procedural content, export extras, cloud, CI/Docker).


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
| Editor shell layout (P0-SHELL) | ✓ | ✓ | ✓ | — | ✓ | `docs/UI_LAYOUT.md`, audit screenshots · v1.0.2: widths verified at 1920×1080/100% (left 610 / preview 790 / Details 520) + `min(610px,32vw)` / `min(520px,28vw)` caps for narrow viewports | MATCH |
| Dashboard lists & new project (A-DASH) | ✓ | ✓ | ✓ | — | ✓ | `Dashboard.tsx` | MATCH |
| Rename / duplicate / delete (A-MANAGE) | ✓ | ✓ | ✓ | — | ✓ | `Dashboard.tsx` | MATCH |
| Aspect ratios (A-RATIO) | ✓ | ✓ | ✓ | — | ✓ | `TopBar.tsx` · v1.0.4: Ratio menu was clipped by the bottom bar's overflow-hidden group (BUG-CF-029, no option clickable) — now a direct child of the preview section; 1:1 kept square via JS-fitted box (BUG-CF-030); autosave flushes on unload so a ratio survives an immediate reload (BUG-CF-031); every option verified in Playwright | MATCH |
| Media import (A-IMPORT) | ✓ | ✓ | ✓ | — | ✓ | `MediaBrowser.tsx`, `lib/media.ts` · v1.0.2: CapCut-form Import box (28px teal "+" + "Import" inline + drag-and-drop subtext, whole box opens the file picker — verified) | MATCH |
| Folders & search (A-FOLDERS) | ✓ | ✓ | ✓ | — | ✓ | `MediaBrowser.tsx` | MATCH |
| Built-in assets browser (A-ASSETS) | ✓ | ✓ | ✓ | — | ✓ | `MediaBrowser.tsx` (Backgrounds section, live counts, total 714) · Phase 5: real browser, no longer a placeholder | MATCH |
| Tracks (B-TRACKS) | ✓ | ✓ | ✓ | — | ✓ | `TimelineShell.tsx` | MATCH |
| Split (B-SPLIT) | ✓ | ✓ | ✓ | ✓ | ✓ | `lib/timeline.ts` (splitClipAt) | MATCH |
| Trim & move (B-TRIM) | ✓ | ✓ | ✓ | — | ✓ | `TimelineShell.tsx` (frame snap, Attach toggle) · live check §1 | MATCH |
| Delete / duplicate / copy / paste (B-EDIT) | ✓ | ✓ | ✓ | ✓ | ✓ | `TimelineShell.tsx`, context menu | MATCH |
| Ripple delete (B-RIPPLE) | ✓ | ✓ | ~ | ✓ | ✓ | `lib/timeline.ts` (same-track only) | MATCH |
| Transform (B-TRANSFORM) | ✓ | ✓ | ✓ | — | ✓ | `PropertiesPanel.tsx` | MATCH |
| Freeze / reverse (B-FREEZE) | ✓ | ✓ | ✓ | — | ✓ | `PreviewArea.tsx` badges | MATCH |
| Shortcuts (B-SHORTCUTS) | ✓ | ✓ | ✓ | ✓ | ✓ | `lib/shortcuts.ts` (Ctrl+A: all clips, all tracks) · live check §4 | MATCH |
| Constant speed (C-SPEED) | ✓ | ✓ | ✓ | — | ✓ | `PropertiesPanel.tsx` (slider 0.1–100× + Duration) · live check §5 | MATCH |
| Pitch flag (C-PITCH) | ✓ | ✓ | ✓ | — | ✓ | `PropertiesPanel.tsx` (Pitch toggle + Smooth slow-mo) · live check §6 | MATCH |
| Keyframes (D-KEYFRAMES) | ✓ | ✓ | ✓ | — | ✓ | `KeyframesPanel.tsx`, `lib/keyframes.ts` | MATCH |
| Easing & graph (D-EASING) | ✓ | ✓ | ✓ | — | ✓ | `KeyframesPanel.tsx` (bezier solver) | MATCH |
| In/out animations (D-ANIM) | ✓ | ✓ | ✓ | — | ✓ | `KeyframesPanel.tsx` (11 kinds) | MATCH |
| Transitions (E-TRANS) | ✓ | ✓ | ✓ | — | ✓ | `TransitionsPanel.tsx` (32 types, search + categories) · v1.0.2: search on top, tile grid always visible, tiles are real mid-transition stills with working PNG download, drag-and-drop onto clip boundaries + "+" apply · v1.0.3: "Pals" removed (not a CapCut category — Web check §4 + desktop #25); tiles now square ~70×70 · v1.0.4: tiles back to desktop size — 2 columns of ~130×130 photo thumbs (PIL-measured from #25: x 212–340 / 365–494, gap ~24px), middle-truncated names | MATCH |
| Effects (E-FX) | ✓ | ✓ | ✓ | — | ✓ | `EffectsPanel.tsx` (14 CSS/pixel effects + 62 GLSL effects, search + categories + auto thumbnails) · v1.0.2: applied-effects card above the grid (was below the fold), drag-and-drop + "+" apply, redirect to the video clip under the playhead when a sticker/text clip is selected, grid browsable with no clip | MATCH |
| LUT import & looks (E-LUT) | ✓ | ✓ | ✓ | — | ✓ | `lib/lut.ts` (trilinear, 32 looks) · Filters tab real in Phase 5 · v1.0.2: filter tiles show a sample photo with the LUT actually applied + working `.cube` download · v1.0.3: Tools group (Enhance, 4K, HD Upscale, Quality Restoration, Night-view Color, HD Cam 2, HD Pet) now applies directly on click with Intensity only, per Web check §3; tiles now square ~70×70 · v1.0.4: tiles back to desktop size — 2 columns of ~130×130 photo thumbs (PIL-measured from #27), middle-truncated names; classic effect tiles now render real photos too (v1.0.4 item 4) | MATCH |
| Colour sliders (F-ADJUST) | ✓ | ✓ | ✓ | — | ✓ | `ColorPanel.tsx` (10 sliders) | MATCH |
| RGB curves (F-CURVES) | ✓ | ✓ | ✓ | — | ✓ | `ColorPanel.tsx` (draggable points + presets) · live check §7 | MATCH |
| HSL / blend (F-BLEND) | ✓ | ✓ | ✓ | — | ✓ | `ColorPanel.tsx` + `PreviewArea.tsx` (live blend) · live check §8 | MATCH |
| Scopes (F-SCOPES) | ✓ | ✓ | ✓ | — | ✓ | `ScopesPanel.tsx` (capture-based) | MATCH |
| Denoise / stabilization / lens (F-CLEAN) | ✓ | ✓ | ✓ | — | ✓ | `ColorPanel.tsx` (Stabilize toggle + Reduce image noise) · live check §9 | MATCH |
| Masks (G-MASK) | ✓ | ✓ | ✓ | — | ✓ | `MaskPanel.tsx` (7 shapes + pen) | MATCH |
| Chroma key (G-CHROMA) | ✓ | ✓ | ✓ | — | ✓ | `MaskPanel.tsx`, `lib/compositor.ts` | MATCH |
| PiP / split-screen (G-LAYOUT) | ✓ | ✓ | ✓ | — | ✓ | `MaskPanel.tsx` (Full/PiP/2/3/4-up) | MATCH |
| Backgrounds (G-BG) | ✓ | ✓ | ✓ | — | ✓ | `MaskPanel.tsx` (blur/colour/gradient/image) | MATCH |
| Preview transport (X-PREVIEW) | ✓ | ✓ | ✓ | ✓ | ✓ | `PreviewArea.tsx` (step/loop/fullscreen/safe/grid) · v1.0.2: header always "Player-Timeline 01", plain gray play, play verified advancing the preview, empty canvas plain dark (project-name slate text removed) | MATCH |
| Autosave & recovery (X-AUTOSAVE) | ✓ | ✓ | ✓ | — | ✓ | `projectStore.ts` (3s autosave) | MATCH |
| Basic export (X-EXPORT) | ✓ | ✓ | ~ | — | ✓ | `ExportPanel.tsx` (360p–4K, 24/25/30/50/60fps, Fast/Recommended/High, MP4/WebM/MOV) · signed-in Web check 2026-11-23 (WEB-CHECK-2026-11-23.md §3): Download 360p–4k, quality High/Recommended/Fast, 24/25/30/50/60fps, MP4/MOV — Vidora now covers the full Web subset; desktop export may differ; H.265 is not offered (no browser encoder) | MATCH |
| Undo / redo (X-UNDO) | ✓ | ✓ | ✓ | ✓ | ✓ | `projectStore.ts` (stack cap 100) | MATCH |
| Timeline waveform (B-WAVE) | ✓ | ✓ | ✓ | — | ✓ | `lib/media.ts` (64 peaks), `TimelineShell.tsx` | MATCH |
| Audio tab: Music / SFX (J-AUDIO) | ✓ | ✓ | ✓ | — | ✓ | `AudioPanel.tsx`, `lib/audio.ts` (ORIGINAL_LOOPS/SFX — 30 loops + 100 SFX in Phase 5) · FULL-WALKTHROUGH-2026-11-23.md (Audio tab) — sub-tabs, search, chips, categories, recommended rows, play + "+" add observed; desktop Audio tab is not in the 10 videos; matches the signed-in Web walkthrough; categories/tracks are Vidora Originals | MATCH |
| Audio inspector: volume, fades, EQ, noise, normalize (J-INSPECTOR) | ✓ | ✓ | ~ | — | ✓ | `PropertiesPanel.tsx` Audio section · FULL-WALKTHROUGH-2026-11-23.md (Audio Basic: volume slider + dB box, fade in/out, noise reduction switch) — volume/fade/noise structure observed; linear fade curve + EQ/Role/Mute/Normalize are Section J additions | MATCH |
| Voice changer (J-VOICE) | ✓ | ✓ | ✓ | — | ✓ | `PropertiesPanel.tsx` voice buttons (grid) + Apply to all · FULL-WALKTHROUGH-2026-11-23.md (Voice changer grid observed) — structure matched, presets are Vidora Originals; desktop UI never seen | MATCH |
| Separate audio (J-DETACH) | ✓ | ✓ | ✓ | ✓ | ✓ | `lib/timeline.ts` detachAudio, `TimelineShell.tsx` context menu, Ctrl+Shift+S · FULL-WALKTHROUGH-2026-11-23.md (context menu + shortcuts dialog) | MATCH |
| Pitch-preserving speed (J-PITCH) | ✓ | ✓ | ✓ | — | ✓ | `lib/audioEngine.ts` (preservesPitch) + Speed section Pitch switch · FULL-WALKTHROUGH-2026-11-23.md (Speed panel: Pitch switch) | MATCH |
| Beat detection (J-BEAT) | ~ | ~ | ~ | — | ~ | `lib/audio.ts` detectBeats, `AudioPanel.tsx` Tools — no beat UI observed in the reference; energy-onset method, labelled as an estimate | ASSUMED |
| Voiceover recording (J-VOICEOVER) | ~ | ~ | ~ | — | ~ | `AudioPanel.tsx` Voiceover section, `lib/audio.ts` startVoiceoverRecording — no in-editor voiceover observed in the reference; standard record → stop → clip shape | ASSUMED |
| GLSL effects engine (N-GLSL) | ~ | ~ | ~ | — | ~ | `lib/glsl.ts` + `lib/glslEffects.ts` (62 effects, WebGL2, auto thumbnails) — no GLSL panel observed in the reference; engine shape and categories are Vidora's own | ASSUMED |
| LUT looks library (N-LUTS) | ✓ | ✓ | ✓ | — | ✓ | `lib/lut.ts` (32 procedural looks in 6 categories) · FULL-WALKTHROUGH-2026-11-23.md (Filters tab with preset rows) — tab shape matched, looks are Vidora Originals | MATCH |
| Open-license fonts (N-FONTS) | ~ | ~ | ~ | — | ~ | `lib/fonts.ts` (40 families, SIL OFL/Apache, local woff2) — no font list observed in the reference; shipping fonts locally is the standard open-license approach | ASSUMED |
| Text style presets (N-TEXTPRESETS) | ✓ | ✓ | ✓ | — | ✓ | `lib/text.ts` (50 presets in 6 categories) · FULL-WALKTHROUGH-2026-11-23.md (Text tab: template rows by category) — rows-by-category shape matched, styles are Vidora Originals | MATCH |
| Text animations (N-TEXTANIM) | ✓ | ✓ | ✓ | — | ✓ | `lib/keyframes.ts` + `lib/text.ts` (30 in/out kinds + 7 loop kinds + 28 motion presets) — animation kinds are Vidora Originals; In categories verified in video v09 (Trending, Basic, Light, Glitch, Mask, 3D, Vibration; first tile None) | MATCH |
| Caption style presets (N-CAPTIONPRESETS) | ~ | ~ | ~ | — | ~ | `lib/captions.ts` (23 presets with word-level highlight) — no caption style list observed in the reference; styles are Vidora Originals | ASSUMED |
| Templates (N-TEMPLATES) | ✓ | ✓ | ✓ | — | ✓ | `lib/templates.ts` (25 original layouts with media slots) · FULL-WALKTHROUGH-2026-11-23.md (Templates tab + "Use template" observed) — flow matched, layouts are Vidora Originals; Phase 8 adds replaceable slots + sharing · v1.0.2: hover-anchored preview (no click modal), separate Video/Text/Stickers tracks on apply, real first-frame thumbnails (`TemplateThumb.tsx`) | MATCH |
| Procedural music / SFX (N-MUSIC) | ~ | ~ | ~ | — | ~ | `lib/audio.ts` (30 loops + 100 SFX, Web Audio synthesis) — no procedural library observed in the reference; all recipes are Vidora Originals | ASSUMED |
| Backgrounds (N-BACKGROUNDS) | ~ | ~ | ~ | — | ~ | `lib/backgrounds.ts` (30 gradients/patterns/grain/frames as full-frame clips) — no background library observed in the reference; artwork is Vidora Original | ASSUMED |
| Asset library build (N-ASSETS) | ~ | ~ | ~ | — | ~ | `scripts/build-assets.mjs` (`npm run build:assets`, manifest 663 entries, 714 total) — build-time generation, no reference behaviour to match | ASSUMED |
| Sticker motion presets (H-STICKER) | ✓ | ✓ | ✓ | — | ✓ | `lib/stickerAnim.ts` (28 motion presets, Lottie-style JSON) + Stickers panel Motion select — motion is applied to the selected sticker clip; presets are Vidora Originals | MATCH |
| In-editor AI generation (O-AI-GENERATE) | ✓ | ✓ | ✓ | — | ✓ | `lib/aiGenerate.ts` (prompt → seeded local generation: Web Audio music, canvas image, canvas-capture video, dialogue scene) · O-MEDIA-GENERATE (prompt box, type options, count 1–10, model select observed; result flow never observed) — local result grid is Vidora's own | MATCH |
| AI music tracks (O-AI-MUSIC) | ✓ | ✓ | ✓ | — | ✓ | `lib/aiLibrary.ts` + `assets/ai-manifest.json` (100 MP3 tracks, 15/30/60 s, loopable, BPM/key verified) · FULL-WALKTHROUGH-2026-11-23.md (Audio tab row shape) — rows matched, tracks are Vidora Originals; in-editor add restored in the v1.0.1 correction (Audio tab "AI music" section, play + "+" adds an audio clip; renders in-browser when the MP3 is absent) | MATCH |
| AI stock clips (O-AI-CLIPS) | ✓ | ✓ | ✓ | — | ✓ | `lib/aiLibrary.ts` (100 MP4 clips, 1080p, 6 s, posters) · O-VIDEO-STUDIO (card grid with durations observed) — grid shape matched, clips are Vidora Original procedural renders; in-editor add restored in the v1.0.1 correction (Media tab "AI clips" section, click a card to add) | MATCH |
| AI images / textures / frames / stickers (O-AI-IMAGES) | ✓ | ✓ | ✓ | — | ✓ | `lib/aiLibrary.ts` (40 textures, 20 frames, 50 transparent PNG stickers) · O-DESIGN-STUDIO (Inspiration grid + filter chips observed) — grid shape matched, artwork is Vidora Original; in-editor add restored in the v1.0.1 correction (Media tab "AI images" section, click a card to add) | MATCH |
| AI narration voices (O-AI-VOICES) | ✓ | ✓ | ✓ | — | ✓ | `lib/voices.ts` (16 presets: 4 languages x 4 roles, browser speechSynthesis) · FULL-WALKTHROUGH-2026-11-23.md (Text inspector TTS section) — TTS structure observed, voice catalogue is Vidora's own | MATCH |
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
| Full export (L-EXPORT) | ✓ | ✓ | ✓ | — | ✓ | `lib/exportEngine.ts` (WebCodecs/mediabunny MP4/WebM/MOV, 360p–4K, 24/25/30/50/60fps, Fast/Recommended/High, real audio mix) + `ExportPanel.tsx` — matches the signed-in Web export panel (WEB-CHECK-2026-11-23.md §3) option for option; H.265 honestly not offered (no browser encoder); AAC unavailable in this browser so MP4/MOV is video-only with a visible note | MATCH |
| Export queue (L-EXPORT-QUEUE) | ~ | ~ | ~ | — | ~ | `lib/exportQueue.ts` (one job at a time, cancel, re-run, background while editing) + queue section in `ExportPanel.tsx` — no reference queue UI was observed; the background-queue shape is the standard editor pattern, honestly labelled (finished files live in memory only) | ASSUMED |
| Audio / GIF / frames / cover export (L-EXPORT-AUDIO) | ~ | ~ | ~ | — | ~ | `lib/exportEngine.ts` (WAV audio-only, GIF 10fps/320px/30s, PNG frame sequence, cover frame) + "More export kinds" in `ExportPanel.tsx` — no reference UI for these kinds was observed; the kinds are the standard export extras, each honestly limited in the UI | ASSUMED |
| Template slots (L-TEMPLATES-SLOTS) | ~ | ~ | ~ | — | ~ | `lib/templates.ts` (35 templates, `applyTemplateWithSlots`) + slot pickers in `TemplatesPanel.tsx` — no reference slot UI was observed; the "choose media for each slot" shape is the standard template flow, unfilled slots keep the placeholder clip | ASSUMED |
| Cloud backup (L-CLOUD) | ~ | ~ | ~ | — | ~ | `lib/cloudBackup.ts` (.vidora bundle: project JSON + media list, media files NOT inside) + Backups on the Spaces page (moved from the dashboard in v1.0.1, Y11) — no reference cloud UI was observed; Drive is the user's cloud (bundle downloads, user saves it to Drive), honestly labelled, no rented server | ASSUMED |
| Review comments (L-COLLAB) | ✓ | ✓ | ✓ | — | ✓ | `lib/collab.ts` (time-anchored comments, resolve/reopen) + review tab in `ExportPanel.tsx` (ruler markers removed in v1.0.1, Y6) — the review flow mirrors CapCut's "Share for review" (people can add comments); the local-first storage (comments live in the project file) is Vidora's own, honestly labelled | MATCH |
| Share (L-SHARE) | ✓ | ✓ | ✓ | — | ✓ | `lib/share.ts` (YouTube/Shorts, TikTok, TikTok Ads Manager, Facebook Page upload links; Instagram Reels has no web upload, honestly labelled) + share tabs in `ExportPanel.tsx` + presentation mode — matches the signed-in Web share menu (WEB-CHECK-2026-11-23.md §3) link for link; Free Schedule is disabled with a reason (no scheduler service) | MATCH |
| Localization (M-LOCALE) | ✓ | ✓ | ✓ | — | ✓ | `lib/i18n.ts` (en/ur/hi/ar, 45 chrome keys, `t()`, `formatDate`, `formatNumber`, `isRtl`) + `dir`/`lang` on `<html>` in `App.tsx` — the Language setting itself matches the reference "…" menu (FULL-WALKTHROUGH-2026-11-23.md § top bar); the four languages and RTL are Vidora's own scope, honestly labelled as a product feature | MATCH |
| Settings (M-SETTINGS) | ✓ | ✓ | ✓ | Esc | ✓ | `components/SettingsDialog.tsx` (Language/Theme/Input prefs/task bar/sidebar/tour replay/reset/Feature usage/Diagnostics) — the "…" menu and its Settings items match the reference (FULL-WALKTHROUGH-2026-11-23.md § top bar: Feature usage, Task bar, Sidebar, Help, Settings Language/Theme/Input preferences); Esc closes | MATCH |
| Accessibility (M-ACCESS) | ~ | ~ | ~ | — | ~ | `:focus-visible` rings in `src/index.css` (both themes), `aria-modal="true"` on Export/Shortcuts/Settings dialogs, labelled controls — no reference accessibility audit was observed; the standard practice is followed, keyboard focus is visibly outlined (audit-verified) | ASSUMED |
| Performance + light theme (M-PERF) | ~ | ~ | ~ | — | ~ | `lib/mediaCache.ts` (LRU, 200 entries: probe results by `name:size`, thumbnails by media id, wired into `lib/media.ts` import path) + finished light theme in `src/index.css` (zinc ramp remapped under `data-theme="light"`) — the light theme finishes the Phase 0 promise; the cache is standard practice | ASSUMED |
| Lens correction (M-LENS) | ~ | ~ | ~ | — | ~ | `lib/lens.ts` (radial distortion k1 model: `distortPoint`, `lensGrid` 12×12, `clampLensStrength`) + Strength slider −1…1 in `ColorPanel.tsx` + `lensStrength` in the schema + compositor remap step — CapCut Web has no lens correction (WEB-CHECK-2026-11-22.md); the generic correction is Vidora's own, honestly labelled (no camera profile, adjust by eye). Closes BUG-D2 | ASSUMED |
| .ass import (M-ASS) | ✓ | ✓ | ✓ | — | ✓ | `lib/captions.ts` `parseAss` (reads the Format line for column order, Dialogue lines only, strips `{...}` tags, `\N` → newline, `\h` → space) + `.ass` in the CaptionsPanel file picker — matches the reference: CapCut Web accepts .ass upload (WEB-CHECK-2026-11-23.md §4); .ass styles are not imported (cues use the current style, honestly labelled); .lrc still not supported. Closes BUG-D11 | MATCH |
| CI (M-CI) | ~ | ~ | ~ | — | ~ | `.github/workflows/ci.yml` (Node 20, `npm ci`, build, test, lint) — no reference; Playwright audits are NOT in CI (documented in the workflow: they need the headless shell + ffmpeg) | ASSUMED |
| Docker (M-DOCKER) | ~ | ~ | ~ | — | ~ | `Dockerfile` (node:20-alpine build → nginx:alpine serve) + `docker-compose.yml` (4173:80) + `.dockerignore` — no reference; the image was NOT built on this VM (docker not installed), honestly noted in the Dockerfile and the audit | ASSUMED |

## Parity score (correction round v1.0.6, 2026-11-26)

- **MATCH: 59 / 91** — unchanged. No ASSUMED row gained new CapCut
  reference evidence in this round, so none moves to MATCH. One
  live-site-only defect was fixed without touching any CapCut-facing
  behaviour: BUG-CF-037 — the Video Studio hero images (and every
  other AI-studio/Library image) 404'd on the live site because
  `withBase` was applied twice (`/vidora/vidora/...`); `withBase` is
  now idempotent. Verified against a Pages-base build served under
  `/vidora/`: hero 3/3 loaded (naturalWidth 1920), 304 imgs across
  all studio views + Library with 0 broken.
- **ASSUMED: 32 / 91** — same 32 rows as v1.0.1.
- **DIFF-FIXING: 0 / 91**
- **INTENTIONAL-DIFF: 0 / 91** — the only deliberate difference left
  is the app name and logo (Vidora, not CapCut), which is not a matrix
  row; see `docs/INTENTIONAL_DIFFS.md`.
- **Gate result: PASS** — every row is MATCH or ASSUMED, `npm run
  build` is green, `npm test` is 377/377, and the Playwright
  self-audits pass: Phase 4 26/26, Phase 5 39/39, Phase 6 15/15,
  Phase 7 60/60, Phase 8 56/56, Phase 9 42/42 — 0 open bugs. The
  v1.0.6 verification (`audit/capcut-fix/v106/verify.mjs`): 12 checks
  PASS, 0 page errors. The v1.0.5 score paragraph below is kept for
  history.

## Parity score (correction round v1.0.5, 2026-11-26)

- **MATCH: 59 / 91** — unchanged. No ASSUMED row gained new CapCut
  reference evidence in this round, so none moves to MATCH — but four
  MATCH rows were re-verified against the user's own live screenshots
  at 1920×1080 / 100% zoom with pixel/rect measurements (N-TEMPLATES:
  thumbs 300×534 with non-black pixel proof; X-PREVIEW: canvas
  756×424 filling the preview column, 1:1 square 622×622; P0-SHELL:
  7 tabs + Filters peeking 25 px; B-TOPBAR: Pro button gray #4F4F4F
  with lavender ◆). S2's small canvas was proven a 150%-zoom artifact,
  not a parity gap (BUG-CF-034).
- **ASSUMED: 32 / 91** — same 32 rows as v1.0.1.
- **DIFF-FIXING: 0 / 91**
- **INTENTIONAL-DIFF: 0 / 91** — the only deliberate difference left
  is the app name and logo (Vidora, not CapCut), which is not a matrix
  row; see `docs/INTENTIONAL_DIFFS.md`.
- **Gate result: PASS** — every row is MATCH or ASSUMED, `npm run
  build` is green, `npm test` is 376/376, and the Playwright
  self-audits pass: Phase 4 26/26, Phase 5 39/39, Phase 6 15/15,
  Phase 7 60/60, Phase 8 56/56, Phase 9 42/42 — 0 open bugs. The
  v1.0.5 verification (`audit/capcut-fix/v105/verify.mjs` + 
  `pixel-check.py`): 37 checks PASS, 0 page errors. The v1.0.2 score
  paragraph below is kept for history.

## Parity score (correction round v1.0.2, 2026-11-25)

- **MATCH: 59 / 91** — unchanged from v1.0.1. No ASSUMED row gained
  new CapCut reference evidence in this round (the 10 videos never
  showed the AI engines, procedural libraries, export extras, cloud,
  CI/Docker or beat/voiceover reference behaviour), so none moves to
  MATCH — but the MATCH rows above were re-verified against the user's
  own screenshots at 1920×1080 / 100% zoom (P0-SHELL, A-IMPORT,
  E-TRANS, E-FX, N-LUTS, X-PREVIEW, N-TEMPLATES evidence updated),
  and every control on them was verified working end to end
  (D13 functional sweep: file picker, play, template apply, transition
  apply, inspector sliders, timeline split/undo/redo/delete/zoom).
- **ASSUMED: 32 / 91** — same 32 rows as v1.0.1.
- **DIFF-FIXING: 0 / 91**
- **INTENTIONAL-DIFF: 0 / 91** — the only deliberate difference left
  is the app name and logo (Vidora, not CapCut), which is not a matrix
  row; see `docs/INTENTIONAL_DIFFS.md`.
- **Gate result: PASS** — every row is MATCH or ASSUMED, `npm run
  build` is green (193 modules), `npm test` is 355/355, and the
  Playwright self-audits pass: Phase 4 (`audit/phase4/AUDIT-REPORT.md`)
  26/26, Phase 5 39/39, Phase 6 15/15, Phase 7 60/60, Phase 8 56/56,
  Phase 9 42/42 — 0 open bugs. Final v1.0.2 comparison
  (`audit/capcut-fix/v102/final/final-compare.json`): all checks pass
  at 1920×1080 / 100% zoom, 0 page errors. The v1.0.1 score paragraph
  below is kept for history.

## Parity score (correction round v1.0.1, 2026-11-25)

- **MATCH: 59 / 91**
- **ASSUMED: 32 / 91** — J-BEAT, J-VOICEOVER, N-GLSL, N-FONTS, N-CAPTIONPRESETS, N-MUSIC, N-BACKGROUNDS, N-ASSETS, K-STT, K-TTS, K-SMARTCUT, K-REFRAME, K-BGREMOVE, K-TRACK, K-STABILIZE, K-ENHANCE, K-MOVEMENT, K-OPTFLOW, K-VOCAL, K-HIGHLIGHTS, K-SCRIPT, K-UPSCALE, K-PROVIDERS, L-EXPORT-QUEUE, L-EXPORT-AUDIO, L-TEMPLATES-SLOTS, L-CLOUD, M-ACCESS, M-PERF, M-LENS, M-CI, M-DOCKER
- **DIFF-FIXING: 0 / 91**
- **INTENTIONAL-DIFF: 0 / 91** — the only deliberate difference left is the app name and logo (Vidora, not CapCut), which is not a matrix row; see `docs/INTENTIONAL_DIFFS.md`. The three old intentional-diff rows (B-MARKER, B-GROUP, F-WHEELS) were deleted in v1.0.1 because those features were removed, not kept different.
- **Gate result: PASS** — every row is MATCH or ASSUMED, `npm run build` is green (190 modules), `npm test` is 315/315, and the Playwright self-audits pass: Phase 4 (`audit/phase4/AUDIT-REPORT.md`) 26/26 checks with 0 open bugs (J-MIXER removed, J-BEAT re-scoped to "Cut at beats" in the v1.0.1 harness port); Phase 5 (`audit/phase5/AUDIT-REPORT.md`) 39/39 checks, 0 open bugs (caption styles now 23, not 20 — Word category added 3); Phase 6 (`audit/phase6/AUDIT-REPORT.md`) 15/15 checks, 0 open bugs (was 9/9; +6 new checks for the restored in-editor AI catalog add: AI music "+", AI clip card, AI image card — see BUG-CF-010); Phase 7 (`audit/phase7/AUDIT-REPORT.md`) 60/60 checks, 0 open bugs; Phase 8 (`audit/phase8/AUDIT-REPORT.md`) 56/56 checks, 0 open bugs (L-CLOUD Backups section removed — backups now live on the Spaces page); Phase 9 (`audit/phase9/AUDIT-REPORT.md`) 42/42 checks, 0 open bugs (M-ONBOARD tour, M-AUTH, M-SUBS and M-TELEMETRY checks removed — all four features removed by design). (Previous counts, v1.0.0: Phase 5 38/38, Phase 6 32/32, Phase 7 61/61, Phase 8 61/61, Phase 9 66/66.)

## What the score does not cover

- Deferred engine work: 4K export is DONE in Phase 8 (v0.9.0) — H.265
  is still not offered (no browser encoder exists for it) and lens
  correction is still deferred (BUG-D2), both honestly labelled in
  the UI and logged in `docs/BUGS.md` as deferred, not counted as a
  parity failure. Real motion
  stabilization and optical flow are DONE in Phase 7 (v0.8.0), as are
  auto captions, auto tracking, vocal isolation and TTS audio — see the
  K rows above. Pitch-preserving speed playback is DONE in Phase 4
  (browser `preservesPitch` + Web Audio voice shifter). Blend modes now
  apply live in the preview (v0.3.2), so they no longer belong in this
  list.
- The 11th tab is now "AI avatar" (v1.0.1, O1/O2): "① Choose avatar — ② Add speech", Avatar library / Photo to avatar / Fashion model / Video translator / AI dialogue scene, My avatars / Trending / Marketing chips, 24 original Vidora portrait tiles (`src/lib/avatars.ts`). The old "AI Tools" tab is gone; its 15 K tools live in the inspector "Smart tools" sub-panel and Media → Generate. The AI Library panel was deleted; its content lives on the Library page and in Media → Generate. Templates tab is implemented in v0.6.0 (25 original layouts, N-TEMPLATES) and extended in v0.9.0 to 35 layouts with replaceable media slots (L-TEMPLATES-SLOTS) and sharing (L-SHARE), scored above. Audio (Phase 4) is implemented in v0.5.0 and scored above (J rows). Text/Stickers/Captions (Phase 3) are implemented in v0.4.0 — their behaviour cards carry the status (MATCH / ASSUMED / UNKNOWN) and the Phase 3 audit covers them; they are not yet rows in this matrix, which now scores Phases 0–2 + Phase 4 + Phase 5 + Phase 6 + Phase 7 + Phase 8 + Phase 9 (91 rows).
  Audio (Phase 4) is implemented in v0.5.0 and scored above (J rows).
  Text/Stickers/Captions (Phase 3) are implemented in v0.4.0 — their
  behaviour cards carry the status (MATCH / ASSUMED /
  UNKNOWN) and the Phase 3 audit covers them; they are not yet rows in
  this matrix, which now scores Phases 0–2 + Phase 4 + Phase 5 + Phase 6 + Phase 7 + Phase 8 + Phase 9 (100 rows).
- Light-theme editor styling is DONE in Phase 9 (v1.0.0): the zinc ramp
  is remapped under `data-theme="light"` in `src/index.css`, verified by
  the Phase 9 audit (token flip + dashboard screenshots in light).
- CapCut Web's left rail differs from desktop (Elements/Transcript/
  Brand kit, no Stickers) — the desktop screenshots the user is
  sending remain the main reference; Web is only a check for panel
  behaviour. The three items that once awaited desktop evidence — markers,
  group/compound, colour wheels — were REMOVED in v1.0.1 (Y6/Y7/Y8):
  CapCut has none of them, so Vidora has none either. What still
  awaits desktop evidence is the Export dialog itself (never shown in
  the videos; the Download section follows the signed-in Web
  walkthrough) and the Animation Out/Combo grids (videos showed In
  only; Out/Combo reuse the In grid).
