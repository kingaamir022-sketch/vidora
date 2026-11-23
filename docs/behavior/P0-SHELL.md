# P0-SHELL — Editor shell layout
- **Phase:** 0
- **Reference behaviour:** A professional desktop editor: a 48px top bar, a narrow icon tab rail on the left, an optional tool panel, a large centre preview, a right properties panel, and a timeline along the bottom. [ASSUMED] Panel widths follow the common desktop-editor proportions (rail ~64px, side panels ~288px, timeline ~288px tall).
- **Desktop evidence (2026-11-23):** the tab rail SCROLLS — desktop screenshots show 8 visible tabs plus a ">" overflow arrow (screenshots 04/19), and a "<" arrow on the left once scrolled (screenshots 27/29/30). Full tab order confirmed: Media, Audio, Text, Stickers, Effects, Transitions, Captions, Filters, Adjustment, Templates, AI avatar. Vidora's 11th tab is "AI Tools" instead of "AI avatar" (Phase 7 scope — revisit then, do not rename now). Vidora's rail currently shows all 11 tabs without scrolling; matching the scroll behaviour is a later polish item, not a Phase 0–2 rebuild.
- **Where it lives:** Editor view (`src/App.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Layout | Top bar | — | — | 48px high | — | Logo, project name, save state, undo/redo, ratio, Shortcuts, Export |
| Layout | Left tab rail | — | — | 64px wide | — | 11 tabs, icon + label |
| Layout | Left panel | — | — | 288px (Adjustment 320px) | — | Present for Media/Effects/Filters/Transitions/Adjustment; placeholder for the other tabs |
| Layout | Preview | — | — | flex-1 | — | Aspect-ratio box centred |
| Layout | Properties panel | — | — | 288px wide | — | Scrollable |
| Layout | Timeline | — | — | 288px high | — | Toolbar, ruler, tracks, footer |

## Interactions
Resize: panels are fixed-width in Phases 0–2 (resizable panels are Phase 9 polish). Click a tab to switch the left panel.

## States
Dashboard view vs editor view; editor always shows all five regions.

## Result
The editor opens with the exact region order in docs/UI_LAYOUT.md.

## Edge cases
At very narrow widths (<860px) the top bar wraps and the project name/save state hide (responsive rules in TopBar). Mobile layout is a later phase.

## Evidence
`src/App.tsx`, `docs/UI_LAYOUT.md` · Audit: `audit/phase2/P0-SHELL/` · Desktop screenshots 04, 19, 27, 29, 30 (tab rail scrolls; full order incl. "AI avatar" as the 11th tab)

## Status
MATCH
