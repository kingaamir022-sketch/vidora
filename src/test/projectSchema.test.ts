import { describe, expect, it } from 'vitest';
import { migrateProject, parseProject, resolutionForRatio, SAMPLE_PROJECT, validateProject } from '../schema/project';

describe('project JSON schema (v0.2.0)', () => {
  it('accepts the shipped sample project', () => {
    const result = validateProject(SAMPLE_PROJECT);
    expect(result.success).toBe(true);
    expect(parseProject(SAMPLE_PROJECT).name).toBe('Sunset Coast — Sample Project');
    expect(parseProject(SAMPLE_PROJECT).version).toBe('0.2.0');
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
      version: '0.2.0',
    };
    expect(validateProject(minimal).success).toBe(true);
  });

  it('still accepts a v0.1.0 document and migrates it to 0.2.0', () => {
    const old = { ...SAMPLE_PROJECT, version: '0.1.0' as const };
    expect(validateProject(old).success).toBe(true);
    expect(migrateProject(old).version).toBe('0.2.0');
    expect(migrateProject(old).media).toEqual([]);
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

  it('resolves resolutions for every ratio including custom', () => {
    expect(resolutionForRatio('9:16')).toEqual({ height: 1920, width: 1080 });
    expect(resolutionForRatio('1:1')).toEqual({ height: 1080, width: 1080 });
    expect(resolutionForRatio('21:9')).toEqual({ height: 1080, width: 2520 });
    expect(resolutionForRatio('custom', { height: 720, width: 1280 })).toEqual({ height: 720, width: 1280 });
  });
});
