# L-TEMPLATES-SLOTS — Template media slots (Phase 8, Section L)

- **Phase:** 8 (built v0.9.0; slots existed as named placeholders since Phase 5, v0.6.0)
- **Reference behaviour:** ASSUMED — the CapCut desktop Templates tab (screenshot 29-editor-templates.png) shows template cards with a "Use template" flow, but whether the editor tab lets you replace the template's media was never observed (L-TEMPLATES-EDITOR stays UNKNOWN on that point). The common industry behaviour (CapCut mobile/desktop templates ask for your clips) is: pick your own clip for each named slot before the project is built. Vidora follows that.
- **Where it lives:** Templates panel (`src/components/TemplatesPanel.tsx`); slot filling in `src/lib/templates.ts` (`applyTemplateWithSlots`); 35 templates in `TEMPLATE_CATALOG` (25 from Phase 5 + 10 new Phase 8 templates, 2 per category).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Cards | Template grid | — | — | — | — | Search + category chips (All/Intro/Outro/Social/Promo/Vlog), as Phase 5 |
| Select | Slot media (per slot) | — | — | empty | — | Dropdown lists the current project's media (video/image); "Import…" opens the file picker |
| Button | Use template | — | — | — | — | Disabled until every slot has media OR the user picks "Use empty slots" |
| Button | Use empty slots | — | — | — | — | Builds the project with labelled placeholder clips (Phase 5 behaviour) |
| Text | Slot hint | — | — | — | — | "Main clip — 6 s" (slot label + duration) under each picker |

## Interactions
- Click a template card → it expands to show its slots (if any) with a media picker per slot.
- Pick media for a slot → the picker's label shows the file name; a clip shorter than the slot is looped to fill the slot (labelled); a longer clip is trimmed to the slot (sourceStart 0).
- Click "Use template" with all slots filled → a NEW project is created (current project kept) where each slot is a real video/image clip with that media, and the template's text/sticker overlays sit on top exactly as designed.
- Click "Use empty slots" → the Phase 5 behaviour: placeholder clips named "▶ Main clip" that show their label on the canvas until footage is dropped in.
- Templates with no slots → "Use template" works immediately (no pickers shown).

## States
- No slots: single "Use template" button.
- Slots unfilled: "Use template" disabled, "Use empty slots" offered.
- Slots filled: "Use template" enabled, shows the count ("Use template (2 clips)").

## Result
A new project from the template with the user's own media in the slots, correctly timed (slot start/duration) and with the template's overlays intact.

## Edge cases
- Media picked is an image → the slot clip is an image clip held for the slot duration.
- Media picked is audio → not offered in the picker (slots are video/image only).
- The same media picked for two slots → allowed; both slots reference the same file.
- Template used twice → two separate new projects; no overwrite.

## Evidence
CapCut desktop screenshot 29-editor-templates.png (card grid + "Use template"); slot-filling flow is the industry-standard template behaviour (ASSUMED).

## Status
ASSUMED
