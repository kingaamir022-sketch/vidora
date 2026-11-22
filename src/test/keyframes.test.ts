import { describe, expect, it } from 'vitest';
import {
  addKeyframe,
  animationState,
  combinedAnimationState,
  cubicBezierEasing,
  easingFunction,
  removeKeyframe,
  updateKeyframe,
  valueAtKeyframes,
} from '../lib/keyframes';
import type { Keyframe } from '../schema/project';

const kf = (property: string, time: number, value: number, easing: Keyframe['easing'] = 'linear'): Keyframe => ({
  bezier: undefined,
  easing,
  id: `kf-${property}-${time}`,
  property,
  time,
  value,
});

describe('keyframes', () => {
  it('returns the fallback with no keyframes, and clamps outside the range', () => {
    expect(valueAtKeyframes([], 'opacity', 1, 0.7)).toBe(0.7);
    const list = [kf('opacity', 1, 0), kf('opacity', 3, 1)];
    expect(valueAtKeyframes(list, 'opacity', 0, 0.5)).toBe(0);
    expect(valueAtKeyframes(list, 'opacity', 9, 0.5)).toBe(1);
  });

  it('interpolates linearly between keyframes', () => {
    const list = [kf('scale', 0, 1), kf('scale', 2, 3)];
    expect(valueAtKeyframes(list, 'scale', 1, 1)).toBeCloseTo(2);
    expect(valueAtKeyframes(list, 'scale', 0.5, 1)).toBeCloseTo(1.5);
  });

  it('easing changes the midpoint: ease-out is faster than linear at t=0.25', () => {
    const linear = easingFunction('linear')(0.25);
    const easeOut = easingFunction('ease-out')(0.25);
    expect(linear).toBeCloseTo(0.25);
    expect(easeOut).toBeGreaterThan(linear);
  });

  it('cubic-bezier solver maps 0->0 and 1->1 and is monotonic', () => {
    const fn = cubicBezierEasing(0.25, 0.1, 0.25, 1);
    expect(fn(0)).toBeCloseTo(0);
    expect(fn(1)).toBeCloseTo(1);
    expect(fn(0.5)).toBeGreaterThan(fn(0.25));
    expect(fn(0.75)).toBeGreaterThan(fn(0.5));
  });

  it('addKeyframe replaces a keyframe at the same time instead of duplicating', () => {
    const list = addKeyframe([], 'opacity', 1, 0.5);
    const again = addKeyframe(list, 'opacity', 1, 0.9);
    expect(again.length).toBe(1);
    expect(again[0].value).toBe(0.9);
  });

  it('remove and update keyframes by id', () => {
    const list = addKeyframe(addKeyframe([], 'opacity', 0, 0), 'opacity', 2, 1);
    const id = list[0].id;
    expect(removeKeyframe(list, id).length).toBe(1);
    const updated = updateKeyframe(list, id, { value: 0.25 });
    expect(updated.find((k) => k.id === id)?.value).toBe(0.25);
  });

  it('fade-in animation settles to full opacity, fade-out fades at the end', () => {
    expect(animationState('fade', 1, 0, 4, 'in').opacity).toBeCloseTo(0);
    expect(animationState('fade', 1, 1, 4, 'in').opacity).toBeCloseTo(1);
    expect(animationState('fade', 1, 4, 4, 'out').opacity).toBeCloseTo(0);
    expect(animationState('fade', 1, 2, 4, 'out').opacity).toBeCloseTo(1);
    expect(animationState('none', 1, 0, 4, 'in').opacity).toBe(1);
  });

  it('combined in+out animations multiply scale and take the lower opacity', () => {
    const s = combinedAnimationState({ duration: 0.5, kind: 'zoom-in' }, { duration: 0.5, kind: 'fade' }, 0.25, 4);
    expect(s.opacity).toBeLessThan(1);
    expect(s.scale).toBeLessThan(1);
    const mid = combinedAnimationState({ duration: 0.5, kind: 'zoom-in' }, { duration: 0.5, kind: 'fade' }, 2, 4);
    expect(mid.opacity).toBeCloseTo(1);
    expect(mid.scale).toBeCloseTo(1);
  });
});
