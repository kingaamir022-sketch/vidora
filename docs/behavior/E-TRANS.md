# E-TRANS — Transitions (Phase 5: 32 types)
- **Phase:** 2 → 5 (Phase 5 grows the catalog from 8 to 32 transition types)
- **Reference behaviour:** The reference Transitions tab has a search box, a Favorites entry, and categories Trending, Classic, NEW, Hits, B.Duck, Overlay, Light (desktop screenshot 25), plus Web rows Movement, 3D, Blur, Basic (FULL-WALKTHROUGH-2026-11-23.md). The Web panel shows a tip: "Drag and drop a transition between two clips on the timeline". Transition names shown in the reference are CapCut content — all 32 Vidora transition names are ORIGINAL. [ASSUMED] Vidora keeps the Phase 2 application model (select the incoming clip, click a type, set duration/direction) — the reference's drag-and-drop application and per-transition duration control were never observed on desktop; Vidora's panel groups the 32 types by shape (Fade, Slide, Wipe, Shape, Pixel, Camera, Light) instead of the reference's named rows, because Vidora's rows are original content.
- **Where it lives:** Transitions left panel (`src/components/TransitionsPanel.tsx`); types + drawing in `src/lib/transitions.ts` (`TRANSITION_TYPES`, `drawTransition`); type enum in `src/schema/project.ts` (`transitionTypeSchema`, 32 values — a superset of the Phase 2 enum, so old projects still validate).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | Search transitions | — | — | empty | — | Substring on name/category |
| List | Categories | — | — | All | — | All, Fade, Slide, Wipe, Shape, Pixel, Camera, Light |
| Buttons | Transition type (32) | — | — | none | — | One per button; active type highlighted |
| Slider | Transition duration | 0.1 | 3 | 0.5 | 0.05 | seconds |
| Select | Direction | — | — | right | — | right / left / up / down (for directional types) |

## Interactions
Select a clip, open the Transitions tab, click a type, set duration and direction. The transition plays at the start of the clip, blending in from the previous clip on the same track; the preview shows a 'TRANSITION: <TYPE>' badge while it plays.

## States
With no clip selected the panel asks to select one. The active type button is highlighted. 'None' clears the transition.

## Result
Playing across the cut blends the two clips for the transition duration; the badge shows during the blend. The transition is stored on the clip, undoable and autosaved.

## Edge cases
If there is no previous clip on the track, the transition has nothing to blend from and the clip plays normally. Duration is clamped 0.1–3s. Every type draws deterministically (seeded by progress) so the same frame always looks the same.

## Evidence
`src/lib/transitions.ts` (TRANSITION_TYPES, 32 entries), `src/components/TransitionsPanel.tsx` · Audit: `audit/phase5/E-TRANS/` · Desktop screenshot 25-editor-transitions.png · FULL-WALKTHROUGH-2026-11-23.md (Transitions rows + drag-and-drop tip)

## Status
MATCH
