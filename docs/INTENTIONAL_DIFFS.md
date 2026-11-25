# Vidora — Intentional Diffs

> **User rule (2026-11-25 ~16:31 PKT, SUPERSEDES the old Rule 12.3 MUST
> DIFFER list):** "bas name ur logo CapCut ka nhi laga na, baki har ek
> chize CapCut wali hi rakhni thi" — ONLY the app name and logo stay
> original (Vidora). EVERYTHING ELSE must be exactly CapCut's. The old
> MUST DIFFER list (palette, icons, fonts, content) is void. What used
> to be listed there was fixed in the v1.0.1 correction round
> (`docs/CAPCUT-FIX-2026-11-25.md`): teal `#00D9D9` accent, near-black
> surfaces `#0A0A0A`–`#242424`, system sans UI font (Inter kept as the
> closest open equivalent — see below), horizontal tab rail, 610px left
> area, ~520px right panel, icon-only timeline toolbar, CapCut's
> shortcuts, menus, dialogs and settings.
>
> Where a CapCut item is copyrighted artwork, a brand, a character or
> music, Vidora puts an equivalent ORIGINAL item in the same slot with
> the same behaviour — never CapCut's artwork, logos, characters or
> music. Those equivalents are listed under "Original content in
> CapCut's slots" below; each one is deliberate, and none of them is a
> parity bug.

## MUST MATCH

- Panel positions and proportions: top bar 48px, horizontal tab rail
  ~64px above the left column, left area ~610px (sub-nav ~185px +
  content ~400px), centre preview, right panel ~520px, timeline
  ~288px with a ~50px icon-only toolbar.
- Tab order: Media, Audio, Text, Stickers, Effects, Transitions,
  Captions, Filters, Adjustment, Templates, AI avatar (11th).
- Control types and order inside every panel (buttons, sliders,
  selects, number inputs, checkboxes, in the order CapCut shows them).
- Value ranges and defaults: speed 0.1×–100×, opacity 0–100, scale
  100% default, position X/Y 0, rotate 0.00°, volume, keyframe/easing
  behaviour, transition durations, LUT intensity, colour sliders
  (Contrast, Highlight, Shadow, Whites, Blacks, Brilliance — all 0).
- Timeline behaviour: frame-level snapping (project fps, default 30),
  Attach magnet toggle, zoom slider, drag to move, drag edges to trim,
  mute + link per track header. No markers, no group/compound, no
  lock/hide buttons (removed in v1.0.1 — CapCut has none).
- Preview behaviour: play/pause, seek, frame step, timecode
  `HH:MM:SS:FF`, Full / fit / Ratio / fullscreen, floating toolbar
  (Edit with AI, Crop, Auto reframe, CC, Smart tools, …).
- Details panel rows in CapCut's order: Name / Path / Color space
  (Rec. 709 SDR) / Imported media (Stay in original location) /
  Arrange layers / Proxy (Turned off) / Aspect ratio / Resolution /
  Modify.
- Inspector: vertical icon rail Basic / Background / Smart tools /
  Audio / Animation / Speed + Close; one sub-panel at a time.
  Animation In categories Trending, Basic, Light, Glitch, Mask, 3D,
  Vibration; first tile always None.
- Shortcuts in CapCut's order: Select all (Ctrl+A), Copy (Ctrl+C),
  Cut (Ctrl+X), Paste (Ctrl+V), Delete (Backspace), Undo (Ctrl+Z),
  Redo (Ctrl+Shift+Z), Play/pause (Space), Split (Ctrl+B), Zoom in
  (Ctrl+=), Zoom out (Ctrl+-), Last frame (Ctrl+Left), Next frame
  (Ctrl+Right), Preview axis (S), Attach (N), Separate audio
  (Ctrl+Shift+S), Full screen (Ctrl+Shift+F), Hand tool (H), Move (V),
  Zoom to fit (Shift+F). There is NO marker shortcut and NO duplicate
  shortcut.
- Context menu (right-click a timeline clip) in CapCut's order:
  Split, Copy, Cut, Paste, Duplicate, Delete, Replace, Download clip,
  Transcript-based editing, Separate audio, Split scene, Freeze,
  Crop, Flip, Overlay, Add overlay.
- Export: menu Download / Share for review / Share as presentation /
  Share on social; Download offers 360p–4K, Quality High /
  Recommended / Fast, 24/25/30/50/60 fps, MP4/WebM/MOV, plus audio-only
  WAV, animated GIF, PNG image sequence and cover frame, and an export
  queue.
- Settings sections in order: General (Automatic updates, ON),
  Language, Theme, Input preferences, Task bar, Sidebar, Feature
  usage.
- Workflow step counts: import → add to timeline → select → adjust →
  export; split = select clip, move playhead, Ctrl+B.
