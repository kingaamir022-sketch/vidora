import type { ClipMask, MaskShape } from '../schema/project';

/** Masks & compositing math (Phase 2, SPEC G). Pure geometry + pixel helpers. */

export interface Point {
  x: number;
  y: number;
}

/** Heart outline points (unit square, 0..1). */
export function heartPoints(steps = 32): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x: 0.5 + (x / 36), y: 0.5 - (y / 36) });
  }
  return pts;
}

/** Five-point star points (unit square, 0..1). */
export function starPoints(): Point[] {
  const pts: Point[] = [];
  const cx = 0.5;
  const cy = 0.5;
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? 0.48 : 0.2;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

/** Polygon points for a mask shape in unit coordinates. Null = not a polygon (linear/mirror use gradients). */
export function maskPolygonPoints(shape: MaskShape, penPoints: Point[]): Point[] | null {
  switch (shape) {
    case 'circle':
      return Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return { x: 0.5 + 0.48 * Math.cos(a), y: 0.5 + 0.48 * Math.sin(a) };
      });
    case 'rectangle':
      return [{ x: 0.05, y: 0.05 }, { x: 0.95, y: 0.05 }, { x: 0.95, y: 0.95 }, { x: 0.05, y: 0.95 }];
    case 'heart':
      return heartPoints();
    case 'star':
      return starPoints();
    case 'pen':
      return penPoints.length >= 3 ? penPoints : null;
    default:
      return null;
  }
}

/** Build a Path2D for a mask polygon in canvas pixels. */
export function maskPath(shape: MaskShape, penPoints: Point[], width: number, height: number): Path2D | null {
  const pts = maskPolygonPoints(shape, penPoints);
  if (!pts || pts.length < 3) return null;
  const path = new Path2D();
  pts.forEach((p, i) => {
    const x = p.x * width;
    const y = p.y * height;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.closePath();
  return path;
}

/** Linear-mask gradient stop (0..1 along the gradient) for a point. */
export function linearMaskValue(x: number, y: number): number {
  return Math.min(1, Math.max(0, (x + y) / 2));
}

/** Mirror mask: left half visible, right half mirrored value (0..1). */
export function mirrorMaskValue(x: number): number {
  return x <= 0.5 ? 1 : 0;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Chroma-key distance (0..1) from a pixel to the key colour. */
export function chromaDistance(r: number, g: number, b: number, keyHex: string): number {
  const [kr, kg, kb] = hexToRgb(keyHex);
  const dr = (r - kr) / 255;
  const dg = (g - kg) / 255;
  const db = (b - kb) / 255;
  return Math.min(1, Math.sqrt(dr * dr + dg * dg + db * db) / 1.2);
}

/** Remove a chroma-key colour from RGBA pixels in place. */
export function applyChromaKey(pixels: Uint8ClampedArray, keyHex: string, tolerance: number, smoothness: number): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const d = chromaDistance(pixels[i], pixels[i + 1], pixels[i + 2], keyHex);
    if (d < tolerance) {
      const feather = smoothness > 0 ? Math.max(0, (d - tolerance * (1 - smoothness)) / Math.max(0.001, tolerance * smoothness)) : 0;
      pixels[i + 3] = Math.round(pixels[i + 3] * Math.min(1, feather));
    }
  }
}

/** Split-screen / PiP layout rectangles for a canvas. Returns rects per slot. */
export function layoutRects(mode: string, width: number, height: number): { height: number; width: number; x: number; y: number }[] {
  switch (mode) {
    case 'split2':
      return [
        { height, width: width / 2, x: 0, y: 0 },
        { height, width: width / 2, x: width / 2, y: 0 },
      ];
    case 'split3':
      return [
        { height: height / 2, width: width / 2, x: 0, y: 0 },
        { height: height / 2, width: width / 2, x: width / 2, y: 0 },
        { height: height / 2, width, x: 0, y: height / 2 },
      ];
    case 'split4':
      return [
        { height: height / 2, width: width / 2, x: 0, y: 0 },
        { height: height / 2, width: width / 2, x: width / 2, y: 0 },
        { height: height / 2, width: width / 2, x: 0, y: height / 2 },
        { height: height / 2, width: width / 2, x: width / 2, y: height / 2 },
      ];
    case 'pip':
      return [{ height: height * 0.3, width: width * 0.3, x: width * 0.68, y: height * 0.66 }];
    default:
      return [{ height, width, x: 0, y: 0 }];
  }
}

/** Validate a mask: pen masks need at least 3 points; other shapes are always valid. */
export function validateMask(mask: ClipMask): string | null {
  if (mask.shape === 'pen' && mask.points.length < 3) return 'Pen mask needs at least 3 points — click on the preview to add them.';
  return null;
}
