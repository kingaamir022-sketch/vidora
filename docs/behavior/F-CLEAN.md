# F-CLEAN — Denoise, stabilization, lens correction
- **Phase:** 2 (corrected 0.3.2, live CapCut Web check 2026-11-22)
- **Reference behaviour:** Stabilization IS present in CapCut Web ("Stabilize" toggle, marked Pro). Denoise IS present ("Reduce image noise" toggle, Free; also "Remove flicker"). Lens correction was NOT found in CapCut Web (only stylistic effects: Zoom Lens, Fisheye, Wide Angle). Vidora matches: a "Reduce image noise" slider (real light spatial soften in the preview) and a "Stabilize" toggle. Real motion stabilization is still Phase 7 engine work — the toggle is stored as a flag and is never faked; the panel says so. Lens correction stays a stored deferred flag (not in CapCut Web either).
- **Where it lives:** Adjustment left panel → 'Cleanup' section.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Slider | Reduce image noise | 0 | 1 | 0 | 0.05 | Shows N% |
| Checkbox | Stabilize | — | — | off | — | Flag only until Phase 7 |
| Checkbox | Lens correction (deferred) | — | — | off | — | Flag only |

## Interactions
Drag Reduce image noise to soften the frame; tick Stabilize or Lens correction to store the intent for the later phase.

## States
Each deferred checkbox has a help paragraph explaining what is missing and in which phase it lands.

## Result
Reduce image noise visibly softens the preview; the deferred flags only change the stored project JSON.

## Edge cases
Reduce image noise at 1.0 is a strong soften (it is a light spatial filter, not AI denoise). The deferred flags do not change the preview at all.

## Evidence
`src/components/ColorPanel.tsx`, `src/lib/color.ts` · Live check: `docs/reference/capcut/WEB-CHECK-2026-11-22.md` §9 · Audit: `audit/phase2/F-CLEAN/`

## Status
MATCH (live CapCut Web check 2026-11-22)
