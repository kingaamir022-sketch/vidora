# K-STT — AI captions / speech-to-text (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** CapCut's Captions tab offers Auto captions (language picker, generates timed cues from the clip's speech) and the home "Magic tools" list includes "AI captions". Vidora's Auto captions previously timed a pasted transcript only (BUG-D8). Phase 7 adds real speech-to-text in two honest paths: (1) in-app dictation via browser speech recognition (Chrome `webkitSpeechRecognition` — it listens to the MICROPHONE, not to a clip file, so the user speaks the transcript and it becomes timed captions; the panel says this plainly); (2) an offline pipeline `tools/transcribe.py` (Vosk, Apache-2.0 model, CPU-only) that transcribes an audio file to word-timed SRT/JSON, importable with the existing SRT import. The panel says plainly which path is which and that the pasted-transcript path is still there. ASSUMED — the reference auto-caption flow (language pick → generate → timed cues) is matched; the engines are Vidora's own.
- **Where it lives:** `src/components/AIToolsPanel.tsx` (AI Captions section), `src/lib/aiTools.ts` (`transcribeWithBrowser`, `applyTranscriptToCues`), `tools/transcribe.py`, `tools/models/vosk-en-small` (downloaded, not in GitHub/Drive).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Language | — | — | English | — | en/ur/hi/ar/es/fr/de/pt/tr/bn (same list as captions) |
| Button | Dictate transcript (microphone) | — | — | — | — | Browser speech recognition on the microphone |
| Text | Status line | — | — | — | — | "Listening…", result count, or why it is unavailable |
| Button | Import SRT / Vosk JSON | — | — | — | — | Existing caption import; Vosk JSON converts to cues |
| Note | Honest note | — | — | — | — | Dictation hears the mic, not the clip; file transcription is the Vosk script |

## Interactions
- Pick a language, click "Dictate transcript (microphone)", speak, click "Stop": the heard words become caption cues on the project (same `transcriptToCues` shape). If `webkitSpeechRecognition` is missing, the button is replaced by a note pointing at the Vosk script.
- Vosk path: run `python3 tools/transcribe.py clip.mp3` → `clip.srt` + `clip.words.json`; import the SRT in the Captions tab. Word timings come from the recogniser, not even spreading.
- Nothing heard: "Nothing heard — no captions added."

## States
- No clip selected: section explains to select a clip first.
- Browser unsupported: disabled button + note.
- Recogniser error (network/service): readable error, nothing added.

## Result
Timed caption cues appear in the project (editable in the Captions tab, SRT/VTT export works).

## Edge cases
- Clip longer than 2 min: browser recognition restarts in chunks; the panel notes chunking.
- Non-speech clip (music only): no cues, "No speech detected."
- Recognition returns partial words only: cues use what was returned; the panel says to check them.

## Evidence
`tools/transcribe.py`, `tools/README.md`, `src/lib/aiTools.ts`. Pipeline verified by the Piper→Vosk loop test (see `tools/test_pipeline.sh`).

## Status
ASSUMED
