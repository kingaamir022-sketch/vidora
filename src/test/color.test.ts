import { describe, expect, it } from 'vitest';
import {
  applyAdjustmentToPixels,
  applyWheel,
  buildCurveLookup,
  canvasBlendMode,
  cssFilterForAdjustment,
  curvePreset,
  evalCurve,
  isAdjustmentIdentity,
  moveCurvePoint,
  sharpenPixels,
} from '../lib/color';
import { defaultAdjustment } from '../schema/project';

describe('colour & adjustment', () => {
  it('curve evaluation is the identity for the default diagonal', () => {
    expect(evalCurve([{ x: 0, y: 0 }, { x: 1, y: 1 }], 0.25)).toBeCloseTo(0.25);
    expect(evalCurve([{ x: 0, y: 0 }, { x: 0.5, y: 0.8 }, { x: 1, y: 1 }], 0.5)).toBeCloseTo(0.8);
    expect(evalCurve([{ x: 0, y: 0 }, { x: 1, y: 1 }], -1)).toBe(0);
    expect(evalCurve([{ x: 0, y: 0 }, { x: 1, y: 1 }], 2)).toBe(1);
    const lut = buildCurveLookup([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    expect(lut[0]).toBe(0);
    expect(lut[255]).toBe(255);
    expect(lut[128]).toBe(128);
  });

  it('lift/gamma/gain wheel is the identity at zero and brightens with lift', () => {
    expect(applyWheel(0.5, 0, 0, 0)).toBeCloseTo(0.5);
    expect(applyWheel(0.5, 0.4, 0, 0)).toBeGreaterThan(0.5);
    expect(applyWheel(0.5, -0.4, 0, 0)).toBeLessThan(0.5);
    expect(applyWheel(0, 0, 0, 0)).toBe(0);
  });

  it('default adjustment is the identity; a changed one is not', () => {
    expect(isAdjustmentIdentity(defaultAdjustment())).toBe(true);
    expect(isAdjustmentIdentity({ ...defaultAdjustment(), brightness: 0.1 })).toBe(false);
    expect(isAdjustmentIdentity({ ...defaultAdjustment(), curves: { ...defaultAdjustment().curves, r: [{ x: 0, y: 0 }, { x: 0.5, y: 0.6 }, { x: 1, y: 1 }] } })).toBe(false);
  });

  it('CSS fast path covers brightness/contrast/saturation/hue/exposure', () => {
    const css = cssFilterForAdjustment({ ...defaultAdjustment(), brightness: 0.2, hue: 90 });
    expect(css).toContain('brightness(1.200)');
    expect(css).toContain('hue-rotate(90deg)');
    expect(cssFilterForAdjustment(defaultAdjustment())).toBe('none');
  });

  it('temperature warms the image (more red, less blue)', () => {
    const px = new Uint8ClampedArray([128, 128, 128, 255]);
    applyAdjustmentToPixels(px, { ...defaultAdjustment(), temperature: 1 });
    expect(px[0]).toBeGreaterThan(128);
    expect(px[2]).toBeLessThan(128);
  });

  it('sharpen with amount 0 is a no-op; a flat field stays flat when sharpened', () => {
    const px = new Uint8ClampedArray(4 * 9).fill(128);
    const before = new Uint8ClampedArray(px);
    sharpenPixels(px, 3, 3, 0);
    expect(px).toEqual(before);
    sharpenPixels(px, 3, 3, 0.5);
    expect(px).toEqual(before);
  });

  it('curve points can be dragged and stay between their neighbours', () => {
    const pts = [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 }];
    const moved = moveCurvePoint(pts, 1, 0.7, 0.8);
    expect(moved[1]).toEqual({ x: 0.7, y: 0.8 });
    expect(moved.map((p) => p.x)).toEqual([0, 0.7, 1]);
    // Clamped: cannot cross the next point or leave 0–1.
    expect(moveCurvePoint(pts, 1, 0.99, 0.5)[1].x).toBeCloseTo(0.99);
    expect(moveCurvePoint(pts, 1, 1.5, 0.5)[1].x).toBeCloseTo(0.99);
    expect(moveCurvePoint(pts, 1, -0.5, 0.5)[1].x).toBeCloseTo(0.01);
    expect(moveCurvePoint(pts, 0, 0.2, 0.3)[0]).toEqual({ x: 0.2, y: 0.3 });
    expect(moveCurvePoint(pts, 5, 0.5, 0.5)).toEqual(pts);
  });

  it('curve presets match the CapCut Curves tab', () => {
    expect(curvePreset('custom')).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    expect(curvePreset('lighten')[1].y).toBeGreaterThan(0.5);
    expect(curvePreset('darken')[1].y).toBeLessThan(0.5);
    expect(curvePreset('fade')[0].y).toBeGreaterThan(0);
    expect(curvePreset('fade')[1].y).toBeLessThan(1);
    expect(curvePreset('contrast')).toHaveLength(4);
    expect(evalCurve(curvePreset('lighten'), 0.5)).toBeCloseTo(0.65);
  });

  it('blend modes map to canvas composite operations (live in the preview)', () => {
    expect(canvasBlendMode('normal')).toBe('source-over');
    expect(canvasBlendMode('multiply')).toBe('multiply');
    expect(canvasBlendMode('screen')).toBe('screen');
    expect(canvasBlendMode('overlay')).toBe('overlay');
    expect(canvasBlendMode('soft-light')).toBe('soft-light');
    expect(canvasBlendMode('color-burn')).toBe('color-burn');
    expect(canvasBlendMode('color-dodge')).toBe('color-dodge');
    expect(canvasBlendMode('no-such-mode')).toBe('source-over');
  });
});
