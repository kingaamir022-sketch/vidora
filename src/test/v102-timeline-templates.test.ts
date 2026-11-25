import { describe, expect, it } from 'vitest';
import { SAMPLE_PROJECT, trackKindSchema } from '../schema/project';
import { TEMPLATE_CATALOG, applyTemplate, templateDef } from '../lib/templates';

/**
 * v1.0.2 (D12.5): template items split across tracks by kind —
 * backgrounds → Video 1, text → Text 1, stickers/shapes → Stickers 1 —
 * instead of piling every item onto one "Text 1" track.
 */
describe('v1.0.2 template track split (D12.5)', () => {
  it("applyTemplate('bold-open') yields Video 1 / Audio 1 / Text 1 / Stickers 1 with the right clips", () => {
    expect(templateDef('bold-open')?.name).toBe('Bold Opening');
    const next = applyTemplate(SAMPLE_PROJECT, 'bold-open');
    expect(next).not.toBeNull();
    expect(next!.tracks.map((t) => t.name)).toEqual(['Video 1', 'Audio 1', 'Text 1', 'Stickers 1']);
    expect(next!.tracks.map((t) => t.kind)).toEqual(['video', 'audio', 'text', 'sticker']);
    const byName = new Map(next!.tracks.map((t) => [t.name, t]));
    expect(byName.get('Video 1')!.clips.map((c) => c.name)).toEqual(['Violet Dusk']);
    expect(byName.get('Text 1')!.clips.map((c) => c.name)).toEqual(['Your Title Here']);
    expect(byName.get('Stickers 1')!.clips.map((c) => c.name)).toEqual(['Star · Violet']);
    // No track piles clips on top of each other: one clip per track here.
    for (const t of next!.tracks) expect(t.clips.length).toBeLessThanOrEqual(1);
    // Every clip sits on the track its id claims.
    for (const t of next!.tracks) {
      for (const c of t.clips) expect(c.trackId).toBe(t.id);
    }
  });

  it('every template item lands on the track matching its kind', () => {
    for (const t of TEMPLATE_CATALOG) {
      const next = applyTemplate(SAMPLE_PROJECT, t.id);
      expect(next).not.toBeNull();
      const byKind = new Map(next!.tracks.map((tr) => [tr.kind, tr]));
      for (const item of t.items) {
        const want = item.kind === 'text' ? 'text' : item.kind === 'background' ? 'video' : 'sticker';
        const track = byKind.get(want);
        expect(track, `${t.id}: no ${want} track for a ${item.kind} item`).toBeDefined();
        const names = track!.clips.map((c) => c.name);
        if (item.kind === 'text') expect(names).toContain(item.content ?? 'Text');
        if (item.kind === 'background') expect(track!.kind).toBe('video');
        if (item.kind === 'sticker' || item.kind === 'shape') expect(track!.name).toBe('Stickers 1');
      }
      // Slots stay video clips on Video 1.
      const video = byKind.get('video')!;
      expect(video.clips.filter((c) => c.type === 'video')).toHaveLength(t.slots.length);
    }
  });

  it('templates with no sticker/shape items get no Stickers track', () => {
    const next = applyTemplate(SAMPLE_PROJECT, 'minimal-intro');
    expect(next).not.toBeNull();
    expect(next!.tracks.map((t) => t.name)).toEqual(['Video 1', 'Audio 1', 'Text 1']);
    expect(next!.tracks[0].clips.map((c) => c.name)).toEqual(['Paper Grain']);
    expect(next!.tracks[2].clips.map((c) => c.name)).toEqual(['Welcome']);
  });

  it("trackKindSchema accepts 'sticker'", () => {
    expect(trackKindSchema.parse('sticker')).toBe('sticker');
    expect(trackKindSchema.parse('video')).toBe('video');
  });
});
