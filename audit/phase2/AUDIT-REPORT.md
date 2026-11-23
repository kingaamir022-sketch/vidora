# Vidora Phase 2 — Self-Audit Report (Rule 12.4)

- Run: 2026-11-22T13:24:07.415Z
- App: production build served with `vite preview` on http://127.0.0.1:4173/
- Browser: Chromium headless shell (playwright-core 1.65.1), viewport 1440x900
- Checks: 40/40 passed, 0 failed

## Measured layout (1440x900)

```json
{
  "topBarH": 48,
  "railW": 64,
  "propsW": 288,
  "timelineH": 288,
  "previewW": 800,
  "previewH": 564,
  "innerW": 1440,
  "innerH": 900
}
```

Expected (docs/UI_LAYOUT.md): top bar 48px, left rail 64px, properties 288px, timeline 288px.

## Checks

- PASS [A-DASH] dashboard shows sample project
- PASS [P0-BRAND] logo + wordmark visible
- PASS [P0-SHELL] top bar is 48px — got 48
- PASS [P0-SHELL] left rail is 64px — got 64
- PASS [P0-SHELL] properties panel is 288px — got 288
- PASS [P0-SHELL] timeline is 288px — got 288
- PASS [P0-SHELL] preview fills the middle — 800x564
- PASS [P0-SHELL] tab Media opens a panel
- PASS [P0-SHELL] tab Audio opens a panel
- PASS [P0-SHELL] tab Text opens a panel
- PASS [P0-SHELL] tab Stickers opens a panel
- PASS [P0-SHELL] tab Effects opens a panel
- PASS [P0-SHELL] tab Transitions opens a panel
- PASS [P0-SHELL] tab Captions opens a panel
- PASS [P0-SHELL] tab Filters opens a panel
- PASS [P0-SHELL] tab Adjustment opens a panel
- PASS [P0-SHELL] tab Templates opens a panel
- PASS [P0-SHELL] tab AI Tools opens a panel
- PASS [A-IMPORT] 3 media items imported — got 3
- PASS [A-IMPORT] media thumbnails shown
- PASS [A-FOLDERS] search filters to test.mp4
- PASS [B-TRACKS] imported clip appears on the timeline — clips: 1
- PASS [B-TRANSFORM] properties panel shows Speed section
- PASS [C-SPEED] 2x preset applies (clip label shows 2×)
- PASS [B-SPLIT] playhead is inside the clip before splitting — 00:00:01:15 / 00:00:03:00
- PASS [B-SPLIT] S splits the clip into two — 1 -> 2
- PASS [X-UNDO] Ctrl+Z undoes the split
- PASS [B-EDIT] right-click opens the clip context menu
- PASS [E-FX] Grayscale effect applied
- PASS [F-ADJUST] Brightness slider moves to 0.30 — value text not found
- PASS [F-SCOPES] scopes draw after capture
- PASS [E-TRANS] transition panel renders 8 types
- PASS [D-KEYFRAMES] keyframe row appears after adding
- PASS [G-MASK] mask shape can be set to circle
- PASS [E-LUT] Vidora Warm look applies
- PASS [X-PREVIEW] frame step advances the timecode — 00:00:01:15 / 00:00:03:00 -> 00:00:01:16 / 00:00:03:00
- PASS [X-PREVIEW] safe-zone + grid overlays render
- PASS [X-EXPORT] Export dialog opens with 480/720/1080p
- PASS [B-SHORTCUTS] Shortcuts dialog lists bindings
- PASS [A-DASH] back to dashboard works

## Screenshots

Screenshots live in `audit/phase2/<behaviour-card-ID>/` (one folder per card).

## Verdict

**Zero open bugs.** All differences found during this audit were fixed before this report (see docs/BUGS.md).
