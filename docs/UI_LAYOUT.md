# Vidora — UI Layout (reference layout for the parity audit)

Source of truth for panel positions and proportions. Values below are
**code-measured** from `src/App.tsx` and the panel components (Tailwind
classes); the audit (`audit/phase2/AUDIT-REPORT.md`) re-measures them in
the running app at 1440×900 and 1280×800 and records any drift here.

## Editor shell (flex column, `h-screen`, dark theme default)

| Region | Position | Size (code) | Component |
|---|---|---|---|
| Top bar | Top, full width | Height 48px (`h-12`) | `src/components/TopBar.tsx` |
| Middle row | Between top bar and timeline | `flex-1`, `min-h-0` | `src/App.tsx` |
| Left tab rail | Left edge of middle row | Width 64px (`w-16`), vertical, scrollable | `src/components/LeftTabs.tsx` |
| Left panel | Right of the tab rail (when the active tab has one) | Width 288px (`w-72`); Adjustment panel 320px (`w-80`) | `MediaBrowser` / `EffectsPanel` / `TransitionsPanel` / `ColorPanel` / `PlaceholderPanel` |
| Preview | Centre of middle row | `flex-1`, `min-w-0` | `src/components/PreviewArea.tsx` |
| Properties panel | Right edge of middle row | Width 288px (`w-72`), scrollable | `src/components/PropertiesPanel.tsx` |
| Timeline | Bottom, full width | Height 288px (`h-72`) | `src/components/TimelineShell.tsx` |
| Export / Shortcuts | Centred modal over everything | Fixed overlay, `z-50` | `ExportPanel` / `ShortcutsPanel` |

At 1440×900 the middle row is 900 − 48 − 288 = 564px high; the preview
area is 1440 − 64 − 288 (left panel, when open) − 288 (properties) =
800px wide when a left panel is open, 1088px when it is not.

## Top bar — control order (left to right)

1. Logo + "Vidora" wordmark button (opens the dashboard)
2. Project name (truncated, hidden below `sm`)
3. Save state: "● Unsaved" / "✓ Saved" (hidden below `md`)
4. Undo button, Redo button (disabled when their stack is empty)
5. Aspect-ratio label + select — pushed right (`ml-auto`)
6. Custom width × height number inputs (only when ratio = `custom`)
7. "⌨ Shortcuts" button (opens the Shortcuts dialog)
8. "Export" button (gradient, opens the Export dialog)

## Left tab rail — tab order (top to bottom)

Media, Audio, Text, Stickers, Effects, Transitions, Captions, Filters,
Adjustment, Templates, AI Tools. Each tab is an icon + 10px label, 56px
wide (`w-14`), active tab highlighted violet. Clicking a tab switches
the left panel; the active tab is the only highlighted one.

Left panels by tab:

| Tab | Panel |
|---|---|
| Media | Media library (`MediaBrowser`) |
| Audio | Placeholder — Phase 4 (parity retrofit) |
| Text | Placeholder — Phase 3 |
| Stickers | Placeholder — Phase 3 |
| Effects | Effects & Filters (`EffectsPanel`) |
| Transitions | Transitions (`TransitionsPanel`) |
| Captions | Placeholder — Phase 3 |
| Filters | Effects & Filters, LUT section (`EffectsPanel lutFocus`) |
| Adjustment | Adjustment (`ColorPanel`, 320px wide) |
| Templates | Placeholder — Phase 8 |
| AI Tools | Placeholder — Phase 7 |

## Preview — control order

Canvas (aspect-ratio box, black, rounded, border) centred in the
preview area; transport bar at the bottom (48px, `h-12`):
−1f frame-step, Play/Pause (round gradient button), +1f frame-step,
seek slider (range 0 → project duration, step 0.01s), timecode
`HH:MM:SS:FF / HH:MM:SS:FF`, current clip name + speed, Loop toggle,
Safe toggle, Grid toggle, Fullscreen button.

Overlays (toggled from the transport bar): safe zones (yellow 90%
action-safe rectangle, cyan 80% title-safe rectangle), thirds grid
(white 40% lines at 1/3 and 2/3). Badges drawn on the canvas top-left:
`REVERSED`, `FREEZE FRAME`, `TRANSITION: <TYPE>`, `MASK: <SHAPE>`.
Empty state: project name + "Import media and add it to the timeline
to preview it here." centred on black.

## Properties panel — section order (clip selected)

Clip name (heading) → clip meta line (type · start · duration ·
source) → Speed → Transform → Crop → Freeze/Reverse buttons →
Keyframes & Animation → Mask & Compositing → note pointing at the
left tabs. With no clip selected: tab help text + project summary
(tracks, media, markers, fps, resolution) + "Export…" button.

## Timeline — layout

Toolbar row (40px, `h-10`): "Timeline" label → Split, Delete, Ripple
delete, Duplicate, Copy, Paste, Freeze, Reverse, Group, Ungroup,
Compound, + Marker → Snap checkbox, Ripple checkbox → Zoom slider
(right) → playhead timecode. Track headers (144px, `w-36`): name,
kind, lock/hide/mute buttons; "+ Video track / + Audio / + Text"
buttons below. Ruler (24px, `h-6`, 1s ticks, cyan marker lines,
red playhead line). Tracks: 56px rows (`h-14`); clips are absolute
blocks with 8px trim handles at each edge; audio = emerald,
image = amber, compound = fuchsia, video = violet; selected clip has
a white ring. Footer (24px, `h-6`): hint text, "Play from playhead",
track count / total duration (or "Dragging (mode)…" while dragging).

## Dashboard

Header 56px (`h-14`): logo, "Vidora", tagline "Create. Cut. Shine.",
"Theme: dark/light" toggle (right). Main content `max-w-4xl`,
centred: "Your projects" heading, autosave note, new-project name
input + "New Project" button, Recent / Drafts tabs (with counts),
project rows (folder icon, name, meta line: ratio · fps · tracks ·
clips · media · updated; Rename / Duplicate / Delete buttons).
Crash-recovery notice (cyan banner) appears at the top when an
autosave newer than the saved project was restored.

## Measured values (audit, 1440×900)

Measured by the Playwright self-audit on 2026-11-22
(`audit/phase2/AUDIT-REPORT.md`, `audit/phase2/measurements.json`):

| Region | Code value | Measured | Drift |
|---|---|---|---|
| Top bar height | 48px | 48px | 0 |
| Left tab rail width | 64px | 64px | 0 |
| Properties panel width | 288px | 288px | 0 |
| Timeline height | 288px | 288px | 0 |
| Preview area (left panel open) | — | 800 × 564px | — |

All measured values match the code values exactly (0px drift). If a
future audit differs by more than 2px, the difference is logged in
`docs/BUGS.md` and fixed.
