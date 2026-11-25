/**
 * Real photo thumbnails for the Filters + Transitions tiles (v1.0.2, W4 —
 * D16). CapCut #25 shows REAL PHOTO thumbnails on both — a sample photo
 * with the filter applied, and a sample still for the transition — never
 * a flat gradient and never a bare letter.
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
