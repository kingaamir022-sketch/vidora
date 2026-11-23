# J-VOICEOVER — Voiceover recording (microphone → timeline)
- **Phase:** 4
- **Reference behaviour:** The reference home page has a "Voice Studio" (AI voice tools) and the Text inspector has a "Text to speech" section, but NO in-editor microphone voiceover recording was observed in the signed-in Web walkthrough or the desktop screenshots. Voiceover recording is a Section J requirement, built to the standard shape (record → stop → clip on the timeline). ASSUMED.
- **Where it lives:** "Voiceover" section at the bottom of the Audio panel (`AudioPanel.tsx`); recording via `getUserMedia` + `MediaRecorder` in `src/lib/audio.ts` (`startVoiceoverRecording`); store action `addVoiceoverClip()` in `src/store/projectStore.ts` (creates the media item + audio clip, undoable).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Record voiceover | — | — | — | — | Requests microphone permission on first use |
| Button | Stop and add to timeline | — | — | — | — | Shown while recording, with a running timer |
| Text | Status line | — | — | — | — | Idle / "Recording 00:07" / error text |

## Interactions
- Click Record: the browser asks for microphone permission; on grant, recording starts (red dot + timer). Click Stop: the recording is saved as "Voiceover HH:MM" audio and added as an audio clip on the first free audio track at the playhead, then selected.
- The recorded clip is a normal audio clip afterwards (volume, fades, trim, delete all work).

## States
- Permission denied: "Microphone access was denied — allow it in your browser's site settings and try again." (No retry loop; the button stays usable.)
- No microphone / `getUserMedia` unavailable: the section shows "Microphone recording is not available in this browser." and the button is disabled.
- Not HTTPS / insecure context: same unavailable state (getUserMedia requires a secure context).

## Result
A recorded voiceover lands on the timeline at the playhead with its real duration; waveform peaks are computed from the recording like any import.

## Edge cases
- Recording while the preview is playing: the preview keeps playing; the voiceover starts at the playhead position when recording started (the playhead may have moved — the clip is placed at the playhead where Stop was pressed).
- Very short recordings (< 1 s and under 1 KB): discarded with the note "Recording too short — nothing saved."
- Recordings whose duration cannot be probed (MediaRecorder webm often has no finite duration in a plain audio element): the recorded seconds are used instead, so the clip is never dropped (see `addVoiceoverClip` in the store).
- Stopping twice / recording twice in a row: each Stop creates its own clip; the recorder resets cleanly.

## Evidence
No reference UI (Section J requirement) · `src/lib/audio.ts`, `src/store/projectStore.ts`, `src/components/AudioPanel.tsx`

## Status
ASSUMED — no in-editor voiceover recording was observed in the reference.
