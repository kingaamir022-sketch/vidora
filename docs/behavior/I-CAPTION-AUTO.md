# I-CAPTION-AUTO — Auto captions
- **Phase:** 3
- **Reference behaviour:** The Captions tab has an "Auto captions" button at the top of its left list, and a bottom bar with "Delete current captions" and "Generate captions" buttons (desktop screenshot 26). RESOLVED (Web, signed-in full walkthrough 2026-11-23): the Web Captions panel offers "Auto captions (Free)" — "Automatically recognize speech in videos", a language dropdown (English (US)), and a Generate button marked "1 use/month"; "Auto lyrics" — recognize lyrics in songs, with a language dropdown and a Generate button. Still unknown: how desktop auto captions actually work — which engine, which languages are offered on desktop, whether generation needs a sign-in or a network call, how long it takes, whether it produces word-level timing or only cue-level text, and what happens when there is no speech or no media. Vidora's Phase 3 engine is an HONEST SUBSTITUTE, labelled in the UI: there is no offline Whisper model in this build, so Generate times a transcript the user pastes — it distributes the words evenly across the selected clip's duration (or the whole project) with word-level timing. Real speech-to-text (Whisper) is Phase 7.
- **Where it lives:** Auto captions section of the Captions panel (`src/components/CaptionsPanel.tsx`); timing in `src/lib/captions.ts` (`transcriptToCues`, `retimeWords`); word-level highlight in `src/components/PreviewArea.tsx` (`drawCaptionOverlay`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Caption language | — | — | English | — | English, Urdu, Hindi, Arabic, Spanish, French, German, Portuguese, Turkish, Bengali |
| Text area | Transcript | — | — | empty | — | Paste or type what is said |
| Button | Generate captions | — | — | — | — | Disabled until the transcript is non-empty |
| Button | Delete current captions | — | — | — | — | Removes all cues (also in the Manual section) |

## Interactions
In the Captions panel pick a language, paste/type the transcript, click "Generate captions" — cues appear across the selected clip (or the whole project when nothing is selected), and the preview highlights each word as the playhead passes it.

## States
No transcript: Generate is disabled. Cues are generated 8 words per cue (or at sentence ends). The active cue is highlighted in the cue list and the active word is highlighted in the preview.

## Result
Caption cues with word-level timing are stored at project level (`project.captions`), undoable and autosaved; the preview shows the active cue in the active caption style with the current word highlighted.

## Edge cases
An empty transcript generates nothing. A transcript with no spaces is one word. Generation always replaces nothing — new cues are appended and sorted by start time.

## Evidence
Desktop screenshot 26-editor-captions.png ("Auto captions" button, "Generate captions" + "Delete current captions" bottom bar; viewed directly) · WEB-CHECK-2026-11-23.md §4 (Auto captions, language + Generate) · FULL-WALKTHROUGH-2026-11-23.md (Auto captions (Free), "1 use/month" on Generate; Auto lyrics = recognize lyrics in songs) · `src/lib/captions.ts` (`transcriptToCues`), `src/components/CaptionsPanel.tsx`

## Status
ASSUMED — Web auto-captions structure is now known (Free, language picker, Generate "1 use/month", Auto lyrics); the desktop engine, timing and language list are still unknown, and Vidora's pasted-transcript timing is the chosen honest substitute (real Whisper is Phase 7).
