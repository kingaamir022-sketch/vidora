import { describe, expect, it } from 'vitest';
import { peaksFromSamples } from '../lib/media';

describe('peaksFromSamples', () => {
  it('returns the requested bucket count', () => {
    expect(peaksFromSamples(new Float32Array(1000).fill(0.5), 64)).toHaveLength(64);
  });

  it('returns the max absolute value per bucket', () => {
    const samples = new Float32Array([0, 0.25, -0.5, 0.1, 1, -1, 0, 0]);
    const peaks = peaksFromSamples(samples, 2);
    expect(peaks[0]).toBeCloseTo(0.5);
    expect(peaks[1]).toBeCloseTo(1);
  });

  it('returns zeros for empty input and clamps to 1', () => {
    expect(peaksFromSamples(new Float32Array(0), 4)).toEqual([0, 0, 0, 0]);
    expect(peaksFromSamples(new Float32Array([2, -3]), 1)[0]).toBe(1);
  });
});
