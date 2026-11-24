# M-SETTINGS — Settings dialog & "…" menu (Phase 9, Section M)

- **Phase:** 9 (built v1.0.0)
- **Reference behaviour:** ASSUMED — CapCut's top-bar "…" menu holds "Feature usage" (Pro/Commercial tabs), "Task bar" (show/hide the top task bar), "Sidebar" (show/hide the left sidebar), "Help" (Help Center) and Settings: "Language: English", "Theme", "Input preferences" (FULL-WALKTHROUGH-2026-11-23.md § top bar). Vidora's "…" menu mirrors the same items with honest local equivalents.
- **Where it lives:** TopBar "…" button + `src/components/SettingsDialog.tsx`; state in `src/store/projectStore.ts` (`settingsOpen`, `setSettingsOpen`); theme and locale setters already in the store.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Menu | "…" | — | — | — | — | Top bar, right of Export: Feature usage / Show task bar / Show sidebar / Help / Settings |
| Select | Language | — | — | English | — | See M-LOCALE |
| Select | Theme | — | — | Dark | — | Dark / Light (light theme finished in Phase 9, see M-PERF) |
| Select | Input preferences | — | — | Default | — | "Default" / "Left-handed mouse" (swaps timeline scroll direction note) — ASSUMED; CapCut's exact options were not observed |
| Checkbox | Show task bar | — | — | on | — | Hides the top bar (a slim "Show task bar" strip remains) |
| Checkbox | Show sidebar | — | — | on | — | Hides the left tab rail |
| Button | Help | — | — | — | — | Opens the User Guide dialog (M-DOCS) |
| Button | Feature usage | — | — | — | — | Dialog: "Vidora has no paid Pro tier — every feature is included." + a list of what is included |
| Button | Show the tour again | — | — | — | — | See M-ONBOARD |
| Button | Reset settings | — | — | — | — | Restores Language English, Theme Dark, task bar + sidebar on; asks for confirm |

## Interactions
- "…" opens the menu; each item either toggles immediately or opens its dialog.
- Settings changes apply at once and persist in localStorage (`vidora.settings.v1`).
- Esc closes the menu and any settings dialog.

## States
- Task bar hidden: only the strip shows; clicking it restores the bar.
- Sidebar hidden: left tabs and panels hide; the preview widens.

## Result
Language, theme, input, task bar, sidebar, help and feature usage are all reachable from one menu, like the reference.

## Edge cases
- Corrupt stored settings JSON → defaults are used, the app never crashes.
- Reset while a dialog is open: the dialog closes first, then defaults apply.

## Evidence
CapCut "…" menu (FULL-WALKTHROUGH-2026-11-23.md § top bar).

## Status
ASSUMED
