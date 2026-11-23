# I-TRANSLATE — Caption translation
- **Phase:** 3
- **Reference behaviour:** UNKNOWN — the full signed-in walkthrough (2026-11-23 07:16–07:28 PKT, `docs/reference/capcut/FULL-WALKTHROUGH-2026-11-23.md`, "Still open") also found NO caption-translation UI anywhere in the reference — no translate button, language picker, or translated-cue view in the 30 desktop screenshots, the two Web checks, or the full signed-in walkthrough. Desktop evidence is still missing entirely, so the reference behaviour stays UNKNOWN. This card records the VIDORA implementation only. Vidora's implementation is deliberately honest manual translation: per cue, pick a target language, copy the source text as a starting point, type the translation, save it on the cue. The panel labels this plainly: machine translation needs a provider (Phase 7).
- **Where it lives:** Translation controls inside each cue card in the Captions panel (`src/components/CaptionsPanel.tsx`); stored on the cue (`cue.translations: Record<language, text>`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Translation language | — | — | Urdu | — | Same 10 languages as Auto captions |
| Button | Copy source | — | — | — | — | Copies the cue text into the translation draft |
| Text input | Translation text | — | — | — | — | Per cue, per language |
| Button | Save | — | — | — | — | Stores the translation on the cue |

## Interactions
In a cue card, pick a target language, click "Copy source" to start from the source text, edit it into the translation, click Save. Saved translations are listed on the cue card ("Translations: ur, hi").

## States
A cue with no saved translation shows only the Copy source button. The draft is per-cue and is discarded when the cue card is closed without saving (the draft lives in panel state, not the project).

## Result
The translation is stored on the cue in the project JSON, undoable and autosaved. Translations do not change what the preview shows (the source text renders); switching the preview to a translation is Phase 7 work.

## Edge cases
Saving an empty translation stores an empty string for that language. Saving twice for the same language overwrites. Deleting a cue deletes its translations with it.

## Evidence
No reference evidence found in desktop screenshots 01–30, WEB-CHECK-2026-11-22.md / WEB-CHECK-2026-11-23.md, or the full signed-in walkthrough 2026-11-23 (`docs/reference/capcut/FULL-WALKTHROUGH-2026-11-23.md`, "Still open") — translation is spec-built (SPEC I) and no reference translation UI has been found in any check so far · `src/components/CaptionsPanel.tsx`

## Status
UNKNOWN
