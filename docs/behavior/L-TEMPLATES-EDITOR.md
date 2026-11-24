# L-TEMPLATES-EDITOR — Editor Templates tab (reference card, Phase 8)
- **Phase:** 8 (built in v0.9.0 — see Status)
- **Reference behaviour:** Inside the editor, the Templates tab shows the same structure as the home Templates screen: a "Search for templates" bar; Yours / Templates sections; filters Orientation: All, Clips: No limit, Duration: No limit; category list (For you, Pro, Daily life, Selfie, Velocity, AI, Lyrics — the visible list may scroll); a "For you" grid with a Featured card (vertical video thumbnail). The tab rail is scrolled to show Effects, Transitions, Captions, Filters, Adjustment, Templates, AI avatar, with a "<" arrow on the left. UNKNOWN — full check pending: whether the editor Templates tab behaves identically to the home screen (same popup? same Use-template flow?) or differently (does it insert into the open project?); the full category list; what "Yours" contains in the editor. Template NAMES and thumbnails shown are CapCut content — Vidora must use ORIGINAL templates only.
- **Where it lives:** `src/components/TemplatesPanel.tsx` — the Templates left panel inside the editor (search, category chips, 35 original templates, per-slot media pickers in v0.9.0).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | Search for templates | — | — | empty | — | |
| Select | Orientation / Clips / Duration | — | — | All / No limit / No limit | — | Same three filters as home |
| List | Categories | — | — | For you | — | Yours / Templates sections; For you, Pro, Daily life, Selfie, Velocity, AI, Lyrics visible |
| Cards | Template grid | — | — | — | — | Vertical cards; Featured badge on some |

## Interactions
UNKNOWN — full check pending (whether clicking a card opens the same preview popup as home, and what Use template does inside an open project).

## States
UNKNOWN — full check pending.

## Result
BUILT in v0.9.0 — Templates panel with search + category filters + slot pickers. The REFERENCE comparison stays UNKNOWN (whether CapCut's editor tab opens the same popup as home, and what its "Yours" section holds) — the Vidora panel is Vidora's own layout, not a copy of CapCut's popup.

## Edge cases
UNKNOWN — full check pending.

## Evidence
Desktop screenshot 29-editor-templates.png (viewed directly)

## Status
ASSUMED (panel built; reference popup behaviour unobserved)
