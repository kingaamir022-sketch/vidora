/** .cube LUT parsing + application (Phase 2, SPEC E). Pure functions. */

export interface ParsedCube {
  data: number[];
  size: number;
  title: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Parse an Adobe .cube file. Throws with a readable message on bad input. */
export function parseCube(text: string): ParsedCube {
  const lines = text.split(/\r?\n/);
  let size = 0;
  let title = 'Untitled LUT';
  const values: number[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('TITLE')) {
      title = line.slice(5).trim().replace(/^"|"$/g, '') || title;
      continue;
    }
    if (line.startsWith('LUT_3D_SIZE')) {
      size = Number(line.split(/\s+/)[1]);
      continue;
    }
    if (line.startsWith('LUT_1D_SIZE') || line.startsWith('DOMAIN_') || line.startsWith('LUT_')) continue;
    const parts = line.split(/\s+/).map(Number);
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      values.push(clamp01(parts[0]), clamp01(parts[1]), clamp01(parts[2]));
    }
  }
  if (!size || size < 2 || size > 64) throw new Error('Invalid .cube file: missing or out-of-range LUT_3D_SIZE (2–64).');
  if (values.length !== size * size * size * 3) {
    throw new Error(`Invalid .cube file: expected ${size * size * size} RGB entries, found ${values.length / 3}.`);
  }
  return { data: values, size, title };
}

/** Trilinear sample of a 3D LUT at one RGB point. */
export function sampleLut(data: number[], size: number, r: number, g: number, b: number): [number, number, number] {
  const x = clamp01(r) * (size - 1);
  const y = clamp01(g) * (size - 1);
  const z = clamp01(b) * (size - 1);
  const x0 = Math.min(size - 2, Math.floor(x));
  const y0 = Math.min(size - 2, Math.floor(y));
  const z0 = Math.min(size - 2, Math.floor(z));
  const fx = x - x0;
  const fy = y - y0;
  const fz = z - z0;
  const at = (ix: number, iy: number, iz: number, ch: number) => data[((iz * size + iy) * size + ix) * 3 + ch];
  const lerp = (a: number, b2: number, t: number) => a + (b2 - a) * t;
  const out: [number, number, number] = [0, 0, 0];
  for (let ch = 0; ch < 3; ch += 1) {
    const c000 = at(x0, y0, z0, ch);
    const c100 = at(x0 + 1, y0, z0, ch);
    const c010 = at(x0, y0 + 1, z0, ch);
    const c110 = at(x0 + 1, y0 + 1, z0, ch);
    const c001 = at(x0, y0, z0 + 1, ch);
    const c101 = at(x0 + 1, y0, z0 + 1, ch);
    const c011 = at(x0, y0 + 1, z0 + 1, ch);
    const c111 = at(x0 + 1, y0 + 1, z0 + 1, ch);
    const lo = lerp(lerp(c000, c100, fx), lerp(c010, c110, fx), fy);
    const hi = lerp(lerp(c001, c101, fx), lerp(c011, c111, fx), fy);
    out[ch] = lerp(lo, hi, fz);
  }
  return out;
}

/** Apply a LUT to RGBA pixels in place, blended by `intensity` (0 = original). */
export function applyLutToPixels(pixels: Uint8ClampedArray, data: number[], size: number, intensity: number): void {
  if (intensity <= 0) return;
  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b] = sampleLut(data, size, pixels[i] / 255, pixels[i + 1] / 255, pixels[i + 2] / 255);
    pixels[i] = Math.round(pixels[i] + (r * 255 - pixels[i]) * intensity);
    pixels[i + 1] = Math.round(pixels[i + 1] + (g * 255 - pixels[i + 1]) * intensity);
    pixels[i + 2] = Math.round(pixels[i + 2] + (b * 255 - pixels[i + 2]) * intensity);
  }
}

