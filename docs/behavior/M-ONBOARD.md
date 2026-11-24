# M-ONBOARD — Onboarding tour & tooltips (Phase 9, Section M)

- **Phase:** 9 (built v1.0.0)
- **Reference behaviour:** ASSUMED — CapCut shows first-run tips and a Help Center; no exact tour flow was observed in the walkthrough (the "…" menu has "Help" → Help Center). Vidora's tour is the standard 5-step first-run pattern: Dashboard → Import → Timeline → Preview → Export.
- **Where it lives:** `src/components/OnboardingTour.tsx`; state in `src/store/projectStore.ts` (`onboardingDone`, `showOnboarding`); flag in localStorage `vidora.onboarding.v1`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Overlay | Tour card | — | — | — | — | One step at a time, dark card bottom-centre, step "1 of 5", short plain sentence |
| Button | Next | — | — | — | — | Advances; on step 5 the label is "Start editing" |
| Button | Back | — | — | — | — | Disabled on step 1 |
| Button | Skip tour | — | — | — | — | Dismisses and marks done |
| Button | Replay tour | — | — | — | — | In Settings → "Show the tour again" |
| Tooltip | `title` on icon buttons | — | — | — | — | Every icon-only button in TopBar, LeftTabs and Timeline toolbar has a plain-language `title` |

## Interactions
- First ever launch (no `vidora.onboarding.v1` flag) → tour opens over the dashboard.
- Next/Back move through the 5 steps; Skip or finishing step 5 writes the flag and closes.
- Settings → "Show the tour again" clears the flag and reopens the tour.
- Esc closes the tour (and marks it done — it never blocks the app).

## States
- Returning user: no tour, dashboard as normal.
- Tour open: the rest of the UI is dimmed but visible; the tour card never covers the whole screen.

## Result
A new user sees, in 5 short steps, where projects, import, timeline, preview and export live.

## Edge cases
- Tour open while a project is open: the tour waits — it only auto-opens on the dashboard.
- localStorage unavailable (private mode): tour shows once per session, never crashes.

## Evidence
CapCut "…" menu → Help (FULL-WALKTHROUGH-2026-11-23.md § top bar); 5-step flow is the common industry-standard first-run pattern.

## Status
ASSUMED
