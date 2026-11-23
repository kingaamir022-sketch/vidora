import { describe, expect, it } from 'vitest';
import { GLSL_EFFECT_CATALOG, glslEffectDef, searchGlslEffects } from '../lib/glslEffects';
import { assembleGlslShader } from '../lib/glsl';
import { TRANSITION_TYPES, transitionDef } from '../lib/transitions';
import { BUILTIN_LUTS, lutToCubeText, parseCube, sampleLut } from '../lib/lut';
import { STICKER_CATALOG } from '../lib/stickers';
import { FONT_CATALOG, fontDef } from '../lib/fonts';
import { TEXT_STYLE_PRESETS, applyPreset, evaluateLoopAnimation } from '../lib/text';
import { CAPTION_STYLE_PRESETS } from '../lib/captions';
import { TEMPLATE_CATALOG, applyTemplate, templateDef } from '../lib/templates';
import { ORIGINAL_LOOPS, ORIGINAL_SFX } from '../lib/audio';
import { BACKGROUND_CATALOG, backgroundDef } from '../lib/backgrounds';
import { STICKER_MOTION_SPECS, evaluateStickerAnim, evaluateMotionLoop, motionSpec } from '../lib/stickerAnim';
import { assetLibraryCounts, assetManifestEntries } from '../lib/assetLibrary';
import { animationState } from '../lib/keyframes';
import { SAMPLE_PROJECT, animationKindSchema, loopAnimationSchema, transitionTypeSchema } from '../schema/project';
import { defaultTextStyle } from '../schema/project';

const unique = (xs: string[]): boolean => new Set(xs).size === xs.length;
const finiteState = (s: object): boolean => Object.values(s).every((v) => typeof v === 'number' && Number.isFinite(v));

describe('Phase 5 catalog floors (SPEC N)', () => {
  it('ships 62 GLSL effects, 32 transitions, 32 LUTs, 232 stickers, 40 fonts', () => {
    expect(GLSL_EFFECT_CATALOG.length).toBe(62);
    expect(TRANSITION_TYPES.length).toBe(32);
    expect(BUILTIN_LUTS.length).toBe(32);
    expect(STICKER_CATALOG.length).toBe(232);
    expect(FONT_CATALOG.length).toBe(40);
  });

  it('ships 50 text presets, 20 caption presets, 25 templates, 30 loops, 100 SFX, 30 backgrounds', () => {
    expect(TEXT_STYLE_PRESETS.length).toBe(50);
    expect(CAPTION_STYLE_PRESETS.length).toBe(20);
    expect(TEMPLATE_CATALOG.length).toBe(25);
    expect(ORIGINAL_LOOPS.length).toBe(30);
    expect(ORIGINAL_SFX.length).toBe(100);
    expect(BACKGROUND_CATALOG.length).toBe(30);
  });

  it('every catalog id is unique', () => {
    expect(unique(GLSL_EFFECT_CATALOG.map((e) => e.id))).toBe(true);
    expect(unique(TRANSITION_TYPES.map((t) => t.id))).toBe(true);
    expect(unique(BUILTIN_LUTS.map((l) => l.id))).toBe(true);
    expect(unique(STICKER_CATALOG.map((s) => s.id))).toBe(true);
    expect(unique(FONT_CATALOG.map((f) => f.id))).toBe(true);
    expect(unique(TEXT_STYLE_PRESETS.map((p) => p.id))).toBe(true);
    expect(unique(CAPTION_STYLE_PRESETS.map((c) => c.id))).toBe(true);
    expect(unique(TEMPLATE_CATALOG.map((t) => t.id))).toBe(true);
    expect(unique(ORIGINAL_LOOPS.map((l) => l.id))).toBe(true);
    expect(unique(ORIGINAL_SFX.map((s) => s.id))).toBe(true);
    expect(unique(BACKGROUND_CATALOG.map((b) => b.id))).toBe(true);
    expect(unique(STICKER_MOTION_SPECS.map((s) => s.id))).toBe(true);
  });

  it('assetLibraryCounts meets every floor and the manifest covers the catalogs', () => {
    const counts = assetLibraryCounts();
    expect(counts.glslEffects).toBeGreaterThanOrEqual(60);
    expect(counts.transitions).toBeGreaterThanOrEqual(30);
    expect(counts.luts).toBeGreaterThanOrEqual(30);
    expect(counts.stickers).toBeGreaterThanOrEqual(200);
    expect(counts.fonts).toBeGreaterThanOrEqual(40);
    expect(counts.textPresets).toBeGreaterThanOrEqual(50);
    expect(counts.captionPresets).toBeGreaterThanOrEqual(20);
    expect(counts.templates).toBeGreaterThanOrEqual(25);
    expect(counts.loops).toBeGreaterThanOrEqual(30);
    expect(counts.sfx).toBeGreaterThanOrEqual(100);
    expect(counts.backgrounds).toBeGreaterThanOrEqual(30);
    expect(counts.textAnimations).toBeGreaterThanOrEqual(30);
    const entries = assetManifestEntries();
    expect(entries.length).toBeGreaterThan(600);
    for (const e of entries) {
      expect(e.id.length).toBeGreaterThan(0);
      expect(e.name.length).toBeGreaterThan(0);
      expect(e.license.length).toBeGreaterThan(0);
    }
  });
});

