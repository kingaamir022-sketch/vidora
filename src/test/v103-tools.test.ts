import { describe, expect, it } from 'vitest';
import { SAMPLE_PROJECT } from '../schema/project';
import { TOOL_EFFECT_DEFS, anyEffectDef, cssFilterForEffects, toolEffectDef } from '../lib/effects';
import { FILTER_TOOLS } from '../components/FiltersPanel';
import { TRANSITION_NAV } from '../components/TransitionsPanel';
import { useProjectStore } from '../store/projectStore';

/**
 * v1.0.3 follow-up round (Web check 2026-11-25):
 * - Filters Tools (Enhance, 4K, HD Upscale, Quality Restoration,
 *   Night-view Color, HD Cam 2, HD Pet) apply directly as clip effects
 *   with Intensity only — no AI-tools overlay.
 * - Transitions "Pals" removed (not a CapCut category).
 * - Tiles are square ~70px (Playwright probe covers the geometry;
 *   node has no layout here).
 */

function freshStore() {
  const s = useProjectStore.getState();
  s.openProject(structuredClone(SAMPLE_PROJECT));
  return useProjectStore.getState();
}

const TOOL_LABELS = ['Enhance', '4K', 'HD Upscale', 'Quality Restoration', 'Night-view Color', 'HD Cam 2', 'HD Pet'];

describe('v1.0.3 Tools — the 7 Web tools exist as direct-apply effects', () => {
  it('TOOL_EFFECT_DEFS has exactly the 7 Web Tools labels', () => {
    expect(TOOL_EFFECT_DEFS.map((d) => d.name).sort()).toEqual([...TOOL_LABELS].sort());
  });

  it('FILTER_TOOLS lists the same 7 labels, each with a resolvable effectId', () => {
    expect(FILTER_TOOLS.map((t) => t.label).sort()).toEqual([...TOOL_LABELS].sort());
    for (const t of FILTER_TOOLS) {
      expect(toolEffectDef(t.effectId)?.name).toBe(t.label);
      expect(anyEffectDef(t.effectId)?.name).toBe(t.label);
    }
  });

  it('every tool def has a CSS filter that visibly changes the preview and scales with intensity', () => {
    for (const def of TOOL_EFFECT_DEFS) {
      expect(def.css).toBeDefined();
      expect(Object.keys(def.params)).toEqual([]);
      const full = def.css!({}, 1);
      const none = def.css!({}, 0);
      expect(full).not.toBe('none');
      expect(full).not.toBe(none);
      // At intensity 0 the filter is the identity (all factors 1.00).
      expect(none).toMatch(/1\.00/);
      expect(none).not.toMatch(/1\.(0[1-9]|[1-9])/);
    }
  });

  it('cssFilterForEffects includes a tool effect (so the compositor shows it)', () => {
    const css = cssFilterForEffects([{ id: 'fx1', intensity: 1, name: 'tool-hd-cam-2', params: {} }]);
    expect(css).toContain('contrast(1.15)');
    expect(css).toContain('saturate(1.20)');
  });

  it('tool effects are NOT in the Effects panel catalog', async () => {
    const { EFFECT_CATALOG } = await import('../lib/effects');
    expect(EFFECT_CATALOG.some((d) => d.id.startsWith('tool-'))).toBe(false);
  });
});

describe('v1.0.3 Tools — store apply / intensity / remove', () => {
  it('click-apply adds the tool to the selected video clip at intensity 1', () => {
    const s = freshStore();
    s.selectClip('clip-sample-1');
    const res = s.addEffect('tool-enhance');
    expect(res.status).toBe('applied');
    const clip = useProjectStore.getState().project!.tracks[0].clips[0];
    expect(clip.effects).toHaveLength(1);
    expect(clip.effects[0].name).toBe('tool-enhance');
    expect(clip.effects[0].intensity).toBe(1);
  });

  it('intensity updates and removal work (Intensity-only control)', () => {
    const s = freshStore();
    s.selectClip('clip-sample-1');
    s.addEffect('tool-night-view');
    const clip0 = useProjectStore.getState().project!.tracks[0].clips[0];
    const fxId = clip0.effects[0].id;
    s.updateEffect(fxId, { intensity: 0.5 });
    expect(useProjectStore.getState().project!.tracks[0].clips[0].effects[0].intensity).toBe(0.5);
    s.removeEffect(fxId);
    expect(useProjectStore.getState().project!.tracks[0].clips[0].effects).toHaveLength(0);
  });

  it('applying the same tool twice reports already (no duplicate stack)', () => {
    const s = freshStore();
    s.selectClip('clip-sample-1');
    expect(s.addEffect('tool-4k').status).toBe('applied');
    expect(s.addEffect('tool-4k').status).toBe('already');
    expect(useProjectStore.getState().project!.tracks[0].clips[0].effects).toHaveLength(1);
  });
});

describe('v1.0.3 Transitions — no Pals category', () => {
  it('TRANSITION_NAV has no Pals', () => {
    expect([...TRANSITION_NAV]).not.toContain('Pals');
    expect([...TRANSITION_NAV]).toEqual(['Trending', 'Classic', 'NEW', 'Hits', 'Overlay', 'Light']);
  });
});
