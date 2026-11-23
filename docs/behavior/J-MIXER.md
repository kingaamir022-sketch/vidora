# J-MIXER — Audio mixer panel
- **Phase:** 4
- **Reference behaviour:** The reference has NO mixer panel (no master volume, no per-track volume, no solo). The mixer is Vidora's own panel, built to the industry-standard shape (master fader + one strip per track with volume, mute and solo) because Section J requires a multi-track mixer. ASSUMED.
- **Where it lives:** Right Properties panel when no clip is selected (`src/components/MixerPanel.tsx`, rendered by `PropertiesPanel.tsx`); opened from the Audio panel's "Open mixer" button (which clears the selection) and from the timeline toolbar's mixer button. Mixer settings live in the project JSON (`project.mixer`: masterVolume, ducking, duckAmountDb).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Slider | Master volume | 0 | 2 | 1 | 0.05 | Applies to all audio; dB readout next to it (1 = 0 dB) |
| Switch | Duck music under speech | — | — | off | — | When on, Music-role clips drop by the duck amount while any Voice-role clip (or video clip audio) is sounding |
| Slider | Duck amount | 0 dB | 24 dB | 12 dB | 1 dB | Only enabled while ducking is on |
| Per-track row | Track name | — | — | — | — | One row per track that has audio (audio tracks + video tracks with clips) |
| Slider | Track volume | 0 | 2 | 1 | 0.05 | Multiplies every clip on that track |
| Toggle | Mute (🔊/🔇) | — | — | off | — | Same control as the track-header mute; they stay in sync |
| Toggle | Solo (S) | — | — | off | — | Only soloed tracks sound while any solo is on |

## Interactions
- Drag any slider: the change applies live during playback (no restart).
- Mute/Solo toggles take effect immediately, including mid-playback.
- Track rows appear/disappear as tracks are added or removed.

## States
- No tracks with audio: "No audio tracks yet — import audio or add a video clip."
- Solo active: non-soloed rows show a dimmed "soloed out" note.

## Result
Audibility rule (engine, `src/lib/audio.ts` `isTrackAudible`): if any track is soloed, a track sounds only when `solo && !muted`; otherwise a track sounds when `!muted`. Effective clip gain = clip volume × keyframe volume × fade gain × track volume × master volume × duck factor (× 0 when muted/soloed-out).

## Edge cases
- A track that is both muted and soloed is silent (mute wins on that track).
- Master volume 0 silences everything but does not stop playback.
- Mixer settings are per-project and undoable (stored in project JSON, committed like any edit).

## Evidence
No reference panel (Vidora-designed, industry standard) · `src/components/MixerPanel.tsx`, `src/lib/audio.ts`, `src/lib/audioEngine.ts`

## Status
ASSUMED — no mixer exists in the reference; shape follows the standard mixer layout.
