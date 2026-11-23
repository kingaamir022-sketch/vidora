import { describe, expect, it } from 'vitest';
import {
  searchStickers,
  SHAPE_DEFS,
  shapeSvg,
  STICKER_CATALOG,
  STICKER_CATEGORIES,
  stickerById,
  stickersByCategory,
} from '../lib/stickers';

describe('procedural sticker catalog (Phase 3, H-STICKER)', () => {
  it('generates at least 200 stickers', () => {
    expect(STICKER_CATALOG.length).toBeGreaterThanOrEqual(200);
  });

  it('covers all 8 categories', () => {
    expect(STICKER_CATEGORIES).toHaveLength(8);
    for (const category of STICKER_CATEGORIES) {
      expect(stickersByCategory(category).length).toBeGreaterThan(0);
    }
  });

  it('every sticker is a valid inline SVG with a 120x120 viewBox', () => {
    for (const s of STICKER_CATALOG) {
      expect(s.svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 120 120">/);
      expect(s.svg).toMatch(/<\/svg>$/);
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
    }
  });

  it('ids are unique', () => {
    const ids = new Set(STICKER_CATALOG.map((s) => s.id));
    expect(ids.size).toBe(STICKER_CATALOG.length);
  });

  it('stickerById finds a sticker and returns undefined for unknown ids', () => {
    const first = STICKER_CATALOG[0];
    expect(stickerById(first.id)?.name).toBe(first.name);
    expect(stickerById('no-such-sticker')).toBeUndefined();
  });

  it('search is case-insensitive and matches name or category', () => {
    const hearts = searchStickers('HEART');
    expect(hearts.length).toBeGreaterThan(0);
    expect(hearts.every((s) => /heart/i.test(s.name) || /heart/i.test(s.category))).toBe(true);
    expect(searchStickers('zzzz-no-match').length).toBe(0);
    expect(searchStickers('').length).toBe(STICKER_CATALOG.length);
  });
});

describe('shapes (Phase 3, H-SHAPE)', () => {
  it('ships the 10 required shapes', () => {
    const ids = SHAPE_DEFS.map((s) => s.id);
    for (const wanted of ['rectangle', 'circle', 'triangle', 'star', 'heart', 'arrow', 'line', 'speech-bubble', 'badge', 'frame']) {
      expect(ids).toContain(wanted);
    }
  });

  it('shapeSvg bakes the fill colour into the SVG', () => {
    const svg = shapeSvg('heart', '#FF0000');
    expect(svg).toContain('#FF0000');
    expect(svg).toMatch(/viewBox="0 0 120 120"/);
  });

  it('shapeSvg falls back to the Vidora violet for a bad colour', () => {
    expect(shapeSvg('circle', 'not-a-colour')).toContain('#7C3AED');
  });
});
