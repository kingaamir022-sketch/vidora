# L-SHARE — Share: review / presentation / social (Phase 8, Section L)

- **Phase:** 8 (built v0.9.0)
- **Reference behaviour:** CapCut Web Export menu (checked signed-in 2026-11-23, WEB-CHECK-2026-11-23.md §3): Share for review ("People can add comments to your video."), Share as presentation ("People can only watch your video."), Share on social (TikTok, TikTok Ads Manager, YouTube, YouTube Shorts, Facebook Page, Instagram Reels, Free Schedule). Vidora's dialog has the same three sections with the same wording. The mechanics differ honestly: CapCut posts through its logged-in accounts; Vidora has no connected social accounts and no server, so social sharing prepares the file and opens the platform's own upload page — the panel says "Vidora prepares the file; you upload it on the platform. Direct posting needs a connected account (Phase 9)".
- **Where it lives:** Export dialog share sections (`src/components/ExportPanel.tsx`); links + caption helpers in `src/lib/share.ts`; present mode is a fullscreen overlay in the editor (`src/components/PresentMode.tsx` — actually rendered inside ExportPanel's presentation section; see below).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Download review package | — | — | — | — | `.vidora` bundle with comments (see L-COLLAB) |
| Button | Present now | — | — | — | — | Fullscreen playback, no editing UI, Esc exits |
| Button | Download presentation page | — | — | — | — | Standalone `presentation.html` — a small player page; put it next to the exported video file and open it |
| Buttons | Share on: TikTok / YouTube / YouTube Shorts / Facebook Page / Instagram Reels | — | — | — | — | Each opens the platform's official upload page in a new tab |
| Textarea | Caption + hashtags | — | — | project name | — | Editable; "Copy caption" copies it for pasting on the platform |
| Button | Copy caption | — | — | — | — | Copies the caption text to the clipboard |
| Note | Social note | — | — | — | — | "Vidora does not post for you — no account is connected. Export the video first, then upload it on the platform." |
| Select | Free Schedule | — | — | — | — | Not available: scheduling needs a connected account; the option is shown disabled with that reason (honest label, not a dead button) |

## Interactions
- Share for review → the review package downloads (L-COLLAB for comments).
- Share as presentation → "Present now" plays the timeline fullscreen from the playhead; Esc or click closes. "Download presentation page" downloads an HTML file that plays `<video src="…">` — the file name shown in the page is the export file name, and the note says to keep both files together.
- Share on social → the platform upload page opens (YouTube Studio upload, TikTok upload, Facebook video upload, Instagram — which has no web upload, so the button says "Instagram has no web upload — use the app" and copies the caption instead).
- Export the video first (Download tab) — the social section reminds you if no export exists yet in this session ("No exported file yet — export the video first").

## States
- No export yet: social buttons still work (they only open upload pages) but show the reminder.
- Presentation page downloaded: note shows the expected video file name.

## Result
A reviewer gets a file they can open and comment on; an audience gets a fullscreen playback; a social post gets a prepared file + caption + the right upload page.

## Edge cases
- Present mode with an empty project → disabled ("Nothing to present").
- Clipboard unavailable (insecure context) → "Copy caption" falls back to selecting the text with "Select the text and copy it".

## Evidence
CapCut Web Export menu §3 (WEB-CHECK-2026-11-23.md); social mechanics are Vidora's honest design (no API keys, no connected accounts).

## Status
ASSUMED (sections + wording match CapCut; mechanics are the honest local equivalent)
