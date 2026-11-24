# Vidora — Bugs Log (Rule 12.6, correction loop)

Every difference the self-audit finds goes here first, then gets
fixed, re-audited, and marked FIXED. If the user later writes "this
works differently in the reference", that report is the source of
truth: the behaviour card is updated, a failing test is added, the fix
is made, the audit is re-run, and the entry is logged here.

Format: `BUG-<n> | <phase> | <area> | status | summary`.

## Open

(none — see "Fixed" and "Deferred" below.)

## Fixed

- BUG-001 | Phase 2 retrofit | Left tabs | FIXED 2026-11-22 — Tabs
  Audio, Text, Stickers, Captions, Templates, AI Tools rendered no
  left panel at all (App.tsx only rendered a panel for Media, Effects,
  Filters, Transitions, Adjustment). Fix: added
  `src/components/PlaceholderPanel.tsx`, wired in `App.tsx`; each tab
  now opens a panel that honestly names its phase. Verified in the
  audit (screenshots `audit/phase2/P0-SHELL/`).
- BUG-002 | Phase 2 retrofit | Timeline | FIXED 2026-11-22 — No
  right-click context menu on timeline clips (reference editors all
  have one). Fix: `onContextMenu` on clip elements in
  `TimelineShell.tsx` opens a menu with Split, Duplicate, Copy, Paste,
  Freeze, Reverse, Ripple delete, Delete. Verified in the audit
  (screenshots `audit/phase2/B-EDIT/`).
- BUG-003 | Phase 2 retrofit | Preview | FIXED 2026-11-22 — Transport
  bar had only Play/Pause + seek + timecode; no frame step, loop,
  fullscreen, safe zones or grid. Fix: added −1f/+1f frame-step
  buttons, Loop toggle (playhead driver restarts at 0), Fullscreen
  button, Safe-zones overlay (90% action-safe / 80% title-safe) and
  thirds-grid overlay in `PreviewArea.tsx`. Verified in the audit
  (screenshots `audit/phase2/X-PREVIEW/`).
- BUG-004 | Phase 2 retrofit | Timeline | FIXED 2026-11-22 — Timeline
  clips showed only a name; no thumbnails, although every imported
  media item already carries a probed thumbnail (`MediaItem.thumbnail`,
  `src/lib/media.ts`). Fix: `TimelineShell.tsx` uses the media
  thumbnail as the clip background image when present. Verified in
  the audit (screenshots `audit/phase2/B-TRACKS/`).
- BUG-005 | Phase 2 | Masks | FIXED 2026-11-22 (found by the masks
  test during Phase 2) — Heart-mask polygon points overshot the unit
  square (y up to 1.003). Formula corrected; tests re-run green.
- BUG-006 | Phase 2 retrofit | Timeline | FIXED 2026-11-22 (found by
  the Playwright audit) — The red playhead line spans (ruler, per-track
  and container-level) intercepted pointer events, so a click on the
  centre of a clip under the playhead was blocked. Fix: added
  `pointer-events-none` to the playhead and marker overlay spans in
  `TimelineShell.tsx` (decorative overlays must never intercept
  clicks). Re-audit passed.
- BUG-007 | Correction round v0.3.2 | Shortcuts | FIXED 2026-11-22
  (live CapCut Web check §4) — Ctrl+A selected only the first clip
  on the first track. Fix: `src/lib/timeline.ts` gained `allClipIds`
  and `src/store/projectStore.ts` gained a `selectAllClips` action;
  `src/App.tsx` now calls it. Verified by
  `src/test/shortcuts.test.ts` (Ctrl+A → selectAll, new label) and
  `src/test/timeline.test.ts` (allClipIds across tracks).
- BUG-008 | Correction round v0.3.2 | Timeline | FIXED 2026-11-22
  (live CapCut Web check §1) — Snapping was a 0.25s threshold and the
  toggle was labelled "Snap"; CapCut snaps frame-level (project fps,
  default 30) with a magnet toggle called "Attach", on by default.
  Fix: `src/lib/timeline.ts` gained `frameDuration`/`snapToFrame`/
  `snapTime` (frame quantization + 0.25s magnet to edges/playhead/
  markers); `src/components/TimelineShell.tsx` uses `snapTime` for
  drags and quantizes ruler seeks; the toggle is now "Attach", on by
  default. Verified by `src/test/timeline.test.ts`.
