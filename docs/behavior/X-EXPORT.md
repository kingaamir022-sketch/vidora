# X-EXPORT — Basic export (Phase 1)
- **Phase:** 1
- **Reference behaviour:** Export records the composited preview canvas in real time with MediaRecorder and downloads the file. Resolutions 480p/720p/1080p, 24/30/60 fps, WebM (recommended) or MP4 if the browser supports it. Bitrates: 2.5 / 5 / 8 Mbps by resolution. The panel states the limits: realtime only, no audio mix yet, no 4K. The exported file is named '<project>-export.<ext>'. Verified against CapCut Web signed-in on 2026-11-23 (WEB-CHECK-2026-11-23.md §3): the Download panel offers 360p/480p/720p (recommended on TikTok Ads Manager)/1080p (recommended on TikTok)/2k/4k, Quality High/Recommended (selected)/Fast, Frame rate 24/25/30 (selected)/50/60fps, Format MP4 (selected)/MOV. Vidora covers the common subset (480–1080p, 24–60fps, MP4/WebM); 2K/4K, 25/50fps, MOV and quality tiers are Phase 8. Note: evidence is CapCut Web signed-in — desktop export may differ.
- **Where it lives:** Top bar Export button → Export dialog (`src/components/ExportPanel.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Resolution | — | — | 720p | — | 480p (854×480) / 720p (1280×720) / 1080p (1920×1080) |
| Select | Frame rate | — | — | 30 fps | — | 24 / 30 / 60 fps |
| Select | Format | — | — | WebM | — | WebM (recommended) / MP4 (if supported) |
| Button | Start export / Cancel | — | — | — | — | Records in real time; progress % shown |
| Text | Status line | — | — | — | — | Reports 'Recording…' then the finished file name + size |

## Interactions
Open Export, pick resolution/fps/format, click Start export; wait for the video's duration; the file downloads.

## States
Progress % climbs with elapsed / duration. If the browser supports no MediaRecorder mime, the status explains to try Chrome/Edge.

## Result
A .webm/.mp4 file downloads with the exported name; the status reports its size in MB.

## Edge cases
Export takes as long as the video (realtime). A 0s project exports an (almost) empty file. Audio is not mixed in yet (Phase 8).

## Evidence
`src/components/ExportPanel.tsx`, `src/lib/exporter.ts` · Live checks: `docs/reference/capcut/WEB-CHECK-2026-11-22.md` §10 (could not verify — sign-in) · `docs/reference/capcut/WEB-CHECK-2026-11-23.md` §3 (signed-in 2026-11-23: Download 360p–4k, quality tiers, 24/25/30/50/60fps, MP4/MOV — Vidora covers the common subset) · Audit: `audit/phase2/X-EXPORT/`

## Status
MATCH (signed-in CapCut Web check 2026-11-23; evidence is Web, desktop export may differ; 2K/4K, 25/50fps, MOV, quality tiers are Phase 8)
