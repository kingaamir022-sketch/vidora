# O-AI-VOICES — AI narration voices (Phase 6, Section O)
- **Phase:** 6 (Section O)
- **Reference behaviour:** CapCut's Text inspector has a TTS section and the Captions panel has AI avatars (FULL-WALKTHROUGH-2026-11-23.md, Text tab inspector; Phase 3 built browser TTS narration from this). Vidora's Voices section is the Phase 6 voice catalogue on top of that honest base: 16 voice presets — 4 languages (English, Urdu, Hindi, Arabic) × 4 roles (Narrator, Warm, Energetic, Calm) — each with pitch/rate and an original sample sentence in its language. Speaking uses the browser's speechSynthesis voices (same honest limit as Phase 3: quality depends on the device's installed voices; rendered TTS audio in export needs an offline engine, Phase 7). No voice is a recording of a real person; no artist or celebrity voices. ASSUMED — the reference TTS voice list was never observed in detail, so the catalogue shape is Vidora's own.
- **Where it lives:** `src/lib/voices.ts` (catalog + matching), Voices sub-tab in `src/components/AILibraryPanel.tsx`, narration creation via the store's `addTtsNarration` (same action the Captions panel uses).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Tabs | Language tabs | — | — | English | — | English / Urdu / Hindi / Arabic |
| Rows | Voice rows | — | — | — | — | Name, role, pitch, rate, sample sentence |
| Button | Preview | — | — | — | — | Speaks the sample sentence with the matched browser voice |
| Button | Add narration | — | — | — | — | Creates a narration text clip with this voice |
| Text input | Narration text | — | — | — | — | Text for the narration clip (uses the sample sentence when empty) |
| Text | Note | — | — | — | — | "Browser voices — quality depends on this device. Rendered voice audio in export arrives in Phase 7." |

## Interactions
- Pick a language tab: its 4 voice rows show. Click Preview: the sample sentence speaks once (previous preview stops). Type narration text (or leave empty for the sample sentence) and click "Add narration": a text clip with `tts: { voice, rate, pitch }` is added to the timeline and speaks during preview when the playhead enters it (Phase 3 behaviour).
- Voice matching: the preset's preferred browser voice is matched by language prefix, then by name, then first voice for the language (`pickVoice` in `src/lib/tts.ts`); when no browser voice exists for the language, Preview shows "No <language> voice on this device" and Add narration still works (the clip speaks when a voice is available).

## States
- No speechSynthesis (headless/test): Preview disabled with the note; Add narration still creates the clip.
- Empty narration text + empty sample: Add narration disabled.

## Result
A narration clip on the timeline that speaks its text during preview, with the chosen pitch/rate.

## Edge cases
- Urdu/Hindi/Arabic on a device with no such voices: the clip is created with the language tag and falls back to the default voice at preview time; the panel says so plainly.
- Very long narration text: the clip duration scales with the text (same rule as the Captions panel).

## Evidence
`src/lib/voices.ts`, `src/test/phase6.test.ts` (catalog shape, rate/pitch ranges, sample sentences present, matching fallback). Reference: FULL-WALKTHROUGH-2026-11-23.md (Text inspector TTS section).

## Status
ASSUMED