- BUG-009 | Correction round v0.3.2 | Speed | FIXED 2026-11-22 (live
  CapCut Web check §5) — The speed slider stopped at 8× and there was
  no Duration field; CapCut's slider runs 0.1–100× with a numeric
  field and a Duration field (0.05 clamps to 0.10×, 200 clamps to
  100×). Fix: `PropertiesPanel.tsx` Speed section has Normal/Curve
  tabs, a 0.1–100 slider, a Duration field backed by
  `speedForDuration` in `src/lib/timeline.ts`, and the store's
  `setClipDuration` action. Verified by `src/test/timeline.test.ts`.
- BUG-010 | Correction round v0.3.2 | Speed | FIXED 2026-11-22 (live
  CapCut Web check §6) — The Speed panel had only a "Pitch preserved"
  flag and no Smooth slow-mo switch; CapCut has a Pitch on/off
  toggle (disabled at 0.1×/100×) and a Smooth slow-mo switch. Fix:
  `PropertiesPanel.tsx` now shows both toggles (Pitch disabled at the
  extremes); the schema gained `smoothSlowMo` (default false).
  Pitch-preserving playback stays Phase 4 and the UI says so.
  Verified by `src/test/projectSchema.test.ts`.
- BUG-011 | Correction round v0.3.2 | Colour | FIXED 2026-11-22
  (live CapCut Web check §7) — Curve points were add-only; CapCut
  lets you drag points and offers presets (Custom, Lighten, Darken,
  Fade, Contrast, Cool tone, Warm tone, Vintage). Fix:
  `src/lib/color.ts` gained `moveCurvePoint` (clamped between
  neighbours) and `curvePreset`/`CURVE_PRESETS`; `ColorPanel.tsx`
  wires pointer drag on the SVG circles and renders preset buttons.
  Verified by `src/test/color.test.ts`.
- BUG-012 | Correction round v0.3.2 | Colour | FIXED 2026-11-22
  (live CapCut Web check §8) — Blend mode was export-only; CapCut's
  Blend dropdown applies live in the preview (plus opacity). Fix:
  `src/components/PreviewArea.tsx` gained a `drawBlended` helper
  that wraps every clip draw with
  `globalCompositeOperation = canvasBlendMode(clip.adjustment.blendMode)`;
  `src/lib/color.ts` gained `canvasBlendMode` (Linear burn omitted —
  no canvas equivalent) and the schema now accepts `color-burn` /
  `color-dodge`; the Blend dropdown lists CapCut's modes and the
  panel explains opacity lives under Transform. Verified by
  `src/test/color.test.ts` and `src/test/projectSchema.test.ts`.
- BUG-013 | Correction round v0.3.2 | Colour | FIXED 2026-11-22
  (live CapCut Web check §9) — The Cleanup panel called denoise
  "Denoise" and stabilization "(deferred)"; CapCut calls denoise
  "Reduce image noise" (Free) and shows a "Stabilize" toggle (Pro).
  Fix: `ColorPanel.tsx` renames the slider to "Reduce image noise"
  and the checkbox to "Stabilize"; the real motion engine stays
  Phase 7 and the UI says so (BUG-D1 unchanged). Lens correction was
  not found in CapCut Web either, so its note now says that too.
- BUG-P3-001 | Phase 3 | Timeline | FIXED 2026-11-23 — Overlay clips
  (text, sticker, shape, drawing) all landed on the first text track
  at the playhead, so clips added at the same time stacked on top of
  each other and the covered ones could not be clicked to select (the
  Phase 3 audit crashed trying to re-select the text clip under the
  drawing clip). Fix: `addClipToTextTrack` moved to `src/lib/timeline.ts`
  as a pure function — it now picks the first unlocked text track where
  the clip's time range does not overlap an existing clip, and opens a
  new text track otherwise (CapCut puts overlays on their own tracks).
  Unit-tested (4 new tests in `src/test/timeline.test.ts`); re-audited
  31/31 with the text clip selectable again.
