# L-EXPORT — Full export dialog (Phase 8, Section L)

- **Phase:** 8 (built v0.9.0)
- **Reference behaviour:** CapCut Web Export menu (checked signed-in 2026-11-23, `docs/reference/capcut/WEB-CHECK-2026-11-23.md` §3): first level = Share for review ("People can add comments to your video."), Share as presentation ("People can only watch your video."), Share on social (TikTok, TikTok Ads Manager, YouTube, YouTube Shorts, Facebook Page, Instagram Reels, Free Schedule), plus Download. Download panel: name auto-generated with a video-cover thumbnail; Resolution 360p / 480p / 720p ("Recommended on TikTok Ads Manager") / 1080p ("Recommended on TikTok") / 2k / 4k; Quality High / Recommended / Fast; Frame rate 24 / 25 / 30 / 50 / 60 fps; Format MP4 / MOV; Export button at the bottom. Vidora matches this structure and these option lists exactly (its own original UI, violet/cyan palette). Desktop export may differ — evidence is CapCut Web signed-in.
- **Where it lives:** Export dialog (`src/components/ExportPanel.tsx`), opened by the top-bar Export button. Engine in `src/lib/exportEngine.ts` (offline frame render + audio mix + mediabunny mux). Phase 1's realtime MediaRecorder capture is replaced for video export: Phase 8 renders offline, frame by frame, from the same compositor the preview uses (`src/lib/renderFrame.ts`), so the exported file matches the preview pixel for pixel.
- **What changed from Phase 1:** audio IS mixed in (D5 closed) — every sounding clip (audio tracks + video clips' embedded audio) is rendered through an OfflineAudioContext mix with volume, fades, keyframed volume, ducking, mute/solo and master volume, then encoded (AAC for MP4/MOV, Opus for WebM). Export is no longer realtime: it renders as fast as the machine allows and reports progress. H.265 is NOT offered — no browser encoder exists for it; the panel says so (ASSUMED: CapCut offers H.265 on desktop, Web evidence shows only MP4/MOV containers).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Tabs | Download / Share for review / Share as presentation / Share on social | — | — | Download | — | Same four sections as CapCut's first-level menu |
| Text input | File name | — | — | project name | — | Sanitised: non-word chars removed, spaces → `-` |
| Select | Resolution | 360p | 4K (2160p) | 720p | — | 360p, 480p, 720p, 1080p, 2K (1440p), 4K (2160p); 1080p marked "Recommended on TikTok", 720p "Recommended on TikTok Ads Manager" |
| Select | Quality | — | — | Recommended | — | Fast exporting (lower bitrate), Recommended, High quality (higher bitrate) |
| Select | Frame rate | 24 | 60 | 30 | — | 24, 25, 30, 50, 60 fps |
| Select | Format | — | — | MP4 | — | MP4 (H.264 + AAC), WebM (VP9/VP8 + Opus), MOV (H.264 + AAC in QuickTime container) |
| Checkbox | Include audio mix | — | — | on | — | Off = video only (silent file); the panel says audio is excluded |
| Button | Export | — | — | — | — | Starts the job in the background queue; dialog stays usable |
| Progress bar | Export progress | 0% | 100% | — | — | Per-job progress + current step (Rendering frames / Mixing audio / Muxing) |
| Button | Cancel | — | — | — | — | Cancels the running job; partial file is discarded |
| Note | Capability note | — | — | — | — | Lists what this browser can encode (H.264/VP9/AAC/Opus detection) and what fell back (e.g. "VP9 not available here — VP8 used") |

## Interactions
- Click Export button (top bar) → dialog opens on Download with the project name and cover thumbnail.
- Change any option → the estimated file size / export time hint updates (estimate = duration × bitrate; labelled "estimate").
- Click Export → the job enters the queue (`L-EXPORT-QUEUE`), the dialog shows progress, the editor stays usable; on finish the file downloads automatically and the job shows "Download again".
- Empty project (duration 0) → Export button disabled with "Project is empty and cannot be exported" (same as CapCut).
- Media not loaded in this session (clip has no playable source) → that clip renders as its slot label / black frame and the job warns "1 clip had no media in this session" — export does not fail silently.

## States
- Idle: options editable, Export enabled (unless empty project).
- Running: progress bar + step label + Cancel; options locked for that job.
- Done: file name + size + "Download again" + "Open queue".
- Failed: readable error ("H.264 encoder not available in this browser" etc.) + Retry.
- Cancelled: job marked cancelled, no file.

## Result
A real video file (MP4/WebM/MOV) with video frames rendered from the timeline compositor and the audio mix included. Verified in the audit with ffprobe (video codec + audio codec + duration ≈ project duration).

## Edge cases
- 4K on a long project: the canvas is 3840×2160; the panel warns "4K is slow — use 1080p for a quick check". A job can be cancelled at any time.
- Browser without WebCodecs VideoEncoder: video export is unavailable and the panel says so; audio-only WAV export still works.
- H.264 unavailable but VP9 available: MP4/MOV options are disabled with a note; WebM is offered instead.
- Clip with `reversed` or `frozen`: the offline renderer seeks the same way the preview does (reversed time mapping, frozen frame).
- Speed ≠ 1: frame time uses `sourceStart + local × speed` (same as preview).

## Evidence
CapCut Web signed-in check 2026-11-23 (WEB-CHECK-2026-11-23.md §3); `docs/PARITY.md` X-EXPORT row (MATCH on Web evidence).

## Status
MATCH (options + structure match the Web evidence; H.265 intentionally absent, labelled)
