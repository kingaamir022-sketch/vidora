# I-TTS — Text-to-speech
- **Phase:** 3
- **Reference behaviour:** The Web Text inspector has a "Text to speech" section (WEB-CHECK-2026-11-23 §2) — its contents were not opened during the check. The full signed-in walkthrough (2026-11-23) adds: "Text to speech" is also a home-level Magic tool, and "Voice Studio (AI voice tools)" sits under Create with AI — but the Text inspector's Text-to-speech section contents were still not opened. UNKNOWN — desktop evidence still missing: the DESKTOP text-to-speech UI (no desktop screenshot shows it); which voices/languages desktop offers; whether desktop TTS previews in the app or only renders on export; whether a TTS clip appears on the timeline and how it behaves. Vidora's Phase 3 implementation is honest browser TTS: type narration text, pick a browser voice (speechSynthesis), set rate/pitch, Preview speaks it, "Add narration clip" creates a text clip flagged as narration that speaks once when the playhead enters it during preview. The panel labels the limit plainly: rendered TTS audio in export needs an offline TTS engine (Phase 4/7).
- **Where it lives:** Text-to-speech section of the Captions panel (`src/components/CaptionsPanel.tsx`); voice helpers in `src/lib/tts.ts` (`pickVoice`, `voiceInfos`, `shouldSpeak`, `narrationClipAt`); speak-on-enter in `src/components/PreviewArea.tsx`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text area | Narration text | — | — | empty | — | The words to speak |
| Select | Voice | — | — | Default voice | — | Browser speechSynthesis voices; "(none available in this browser)" when empty |
| Slider | Rate | 0.5 | 2 | 1 | 0.1 | × speed |
| Slider | Pitch | 0.5 | 2 | 1 | 0.1 | |
| Button | Preview voice | — | — | — | — | Speaks the text now via speechSynthesis |
| Button | Add narration clip | — | — | — | — | Adds a text clip with the TTS settings stored (duration scales with word count, 3–30s) |

## Interactions
Type the narration, pick a voice, adjust rate/pitch, click "Preview voice" to hear it. Click "Add narration clip" — a text clip appears at the playhead; during preview playback it speaks once when the playhead enters it. Pausing or seeking cancels the speech.

## States
No browser voices: the voice dropdown says so and Preview reports "Speech synthesis is not available in this browser." A narration clip shows its voice/rate in the Properties panel.

## Result
The narration clip is stored in the project JSON (text + voice/rate/pitch), undoable and autosaved; it speaks during preview only — export has no TTS audio yet (labelled, Phase 4/7).

## Edge cases
Empty narration text disables both buttons. A stored voice name that no longer exists falls back to the browser default. Speaking is cancelled when a new narration starts or playback pauses.

## Evidence
WEB-CHECK-2026-11-23.md §2 ("Text to speech" inspector section listed, contents not opened) · FULL-WALKTHROUGH-2026-11-23.md ("Text to speech" is a home-level Magic tool; "Voice Studio (AI voice tools)" under Create with AI; inspector contents still not opened — no desktop screenshot shows TTS) · `src/lib/tts.ts`, `src/components/CaptionsPanel.tsx`

## Status
UNKNOWN
