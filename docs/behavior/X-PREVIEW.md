# X-PREVIEW — Preview transport — play, seek, frame step, loop, fullscreen, overlays
- **Phase:** 1/2
- **Reference behaviour:** The preview plays the composited frame at the playhead. Transport: play/pause, seek slider, timecode, frame step, loop, fullscreen, safe zones and thirds grid. [ASSUMED] Frame step moves exactly 1/fps; loop restarts at 0; safe zones are 90% action-safe (yellow) and 80% title-safe (cyan) — the broadcast-standard rectangles.
- **Where it lives:** Preview bottom transport bar (`src/components/PreviewArea.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Play / Pause | — | — | paused | — | Round gradient button; Space works too |
| Slider | Seek | 0 | project duration | 0 | 0.01 | seconds |
| Text | Timecode HH:MM:SS:FF / HH:MM:SS:FF | — | — | 00:00:00:00 | — | Read-only; fps from project (30) |
| Button | −1f / +1f frame step | — | — | — | — | ±1 frame |
| Button | Loop | — | — | off | — | Toggle; highlighted when on |
| Button | Safe | — | — | off | — | Toggle safe-zone rectangles |
| Button | Grid | — | — | off | — | Toggle thirds grid |
| Button | Fullscreen ⛶ | — | — | — | — | requestFullscreen on the preview section |

## Interactions
Click Play or press Space; drag Seek; click −1f/+1f to step a frame; toggle Loop/Safe/Grid; click ⛶ for fullscreen.

## States
Playing stops at the end unless Loop is on (then it restarts at 0). Fullscreen uses the browser fullscreen API.

## Result
The canvas plays the composited clips; the timecode advances; overlays appear/disappear on toggle.

## Edge cases
Stepping past the end clamps to the duration. Fullscreen in headless/audit browsers may be denied — the button then does nothing (no error). Seeking while playing keeps playing from the new position.

## Evidence
`src/components/PreviewArea.tsx` (formatTimecode) · Audit: `audit/phase2/X-PREVIEW/`

## Status
MATCH
