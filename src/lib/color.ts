import type { Adjustment, CurvePoint } from '../schema/project';

/** Colour & adjustment math (Phase 2, SPEC F). Pure functions over RGBA pixels. */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const clamp255 = (v: number) => Math.min(255, Math.max(0, Math.round(v)));

/** Piecewise-linear curve lookup (points sorted by x). */
export function evalCurve(points: CurvePoint[], x: number): number {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  if (sorted.length === 0) return clamp01(x);
  if (x <= sorted[0].x) return clamp01(sorted[0].y);
  const last = sorted[sorted.length - 1];
  if (x >= last.x) return clamp01(last.y);
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (x >= a.x && x <= b.x) {
      const span = b.x - a.x || 1;
      return clamp01(a.y + ((b.y - a.y) * (x - a.x)) / span);
    }
  }
  return clamp01(x);
}

export function buildCurveLookup(points: CurvePoint[]): Uint8Array {
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) lut[i] = Math.round(evalCurve(points, i / 255) * 255);
  return lut;
}

/**
 * Drag a curve point to (x, y). The point is clamped between its
 * neighbours so the curve stays a function of x (endpoints stay inside
 * 0–1); the result is re-sorted by x. Pure — used by the curves editor
 * and unit-tested.
 */
export function moveCurvePoint(points: CurvePoint[], index: number, x: number, y: number): CurvePoint[] {
  if (index < 0 || index >= points.length) return [...points];
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const prev = sorted[index - 1];
  const next = sorted[index + 1];
  const minX = prev ? prev.x + 0.01 : 0;
  const maxX = next ? next.x - 0.01 : 1;
  const nx = Math.min(maxX, Math.max(minX, x));
  const ny = Math.min(1, Math.max(0, y));
  const moved = sorted.map((p, i) => (i === index ? { x: nx, y: ny } : { ...p }));
  return moved.sort((a, b) => a.x - b.x);
}

export type CurvePresetName = 'custom' | 'lighten' | 'darken' | 'fade' | 'contrast' | 'cool' | 'warm' | 'vintage';

/**
 * Curve presets (CapCut Curves tab: Custom, Lighten, Darken, Fade,
 * Contrast, Cool tone, Warm tone, Vintage). Each preset is a set of
 * points for one channel; the editor applies it to the active channel.
 */
export function curvePreset(name: CurvePresetName): CurvePoint[] {
  switch (name) {
    case 'lighten':
      return [{ x: 0, y: 0 }, { x: 0.5, y: 0.65 }, { x: 1, y: 1 }];
    case 'darken':
      return [{ x: 0, y: 0 }, { x: 0.5, y: 0.35 }, { x: 1, y: 1 }];
    case 'fade':
      return [{ x: 0, y: 0.08 }, { x: 1, y: 0.92 }];
    case 'contrast':
      return [{ x: 0, y: 0 }, { x: 0.25, y: 0.18 }, { x: 0.75, y: 0.82 }, { x: 1, y: 1 }];
    case 'cool':
      return [{ x: 0, y: 0 }, { x: 0.5, y: 0.6 }, { x: 1, y: 1 }];
    case 'warm':
      return [{ x: 0, y: 0.04 }, { x: 0.5, y: 0.5 }, { x: 1, y: 0.96 }];
    case 'vintage':
      return [{ x: 0, y: 0.08 }, { x: 0.5, y: 0.55 }, { x: 1, y: 0.92 }];
    case 'custom':
    default:
      return [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  }
}

export const CURVE_PRESETS: CurvePresetName[] = ['custom', 'lighten', 'darken', 'fade', 'contrast', 'cool', 'warm', 'vintage'];

/** Map a Vidora blend mode to the canvas globalCompositeOperation value. */
export function canvasBlendMode(mode: string): GlobalCompositeOperation {
  if (mode === 'normal') return 'source-over';
  const valid: GlobalCompositeOperation[] = ['multiply', 'screen', 'overlay', 'darken', 'lighten', 'soft-light', 'hard-light', 'difference', 'color-burn', 'color-dodge'];
  return (valid as string[]).includes(mode) ? (mode as GlobalCompositeOperation) : 'source-over';
}

/** Lift / gamma / gain for one channel: out = gain * (in^gamma) + lift. */
export function applyWheel(value: number, lift: number, gamma: number, gain: number): number {
  const lifted = clamp01(value + lift * 0.5);
  const gammad = Math.pow(lifted, Math.max(0.2, 1 - gamma * 0.5));
  return clamp01(gammad * (1 + gain * 0.5));
}

/** Is an adjustment a no-op (apart from the labelled stubs)? */
export function isAdjustmentIdentity(a: Adjustment): boolean {
  return (
    a.brightness === 0 &&
    a.contrast === 0 &&
    a.saturation === 0 &&
    a.exposure === 0 &&
    a.highlights === 0 &&
    a.shadows === 0 &&
    a.temperature === 0 &&
    a.tint === 0 &&
    a.hue === 0 &&
    a.sharpen === 0 &&
    a.denoise === 0 &&
    a.hslHue === 0 &&
    a.hslSaturation === 0 &&
    a.hslLightness === 0 &&
    a.curves.r.length === 2 &&
    a.curves.g.length === 2 &&
    a.curves.b.length === 2 &&
    a.lift.r === 0 && a.lift.g === 0 && a.lift.b === 0 &&
    a.gamma.r === 0 && a.gamma.g === 0 && a.gamma.b === 0 &&
    a.gain.r === 0 && a.gain.g === 0 && a.gain.b === 0
  );
}

/** CSS filter string for the fast-path adjustments (ctx.filter). */
export function cssFilterForAdjustment(a: Adjustment): string {
  const parts: string[] = [];
  if (a.brightness !== 0) parts.push(`brightness(${(1 + a.brightness).toFixed(3)})`);
  if (a.contrast !== 0) parts.push(`contrast(${(1 + a.contrast).toFixed(3)})`);
  if (a.saturation !== 0) parts.push(`saturate(${(1 + a.saturation).toFixed(3)})`);
  if (a.hue !== 0) parts.push(`hue-rotate(${a.hue}deg)`);
  if (a.exposure !== 0) parts.push(`brightness(${(Math.pow(2, a.exposure)).toFixed(3)})`);
  if (a.denoise > 0) parts.push(`blur(${(a.denoise * 1.5).toFixed(2)}px)`);
  return parts.length > 0 ? parts.join(' ') : 'none';
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number] = [0, 0, 0];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return [rgb[0] + m, rgb[1] + m, rgb[2] + m];
}

