# Vidora Phase 8 audit report

Run: 2026-11-26T01:40:51.610Z
Result: 56/56 checks passed, 0 failed.

- PASS [L-EXPORT] behaviour card docs/behavior/L-EXPORT.md exists
- PASS [L-EXPORT-QUEUE] behaviour card docs/behavior/L-EXPORT-QUEUE.md exists
- PASS [L-EXPORT-AUDIO] behaviour card docs/behavior/L-EXPORT-AUDIO.md exists
- PASS [L-TEMPLATES-SLOTS] behaviour card docs/behavior/L-TEMPLATES-SLOTS.md exists
- PASS [L-COLLAB] behaviour card docs/behavior/L-COLLAB.md exists
- PASS [L-SHARE] behaviour card docs/behavior/L-SHARE.md exists
- PASS [L-TEMPLATES-SLOTS] build-assets templates floor is 35
- PASS [L-EXPORT] test video is on the timeline (1 clip) — clips: 1
- PASS [L-EXPORT] Export menu opens
- PASS [L-EXPORT] menu item "Share for review" present
- PASS [L-EXPORT] menu item "Share as presentation" present
- PASS [L-EXPORT] menu item "Share on social" present
- PASS [L-EXPORT] menu item "Download" present
- PASS [L-EXPORT] Export panel opens at Download
- PASS [L-EXPORT] resolution options include 480p and 4K
- PASS [L-EXPORT] quality options include Fast / Recommended / High
- PASS [L-EXPORT] format options include MP4 / WebM / MOV
- PASS [L-EXPORT] H.265 honestly not offered
- PASS [L-EXPORT] browser can encode at least one video codec — {"aac":false,"h264":true,"opus":true,"vp9":true,"vp8":true,"videoEncoder":true}
- PASS [L-EXPORT] video export job completes (mp4 480p/30fps) — Untitled-Project.mp4 · Untitled ProjectdoneDone · 514 KB⚠ AAC is not available — this file will have no audio track.Download again
- PASS [L-EXPORT] exported file downloads (.mp4) — Untitled-Project.mp4
- PASS [L-EXPORT] video track is h264 (got h264) — video=h264 audio=none duration=6.000000
- PASS [L-EXPORT] audio track is none (codec unavailable, honestly video-only) (got none) — video=h264 audio=none
- PASS [L-EXPORT] dialog honestly notes the missing audio codec — capability note shown
- PASS [L-EXPORT] duration is about the 6 s project — duration=6.000000
- PASS [L-EXPORT-QUEUE] second video job starts running
- PASS [L-EXPORT-QUEUE] cancelling the running job marks it cancelled
- PASS [L-EXPORT-QUEUE] the queued cover job still completes after the cancel
- PASS [L-EXPORT-AUDIO] cover frame downloads as PNG — Untitled-Project.png
- PASS [L-EXPORT-AUDIO] cover file starts with the PNG magic bytes
- PASS [L-EXPORT-AUDIO] audio-only WAV job completes
- PASS [L-EXPORT-AUDIO] WAV file downloads — Untitled-Project.wav
- PASS [L-EXPORT-AUDIO] WAV starts with RIFF/WAVE
- PASS [L-EXPORT-AUDIO] WAV duration is about the 6 s project — duration=6.000000
- PASS [L-EXPORT-AUDIO] GIF job completes
- PASS [L-EXPORT-AUDIO] GIF file downloads — Untitled-Project.gif
- PASS [L-EXPORT-AUDIO] GIF starts with GIF89a
- PASS [L-EXPORT-AUDIO] GIF has about 60 frames (6 s at 10 fps) — frames=60
- PASS [L-COLLAB] comment appears in the review list
- PASS [L-COLLAB] resolving the comment shows Reopen
- PASS [L-COLLAB] comment marker appears on the timeline ruler
- PASS [L-COLLAB] ruler click moves the playhead to ~4 s — timecode=00:00:04:05
- PASS [L-COLLAB] clicking the marker seeks the playhead back to the comment (0:00) — timecode=00:00:00:00
- PASS [L-SHARE] YouTube button opens the upload page — chrome-error://chromewebdata/
- PASS [L-SHARE] social button "YouTube" present
- PASS [L-SHARE] social button "TikTok" present
- PASS [L-SHARE] social button "Facebook Page" present
- PASS [L-SHARE] social button "Instagram Reels" present
- PASS [L-SHARE] caption textarea present
- PASS [L-SHARE] Free Schedule is disabled with a reason
- PASS [L-SHARE] Present now opens presentation mode with an exit bar
- PASS [L-SHARE] Esc leaves presentation mode
- PASS [L-TEMPLATES-SLOTS] Templates panel opens
- PASS [L-TEMPLATES-SLOTS] template "Sunrise Intro" is listed
- PASS [L-TEMPLATES-SLOTS] slot picker appears for the template
- PASS [L-TEMPLATES-SLOTS] Use template builds a project with the picked clip — clips: 3

Zero open bugs.
