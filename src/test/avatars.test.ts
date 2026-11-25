import { describe, expect, it } from 'vitest';
import { AVATAR_TILES } from '../lib/avatars';

describe('avatar portrait tiles (CapCut-fix 2026-11-25, O1)', () => {
  it('ships 24 original portrait tiles with unique ids and names', () => {
    expect(AVATAR_TILES).toHaveLength(24);
    const ids = new Set(AVATAR_TILES.map((t) => t.id));
    const names = new Set(AVATAR_TILES.map((t) => t.name));
    expect(ids.size).toBe(24);
    expect(names.size).toBe(24);
  });

  it('each tile is an inline SVG data URI with a portrait silhouette', () => {
    for (const tile of AVATAR_TILES) {
      expect(tile.src.startsWith('data:image/svg+xml;utf8,')).toBe(true);
      const svg = decodeURIComponent(tile.src.slice('data:image/svg+xml;utf8,'.length));
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 400 520"');
      // head circle + shoulders path
      expect(svg).toContain('<circle cx="200" cy="200" r="70"');
      expect(svg).toContain('<path d="M200 292');
    }
  });

  it('Trending / Marketing / Fashion slices do not share tiles', () => {
    const trending = AVATAR_TILES.slice(0, 12).map((t) => t.id);
    const marketing = AVATAR_TILES.slice(12, 24).map((t) => t.id);
    expect(trending.filter((id) => marketing.includes(id))).toEqual([]);
  });
});
