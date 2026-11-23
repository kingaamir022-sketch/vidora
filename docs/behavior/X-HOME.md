# X-HOME — Home screen (reference card, Phase 8/dashboard)
- **Phase:** 8 (reference evidence only — Vidora's dashboard is Phase 0 and intentionally simpler)
- **Reference behaviour:** The home screen has a left sidebar (Sign in, Join Pro, Home, Templates, "Create with AI", Video Studio, Design Studio, More tools, Create with AI, Marketing tools, Invite friends, "Try Seedance 2.5 / Generate 4K videos"), a large teal "Create project" banner (+ icon) at the top, AI tool cards (AI image, Extend video, AI avatars, Enhance quality, AI remove), and an "AI-powered creative suite" row (Video Studio, Design Studio, AI ad maker, Text to speech). First launch shows a "Terms of Service and Privacy Policy" dialog ("Agree and continue" / "Disagree and close") that blocks the screen, then a "Manage software updates" dialog ("Automatic updates are on…", OK / Go to Settings). UNKNOWN — full check pending: the home screen's project list (recent projects were not visible in the screenshots — the terms dialog covered the screen); what "More tools" contains; what happens after "Create project" is clicked (new-project naming? default settings?); the Sign in / Join Pro flows. A first-run environment check also exists: "Your computer can run CapCut smoothly" with a Confirm button (desktop screenshot 01).
- **Where it lives:** Reference card for the home/dashboard area; Vidora's dashboard (`src/components/Dashboard.tsx`) is the Phase 0 equivalent — it does not copy this layout, branding or content.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Create project | — | — | — | — | Large banner, + icon |
| Nav | Left sidebar | — | — | — | — | Sign in, Join Pro, Home, Templates, Create with AI, Video Studio, Design Studio, More tools, Marketing tools, Invite friends |
| Cards | AI tool cards | — | — | — | — | AI image, Extend video, AI avatars, Enhance quality, AI remove |
| Cards | AI-powered creative suite | — | — | — | — | Video Studio, Design Studio, AI ad maker, Text to speech |
| Dialog | Terms of Service and Privacy Policy | — | — | — | — | First launch; Agree and continue / Disagree and close |
| Dialog | Manage software updates | — | — | — | — | After agreeing; automatic updates ON by default |

## Interactions
UNKNOWN — full check pending for the project list and the Create-project flow (covered by the first-run dialogs in the screenshots).

## States
First launch: environment check → terms dialog → updates dialog → home. Signed-in state was not captured in these screenshots.

## Result
NOT BUILT as a CapCut-style home — this card is evidence for a future dashboard review (Phase 8). Vidora's dashboard stays its own original design.

## Edge cases
UNKNOWN — full check pending.

## Evidence
Desktop screenshots 01-desktop-environment-check.png, 02-home-terms-dialog.png, 03-home-updates-dialog.png (viewed directly / README batch 1)

## Status
UNKNOWN
