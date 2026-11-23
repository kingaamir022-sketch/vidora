# H-TEXT — Text panel & text inspector
- **Phase:** 3
- **Reference behaviour:** The Text tab opens a panel with three sub-tabs: "Templates", "Effects" and "AI text FX" (full signed-in walkthrough 2026-11-23 — "AI text FX" shows no items until a text clip is selected; it generates AI text effects; a "New feature!" tooltip advertises creating custom text effects). Templates has a "Basic" section with "Add heading" and "Add body text" buttons, "All"/"Commercial" filters, then horizontal template rows. Clicking "Add heading" places the text centred on the canvas and a text clip on the timeline (00:03:00). A right-hand inspector appears with Presets, Basic, Text to speech, AI avatars and Animation. Basic controls: editable text field, font dropdown (default "Default"), size 20, Bold/Italic/Underline, alignment, line spacing, Fill, Stroke, Background, Shadow, Glow toggle, Opacity 100% slider, Transform (Scale 100%, Position X/Y, Rotate 0°) and an "Apply to all" checkbox. UNKNOWN — desktop evidence still missing: what the Text tab looks like on DESKTOP (no desktop screenshot exists — this is Web evidence only); the desktop font list and default font; what "Add heading" puts as default text and size on desktop; how the "All"/"Commercial" filters change the template rows; the Text-to-speech and AI avatars inspector sections (see I-TTS and K-AI-AVATAR).
- **Where it lives:** Text left panel (`src/components/TextPanel.tsx`); text inspector in the right Properties panel (`src/components/PropertiesPanel.tsx`); rendering in `src/components/PreviewArea.tsx` (`renderTextFrame`); styles in `src/lib/text.ts`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Sub-tabs | Templates / Effects / AI text FX | — | — | Templates | — | Templates and Effects show the Basic add-text buttons; AI text FX needs a text clip selected (reference) — Vidora's third sub-tab lists AI text effects as Phase 7 (honest label) |
| Button | Add heading | — | — | — | — | Adds a 3s text clip at the playhead, centred |
| Button | Add body text | — | — | — | — | Adds a 3s text clip at the playhead, centred |
| Text input | Text content | — | — | Heading | — | Editable in the Properties inspector |
| Select | Font | — | — | Vidora Sans (system) | — | System stacks only; custom font upload via file input (FontFace API) |
| Number | Size | 8 | 200 | 20 | 1 | px |
| Toggle | Bold / Italic / Underline | — | — | off | — | Three toggle buttons |
| Toggle | Align left / center / right | — | — | center | — | Three toggle buttons |
| Number | Line spacing | 0.8 | 3 | 1.2 | 0.1 | |
| Colour | Fill | — | — | #FFFFFF | — | Solid or gradient (3 original gradients) |
| Colour | Stroke colour | — | — | #000000 | — | With width below |
| Number | Stroke width | 0 | 20 | 0 | 1 | px; 0 = no stroke |
| Colour | Background box | — | — | transparent | — | Box colour + padding |
| Number | Box padding | 0 | 60 | 8 | 1 | px |
| Toggle | Shadow | — | — | off | — | Colour, blur 0–50, offset X/Y ±50 |
| Toggle | Glow | — | — | off | — | Colour, blur 0–60 |
| Number | Opacity | 0 | 1 | 1 | 0.05 | Clip opacity (also in Transform) |
| Number | Scale / Position X/Y / Rotate | 0.05–10 / ±100 / ±360 | — | 1 / 0 / 0 | — | Reuses the Transform section |
| Button | Apply to all text clips | — | — | — | — | Applies the current style (not content) to every text clip |

## Interactions
Open the Text tab, click "Add heading" or "Add body text" (or a template row) — a 3s text clip appears at the playhead and is selected; edit its text and style in the right Properties panel. The preview renders the text with fill/stroke/shadow/glow/background box, alignment, line spacing and word wrap live.

## States
No text clip selected: the inspector shows the clip-independent panel note; the Text panel still offers Add heading/body and template rows. A custom uploaded font works in the session only — the project stores only the font name, and the panel says so.

## Result
Text clips render centred on the preview with the full style applied; the style is stored on the clip in the project JSON, undoable and autosaved.

## Edge cases
Empty content renders nothing (a blank clip). Font size clamps 8–200. A gradient fill replaces the solid fill; choosing a solid colour clears the gradient. "Apply to all" keeps each clip's own text content.

## Evidence
WEB-CHECK-2026-11-23.md §2 (Text tab — Templates/Effects sub-tabs, Basic controls, inspector) · FULL-WALKTHROUGH-2026-11-23.md (third sub-tab "AI text FX", "New feature!" custom text effects tooltip; no desktop screenshot of the Text tab exists) · `src/components/TextPanel.tsx`, `src/components/PropertiesPanel.tsx` (Text section), `src/lib/text.ts`

## Status
MATCH