/** Generate an original procedural LUT of a given size from a colour transform. */
export function generateLut(size: number, fn: (r: number, g: number, b: number) => [number, number, number]): number[] {
  const data: number[] = [];
  for (let z = 0; z < size; z += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const [r, g, b] = fn(x / (size - 1), y / (size - 1), z / (size - 1));
        data.push(clamp01(r), clamp01(g), clamp01(b));
      }
    }
  }
  return data;
}

export interface BuiltinLut {
  category: string;
  data: number[];
  id: string;
  name: string;
  size: number;
}

export const LUT_CATEGORIES = ['Warm', 'Cool', 'Film', 'Mono', 'Vivid', 'Soft'] as const;

/** 30 built-in original Vidora looks (generated, no third-party LUTs). */
export const BUILTIN_LUTS: BuiltinLut[] = (() => {
  const make = (id: string, name: string, category: string, fn: (r: number, g: number, b: number) => [number, number, number]): BuiltinLut => ({
    category,
    data: generateLut(8, fn),
    id,
    name,
    size: 8,
  });
  const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [
    make('vidora-warm', 'Vidora Warm', 'Warm', (r, g, b) => [r * 1.08 + 0.04, g * 1.0, b * 0.92]),
    make('vidora-cool-teal', 'Vidora Cool Teal', 'Cool', (r, g, b) => [r * 0.94, g * 1.02, b * 1.1 + 0.03]),
    make('vidora-mono', 'Vidora Mono', 'Mono', (r, g, b) => {
      const l = lum(r, g, b);
      return [l, l, l];
    }),
    // ---- Phase 5 (Section N): 27 more original looks, 30 total. ----
    make('golden-hour', 'Golden Hour', 'Warm', (r, g, b) => [r * 1.12 + 0.05, g * 1.02, b * 0.85]),
    make('amber-glow', 'Amber Glow', 'Warm', (r, g, b) => [r * 1.1 + 0.06, g * 1.05 + 0.02, b * 0.8]),
    make('sunset-blush', 'Sunset Blush', 'Warm', (r, g, b) => [r * 1.08 + 0.03, g * 0.97, b * 1.05 + 0.02]),
    make('desert-sand', 'Desert Sand', 'Warm', (r, g, b) => [r * 1.06 + 0.05, g * 1.02 + 0.03, b * 0.82]),
    make('honey-light', 'Honey Light', 'Warm', (r, g, b) => [r * 1.09 + 0.04, g * 1.04 + 0.02, b * 0.88]),
    make('frost-blue', 'Frost Blue', 'Cool', (r, g, b) => [r * 0.88, g * 1.0, b * 1.12 + 0.03]),
    make('deep-ocean', 'Deep Ocean', 'Cool', (r, g, b) => [r * 0.82, g * 1.06, b * 1.15 + 0.02]),
    make('arctic-mist', 'Arctic Mist', 'Cool', (r, g, b) => [r * 0.96 + 0.04, g * 1.02 + 0.03, b * 1.08 + 0.04]),
    make('moonlit', 'Moonlit', 'Cool', (r, g, b) => [r * 0.9, g * 1.04, b * 1.14 + 0.02]),
    make('glacier', 'Glacier', 'Cool', (r, g, b) => [r * 0.92, g * 1.05 + 0.01, b * 1.1 + 0.02]),
    make('retro-70s', 'Retro 70s', 'Film', (r, g, b) => [r * 1.1 + 0.03, g * 0.95, b * 0.85]),
    make('vintage-fade', 'Vintage Fade', 'Film', (r, g, b) => [r * 0.95 + 0.05, g * 0.95 + 0.04, b * 0.92 + 0.05]),
    make('grainy-film', 'Grainy Film', 'Film', (r, g, b) => [r * 1.04 + 0.02, g * 1.03 + 0.01, b * 0.96]),
    make('cinema-scope', 'Cinema Scope', 'Film', (r, g, b) => [r * 1.05, g * 1.02, b * 0.94]),
    make('old-reel', 'Old Reel', 'Film', (r, g, b) => [r * 1.02 + 0.06, g * 0.98 + 0.04, b * 0.88 + 0.02]),
    make('sepia-soft', 'Sepia Soft', 'Film', (r, g, b) => {
      const l = lum(r, g, b);
      return [l * 1.1 + 0.05, l * 0.95 + 0.02, l * 0.8];
    }),
    make('graphite', 'Graphite', 'Mono', (r, g, b) => {
      const v = (lum(r, g, b) - 0.5) * 1.2 + 0.5;
      return [v, v, v];
    }),
    make('silver-mono', 'Silver Mono', 'Mono', (r, g, b) => {
      const v = lum(r, g, b) * 1.05 + 0.05;
      return [v, v * 0.99, v * 0.98];
    }),
    make('charcoal', 'Charcoal', 'Mono', (r, g, b) => {
      const v = lum(r, g, b) * 0.9 - 0.03;
      return [v, v, v * 1.05];
    }),
    make('neon-pop', 'Neon Pop', 'Vivid', (r, g, b) => [r * 1.25, g * 1.2, b * 1.25]),
    make('candy-bright', 'Candy Bright', 'Vivid', (r, g, b) => [r * 1.15 + 0.03, g * 1.12 + 0.03, b * 1.15 + 0.03]),
    make('electric-day', 'Electric Day', 'Vivid', (r, g, b) => [r * 1.2, g * 1.15, b * 1.1]),
    make('tropical', 'Tropical', 'Vivid', (r, g, b) => [r * 1.1 + 0.02, g * 1.18, b * 1.12 + 0.02]),
    make('vivid-bloom', 'Vivid Bloom', 'Vivid', (r, g, b) => [r * 1.18 + 0.01, g * 1.16 + 0.01, b * 1.18 + 0.01]),
    make('soft-pastel', 'Soft Pastel', 'Soft', (r, g, b) => [r * 0.9 + 0.08, g * 0.9 + 0.08, b * 0.92 + 0.08]),
    make('morning-haze', 'Morning Haze', 'Soft', (r, g, b) => [r * 0.96 + 0.06, g * 0.98 + 0.05, b * 1.0 + 0.05]),
    make('cotton-cloud', 'Cotton Cloud', 'Soft', (r, g, b) => [r * 0.93 + 0.06, g * 0.93 + 0.06, b * 0.94 + 0.06]),
    make('blush-mist', 'Blush Mist', 'Soft', (r, g, b) => [r * 0.97 + 0.05, g * 0.95 + 0.04, b * 0.98 + 0.03]),
    make('airy-light', 'Airy Light', 'Soft', (r, g, b) => [r * 0.95 + 0.07, g * 0.96 + 0.06, b * 0.97 + 0.06]),
  ];
})();

