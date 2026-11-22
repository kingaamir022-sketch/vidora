import { newId, type Clip, type VidoraProject } from '../schema/project';

/** Pure timeline operations (Phase 1, SPEC B + C). All are non-destructive:
 * they return a new project document; source media is never modified. */

export function findClip(project: VidoraProject, clipId: string): { clip: Clip; trackIndex: number; clipIndex: number } | null {
  for (let ti = 0; ti < project.tracks.length; ti += 1) {
    const ci = project.tracks[ti].clips.findIndex((c) => c.id === clipId);
    if (ci >= 0) return { clip: project.tracks[ti].clips[ci], trackIndex: ti, clipIndex: ci };
  }
  return null;
}

export function projectDuration(project: VidoraProject): number {
  let end = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) end = Math.max(end, clip.start + clip.duration);
  }
  return end;
}

/** Timeline duration of a clip at a new speed: sourceDuration / speed. */
export function durationAtSpeed(sourceDuration: number, speed: number): number {
  return sourceDuration / speed;
}

export function clampSpeed(speed: number): number {
  return Math.min(100, Math.max(0.1, speed));
}

export const SPEED_PRESETS = [0.25, 0.5, 1, 1.5, 2, 4, 8] as const;

export function setClipSpeed(project: VidoraProject, clipId: string, speed: number): VidoraProject {
  const s = clampSpeed(speed);
  return updateClip(project, clipId, (clip) => {
    const source = clip.sourceDuration ?? clip.duration * clip.speed;
    return { ...clip, speed: s, duration: durationAtSpeed(source, s), sourceDuration: source };
  });
}

export function updateClip(
  project: VidoraProject,
  clipId: string,
  patch: Partial<Clip> | ((clip: Clip) => Partial<Clip>),
): VidoraProject {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => {
        if (clip.id !== clipId) return clip;
        const p = typeof patch === 'function' ? patch(clip) : patch;
        return { ...clip, ...p };
      }),
    })),
  };
}

/** Split a clip at an absolute time (seconds). Returns null if time is outside the clip. */
export function splitClipAt(project: VidoraProject, clipId: string, at: number): VidoraProject | null {
  const found = findClip(project, clipId);
  if (!found) return null;
  const { clip, trackIndex } = found;
  const offset = at - clip.start;
  if (offset <= 0.01 || offset >= clip.duration - 0.01) return null;
  const left: Clip = { ...clip, duration: offset, sourceDuration: (clip.sourceDuration ?? clip.duration) * (offset / clip.duration) };
  const right: Clip = {
    ...clip,
    id: newId('clip'),
    duration: clip.duration - offset,
    name: `${clip.name} (2)`,
    sourceDuration: (clip.sourceDuration ?? clip.duration) - left.sourceDuration!,
    sourceStart: clip.sourceStart + offset * clip.speed,
    start: at,
  };
  const tracks = project.tracks.map((track, ti) => {
    if (ti !== trackIndex) return track;
    const clips = [...track.clips];
    const idx = clips.findIndex((c) => c.id === clipId);
    clips.splice(idx, 1, left, right);
    return { ...track, clips };
  });
  return { ...project, tracks };
}

/** Trim a clip edge. `edge` start/end, `delta` seconds (positive = shrink from start / extend end). */
export function trimClip(project: VidoraProject, clipId: string, edge: 'start' | 'end', delta: number): VidoraProject | null {
  const found = findClip(project, clipId);
  if (!found) return null;
  const { clip } = found;
  if (edge === 'start') {
    const newStart = clip.start + delta;
    const newDuration = clip.duration - delta;
    if (newDuration < 0.1 || newStart < 0) return null;
    return updateClip(project, clipId, {
      duration: newDuration,
      sourceStart: Math.max(0, clip.sourceStart + delta * clip.speed),
      start: newStart,
    });
  }
  const newDuration = clip.duration + delta;
  if (newDuration < 0.1) return null;
  const sourceCap = clip.sourceDuration ?? clip.duration;
  if (clip.sourceStart + newDuration * clip.speed > sourceCap + clip.sourceStart) {
    // Cannot extend past the source media; clamp to source length.
    const maxDuration = (sourceCap - (clip.sourceStart - 0)) / clip.speed;
    if (maxDuration < 0.1) return null;
    return updateClip(project, clipId, { duration: Math.min(newDuration, maxDuration) });
  }
  return updateClip(project, clipId, { duration: newDuration });
}

