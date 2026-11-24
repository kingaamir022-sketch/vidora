# M-PERF — Performance: thumbnail cache + finished light theme (Phase 9, Section M)

- **Phase:** 9 (built v1.0.0)
- **Reference behaviour:** ASSUMED — standard editor practice: thumbnails are generated once and reused; the light theme is finished so every panel is readable in both themes (the Phase 0 comment in `src/index.css` said "full light styling: Phase 9").
- **Where it lives:** `src/lib/mediaCache.ts` (LRU thumbnail cache, used by `src/lib/media.ts` probe path); light-theme variables + component surfaces in `src/index.css`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Cache | Thumbnail cache | — | — | 200 entries | — | Probe results keyed by `name:size`, thumbnails by media id; LRU eviction; `probeCache.clear()` / `thumbnailCache.clear()` for tests |
| Theme | Light | — | — | — | — | Full light styling: panels, timeline, dialogs and inputs all use light surfaces (no dark leftovers) |

## Interactions
- Import the same file twice (same name+size) → the second import reuses the cached thumbnail instead of re-decoding.
- Switch Dark → Light → every panel, the timeline and dialogs switch to light surfaces; switch back → dark returns.
- Cache eviction: importing a 201st distinct media item drops the least-recently-used thumbnail; the item still works (its thumbnail is regenerated on demand).

## States
- Cache empty on first launch: thumbnails generate as before, one decode each.

## Result
No repeated thumbnail decoding; the light theme is complete and readable.

## Edge cases
- A media item whose thumbnail generation failed is NOT cached as failed — the next render retries once.
- Light theme with a video preview: the canvas itself is unchanged (video pixels), only the chrome lightens.

## Evidence
`src/index.css` Phase 0 comment ("full light styling: Phase 9"); standard LRU cache practice.

## Status
ASSUMED
