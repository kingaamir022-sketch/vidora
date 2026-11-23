# B-MARKER — Markers
- **Phase:** 1 (corrected 0.3.2, live CapCut Web check 2026-11-22)
- **Reference behaviour:** CapCut Web has NO marker feature — no marker button, no "Add marker" in any menu, and pressing M added nothing. Vidora keeps markers because the master spec requires them. This is a deliberate extra, not a bug. Await the user's desktop screenshots before changing anything here (desktop CapCut may have markers).
- **Where it lives:** Timeline toolbar ('+ Marker'), shortcut M; markers draw as cyan lines on the ruler.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | + Marker | — | — | — | — | Adds a marker at the playhead |
| Shortcut | M | — | — | — | — | Same as the button |

## Interactions
Move the playhead, press M or click '+ Marker'.

## States
Each marker is a cyan vertical line on the ruler with a tooltip '<label> @ <time>s'.

## Result
A marker appears at the playhead time, labelled 'Marker <n>' in order. Markers are snap targets for the Attach magnet.

## Edge cases
There is no marker list UI and no marker delete button yet — markers can only be removed by editing the project JSON (Phase 8 library work). Markers at the same time are allowed.

## Evidence
`src/components/TimelineShell.tsx`, `src/store/projectStore.ts` (addMarker) · Live check: `docs/reference/capcut/WEB-CHECK-2026-11-22.md` §2 · Audit: `audit/phase2/B-MARKER/`

## Status
INTENTIONAL-DIFF (spec-required extra; CapCut Web has no markers — await desktop evidence)
