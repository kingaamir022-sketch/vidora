# Vidora Phase 4 — Self-Audit Report (Rule 12.4)

- Run: 2026-11-24T10:48:49.639Z
- App: production build served with `vite preview` on http://127.0.0.1:4173/
- Browser: Chromium headless shell (playwright-core 1.65.1), viewport 1440x900, fake media device for voiceover
- Checks: 31/31 passed, 0 failed

## Checks

- PASS [J-DETACH] video clip on timeline (detach target) — clips: 1
- PASS [J-AUDIO] Audio panel opens
- PASS [J-AUDIO] Music / Sound effects sub-tabs present
- PASS [J-AUDIO] Vidora Originals list shows Calm Pad
- PASS [J-AUDIO] Sound effects tab shows Soft Pop
- PASS [J-AUDIO] adding Calm Pad renders the original and adds an audio clip — clips: 1 -> 2
- PASS [J-INSPECTOR] Audio section appears in Properties
- PASS [J-INSPECTOR] fade-in sets to 1 s
- PASS [J-INSPECTOR] voice select sets Deep Voice
- PASS [J-INSPECTOR] Normalize reports the new volume
- PASS [J-MIXER] Mixer shows when no clip is selected
- PASS [J-MIXER] master volume slider present
- PASS [J-MIXER] track volume row present for Audio 1
- PASS [J-MIXER] ducking switch turns on
- PASS [J-MIXER] project summary shows 0 markers in a new project — markers: 0
- PASS [J-BEAT] beats wav added to timeline — clips: 3
- PASS [J-BEAT] Detect beats is enabled for the audio clip
- PASS [J-BEAT] beat detection reports found beats
- PASS [J-BEAT] Add beat markers adds markers to the project — markers: 0 -> 5
- PASS [J-DETACH] Ctrl+Shift+S separates audio onto its own track — clips: 3 -> 4
- PASS [J-DETACH] second video clip added for the menu check — clips: 5
- PASS [J-DETACH] Separate audio button shows for a video clip
- PASS [J-DETACH] context menu offers Separate audio (Ctrl+Shift+S)
- PASS [J-DETACH] context menu separates the audio — clips: 5 -> 6
- PASS [J-PITCH] Pitch switch stays on at 0.5x
- PASS [J-PITCH] speed note describes pitch-preserving playback
- PASS [J-VOICE] Robot voice preset selects
- PASS [J-VOICE] Apply voice to all audio button present
- PASS [J-VOICE] voice stays Robot after Apply to all
- PASS [J-VOICEOVER] recording state shows the timer
- PASS [J-VOICEOVER] stopping adds a voiceover clip to the timeline — clips: 6 -> 7

## Screenshots

Screenshots live in `audit/phase4/<behaviour-card-ID>/` (one folder per card).

## Verdict

**Zero open bugs.** All differences found during this audit were fixed before this report (see docs/BUGS.md).