/**
 * Full per-pixel adjustment pass (curves, wheels, temperature/tint,
 * highlights/shadows, HSL). Run on the compositor's offscreen frame when
 * any of these are non-default; the CSS fast path covers the rest.
 */
export function applyAdjustmentToPixels(pixels: Uint8ClampedArray, a: Adjustment): void {
  const rLut = buildCurveLookup(a.curves.r);
  const gLut = buildCurveLookup(a.curves.g);
  const bLut = buildCurveLookup(a.curves.b);
  const warm = a.temperature;
  const tint = a.tint;
  for (let i = 0; i < pixels.length; i += 4) {
    let r = rLut[pixels[i]] / 255;
    let g = gLut[pixels[i + 1]] / 255;
    let b = bLut[pixels[i + 2]] / 255;
    // Lift / gamma / gain per channel.
    r = applyWheel(r, a.lift.r, a.gamma.r, a.gain.r);
    g = applyWheel(g, a.lift.g, a.gamma.g, a.gain.g);
    b = applyWheel(b, a.lift.b, a.gamma.b, a.gain.b);
    // Temperature (warm = +red, -blue) and tint (green/magenta).
    if (warm !== 0) {
      r = clamp01(r + warm * 0.12);
      b = clamp01(b - warm * 0.12);
    }
    if (tint !== 0) {
      g = clamp01(g + tint * 0.08);
      r = clamp01(r - tint * 0.04);
      b = clamp01(b - tint * 0.04);
    }
    // Highlights / shadows by luminance.
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (a.highlights !== 0 && lum > 0.5) {
      const f = ((lum - 0.5) / 0.5) * a.highlights * 0.4;
      r = clamp01(r + f);
      g = clamp01(g + f);
      b = clamp01(b + f);
    }
    if (a.shadows !== 0 && lum < 0.5) {
      const f = ((0.5 - lum) / 0.5) * a.shadows * 0.4;
      r = clamp01(r + f);
      g = clamp01(g + f);
      b = clamp01(b + f);
    }
    // HSL shift.
    if (a.hslHue !== 0 || a.hslSaturation !== 0 || a.hslLightness !== 0) {
      const [h, s, l] = rgbToHsl(r, g, b);
      const h2 = (((h + a.hslHue) % 360) + 360) % 360;
      const s2 = clamp01(s * (1 + a.hslSaturation));
      const l2 = clamp01(l + a.hslLightness * 0.3);
      [r, g, b] = hslToRgb(h2, s2, l2);
    }
    pixels[i] = clamp255(r * 255);
    pixels[i + 1] = clamp255(g * 255);
    pixels[i + 2] = clamp255(b * 255);
  }
}

/** 3x3 sharpen convolution on RGBA pixels (alpha untouched). */
export function sharpenPixels(pixels: Uint8ClampedArray, width: number, height: number, amount: number): void {
  if (amount <= 0) return;
  const src = new Uint8ClampedArray(pixels);
  const k = amount;
  const kernel = [0, -k, 0, -k, 1 + 4 * k, -k, 0, -k, 0];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (let ch = 0; ch < 3; ch += 1) {
        let acc = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            const px = Math.min(width - 1, Math.max(0, x + kx));
            const py = Math.min(height - 1, Math.max(0, y + ky));
            acc += src[(py * width + px) * 4 + ch] * kernel[(ky + 1) * 3 + kx + 1];
          }
        }
        pixels[(y * width + x) * 4 + ch] = clamp255(acc);
      }
    }
  }
}
