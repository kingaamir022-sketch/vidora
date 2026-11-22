import { describe, expect, it } from 'vitest';
import { computeHistogram, computeVectorscope, computeWaveform, frameExposure } from '../lib/scopes';

function solidFrame(w: number, h: number, r: number, g: number, b: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < px.length; i += 4) {
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = 255;
  }
  return px;
}

describe('scopes', () => {
  it('histogram counts every pixel in the right bin', () => {
    const px = solidFrame(2, 2, 255, 0, 0);
    const hist = computeHistogram(px);
    expect(hist.r[255]).toBe(4);
    expect(hist.g[0]).toBe(4);
    expect(hist.b[0]).toBe(4);
    expect(hist.r.reduce((a, b) => a + b, 0)).toBe(4);
  });

  it('waveform min/max bracket the frame luma', () => {
    const px = solidFrame(4, 4, 128, 128, 128);
    const wave = computeWaveform(px, 4, 4, 4);
    expect(wave.min.length).toBe(4);
    expect(wave.max.length).toBe(4);
    for (let c = 0; c < 4; c += 1) {
      expect(wave.min[c]).toBeCloseTo(128, 0);
      expect(wave.max[c]).toBeCloseTo(128, 0);
    }
  });

  it('vectorscope counts all pixels and stays inside the grid', () => {
    const px = solidFrame(4, 4, 255, 0, 0);
    const vec = computeVectorscope(px, 32);
    expect(vec.length).toBe(32);
    expect(vec.flat().reduce((a, b) => a + b, 0)).toBe(16);
  });

  it('frame exposure reports luma and clipping', () => {
    const black = solidFrame(2, 2, 0, 0, 0);
    expect(frameExposure(black)).toEqual({ avgLuma: 0, clippedBlack: 1, clippedWhite: 0 });
    const white = solidFrame(2, 2, 255, 255, 255);
    expect(frameExposure(white).clippedWhite).toBe(1);
    expect(frameExposure(white).avgLuma).toBeCloseTo(1);
  });
});
