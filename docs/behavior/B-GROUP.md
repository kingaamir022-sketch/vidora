# B-GROUP — Group, ungroup, compound clips
- **Phase:** 1 (corrected 0.3.2, live CapCut Web check 2026-11-22)
- **Reference behaviour:** Group/compound are NOT present in CapCut Web. With all clips selected, the right-click menu offered only Copy, Cut, Paste, Duplicate, Delete and Download clip; Ctrl+G did nothing. Vidora keeps group/compound because the master spec requires them. This is a deliberate extra, not a bug. Await the user's desktop screenshots before changing anything here.
- **Where it lives:** Timeline toolbar: Group, Ungroup, Compound.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Group | — | — | — | — | Needs 2+ selected clips |
| Button | Ungroup | — | — | — | — | Needs a grouped selection |
| Button | Compound | — | — | — | — | Needs 2+ selected clips |

## Interactions
Ctrl+click two or more clips, then click Group or Compound. Select a grouped clip and click Ungroup.

## States
Group/Compound disable with fewer than 2 clips selected. Compound clips render fuchsia; grouped clips show '· grouped' in their tooltip and properties meta line.

## Result
Grouped clips share a groupId; a compound clip is one clip named 'Compound <n> clips' spanning the selection.

## Edge cases
Ungrouping requires selecting a clip that has a groupId. Compound clips cannot be expanded back in Phases 0–2 (no un-compound action).

## Evidence
`src/lib/timeline.ts` (groupClips, ungroupClips, makeCompound) · Live check: `docs/reference/capcut/WEB-CHECK-2026-11-22.md` §3 · Audit: `audit/phase2/B-GROUP/`

## Status
INTENTIONAL-DIFF (spec-required extra; CapCut Web has no group/compound — await desktop evidence)
