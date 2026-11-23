# N-TEXTANIM — Text animations (Phase 5: 30+ in/out/loop animations)
- **Phase:** 2 → 5 (Phase 2 shipped 11 in/out kinds + 7 loop kinds; Phase 5 grows in/out kinds to 31 values (30 named + none), loops stay at 7 named + 28 motion-* — 37 named animations total (65 kinds in the picker including motion-* and none))
- **Reference behaviour:** The reference text inspector has an Animation section with In / Out / Loop tabs and a large named grid (full walkthrough 2026-11-23, Text tab; e.g. Zoom In, Crystal Wipe, Ember Sweep, Slide Right, Shard Assemble, Glow Scribble, Type 1, Spark Outline, Gold Spark Flow, Shimmer Sweep, Karaoke, Glitch). The clip inspector's Animation section has In / Out / Combo tabs. Animation NAMES shown are CapCut content — all Vidora animation names are ORIGINAL. [ASSUMED] Vidora's Animation section (in the text inspector) offers In / Out / Loop pickers with the 30 named in/out kinds + 7 loop kinds (37 named animations), plus 28 motion-* kinds; each kind's exact motion is Vidora's own easing/transform math in `src/lib/keyframes.ts` (`animationState`) and `src/lib/text.ts` (`evaluateLoopAnimation`).
- **Where it lives:** Kind enum in `src/schema/project.ts` (`animationKindSchema`, 31 values including `none` — a superset, so old projects still validate); evaluation in `src/lib/keyframes.ts` (`animationState`, `combinedAnimationState`); loop kinds in `src/lib/text.ts`; pickers in the text inspector (`src/components/PropertiesPanel.tsx` Text section).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Animation In | — | — | None | — | 30 named kinds (+ none) |
| Select | Animation Out | — | — | None | — | 30 named kinds (+ none) |
| Select | Loop animation | — | — | None | — | 7 kinds (pulse, wiggle, float, blink, spin-slow, shimmer, bounce-loop) |
| Slider | Animation duration | 0.05 | 5 | 0.5 | 0.05 | seconds, per In/Out |

## Interactions
Select a text (or any) clip, pick an In kind and an Out kind — the preview plays the entrance at the clip start and the exit at the clip end. Pick a loop kind — it plays for the whole clip duration.

## States
'None' means no animation. In and Out combine (offsets add, opacity takes the min, scale multiplies) via `combinedAnimationState`.

## Result
37 named animations (+ 28 motion-* kinds), all evaluated per frame in the preview compositor, all undoable and autosaved.

## Edge cases
A 0.05s duration still renders (one eased step). Loop + In/Out combine through the same AnimationState fields.

## Evidence
`src/schema/project.ts` (animationKindSchema), `src/lib/keyframes.ts` (animationState) · Audit: `audit/phase5/N-TEXTANIM/` (every kind evaluates without throwing and settles to identity at t=duration)

## Status
ASSUMED
