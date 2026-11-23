/**
 * GLSL effect catalog (Phase 5, SPEC N — E-FX).
 * 62 original effects, each a real WebGL2 fragment shader body.
 * Every body is GLSL that assigns `vec3 o` from `vec3 c` (source colour),
 * `vec2 uv`, `u_time`, `u_p1`, `u_p2`, `u_res`, and the shared helpers
 * `vhash` / `vnoise` / `vblur4` (see `src/lib/glsl.ts` PRELUDE).
 * Names are Vidora originals — no reference effect names are copied.
 * `p1`/`p2` are the effect's sliders (defaults in `params`).
 */

export type GlslCategory = 'Colour' | 'Light' | 'Distort' | 'Stylize' | 'Retro' | 'Motion';

export const GLSL_CATEGORIES: GlslCategory[] = ['Colour', 'Light', 'Distort', 'Stylize', 'Retro', 'Motion'];

export interface GlslParamDef {
  default: number;
  label: string;
  max: number;
  min: number;
  step: number;
}

export interface GlslEffectDef {
  body: string;
  category: GlslCategory;
  description: string;
  id: string;
  name: string;
  p1?: GlslParamDef;
  p2?: GlslParamDef;
}

const amount = (label: string, dflt = 0.6): GlslParamDef => ({ default: dflt, label, max: 1, min: 0, step: 0.05 });

