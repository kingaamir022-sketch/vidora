/** Scopes (Phase 2, SPEC F). Pure analysis over RGBA pixels — no DOM. */

export interface Histogram {
  b: number[];
  g: number[];
  r: number[];
}

export function computeHistogram(pixels: Uint8ClampedArray): Histogram {
  const r = new Array<number>(256).fill(0);
  const g = new Array<number>(256).fill(0);
  const b = new Array<number>(256).fill(0);
  for (let i = 0; i < pixels.length; i += 4) {
    r[pixels[i]] += 1;
    g[pixels[i + 1]] += 1;
    b[pixels[i + 2]] += 1;
  }
  return { b, g, r };
}

/** Waveform: per-column luma min/max, sampled into `columns` buckets. */
export function computeWaveform(pixels: Uint8ClampedArray, width: number, height: number, columns = 64): { max: number[]; min: number[] } {
  const min = new Array<number>(columns).fill(255);
  const max = new Array<number>(columns).fill(0);
  const perCol = Math.max(1, Math.floor(width / columns));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const luma = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
      const c = Math.min(columns - 1, Math.floor(x / perCol));
      if (luma < min[c]) min[c] = luma;
      if (luma > max[c]) max[c] = luma;
    }
  }
  return { max, min };
}

/** Vectorscope: counts of pixels in a hue/saturation grid (32x32). */
export function computeVectorscope(pixels: Uint8ClampedArray, grid = 32): number[][] {
  const scope: number[][] = Array.from({ length: grid }, () => new Array<number>(grid).fill(0));
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] / 255;
    const g = pixels[i + 1] / 255;
    const b = pixels[i + 2] / 255;
    // YIQ chroma axes.
    const u = 0.5 * (b - 0.5) - 0.5 * (r - 0.5) * 0.5 - 0.5 * (g - 0.5) * 0.5 + 0.5;
    const v = (r - g) * 0.5 + 0.5;
    const cx = Math.min(grid - 1, Math.max(0, Math.floor(u * grid)));
    const cy = Math.min(grid - 1, Math.max(0, Math.floor(v * grid)));
    scope[cy][cx] += 1;
  }
  return scope;
}

/** Average luma / exposure summary of a frame. */
export function frameExposure(pixels: Uint8ClampedArray): { avgLuma: number; clippedBlack: number; clippedWhite: number } {
  let sum = 0;
  let black = 0;
  let white = 0;
  const n = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    const luma = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
    sum += luma;
    if (luma < 8) black += 1;
    if (luma > 247) white += 1;
  }
  return { avgLuma: n > 0 ? sum / n / 255 : 0, clippedBlack: n > 0 ? black / n : 0, clippedWhite: n > 0 ? white / n : 0 };
}
