/**
 * Asset library summary (Phase 5, SPEC N — N-ASSETS).
 * Aggregates every procedural catalog into the counts the MediaBrowser
 * shows, and the shape `scripts/build-assets.mjs` writes to
 * `assets/manifest.json` (id, name, category, tags, license per entry).
 */

import { GLSL_EFFECT_CATALOG } from './glslEffects';
import { TRANSITION_TYPES } from './transitions';
import { BUILTIN_LUTS } from './lut';
import { STICKER_CATALOG, SHAPE_DEFS } from './stickers';
import { FONT_CATALOG } from './fonts';
import { TEXT_STYLE_PRESETS } from './text';
import { CAPTION_STYLE_PRESETS } from './captions';
import { TEMPLATE_CATALOG } from './templates';
import { ORIGINAL_LOOPS, ORIGINAL_SFX } from './audio';
import { BACKGROUND_CATALOG } from './backgrounds';
import { EFFECT_CATALOG } from './effects';
import { animationKindSchema, loopAnimationSchema } from '../schema/project';
import { AI_CLIPS, AI_IMAGES, AI_MUSIC_TRACKS, AI_SFX, AI_SFX_TOTAL } from './aiLibrary';
import { AI_VOICES } from './voices';

/** Text animations: in/out kinds + loop kinds, excluding 'none' and the
 * 28 `motion-*` kinds (those belong to the sticker motion specs). */
export function textAnimationCount(): number {
  const inOut = animationKindSchema.options.filter((k) => k !== 'none').length;
  const loop = loopAnimationSchema.options.filter((k) => k !== 'none' && !k.startsWith('motion-')).length;
  return inOut + loop;
}

export interface AssetLibraryCounts {
  aiClips: number;
  aiImages: number;
  aiSfx: number;
  aiTracks: number;
  backgrounds: number;
  captionPresets: number;
  cssEffects: number;
  fonts: number;
  glslEffects: number;
  loops: number;
  luts: number;
  sfx: number;
  shapes: number;
  stickers: number;
  templates: number;
  textAnimations: number;
  textPresets: number;
  total: number;
  transitions: number;
  voices: number;
}

export function assetLibraryCounts(): AssetLibraryCounts {
  const counts: AssetLibraryCounts = {
    aiClips: AI_CLIPS.length,
    aiImages: AI_IMAGES.length,
    aiSfx: AI_SFX.length,
    aiTracks: AI_MUSIC_TRACKS.length,
    backgrounds: BACKGROUND_CATALOG.length,
    captionPresets: CAPTION_STYLE_PRESETS.length,
    cssEffects: EFFECT_CATALOG.length,
    fonts: FONT_CATALOG.length,
    glslEffects: GLSL_EFFECT_CATALOG.length,
    loops: ORIGINAL_LOOPS.length,
    luts: BUILTIN_LUTS.length,
    sfx: AI_SFX_TOTAL,
    shapes: SHAPE_DEFS.length,
    stickers: STICKER_CATALOG.length,
    templates: TEMPLATE_CATALOG.length,
    textAnimations: textAnimationCount(),
    textPresets: TEXT_STYLE_PRESETS.length,
    total: 0,
    transitions: TRANSITION_TYPES.length,
    voices: AI_VOICES.length,
  };
  counts.total =
    counts.aiClips + counts.aiImages + counts.aiSfx + counts.aiTracks +
    counts.backgrounds + counts.captionPresets + counts.cssEffects + counts.fonts + counts.glslEffects +
    counts.loops + counts.luts + counts.sfx + counts.shapes + counts.stickers + counts.templates +
    counts.textAnimations + counts.textPresets + counts.transitions + counts.voices;
  return counts;
}

export interface ManifestEntry {
  category: string;
  id: string;
  license: string;
  name: string;
  tags: string[];
  type: string;
}

