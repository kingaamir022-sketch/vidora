import { describe, expect, it } from 'vitest';
import {
  applyPreset,
  evaluateLoopAnimation,
  FONT_STACKS,
  TEXT_STYLE_PRESETS,
  wrapLines,
} from '../lib/text';
import { defaultTextStyle } from '../schema/project';

describe('text style presets (Phase 3, H-TEXTSTYLE)', () => {
  it('ships at least 12 original presets across several categories', () => {
    expect(TEXT_STYLE_PRESETS.length).toBeGreaterThanOrEqual(12);
    const categories = new Set(TEXT_STYLE_PRESETS.map((p) => p.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);
    const ids = new Set(TEXT_STYLE_PRESETS.map((p) => p.id));
    expect(ids.size).toBe(TEXT_STYLE_PRESETS.length); // no duplicate ids
  });

  it('every preset is a full valid text style', () => {
    for (const p of TEXT_STYLE_PRESETS) {
      expect(p.style.fontSize).toBeGreaterThanOrEqual(8);
      expect(p.style.fontSize).toBeLessThanOrEqual(200);
      expect(p.style.lineSpacing).toBeGreaterThanOrEqual(0.8);
      expect(p.style.lineSpacing).toBeLessThanOrEqual(3);
      expect(typeof p.style.content).toBe('string');
    }
  });

  it('applyPreset keeps the clip content and takes the preset style', () => {
    const base = defaultTextStyle('My words');
    const next = applyPreset(base, 'neon-glow');
    expect(next.content).toBe('My words');
    expect(next.glow.enabled).toBe(true);
    expect(next.fill).toBe('#A5F3FC');
  });

  it('applyPreset with an unknown id returns the style unchanged', () => {
    const base = defaultTextStyle('Keep me');
    expect(applyPreset(base, 'no-such-preset')).toEqual(base);
  });

  it('font stacks are system stacks only (no web-font download)', () => {
    for (const f of FONT_STACKS) {
      expect(f.stack).not.toMatch(/https?:\/\//);
      expect(f.stack).toMatch(/system|sans-serif|serif|monospace|cursive/);
    }
  });
});

describe('loop animations (Phase 3, H-TEXTANIM)', () => {
  it('none returns the identity state', () => {
    expect(evaluateLoopAnimation('none', 1.5, 2)).toEqual({ offsetX: 0, offsetY: 0, opacity: 1, rotation: 0, scale: 1 });
  });

  it('pulse scales around 1 and loops every duration', () => {
    const a = evaluateLoopAnimation('pulse', 0.5, 2);
    const b = evaluateLoopAnimation('pulse', 2.5, 2); // one full loop later
    expect(a.scale).toBeCloseTo(b.scale, 9);
    expect(a.scale).toBeGreaterThan(1); // sin(pi/2) = 1 at phase 0.25
    expect(evaluateLoopAnimation('pulse', 0, 2).scale).toBeCloseTo(1, 9);
  });

  it('blink alternates opacity between the two halves of the loop', () => {
    expect(evaluateLoopAnimation('blink', 0.25, 2).opacity).toBe(1);
    expect(evaluateLoopAnimation('blink', 1.5, 2).opacity).toBe(0.15);
  });

  it('spin-slow completes one rotation per duration', () => {
    expect(evaluateLoopAnimation('spin-slow', 0, 2).rotation).toBe(0);
    expect(evaluateLoopAnimation('spin-slow', 1, 2).rotation).toBeCloseTo(180, 9);
    expect(evaluateLoopAnimation('spin-slow', 2, 2).rotation).toBeCloseTo(0, 9);
  });

  it('float and bounce-loop only move vertically', () => {
    const f = evaluateLoopAnimation('float', 0.5, 2);
    expect(f.offsetY).toBeLessThan(0);
    expect(f.offsetX).toBe(0);
    const b = evaluateLoopAnimation('bounce-loop', 0.5, 2);
    expect(b.offsetY).toBeLessThan(0);
  });

  it('wiggle rotates, shimmer changes opacity', () => {
    expect(evaluateLoopAnimation('wiggle', 0.5, 2).rotation).toBeCloseTo(4, 9);
    const s = evaluateLoopAnimation('shimmer', 0.5, 2);
    expect(s.opacity).toBeGreaterThan(0.5);
    expect(s.opacity).toBeLessThanOrEqual(1);
  });
});

describe('word wrap helper', () => {
  it('wraps on word boundaries within the max width', () => {
    const measure = (s: string) => s.length * 10;
    const lines = wrapLines('one two three four', 55, measure);
    expect(lines).toEqual(['one', 'two', 'three', 'four']);
  });

  it('keeps short text on one line and honours newlines', () => {
    const measure = (s: string) => s.length * 10;
    expect(wrapLines('hello world', 200, measure)).toEqual(['hello world']);
    expect(wrapLines('first\nsecond', 200, measure)).toEqual(['first', 'second']);
  });

  it('never returns an empty list', () => {
    expect(wrapLines('', 100, () => 0)).toEqual(['']);
  });
});
