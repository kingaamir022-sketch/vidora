import { describe, expect, it } from 'vitest';
import { cssFilterForEffects, defaultEffectParams, effectDef, EFFECT_CATALOG, glitchSlices, pixelEffects } from '../lib/effects';
import type { Effect } from '../schema/project';

const fx = (name: string, intensity = 1, params: Record<string, number> = {}): Effect => ({
  id: `fx-${name}`,
  intensity,
  name,
  params,
});

describe('effects catalog', () => {
  it('ships at least 12 real effects', () => {
    expect(EFFECT_CATALOG.length).toBeGreaterThanOrEqual(12);
    const ids = EFFECT_CATALOG.map((d) => d.id);
    for (const required of ['blur', 'grayscale', 'sepia', 'invert', 'hue-rotate', 'contrast', 'saturate', 'pixelate', 'vignette', 'rgb-split', 'glitch']) {
      expect(ids).toContain(required);
    }
  });

  it('every catalog entry has a name, description and valid param ranges', () => {
    for (const def of EFFECT_CATALOG) {
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
      for (const p of Object.values(def.params)) {
        expect(p.min).toBeLessThanOrEqual(p.default);
        expect(p.default).toBeLessThanOrEqual(p.max);
      }
      expect(defaultEffectParams(def)).toBeDefined();
    }
  });

  it('builds a CSS filter string from CSS effects only', () => {
    const css = cssFilterForEffects([fx('blur', 1, { radius: 10 }), fx('grayscale', 0.5)]);
    expect(css).toContain('blur(10.0px)');
    expect(css).toContain('grayscale(50%)');
    expect(cssFilterForEffects([fx('pixelate')])).toBe('none');
    expect(cssFilterForEffects([])).toBe('none');
  });

  it('separates pixel-pipeline effects from CSS effects', () => {
    const pixel = pixelEffects([fx('blur'), fx('pixelate'), fx('glitch'), fx('sepia')]);
    expect(pixel.map((p) => p.def.id).sort()).toEqual(['glitch', 'pixelate']);
  });

  it('glitch slices are deterministic for the same frame and bounded by height', () => {
    const a = glitchSlices(7, 200, 0.5);
    const b = glitchSlices(7, 200, 0.5);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    for (const s of a) {
      expect(s.y + s.h).toBeLessThanOrEqual(200);
      expect(Math.abs(s.shift)).toBeLessThanOrEqual(30);
    }
    expect(glitchSlices(3, 200, 0)).toEqual([]);
    expect(effectDef('nope')).toBeUndefined();
  });
});
