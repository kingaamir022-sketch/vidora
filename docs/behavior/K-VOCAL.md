# K-VOCAL — Vocal isolation / stem separation (Phase 7, Section K)
- **Phase:** 7 (Section K)
- **Reference behaviour:** No vocal-isolation UI was observed in CapCut Web; Section K requires it and Phase 4 deferred it (BUG-D12: needs an ML model, not faked). Vidora's version is a real centre-channel technique, not ML: in most mixed music the lead vocal is panned centre while instruments spread wide, so mid = (L+R)/2 estimates the centred content (voice + centred instruments) and side = (L−R)/2 estimates the wide content (music without the centre). "Isolate voice" renders the mid stem, "Remove voice" renders the side stem, both as new WAV audio clips. The panel says plainly that this is centre-channel separation, not ML stem separation, and that it works best on centre-panned vocals. ASSUMED — the method is the standard karaoke/centre-extraction technique; the result is a real stem file, honestly labelled.
- **Where it lives:** `src/lib/aiTools.ts` (`centerChannelStems`), `src/components/AIToolsPanel.tsx` (Vocal Isolation section), `src/lib/audio.ts` (`encodeWav`, reused), schema `clip.aiVocalMode` ('none' | 'voice' | 'music').

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Mode | — | — | Isolate voice | — | Isolate voice / Remove voice (keep music) |
| Button | Render stem | — | — | — | — | Decodes the clip, renders a WAV, adds it as media |
| Note | Honest note | — | — | — | — | Centre-channel separation, not ML; centred instruments stay in the voice stem |

## Interactions
- Select an audio clip (or a video clip with audio), pick a mode, click "Render stem": the panel decodes the audio, computes the stem, and adds a new audio media item "… (voice stem)" / "… (music stem)" plus a clip on the first free audio track. The original clip is untouched.
- The stem clip is a normal audio clip (volume, fades, EQ all work).

## States
- No audio clip selected: "Select an audio clip first."
- Mono audio: centre separation is meaningless — the panel refuses with "This clip is mono; centre separation needs stereo."
- Render running: progress line.

## Result
A new WAV stem clip on the timeline.

## Edge cases
- Clip with the vocal panned off-centre: the voice stem is weak; the note explains why.
- Very long clip (> 5 min): the panel warns about render time and offers to split first.
- Video clip selected: only its audio is used; the stem is audio-only.

## Evidence
`src/lib/aiTools.ts`, `src/test/phase7.test.ts` (synthetic stereo: centre sine → voice stem, side sine → music stem).

## Status
ASSUMED
