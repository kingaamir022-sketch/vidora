# Vidora — Intentional Diffs (Rule 12.3)

What MUST match the reference (CapCut desktop / standard professional
editors) and what MUST differ. Anything in the MUST DIFFER list is
never a parity bug. Anything in the MUST MATCH list is judged in
`docs/PARITY.md`.

## MUST MATCH

- Panel positions and proportions (see `docs/UI_LAYOUT.md`): top bar,
  left tab rail, left panel, centre preview, right properties,
  bottom timeline.
- Tab order: Media, Audio, Text, Stickers, Effects, Transitions,
  Captions, Filters, Adjustment, Templates, AI Tools.
- Control types and order inside every panel (buttons, sliders,
  selects, number inputs, checkboxes, in the order the reference
  shows them).
- Value ranges and defaults: speed 0.1×–100×, opacity 0–1,
  scale 0.05–10, rotation −360°–360°, position ±100%, volume 0–2,
  keyframe/easing behaviour, transition durations, LUT intensity 0–1,
  colour sliders (see the behaviour cards for the exact numbers).
- Timeline behaviour: frame-level snapping (project fps, default
  30), Attach magnet toggle (on by default), ripple, zoom 8–120 px/s,
  drag to move, drag edges to trim, lock/hide/mute per track. (Markers
  and group/compound are Vidora extras the spec requires — see MUST
  DIFFER.)
- Preview behaviour: play/pause, seek, frame step, loop, fullscreen,
  safe zones, thirds grid, timecode `HH:MM:SS:FF`.
- Properties layout per clip type (video / image / audio / text).
- Shortcuts: Space play/pause, S split, M marker, Ctrl+Z / Ctrl+Shift+Z
  undo/redo, Ctrl+D duplicate, Ctrl+C / Ctrl+V copy/paste, Delete,
  Shift+Delete ripple delete, Ctrl+A select all clips on all tracks.
- Speed: slider 0.1×–100× + numeric field + Duration field; clamps
  0.05→0.10×, 200→100×; Pitch toggle (disabled at 0.1×/100×) + Smooth
  slow-mo switch.
- Curves: points can be added AND dragged; presets Custom, Lighten,
  Darken, Fade, Contrast, Cool tone, Warm tone, Vintage.
- Blend: live in the preview, dropdown Normal, Overlay, Screen,
  Darken, Brighten, Hard light, Multiply, Soft light, Color burn,
  Color dodge (+ opacity via Transform → Opacity). Linear burn is not
  offered — it has no canvas equivalent.
- Context menus (right-click a timeline clip): Split, Duplicate, Copy,
  Paste, Freeze, Reverse, Ripple delete, Delete.
- Export options: 480p / 720p / 1080p, 24 / 30 / 60 fps, WebM / MP4.
- Workflow step counts: e.g. import → add to timeline → select →
  adjust → export; split = select clip, move playhead, press S.
- Empty / loading / error states: empty preview message, empty media
  list, empty timeline message, "No keyframes yet", broken .cube file
  error, unsupported-export error.

## MUST DIFFER

- App name: **Vidora** (never the reference app's name).
- Logo: original rounded-square play triangle with a split/cut line,
  violet `#7C3AED` → cyan `#06B6D4` gradient (`public/logo.svg`).
- Icons: original SVG icon set (`src/components/icons.tsx`) — no
  copied or look-alike reference icons.
- Colour palette: Vidora violet/cyan on zinc-950 dark theme
  (`design/tokens.json`); never the reference's palette.
- Illustrations, splash screen and wordmark: original Vidora artwork.
- UI fonts: Inter / system sans (see `design/tokens.json`); the
  reference's UI font is not used.
- All content: templates, music, effects, stickers, LUT looks,
  caption styles — every item is original or procedurally generated
  in Vidora (see `LICENSES/PROVENANCE.md`). No reference templates,
  songs, stickers or effect names are copied.
- Sample project: the built-in "Sunset Coast — Sample Project" is
  original placeholder content, not reference demo media.
- Markers (B-MARKER): CapCut Web has NO markers — Vidora keeps them
  because the master spec requires them. Await the user's desktop
  screenshots before changing anything here.
- Group / compound clips (B-GROUP): CapCut Web has NO group/compound
  (right-click offers Copy/Cut/Paste/Duplicate/Delete/Download only;
  Ctrl+G does nothing) — Vidora keeps them because the master spec
  requires them. Await the user's desktop screenshots.
- Colour wheels (F-WHEELS): CapCut Web has NO lift/gamma/gain wheels
  (sliders only) — Vidora keeps the wheels because the master spec
  requires them.

## Out of scope for Phases 0–2 (not parity bugs yet)

Audio mixer, text/stickers/captions tools, templates, AI tools,
cloud sync, version history, auth, 4K/H.265/VP9 export, background
export queue, optical-flow slow motion, pitch-preserving audio,
stabilization engine, lens-correction engine, full light-theme
styling. These are listed as PENDING in `SPEC.md` with their phase;
their tabs open an honest placeholder panel that names the phase.
