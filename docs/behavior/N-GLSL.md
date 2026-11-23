# N-GLSL — GLSL effect engine (Phase 5)
- **Phase:** 5
- **Reference behaviour:** No GLSL/shader UI exists in the reference — this is Vidora's engine for the 62-effect library (Section N). Standard professional-editor shape, marked ASSUMED: each effect is a WebGL2 fragment shader with uniforms (texture, resolution, time, intensity, two parameters); effects on a clip run in stack order through a ping-pong framebuffer chain on the working canvas (capped at 960 px, same as the pixel pipeline); a failed shader compile is caught, logged once, and that effect is skipped for the frame.
- **Where it lives:** `src/lib/glsl.ts` (`createGlslRenderer`, `GlslRenderer` — program cache, framebuffer ping-pong, uniform setters, `renderThrough(canvas, effects, time)`); catalog in `src/lib/glslEffects.ts` (`GLSL_EFFECT_CATALOG`, 62 entries); compositor step in `src/lib/compositor.ts` (GLSL pass runs after the pixel-effects step); thumbnails in `src/lib/glslEffects.ts` (`glslThumbnail`, renders a test gradient through the shader once, cached data URL).

## Controls
| Type | Label | Min | Max | Default | Step | Notes |
|---|---|---|---|---|---|---|
| (none — engine) | — | — | — | — | — | Driven by the Effects panel; see E-FX |

## Interactions
None directly — the Effects panel adds/removes GLSL effects like any other effect; the engine renders them in the preview and in export (export records the preview canvas).

## States
WebGL2 available: effects render live. WebGL2 unavailable: `isGlslSupported()` is false, GLSL cards are disabled with a note, CSS/pixel effects still work. A shader compile failure: that effect is skipped, the rest of the stack renders, one console warning.

## Result
A clip frame with GLSL effects renders identically every time for the same time/params (all shaders are deterministic functions of `u_time`, `u_intensity`, `u_p1`, `u_p2` — no random state except the seeded hash in film-grain, which is a pure function of pixel + frame).

## Edge cases
Zero GLSL effects on a clip: no WebGL work happens at all. A 1×1 frame: renderer guards degenerate sizes. Multiple GLSL effects chain through the same two framebuffers.

## Evidence
`src/lib/glsl.ts`, `src/lib/glslEffects.ts`, `src/lib/compositor.ts` · Audit: `audit/phase5/N-GLSL/` (shader compile check for all 62 + a render-diff check + WebGL2-unavailable fallback)

## Status
ASSUMED
