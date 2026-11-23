# A-ASSETS — Built-in assets panel (Phase 5/6 placeholder)
- **Phase:** 1
- **Reference behaviour:** The built-in asset library is not built yet. The panel says so plainly instead of showing fake stock. [ASSUMED] A reference editor's asset browser would show downloadable stock here; Vidora shows the honest placeholder until Phase 5/6.
- **Where it lives:** Bottom of the Media left panel.

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| Text | Built-in assets | — | — | — | — | Static informational text only |

## Interactions
Read the note; there is nothing to click.

## States
Always the same text.

## Result
The user understands procedural effects/transitions/LUTs/stickers/templates arrive in Phase 5 and AI music/clips/voices in Phase 6; cloud sync and version history arrive in Phase 8.

## Edge cases
This is not a bug: the placeholder is the intended Phase 1 state, recorded in SPEC.md.

## Evidence
`src/components/MediaBrowser.tsx` · Audit: `audit/phase2/A-ASSETS/`

## Status
ASSUMED
