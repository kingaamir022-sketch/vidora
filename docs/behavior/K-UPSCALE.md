# K-UPSCALE — Upscaler to 4K (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's Export offers up to 4K; Section K requires an upscaler to 4K. Vidora's upscaler is an honest resample: the selected clip is rendered offline frame by frame at 3840×2160 (canvas drawImage at 4K + unsharp-mask sharpening), captured with MediaRecorder into a new 4K media item. It does NOT recover detail that was never in the source — the panel says so plainly ("detail-preserving resample + sharpen, not AI detail recovery; true AI upscaling needs a neural model"). ASSUMED — the reference flow (upscale → 4K file) is matched; the engine is Vidora's own canvas resample.
- **Where it lives:** `src/lib/aiTools.ts` (`upscaleFrame`), `src/components/AIToolsPanel.tsx` (Upscale section), offline render in the panel via canvas + MediaRecorder.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Target | — | — | 4K (3840×2160) | — | 2K (2560×1440) / 4K (3840×2160) |
| Slider | Sharpen | 0 | 1 | 0.4 | 0.1 | Unsharp-mask strength |
| Button | Render upscaled copy | — | — | — | — | Offline render → new media item |
| Note | Honest note | — | — | — | — | Resample + sharpen; no new detail is created |

## Interactions
- Select a video/image clip, pick a target, click "Render upscaled copy": the panel renders the clip offline at the target resolution and adds a new media item "… (4K)" with the upscaled frames. The original clip is untouched; add the new item to the timeline yourself.
- Image clips render a single 4K still (fast); video clips render in real time (a 10 s clip takes ~10 s + encode).

## States
- No clip selected: "Select a video clip first."
- Clip already 4K or larger: "This clip is already 4K or larger."
- Render running: progress bar (frames done / total), cancellable.

## Result
A new media item at the target resolution.

## Edge cases
- Clip longer than 60 s: the panel warns about render time and memory and offers to trim first.
- Render cancelled: the partial file is discarded, nothing is added.
- Browser without MediaRecorder VP9/4K: falls back to the default codec; the panel notes the actual codec used.

## Evidence
`src/lib/aiTools.ts`, `src/test/phase7.test.ts` (upscale dimensions + sharpening changes edge pixels).

## Status
ASSUMED
