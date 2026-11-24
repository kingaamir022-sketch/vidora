# L-COLLAB — Collaboration: comments + shared projects (Phase 8, Section L)

- **Phase:** 8 (built v0.9.0)
- **Reference behaviour:** ASSUMED — CapCut's "Share for review" says "People can add comments to your video" (WEB-CHECK-2026-11-23.md §3), but the review flow itself (where comments live, who sees them) was never observed. The common behaviour is timecoded comments on the video: a reviewer watches, pauses at a time, writes a note, the owner sees it on the timeline. Vidora implements exactly that, local-first: comments travel inside the shared `.vidora` bundle file, not through a server.
- **Where it lives:** Comments model in `src/lib/collab.ts`; stored on the project (`comments`, `sharedWith`); UI in the Export dialog's "Share for review" section (`src/components/ExportPanel.tsx`); comment markers shown on the timeline ruler (TimelineShell reads `project.comments`).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | Your name | — | — | empty | — | Stored with each comment; first comment asks for it once |
| Textarea | Add a comment at <timecode> | — | — | empty | — | Time defaults to the current playhead; editable |
| Button | Add comment | — | — | — | — | Adds the comment (timecoded, unresolved) |
| List | Comments | — | — | — | — | Timecode (click → seek), author, text, date, Resolve/Reopen |
| Button | Resolve / Reopen (per comment) | — | — | — | — | Resolved comments are struck through, kept in the list |
| Text input | Share with (name) | — | — | — | — | Adds a name to the project's "shared with" list (a local record — no account, no email sent) |
| List | Shared with | — | — | — | — | Names + date shared; "Remove" per name |
| Button | Download review package | — | — | — | — | The `.vidora` bundle (project + comments + shared-with list) |

## Interactions
- Add a comment → it appears in the list and a marker appears on the timeline ruler at that time; clicking the timecode seeks the playhead there.
- Share the review package file with someone → they import it in Vidora, watch, add their own comments, and send the file back; importing merges comments (by id — no duplicates).
- Resolve → the comment is marked done; the timeline marker stays but turns grey.
- "Shared with" is only a record of who received the file — Vidora sends nothing itself (no email, no server); the panel says so.

## States
- No comments: "No comments yet — add one at the playhead".
- Comments exist: list ordered by time; resolved ones struck through.
- Imported package with new comments: the new ones are highlighted "New since your last share" (by createdAt vs. last share date).

## Result
Two people can pass a project file back and forth and leave timecoded notes for each other, without any server.

## Edge cases
- Comment time beyond the project duration (project shortened after) → shown clamped to the end, with "(time no longer in project)".
- Same comment id imported twice → merged once (dedupe by id).
- Empty comment text → the Add button is disabled.

## Evidence
CapCut "Share for review — People can add comments to your video" (WEB-CHECK §3); the file-based flow is Vidora's honest local-first design.

## Status
ASSUMED
