import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import musicPrompts from '../../generation/prompts/music.json';
import sfxPrompts from '../../generation/prompts/sfx.json';
import clipPrompts from '../../generation/prompts/clips.json';
import imagePrompts from '../../generation/prompts/images.json';
import aiManifest from '../../assets/ai-manifest.json';
import {
  AI_CLIPS,
  AI_IMAGES,
  AI_MUSIC_TRACKS,
  AI_SFX,
  AI_SFX_TOTAL,
  aiMatches,
} from '../lib/aiLibrary';
import { AI_VOICES, previewAiVoice, resolveAiVoice } from '../lib/voices';
import { keywordsFor, patternForPrompt, seedFromPrompt } from '../lib/aiGenerate';
import { mulberry32 } from '../lib/audio';
import { assetLibraryCounts, assetManifestEntries } from '../lib/assetLibrary';

const unique = (xs: string[]): boolean => new Set(xs).size === xs.length;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('Phase 6 prompt files (SPEC O pipeline)', () => {
  it('ships 100 music, 100 sfx, 100 clip, 110 image prompts with unique ids', () => {
    expect(musicPrompts.length).toBe(100);
    expect(sfxPrompts.length).toBe(100);
    expect(clipPrompts.length).toBe(100);
    expect(imagePrompts.length).toBe(110);
    expect(unique(musicPrompts.map((p) => p.id))).toBe(true);
    expect(unique(sfxPrompts.map((p) => p.id))).toBe(true);
    expect(unique(clipPrompts.map((p) => p.id))).toBe(true);
    expect(unique(imagePrompts.map((p) => p.id))).toBe(true);
  });

  it('music prompts are bar-aligned, loopable, 15/30/60 s across 12 styles', () => {
    const durations = musicPrompts.map((p) => p.duration);
    expect(durations.filter((d) => d === 15).length).toBe(40);
    expect(durations.filter((d) => d === 30).length).toBe(40);
    expect(durations.filter((d) => d === 60).length).toBe(20);
    for (const p of musicPrompts) {
      expect(Math.abs((p.duration * p.bpm) / 240 - p.bars)).toBeLessThan(1e-9);
      expect(p.loopable).toBe(true);
      expect(p.scale.length).toBeGreaterThanOrEqual(5);
      expect(p.progression.length).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(musicPrompts.map((p) => p.style)).size).toBe(12);
  });

  it('sfx prompts cover 20 families x 5, clips 20 scenes x 5 at 1080p/6s', () => {
    expect(new Set(sfxPrompts.map((p) => p.family)).size).toBe(20);
    expect(new Set(clipPrompts.map((p) => p.scene)).size).toBe(20);
    for (const p of clipPrompts) {
      expect(p.width).toBe(1920);
      expect(p.height).toBe(1080);
      expect(p.duration).toBe(6);
    }
  });

  it('image prompts are 40 textures, 20 frames, 50 stickers', () => {
    expect(imagePrompts.filter((p) => p.kind === 'texture').length).toBe(40);
    expect(imagePrompts.filter((p) => p.kind === 'frame').length).toBe(20);
    expect(imagePrompts.filter((p) => p.kind === 'sticker').length).toBe(50);
    for (const p of imagePrompts) {
      expect(p.prompt).not.toMatch(/picasso|disney|marvel|nike|apple/i);
    }
  });

  it('no prompt names an artist, brand, song or character', () => {
    const all = [...musicPrompts, ...sfxPrompts, ...clipPrompts, ...imagePrompts];
    for (const p of all) {
      expect(`${p.name} ${p.prompt}`).not.toMatch(/beatles|taylor|drake|disney|marvel|capcut|spotify|tiktok/i);
    }
  });
});

describe('Phase 6 AI manifest (assets/ai-manifest.json)', () => {
  it('counts match the prompt files', () => {
    const m = aiManifest as unknown as { counts: Record<string, number> };
    expect(m.counts.music).toBe(100);
    expect(m.counts.sfx).toBe(100);
    expect(m.counts.clips).toBe(100);
    expect(m.counts.images).toBe(110);
  });

  it('every manifest entry matches a prompt id and carries its metadata', () => {
    const musicIds = new Set(musicPrompts.map((p) => p.id));
    for (const t of AI_MUSIC_TRACKS) {
      expect(musicIds.has(t.id)).toBe(true);
      expect(t.peaks.length).toBe(32);
      expect(t.bpm).toBeGreaterThanOrEqual(60);
      expect(t.bpm).toBeLessThanOrEqual(140);
      expect(t.pattern.progression.length).toBeGreaterThanOrEqual(3);
      expect(t.file).toBe(`/ai-library/music/${t.id}.mp3`);
    }
    const clipIds = new Set(clipPrompts.map((p) => p.id));
    for (const c of AI_CLIPS) {
      expect(clipIds.has(c.id)).toBe(true);
      expect(c.width).toBe(1920);
      expect(c.height).toBe(1080);
      expect(c.poster).toBe(`/ai-library/clips/posters/${c.id}.jpg`);
    }
    const imageIds = new Set(imagePrompts.map((p) => p.id));
    for (const im of AI_IMAGES) {
      expect(imageIds.has(im.id)).toBe(true);
      expect(['frame', 'sticker', 'texture']).toContain(im.kind);
    }
    expect(AI_SFX.length).toBe(100);
    expect(AI_SFX_TOTAL).toBe(200);
  });

  it('rendered media files exist on disk with plausible sizes', () => {
    const lib = join(ROOT, 'public', 'ai-library');
    if (!existsSync(lib)) return; // text-only checkout: catalog is text, files ship in Drive zip
    let checked = 0;
    for (const t of AI_MUSIC_TRACKS) {
      const f = join(ROOT, 'public', t.file);
      expect(existsSync(f)).toBe(true);
      // 128 kbps MP3: ~16 KB/s, allow +/-25%.
      const size = readFileSync(f).length;
      expect(size).toBeGreaterThan(t.duration * 16000 * 0.75);
      expect(size).toBeLessThan(t.duration * 16000 * 1.25);
      checked += 1;
    }
    for (const c of AI_CLIPS) {
      expect(existsSync(join(ROOT, 'public', c.file))).toBe(true);
      expect(existsSync(join(ROOT, 'public', c.poster))).toBe(true);
      checked += 1;
    }
    for (const im of AI_IMAGES) {
      expect(existsSync(join(ROOT, 'public', im.file))).toBe(true);
      checked += 1;
    }
    expect(checked).toBe(310);
  });

  it('aiMatches filters by name/tags/style', () => {
    expect(aiMatches(['Calm Pad', 'ambient', 'calm'], 'calm')).toBe(true);
    expect(aiMatches(['Calm Pad', 'ambient', 'calm'], 'dance')).toBe(false);
    expect(aiMatches(['anything'], '')).toBe(true);
  });
});

