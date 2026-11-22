import { describe, expect, it } from 'vitest';
import { parseProject, SAMPLE_PROJECT, validateProject } from '../schema/project';

describe('project JSON schema', () => {
  it('accepts the shipped sample project', () => {
    const result = validateProject(SAMPLE_PROJECT);
    expect(result.success).toBe(true);
    expect(parseProject(SAMPLE_PROJECT).name).toBe('Sunset Coast — Sample Project');
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
      version: '0.1.0',
    };
    expect(validateProject(minimal).success).toBe(true);
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
});
