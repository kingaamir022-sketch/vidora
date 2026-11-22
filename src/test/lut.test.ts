import { describe, expect, it } from 'vitest';
import { applyLutToPixels, BUILTIN_LUTS, generateLut, lutToCubeText, parseCube, sampleLut } from '../lib/lut';

const IDENTITY_CUBE = `TITLE "Identity"
LUT_3D_SIZE 2
0.0 0.0 0.0
1.0 0.0 0.0
0.0 1.0 0.0
1.0 1.0 0.0
0.0 0.0 1.0
1.0 0.0 1.0
0.0 1.0 1.0
1.0 1.0 1.0
`;

describe('.cube LUTs', () => {
  it('parses a valid 2x2x2 .cube file', () => {
    const parsed = parseCube(IDENTITY_CUBE);
    expect(parsed.size).toBe(2);
    expect(parsed.title).toBe('Identity');
    expect(parsed.data.length).toBe(24);
  });

  it('rejects a file with a missing size and one with too few entries', () => {
    expect(() => parseCube('0.0 0.0 0.0\n')).toThrow(/LUT_3D_SIZE/);
    expect(() => parseCube('LUT_3D_SIZE 2\n0.0 0.0 0.0\n')).toThrow(/expected 8 RGB entries/);
  });

  it('identity LUT leaves colours unchanged at full intensity', () => {
    const parsed = parseCube(IDENTITY_CUBE);
    const px = new Uint8ClampedArray([255, 0, 0, 255, 0, 128, 255, 255]);
    applyLutToPixels(px, parsed.data, parsed.size, 1);
    expect(px[0]).toBe(255);
    expect(px[1]).toBe(0);
    expect(px[5]).toBe(128);
    expect(px[6]).toBe(255);
  });

  it('intensity 0 is a no-op and 0.5 blends halfway', () => {
    const parsed = parseCube(IDENTITY_CUBE);
    const px = new Uint8ClampedArray([100, 100, 100, 255]);
    applyLutToPixels(px, parsed.data, parsed.size, 0);
    expect(px[0]).toBe(100);
    // Swap LUT: invert red channel only.
    const inverted = generateLut(2, (r, _g, _b) => [1 - r, 0, 0]);
    const px2 = new Uint8ClampedArray([0, 0, 0, 255]);
    applyLutToPixels(px2, inverted, 2, 0.5);
    expect(px2[0]).toBeCloseTo(128, 0);
  });

  it('ships three built-in original looks with valid data', () => {
    expect(BUILTIN_LUTS.length).toBe(3);
    expect(BUILTIN_LUTS.map((l) => l.name)).toEqual(['Vidora Warm', 'Vidora Cool Teal', 'Vidora Mono']);
    for (const lut of BUILTIN_LUTS) {
      expect(lut.data.length).toBe(lut.size ** 3 * 3);
      expect(lut.data.every((v) => v >= 0 && v <= 1)).toBe(true);
    }
    const mono = BUILTIN_LUTS[2];
    const [r, g, b] = sampleLut(mono.data, mono.size, 1, 0, 0);
    expect(r).toBeCloseTo(g);
    expect(g).toBeCloseTo(b);
  });

  it('round-trips a LUT through .cube text', () => {
    const parsed = parseCube(IDENTITY_CUBE);
    const text = lutToCubeText('Identity', parsed.size, parsed.data);
    const reparsed = parseCube(text);
    expect(reparsed.data).toEqual(parsed.data);
  });
});
