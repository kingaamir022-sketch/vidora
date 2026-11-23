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

- BUG-D1 | Phase 2 → Phase 7 | Colour | DEFERRED — The Stabilize
  toggle is now visible in the Cleanup panel (v0.3.2, matching
  CapCut's Pro toggle) but remains a stored flag only; the UI says the
  real motion stabilization needs whole-clip motion analysis (Phase 7).
- BUG-D2 | Phase 2 → Phase 8 | Colour | DEFERRED — Lens correction
  is a stored flag only; the UI labels it "(deferred)". Needs a
  camera/lens profile (Phase 8). Not found in CapCut Web either.
- BUG-D3 | Phase 2 | Colour | FIXED 2026-11-22 (v0.3.2) — Blend
  modes now apply live in the preview via `drawBlended` in
  `PreviewArea.tsx`; they are no longer deferred. (Was: stored per
  clip and applied only in the full export render.)
- BUG-D4 | Phase 1 → Phase 4 | Speed | DEFERRED — Pitch preservation
  is a stored flag; playback uses browser rate control. The Web Audio
  pitch-preserving path is Phase 4 work; the UI says so. The Pitch
  toggle itself now matches CapCut (v0.3.2, BUG-010).
- BUG-D5 | Phase 1 → Phase 8 | Export | DEFERRED — Export is realtime
  canvas capture only: no audio mix, no 4K, no H.265/VP9 choice, no
  bitrate control, no GIF, no background queue. Stated in the panel
  and in SPEC.md.
- BUG-D6 | Phase 2 → Phase 7 | Speed | DEFERRED — Optical-flow slow
  motion needs a model/GPU path (Phase 7).
- BUG-D7 | Phase 1 → Phase 2 retrofit | Timeline | FIXED 2026-11-22 —
  Audio waveform on timeline clips: implemented in the parity retrofit.
  `probeAudioPeaks` decodes imported audio with `AudioContext` and
  stores 64 normalised peak buckets on the media item
  (`MediaItem.peaks`, optional so old projects still validate);
  `TimelineShell` draws the peaks as white bars inside audio clips.
  Decode failure is tolerated (clip renders without a waveform).
  Unit-tested (`src/test/media.test.ts`).
- BUG-D8 | Phase 3 → Phase 7 | Captions | DEFERRED — Real speech-to-text
  (Whisper) is not in this build: Auto captions times a transcript the
  user pastes (words spread evenly, word-level timing). The panel says
  so; the language picker is a UI choice for now.
- BUG-D9 | Phase 3 → Phase 7 | Motion tracking | DEFERRED — Automatic
  motion detection is not in this build: Vidora has manual track points
  (click the preview at different playhead times). The reference has
  Camera tracking (Pro, Smart tools, follows a selected subject — full
  walkthrough 2026-11-23); the panel says automatic detection is Phase 7.
- BUG-D10 | Phase 3 → Phase 4/7 | Text-to-speech | DEFERRED — Narration
  clips speak during preview only (browser speechSynthesis); rendered
  TTS audio in export needs an offline TTS engine. The panel says so.
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
