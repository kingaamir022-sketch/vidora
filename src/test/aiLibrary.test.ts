/**
 * AI library catalog wiring (CapCut-fix 2026-11-25, O3 redistribution):
 * the deleted AI Library panel's catalog is addable from the editor —
 * music/SFX from the Audio tab, clips/images from the Media tab.
 * These tests cover the MediaItem builders the panels use, plus the
 * catalog counts the panels list.
 */
import { describe, expect, it } from 'vitest';
import { mediaItemSchema } from '../schema/project';
import {
  AI_CLIPS,
  AI_IMAGES,
  AI_MUSIC_TRACKS,
  AI_SFX,
  aiClipToMediaItem,
  aiImageToMediaItem,
  aiMatches,
  aiMusicToMediaItem,
  aiSfxToMediaItem,
} from '../lib/aiLibrary';

describe('AI library catalog', () => {
  it('ships 100 tracks, 100 SFX, 100 clips, 110 images', () => {
    expect(AI_MUSIC_TRACKS).toHaveLength(100);
    expect(AI_SFX).toHaveLength(100);
    expect(AI_CLIPS).toHaveLength(100);
    expect(AI_IMAGES).toHaveLength(110);
  });

  it('builds a schema-valid audio MediaItem from a music track', () => {
    const item = aiMusicToMediaItem(AI_MUSIC_TRACKS[0], 'media-test-1');
    expect(mediaItemSchema.safeParse(item).success).toBe(true);
    expect(item.kind).toBe('audio');
    expect(item.mime).toBe('audio/mpeg');
    expect(item.src).toBe(AI_MUSIC_TRACKS[0].file);
    expect(item.duration).toBe(AI_MUSIC_TRACKS[0].duration);
    expect(item.peaks).toEqual(AI_MUSIC_TRACKS[0].peaks);
  });

  it('builds a schema-valid audio MediaItem from an SFX entry', () => {
    const item = aiSfxToMediaItem(AI_SFX[0], 'media-test-2');
    expect(mediaItemSchema.safeParse(item).success).toBe(true);
    expect(item.kind).toBe('audio');
    expect(item.src).toBe(AI_SFX[0].file);
  });

  it('builds a schema-valid video MediaItem from a clip (poster as thumbnail)', () => {
    const item = aiClipToMediaItem(AI_CLIPS[0], 'media-test-3');
    expect(mediaItemSchema.safeParse(item).success).toBe(true);
    expect(item.kind).toBe('video');
    expect(item.mime).toBe('video/mp4');
    expect(item.thumbnail).toBe(AI_CLIPS[0].poster);
    expect(item.width).toBe(AI_CLIPS[0].width);
    expect(item.height).toBe(AI_CLIPS[0].height);
  });

  it('builds a schema-valid image MediaItem from an image entry', () => {
    const item = aiImageToMediaItem(AI_IMAGES[0], 'media-test-4');
    expect(mediaItemSchema.safeParse(item).success).toBe(true);
    expect(item.kind).toBe('image');
    expect(item.thumbnail).toBe(AI_IMAGES[0].file);
  });

  it('aiMatches matches name/style/tags and is empty-query permissive', () => {
    expect(aiMatches(['Calm Dawn', 'ambient', 'calm'], '')).toBe(true);
    expect(aiMatches(['Calm Dawn', 'ambient', 'calm'], 'CALM')).toBe(true);
    expect(aiMatches(['Calm Dawn', 'ambient', 'calm'], 'storm')).toBe(false);
  });
});
