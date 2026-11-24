# M-ASS — .ass caption import (Phase 9, Section M)

- **Phase:** 9 (built v1.0.0) — closes BUG-D11 (deferred since Phase 3).
- **Reference behaviour:** ASSUMED — CapCut's caption upload accepts .srt/.ass/.lrc (FULL-WALKTHROUGH-2026-11-23.md § Captions). Vidora now imports .ass alongside .srt/.vtt; .lrc stays unsupported and the panel says so.
- **Where it lives:** `src/lib/captions.ts` (`parseAss`, wired into `parseCaptionFile`); import accept list in the Captions panel (`src/components/CaptionsPanel.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| File input | Import captions | — | — | — | — | Accepts .srt, .vtt, .ass |
| Note | Format note | — | — | — | — | ".lrc is not supported in this build." |

## Interactions
- Pick a .ass file → its Dialogue lines become cues (Start/End times, text with `{\...}` override tags stripped, `\N` → line break, `\h` → space).
- Comment lines (`Comment:`) and non-Dialogue events are ignored, not errors.
- A file with no Dialogue lines → readable error "No dialogue lines found in this .ass file."
- Times use the `H:MM:SS.cc` format; the `[Events]` Format line defines the column order (the parser reads the Format line, it does not assume fixed columns).

## States
- Imported cues appear in the caption list and on the timeline exactly like .srt imports; styles (font/colour) are NOT imported — cues use the current caption style, and the panel says so.

## Result
.ass files from other tools now import as editable cues.

## Edge cases
- Dialogue with an empty Text field → skipped (no empty cue).
- Malformed time (`Start: bad`) → that line is skipped and the import continues; if every line is bad the error above is shown.
- `\N` inside a word → becomes a space, never a broken word.

## Evidence
ASS (Advanced SubStation Alpha) format: `[Script Info]`, `[V4+ Styles]`, `[Events]` with `Format:` + `Dialogue:` lines — standard documented format.

## Status
ASSUMED
