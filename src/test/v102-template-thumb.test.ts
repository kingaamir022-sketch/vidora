/**
 * v1.0.2 — TemplateThumb: template cards show the template's real first
 * frame (background + title + sticker), not a slot diagram (editor panel)
 * or a flat per-category gradient (dashboard page).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TEMPLATE_CATALOG, resolveSticker } from '../lib/templates';
import { backgroundDef } from '../lib/backgrounds';
import { TEXT_STYLE_PRESETS } from '../lib/text';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('TemplateThumb first-frame data', () => {
  it('every template resolves to something visible (background or title text)', () => {
    for (const t of TEMPLATE_CATALOG) {
      const bg = t.items.find((i) => i.kind === 'background' && i.backgroundId);
      const title = t.items.find((i) => i.kind === 'text' && i.content);
      const bgOk = !bg || Boolean(bg.backgroundId && backgroundDef(bg.backgroundId));
      expect(bgOk, `${t.id}: background ${bg?.backgroundId} must exist`).toBe(true);
      expect(Boolean(bg || title), `${t.id}: needs a background or a title`).toBe(true);
    }
  });

  it('every template title preset + sticker resolves', () => {
    for (const t of TEMPLATE_CATALOG) {
      for (const item of t.items) {
        if (item.kind === 'text' && item.presetId) {
          expect(
            TEXT_STYLE_PRESETS.some((p) => p.id === item.presetId),
            `${t.id}: preset ${item.presetId} must exist`,
          ).toBe(true);
        }
        if (item.kind === 'sticker' && item.stickerId) {
          expect(resolveSticker(item.stickerId), `${t.id}: sticker ${item.stickerId} must resolve`).toBeDefined();
        }
      }
    }
  });

  it('Bold Opening first frame: violet-dusk bg + "Your Title Here" + star sticker', () => {
    const t = TEMPLATE_CATALOG.find((x) => x.id === 'bold-open');
    expect(t).toBeDefined();
    expect(t!.items.find((i) => i.kind === 'background')?.backgroundId).toBe('violet-dusk');
    expect(t!.items.find((i) => i.kind === 'text')?.content).toBe('Your Title Here');
    expect(t!.items.find((i) => i.kind === 'sticker')?.stickerId).toBe('star');
  });
});

describe('TemplateThumb wiring', () => {
  it('editor TemplatesPanel uses TemplateThumb, not the slot-diagram SVG', () => {
    const src = read('components/TemplatesPanel.tsx');
    expect(src).toContain('TemplateThumb');
    expect(src).not.toContain('layout preview');
    expect(src).not.toContain('viewBox={`0 0 ${W} ${H}`}');
  });

  it('dashboard TemplatesPage uses TemplateThumb, not flat category gradients', () => {
    const src = read('components/home/TemplatesPage.tsx');
    expect(src).toContain('TemplateThumb');
    expect(src).not.toContain('POSTER_GRADIENTS');
  });
});