describe('GLSL effects (N-GLSL)', () => {
  it('every effect body declares vec3 o exactly once and assembles', () => {
    for (const def of GLSL_EFFECT_CATALOG) {
      expect(def.body.match(/vec3 o(?![A-Za-z0-9_])/g)?.length ?? 0).toBe(1);
      expect(def.body).not.toContain('gl_FragColor');
      const src = assembleGlslShader(def.body);
      expect(src).toContain('precision highp float');
      expect(src).toContain('u_intensity');
      expect(src).toContain(def.body);
      const opens = (src.match(/\{/g) ?? []).length;
      const closes = (src.match(/\}/g) ?? []).length;
      expect(opens).toBe(closes);
    }
  });

  it('every effect has a valid category and sane params', () => {
    for (const def of GLSL_EFFECT_CATALOG) {
      expect(['Colour', 'Light', 'Distort', 'Stylize', 'Retro', 'Motion']).toContain(def.category);
      for (const p of [def.p1, def.p2]) {
        if (!p) continue;
        expect(p.min).toBeLessThanOrEqual(p.default);
        expect(p.default).toBeLessThanOrEqual(p.max);
        expect(p.step).toBeGreaterThan(0);
      }
    }
  });

  it('search finds effects by name and category', () => {
    expect(searchGlslEffects('glow').length).toBeGreaterThan(0);
    expect(searchGlslEffects('retro').every((d) => d.category === 'Retro')).toBe(true);
    expect(searchGlslEffects('zzzz-no-such-effect')).toHaveLength(0);
    expect(glslEffectDef('warm-glow')?.name).toBe('Warm Glow');
    expect(glslEffectDef('no-such-effect')).toBeUndefined();
  });
});

describe('transitions (E-TRANS, 32)', () => {
  it('every transition type is valid in the project schema', () => {
    for (const t of TRANSITION_TYPES) {
      expect(() => transitionTypeSchema.parse(t.id)).not.toThrow();
    }
    expect(transitionTypeSchema.options.length).toBe(32);
  });

  it('transitionDef and categories cover all six groups', () => {
    expect(new Set(TRANSITION_TYPES.map((t) => t.category)).size).toBe(6);
    expect(transitionDef('heart')?.category).toBe('Shape');
    expect(transitionDef('glitch-cut')?.category).toBe('Camera');
    expect(transitionDef('no-such-transition')).toBeUndefined();
  });
});

