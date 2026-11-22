import { describe, expect, it } from 'vitest';
import { drawTransition, transitionProgress, TRANSITION_TYPES } from '../lib/transitions';

describe('transitions', () => {
  it('ships the required transition types', () => {
    const ids = TRANSITION_TYPES.map((t) => t.id);
    for (const required of ['fade', 'dissolve', 'slide', 'push', 'zoom', 'wipe', 'blur', 'spin']) {
      expect(ids).toContain(required);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('progress clamps to 0..1', () => {
    expect(transitionProgress(0, 0.5)).toBe(0);
    expect(transitionProgress(0.25, 0.5)).toBe(0.5);
    expect(transitionProgress(2, 0.5)).toBe(1);
    expect(transitionProgress(-1, 0.5)).toBe(0);
    expect(transitionProgress(0, 0)).toBe(1);
  });

  it('drawTransition at progress 1 shows only the incoming frame', () => {
    // jsdom-free: only run if a canvas 2d context exists in this environment.
    if (typeof document === 'undefined') return;
    const make = (color: string) => {
      const c = document.createElement('canvas');
      c.width = 4;
      c.height = 4;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 4, 4);
      return c;
    };
    const out = document.createElement('canvas');
    out.width = 4;
    out.height = 4;
    const ctx = out.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    drawTransition(ctx, make('#ff0000'), make('#00ff00'), 'fade', 1, 'right', 4, 4);
    const px = ctx.getImageData(0, 0, 1, 1).data;
    expect(px[1]).toBeGreaterThan(200);
    expect(px[0]).toBeLessThan(50);
  });
});
