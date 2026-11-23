# C-PITCH — Pitch toggle and Smooth slow-mo
- **Phase:** 1 (corrected 0.3.2, live CapCut Web check 2026-11-22)
- **Reference behaviour:** CapCut Web's Speed panel has a "Pitch" on/off switch and a "Smooth slow-mo" switch. The Pitch switch is disabled at the extreme 0.1×/100× speeds and interactive at 1×. Vidora matches: a Pitch toggle and a Smooth slow-mo toggle in the Speed section. Pitch-preserving playback still uses the browser rate control in Phases 0–2 (the real Web Audio pitch-preserving path is Phase 4 work); the UI says so under the toggles — the flag is never presented as working audio processing.
- **Where it lives:** Properties panel → Speed section.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Checkbox | Pitch | — | — | on | — | Disabled at 0.1× / 100×, like CapCut |
| Checkbox | Smooth slow-mo | — | — | off | — | Flag for the Phase 7 optical-flow engine |

## Interactions
Select a clip and tick/untick Pitch or Smooth slow-mo.

## States
The toggles reflect the stored flags; the help text below them explains the Phase 4 / Phase 7 paths.

## Result
Only the flags change; playback behaviour is unchanged in Phases 0–2.

## Edge cases
A project saved with the flags on still validates and migrates (schema v0.3.0 + smoothSlowMo default).

## Evidence
`src/components/PropertiesPanel.tsx`, `src/schema/project.ts` (pitchPreserved, smoothSlowMo) · Live check: `docs/reference/capcut/WEB-CHECK-2026-11-22.md` §6 · Audit: `audit/phase2/C-PITCH/`

## Status
MATCH (live CapCut Web check 2026-11-22 — toggle exists; playback engine stays Phase 4)
