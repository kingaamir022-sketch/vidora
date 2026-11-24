# L-EXPORT-QUEUE — Background export queue (Phase 8, Section L)

- **Phase:** 8 (built v0.9.0)
- **Reference behaviour:** ASSUMED — CapCut's export runs in the foreground with a progress dialog; no background queue was observed in the Web checks (the export dialog blocks the editor while it runs). Vidora's queue is an INTENTIONAL improvement for long exports: jobs run in the background while the editor stays usable, with a visible queue. The queue does not change what an export produces — it only changes when it runs.
- **Where it lives:** `src/lib/exportQueue.ts` (job model + runner + localStorage metadata) and the Queue section at the bottom of the Export dialog (`src/components/ExportPanel.tsx`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| List | Export queue | — | — | — | — | One row per job: file name, kind (Video/Audio/GIF/Frames/Cover), status, progress |
| Button | Cancel (per running job) | — | — | — | — | Stops the job; partial output discarded |
| Button | Download again (per finished job) | — | — | — | — | Re-downloads the finished file (same session only) |
| Button | Re-run (per failed/cancelled job) | — | — | — | — | Re-queues the same options |
| Button | Clear finished | — | — | — | — | Removes done/failed/cancelled jobs from the list |
| Text | Queue note | — | — | — | — | "Jobs run one at a time. Finished files can be re-downloaded until you close the app." |

## Interactions
- Start an export → a job row appears (status Queued → Running with % + step).
- Start a second export while one runs → it waits (Queued) and starts automatically when the first finishes.
- Cancel → status Cancelled, the runner moves to the next job.
- Close and reopen the app → job metadata is still listed (from localStorage) but finished files can no longer be downloaded ("File is gone — re-run to export again"); running jobs are marked "Interrupted — re-run".

## States
- Queued / Running (with % + step) / Done / Failed (with error) / Cancelled / Interrupted (after reload).

## Result
Exports run without blocking the editor; every job's outcome is visible and its file retrievable in the same session.

## Edge cases
- Two video jobs: the second waits; it does not render in parallel (one encoder at a time keeps memory bounded).
- A job for a project that was deleted: it fails with "Project no longer exists".
- A job whose media is no longer loaded (new session): it fails with "Media is not loaded in this session — open the project and import the files again".

## Evidence
No CapCut queue observed (Web checks); queue is Vidora's own design, labelled as such in the panel.

## Status
ASSUMED (queue itself); per-job export behaviour is L-EXPORT (MATCH)
