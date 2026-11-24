# M-TELEMETRY — Local analytics & error log (Phase 9, Section M)

- **Phase:** 9 (built v1.0.0)
- **Reference behaviour:** ASSUMED — CapCut has analytics on its servers; Vidora has no server, so usage counts and errors are stored only on this computer, in localStorage, and nothing is ever sent anywhere. The Settings dialog says so plainly.
- **Where it lives:** `src/lib/telemetry.ts` (event log, error log, opt-in flag); Settings → Diagnostics section (`src/components/SettingsDialog.tsx`); wired in `src/main.tsx` (`window.onerror` → error log).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Checkbox | Count how I use Vidora (local only) | — | — | off | — | Opt-in. When on, counts: projects created, exports finished, AI generations. No keystrokes, no file names, no timings of what you typed. |
| List | Diagnostics — recent errors | — | — | — | — | Last 50 errors with time + message; "Nothing leaves this computer." |
| Button | Copy diagnostics | — | — | — | — | Copies the error list as text (for sending to support yourself) |
| Button | Clear diagnostics | — | — | — | — | Empties both logs |

## Interactions
- Turn the toggle on → counts start accumulating; turn it off → counting stops (old counts stay until Clear).
- An uncaught error (e.g. a failed export) → one line appears in Diagnostics with the time and message.
- Counts are shown as plain numbers ("Exports finished: 3") — no charts, no identifiers.

## States
- Toggle off (default): only errors are logged, never usage counts.
- Storage full or unavailable: logging silently stops; the app never crashes.

## Result
The user can see what went wrong locally, and usage is counted only if they ask for it — with no network traffic at all.

## Edge cases
- An error thrown while logging itself → caught and ignored (logging never breaks the app).
- Very long error messages are trimmed to 500 characters in the log.

## Evidence
Local-only design (no server exists); standard opt-in practice.

## Status
ASSUMED
