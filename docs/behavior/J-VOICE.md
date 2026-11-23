# J-VOICE — Voice changer (original presets, browser-based)
- **Phase:** 4
- **Reference behaviour:** The reference inspector's Audio section has a "Voice changer" sub-tab: a grid of voice effects, each with a headphone preview icon — None (selected) plus many named presets (Autotune, 3D Surround Sound, Valley, Teenager, Sweet, Energetic, Bass Boost, Deep, High, Low, Echo, seasonal/character voices, …) — plus "Apply to all". The preset NAMES are CapCut content; Vidora's presets are original and fewer, implemented with real Web Audio processing. The grid layout is replaced by a preset select in the clip Audio section (same choice, simpler control).
- **Where it lives:** Voice select in the clip Audio section (`PropertiesPanel.tsx`); preset definitions + Web Audio chain in `src/lib/audio.ts` (`VOICE_PRESETS`, `buildVoiceChain`); applied per clip by `src/lib/audioEngine.ts`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Voice changer | — | — | None | — | 8 original presets (below) |
| Button | Apply to all | — | — | — | — | Applies the current preset to every audio clip in the project |

## Presets (all original; each is a real Web Audio chain)
| Preset | Processing |
|---|---|
| None | No processing |
| Deep Voice | Pitch −4 semitones (modulated-delay pitch shifter) |
| Bright Voice | Pitch +6 semitones (modulated-delay pitch shifter) |
| Radio Booth | Bandpass ~300 Hz–3.4 kHz + gentle compression |
| Telephone | Bandpass 300 Hz–3.4 kHz, narrower, no compression |
| Cave Echo | Delay 0.28 s, feedback 0.35, wet 0.4 |
| Robot | Amplitude modulation ~30 Hz on the signal |
| Warm Studio | Low-shelf +4 dB at 200 Hz + gentle compression |

## Interactions
- Changing the preset rebuilds that clip's audio chain live (playback continues).
- "Apply to all" sets the same preset id on every audio clip (undoable, one commit).

## States
- Preset change while paused: applies on the next play.
- Pitch-shift presets carry the honest note: "Browser-based pitch shift — some artifacts on music."

## Result
The selected preset's chain sits between the clip's gain node and the master gain; removing the preset (None) removes the chain.

## Edge cases
- Pitch shift on a clip playing at a changed speed: the shifter runs after the element's rate change, so both apply (speed from the element, pitch shift from the chain).
- Voice changer on a video clip: applies to the clip's own audio (its video element is routed through the same chain).

## Evidence
FULL-WALKTHROUGH-2026-11-23.md (Audio inspector Voice changer grid + Apply to all; preset names are CapCut content) · `src/lib/audio.ts`, `src/lib/audioEngine.ts`

## Status
ASSUMED — the reference has a voice-changer grid; Vidora matches the structure (preset choice + Apply to all) with original presets and a select instead of a grid. Desktop voice-changer UI was never seen.
