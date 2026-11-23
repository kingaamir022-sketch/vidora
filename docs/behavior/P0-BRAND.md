# P0-BRAND — Branding, logo and theme
- **Phase:** 0
- **Reference behaviour:** The app opens with its own name and mark in the top-left of every screen, dark theme by default, with a light theme available from the dashboard. The logo is a rounded square with a play triangle cut by a split line.
- **Where it lives:** Dashboard header; editor top bar; splash/favicon.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Image | Vidora logo (28px dashboard, 28px editor) | — | — | logo.svg | — | Gradient violet #7C3AED to cyan #06B6D4 |
| Text | Vidora wordmark | — | — | gradient text | — | Next to the logo |
| Button | Theme: dark/light | — | — | dark | — | Dashboard header only; full light styling is Phase 9 |

## Interactions
Click the logo/wordmark in the editor to return to the dashboard. Click Theme to toggle dark/light.

## States
Dark: zinc-950 background, zinc-100 text. Light (dashboard only at present): light variables; editor stays dark until Phase 9.

## Result
The brand is Vidora everywhere; the theme toggle changes the dashboard immediately.

## Edge cases
Theme toggle on the dashboard does not yet restyle the editor (Phase 9) — the button label still updates. No other theme control exists.

## Evidence
`design/tokens.json`, `public/logo.svg`, `src/components/Dashboard.tsx`, `src/components/TopBar.tsx` · Audit: `audit/phase2/P0-BRAND/`

## Status
MATCH
