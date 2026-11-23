# N-TEMPLATES — Original template library (Phase 5: 25 templates)
- **Phase:** 5 (the full template system with replaceable media slots is Phase 8; Phase 5 ships the template library content + "Use template" flow)
- **Reference behaviour:** The reference has templates at home and inside the editor: a search bar, filters (Orientation/Clips/Duration), category chips (For you, Pro, Daily life, Selfie, Velocity, AI, Lyrics, Relationship, Friendship, Family, Meme, School life, Travel, Anniversary, Fashion, Sports, Motivation), vertical cards with views + clip count + name + Featured badges, and a preview popup with duration, clip count, favourite star, "Use template" + "Edit more" (desktop screenshots 05, 06, 29). Template NAMES and thumbnails shown are CapCut content — all 25 Vidora template names, layouts and placeholder content are ORIGINAL. [ASSUMED] Vidora's Templates tab lists its 25 templates with search + category chips + cards (duration + item count + an SVG layout thumbnail); "Use template" creates a new project from the template; media slots are named empty slots the user fills by importing media (the slot's clip is a labelled placeholder until media is assigned) — the reference's exact slot behaviour was never observed.
- **Where it lives:** Catalog in `src/lib/templates.ts` (`TEMPLATE_CATALOG`, 25 entries; each template is data: ratio, duration, items — text/sticker/shape/background clips + named media slots); panel in `src/components/TemplatesPanel.tsx`; `applyTemplate(project, templateId)` builds tracks + clips (pure, in `src/lib/templates.ts`); store action `useTemplate` in `src/store/projectStore.ts`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | Search templates | — | — | empty | — | Substring on name/category |
| List | Categories | — | — | All | — | All, Intro, Outro, Social, Business, Celebration, Travel, Lyric |
| Cards | Template cards (25) | — | — | — | — | SVG layout thumbnail, duration, item count; "Use template" button |
| Note | Media slots | — | — | — | — | Each card lists its slots (e.g. "2 video slots") |

## Interactions
Open the Templates tab, search or pick a category, click "Use template" — a new project opens with the template's clips on the timeline and its slots listed in the Media panel; import a video and click a slot to fill it. All template clips are normal clips afterwards (editable, undoable, autosaved).

## States
A template with no media slots (pure title cards) opens ready to preview. A slot with no media shows its label on the canvas ("Slot: Hero video"). Filling a slot replaces the placeholder with the imported clip, keeping its position/duration.

## Result
25 original templates, each a complete starter project (ratio, duration, text/sticker/shape/background clips, named slots), all stored as data — no reference template content is copied.

## Edge cases
Using a template never overwrites the current project — it always creates a new one (the dashboard's autosave keeps the old project). A template's ratio sets the new project's ratio.

## Evidence
`src/lib/templates.ts` (TEMPLATE_CATALOG, 25 entries), `src/components/TemplatesPanel.tsx` · Audit: `audit/phase5/N-TEMPLATES/` (count, every template builds a valid project, a slot fills)

## Status
ASSUMED
