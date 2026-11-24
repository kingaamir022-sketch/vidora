# Vidora — User Guide

Vidora is a video editor that runs in your browser. Nothing is uploaded anywhere — your projects, videos and accounts stay on your own computer. This guide explains the whole app in simple words.

## 1. Your first project

1. Open Vidora. The first time, a short tour appears — click **Next** through it, or **Skip tour**. You can see it again later in Settings → "Show the tour again".
2. On the dashboard, click **New Project**. A blank project opens.
3. A sample project called "Sunset Coast" is already there if you want to look around first — click it to open it.

## 2. Bring in your videos, photos and sound

- Left side, click the **Media** tab, then **Import video / image / audio / GIF**. Pick files from your computer. You can also drag files onto the Media panel.
- Every file shows a small picture (thumbnail), its size and its length.
- Click **Add to timeline** under a file to put it on the timeline at the playhead (the white line).
- The **AI Library** tab (inside AI Tools) has ready-made music, clips, images and voices that Vidora made itself — click **+ Add** on any of them.

## 3. The timeline — where you cut

- Clips sit on tracks. The top track is video, the one below is audio. Drag a clip left or right to move it.
- **Click a clip** to select it. The right panel then shows what you can change about it.
- **Split:** put the playhead where you want the cut and press **S**. The clip becomes two clips.
- **Trim:** drag the left or right edge of a clip to make it shorter or longer.
- **Delete:** select a clip and press **Delete**. **Ripple delete** closes the gap left behind.
- **Undo / Redo:** the curved arrows at the top, or Ctrl+Z / Ctrl+Shift+Z. You can undo as far back as you like (up to 100 steps).
- **Zoom:** the slider at the bottom right of the timeline zooms in and out. **Markers:** press **M** to drop a marker at the playhead.
- **Play / pause:** press **Space**, or the play button under the preview. The preview on the right shows your video as you edit.
- Your work saves itself every few seconds. If the browser closes by accident, Vidora offers to bring your project back when you reopen it.

## 4. The left tabs — what each one does

| Tab | What it does |
|---|---|
| Media | Your imported files, folders, search, backgrounds. |
| Audio | Music and sound effects Vidora made, your imported audio, voiceover recording, beat tools, mixer. |
| Text | Add text on top of your video — pick a style, font, size, colour, animation. |
| Stickers | 232 stickers (original drawings) — click one to add it; pick a motion preset to make it move. |
| Effects | 62 effects (colour, light, distort, stylize, retro, motion) — click one to apply it to the selected clip; sliders change how strong it is. |
| Transitions | 32 ways to move from one clip to the next — select the second clip, pick one, set its length. |
| Captions | Words on screen that match the speech — auto, manual, or import a .srt / .vtt / .ass file. |
| Filters | 32 ready-made looks (LUTs) — click one to apply it; the slider blends it in. |
| Adjustment | Brightness, contrast, colour, curves, HSL, colour wheels, blend mode, masks, chroma key (green screen), PiP / split-screen, lens correction. |
| Templates | 35 ready-made video layouts — pick one, choose your own clip for each slot, click **Use template**. |
| AI Tools | The AI library plus 15 AI tools (see §7). |

## 5. Text and captions

- **Text:** Text tab → type your words → pick a style. Drag the text on the preview to move it. In the right panel you can change the font, size, colour, outline, shadow and animation (in/out/loop).
- **Captions:** Captions tab → **Auto captions** writes words from the speech (needs the Vosk model downloaded once — see §7), or **Add cue at playhead** to type them yourself. **Import caption file** takes .srt, .vtt or .ass files. (.ass styles are not imported — cues use the style you picked. .lrc files are not supported.)
- **Translate:** pick a language in a cue and click Translate to get a draft in that language.

## 6. Audio

- **Volume:** select a clip → right panel → Volume slider. Drag the line on the clip itself to change volume over time (keyframes). Fade in / Fade out are there too.
- **Separate audio:** right-click a video clip → "Separate audio" — the sound moves to its own track and the video goes silent.
- **Voice changer:** 8 voices in the audio inspector (preview only — they do not survive export, the panel says so).
- **Mixer:** with no clip selected, the right panel shows the mixer — master volume, ducking (music drops under a voice), mute/solo per track.
- **Voiceover:** Audio tab → Voiceover → Record. Your voice lands on the timeline at the playhead.
- **Beats:** "Detect beats" finds the beats in a music clip; "Cut at beats" splits the clip there.

## 7. AI tools

All AI tools run on your computer — nothing is sent to the internet.

