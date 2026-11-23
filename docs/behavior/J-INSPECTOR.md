# J-INSPECTOR — Clip audio inspector (volume, fades, EQ, noise, role)
- **Phase:** 4
- **Reference behaviour:** The reference right inspector has an "Audio" section with sub-tabs Basic / Voice changer. Basic: Volume slider + dB box (0 dB at default) with a reset icon and a keyframe (◇) button; "Fade in and out" — Fade-in duration slider (0 s), Fade-out duration slider (0 s); "Noise reduction" switch (Pro). The fade curve is not specified in the reference — Vidora uses a linear ramp (ASSUMED). Vidora adds a 3-band EQ, a clip Role selector, a Mute-clip toggle and Normalize — Section J requirements that the reference inspector does not show; they are marked as additions, not matches.
- **Where it lives:** Audio section of the right Properties panel (`src/components/PropertiesPanel.tsx`) for the selected audio or video clip; values live on the clip (`volume`, `fadeIn`, `fadeOut`, `muted`, `audioRole`, `eq`, `noiseReduction`, `voice`); gain math in `src/lib/audio.ts`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Slider + number | Volume | 0 | 2 | 1 | 0.05 | dB readout: 1 = 0 dB, 0 = −∞ dB; reset icon restores 1 |
| Button | Volume keyframe (◇) | — | — | — | — | Adds a volume keyframe at the playhead (existing keyframes engine); the Keyframes section below edits it |
| Slider | Fade in | 0 s | 10 s | 0 s | 0.1 s | Linear ramp from silence at clip start |
| Slider | Fade out | 0 s | 10 s | 0 s | 0.1 s | Linear ramp to silence at clip end |
| Select | Role | — | — | Music (audio clips) | — | Music / Voice / SFX; decides ducking (Voice ducks Music) |
| Slider ×3 | EQ Low / Mid / High | −12 dB | +12 dB | 0 dB | 1 dB | Biquad filters (lowshelf 200 Hz / peaking 1 kHz / highshelf 4 kHz) |
| Switch | Noise reduction | — | — | off | — | Gate + high-pass filter; honest note below |
| Toggle | Mute clip | — | — | off | — | Silences only this clip (track mute is separate) |
| Button | Normalize | — | — | — | — | Audio clips only; sets volume so the clip peak hits −1 dBFS from the media peak level; disabled with a note when the peak level is unknown |
| Button | Separate audio | — | — | — | — | Video clips only (see J-DETACH) |
| Select | Voice changer | — | — | None | — | See J-VOICE; "Apply to all" button beside it |

## Interactions
- Every control applies live during playback; all are undoable.
- Volume keyframe button: if a volume keyframe already exists at the playhead, it selects the Keyframes section instead of adding a duplicate.
- Normalize: shows the applied gain ("Volume set to 1.42×") after it runs.

## States
- Video clip selected: the same Audio section appears (its audio is the clip's own sound); Role defaults to Voice for ducking.
- Image/text/sticker clip selected: no Audio section (the clip has no sound).
- Noise reduction note (always visible under the switch): "Gate + high-pass filter — removes low rumble and quiets hiss between sounds. Not spectral cleanup."

## Result
Effective clip gain at time t = volume × keyframeVolume(t) × fadeGain(t) × trackVolume × masterVolume × duckFactor, where fadeGain ramps 0→1 over fadeIn from the clip start and 1→0 over fadeOut before the clip end (linear; fades longer than the clip clamp to the clip length).

## Edge cases
- Fade in + fade out longer than the clip: both ramps meet in the middle; gain never exceeds 1 from fades.
- Volume 0 + fades: stays silent.
- Normalizing a clip whose peak level is 0 (silent file): no change, note shown.
- Reversed clips: audio is muted (media elements cannot play reversed audio); the video still reverses visually — noted in the inspector.

## Evidence
FULL-WALKTHROUGH-2026-11-23.md (Audio inspector Basic: volume slider + dB box + reset + keyframe, fades 0 s, noise reduction Pro switch) · `src/components/PropertiesPanel.tsx`, `src/lib/audio.ts`

## Status
MATCH for volume/fade/noise-reduction structure (observed in the reference); ASSUMED for the linear fade curve and for the EQ/Role/Mute/Normalize additions (Section J requirements, not in the reference inspector).
