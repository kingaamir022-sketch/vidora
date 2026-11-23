# B-TRIM — Trim and move clips by dragging
- **Phase:** 1 (corrected 0.3.2, live CapCut Web check 2026-11-22)
- **Reference behaviour:** Frame-level snapping. In CapCut Web, dragging a clip edge ~15px changed the duration by exactly 10 frames (00:16:21 → 00:16:11); the ruler and timecode are frame-based. There IS a magnet toggle: the timeline toolbar "Attach" button, on by default. Trimming the start shifts the source start by the same amount (the standard non-destructive trim).
- **Where it lives:** Timeline clip blocks; "Attach" toggle in the timeline toolbar.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Drag handle | Left edge (8px) | — | — | — | — | Cursor ew-resize; trims start |
| Drag handle | Right edge (8px) | — | — | — | — | Cursor ew-resize; trims end |
| Drag | Clip body | — | — | — | — | Cursor grab; moves the clip |
| Checkbox | Attach | — | — | on | — | Magnet toggle; off = free drag, on = snap to edges/playhead/markers, otherwise nearest frame |
| Slider | Zoom | 8 | 120 | 24 | 1 | px per second |

## Interactions
Drag a clip's body to move it; drag an edge to trim. Toggle Attach to enable/disable magnetic snapping. Drag the Zoom slider to change px/s. Clicking the ruler seeks to the nearest frame.

## States
While dragging, the footer reads 'Dragging (move / trim-start / trim-end)…'. The undo snapshot is taken at drag start.

## Result
The clip moves/trims live; its start/duration update; the preview follows the playhead. With Attach on, drags land on frame boundaries (project fps, default 30) and magnet to clip edges, the playhead and markers within 0.25s.

## Edge cases
Trimming cannot make a clip shorter than ~0.01s or longer than its source; moving cannot go before 0s. Dragging a clip to another track is not supported in Phases 0–2 (move stays on its track).

## Evidence
`src/components/TimelineShell.tsx`, `src/lib/timeline.ts` (snapTime, snapToFrame) · Live check: `docs/reference/capcut/WEB-CHECK-2026-11-22.md` §1 · Audit: `audit/phase2/B-TRIM/`

## Status
MATCH (live CapCut Web check 2026-11-22)
