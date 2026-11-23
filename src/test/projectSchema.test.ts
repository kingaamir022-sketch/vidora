import { describe, expect, it } from 'vitest';
import { migrateProject, parseProject, resolutionForRatio, SAMPLE_PROJECT, validateProject } from '../schema/project';

describe('project JSON schema (v0.4.0)', () => {
  it('accepts the shipped sample project', () => {
    const result = validateProject(SAMPLE_PROJECT);
    expect(result.success).toBe(true);
    expect(parseProject(SAMPLE_PROJECT).name).toBe('Sunset Coast — Sample Project');
    expect(parseProject(SAMPLE_PROJECT).version).toBe('0.4.0');
  });

  it('accepts a minimal valid project', () => {
    const minimal = {
      aspectRatio: '9:16',
      createdAt: '2026-11-22T00:00:00.000Z',
      fps: 60,
      id: 'p-minimal',
      name: 'Minimal',
      resolution: { height: 1920, width: 1080 },
      updatedAt: '2026-11-22T00:00:00.000Z',
      version: '0.3.0',
    };
    expect(validateProject(minimal).success).toBe(true);
  });

  it('still accepts a v0.1.0 document and migrates it to 0.4.0', () => {
    const old = { ...SAMPLE_PROJECT, version: '0.1.0' as const };
    expect(validateProject(old).success).toBe(true);
    expect(migrateProject(old).version).toBe('0.4.0');
    expect(migrateProject(old).media).toEqual([]);
  });

  it('migrates a v0.2.0 document: keyframes gain ids, adjustment defaults appear', () => {
    const old = structuredClone(SAMPLE_PROJECT);
    old.version = '0.2.0';
    const clip = old.tracks[0].clips[0] as unknown as Record<string, unknown>;
    delete clip.adjustment;
    delete clip.animationIn;
    clip.keyframes = [{ easing: 'linear', property: 'opacity', time: 0, value: 1 }];
    const migrated = migrateProject(old);
    expect(migrated.version).toBe('0.4.0');
    const mclip = migrated.tracks[0].clips[0];
    expect(mclip.adjustment.brightness).toBe(0);
    expect(mclip.keyframes[0].id).toMatch(/^kf-/);
    expect(validateProject(migrated).success).toBe(true);
  });

  it('accepts Phase 2 clip fields: keyframes, animation, transition, LUT, mask, chroma, layout, adjustment', () => {
    const project = structuredClone(SAMPLE_PROJECT);
    const clip = project.tracks[0].clips[0];
    clip.keyframes = [{ bezier: undefined, easing: 'bezier', id: 'kf-1', property: 'opacity', time: 1, value: 0.5 }];
    clip.animationIn = { duration: 0.5, kind: 'fade' };
    clip.animationOut = { duration: 0.5, kind: 'zoom-out' };
    clip.transitionIn = { direction: 'right', duration: 0.5, type: 'fade' };
    clip.lut = { data: new Array(24).fill(0.5), intensity: 0.5, name: 'Test', size: 2, source: 'imported' };
    clip.mask = { feather: 0.2, invert: false, points: [], shape: 'circle' };
    clip.chromaKey = { color: '#00FF00', enabled: true, smoothness: 0.2, tolerance: 0.3 };
    clip.layoutMode = 'pip';
    clip.adjustment.brightness = 0.2;
    clip.adjustment.curves.r = [{ x: 0, y: 0 }, { x: 0.5, y: 0.6 }, { x: 1, y: 1 }];
    expect(validateProject(project).success).toBe(true);
  });

  it('rejects a LUT with the wrong data length for its size', () => {
    const project = structuredClone(SAMPLE_PROJECT);
    project.tracks[0].clips[0].lut = { data: [0, 0, 0], intensity: 1, name: 'Bad', size: 2, source: 'imported' };
    expect(validateProject(project).success).toBe(false);
  });

  it('rejects an unknown aspect ratio', () => {
    const bad = { ...SAMPLE_PROJECT, aspectRatio: '3:2' };
    expect(validateProject(bad).success).toBe(false);
  });

  it('rejects a clip with a non-positive duration', () => {
    const bad = structuredClone(SAMPLE_PROJECT);
    bad.tracks[0].clips[0].duration = 0;
    expect(validateProject(bad).success).toBe(false);
  });

  it('rejects a project with no name', () => {
    const bad = { ...SAMPLE_PROJECT, name: '' };
    expect(validateProject(bad).success).toBe(false);
  });

  it('rejects a wrong document version', () => {
    const bad = { ...SAMPLE_PROJECT, version: '9.9.9' };
    expect(validateProject(bad).success).toBe(false);
  });

  it('accepts Phase 1 clip fields: speed, reverse, freeze, crop, fit, flip, mediaId', () => {
    const clip = {
      ...SAMPLE_PROJECT.tracks[0].clips[0],
      crop: { height: 0.5, width: 0.5, x: 0.25, y: 0.25 },
      fit: 'fill' as const,
      flipH: true,
      frozen: true,
      mediaId: 'media-1',
      reversed: true,
      speed: 2,
    };
    const project = structuredClone(SAMPLE_PROJECT);
    project.tracks[0].clips[0] = clip;
    expect(validateProject(project).success).toBe(true);
  });

  it('rejects speed outside 0.1–100', () => {
    const project = structuredClone(SAMPLE_PROJECT);
    project.tracks[0].clips[0].speed = 200;
    expect(validateProject(project).success).toBe(false);
    const slow = structuredClone(SAMPLE_PROJECT);
    slow.tracks[0].clips[0].speed = 0.05;
    expect(validateProject(slow).success).toBe(false);
  });

  it('accepts media items and folders', () => {
    const project = structuredClone(SAMPLE_PROJECT);
    project.folders = [
      { id: 'folder-all', name: 'All media' },
      { id: 'folder-broll', name: 'B-roll' },
    ];
    project.media = [
      {
        createdAt: '2026-11-22T00:00:00.000Z',
        duration: 12.5,
        folderId: 'folder-broll',
        height: 1080,
        id: 'media-1',
        kind: 'video' as const,
        mime: 'video/mp4',
        name: 'coast.mp4',
        size: 1024,
        src: 'blob:vidora/coast',
        width: 1920,
      },
    ];
    expect(validateProject(project).success).toBe(true);
  });

  it('accepts the Smooth slow-mo flag and the new blend modes (correction round)', () => {
    const project = structuredClone(SAMPLE_PROJECT);
    const clip = project.tracks[0].clips[0];
    expect(clip.smoothSlowMo).toBe(false);
    clip.smoothSlowMo = true;
    clip.adjustment.blendMode = 'color-burn';
    expect(validateProject(project).success).toBe(true);
    const withoutFlag = structuredClone(SAMPLE_PROJECT);
    delete (withoutFlag.tracks[0].clips[0] as unknown as Record<string, unknown>).smoothSlowMo;
    const parsed = parseProject(withoutFlag);
    expect(parsed.tracks[0].clips[0].smoothSlowMo).toBe(false);
  });

  it('resolves resolutions for every ratio including custom', () => {
    expect(resolutionForRatio('9:16')).toEqual({ height: 1920, width: 1080 });
    expect(resolutionForRatio('1:1')).toEqual({ height: 1080, width: 1080 });
    expect(resolutionForRatio('21:9')).toEqual({ height: 1080, width: 2520 });
    expect(resolutionForRatio('custom', { height: 720, width: 1280 })).toEqual({ height: 720, width: 1280 });
  });
});

