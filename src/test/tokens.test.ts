import { describe, expect, it } from 'vitest';
import tokens from '../../design/tokens.json';

describe('design tokens', () => {
  it('declares the brand gradient violet -> cyan', () => {
    expect(tokens.brand.violet).toBe('#7C3AED');
    expect(tokens.brand.cyan).toBe('#06B6D4');
    expect(tokens.brand.gradient.from).toBe('#7C3AED');
    expect(tokens.brand.gradient.to).toBe('#06B6D4');
    expect(tokens.brand.gradient.css).toContain('#7C3AED');
    expect(tokens.brand.gradient.css).toContain('#06B6D4');
  });

  it('defines the brand name and tagline', () => {
    expect(tokens.brand.name).toBe('Vidora');
    expect(tokens.brand.tagline).toBe('Create. Cut. Shine.');
  });

  it('provides dark and light colour themes', () => {
    expect(tokens.color.dark.bg).toBe('#0B0B12');
    expect(tokens.color.dark.text).toBe('#F4F4F8');
    expect(tokens.color.light.bg).toBe('#F6F6FA');
    expect(tokens.color.light.text).toBe('#14141F');
  });

  it('provides typography, spacing, radius and shadow scales', () => {
    expect(tokens.typography.scale.h1.size).toBe(24);
    expect(tokens.spacing.lg).toBe(16);
    expect(tokens.radius.lg).toBe(12);
    expect(tokens.shadow.md).toContain('rgba(0, 0, 0, 0.35)');
  });
});
