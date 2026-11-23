# X-DETAILS — Right Details panel (nothing selected)
- **Phase:** 0 (reference evidence — Vidora's Properties panel shows project info instead)
- **Reference behaviour:** With nothing selected in the editor, the right panel is titled "Details" and shows a field list: Name (project name, e.g. "1123 (1)"), Path (the project folder on disk), Imported media: "Stay in original location", Arrange layers: "Turned on", Proxy: "Turned off", Aspect ratio: "Original", Resolution: "Adapted", and a "Modify" button at the bottom right. The panel is the same in every editor screenshot (04, 19–30) — it does not change with the left tab. UNKNOWN — full check pending: what the "Modify" button opens (a settings dialog?); whether each field is editable inline or only via Modify; what "Imported media" options exist besides "Stay in original location"; what Aspect ratio / Resolution options exist; whether the panel changes when a clip IS selected (no screenshot shows a selected clip's right panel). (Local project paths visible in the screenshots are NOT recorded here.)
- **Where it lives:** Reference card for the right panel with nothing selected; Vidora's Properties panel (`src/components/PropertiesPanel.tsx`) shows project name/tracks/media/markers/fps/resolution + Export button instead — an intentional difference until a later review decides the Details layout.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text | Name | — | — | project name | — | Read-only in the screenshot |
| Text | Path | — | — | project folder | — | Read-only in the screenshot |
| Text | Imported media | — | — | Stay in original location | — | Options UNKNOWN |
| Text | Arrange layers | — | — | Turned on | — | Toggle behaviour UNKNOWN |
| Text | Proxy | — | — | Turned off | — | Toggle behaviour UNKNOWN |
| Text | Aspect ratio | — | — | Original | — | Options UNKNOWN |
| Text | Resolution | — | — | Adapted | — | Options UNKNOWN |
| Button | Modify | — | — | — | — | Destination UNKNOWN |

## Interactions
UNKNOWN — full check pending (no interaction with this panel was captured).

## States
Identical in all editor screenshots: the panel never changes with the left tab while nothing is selected.

## Result
Evidence only — Vidora does not reproduce this panel yet; the Properties panel is the current equivalent.

## Edge cases
UNKNOWN — full check pending.

## Evidence
Desktop screenshots 04-editor-empty-project.png, 19-editor-media-import.png (viewed directly; same Details panel in 20–30)

## Status
UNKNOWN
