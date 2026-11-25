import type { Effect } from '../schema/project';
import { defaultGlslParams, glslEffectDef, type GlslEffectDef } from './glslEffects';
import type { GlslEffectInstance } from './glsl';

/** Video effects engine (Phase 2, SPEC E; Phase 5 adds 62 GLSL effects).
 * CSS-filter effects are applied via ctx.filter in the compositor;
 * pixel effects (pixelate, vignette, RGB split, glitch) run on an
 * offscreen canvas step in `src/lib/compositor.ts`; GLSL effects run
 * through the WebGL2 chain in `src/lib/glsl.ts` (same step, after the
 * pixel pass). */

export interface EffectParamDef {
  default: number;
  label: string;
  max: number;
  min: number;
  step: number;
}

export interface EffectDef {
  description: string;
  id: string;
  name: string;
  params: Record<string, EffectParamDef>;
  /** CSS filter template; `{p}` values are param names. */
  css?: (params: Record<string, number>, intensity: number) => string;
  /** Needs the pixel pipeline (offscreen canvas) instead of ctx.filter. */
  pixel?: 'pixelate' | 'vignette' | 'rgb-split' | 'glitch';
}

function num(params: Record<string, number>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export const EFFECT_CATALOG: EffectDef[] = [
  {
    css: (p, i) => `blur(${(num(p, 'radius', 8) * i).toFixed(1)}px)`,
    description: 'Softens the frame.',
    id: 'blur',
    name: 'Blur',
    params: { radius: { default: 8, label: 'Radius (px)', max: 40, min: 0, step: 1 } },
  },
  {
    css: (p, i) => `brightness(${(1 + num(p, 'amount', 0.3) * i).toFixed(2)})`,
    description: 'Lifts or lowers brightness.',
    id: 'brightness',
    name: 'Brightness',
    params: { amount: { default: 0.3, label: 'Amount', max: 1, min: -1, step: 0.05 } },
  },
  {
    css: (_p, i) => `grayscale(${(i * 100).toFixed(0)}%)`,
    description: 'Removes colour.',
    id: 'grayscale',
    name: 'Grayscale',
    params: {},
  },
  {
    css: (_p, i) => `sepia(${(i * 100).toFixed(0)}%)`,
    description: 'Warm vintage tone.',
    id: 'sepia',
    name: 'Sepia',
    params: {},
  },
  {
    css: (_p, i) => `invert(${(i * 100).toFixed(0)}%)`,
    description: 'Inverts colours.',
    id: 'invert',
    name: 'Invert',
    params: {},
  },
  {
    css: (p, i) => `hue-rotate(${(num(p, 'degrees', 90) * i).toFixed(0)}deg)`,
    description: 'Rotates hues around the colour wheel.',
    id: 'hue-rotate',
    name: 'Hue Rotate',
    params: { degrees: { default: 90, label: 'Degrees', max: 360, min: -360, step: 5 } },
  },
  {
    css: (p, i) => `contrast(${(1 + num(p, 'amount', 0.4) * i).toFixed(2)})`,
    description: 'Increases contrast.',
    id: 'contrast',
    name: 'Contrast',
    params: { amount: { default: 0.4, label: 'Amount', max: 1, min: -1, step: 0.05 } },
  },
  {
    css: (p, i) => `saturate(${(1 + num(p, 'amount', 0.8) * i).toFixed(2)})`,
    description: 'Boosts or drains saturation.',
    id: 'saturate',
    name: 'Saturate',
    params: { amount: { default: 0.8, label: 'Amount', max: 2, min: -1, step: 0.1 } },
  },
  {
    description: 'Large retro pixels.',
    id: 'pixelate',
    name: 'Pixelate',
    params: { size: { default: 12, label: 'Pixel size (px)', max: 48, min: 2, step: 1 } },
    pixel: 'pixelate',
  },
  {
    description: 'Darkened corners.',
    id: 'vignette',
    name: 'Vignette',
    params: { strength: { default: 0.6, label: 'Strength', max: 1, min: 0, step: 0.05 } },
    pixel: 'vignette',
  },
  {
    description: 'Red/blue channels pulled apart.',
    id: 'rgb-split',
    name: 'RGB Split',
    params: { offset: { default: 6, label: 'Offset (px)', max: 30, min: 0, step: 1 } },
    pixel: 'rgb-split',
  },
  {
    description: 'Digital glitch slices.',
    id: 'glitch',
    name: 'Glitch',
    params: { amount: { default: 0.5, label: 'Amount', max: 1, min: 0, step: 0.05 } },
    pixel: 'glitch',
  },
  {
    css: (p, i) => `drop-shadow(0 0 ${(num(p, 'radius', 12) * i).toFixed(0)}px rgba(124,58,237,0.9))`,
    description: 'Violet glow around bright areas.',
    id: 'glow',
    name: 'Glow',
    params: { radius: { default: 12, label: 'Radius (px)', max: 40, min: 0, step: 1 } },
  },
  {
    css: (_p, i) => `saturate(${(1 + 0.6 * i).toFixed(2)}) contrast(${(1 + 0.25 * i).toFixed(2)}) brightness(${(1 + 0.08 * i).toFixed(2)})`,
    description: 'Punchy duotone-ready look.',
    id: 'vivid',
    name: 'Vivid',
    params: {},
  },
];

/**
 * Filters-tab Tools (Web check 2026-11-25 §3; v1.0.3): the 7 AI
 * enhancement tools (Enhance, 4K, HD Upscale, Quality Restoration,
 * Night-view Color, HD Cam 2, HD Pet). On CapCut Web a single click
 * applies one directly — a marker appears on a track above the clip at
 * the playhead and the preview changes; selecting it shows a Basic
 * panel with ONLY an Intensity slider (100). Vidora models effects
 * clip-level (no segment tracks), so a tool applies as a clip effect
 * with Intensity only — same click-to-apply, same visible preview
 * change, same Intensity-only control (in the Applied tools card);
 * the marker segment is the one documented divergence. The CSS below
 * is a LOCAL approximation (brightness/contrast/saturation lift) —
 * there is no detail recovery and no ML model, and the panel says so.
 * These defs live outside EFFECT_CATALOG on purpose: they must NOT
 * appear as tiles in the Effects panel.
 */
export const TOOL_EFFECT_DEFS: EffectDef[] = [
  {
    css: (_p, i) => `brightness(${(1 + 0.18 * i).toFixed(2)}) contrast(${(1 + 0.12 * i).toFixed(2)}) saturate(${(1 + 0.15 * i).toFixed(2)})`,
    description: 'Low-light lift + retouch (local approximation, no detail recovery).',
    id: 'tool-enhance',
    name: 'Enhance',
    params: {},
  },
  {
    css: (_p, i) => `contrast(${(1 + 0.08 * i).toFixed(2)}) saturate(${(1 + 0.1 * i).toFixed(2)}) brightness(${(1 + 0.02 * i).toFixed(2)})`,
    description: 'Upscale feel (resample + sharpen — no detail recovery).',
    id: 'tool-4k',
    name: '4K',
    params: {},
  },
  {
    css: (_p, i) => `contrast(${(1 + 0.06 * i).toFixed(2)}) saturate(${(1 + 0.08 * i).toFixed(2)})`,
    description: 'Upscale feel (resample + sharpen — no detail recovery).',
    id: 'tool-hd-upscale',
    name: 'HD Upscale',
    params: {},
  },
  {
    css: (_p, i) => `brightness(${(1 + 0.05 * i).toFixed(2)}) contrast(${(1 + 0.1 * i).toFixed(2)}) saturate(${(1 + 0.05 * i).toFixed(2)})`,
    description: 'Denoise + sharpen feel (no detail recovery).',
    id: 'tool-quality-restoration',
    name: 'Quality Restoration',
    params: {},
  },
  {
    css: (_p, i) => `brightness(${(1 + 0.28 * i).toFixed(2)}) saturate(${(1 + 0.3 * i).toFixed(2)}) contrast(${(1 + 0.08 * i).toFixed(2)})`,
    description: 'Low-light colour lift (local approximation).',
    id: 'tool-night-view',
    name: 'Night-view Color',
    params: {},
  },
  {
    css: (_p, i) => `contrast(${(1 + 0.15 * i).toFixed(2)}) saturate(${(1 + 0.2 * i).toFixed(2)})`,
    description: 'High-contrast cam look (local approximation).',
    id: 'tool-hd-cam-2',
    name: 'HD Cam 2',
    params: {},
  },
  {
    css: (_p, i) => `saturate(${(1 + 0.25 * i).toFixed(2)}) contrast(${(1 + 0.05 * i).toFixed(2)}) brightness(${(1 + 0.03 * i).toFixed(2)})`,
    description: 'Pet-photo colour lift (local approximation).',
    id: 'tool-hd-pet',
    name: 'HD Pet',
    params: {},
  },
];

export function toolEffectDef(id: string): EffectDef | undefined {
  return TOOL_EFFECT_DEFS.find((d) => d.id === id);
}

export function effectDef(id: string): EffectDef | undefined {
  return EFFECT_CATALOG.find((d) => d.id === id);
}

/** A GLSL effect definition, or undefined when the id is not a GLSL effect. */
export function glslDef(id: string): GlslEffectDef | undefined {
  return glslEffectDef(id);
}

/** Any effect definition (CSS/pixel catalog first, then the GLSL catalog, then the Filters Tools). */
export function anyEffectDef(id: string): EffectDef | GlslEffectDef | undefined {
  return effectDef(id) ?? glslEffectDef(id) ?? toolEffectDef(id);
}

export function defaultEffectParams(def: EffectDef | GlslEffectDef): Record<string, number> {
  if ('body' in def) return defaultGlslParams(def);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(def.params)) out[k] = v.default;
  return out;
}