export function deleteClip(project: VidoraProject, clipId: string): VidoraProject {
  return {
    ...project,
    tracks: project.tracks.map((t) => ({ ...t, clips: t.clips.filter((c) => c.id !== clipId) })),
  };
}

/** Ripple delete: remove the clip and pull later clips on the same track earlier. */
export function rippleDeleteClip(project: VidoraProject, clipId: string): VidoraProject {
  const found = findClip(project, clipId);
  if (!found) return project;
  const { clip, trackIndex } = found;
  return {
    ...project,
    tracks: project.tracks.map((track, ti) => {
      if (ti !== trackIndex) return track;
      return {
        ...track,
        clips: track.clips
          .filter((c) => c.id !== clipId)
          .map((c) => (c.start > clip.start ? { ...c, start: Math.max(clip.start, c.start - clip.duration) } : c)),
      };
    }),
  };
}

export function duplicateClip(project: VidoraProject, clipId: string): VidoraProject | null {
  const found = findClip(project, clipId);
  if (!found) return null;
  const { clip, trackIndex } = found;
  const copy: Clip = { ...clip, id: newId('clip'), name: `${clip.name} copy`, start: clip.start + clip.duration };
  return {
    ...project,
    tracks: project.tracks.map((t, ti) => (ti === trackIndex ? { ...t, clips: [...t.clips, copy] } : t)),
  };
}

export function moveClip(project: VidoraProject, clipId: string, newStart: number, newTrackId?: string): VidoraProject | null {
  const found = findClip(project, clipId);
  if (!found) return null;
  const { clip } = found;
  const targetTrackId = newTrackId ?? clip.trackId;
  const target = project.tracks.find((t) => t.id === targetTrackId);
  if (!target) return null;
  const moved: Clip = { ...clip, start: Math.max(0, newStart), trackId: targetTrackId };
  return {
    ...project,
    tracks: project.tracks.map((t) => {
      if (t.id === clip.trackId && t.id === targetTrackId) {
        return { ...t, clips: t.clips.map((c) => (c.id === clipId ? moved : c)) };
      }
      if (t.id === clip.trackId) return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
      if (t.id === targetTrackId) return { ...t, clips: [...t.clips, moved] };
      return t;
    }),
  };
}

/** Group clips under one group id (Phase 1 basic grouping). */
export function groupClips(project: VidoraProject, clipIds: string[]): { project: VidoraProject; groupId: string } {
  const groupId = newId('group');
  return {
    groupId,
    project: {
      ...project,
      tracks: project.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (clipIds.includes(c.id) ? { ...c, groupId } : c)),
      })),
    },
  };
}

export function ungroupClips(project: VidoraProject, groupId: string): VidoraProject {
  return {
    ...project,
    tracks: project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => (c.groupId === groupId ? { ...c, groupId: undefined } : c)),
    })),
  };
}

/** Merge clips into a compound clip (basic: one clip referencing its parts by id). */
export function makeCompound(project: VidoraProject, clipIds: string[], name: string): VidoraProject | null {
  const clips = clipIds.map((id) => findClip(project, id)?.clip).filter((c): c is Clip => Boolean(c));
  if (clips.length < 2) return null;
  const first = clips[0];
  const compoundId = newId('compound');
  const compound: Clip = {
    ...first,
    compoundId,
    duration: Math.max(...clips.map((c) => c.start + c.duration)) - first.start,
    id: newId('clip'),
    isCompound: true,
    name,
    start: first.start,
  };
  return {
    ...project,
    tracks: project.tracks.map((t) => ({
      ...t,
      clips: [...t.clips.filter((c) => !clipIds.includes(c.id)), ...(t.id === first.trackId ? [compound] : [])],
    })),
  };
}
