# H-TEXTSTYLE — Original text style presets
- **Phase:** 3
- **Reference behaviour:** The Text panel shows template rows by category under the Basic add-text buttons (Web: rows Trending, Classic, Hits, B.Duck, Nailoong, Free Fire, Icons, Title, 3D, Retro; the Effects sub-tab shows style rows Trending, Black Friday, Classic, Hits, B.Duck, Food, Textile Art, Manuscript, Metal). The full signed-in walkthrough (2026-11-23) adds: rows have a "Favorites" section, "View all" links and carousel arrows; a third sub-tab "AI text FX" generates AI text effects once a text clip is selected. Clicking a template applies its style. The right inspector has a Presets section. UNKNOWN — desktop evidence still missing: the DESKTOP template categories and rows (no desktop screenshot of the Text tab exists); what a desktop template row shows (thumbnail? name?); whether desktop presets carry extra properties Vidora does not have (e.g. per-preset animation). All Vidora preset names, colours and styles are ORIGINAL — no reference template names are copied.
- **Where it lives:** Text left panel (`src/components/TextPanel.tsx`); preset definitions in `src/lib/text.ts` (`TEXT_STYLE_PRESETS`); inspector preset buttons in `src/components/PropertiesPanel.tsx`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Buttons | Text templates (14 presets) | — | — | — | — | Grouped by category: Titles, Subtitles, Effects |
| Buttons | Presets (inspector) | — | — | — | — | Same 14 presets as chips in the Properties panel |

## Interactions
In the Text panel, click a template row item: with a text clip selected it applies that style (keeping the clip's text); with nothing selected it adds a new 3s text clip in that style. In the Properties inspector, click a preset chip to apply it to the selected text clip.

## States
14 presets: Bold Title, Lower Third, Neon Glow, Clean Subtitle, Retro Stamp, Handwritten Note, Violet Gradient, Outline Pop, Quote Card, Mono Terminal, Sunset Banner, Soft Caption, Big Number, Underlined Callout. Each is a full text style (font, size, fill/gradient, stroke, shadow/glow, background, alignment, line spacing).

## Result
The selected (or new) text clip takes the preset's full style; the preview updates at once.

## Edge cases
Applying a preset never changes the clip's text content — only the style. An unknown preset id leaves the style unchanged (unit-tested).

## Evidence
WEB-CHECK-2026-11-23.md §2 (Templates/Effects sub-tabs, template rows, inspector Presets) · FULL-WALKTHROUGH-2026-11-23.md (Favorites section, "View all", carousel arrows, third sub-tab "AI text FX") · `src/lib/text.ts` (`TEXT_STYLE_PRESETS`, `applyPreset`) · Audit: `audit/phase3/H-TEXTSTYLE/` (31/31, 2026-11-23)

## Status
MATCH