describe('project JSON schema — Phase 3 fields (v0.4.0)', () => {
  it('migrates a v0.3.0 document: captions default to [] and loop animation defaults to none', () => {
    const old = structuredClone(SAMPLE_PROJECT);
    old.version = '0.3.0';
    delete (old as unknown as Record<string, unknown>).captions;
    const clip = old.tracks[0].clips[0] as unknown as Record<string, unknown>;
    delete clip.animationLoop;
    const migrated = migrateProject(old);
    expect(migrated.version).toBe('0.4.0');
    expect(migrated.captions).toEqual([]);
    expect(migrated.tracks[0].clips[0].animationLoop).toEqual({ duration: 2, kind: 'none' });
    expect(validateProject(migrated).success).toBe(true);
  });

  it('accepts a text clip with a full text style, loop animation and TTS narration', () => {
    const project = structuredClone(SAMPLE_PROJECT);
    const clip = project.tracks[0].clips[0];
    clip.type = 'text';
    clip.text = {
      content: 'Hello',
      style: {
        align: 'center',
        backgroundColor: 'transparent',
        backgroundPadding: 8,
        bold: true,
        content: 'Hello',
        fill: '#FFFFFF',
        fillGradient: null,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 48,
        glow: { blur: 16, color: '#06B6D4', enabled: true },
        italic: false,
        lineSpacing: 1.2,
        shadow: { blur: 4, color: '#000000', enabled: false, offsetX: 2, offsetY: 2 },
        strokeColor: '#000000',
        strokeWidth: 0,
        underline: false,
      },
      tts: { pitch: 1.1, rate: 0.9, voice: 'Alex' },
    };
    clip.animationLoop = { duration: 2, kind: 'pulse' };
    expect(validateProject(project).success).toBe(true);
  });

  it('rejects a text style with a font size outside 8–200', () => {
    const project = structuredClone(SAMPLE_PROJECT);
    const clip = project.tracks[0].clips[0];
    clip.type = 'text';
    clip.text = {
      content: 'Too big',
      style: { ...structuredClone(clip).text?.style, content: 'Too big', fontSize: 300 } as never,
      tts: null,
    };
    expect(validateProject(project).success).toBe(false);
  });

  it('accepts a sticker clip, a drawing clip and a tracked overlay clip', () => {
    const project = structuredClone(SAMPLE_PROJECT);
    const clip = project.tracks[0].clips[0];
    clip.type = 'sticker';
    clip.sticker = { category: 'Faces', id: 'smile-violet', kind: 'sticker', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"></svg>' };
    clip.drawing = { strokes: [{ color: '#FFFFFF', points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }], width: 4 }] };
    clip.tracking = { points: [{ time: 0, x: 0.5, y: 0.5 }, { time: 2, x: 0.6, y: 0.4 }], targetClipId: 'clip-other' };
    expect(validateProject(project).success).toBe(true);
  });

  it('accepts project-level caption cues with word timing and translations', () => {
    const project = structuredClone(SAMPLE_PROJECT);
    project.captions = [
      {
        end: 3.5,
        id: 'cue-1',
        start: 1,
        text: 'Hello world',
        translations: { ur: 'ہیلو دنیا' },
        words: [
          { end: 2.25, start: 1, text: 'Hello' },
          { end: 3.5, start: 2.25, text: 'world' },
        ],
      },
    ];
    project.captionStyleId = 'classic-box';
    expect(validateProject(project).success).toBe(true);
  });

  it('rejects an unknown loop animation kind', () => {
    const project = structuredClone(SAMPLE_PROJECT);
    project.tracks[0].clips[0].animationLoop = { duration: 2, kind: 'spin-fast' } as never;
    expect(validateProject(project).success).toBe(false);
  });
});
