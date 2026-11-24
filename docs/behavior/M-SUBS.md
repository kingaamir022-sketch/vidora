# M-SUBS — Subscription plans (structure only) (Phase 9, Section M)

- **Phase:** 9 (built v1.0.0)
- **Reference behaviour:** ASSUMED — CapCut sells Pro; Vidora has no payment provider and the user's budget is zero, so there is no checkout, no charge and no real Pro tier. The Plans dialog shows the structure honestly: Free (everything included, current) and Pro (not sold — "not available in this build").
- **Where it lives:** `src/lib/subscription.ts` (plan definitions, durations, `planForAccount`, `daysRemaining`); UI in the Account panel ("Plans" section) and Settings → Feature usage.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| List | Plans | — | — | Free | — | Free — "Everything included. No payment, no expiry." / Pro — "Not available in this build. Nothing is charged." |
| List | Durations | — | — | — | — | Structure only: 7 / 30 / 90 / 180 / 365 days / Lifetime — the same duration set the user knows from PageCommand Pro; no plan is sold |
| Field | Current plan (per account) | — | — | Free | — | Stored on the account; OWNER can change an account's plan between Free and Pro-not-sold? No — plan changes are disabled with the reason "Plans are not sold in this build." |

## Interactions
- Open Plans → the Free plan is marked "Current plan"; Pro shows "Not available".
- `daysRemaining(plan)` returns `null` for Free/Lifetime (no expiry) and a day count for dated plans (none are sold, so this only matters for the structure/tests).

## States
- No account signed in: Plans still viewable from Settings → Feature usage.

## Result
The plan structure exists in code and in the UI, but nothing can be bought and nothing is ever charged.

## Edge cases
- A hand-edited account with plan "pro" → shown as "Pro (not available)" and treated as Free for features (nothing is gated behind payment).

## Evidence
PageCommand Pro plan durations (7/30/90/180/365/Lifetime) — the pattern the user already knows. No payment provider is wired in; the dialog says so.

## Status
ASSUMED