describe('Phase 6 voices (src/lib/voices.ts)', () => {
  it('ships 16 presets: 4 languages x 4 roles, pitch/rate in range', () => {
    expect(AI_VOICES.length).toBe(16);
    for (const lang of ['English', 'Urdu', 'Hindi', 'Arabic']) {
      expect(AI_VOICES.filter((v) => v.lang === lang).length).toBe(4);
    }
    for (const role of ['Narrator', 'Warm', 'Energetic', 'Calm']) {
      expect(AI_VOICES.filter((v) => v.role === role).length).toBe(4);
    }
    for (const v of AI_VOICES) {
      expect(v.pitch).toBeGreaterThanOrEqual(0.5);
      expect(v.pitch).toBeLessThanOrEqual(2);
      expect(v.rate).toBeGreaterThanOrEqual(0.5);
      expect(v.rate).toBeLessThanOrEqual(2);
      expect(v.sample.length).toBeGreaterThan(10);
    }
  });

  it('resolveAiVoice falls back by language, then first voice, then empty', () => {
    const voices = [
      { lang: 'en-US', local: true, name: 'English Voice' },
      { lang: 'ur-PK', local: true, name: 'Urdu Voice' },
    ];
    const urdu = AI_VOICES.find((v) => v.lang === 'Urdu')!;
    expect(resolveAiVoice(voices, urdu)).toBe('Urdu Voice');
    const arabic = AI_VOICES.find((v) => v.lang === 'Arabic')!;
    expect(resolveAiVoice(voices, arabic)).toBe('English Voice');
    expect(resolveAiVoice([], arabic)).toBe('');
  });

  it('previewAiVoice returns false without a browser', () => {
    const preset = AI_VOICES[0];
    expect(previewAiVoice(preset, '')).toBe(false);
  });
});

describe('Phase 6 in-browser generation (src/lib/aiGenerate.ts)', () => {
  it('seedFromPrompt is deterministic and prompt-sensitive', () => {
    expect(seedFromPrompt('calm ocean')).toBe(seedFromPrompt('calm ocean'));
    expect(seedFromPrompt('calm ocean')).not.toBe(seedFromPrompt('neon city'));
  });

  it('keywordsFor maps prompts to styles/palettes', () => {
    expect(keywordsFor('a calm ocean scene').style).toBe('Ambient');
    expect(keywordsFor('neon city at night').style).toBe('Synthwave');
    expect(keywordsFor('epic battle').style).toBe('Epic');
    expect(keywordsFor('something totally new').style).toBe('Chillwave');
  });

  it('patternForPrompt is bar-aligned with a valid scale and root', () => {
    const { bpm, duration, pattern } = patternForPrompt('calm ocean waves', 0);
    expect(Math.abs((duration * bpm) / 240 - pattern.bars)).toBeLessThan(1e-9);
    expect(pattern.scale.length).toBeGreaterThanOrEqual(5);
    expect([50, 52, 53, 55, 57, 59, 60, 62]).toContain(pattern.rootMidi);
  });

  it('mulberry32 is deterministic per seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const c = mulberry32(43);
    expect(c()).not.toBe(mulberry32(42)());
  });
});

describe('Phase 6 asset library counts', () => {
  it('floors hold: 100 tracks, 200 SFX total, 100 clips, 110 images, 16 voices', () => {
    const counts = assetLibraryCounts();
    expect(counts.aiTracks).toBe(100);
    expect(counts.aiSfx).toBe(100);
    expect(counts.sfx).toBe(200);
    expect(counts.aiClips).toBe(100);
    expect(counts.aiImages).toBe(110);
    expect(counts.voices).toBe(16);
  });

  it('manifest entries include the AI rows', () => {
    const entries = assetManifestEntries();
    expect(entries.filter((e) => e.type === 'ai-track').length).toBe(100);
    expect(entries.filter((e) => e.type === 'ai-sfx').length).toBe(100);
    expect(entries.filter((e) => e.type === 'ai-clip').length).toBe(100);
    expect(entries.filter((e) => e.type === 'ai-image').length).toBe(110);
    expect(entries.filter((e) => e.type === 'ai-voice').length).toBe(16);
    expect(entries.length).toBe(663 + 100 + 100 + 100 + 110 + 16);
  });
});