- Empty / loading / error states: empty preview ("Click to upload /
  Or drag and drop file here"), empty media list (Import drop zone),
  empty timeline ("Drag material here and start to create").

## MUST DIFFER (only these two)

- App name: **Vidora** (never CapCut's name). The name appears in the
  top bar, the dashboard, the document title and the export file
  names.
- Logo: original rounded-square play triangle with a split/cut line,
  violet `#7C3AED` → cyan `#06B6D4` gradient (`public/logo.svg`).

## Original content in CapCut's slots (same slot, same behaviour, original artwork)

These are the only places Vidora's content differs from CapCut's, and
each exists because the CapCut original is copyrighted, a brand, or a
person's likeness. The slot, layout, behaviour and counts match
CapCut; only the artwork/names are Vidora's own.

- **Effect / transition / sticker / filter / template names and
  artwork** — Vidora Originals throughout (e.g. filters "Vidora
  Warm", "Golden Hour"; text styles "Bold Title", "Retro Stamp";
  stickers are original smiley/face renders; templates are 35
  original layouts). Categories, order and behaviour match CapCut.
- **Music, SFX, AI tracks and clips** — all Vidora Originals:
  synthesized in the browser or procedurally rendered locally
  (`src/lib/audio.ts`, `src/lib/aiLibrary.ts`). No CapCut music, no
  licensed songs.
- **AI avatar portraits** — 24 original stylised portrait tiles
  (gradient + person silhouette, `src/lib/avatars.ts`). CapCut shows
  photos of people; Vidora ships no photos, so the same slot holds an
  original portrait render with the same behaviour (pick → add speech
  → narration clip).
- **AI images / textures / frames / stickers / backgrounds** —
  procedural originals (`src/lib/aiLibrary.ts`, `src/lib/backgrounds.ts`).
- **Voices** — 16 Vidora voice presets (browser speech synthesis);
  voice names are Vidora's own.
- **Fonts** — CapCut's exact UI font is proprietary. Vidora uses the
  system sans stack (Segoe UI on Windows) with Inter as the closest
  open equivalent for the editor chrome; the 40 bundled text fonts
  are SIL OFL / Apache open-license families (`src/lib/fonts.ts`).
- **Template / effect thumbnails** — gradient/placeholder renders, not
  CapCut's preview frames.
- **Sample project** — "Sunset Coast — Sample Project" is Vidora's
  own demo content (no real media; the clip renders a name
  placeholder in the preview).
- **Home promo cards and AI-tool copy** — Vidora's own wording
  ("Create. Cut. Shine.", "AI-powered creative suite", "Vidora
  Originals"). The layout, card counts and destinations match CapCut
  (6 AI tiles, 4 carousel cards).
- **"Pro" slot** — the Pro button and ◆ badges stay where CapCut has
  them, but Vidora has no paid tier: the UI says so honestly
  ("Included in this build — nothing is charged", "Pro is not
  available in this build. Nothing is charged."). No plans UI, no
  payment provider.

## Removed in v1.0.1 (Vidora-only extras CapCut lacks — Y1–Y14)

Listed here, not deleted silently. Each was removed in the
2026-11-25 correction round (`docs/CAPCUT-FIX-2026-11-25.md` §Y).

- Y1 OnboardingTour (5-step first-run tour) — replaced by the Terms
  + Updates dialogs.
- Y2 UserGuideDialog (10-step user guide) — replaced by the Help
  Center view.
- Y3 Local auth (`lib/auth.ts`, AccountPanel, sign-in / create
  account, OWNER/CUSTOMER roles, read-only gate).
- Y4 Subscription (`lib/subscription.ts` + plans list).
- Y5 Telemetry (`lib/telemetry.ts`, Diagnostics in Settings,
  `window.onerror` → logError).
- Y6 Markers UI (M shortcut, ruler markers, "Markers: N" summary).
  The `markers` field stays in the project schema so old files keep
  loading; nothing writes it and no UI shows it.
- Y7 Group / Ungroup / Compound clips (toolbar, context menu,
  shortcuts).
- Y8 Colour wheels (lift/gamma/gain) — sliders + curves stay.
- Y9 Dashboard header theme toggle.
- Y10 "AI Tools" tab — reshaped into the "AI avatar" tab (11th
  position); the K tools moved to the inspector Smart tools
  sub-panel and Media → Generate.
- Y11 Dashboard "Backups" card — moved to the Spaces page.
- Y12 Export dialog as the primary export UI — replaced by the
  Export menu; the Download settings panel keeps the same options.
- Y13 Timeline footer bar (hints, track count).
- Y14 Track-header lock/hide buttons.

## What is NOT an intentional diff

- Anything in MUST MATCH above that Vidora does differently is a
  parity bug: log it in `docs/BUGS.md`, fix it, re-run the audit.
- Honest-limitation notes in the UI (e.g. "no H.265 encoder in any
  browser", "Vosk/Piper models are not served from Pages", "Combo
  presets are saved with the clip; the compositor does not evaluate
  them yet") are not diffs — they describe what the build can and
  cannot do, in CapCut's own slots.
