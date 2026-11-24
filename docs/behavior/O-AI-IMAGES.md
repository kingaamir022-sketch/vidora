# O-AI-IMAGES — AI images, textures, frames, stickers (Phase 6, Section O)
- **Phase:** 6 (Section O)
- **Reference behaviour:** CapCut's Design Studio shows an Inspiration grid of image cards in varied styles with filter chips (All, Posters, Brand, Photos, …) and a prompt bar (O-DESIGN-STUDIO, UNKNOWN — what the cards open and what happens after a prompt were never observed). Vidora's Images section follows the grid + filter-chip shape: thumbnail, title, category, + Add. The images are Vidora Originals: 40 textures (1920×1080 PNG gradients/noise/patterns), 20 frames (transparent PNG borders, 1920×1080) and 50 transparent-PNG stickers (512×512 drawn shapes/icons), all rendered offline by Vidora's own generator (`generation/render_images.py`, PIL) from `generation/prompts/images.json`. No photos, no stock, no real faces. ASSUMED — the reference grid is cloud AI designs; Vidora's is a local procedural image library in the same shape.
- **Where it lives:** `src/lib/aiLibrary.ts` (catalog from `assets/ai-manifest.json`), Images sub-tab in `src/components/AILibraryPanel.tsx`, files in `public/ai-library/images/textures/*.png`, `frames/*.png`, `stickers/*.png`.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text input | Search | — | — | — | — | Name/tags |
| Chips | Kind chips | — | — | All | — | Textures / Frames / Stickers |
| Cards | Image cards | — | — | — | — | Thumbnail, title, kind, + Add |
| Button | + Add | — | — | — | — | Adds MediaItem + clip (image / overlay) |

## Interactions
- Click + on a texture: a MediaItem (kind image, 1920×1080) is added and placed on the timeline as a full-frame clip. Click + on a frame: the transparent PNG is added as an overlay clip on the first free overlay track. Click + on a sticker: the transparent PNG is added as an overlay clip (like a Phase 3 sticker, but raster).
- Missing PNG file (text-only checkout): the card shows the Drive note and + is disabled; the Generate tab can still make an image in-browser.

## States
- Empty search: "No AI images match this search."
- Missing file: Drive note on the card.

## Result
The image is a normal image clip on the timeline: transform, opacity, keyframes and effects all work on it.

## Edge cases
- Frame PNG over a video clip: the frame's transparency shows the video through it (compositor honours PNG alpha).
- Sticker PNG scaled small: stays crisp at 512×512 source.

## Evidence
`generation/prompts/images.json`, `generation/render_images.py`, `assets/ai-manifest.json`. Quality: `generation/quality_filter.py` (size/alpha gates).

## Status
ASSUMED
