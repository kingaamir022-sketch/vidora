# M-AUTH — Local accounts (Phase 9, Section M)

- **Phase:** 9 (built v1.0.0)
- **Reference behaviour:** ASSUMED — CapCut accounts are cloud accounts; Vidora has no server and the user's budget is zero, so accounts are local-only (same first-account-is-OWNER pattern the user knows from PageCommand Pro). The UI says so plainly: "Accounts live only on this computer. There is no cloud sign-in."
- **Where it lives:** `src/lib/auth.ts` (accounts, SHA-256 salted password hash via Web Crypto, session); UI in `src/components/AccountPanel.tsx` (dashboard) + account chip in `TopBar.tsx`; role in `src/store/projectStore.ts` (`account`, `setAccount`); read-only gating in `src/lib/auth.ts` (`canEdit`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Input | Display name | 1 | 60 | — | — | Sign-up only |
| Input | Email | — | — | — | — | Lower-cased; must contain "@" and "." |
| Input | Password | 8 | 128 | — | — | Never stored — only salt + SHA-256 hash |
| Button | Create account | — | — | — | — | First account on this computer becomes OWNER; later accounts are CUSTOMER |
| Button | Sign in | — | — | — | — | Wrong email/password → "Wrong email or password." (same message either way) |
| Button | Sign out | — | — | — | — | Clears the session; the account stays |
| Chip | Account chip (top bar) | — | — | — | — | Shows display name + role (OWNER / CUSTOMER); click opens the account panel |
| Banner | Read-only banner | — | — | — | — | CUSTOMER sees: "You are signed in as Customer — read-only. Ask the Owner to make changes." Editing buttons are disabled |

## Interactions
- Sign up with an email already used → "An account with this email already exists — sign in instead."
- Sign in → session stored in localStorage `vidora.session.v1`; the dashboard and top bar show the name + role.
- CUSTOMER: New Project, Import, timeline edits, delete/rename and Export are disabled (buttons show why on hover); viewing, playback and presentation still work.
- OWNER: everything works; OWNER can also see the account list in the panel (name + role + plan; no passwords shown anywhere).
- Sign out → back to the signed-out state; projects stay (they are local files, not tied to the account).
- Signed out = full access, exactly as before accounts existed: no sign-in is required to use the app, and a fresh install with no accounts behaves the same as v0.9.0.

## States
- No accounts yet: the panel shows "No account yet — create the first account to become the Owner."
- Signed out with accounts existing: the panel shows the sign-in form.
- Corrupt accounts storage: treated as no accounts; the app never crashes.

## Result
One computer, many local accounts; the first is the Owner, the rest are read-only Customers; passwords are never stored in plain text.

## Edge cases
- Two accounts with the same email in different cases → treated as the same email (lower-cased on save).
- Password with fewer than 8 characters → "Password must be at least 8 characters."
- Web Crypto unavailable (very old browser) → sign-up shows "Secure sign-in is not available in this browser." and does not create a weak account.

## Evidence
PageCommand Pro account pattern (first account = OWNER, later = CUSTOMER, read-only) — the pattern the user already knows. No cloud sign-in exists; the panel says so.

## Status
ASSUMED
