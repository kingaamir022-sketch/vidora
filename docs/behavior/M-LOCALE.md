# M-LOCALE — Localization EN / Urdu / Hindi / Arabic RTL (Phase 9, Section M)

- **Phase:** 9 (built v1.0.0)
- **Reference behaviour:** ASSUMED — CapCut's "…" menu has Settings → "Language: English" (FULL-WALKTHROUGH-2026-11-23.md § top bar). Vidora offers English, Urdu, Hindi and Arabic. The chrome (top bar, left tabs, dashboard headings, common buttons, settings) is translated; deep editor labels (effect names, panel internals) stay in English and the Settings note says so plainly. Arabic switches the whole app to RTL.
- **Where it lives:** `src/lib/i18n.ts` (locale type, string tables, `t()`, `formatDate`, `formatNumber`, `isRtl`); locale in `src/store/projectStore.ts` (`locale`, `setLocale`); `dir`/`lang` applied on `<html>` and on the app root in `src/App.tsx`; language picker in Settings.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Select | Language | — | — | English | — | English / اردو / हिन्दी / العربية; stored in localStorage `vidora.locale.v1` |
| Note | Coverage note | — | — | — | — | "Menus, dashboard and settings are translated. Effect and panel names stay in English." |
| — | RTL | — | — | — | — | Arabic sets `dir="rtl"` on `<html>` (and the app root) and `lang="ar"`; timeline and panels mirror |

## Interactions
- Pick a language → the chrome re-renders immediately; the choice persists across reloads.
- Pick Arabic → layout mirrors (left rail moves to the right, text aligns right); pick any other language → LTR returns.
- Dates and numbers (e.g. "Nov 24, 2026", file sizes) format with `Intl.DateTimeFormat` / `Intl.NumberFormat` for the active locale.

## States
- Unknown stored locale value (e.g. hand-edited localStorage) → falls back to English, never crashes.
- Missing string for a locale → falls back to the English string for that key.

## Result
The app's menus, dashboard and settings read in the user's language; Arabic reads right-to-left.

## Edge cases
- Urdu/Hindi strings use the native scripts (اردو / हिन्दी) — the UI font stack includes system fonts for those scripts; if a glyph is missing the browser falls back, the app does not break.
- Switching language mid-edit does not touch the project or the undo stack.

## Evidence
CapCut "…" menu → Settings → Language (FULL-WALKTHROUGH-2026-11-23.md § top bar). Translations are original Vidora strings.

## Status
ASSUMED
