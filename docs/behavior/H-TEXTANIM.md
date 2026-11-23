# H-TEXTANIM — Text animations: In / Out / Loop
- **Phase:** 3
- **Reference behaviour:** The text inspector's Animation section has In / Out / Loop tabs with a large named grid of animations (Web shows None, Zoom In, Crystal Wipe, Ember Sweep, Slide Right, Shard Assemble, Glow Scribble, Type 1, Spark Outline, Gold Spark Flow, Shimmer Sweep, Karaoke, Glitch). In and Out animations play at the clip's start and end with a duration; Loop animations run for the whole clip. The full signed-in walkthrough (2026-11-23) adds the CLIP inspector's Animation section, which is separate: In / Out / Combo tabs (entrance, exit and combined presets — the Out tab alone shows 200+ named exit presets). UNKNOWN — desktop evidence still missing: the DESKTOP animation list and behaviour (no desktop screenshot of the Text tab exists); whether desktop loop animations have a duration control; the exact motion of each desktop animation. Vidora's animation names are ORIGINAL — no reference animation names are copied. Vidora's In/Out kinds reuse the existing clip animations (none, fade, slides, zooms, spin, bounce, pop); Loop kinds are original: none, pulse, wiggle, float, blink, spin-slow, shimmer, bounce-loop.
- **Where it lives:** Text left panel (`src/components/TextPanel.tsx`, Animation section); inspector Loop select in `src/components/PropertiesPanel.tsx`; evaluation in `src/lib/text.ts` (`evaluateLoopAnimation`); In/Out evaluation in `src/lib/keyframes.ts` (`combinedAnimationState`); applied in `src/components/PreviewArea.tsx` (`renderTextFrame`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Animation in kind | — | — | none | — | 11 kinds (reuses clip animations) |
| Number | Animation in duration | 0.05 | 5 | 0.5 | 0.1 | seconds |
| Select | Animation out kind | — | — | none | — | 11 kinds |
| Number | Animation out duration | 0.05 | 5 | 0.5 | 0.1 | seconds |
| Select | Loop animation kind | — | — | none | — | 8 original kinds |
| Number | Loop duration | 0.2 | 10 | 2 | 0.1 | seconds per loop cycle |

## Interactions
Select a text clip, pick In/Out kinds and durations (Text panel or Keyframes section) and a Loop kind (+ cycle duration). The preview animates the text live while playing or scrubbing.

## States
Loop "none" means no looping motion. In/Out durations clamp 0.05–5s; loop cycle clamps 0.2–10s. If In + Out durations exceed the clip length they overlap in the middle (both apply, clamped — same rule as D-ANIM).

## Result
The text animates in at its start, out at its end, and loops its loop animation for the whole clip, evaluated per frame in the preview compositor.

## Edge cases
A loop animation with duration 0 or kind "none" returns the identity transform. Blink alternates opacity 1 / 0.15 per half-cycle; spin-slow completes one rotation per cycle.

## Evidence
WEB-CHECK-2026-11-23.md §2 (Animation: In / Out / Loop tabs, named grid) · FULL-WALKTHROUGH-2026-11-23.md (clip inspector Animation: In / Out / Combo tabs, 200+ named exit presets — separate from the text inspector's In/Out/Loop) · `src/lib/text.ts` (`evaluateLoopAnimation`, `LOOP_ANIMATION_LABELS`), `src/lib/keyframes.ts`

## Status
MATCH
