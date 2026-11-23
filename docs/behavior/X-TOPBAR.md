# X-TOPBAR — Top bar (reference card)
- **Phase:** 0 (reference evidence — Vidora's TopBar matches the structure)
- **Reference behaviour:** The editor top bar has, left to right: the app logo, a "Menu" dropdown, the project name centred (e.g. "1123 (1)"), two small view/layout icons, a Pro upsell ("Pro" in screenshot 04, "Unlock for Rs200" in screenshots 19–30), a "Share" button, and a teal "Export" button, then the window controls (minimise, maximise, close). The home screen's top bar is different (upload / notifications / settings icons at top right, screenshot 05). UNKNOWN — full check pending: what the "Menu" dropdown contains; what the two view/layout icons do; what "Share" opens (share options?); whether the project name is editable inline. Vidora's TopBar has logo, project name, undo/redo, aspect-ratio selector, Shortcuts and Export — the structure matches; the Pro upsell and Share button are not reproduced (Vidora has no Pro tier or sharing yet).
- **Where it lives:** Top bar (`src/components/TopBar.tsx` in Vidora; reference is the desktop editor top bar).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Button | Menu (dropdown) | — | — | — | — | Contents UNKNOWN |
| Text | Project name (centred) | — | — | project name | — | Editing behaviour UNKNOWN |
| Icons | View/layout icons (2) | — | — | — | — | Functions UNKNOWN |
| Button | Pro / Unlock for Rs200 | — | — | — | — | Upsell; text differs between screenshots (Pro vs Unlock for Rs200) |
| Button | Share | — | — | — | — | Destination UNKNOWN |
| Button | Export (teal) | — | — | — | — | Opens the export flow (see X-EXPORT) |
| Buttons | Window controls | — | — | — | — | Minimise / maximise / close |

## Interactions
UNKNOWN — full check pending for Menu, the view icons and Share (no interaction with the top bar was captured).

## States
The Pro upsell reads "Pro" in screenshot 04 and "Unlock for Rs200" in screenshots 19–30 — the label varies (account/state dependent, UNKNOWN why).

## Result
Evidence only — Vidora's TopBar follows this structure without the Pro/Share elements.

## Edge cases
UNKNOWN — full check pending.

## Evidence
Desktop screenshots 04-editor-empty-project.png, 19-editor-media-import.png (viewed directly; same top bar in 20–30) · Desktop screenshot 05-templates-grid.png (home top bar)

## Status
UNKNOWN