export const GLSL_EFFECT_CATALOG: GlslEffectDef[] = [
  // ---- Colour (12) ----
  { body: 'vec3 o = c * vec3(1.08, 1.0, 0.92) + vec3(0.04 * u_p1, 0.01, 0.0);', category: 'Colour', description: 'Warm golden lift.', id: 'warm-glow', name: 'Warm Glow', p1: amount('Warmth', 0.8) },
  { body: 'vec3 o = c * vec3(0.94, 1.02, 1.10) + vec3(0.0, 0.01, 0.03 * u_p1);', category: 'Colour', description: 'Cool evening dusk.', id: 'cool-dusk', name: 'Cool Dusk', p1: amount('Coolness', 0.8) },
  { body: 'float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); vec3 o = mix(c, vec3(l), u_p1); o = (o - 0.5) * (1.0 + u_p2 * 0.5) + 0.5;', category: 'Colour', description: 'Ink black-and-white with contrast.', id: 'mono-ink', name: 'Mono Ink', p1: amount('Mono', 1), p2: amount('Contrast', 0.4) },
  { body: 'float l = dot(c, vec3(0.3, 0.59, 0.11)); vec3 o = vec3(l) * vec3(1.2, 1.0, 0.7);', category: 'Colour', description: 'Deep vintage sepia.', id: 'sepia-deep', name: 'Sepia Deep' },
  { body: 'float l = dot(c, vec3(0.3, 0.59, 0.11)); vec3 o = mix(vec3(0.05, 0.02, 0.15), vec3(0.65, 0.45, 1.0), l);', category: 'Colour', description: 'Violet duotone.', id: 'duotone-violet', name: 'Duotone Violet' },
  { body: 'float l = dot(c, vec3(0.3, 0.59, 0.11)); vec3 o = mix(vec3(0.10, 0.02, 0.0), vec3(1.0, 0.55, 0.15), l);', category: 'Colour', description: 'Ember duotone.', id: 'duotone-ember', name: 'Duotone Ember' },
  { body: 'vec3 o = floor(c * u_p1) / u_p1;', category: 'Colour', description: 'Flat poster bands.', id: 'posterize-pop', name: 'Posterize Pop', p1: { default: 5, label: 'Levels', max: 12, min: 2, step: 1 } },
  { body: 'vec3 o = mix(c, vec3(1.0) - c, step(u_p1, c));', category: 'Colour', description: 'Solarized negative flip.', id: 'solarize', name: 'Solarize', p1: amount('Threshold', 0.5) },
  { body: 'vec3 o = c.bgr;', category: 'Colour', description: 'Red and blue channels swapped.', id: 'channel-swap', name: 'Channel Swap' },
  { body: 'float l = dot(c, vec3(0.3, 0.59, 0.11)); vec3 o = mix(vec3(l), c, 1.0 + u_p1);', category: 'Colour', description: 'Saturation pushed hard.', id: 'saturation-surge', name: 'Saturation Surge', p1: amount('Boost', 0.8) },
  { body: 'vec3 o = (c - 0.5) * (1.0 + u_p1) + 0.5;', category: 'Colour', description: 'Punchy contrast.', id: 'contrast-punch', name: 'Contrast Punch', p1: amount('Punch', 0.6) },
  { body: 'float a = u_p1 * 3.14159; float s = sin(a); float co = cos(a); mat3 m = mat3(0.299 + 0.701 * co + 0.168 * s, 0.587 - 0.587 * co + 0.330 * s, 0.114 - 0.114 * co - 0.497 * s, 0.299 - 0.299 * co - 0.328 * s, 0.587 + 0.413 * co + 0.035 * s, 0.114 - 0.114 * co + 0.292 * s, 0.299 - 0.3 * co + 1.25 * s, 0.587 - 0.588 * co - 1.05 * s, 0.114 + 0.886 * co - 0.203 * s); vec3 o = m * c;', category: 'Colour', description: 'Hue rotated around the wheel.', id: 'hue-drift', name: 'Hue Drift', p1: { default: 0.25, label: 'Angle', max: 1, min: -1, step: 0.05 } },
  // ---- Light (10) ----
  { body: 'vec3 b = vblur4(uv); vec3 o = c + b * u_p1;', category: 'Light', description: 'Soft halo around bright areas.', id: 'glow-halo', name: 'Glow Halo', p1: amount('Glow', 0.5) },
  { body: 'vec3 b = vblur4(uv); vec3 o = c + max(b - vec3(0.55), vec3(0.0)) * u_p1;', category: 'Light', description: 'Highlights bloom softly.', id: 'bloom-soft', name: 'Bloom Soft', p1: amount('Bloom', 0.8) },
  { body: 'float d = distance(uv, vec2(0.5)); vec3 o = c * (1.0 - smoothstep(u_p1, 0.9, d) * u_p2);', category: 'Light', description: 'Gentle darkened corners.', id: 'vignette-soft', name: 'Vignette Soft', p1: amount('Start', 0.4), p2: amount('Strength', 0.6) },
  { body: 'vec3 o = c + vec3(1.0, 0.5, 0.2) * smoothstep(0.6, 0.0, distance(uv, vec2(0.85, 0.15))) * u_p1;', category: 'Light', description: 'Warm leak from the corner.', id: 'light-leak', name: 'Light Leak', p1: amount('Leak', 0.6) },
  { body: 'float a = atan(uv.y - 0.5, uv.x - 0.5); float r = 0.5 + 0.5 * sin(a * 12.0 + u_time); float d = distance(uv, vec2(0.5)); vec3 o = c + vec3(1.0, 0.9, 0.6) * r * u_p1 * max(0.0, 1.0 - d * 1.6);', category: 'Light', description: 'Radiating sun rays.', id: 'sun-rays', name: 'Sun Rays', p1: amount('Rays', 0.5) },
  { body: 'float s = step(0.997, vhash(floor(uv * u_res / 6.0) + floor(u_time * 3.0))); vec3 o = c + vec3(s) * u_p1;', category: 'Light', description: 'Twinkling dust sparks.', id: 'sparkle-dust', name: 'Sparkle Dust', p1: amount('Sparkle', 0.7) },
  { body: 'vec3 acc = vec3(0.0); for (int i = 0; i < 8; i++) { float a = float(i) * 0.785398; acc += texture2D(u_tex, uv + vec2(cos(a), sin(a)) * 0.006).rgb; } vec3 o = mix(c, acc / 8.0, u_p1);', category: 'Light', description: 'Dreamy soft bokeh blur.', id: 'bokeh-dream', name: 'Bokeh Dream', p1: amount('Softness', 0.7) },
  { body: 'vec3 o = mix(c, vec3(0.8, 0.85, 0.9), u_p1 * (0.5 + 0.5 * sin(uv.y * 3.0 + u_time * 0.2)));', category: 'Light', description: 'Slow drifting mist.', id: 'haze-mist', name: 'Haze Mist', p1: amount('Haze', 0.5) },
  { body: 'float d = distance(uv, vec2(0.7, 0.3)); vec3 o = c + vec3(0.4, 0.7, 1.0) * (0.06 / (d * 4.0 + 0.2)) * u_p1;', category: 'Light', description: 'Cool lens flare spot.', id: 'lens-flare', name: 'Lens Flare', p1: amount('Flare', 0.6) },
  { body: 'float a = atan(uv.y - 0.5, uv.x - 0.5); float s = pow(abs(sin(a * 6.0)), 8.0); vec3 o = c + vec3(1.0, 0.95, 0.7) * s * u_p1 * max(0.0, 1.0 - distance(uv, vec2(0.5)) * 1.4);', category: 'Light', description: 'Six-point star burst.', id: 'star-burst', name: 'Star Burst', p1: amount('Burst', 0.6) },
  // ---- Distort (12) ----
  { body: 'vec2 g = floor(uv * u_p1) / u_p1; vec3 o = texture2D(u_tex, g).rgb;', category: 'Distort', description: 'Chunky mosaic blocks.', id: 'pixel-mosaic', name: 'Pixel Mosaic', p1: { default: 48, label: 'Cells', max: 160, min: 8, step: 4 } },
  { body: 'vec2 w = uv + vec2(0.0, sin(uv.x * 20.0 + u_time * 2.0) * 0.01 * u_p1); vec3 o = texture2D(u_tex, w).rgb;', category: 'Distort', description: 'Gentle horizontal wave.', id: 'wave-bend', name: 'Wave Bend', p1: amount('Wave', 0.7) },
  { body: 'vec2 dv = uv - vec2(0.5); float d = length(dv) + 0.0001; vec2 r = uv + (dv / d) * sin(d * 40.0 - u_time * 3.0) * 0.005 * u_p1; vec3 o = texture2D(u_tex, r).rgb;', category: 'Distort', description: 'Pond ripple from the centre.', id: 'ripple-pond', name: 'Ripple Pond', p1: amount('Ripple', 0.8) },
  { body: 'vec2 dv = uv - 0.5; float a = atan(dv.y, dv.x); float r = length(dv); float tw = a + (1.0 - smoothstep(0.0, 0.4, r)) * u_p1; vec3 o = texture2D(u_tex, vec2(0.5) + vec2(cos(tw), sin(tw)) * r).rgb;', category: 'Distort', description: 'Centre swirl twist.', id: 'swirl-twist', name: 'Swirl Twist', p1: amount('Twist', 0.8) },
  { body: 'vec2 dv = uv - 0.5; float r = length(dv) * 2.0; vec2 f = vec2(0.5) + dv * (1.0 + u_p1 * r * r); vec3 o = texture2D(u_tex, f).rgb;', category: 'Distort', description: 'Round fisheye bulge.', id: 'fisheye', name: 'Fisheye', p1: amount('Bulge', 0.6) },
  { body: 'vec2 dv = uv - 0.5; float r = length(dv) * 2.0; vec2 f = vec2(0.5) + dv * (1.0 - u_p1 * r * r * 0.5); vec3 o = texture2D(u_tex, f).rgb;', category: 'Distort', description: 'Barrel bend inwards.', id: 'barrel-bend', name: 'Barrel Bend', p1: amount('Bend', 0.6) },
  { body: 'vec2 dv = uv - 0.5; float r = length(dv); vec2 p = vec2(0.5) + dv * (1.0 - u_p1 * smoothstep(0.5, 0.0, r)); vec3 o = texture2D(u_tex, p).rgb;', category: 'Distort', description: 'Pinched centre.', id: 'pinch', name: 'Pinch', p1: amount('Pinch', 0.7) },
  { body: 'vec2 dv = uv - 0.5; float a = atan(dv.y, dv.x); float r = length(dv); a = mod(a, 1.047198); a = abs(a - 0.523599); vec3 o = texture2D(u_tex, vec2(0.5) + vec2(cos(a), sin(a)) * r).rgb;', category: 'Distort', description: 'Six-way mirror kaleidoscope.', id: 'kaleidoscope', name: 'Kaleidoscope' },
  { body: 'vec2 m = uv; m.x = m.x < 0.5 ? m.x : 1.0 - m.x; vec3 o = texture2D(u_tex, m).rgb;', category: 'Distort', description: 'Left half mirrored right.', id: 'mirror-split', name: 'Mirror Split' },
  { body: 'vec2 s = uv; s.x = pow(s.x, 1.0 + u_p1); vec3 o = texture2D(u_tex, s).rgb;', category: 'Distort', description: 'Horizontal stretch warp.', id: 'stretch-warp', name: 'Stretch Warp', p1: amount('Stretch', 0.6) },
  { body: 'vec2 w = uv + vec2(sin(uv.y * 30.0 + u_time * 4.0), cos(uv.x * 30.0 + u_time * 4.0)) * 0.005 * u_p1; vec3 o = texture2D(u_tex, w).rgb;', category: 'Distort', description: 'Jelly wobble.', id: 'wobble', name: 'Wobble', p1: amount('Wobble', 0.7) },
  { body: 'vec2 l = uv + 0.01 * u_p1 * vec2(vnoise(uv * 8.0 + u_time * 0.3), vnoise(uv * 8.0 - u_time * 0.3)); vec3 o = texture2D(u_tex, l).rgb;', category: 'Distort', description: 'Slow liquid drift.', id: 'liquid', name: 'Liquid', p1: amount('Flow', 0.7) },
  // ---- Stylize (12) ----
  { body: 'vec2 px = vec2(1.0) / u_res; float gx = length(texture2D(u_tex, uv + vec2(px.x, 0.0)).rgb - texture2D(u_tex, uv - vec2(px.x, 0.0)).rgb); float gy = length(texture2D(u_tex, uv + vec2(0.0, px.y)).rgb - texture2D(u_tex, uv - vec2(0.0, px.y)).rgb); vec3 o = vec3(1.0 - clamp((gx + gy) * u_p1, 0.0, 1.0));', category: 'Stylize', description: 'Ink edge lines.', id: 'edge-ink', name: 'Edge Ink', p1: { default: 6, label: 'Edge', max: 20, min: 1, step: 0.5 } },
  { body: 'vec2 px = vec2(1.0) / u_res; vec3 o = vec3(0.5) + (texture2D(u_tex, uv + vec2(px.x, px.y)).rgb - texture2D(u_tex, uv - vec2(px.x, px.y)).rgb) * u_p1;', category: 'Stylize', description: 'Raised emboss relief.', id: 'emboss', name: 'Emboss', p1: { default: 2, label: 'Depth', max: 6, min: 0.5, step: 0.25 } },
  { body: 'float l = dot(c, vec3(0.3, 0.59, 0.11)); vec2 px = vec2(1.0) / u_res; float gx = length(texture2D(u_tex, uv + vec2(px.x, 0.0)).rgb - texture2D(u_tex, uv - vec2(px.x, 0.0)).rgb); vec3 o = vec3(smoothstep(0.0, 1.0, l) * (1.0 - clamp(gx * 6.0, 0.0, 0.8)));', category: 'Stylize', description: 'Pencil sketch shading.', id: 'sketch-pencil', name: 'Sketch Pencil' },
  { body: 'float l = dot(c, vec3(0.3, 0.59, 0.11)); vec2 g = fract(uv * u_res / u_p1) - 0.5; float dotv = step(length(g), l * 0.5); vec3 o = vec3(dotv);', category: 'Stylize', description: 'Print halftone dots.', id: 'halftone-dots', name: 'Halftone Dots', p1: { default: 8, label: 'Dot size', max: 20, min: 3, step: 1 } },
  { body: 'vec3 o = c * (0.7 + 0.3 * sin(uv.y * u_res.y * 3.14159 / u_p1));', category: 'Stylize', description: 'Old TV scanlines.', id: 'scanlines', name: 'Scanlines', p1: { default: 2, label: 'Spacing', max: 6, min: 1, step: 0.5 } },
  { body: 'vec3 o = c * (0.75 + 0.25 * sin(uv.y * u_res.y * 3.14159 / 2.0)); float d = distance(uv, vec2(0.5)); o *= 1.0 - smoothstep(0.5, 0.9, d) * 0.4;', category: 'Stylize', description: 'Curved CRT screen.', id: 'crt-screen', name: 'CRT Screen' },
  { body: 'vec3 o = c; o.r = texture2D(u_tex, uv + vec2(0.003 * sin(u_time * 7.0), 0.0)).r; o.b = texture2D(u_tex, uv - vec2(0.003, 0.0)).b; o *= 0.9 + 0.1 * sin(uv.y * 200.0 + u_time * 10.0);', category: 'Stylize', description: 'Wobbly VHS tape.', id: 'vhs-tape', name: 'VHS Tape' },
  { body: 'float g = vhash(uv * u_res + fract(u_time) * 100.0) - 0.5; vec3 o = c + vec3(g) * u_p1;', category: 'Stylize', description: 'Animated film grain.', id: 'film-grain', name: 'Film Grain', p1: amount('Grain', 0.25) },
  { body: 'vec3 o; o.r = texture2D(u_tex, uv + vec2(u_p1 * 0.005, 0.0)).r; o.g = c.g; o.b = texture2D(u_tex, uv - vec2(u_p1 * 0.005, 0.0)).b;', category: 'Stylize', description: 'RGB channels shifted apart.', id: 'chroma-shift', name: 'Chroma Shift', p1: amount('Shift', 0.7) },
  { body: 'float d = abs(uv.y - 0.5); vec3 b = vblur4(uv); vec3 o = mix(c, b, smoothstep(u_p1, 0.5, d));', category: 'Stylize', description: 'Miniature tilt-shift blur.', id: 'tilt-shift', name: 'Tilt Shift', p1: amount('Focus', 0.15) },
  { body: 'vec3 o = floor(c * 6.0) / 6.0; o = mix(o, vec3(dot(o, vec3(0.3, 0.59, 0.11))), u_p1 * 0.3);', category: 'Stylize', description: 'Flat oil-paint bands.', id: 'oil-canvas', name: 'Oil Canvas', p1: amount('Wash', 0.4) },
  { body: 'float l = dot(c, vec3(0.3, 0.59, 0.11)); vec2 px = vec2(1.0) / u_res; float gx = length(texture2D(u_tex, uv + vec2(px.x, 0.0)).rgb - texture2D(u_tex, uv - vec2(px.x, 0.0)).rgb); vec3 o = vec3(step(0.5, l)) * (1.0 - clamp(gx * 8.0, 0.0, 1.0));', category: 'Stylize', description: 'Bold comic ink.', id: 'comic-ink', name: 'Comic Ink' },
  // ---- Retro (8) ----
  { body: 'vec3 o = c * vec3(1.1, 1.0, 0.8); o *= 0.85 + 0.15 * vnoise(uv * vec2(1.0, 200.0) + u_time); o *= 1.0 - smoothstep(0.4, 0.8, distance(uv, vec2(0.5))) * 0.4;', category: 'Retro', description: 'Flickering 8mm film.', id: 'eight-mm', name: 'Eight MM' },
  { body: 'vec3 o = mix(c, vec3(0.7), u_p1 * 0.4); o = o * 0.9 + 0.08;', category: 'Retro', description: 'Washed-out old photo.', id: 'faded-memory', name: 'Faded Memory', p1: amount('Fade', 0.7) },
  { body: 'vec3 o = vec3(pow(c.r, 0.9), pow(c.g, 1.1), pow(c.b, 0.8)); o *= vec3(1.05, 1.0, 1.1);', category: 'Retro', description: 'Cross-processed slide film.', id: 'cross-process', name: 'Cross Process' },
  { body: 'vec3 o = c * vec3(1.1, 1.05, 0.9); float d = distance(uv, vec2(0.5)); o *= 1.0 - d * 0.5; o = (o - 0.5) * 1.2 + 0.5;', category: 'Retro', description: 'Lomo camera pop.', id: 'lomo-pop', name: 'Lomo Pop' },
  { body: 'vec3 o = mix(c, vec3(0.95, 0.9, 0.8), 0.25); o = o * 0.95 + 0.05;', category: 'Retro', description: 'Soft polaroid fade.', id: 'polaroid-fade', name: 'Polaroid Fade' },
  { body: 'float l = dot(c, vec3(0.3, 0.59, 0.11)); vec3 o = mix(c, vec3(l), 0.5); o = (o - 0.5) * 1.3 + 0.5;', category: 'Retro', description: 'Silver bleach bypass.', id: 'bleach-pass', name: 'Bleach Pass' },
  { body: 'float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); vec3 o = vec3(smoothstep(0.1, 0.9, l)); o *= 0.9 + 0.1 * vhash(uv * u_res);', category: 'Retro', description: 'High-contrast noir film.', id: 'noir-film', name: 'Noir Film' },
  { body: 'vec3 o = vec3(pow(c.r, 0.8), pow(c.g, 1.2), pow(c.b, 0.9)); o = clamp(o * 1.15, 0.0, 1.0);', category: 'Retro', description: 'Bold technicolor pop.', id: 'technicolor-pop', name: 'Technicolor Pop' },
  // ---- Motion (8) ----
  { body: 'vec2 dv = uv - 0.5; vec3 acc = vec3(0.0); for (int i = 0; i < 8; i++) { acc += texture2D(u_tex, uv - dv * (float(i) / 8.0) * u_p1 * 0.1).rgb; } vec3 o = acc / 8.0;', category: 'Motion', description: 'Radial zoom blur.', id: 'zoom-blur', name: 'Zoom Blur', p1: amount('Blur', 0.7) },
  { body: 'vec3 o = (texture2D(u_tex, uv).rgb + texture2D(u_tex, uv + vec2(0.012 * u_p1, 0.0)).rgb + texture2D(u_tex, uv - vec2(0.012 * u_p1, 0.0)).rgb) / 3.0;', category: 'Motion', description: 'Horizontal motion trail.', id: 'motion-trail', name: 'Motion Trail', p1: amount('Trail', 0.7) },
  { body: 'vec3 o = (c + texture2D(u_tex, uv + vec2(0.02, 0.01)).rgb) * 0.5;', category: 'Motion', description: 'Double-exposure ghost.', id: 'ghost-echo', name: 'Ghost Echo' },
  { body: 'vec2 s = uv + vec2(sin(u_time * 37.0), cos(u_time * 29.0)) * 0.006 * u_p1; vec3 o = texture2D(u_tex, s).rgb;', category: 'Motion', description: 'Handheld camera shake.', id: 'shake', name: 'Shake', p1: amount('Shake', 0.7) },
  { body: 'vec2 d = uv + vec2(u_time * 0.01 * u_p1, 0.0); vec3 o = texture2D(u_tex, fract(d)).rgb;', category: 'Motion', description: 'Slow sideways drift.', id: 'drift', name: 'Drift', p1: amount('Drift', 0.5) },
  { body: 'vec3 o = (texture2D(u_tex, uv).rgb + texture2D(u_tex, uv + vec2(0.01, 0.0)).rgb + texture2D(u_tex, uv - vec2(0.01, 0.0)).rgb) / 3.0;', category: 'Motion', description: 'Soft horizontal smear.', id: 'smear', name: 'Smear' },
  { body: 'vec2 dv = uv - 0.5; float a = atan(dv.y, dv.x); float r = length(dv); vec3 acc = vec3(0.0); for (int i = 0; i < 6; i++) { float aa = a + (float(i) - 2.5) * 0.02 * u_p1; acc += texture2D(u_tex, vec2(0.5) + vec2(cos(aa), sin(aa)) * r).rgb; } vec3 o = acc / 6.0;', category: 'Motion', description: 'Spinning radial blur.', id: 'spin-blur', name: 'Spin Blur', p1: amount('Spin', 0.7) },
  { body: 'vec2 dv = uv - 0.5; float s = 1.0 + 0.05 * sin(u_time * 4.0) * u_p1; vec3 o = texture2D(u_tex, vec2(0.5) + dv * s).rgb;', category: 'Motion', description: 'Gentle pulsing zoom.', id: 'pulse-zoom', name: 'Pulse Zoom', p1: amount('Pulse', 0.8) },
];

export function glslEffectDef(id: string): GlslEffectDef | undefined {
  return GLSL_EFFECT_CATALOG.find((d) => d.id === id);
}

export function glslEffectsByCategory(category: GlslCategory): GlslEffectDef[] {
  return GLSL_EFFECT_CATALOG.filter((d) => d.category === category);
}

/** Search GLSL effects by name/category (case-insensitive substring). */
export function searchGlslEffects(query: string): GlslEffectDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return GLSL_EFFECT_CATALOG;
  return GLSL_EFFECT_CATALOG.filter((d) => d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
}

/** Default params for a GLSL effect (p1/p2). */
export function defaultGlslParams(def: GlslEffectDef): Record<string, number> {
  const out: Record<string, number> = {};
  if (def.p1) out.p1 = def.p1.default;
  if (def.p2) out.p2 = def.p2.default;
  return out;
}
