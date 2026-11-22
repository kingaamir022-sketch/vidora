import { describe, expect, it } from 'vitest';
import { SAMPLE_PROJECT, type Clip, type VidoraProject } from '../schema/project';
import {
  clampSpeed,
  deleteClip,
  duplicateClip,
  durationAtSpeed,
  groupClips,
  makeCompound,
  moveClip,
  projectDuration,
  rippleDeleteClip,
  setClipSpeed,
  splitClipAt,
  trimClip,
  ungroupClips,
} from '../lib/timeline';

function twoClipProject(): VidoraProject {
  const p = structuredClone(SAMPLE_PROJECT);
  const base = p.tracks[0].clips[0];
  const second: Clip = { ...base, duration: 6, id: 'clip-2', name: 'Second', sourceDuration: 6, start: 10 };
  p.tracks[0].clips = [base, second];
  return p;
}

describe('timeline operations', () => {
  it('computes project duration from clip ends', () => {
    expect(projectDuration(twoClipProject())).toBe(16);
    expect(projectDuration(SAMPLE_PROJECT)).toBe(10);
  });

  it('splits a clip at the playhead time into two clips', () => {
    const next = splitClipAt(SAMPLE_PROJECT, 'clip-sample-1', 4);
    expect(next).not.toBeNull();
    const clips = next!.tracks[0].clips;
    expect(clips).toHaveLength(2);
    expect(clips[0].duration).toBe(4);
    expect(clips[1].duration).toBe(6);
    expect(clips[1].start).toBe(4);
    expect(clips[1].sourceStart).toBe(4);
  });

  it('refuses to split outside a clip', () => {
    expect(splitClipAt(SAMPLE_PROJECT, 'clip-sample-1', 0)).toBeNull();
    expect(splitClipAt(SAMPLE_PROJECT, 'clip-sample-1', 10)).toBeNull();
    expect(splitClipAt(SAMPLE_PROJECT, 'clip-sample-1', 99)).toBeNull();
  });

  it('trims the end of a clip', () => {
    const next = trimClip(SAMPLE_PROJECT, 'clip-sample-1', 'end', -2);
    expect(next?.tracks[0].clips[0].duration).toBe(8);
  });

  it('trims the start of a clip and shifts its source start', () => {
    const next = trimClip(SAMPLE_PROJECT, 'clip-sample-1', 'start', 2);
    const clip = next?.tracks[0].clips[0];
    expect(clip?.duration).toBe(8);
    expect(clip?.start).toBe(2);
    expect(clip?.sourceStart).toBe(2);
  });

  it('refuses a trim that would make a clip shorter than 0.1s', () => {
    expect(trimClip(SAMPLE_PROJECT, 'clip-sample-1', 'end', -9.95)).toBeNull();
  });

  it('deletes a clip', () => {
    const next = deleteClip(twoClipProject(), 'clip-2');
    expect(next.tracks[0].clips).toHaveLength(1);
  });

  it('duplicates a clip right after the original', () => {
    const next = duplicateClip(SAMPLE_PROJECT, 'clip-sample-1');
    const clips = next!.tracks[0].clips;
    expect(clips).toHaveLength(2);
    expect(clips[1].start).toBe(10);
    expect(clips[1].name).toContain('copy');
    expect(clips[1].id).not.toBe(clips[0].id);
  });

  it('ripple-deletes and pulls later clips earlier', () => {
    const next = rippleDeleteClip(twoClipProject(), 'clip-sample-1');
    const clips = next.tracks[0].clips;
    expect(clips).toHaveLength(1);
    expect(clips[0].start).toBe(0);
  });

  it('moves a clip to a new start time', () => {
    const next = moveClip(SAMPLE_PROJECT, 'clip-sample-1', 5);
    expect(next?.tracks[0].clips[0].start).toBe(5);
    expect(moveClip(SAMPLE_PROJECT, 'clip-sample-1', -3)?.tracks[0].clips[0].start).toBe(0);
  });

  it('groups and ungroups clips', () => {
    const { groupId, project } = groupClips(twoClipProject(), ['clip-sample-1', 'clip-2']);
    expect(project.tracks[0].clips.every((c) => c.groupId === groupId)).toBe(true);
    const ungrouped = ungroupClips(project, groupId);
    expect(ungrouped.tracks[0].clips.every((c) => c.groupId === undefined)).toBe(true);
  });

  it('makes a compound clip from two clips', () => {
    const next = makeCompound(twoClipProject(), ['clip-sample-1', 'clip-2'], 'My compound');
    expect(next).not.toBeNull();
    expect(next!.tracks[0].clips).toHaveLength(1);
    expect(next!.tracks[0].clips[0].isCompound).toBe(true);
    expect(next!.tracks[0].clips[0].name).toBe('My compound');
  });

  it('refuses a compound clip from fewer than two clips', () => {
    expect(makeCompound(SAMPLE_PROJECT, ['clip-sample-1'], 'Too small')).toBeNull();
  });
});

describe('speed', () => {
  it('duration at speed is sourceDuration / speed', () => {
    expect(durationAtSpeed(10, 2)).toBe(5);
    expect(durationAtSpeed(10, 0.5)).toBe(20);
    expect(durationAtSpeed(10, 1)).toBe(10);
  });

  it('clamps speed to 0.1–100', () => {
    expect(clampSpeed(0)).toBe(0.1);
    expect(clampSpeed(200)).toBe(100);
    expect(clampSpeed(2)).toBe(2);
  });

  it('setting speed to 2x halves the timeline duration and keeps the source', () => {
    const next = setClipSpeed(SAMPLE_PROJECT, 'clip-sample-1', 2);
    const clip = next.tracks[0].clips[0];
    expect(clip.speed).toBe(2);
    expect(clip.duration).toBe(5);
    expect(clip.sourceDuration).toBe(10);
  });

  it('setting speed to 0.5x doubles the timeline duration', () => {
    const next = setClipSpeed(SAMPLE_PROJECT, 'clip-sample-1', 0.5);
    expect(next.tracks[0].clips[0].duration).toBe(20);
  });
});