describe('LUTs (N-LUTS, 32)', () => {
  it('every built-in LUT round-trips through .cube text within 1e-6', () => {
    for (const lut of BUILTIN_LUTS) {
      const text = lutToCubeText(lut.name, lut.size, lut.data);
      const parsed = parseCube(text);
      expect(parsed.size).toBe(lut.size);
      expect(parsed.data.length).toBe(lut.data.length);
      for (let i = 0; i < lut.data.length; i += 1) {
        expect(Math.abs(parsed.data[i] - lut.data[i])).toBeLessThan(1e-6);
      }
    }
  });

  it('every LUT samples finite colours inside 0..1', () => {
    for (const lut of BUILTIN_LUTS) {
      for (const [r, g, b] of [[0, 0, 0], [1, 1, 1], [0.5, 0.25, 0.75], [1, 0, 0]] as const) {
        const [or, og, ob] = sampleLut(lut.data, lut.size, r, g, b);
        expect(Number.isFinite(or) && Number.isFinite(og) && Number.isFinite(ob)).toBe(true);
        expect(or).toBeGreaterThanOrEqual(0);
        expect(or).toBeLessThanOrEqual(1);
      }
    }
  });

  it('categories are Warm/Cool/Film/Mono/Vivid/Soft and ids are kebab-case', () => {
    for (const lut of BUILTIN_LUTS) {
      expect(['Warm', 'Cool', 'Film', 'Mono', 'Vivid', 'Soft']).toContain(lut.category);
      expect(lut.id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe('fonts (N-FONTS, 40)', () => {
  it('all fonts are SIL OFL 1.1 except JetBrains Mono (Apache-2.0)', () => {
    for (const f of FONT_CATALOG) {
      expect(f.file).toMatch(/\.woff2$/);
      expect(f.stack).toContain(f.family);
      if (f.id === 'jetbrains-mono') expect(f.license).toBe('Apache-2.0');
      else expect(f.license).toBe('SIL OFL 1.1');
    }
    expect(fontDef('inter')?.family).toBe('Inter');
    expect(fontDef('no-such-font')).toBeUndefined();
  });

  it('categories cover Sans/Serif/Mono/Display/Handwriting', () => {
    expect(new Set(FONT_CATALOG.map((f) => f.category)).size).toBe(5);
  });
});

describe('text presets + animations (N-TEXTPRESETS, N-TEXTANIM)', () => {
  it('every preset applies and keeps the clip content', () => {
    for (const p of TEXT_STYLE_PRESETS) {
      const base = defaultTextStyle('Keep me');
      const applied = applyPreset(base, p.id);
      expect(applied.content).toBe('Keep me');
      expect(applied.fontSize).toBeGreaterThan(0);
    }
  });

  it('every in/out animation kind evaluates to finite state', () => {
    for (const kind of animationKindSchema.options) {
      const s = animationState(kind, 0.5, 0.25, 3, 'in');
      expect(finiteState(s)).toBe(true);
    }
    expect(animationKindSchema.options.length).toBe(31);
  });

  it('every loop kind (including all 28 motion-*) evaluates to finite state', () => {
    for (const kind of loopAnimationSchema.options) {
      const s = evaluateLoopAnimation(kind, 0.7, 2);
      expect(finiteState(s)).toBe(true);
    }
    expect(loopAnimationSchema.options.filter((k) => k.startsWith('motion-')).length).toBe(28);
  });

  it('each motion-* kind actually moves something mid-loop', () => {
    for (const kind of loopAnimationSchema.options.filter((k) => k.startsWith('motion-'))) {
      const s = evaluateLoopAnimation(kind, 0.5, 2);
      const moved = Math.abs(s.offsetX) > 0.01 || Math.abs(s.offsetY) > 0.01 || Math.abs(s.rotation) > 0.01 || Math.abs(s.scale - 1) > 0.01 || Math.abs(s.opacity - 1) > 0.01;
      expect(moved).toBe(true);
    }
  });
});

describe('caption presets (N-CAPTIONPRESETS, 20)', () => {
  it('every preset has a position and highlight colours', () => {
    for (const c of CAPTION_STYLE_PRESETS) {
      expect(['top', 'center', 'bottom']).toContain(c.position);
      expect(c.fontSize).toBeGreaterThan(0);
      expect(c.highlight).toMatch(/^#/);
      expect(c.highlightBackground).toMatch(/^#/);
    }
  });
});

describe('templates (N-TEMPLATES, 25)', () => {
  it('applyTemplate builds a valid new project with the template ratio', () => {
    for (const t of TEMPLATE_CATALOG) {
      const next = applyTemplate(SAMPLE_PROJECT, t.id);
      expect(next).not.toBeNull();
      expect(next!.aspectRatio).toBe(t.ratio);
      expect(next!.id).not.toBe(SAMPLE_PROJECT.id);
      expect(next!.tracks.length).toBe(3);
      expect(next!.media).toHaveLength(0);
      const slotCount = next!.tracks[0].clips.length;
      expect(slotCount).toBe(t.slots.length);
      for (const clip of next!.tracks[0].clips) {
        expect(clip.type).toBe('video');
        expect(clip.name.startsWith('▶ ')).toBe(true);
      }
      const overlayCount = next!.tracks[2].clips.length;
      expect(overlayCount).toBe(t.items.length);
    }
  });

  it('unknown template id returns null', () => {
    expect(applyTemplate(SAMPLE_PROJECT, 'no-such-template')).toBeNull();
    expect(templateDef('bold-open')?.name).toBe('Bold Opening');
  });
});

describe('procedural music + SFX (N-MUSIC)', () => {
  it('loops have bpm, duration and tags; SFX have duration and tags', () => {
    for (const l of ORIGINAL_LOOPS) {
      expect(l.kind).toBe('music');
      expect(l.duration).toBeGreaterThan(0);
      expect(l.bpm).toBeGreaterThanOrEqual(60);
      expect(l.bpm).toBeLessThanOrEqual(130);
      expect(l.tags.length).toBeGreaterThan(0);
      expect(typeof l.render).toBe('function');
    }
    for (const s of ORIGINAL_SFX) {
      expect(s.kind).toBe('sfx');
      expect(s.duration).toBeGreaterThan(0);
      expect(s.duration).toBeLessThanOrEqual(2);
      expect(s.tags.length).toBeGreaterThan(0);
      expect(typeof s.render).toBe('function');
    }
  });
});

describe('backgrounds (N-BACKGROUNDS, 30)', () => {
  it('every background is a 320x180 SVG with a viewBox', () => {
    for (const b of BACKGROUND_CATALOG) {
      expect(b.svg.startsWith('<svg')).toBe(true);
      expect(b.svg).toContain('viewBox="0 0 320 180"');
      expect(b.svg.length).toBeGreaterThan(100);
    }
    expect(backgroundDef('violet-dusk')?.name).toBe('Violet Dusk');
    expect(backgroundDef('no-such-background')).toBeUndefined();
  });

  it('categories are Gradients/Patterns/Grain & Dust/Frames', () => {
    expect(new Set(BACKGROUND_CATALOG.map((b) => b.category)).size).toBe(4);
  });
});

describe('sticker motion specs (H-STICKER, 28)', () => {
  it('every spec has sorted keyframes with t in 0..1 and a positive duration', () => {
    for (const spec of STICKER_MOTION_SPECS) {
      expect(spec.duration).toBeGreaterThan(0);
      expect(spec.keyframes.length).toBeGreaterThanOrEqual(2);
      const ts = spec.keyframes.map((k) => k.t);
      expect(Math.min(...ts)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...ts)).toBeLessThanOrEqual(1);
      for (let i = 1; i < ts.length; i += 1) expect(ts[i]).toBeGreaterThanOrEqual(ts[i - 1]);
    }
    expect(motionSpec('heart')?.name).toBe('Heartbeat');
    expect(motionSpec('no-such-motion')).toBeUndefined();
  });

  it('evaluateStickerAnim loops and returns finite state', () => {
    for (const spec of STICKER_MOTION_SPECS) {
      const a = evaluateStickerAnim(spec.id, 0.4);
      const b = evaluateStickerAnim(spec.id, 0.4 + spec.duration);
      expect(finiteState(a)).toBe(true);
      expect(a).toEqual(b);
    }
    const moved = evaluateMotionLoop('motion-heart', 0.3);
    expect(moved.scale).toBeGreaterThan(1);
  });
});
