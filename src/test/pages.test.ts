/**
 * GitHub Pages deploy-base checks.
 * The AI library manifest stores root-absolute public paths
 * ('/ai-library/...'); `withBase` must prefix them with the Vite deploy
 * base so the media loads both locally ('/') and under the project
 * Pages subpath ('/vidora/'). Under Vitest the base is the default '/'.
 */
import { describe, expect, it } from 'vitest';
import {
  AI_CLIPS,
  AI_IMAGES,
  AI_MUSIC_TRACKS,
  AI_SFX,
  withBase,
} from '../lib/aiLibrary';

describe('withBase', () => {
  it('leaves root paths unchanged under the default base', () => {
    expect(import.meta.env.BASE_URL).toBe('/');
    expect(withBase('/ai-library/music/ai-track-001.mp3')).toBe('/ai-library/music/ai-track-001.mp3');
  });

  it('passes already-relative paths through untouched', () => {
    expect(withBase('ai-library/music/x.mp3')).toBe('ai-library/music/x.mp3');
    expect(withBase('logo.svg')).toBe('logo.svg');
  });
});

describe('AI library entries are base-aware', () => {
  it('music tracks point at served files', () => {
    expect(AI_MUSIC_TRACKS.length).toBeGreaterThan(0);
    for (const t of AI_MUSIC_TRACKS) {
      expect(t.file.startsWith(import.meta.env.BASE_URL)).toBe(true);
    }
    expect(AI_MUSIC_TRACKS[0].file).toBe('/ai-library/music/ai-track-001.mp3');
  });

  it('clips carry base-aware file and poster paths', () => {
    expect(AI_CLIPS.length).toBeGreaterThan(0);
    expect(AI_CLIPS[0].file).toBe('/ai-library/clips/ai-clip-001.mp4');
    expect(AI_CLIPS[0].poster).toBe('/ai-library/clips/posters/ai-clip-001.jpg');
  });

  it('images and SFX carry base-aware file paths', () => {
    expect(AI_IMAGES.length).toBeGreaterThan(0);
    expect(AI_IMAGES[0].file.startsWith('/ai-library/images/')).toBe(true);
    expect(AI_SFX.length).toBeGreaterThan(0);
    expect(AI_SFX[0].file.startsWith('/ai-library/sfx/')).toBe(true);
  });
});
