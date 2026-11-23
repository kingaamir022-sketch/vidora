# I-CAPTION-STYLE — Caption style presets
- **Phase:** 3
- **Reference behaviour:** The Captions tab has a "Templates" section (Favorites, Trending, Classic, NEW, Hits, Word) with a grid of caption style cards — each a rendered sample of the style with a star (favourite) and a download icon — plus an "Auto lyrics" section below the list (desktop screenshot 26). The full signed-in walkthrough (2026-11-23) confirms "Auto lyrics" means: recognize lyrics in songs (language dropdown, Generate button). The bottom bar has "Delete current captions" and "Generate captions". UNKNOWN — desktop evidence still missing: how a desktop caption style is applied (click? drag onto the timeline?); whether a style applies to all cues or one cue; whether desktop styles have adjustable properties (colour, size, position); what the star/download icons do. All Vidora caption style names and designs are ORIGINAL — no reference style names are copied.
- **Where it lives:** Caption styles section of the Captions panel (`src/components/CaptionsPanel.tsx`); presets in `src/lib/captions.ts` (`CAPTION_STYLE_PRESETS`, `captionStyleById`); rendering in `src/components/PreviewArea.tsx` (`drawCaptionOverlay`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Buttons | Caption styles (8) | — | — | Classic Box | — | Each shows a live sample swatch of the style |
| Note | Active style | — | — | — | — | Panel names the active style |

## Interactions
Click a style to make it the project's active caption style — every cue renders in it unless a cue picks its own style. The preview updates at once.

## States
8 original styles: Classic Box, Plain White, Violet Pop, Gold on Black, Cyan Top, Big Centre, Paper, Terminal Green. Each defines colour, background, font size and position (top / center / bottom).

## Result
The active cue renders in the active style on the preview, with the current word highlighted; the style id is stored on the project, undoable and autosaved.

## Edge cases
A cue with an unknown style id falls back to Classic Box. A cue-level style id overrides the project style for that cue only.

## Evidence
Desktop screenshot 26-editor-captions.png (Templates section + style grid with star/download icons, "Auto lyrics"; viewed directly) · FULL-WALKTHROUGH-2026-11-23.md (Auto lyrics = recognize lyrics in songs) · `src/lib/captions.ts` (`CAPTION_STYLE_PRESETS`)

## Status
MATCH