/** Every catalog entry as a flat manifest row (for assets/manifest.json). */
export function assetManifestEntries(): ManifestEntry[] {
  const entries: ManifestEntry[] = [];
  for (const e of GLSL_EFFECT_CATALOG) {
    entries.push({ category: e.category, id: e.id, license: 'CC0 (Vidora original)', name: e.name, tags: ['glsl', 'effect', e.category.toLowerCase()], type: 'glsl-effect' });
  }
  for (const t of TRANSITION_TYPES) {
    entries.push({ category: t.category, id: t.id, license: 'CC0 (Vidora original)', name: t.id, tags: ['transition', t.category.toLowerCase()], type: 'transition' });
  }
  for (const l of BUILTIN_LUTS) {
    entries.push({ category: l.category, id: l.id, license: 'CC0 (Vidora original)', name: l.name, tags: ['lut', 'look', l.category.toLowerCase()], type: 'lut' });
  }
  for (const s of STICKER_CATALOG) {
    entries.push({ category: s.category, id: s.id, license: 'CC0 (Vidora original)', name: s.name, tags: ['sticker', s.category.toLowerCase()], type: 'sticker' });
  }
  for (const s of SHAPE_DEFS) {
    entries.push({ category: 'Shapes', id: `shape-${s.id}`, license: 'CC0 (Vidora original)', name: s.name, tags: ['shape'], type: 'shape' });
  }
  for (const f of FONT_CATALOG) {
    entries.push({ category: f.category, id: f.id, license: f.license, name: f.family, tags: ['font', f.category.toLowerCase()], type: 'font' });
  }
  for (const p of TEXT_STYLE_PRESETS) {
    entries.push({ category: p.category, id: p.id, license: 'CC0 (Vidora original)', name: p.name, tags: ['text', 'preset', p.category.toLowerCase()], type: 'text-preset' });
  }
  for (const c of CAPTION_STYLE_PRESETS) {
    entries.push({ category: 'Captions', id: c.id, license: 'CC0 (Vidora original)', name: c.name, tags: ['caption', 'preset'], type: 'caption-preset' });
  }
  for (const t of TEMPLATE_CATALOG) {
    entries.push({ category: t.category, id: t.id, license: 'CC0 (Vidora original)', name: t.name, tags: ['template', t.category.toLowerCase(), t.ratio], type: 'template' });
  }
  for (const l of ORIGINAL_LOOPS) {
    entries.push({ category: l.category, id: l.id, license: 'CC0 (Vidora original)', name: l.name, tags: ['music', 'loop', ...l.tags], type: 'loop' });
  }
  for (const s of ORIGINAL_SFX) {
    entries.push({ category: s.category, id: s.id, license: 'CC0 (Vidora original)', name: s.name, tags: ['sfx', ...s.tags], type: 'sfx' });
  }
  for (const b of BACKGROUND_CATALOG) {
    entries.push({ category: b.category, id: b.id, license: 'CC0 (Vidora original)', name: b.name, tags: ['background', b.category.toLowerCase()], type: 'background' });
  }
  // Phase 6 (Section O) — AI-generated library (assets/ai-manifest.json).
  for (const t of AI_MUSIC_TRACKS) {
    entries.push({ category: t.style, id: t.id, license: 'CC0 (Vidora original)', name: t.name, tags: ['ai', 'music', 'track', t.style.toLowerCase(), t.mood], type: 'ai-track' });
  }
  for (const s of AI_SFX) {
    entries.push({ category: s.family, id: s.id, license: 'CC0 (Vidora original)', name: s.name, tags: ['ai', 'sfx', s.family], type: 'ai-sfx' });
  }
  for (const c of AI_CLIPS) {
    entries.push({ category: c.scene, id: c.id, license: 'CC0 (Vidora original)', name: c.name, tags: ['ai', 'clip', c.scene.toLowerCase(), c.motion], type: 'ai-clip' });
  }
  for (const im of AI_IMAGES) {
    entries.push({ category: im.kind, id: im.id, license: 'CC0 (Vidora original)', name: im.name, tags: ['ai', 'image', im.kind, im.design], type: 'ai-image' });
  }
  for (const v of AI_VOICES) {
    entries.push({ category: v.lang, id: v.id, license: 'CC0 (Vidora original)', name: v.name, tags: ['ai', 'voice', v.lang.toLowerCase(), v.role.toLowerCase()], type: 'ai-voice' });
  }
  return entries;
}
