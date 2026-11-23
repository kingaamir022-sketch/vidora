# B-SPLIT — Split clip at playhead
- **Phase:** 1
- **Reference behaviour:** Splitting cuts the selected clip into two clips at the playhead. The left part keeps the clip's start; the right part starts at the cut. [ASSUMED] Splitting exactly at a clip edge is a no-op (there is nothing to cut).
- **Where it lives:** Timeline toolbar ('✂ Split'), shortcut S, right-click menu.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | ✂ Split | — | — | — | — | Disabled with no selection |
| Shortcut | S | — | — | — | — | Splits the selected clip at the playhead |

## Interactions
Select a clip, move the playhead inside it, press S or click Split (or right-click → Split at playhead).

## States
Split is disabled with no selection. The two resulting clips keep the original name, effects and transforms.

## Result
Two clips appear where one was; total duration is unchanged; the split is undoable.

## Edge cases
If the playhead is outside the selected clip (or exactly on its edge), nothing happens. Splitting a compound clip is not supported (it is treated as one clip).

## Evidence
`src/lib/timeline.ts` (splitClipAt), `src/components/TimelineShell.tsx` · Audit: `audit/phase2/B-SPLIT/`

## Status
MATCH
