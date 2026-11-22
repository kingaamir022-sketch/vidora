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

/** Three built-in original Vidora looks (generated, no third-party LUTs). */
export const BUILTIN_LUTS: { data: number[]; name: string; size: number }[] = [
  {
    data: generateLut(8, (r, g, b) => [clamp01(r * 1.08 + 0.04), clamp01(g * 1.0), clamp01(b * 0.92)]),
    name: 'Vidora Warm',
    size: 8,
  },
  {
    data: generateLut(8, (r, g, b) => [clamp01(r * 0.94), clamp01(g * 1.02), clamp01(b * 1.1 + 0.03)]),
    name: 'Vidora Cool Teal',
    size: 8,
  },
  {
    data: generateLut(8, (r, g, b) => {
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return [l, l, l];
    }),
    name: 'Vidora Mono',
    size: 8,
  },
];

/** Serialize a LUT back to .cube text (for export / inspection). */
export function lutToCubeText(title: string, size: number, data: number[]): string {
  const lines = [`TITLE "${title}"`, `LUT_3D_SIZE ${size}`];
  for (let i = 0; i < data.length; i += 3) {
    lines.push(`${data[i].toFixed(6)} ${data[i + 1].toFixed(6)} ${data[i + 2].toFixed(6)}`);
  }
  return lines.join('\n');
}