- BUG-P3-002 (audit harness, not an app bug) | Phase 3 | Audit | FIXED
  2026-11-23 — The Phase 3 audit's `seekRuler` assumed 36px per second
  and never scrolled the ruler into view: after clicking clips on low
  tracks the timeline container had scrolled, the ruler was out of
  view, and the seek clicks missed — so the playhead stayed at 0s and
  the split-cue check failed (2 → 2). Fix: the audit now scrolls the
  ruler into view first and reads the live zoom from the zoom slider
  (default 24px/s — the Phase 2 audit's 36px guess only passed because
  its check accepted any 00:00:01:xx timecode). Re-run: split works
  (2 → 3), transcript word-click genuinely seeks (02:00 → 00:00).

## Deferred (not bugs — scheduled engine work, honestly labelled in the UI)

- BUG-D2 | Phase 2 → Phase 8 | Colour | DEFERRED — Lens correction
  is a stored flag only; the UI labels it "(deferred)". Needs a
  camera/lens profile (Phase 8). Not found in CapCut Web either.
- BUG-D3 | Phase 2 | Colour | FIXED 2026-11-22 (v0.3.2) — Blend
  modes now apply live in the preview via `drawBlended` in
  `PreviewArea.tsx`; they are no longer deferred. (Was: stored per
  clip and applied only in the full export render.)
- BUG-D4 | Phase 1 → Phase 4 | Speed | FIXED 2026-11-23 (v0.5.0) —
  Pitch preservation is real now: the engine sets `preservesPitch` on
  every media element (browser pitch-preserving rate control, the same
  mechanism the reference uses) and the Web Audio modulated-delay pitch
  shifter drives the voice-changer presets. The Speed section note now
  describes the real behaviour. Verified by the Phase 4 audit
  (J-PITCH, 31/31) and `src/test/audio.test.ts`.
- BUG-P4-001 | Phase 4 | Voiceover | FIXED 2026-11-23 (found during
  the build, before the audit) — A recorded voiceover could silently
  vanish: MediaRecorder webm often has no finite duration in a plain
  audio element, so `probeAudio` returned `duration: undefined` and
  `addVoiceoverClip` returned early with no clip and no message. Fix:
  the store action takes the recorded seconds as a fallback
  (`addVoiceoverClip(blob, name, durationSeconds)`) and the panel
  passes the timer value; the clip is never dropped. Also: very short
  recordings now show "Recording too short — nothing saved." instead
  of failing silently. Verified by the Phase 4 audit (J-VOICEOVER,
  fake media device, 31/31).
- BUG-P4-002 (audit harness, not an app bug) | Phase 4 | Audit | FIXED
  2026-11-23 — The Phase 4 audit read the markers baseline while a
  clip was still selected, so the Properties summary (which only shows
  the marker count with no clip selected) was not visible and the
  baseline read −1. Fix: the baseline is now read in the no-clip
  (mixer) state, where it is 0 in a new project. Audit re-ran 31/31
  PASS after the fix.
- BUG-P4-003 | Phase 4 | Speed note | FIXED 2026-11-23 (found during
  the build, before the audit) — The Speed-section note said "Pitch is
  kept by the Web Audio pitch shifter", which is wrong: pitch at
  changed speed is kept by the browser's native `preservesPitch`
  playback; the Web Audio shifter is only used for voice-changer
  presets. Fix: the note now says so plainly (J-PITCH card updated
  the same way). Verified by the Phase 4 audit (J-PITCH checks the
  corrected note text).
