# J-PITCH — Pitch-preserving speed playback (Web Audio)
- **Phase:** 4
- **Reference behaviour:** The reference Speed panel (Normal sub-tab) has a "Pitch" switch: "keeps audio pitch when speed changes". The switch is ON by default in the reference UI. Vidora already stores the flag (`clip.pitchPreserved`, default true) and shows the toggle in the Speed section; Phase 1–3 playback used the browser rate control, so pitch shifted with speed and the panel said so honestly. Phase 4 makes the flag real.
- **Where it lives:** Speed section toggle (`PropertiesPanel.tsx`, unchanged); engine in `src/lib/audioEngine.ts` (`preservesPitch` on media elements + Web Audio routing); note text in `PropertiesPanel.tsx` updated to describe the real behaviour.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Switch | Pitch (in Speed section) | — | — | on | — | Disabled at 0.1×/100× extremes (unchanged from Phase 1) |

## Interactions
- Pitch ON + speed ≠ 1×: the media element's `preservesPitch` is set (and `webkitPreservesPitch` where present) so the voice/music keeps its pitch while the tempo follows the speed.
- Pitch OFF + speed ≠ 1×: `preservesPitch` is false, so pitch rises/falls with speed (chipmunk / deep effect).
- Applies to video-clip audio and audio clips alike (both go through the engine).

## States
- Speed 1×: the switch has no audible effect (pitch is unchanged at normal speed either way).
- Browser without `preservesPitch`: no fallback note is shown — every browser Vidora targets (Chromium/Firefox) supports it; if one did not, pitch would follow speed silently.

## Result
With Pitch ON, a 2× clip sounds twice as fast at the original pitch; with Pitch OFF it sounds twice as fast an octave up.

## Edge cases
- Reversed clips: audio is muted regardless of the Pitch switch (see J-INSPECTOR).
- `preservesPitch` is set before `playbackRate` on every sync tick, so toggling mid-playback takes effect immediately.

## Evidence
FULL-WALKTHROUGH-2026-11-23.md (Speed panel Normal: Pitch switch) · WEB-CHECK-2026-11-22.md §6 (Pitch toggle exists) · `src/lib/audioEngine.ts`, `src/components/PreviewArea.tsx`

## Status
MATCH — the switch and its meaning were observed in the reference; the engine behaviour is now real.