- **AI Captions:** writes captions from speech. Needs the Vosk model: run `tools/download-models.sh` once (about 41 MB).
- **Narration:** turns typed text into a spoken audio clip. Needs the Piper voice (about 63 MB, same script).
- **Smart Cut:** finds silent parts and filler words and offers to cut them (you review before anything is cut).
- **Auto Reframe:** re-crops your video for vertical (9:16), square (1:1) or wide (16:9).
- **Background Removal:** removes a plain background from a clip (edge-based, not a person model — the panel says so).
- **Camera Tracking:** follows something that moves and writes the same tracking points as manual tracking.
- **Stabilize:** steadies a shaky clip (fixes movement, not rotation or rolling-shutter wobble).
- **Enhance:** brightens dark clips, retouches skin, relights.
- **AI Movement:** camera moves (pan, zoom, …) written as ordinary keyframes you can edit afterwards.
- **Optical Flow:** makes slow motion smoother by building in-between frames.
- **Vocal Isolation:** splits a clip's sound into voice and music (centre-channel stems, not ML separation).
- **Auto Highlights:** picks the best moments and builds a short reel, or keeps only the highlights.
- **Script-to-Video:** one line of your script = one scene, with visuals, text and narration cues.
- **Upscale to 4K:** makes a bigger copy (resample + sharpen — it cannot recover detail that was never there).
- **Providers:** Local is ready. OpenAI / Stability / Replicate are listed but not set up — no keys are stored and no cloud call is made.

## 8. Export — getting your finished video

1. Click **Export** at the top right.
2. **Download** tab: pick Resolution (360p–4K), Quality (Fast / Recommended / High), Frame rate (24/25/30/50/60), Format (MP4 / MOV / WebM). Click **Export**. The job runs in the background — you can keep editing. When it says Done, the file downloads.
3. **More export kinds:** audio-only WAV, animated GIF (10 fps, 320 px, first 30 s, no audio), PNG image sequence, cover frame.
4. **Share for review:** adds a comment at the playhead; people you share the file with can see it. Comments show as amber markers on the timeline ruler — click one to jump to it.
5. **Share as presentation:** a fullscreen watch-only player (Esc exits).
6. **Share on social:** opens YouTube / TikTok / Facebook Page upload with your caption. Instagram has no web upload, so it copies the caption instead. "Free Schedule" is off — there is no connected account.

Honest limits, also shown in the panel: no H.265 (no browser encoder exists), no MP3, voice-changer voices are preview-only, reversed clips are silent, and finished files live in memory only — download them again before you close the app if you need another copy.

## 9. Backup and restore

- Dashboard → **Backups** → pick a project → **Back up this project**. A `.vidora` file downloads. Keep it somewhere safe (for example, Google Drive).
- To bring it back: Backups → **Import a .vidora file**. Vidora re-links your media by file name + size — so keep the original video files too (the bundle does not contain them).
- A backup also records who the project is shared with and its review comments.

## 10. Accounts — Owner and Customer

- Dashboard → **Account**. Accounts live only on this computer. There is no cloud sign-in and no Google sign-in.
- The **first** account you create is the **Owner**. Every account after that is a **Customer** — read-only: a Customer can watch, comment and share, but cannot change the project, create/rename/delete projects, or export. If you are not signed in at all, everything works as normal.
- Sign up with a name, an email and a password (at least 8 characters). Passwords are stored as a salted hash, never as plain text. If you forget a password, there is no reset — make a new account (the first account on an empty system is always Owner).
- **Plans:** everyone is on Free — everything is included, nothing is charged. Pro is listed but not available in this build.

## 11. Settings

Click the **"…"** menu at the top right, then **Settings** (or the gear on the dashboard).

- **Language:** English, Urdu, Hindi, Arabic. Arabic flips the whole app right-to-left.
- **Theme:** Dark or Light.
- **Input preferences:** Default or Left-handed mouse (reverses timeline scroll direction).
- **Task bar / Sidebar:** hide the top bar or the left tab rail for more room.
- **Show the tour again / Help:** the first-run tour and this guide's 10 steps.
- **Reset all settings:** puts Language, Theme, task bar, sidebar and input back to defaults (it does not touch your projects or accounts).
- **Feature usage:** what is included in Free (everything) — Pro is not available.
- **Diagnostics:** recent errors (logged on this computer only) with Copy / Clear. "Count how I use Vidora" is off by default — turning it on counts, locally only, how many projects you created and exports you finished. Nothing is ever sent anywhere.

## 12. Keyboard shortcuts

| Key | What it does |
|---|---|
| Space | Play / pause |
| S | Split clip at playhead |
| M | Add marker |
| Delete | Delete selected clip |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo |
| Ctrl+A | Select all clips |
| Ctrl+C / Ctrl+V | Copy / paste clip |
| Ctrl+D | Duplicate clip |
| Ctrl+Shift+S | Separate audio |
| ← / → | Move playhead one frame |
| Esc | Close dialog / leave presentation mode |

You can change them: open the Shortcuts panel (top bar, keyboard icon) and click any shortcut to rebind it.

## 13. If something goes wrong

- **"No errors recorded" but the app looks stuck:** reload the page — autosave brings your project back. If a project will not open, use a `.vidora` backup (see §9).
- **Export is slow:** 4K with High quality is the slowest. Try 1080p / Recommended for a first check.
- **A file will not import:** Vidora takes video, image, audio and GIF. Anything else is rejected with a reason. Very large files take a while to probe — wait for the thumbnail to appear.
- **AI captions say the model is missing:** run `tools/download-models.sh` from the Vidora folder (needs internet once, about 41 MB for Vosk, 63 MB for Piper).
- **Something looks wrong in the preview:** check the clip is not muted/hidden (track header buttons), and that an effect or adjustment on the clip is not the cause — select the clip and look at the right panel.
- **Errors:** Settings → Diagnostics shows the recent errors with their messages. Copy them if you need to report a problem.