- BUG-P5-001 | Phase 5 | Preview compositing | FIXED 2026-11-23
  (found during the build, before the audit) — In normal (non-split /
  non-PiP) mode the preview drew ONLY the last visible clip, so a
  text or sticker overlay on the text track HID the video underneath
  (a template's video slot + title showed the title on black). Fix:
  `PreviewArea.tsx` now composites ALL visible clips bottom-to-top —
  Backgrounds clips first, then the base video/image clip (with its
  transition-in, using base-local time), then text/sticker overlays —
  and a background clip renders full-frame via `renderBackgroundFrame`.
  Verified by the Phase 5 audit (BUG-P5-001 pixel check: 24,569
  colourful video pixels under the text + 3,457 near-white text
  pixels, `audit/phase5/N-GLSL/video-plus-text.png`).
- BUG-P6-001 | Phase 6 | AI clips | FIXED 2026-11-23 (found in the
  pilot quality review) — The 5 variants of one scene looked nearly
  identical (same palette, same motion direction). Fix: each variant
  now gets a per-seed palette hue jitter (±22°) in `render_clips.py`
  so variants are visually distinct; verified in the pilot re-review
  (frames at t=0.5 vs t=3.0 differ, scenes distinct).
- BUG-P6-002 | Phase 6 | AI clips | FIXED 2026-11-23 (found in the
  pilot quality review) — Sunrise scene was washed out: pale sky, sun
  barely visible. Fix: darker sky gradient + a solid sun disc on the
  horizon in `painters.py`; verified in the pilot re-review.
- BUG-P6-003 | Phase 6 | Generation pipeline | FIXED 2026-11-23
  (found during generation) — 15 s tracks at 120 BPM are not
  bar-aligned (7.5 bars), so a "loopable" track would click on repeat.
  Fix: `make_prompts.py` falls back to 96 BPM when a style's BPM does
  not divide the duration; verified by `phase6.test.ts`
  (bar-alignment check on all 100 tracks).
- BUG-P6-004 | Phase 6 | Generation pipeline | FIXED 2026-11-23
  (found during the pilot) — `random.Random.randint` has no `size`
  kwarg (noise-grain crashed on the first texture); and the renderers'
  `--only` runs OVERWROTE `generation/state.json`, losing entries.
  Fix: grain uses a numpy RandomState; all four renderers merge state
  by id (`_merge_state`).
- BUG-P6-005 | Phase 6 | AI music | FIXED 2026-11-23 (found by the
  quality filter after the full render) — ALL 8 Acoustic + ALL 8 Jazz
  tracks failed the silence check (11–15% of samples below −60 dBFS,
  longest gap only ~190 ms — micro-gaps between decaying tones, not
  dead air). Cause: both styles had `pad: False` + `arp: False`, so
  nothing sounded continuously between sparse melody notes. Fix: pad
  bed enabled for Acoustic + Jazz in `generation/make_prompts.py`
  (prompts regenerated — diff confirms only the 16 `pad` flips);
  silence now 4–5%. The in-browser fallback renders the same pattern,
  so it matches the MP3s.
- BUG-P6-006 | Phase 6 | AI music | FIXED 2026-11-23 (found by the
  quality filter) — ALL 8 Jazz tracks failed BPM detection (estimator
  read 127.7 or 63.8 instead of 96 — ratios 4/3, 2/3). Cause: the
  syncopated "break" kicks at steps 0/7/10 make 3-step onset intervals
  dominate the autocorrelation; the beat lag (62) trailed the winner
  by 3%. Fix: accented hats on every beat were NOT enough (kicks
  dominate onsets) — soft kicks added on beats 2/3/4, gain 0.4
  (measured: 0.3 still fails, 0.4 passes at 96.8). Same change mirrored
  in the TS fallback (`src/lib/audio.ts`).
- BUG-P6-007 | Phase 6 | AI SFX | FIXED 2026-11-23 (found by the
  quality filter) — 6 SFX decoded from MP3 at peak 1.00–1.06 (clipping)
  although the float mix was normalized to 0.89: MP3 encoding overshoots
  sharp transients by up to ~19%. Fix: SFX normalized to peak 0.80 in
  `generation/render_sfx.py`; all 100 SFX re-rendered, filter passes.
- BUG-P6-008 | Phase 6 | AI clips | FIXED 2026-11-23 (found by the
  quality filter) — ALL 10 "pulse" clips (Grid 061–065, Bloom 096–100)
  showed no motion (frame diff 0.01–0.04): the pulse motion graph used
  a STATIC crop — only the overlay drifted. Fix: the crop now
  oscillates (±48 px x, ±27 px y over the 6 s cycle) in
  `generation/render_clips.py`; 10 clips re-rendered, filter passes.
- BUG-P6-009 | Phase 6 | AI images | FIXED 2026-11-23 (found by the
  quality filter) — Both vignette frames (ai-frame-05, ai-frame-15)
  failed the transparent+opaque check. Cause (two layers): the mask
  fill was 170, so no pixel reached alpha 255 — fixed to 255 — and
  then GaussianBlur darkened the canvas edge to 245 anyway. Fix: a
  solid 12 px rim drawn at the edge after the paste (visually the
  darkest part of the vignette); frames re-rendered, filter passes.
- BUG-P6-010 | Phase 6 | Build tooling | FIXED 2026-11-23 (found by
  `npm run build:assets`) — Two Phase 6 edits broke the asset build:
  (1) a `\\'` escape in the provenance string in
  `scripts/build-assets.mjs` (SyntaxError); (2) `src/lib/aiLibrary.ts`
  imported `assets/ai-manifest.json` without an import attribute, which
  Node 24 type-stripping rejects (`ERR_IMPORT_ATTRIBUTE_MISSING`).
  Fix: double-quoted string; `with { type: 'json' }` on the import
  (valid for Vite too). `build:assets` passes (1,089 entries).
- BUG-D5 | Phase 1 → Phase 8 | Export | FIXED 2026-11-24 (v0.9.0) —
  Full offline export is real: `src/lib/exportEngine.ts` renders frame
  by frame through the shared compositor (`renderTimelineFrame`) and
  encodes with mediabunny (WebCodecs) — MP4/MOV (H.264 + AAC) or WebM
  (VP9/VP8 + Opus), 360p–4K, 24/25/30/50/60 fps, quality tiers with
  real bitrates, plus the audio mix (OfflineAudioContext 48 kHz:
  volume, fades, keyframed volume, ducking, mute/solo, master, 3-band
  EQ, 120 Hz highpass) — rendered narration/TTS WAVs now export too.
  Audio-only WAV, GIF (10 fps, 320 px, first 30 s), PNG image sequence
  and cover frame are real exports, and a background queue (one job at
  a time, cancel, re-run, re-download) runs in `src/lib/exportQueue.ts`.
  Honest limits that stay: no H.265 (no browser encoder exists), no
  MP3 (audio-only is WAV), voice-changer presets are preview-only,
  reversed clips are silent as in preview. Verified by 23 Phase 8
  unit tests and the Phase 8 audit (real MP4/WebM file ffprobed:
  h264/vp9 + aac/opus, duration ≈ project).
- BUG-D7 | Phase 1 → Phase 2 retrofit | Timeline | FIXED 2026-11-22 —
  Audio waveform on timeline clips: implemented in the parity retrofit.
  `probeAudioPeaks` decodes imported audio with `AudioContext` and
  stores 64 normalised peak buckets on the media item
  (`MediaItem.peaks`, optional so old projects still validate);
  `TimelineShell` draws the peaks as white bars inside audio clips.
  Decode failure is tolerated (clip renders without a waveform).
  Unit-tested (`src/test/media.test.ts`).
- BUG-D11 | Phase 3 | Captions | DEFERRED — .ass caption files are not
  imported (no parser in this build); .srt/.vtt import and export work.
  The panel says so plainly.
- BUG-P3-003 | Phase 3 audit harness | FIXED 2026-11-23 (main-agent
  verification) — `npm run audit:phase3` crashed on a fresh machine:
  it wrote its SRT fixture into /tmp/audit-media without creating the
  directory, and it needed a test.mp4 that only existed because an
  earlier run had left one in /tmp (wiped by the service restart).
  Fix: the script now creates /tmp/audit-media itself and regenerates
  test.mp4 with ffmpeg (2s test pattern) when missing. Audit re-ran
  31/31 PASS after the fix.
- BUG-D1 | Phase 2 → Phase 7 | Colour | FIXED 2026-11-24 (v0.8.0) —
  Real translation-only stabilization: radix-2 FFT phase correlation
  on sampled frames gives a per-frame camera translation, the
  trajectory is low-pass smoothed, and the inverse translation is
  applied in the preview (zoom-in hides the borders). Honest scope:
  rotation, scale and rolling-shutter wobble are NOT corrected and the
  panel says so. Verified by `src/test/phase7.test.ts` (FFT round-trip,
  phase correlation recovers a known +5/+3 shift, growing camera path)
  and `npm run audit:phase7` 61/61 (shaky fixture analysed, toggle on).
- BUG-D6 | Phase 2 → Phase 7 | Speed | FIXED 2026-11-24 (v0.8.0) —
  Real optical-flow slow motion: block-matching motion estimation
  (16×16 blocks, sum-of-absolute-differences search) + motion-
  compensated warp renders a new 2× frame-rate copy. Honest scope:
  it is block matching, not a neural flow model; fast/complex motion
  can smear, and the preview slow-mo itself stays frame-blend (the
  panel says so). Verified by phase7 tests (translating-square midpoint
  + motion-vector direction) and the Phase 7 audit (rendered copy
  lands on the timeline).
- BUG-D8 | Phase 3 → Phase 7 | Captions | FIXED 2026-11-24 (v0.8.0) —
  Real speech-to-text now exists in two honest paths: in-app dictation
  via browser speech recognition (microphone — the browser cannot
  listen to a clip file, and the panel says so) and the offline Vosk
  pipeline `tools/transcribe.py` (vosk-model-small-en-us-0.15,
  Apache-2.0, CPU-only) that transcribes a file to word-timed SRT +
  `.words.json`, importable with the existing SRT import. Honest scope:
  Whisper itself is NOT used — Vosk small model instead (it hears
  "Vidora" as "vid aura"; the pipeline loop test avoids that word).
  The pasted-transcript path remains. Verified by the Piper→Vosk loop
  test (`tools/test_pipeline.sh` → "PIPELINE LOOP OK") and the Phase 7
  audit (both paths named in the panel).
- BUG-D9 | Phase 3 → Phase 7 | Motion tracking | FIXED 2026-11-24
  (v0.8.0) — Automatic tracking: normalised cross-correlation template
  matching follows the subject frame by frame from one click (or the
  frame centre) and writes the same `tracking.points` the manual tool
  uses, so points stay editable by hand. Honest scope: fast motion,
  occlusion or a changing shape can lose the lock — points stop at the
  last good match and the panel says at which time. Verified by phase7
  tests (dot tracked across 5 frames) and the Phase 7 audit (Track
  button correctly disabled until a target clip is chosen).
- BUG-D10 | Phase 3 → Phase 4/7 | Text-to-speech | FIXED 2026-11-24
  (v0.8.0, partial — see D5) — Real TTS audio now exists: the offline
  Piper pipeline `tools/narrate.py` (en_US-lessac-medium, CC-BY,
  22050 Hz WAV) renders narration to a real audio clip on the timeline
  (volume, fades, EQ, ducking all work). The remaining gap closed in
  v0.9.0: BUG-D5 is fixed, so the rendered WAV now exports with the
  audio mix. Fully fixed as of Phase 8.
- BUG-D12 | Phase 4 → Phase 7 | Audio | FIXED 2026-11-24 (v0.8.0) —
  Real vocal isolation: centre-channel (mid/side) separation — "Isolate
  voice" renders the mid stem, "Remove voice" renders the side stem,
  both as new WAV audio clips. Honest scope: this is the standard
  karaoke/centre-extraction technique, NOT ML stem separation; it works
  best on centre-panned vocals and the panel says so. Verified by
  phase7 tests (centre 440 Hz vs side 880 Hz split exactly) and the
  Phase 7 audit (voice stem renders as a new clip).
- BUG-P7-001 | Phase 7 | Stabilization | FIXED 2026-11-24 — The
  phase-correlation cross-power spectrum used Fa·conj(Fb), which peaks
  at the NEGATIVE shift (test: expected +5, got −5). Fix: conj(Fa)·Fb
  (see the comment in `phaseCorrelation`); the returned (dx, dy) is now
  the shift of B's content relative to A. Unit-tested.
- BUG-P7-002 | Phase 7 | Stabilization | FIXED 2026-11-24 — The
  correlation peak was divided by n a second time (`best / n`) even
  though the inverse FFT already scales by 1/n, so the peak read
  ~0.0005 and fell below the 0.05 motion threshold — stabilization
  never detected any motion. Fix: return `best` directly (peak 0.96 on
  the dot-pattern test). Unit-tested.
- BUG-P7-003 | Phase 7 | Stabilization | FIXED 2026-11-24 — The
  compositor drew the stabilized frame with `sx + dx`, which shifts
  the image the WRONG way: moving the image right by c means the source
  window must start c to the LEFT. Fix: `sx - dx` / `sy - dy` with the
  geometry noted in the comment.
- BUG-P7-004 | Phase 7 | Stabilization | FIXED 2026-11-24 — The
  panel's "average shake" was the mean |path| (distance from frame 0),
  so a smooth pan read as huge shake. Fix: mean |raw − smoothed|
  deviation — a smooth pan now correctly reads ~0 shake.
- BUG-P7-005 | Phase 7 audit harness | FIXED 2026-11-24 — The audit
  expected 0–100 values on the Enhance sliders (range is 0–1) and a
  3-clip script project (3 scenes build 3 image clips + 3 text overlays
  = 6 clips; narration is a TTS flag on the text clips, not a separate
  audio clip). Fixed the audit expectations; the app was correct.
- BUG-P7-006 | Phase 7 audit harness | FIXED 2026-11-24 — The
  Stabilize and Remove-background checkboxes had no `id`, so the audit
  could not address them. Added `id="ai-stabilize"` and
  `id="ai-bgremove"` to `AIToolsPanel.tsx`.
- BUG-P7-007 | Phase 7 behaviour card | FIXED 2026-11-24 — K-STT.md
  said the in-app path was "browser speech recognition on the selected
  clip" — wrong: `webkitSpeechRecognition` is microphone-based only and
  cannot listen to a clip file. Card corrected: dictation (mic) +
  the Vosk script for file transcription; the panel already said this
  plainly.
- BUG-P8-001 | Phase 8 | Export queue | FIXED 2026-11-24 — The first
  export job never left "queued": `loadJobs()` only set its
  `interruptedMarked` flag after the empty-storage early returns, so on
  a fresh session the flag stayed false until the first load AFTER a job
  was saved — and that load flipped the fresh job to "interrupted", so
  `runQueue` found no queued job and returned. Found by the Phase 8
  audit (job sat "queued" for 10 minutes) and a focused Playwright
  probe with temporary console logging. Fix: mark the first load at
  function entry in `loadJobs()` (an empty store still counts as a
  load). The probe file was deleted after use.
- BUG-P8-002 | Phase 8 | Export | FIXED 2026-11-24 — 480p export of a
  16:9 project failed in the encoder: `exportSizeFor` computed
  853x480 and H.264 (YUV 4:2:0) rejects odd dimensions ("both width
  and height must be even numbers"). Found by the Phase 8 audit
  (ffprobe never ran — the job failed first). Fix: round both sides
  to even numbers in `exportSizeFor` (16:9 at 480p is now 854x480);
  covers video, GIF, frames and cover exports, which all use it.
  Regression-tested (all resolutions, landscape + portrait, even).
- BUG-P8-003 | Phase 8 | Export audio | FIXED 2026-11-24 — The
  audio-only WAV read as twice its real length (ffprobe: 12.00 s for
  a 6 s project). Cause: `encodeWav` always wrote a MONO header, but
  `exportAudioWav` feeds it interleaved STEREO samples, so the data
  was 2x what the header described. Fix: `encodeWav(samples,
  sampleRate, channels = 1)` writes the real channel count, byte rate
  and block align; the export passes 2. Mono callers (music/SFX
  renderers, AI Tools) are unchanged by the default. Regression test
  reads the stereo header bytes back.
- BUG-P8-004 | Phase 8 | Export render | FIXED 2026-11-24 — The
  exported video's first frame was black even though the media was
  fine. Cause: `seekVideoForFrame` only waits for 'seeked' when the
  target differs from the element's current time — at frame 0 the
  target IS the initial currentTime, so no seek was issued and the
  function returned before any frame was decoded. Fix: after
  metadata loads, wait for 'loadeddata' (first frame available) when
  readyState is still below 2. Also fixed the warning precision in
  the same pass: the "rendered as a label" warning used to fire if a
  clip was skipped on ANY frame (one loading frame was enough); it
  now counts skips and warns only when a clip is missing for more
  than 10% of frames. Verified by extracting frame 0 from the
  exported MP4 (black before, real video after) in the Phase 8 audit.
- BUG-P8-005 | Phase 8 | Export dialog | FIXED 2026-11-24 — Once the
  export queue grew, the dialog's tabs at the top became unclickable:
  the overlay used flex `items-center` (vertical centering) with
  `overflow-y-auto`, and when the panel grew taller than the viewport
  the top overflowed above the screen and could not be scrolled to
  (the classic flex-centering overflow trap). Found by the Phase 8
  audit (the 'Share for review' tab click timed out twice). Fix:
  `items-start` so the panel starts at the top and scrolls normally.
  (ShortcutsPanel uses the same centering but its content is short
  and has no scroll container, so it is unaffected.)
