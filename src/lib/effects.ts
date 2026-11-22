import type { Effect } from '../schema/project';

/** Video effects engine (Phase 2, SPEC E). Pure catalog + filter math.
 * CSS-filter effects are applied via ctx.filter in the compositor;
 * pixel effects (pixelate, vignette, RGB split, glitch) run on an
 * offscreen canvas step in `src/lib/compositor.ts`. */

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

export function effectDef(id: string): EffectDef | undefined {
  return EFFECT_CATALOG.find((d) => d.id === id);
}

export function defaultEffectParams(def: EffectDef): Record<string, number> {
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
    const def = effectDef(effect.name);
    if (def?.css) parts.push(def.css(effectParams(effect), effect.intensity));
  }
  return parts.length > 0 ? parts.join(' ') : 'none';
}

/** Pixel-pipeline effects on a clip (applied in compositor order). */
export function pixelEffects(effects: Effect[]): { def: EffectDef; effect: Effect }[] {
  const out: { def: EffectDef; effect: Effect }[] = [];
  for (const effect of effects) {
    const def = effectDef(effect.name);
    if (def?.pixel) out.push({ def, effect });
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
