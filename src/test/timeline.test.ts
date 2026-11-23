import { describe, expect, it } from 'vitest';
import { SAMPLE_PROJECT, type Clip, type VidoraProject } from '../schema/project';
import {
  addClipToTextTrack,
  allClipIds,
  clampSpeed,
  deleteClip,
  duplicateClip,
  durationAtSpeed,
  findClip,
  groupClips,
  makeCompound,
  moveClip,
  projectDuration,
  rippleDeleteClip,
  setClipSpeed,
  snapTime,
  snapToFrame,
  speedForDuration,
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

  it('clamps typed speeds the way CapCut does (0.05→0.10x, 200→100x)', () => {
    expect(clampSpeed(0.05)).toBe(0.1);
    expect(speedForDuration(10, 200)).toBe(0.1);
    expect(speedForDuration(10, 0.05)).toBe(100);
    expect(speedForDuration(10, 5)).toBe(2);
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

describe('frame snapping and select-all (CapCut Web correction round)', () => {
  it('quantizes times to the nearest frame at the project fps', () => {
    expect(snapToFrame(1.017, 30)).toBeCloseTo(31 / 30);
    expect(snapToFrame(1.5, 30)).toBe(1.5);
    expect(snapToFrame(0.01, 30)).toBe(0);
    expect(snapToFrame(2.5, 60)).toBe(2.5);
    expect(snapToFrame(2.51, 60)).toBeCloseTo(151 / 60);
  });

  it('with Attach on, snaps to a nearby clip edge, else to the nearest frame', () => {
    // Sample clip runs 0–10s at 30fps; marker at 0.
    expect(snapTime(9.98, SAMPLE_PROJECT, true, 0)).toBe(10);
    expect(snapTime(5.02, SAMPLE_PROJECT, true, 0)).toBeCloseTo(151 / 30);
    expect(snapTime(0.3, SAMPLE_PROJECT, true, 0)).toBe(0.3); // 9 frames, no magnet target within 0.25s
    expect(snapTime(5.1, SAMPLE_PROJECT, true, 5)).toBe(5); // magnet to the playhead
  });

  it('with Attach off, passes the time through unchanged', () => {
    expect(snapTime(5.017, SAMPLE_PROJECT, false, 0)).toBe(5.017);
    expect(snapTime(9.98, SAMPLE_PROJECT, false, 0)).toBe(9.98);
  });

  it('select-all returns every clip id on every track, in track order', () => {
    const p = twoClipProject();
    p.tracks[1].clips = [{ ...p.tracks[0].clips[0], id: 'clip-audio-1', name: 'Audio clip', start: 0, trackId: 'track-audio-1', type: 'audio' }];
    expect(allClipIds(p)).toEqual(['clip-sample-1', 'clip-2', 'clip-audio-1']);
    expect(allClipIds(SAMPLE_PROJECT)).toEqual(['clip-sample-1']);
  });
});

describe('overlay clip placement (BUG-P3-001)', () => {
  function textTrackProject(): VidoraProject {
    const p = structuredClone(SAMPLE_PROJECT);
    const base = p.tracks[0].clips[0];
    p.tracks = [
      { ...p.tracks[0] },
      {
        clips: [{ ...base, duration: 3, id: 'clip-text-1', name: 'Heading', start: 0, trackId: 'track-text-1', type: 'text' }],
        hidden: false,
        id: 'track-text-1',
        kind: 'text',
        locked: false,
        muted: false,
        name: 'Text 1',
      },
    ];
    return p;
  }

  function overlayClip(id: string, start: number, duration = 3): Clip {
    const base = SAMPLE_PROJECT.tracks[0].clips[0];
    return { ...base, duration, id, name: id, start, trackId: '', type: 'text' };
  }

  it('opens a new text track when the clip overlaps the first one', () => {
    const next = addClipToTextTrack(textTrackProject(), overlayClip('clip-text-2', 0));
    expect(next.tracks).toHaveLength(3);
    const placed = findClip(next, 'clip-text-2');
    expect(placed).not.toBeNull();
    expect(next.tracks[placed!.trackIndex].kind).toBe('text');
    expect(next.tracks[placed!.trackIndex].id).not.toBe('track-text-1');
    expect(next.tracks[placed!.trackIndex].name).toBe('Text 2');
  });

  it('reuses the first text track when the time range is free', () => {
    const next = addClipToTextTrack(textTrackProject(), overlayClip('clip-text-2', 5));
    expect(next.tracks).toHaveLength(2);
    expect(findClip(next, 'clip-text-2')?.trackIndex).toBe(1);
    expect(next.tracks[1].clips).toHaveLength(2);
  });

  it('creates a text track when the project has none', () => {
    const next = addClipToTextTrack(SAMPLE_PROJECT, overlayClip('clip-text-9', 0));
    expect(next.tracks).toHaveLength(3);
    expect(next.tracks[2].kind).toBe('text');
    expect(next.tracks[2].name).toBe('Text 1');
    expect(findClip(next, 'clip-text-9')?.trackIndex).toBe(2);
  });

  it('skips a locked text track when placing', () => {
    const p = textTrackProject();
    p.tracks[1].locked = true;
    const next = addClipToTextTrack(p, overlayClip('clip-text-2', 5));
    expect(next.tracks).toHaveLength(3);
    expect(findClip(next, 'clip-text-2')?.trackIndex).toBe(2);
  });
});
