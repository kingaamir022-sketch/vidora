/**
 * Real photo thumbnails for the Filters + Transitions + Effects tiles
 * (v1.0.2, W4 — D16; v1.0.4 adds the classic effects). CapCut #23/#25/
 * #27 shows REAL PHOTO thumbnails on all three — a sample photo with
 * the filter/effect applied, and a sample still for the transition —
 * never a flat gradient and never a bare letter.
 *
 * Source photos are Vidora's own AI-library clip posters (real JPEGs
 * shipped in the repo under public/ai-library/clips/posters/). Both
 * renderers are pure canvas work on top of the existing machinery:
 * filters reuse sampleLut (the same 3D-LUT sampling the compositor
 * uses); transitions reuse drawTransition (the same renderer the
 * preview uses), frozen mid-transition (progress 0.5).
 */

import { drawTransition } from './transitions';
import { sampleLut, type BuiltinLut } from './lut';
import type { TransitionType } from '../schema/project';
import type { EffectDef } from './effects';

/** Sample stills — two different posters so a transition has a real
 * "from" and "to" frame. */
export const FILTER_SAMPLE_SRC = '/ai-library/clips/posters/ai-clip-001.jpg';
export const TRANSITION_FROM_SRC = '/ai-library/clips/posters/ai-clip-002.jpg';
export const TRANSITION_TO_SRC = '/ai-library/clips/posters/ai-clip-001.jpg';

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

/** Load a sample photo once per URL (shared by every tile). Resolves
 * null when the file is missing so callers can fall back honestly. */
export function loadSampleImage(src: string): Promise<HTMLImageElement | null> {
  let pending = imageCache.get(src);
  if (!pending) {
    pending = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageCache.set(src, pending);
  }
  return pending;
}

function coverInto(canvas: HTMLCanvasElement, img: HTMLImageElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const s = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
}

/** The sample photo with a builtin LUT actually applied, as a data URL.
 * Per-pixel 3D-LUT sampling at thumbnail size (192×108). */
export function lutPhotoDataUrl(lut: BuiltinLut, img: HTMLImageElement, w = 192, h = 108): string {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  coverInto(c, img);
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const data = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < data.data.length; i += 4) {
    const [r, g, b] = sampleLut(lut.data, lut.size, data.data[i] / 255, data.data[i + 1] / 255, data.data[i + 2] / 255);
    data.data[i] = Math.round(r * 255);
    data.data[i + 1] = Math.round(g * 255);
    data.data[i + 2] = Math.round(b * 255);
  }
  ctx.putImageData(data, 0, 0);
  return c.toDataURL('image/png');
}

/** A transition frozen mid-way between two sample stills, as a data URL.
 * Uses the preview's own drawTransition, so the still shows the real
 * transition shape (wipe / slide / fade / …) instead of a letter. */
export function transitionStillDataUrl(
  type: TransitionType,
  fromImg: HTMLImageElement,
  toImg: HTMLImageElement,
  w = 192,
  h = 108,
): string {
  const frame = (img: HTMLImageElement): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    coverInto(c, img);
    return c;
  };
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return '';
  drawTransition(ctx, frame(fromImg), frame(toImg), type, 0.5, 'right', w, h);
  return out.toDataURL('image/png');
}

/** The sample photo with a classic effect actually applied, as a data
 * URL (v1.0.4). CapCut #23 shows real photo thumbnails on effect
 * tiles too — the classic effects used to show a gradient with the
 * name on it, which CapCut never does. CSS-filter defs run through
 * ctx.filter (the same filter the compositor uses, intensity 1, default
 * params); the four pixel defs are reproduced on canvas at thumbnail
 * size (pixelate = downscale + nearest-neighbour upscale; vignette =
 * radial darkening; rgb-split = red/blue channels pulled apart;
 * glitch = offset slices). Square 130×130 to match the desktop
 * 2-column tiles. */
export function effectPhotoDataUrl(def: EffectDef, img: HTMLImageElement, w = 130, h = 130): string {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const defaults: Record<string, number> = {};
  for (const [k, p] of Object.entries(def.params)) defaults[k] = p.default;
  if (def.css) {
    ctx.filter = def.css(defaults, 1);
    coverInto(c, img);
    ctx.filter = 'none';
    return c.toDataURL('image/png');
  }
  coverInto(c, img);
  if (def.pixel === 'pixelate') {
    const size = defaults.size ?? 12;
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(w / size));
    small.height = Math.max(1, Math.round(h / size));
    const sctx = small.getContext('2d');
    if (!sctx) return '';
    sctx.drawImage(c, 0, 0, small.width, small.height);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(small, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
  } else if (def.pixel === 'vignette') {
    const strength = defaults.strength ?? 0.6;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (def.pixel === 'rgb-split') {
    const off = defaults.offset ?? 6;
    const channel = (fill: string, dx: number) => {
      const t = document.createElement('canvas');
      t.width = w;
      t.height = h;
      const tctx = t.getContext('2d');
      if (!tctx) return;
      tctx.drawImage(c, 0, 0);
      tctx.globalCompositeOperation = 'multiply';
      tctx.fillStyle = fill;
      tctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(t, dx, 0);
      ctx.globalCompositeOperation = 'source-over';
    };
    channel('rgb(255,0,0)', -off);
    channel('rgb(0,0,255)', off);
  } else if (def.pixel === 'glitch') {
    const amount = defaults.amount ?? 0.5;
    const slices = Math.round(4 + amount * 10);
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < slices; i++) {
      const sy = Math.floor(rnd() * h);
      const sh = Math.max(2, Math.floor(rnd() * h * 0.12));
      const dx = Math.round((rnd() - 0.5) * 24 * amount * 2);
      ctx.drawImage(c, 0, sy, w, sh, dx, sy, w, sh);
    }
  }
  return c.toDataURL('image/png');
}

/** CapCut truncates long tile names in the middle ("Heart ...p Down",
 * #23) — the head and the tail stay readable. Used by the tile
 * labels in the Effects / Filters / Transitions panels. */
export function middleTruncate(name: string, head = 6, tail = 5): string {
  if (name.length <= head + tail + 3) return name;
  return `${name.slice(0, head)}…${name.slice(-tail)}`;
}

/** Download a text file (used by the filter tile's download icon — a
 * real .cube preset the user can open in any LUT-aware app). */
export function downloadTextFile(filename: string, text: string, mime = 'text/plain'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download a data-URL image (used by the transition tile's download
 * icon — the mid-transition still as a PNG). */
export function downloadDataUrlFile(filename: string, dataUrl: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
