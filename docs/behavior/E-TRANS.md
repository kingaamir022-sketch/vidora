# E-TRANS — Transitions
- **Phase:** 2
- **Reference behaviour:** A transition blends from the previous clip on the same track into the selected clip over a duration, with a direction where it applies. Types: fade, dissolve, slide, push, zoom, wipe, blur, spin. The preview shows a 'TRANSITION: <TYPE>' badge while the transition plays. [ASSUMED] A transition only plays when a previous clip ends exactly where this clip starts on the same track.
- **Desktop evidence (2026-11-23):** the Transitions tab has a search box ("People are searching pull in"), a Favorites entry, and a "Transitions" section with categories Trending, Classic, NEW, Hits, B.Duck, Overlay, Light, shown as a grid of named cards with download icons and Pro diamond badges (desktop screenshot 25). The Web Transitions panel adds a tip: "Drag and drop a transition between two clips on the timeline" (WEB-CHECK-2026-11-23 §4). Vidora's Transitions panel uses its own 8 original transition types; how a desktop transition is applied (click vs drag-and-drop between clips) and its duration control are UNKNOWN — full check pending. Transition names shown in the reference are CapCut content — Vidora's 8 transitions keep original names.
- **Where it lives:** Transitions left panel (`src/components/TransitionsPanel.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Buttons | Transition type | — | — | none | — | 8 types, one per button |
| Slider | Transition duration | 0.1 | 3 | 0.5 | 0.05 | seconds |
| Select | Direction | — | — | right | — | right / left / up / down (for slide/push/wipe) |

## Interactions
Select a clip, open the Transitions tab, click a type, set duration and direction.

## States
With no clip selected the panel asks to select one. The active type button is highlighted.

## Result
Playing across the cut blends the two clips for the transition duration; the badge shows during the blend.

## Edge cases
If there is no previous clip on the track, the transition has nothing to blend from and the clip plays normally. Duration is clamped 0.1–3s.

## Evidence
`src/components/TransitionsPanel.tsx`, `src/lib/transitions.ts` (TRANSITION_TYPES) · Audit: `audit/phase2/E-TRANS/` · Desktop screenshot 25-editor-transitions.png (categories incl. B.Duck/Overlay/Light + named grid) · WEB-CHECK-2026-11-23.md §4 (drag-and-drop tip)

## Status
MATCH