export function builtinLutById(id: string): BuiltinLut | undefined {
  return BUILTIN_LUTS.find((l) => l.id === id);
}

const lutThumbnailCache = new Map<string, string>();

/** Small LUT thumbnail: a gradient strip through the LUT (cached). */
export function lutThumbnail(lut: BuiltinLut, w = 96, h = 32): string {
  const cached = lutThumbnailCache.get(lut.id);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(w, h);
  for (let x = 0; x < w; x += 1) {
    const t = x / (w - 1);
    const [r, g, b] = sampleLut(lut.data, lut.size, t, 0.5 + 0.5 * Math.sin(t * Math.PI), 1 - t);
    for (let y = 0; y < h; y += 1) {
      const i = (y * w + x) * 4;
      img.data[i] = Math.round(r * 255);
      img.data[i + 1] = Math.round(g * 255);
      img.data[i + 2] = Math.round(b * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = c.toDataURL('image/png');
  lutThumbnailCache.set(lut.id, url);
  return url;
}

/** Serialize a LUT back to .cube text (for export / inspection). */
export function lutToCubeText(title: string, size: number, data: number[]): string {
  const lines = [`TITLE "${title}"`, `LUT_3D_SIZE ${size}`];
  for (let i = 0; i < data.length; i += 3) {
    lines.push(`${data[i].toFixed(6)} ${data[i + 1].toFixed(6)} ${data[i + 2].toFixed(6)}`);
  }
  return lines.join('\n');
}