export function effectParams(effect: Effect): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(effect.params)) if (typeof v === 'number') out[k] = v;
  return out;
}

/** Combined CSS filter string for all CSS-based effects on a clip. */
export function cssFilterForEffects(effects: Effect[]): string {
  const parts: string[] = [];
  for (const effect of effects) {
    const def = anyEffectDef(effect.name);
    if (def && 'css' in def && def.css) parts.push(def.css(effectParams(effect), effect.intensity));
  }
  return parts.length > 0 ? parts.join(' ') : 'none';
}

/** Pixel-pipeline effects on a clip (applied in compositor order). */
export function pixelEffects(effects: Effect[]): { def: EffectDef; effect: Effect }[] {
  const out: { def: EffectDef; effect: Effect }[] = [];
  for (const effect of effects) {
    const def = anyEffectDef(effect.name);
    if (def && 'pixel' in def && def.pixel) out.push({ def, effect });
  }
  return out;
}

/** GLSL effects on a clip, as WebGL instances (compositor order). */
export function glslEffectInstances(effects: Effect[]): GlslEffectInstance[] {
  const out: GlslEffectInstance[] = [];
  for (const effect of effects) {
    const def = glslEffectDef(effect.name);
    if (!def) continue;
    const params = effectParams(effect);
    out.push({
      body: def.body,
      intensity: effect.intensity,
      p1: typeof params.p1 === 'number' ? params.p1 : (def.p1?.default ?? 0),
      p2: typeof params.p2 === 'number' ? params.p2 : (def.p2?.default ?? 0),
    });
  }
  return out;
}

/** Deterministic glitch slice offsets for a frame (seeded by frame index). */
export function glitchSlices(frameIndex: number, height: number, amount: number): { dy: number; h: number; shift: number; y: number }[] {
  if (amount <= 0) return [];
  const slices: { dy: number; h: number; shift: number; y: number }[] = [];
  let seed = (frameIndex + 1) * 2654435761;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const count = Math.round(2 + amount * 8);
  for (let i = 0; i < count; i += 1) {
    const h = Math.max(4, Math.round(height * (0.02 + rand() * 0.08)));
    const y = Math.floor(rand() * Math.max(1, height - h));
    slices.push({ dy: y, h, shift: Math.round((rand() - 0.5) * 60 * amount), y });
  }
  return slices;
}
