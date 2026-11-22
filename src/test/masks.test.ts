import { describe, expect, it } from 'vitest';
import {
  applyChromaKey,
  chromaDistance,
  heartPoints,
  layoutRects,
  maskPolygonPoints,
  starPoints,
  validateMask,
} from '../lib/masks';

describe('masks & compositing', () => {
  it('circle and rectangle polygons are closed unit shapes', () => {
    const circle = maskPolygonPoints('circle', []);
    expect(circle).not.toBeNull();
    expect(circle!.length).toBe(48);
    for (const p of circle!) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
    }
    const rect = maskPolygonPoints('rectangle', []);
    expect(rect).toEqual([
      { x: 0.05, y: 0.05 },
      { x: 0.95, y: 0.05 },
      { x: 0.95, y: 0.95 },
      { x: 0.05, y: 0.95 },
    ]);
    expect(maskPolygonPoints('linear', [])).toBeNull();
    expect(maskPolygonPoints('mirror', [])).toBeNull();
  });

  it('heart and star shapes generate points inside the unit square', () => {
    expect(heartPoints().length).toBe(32);
    for (const p of [...heartPoints(), ...starPoints()]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
    expect(starPoints().length).toBe(10);
  });

  it('pen masks need at least 3 points; other shapes are always valid', () => {
    expect(validateMask({ feather: 0, invert: false, points: [], shape: 'pen' })).toMatch(/at least 3/);
    expect(validateMask({ feather: 0, invert: false, points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.5, y: 0.9 }], shape: 'pen' })).toBeNull();
    expect(validateMask({ feather: 0, invert: false, points: [], shape: 'circle' })).toBeNull();
  });

  it('chroma distance is 0 for the key colour and large for its opposite', () => {
    expect(chromaDistance(0, 255, 0, '#00FF00')).toBeCloseTo(0);
    expect(chromaDistance(255, 0, 0, '#00FF00')).toBeGreaterThan(0.5);
  });

  it('chroma key clears matching pixels and keeps the rest', () => {
    const px = new Uint8ClampedArray([0, 255, 0, 255, 255, 0, 0, 255]);
    applyChromaKey(px, '#00FF00', 0.3, 0.2);
    expect(px[3]).toBe(0);
    expect(px[7]).toBe(255);
  });

  it('split-screen layouts tile the canvas without gaps', () => {
    const two = layoutRects('split2', 1000, 500);
    expect(two).toHaveLength(2);
    expect(two[0].width + two[1].width).toBe(1000);
    const four = layoutRects('split4', 1000, 500);
    expect(four).toHaveLength(4);
    expect(four.reduce((sum, r) => sum + r.width * r.height, 0)).toBe(1000 * 500);
    const pip = layoutRects('pip', 1000, 500);
    expect(pip).toHaveLength(1);
    expect(pip[0].x + pip[0].width).toBeLessThanOrEqual(1000);
    expect(layoutRects('full', 1000, 500)).toHaveLength(1);
  });
});
