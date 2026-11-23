# D-EASING — Easing and graph editor
- **Phase:** 2
- **Reference behaviour:** Each keyframe carries an easing that shapes the interpolation into it: linear, ease, ease-in, ease-out, or a custom cubic-bezier with four control-point numbers. A small SVG graph plots value over clip time with a playhead line. [ASSUMED] The graph normalises values 0–1 across the property's keyframes (the panel's documented behaviour) rather than showing absolute units.
- **Where it lives:** Properties panel → Keyframes & Animation section (per-keyframe easing select, graph above the rows).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Easing | — | — | linear | — | linear / ease / ease-in / ease-out / bezier |
| Number | Bezier cx1 / cy1 / cx2 / cy2 | 0 | 1 | 0.25/0.1/0.25/1 | 0.05 | Only when easing = bezier |
| Graph | Keyframe graph (SVG) | — | — | — | — | Value-over-time polyline + playhead line (read-only) |

## Interactions
Set a keyframe's easing from its row select; for bezier, type the four control points.

## States
Bezier number fields appear only when that keyframe's easing is 'bezier'. The graph redraws on every change.

## Result
Playback/scrubbing follows the eased curve; the graph shows the keyframes and the playhead position.

## Edge cases
Bezier control points are clamped 0–1. The graph is read-only (points cannot be dragged yet — Phase 8 polish).

## Evidence
`src/components/KeyframesPanel.tsx`, `src/lib/keyframes.ts` (cubic-bezier solver) · Audit: `audit/phase2/D-EASING/`

## Status
MATCH
