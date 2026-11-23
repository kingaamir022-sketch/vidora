# N-TEXTPRESETS — Text style presets (Phase 5: 50 presets)
- **Phase:** 3 → 5 (Phase 3 shipped 14 presets; Phase 5 grows them to 50)
- **Reference behaviour:** The reference Text tab's Templates sub-tab has a "Basic" section (Add heading / Add body text) and template rows with "View all" — Trending, Classic, Hits, B.Duck, Nailoong, Free Fire, Icons, Title, 3D, Retro (full walkthrough 2026-11-23, Text tab). Template NAMES shown are CapCut content — all 50 Vidora preset names are ORIGINAL. [ASSUMED] Vidora keeps the Phase 3 model (preset grid in the Text panel, click to apply on top of the clip's current content) and groups presets by category rows (Titles, Subtitles, Effects, Social, Retro, Minimal) instead of the reference's named rows.
- **Where it lives:** `src/lib/text.ts` (`TEXT_STYLE_PRESETS`, 50 entries; `applyPreset`, `TEXT_PRESET_CATEGORIES`); Text panel preset grid (`src/components/TextPanel.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | Search presets | — | — | empty | — | Substring on name/category |
| List | Categories | — | — | All | — | All, Titles, Subtitles, Effects, Social, Retro, Minimal |
| Buttons | Preset cards (50) | — | — | — | — | Live text preview in the preset's own style; click to apply |

## Interactions
Open the Text tab, pick a category or search, click a preset — a text clip with that style is added (or the selected text clip's style is replaced, keeping its content). The preview updates at once.

## States
Applying a preset to a selected text clip keeps the clip's own text content and replaces only the style. Applying with no text clip selected creates a new heading clip with the preset's sample content.

## Result
50 original presets, each a full TextStyle (font, size, fill, stroke, shadow, glow, background, alignment, line spacing), all undoable and autosaved.

## Edge cases
A preset's `fillGradient` renders in the preview canvas; in the (canvas) export it renders the same way. No preset changes the clip's duration or position.

## Evidence
`src/lib/text.ts` (TEXT_STYLE_PRESETS, 50 entries) · Audit: `audit/phase5/N-TEXTPRESETS/` (count, every preset applies, categories render)

## Status
MATCH
