# K-HIGHLIGHTS — Auto highlights (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's home feed has "Smart Insights" and the editor has "Long video to shorts"; auto-highlight reels pick the liveliest moments. Vidora's Auto highlights scores every 2-second segment of the selected clip by loudness (audio peaks) + motion (frame-difference energy) + speech presence (caption words in the segment), ranks them, and offers the top segments as a highlight reel: either keep-only-highlights on the clip, or build a new project with the top segments in order. Nothing is deleted without confirmation. ASSUMED — the reference flow (analyse → best moments → reel) is the standard shape; the scoring weights are Vidora's own.
- **Where it lives:** `src/lib/aiTools.ts` (`scoreHighlightSegments`, `pickHighlights`), `src/components/AIToolsPanel.tsx` (Auto Highlights section), `src/store/projectStore.ts` (new-project creation, reused).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Number | Reel length | 1 | 10 | 5 | 1 | How many segments to keep |
| Number | Segment length | 1 s | 5 s | 2 s | 0.5 s | Scoring window |
| Slider | Loudness weight | 0 | 1 | 0.5 | 0.1 | — |
| Slider | Motion weight | 0 | 1 | 0.3 | 0.1 | — |
| Slider | Speech weight | 0 | 1 | 0.2 | 0.1 | — |
| Button | Find highlights | — | — | — | — | Lists ranked segments with scores |
| Button | Build highlight reel | — | — | — | — | New project with the top segments |
| Button | Keep only highlights | — | — | — | — | Cuts the rest from the clip (asks first) |

## Interactions
- Select a video clip (10 s or longer works best), set the reel length, click "Find highlights": the panel lists the top segments (time, score, why: loud / moving / speech). "Build highlight reel" creates a new project named "<clip> — Highlights" with those segments in order. "Keep only highlights" cuts the other parts from the clip after a confirm.
- Weights change the ranking; re-run to re-rank.

## States
- Clip shorter than the segment length: "Clip too short for highlights."
- No audio peaks and no motion: "Nothing stands out — all segments scored the same."

## Result
A highlight reel project, or a trimmed clip with only the best moments.

## Edge cases
- Segments overlap: the picker enforces a minimum gap (one segment length) between picks.
- Reel longer than the clip: capped at the clip's segment count.

## Evidence
`src/lib/aiTools.ts`, `src/test/phase7.test.ts` (synthetic peaks + motion scores).

## Status
ASSUMED
