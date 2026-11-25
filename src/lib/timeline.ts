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

/** One frame at the project frame rate (seconds). */
export function frameDuration(fps: number): number {
  return 1 / Math.max(1, fps);
}

/** Quantize a time to the nearest frame boundary (CapCut Web snaps
 * frame-level; its ruler and timecode are frame-based). */
export function snapToFrame(t: number, fps: number): number {
  return Math.max(0, Math.round(t * Math.max(1, fps)) / Math.max(1, fps));
}

/**
 * Timeline snapping (CapCut Web: frame-level + "Attach" magnet toggle,
 * on by default). With Attach on, a time within 0.25s of a clip edge,
 * the playhead, a marker or 0 snaps to that target; otherwise it
 * quantizes to the nearest frame. With Attach off, the time passes
 * through unchanged.
 */
export function snapTime(t: number, project: VidoraProject, magnetic: boolean, playhead: number): number {
  if (!magnetic) return Math.max(0, t);
  const fps = project.fps ?? 30;
  const candidates: number[] = [0, playhead, ...project.markers.map((m) => m.time)];
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      candidates.push(clip.start, clip.start + clip.duration);
    }
  }
  let best = t;
  let bestDist = 0.25;
  for (const c of candidates) {
    const d = Math.abs(c - t);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  if (best !== t) return Math.max(0, best);
  return snapToFrame(t, fps);
}

/** Every clip id on every track, in track order (Ctrl+A selects all). */
export function allClipIds(project: VidoraProject): string[] {
  const ids: string[] = [];
  for (const track of project.tracks) {
    for (const clip of track.clips) ids.push(clip.id);
  }
  return ids;
}

/** Speed that yields a target timeline duration for a source clip,
 * clamped the way CapCut clamps typed speeds (0.05→0.10x, 200→100x). */
export function speedForDuration(sourceDuration: number, targetDuration: number): number {
  if (targetDuration <= 0) return 100;
  return clampSpeed(sourceDuration / targetDuration);
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

/**
 * Place an overlay clip (text / sticker / shape / drawing) on a text track.
 * Picks the first unlocked text track where the clip's time range does not
 * overlap an existing clip; otherwise opens a new text track. (BUG-P3-001:
 * every overlay clip used to land on the first text track at the playhead,
 * so clips added at the same time stacked on top of each other and the
 * covered ones could not be clicked to select. CapCut puts overlays on
 * their own tracks.)
 */
export function addClipToTextTrack(project: VidoraProject, clip: Clip): VidoraProject {
  const start = clip.start;
  const end = start + clip.duration;
  const overlaps = (t: { clips: Clip[] }) =>
    t.clips.some((c) => c.start < end && start < c.start + c.duration);
  let track = project.tracks.find((t) => t.kind === 'text' && !t.locked && !overlaps(t));
  let tracks = project.tracks;
  if (!track) {
    track = {
      clips: [],
      hidden: false,
      id: newId('track'),
      kind: 'text',
      locked: false,
      muted: false,
      name: `Text ${tracks.filter((t) => t.kind === 'text').length + 1}`,
      solo: false,
      volume: 1,
    };
    tracks = [...tracks, track];
  }
  const placed = { ...clip, trackId: track.id };
  return { ...project, tracks: tracks.map((t) => (t.id === track!.id ? { ...t, clips: [...t.clips, placed] } : t)) };
}

/**
 * v1.0.2 (W4, D15): sticker / shape / background / drawing clips go on a
 * 'sticker' track ("Stickers N"), never on a text track — same placement
 * rule as addClipToTextTrack. (Templates already did this in
 * lib/templates.ts; manual adds piled onto "Text 1" and showed up there
 * as a bare initial, e.g. a sticker named "S.".) */
export function addClipToStickerTrack(project: VidoraProject, clip: Clip): VidoraProject {
  const start = clip.start;
  const end = start + clip.duration;
  const overlaps = (t: { clips: Clip[] }) =>
    t.clips.some((c) => c.start < end && start < c.start + c.duration);
  let track = project.tracks.find((t) => t.kind === 'sticker' && !t.locked && !overlaps(t));
  let tracks = project.tracks;
  if (!track) {
    track = {
      clips: [],
      hidden: false,
      id: newId('track'),
      kind: 'sticker',
      locked: false,
      muted: false,
      name: `Stickers ${tracks.filter((t) => t.kind === 'sticker').length + 1}`,
      solo: false,
      volume: 1,
    };
    tracks = [...tracks, track];
  }
  const placed = { ...clip, trackId: track.id };
  return { ...project, tracks: tracks.map((t) => (t.id === track!.id ? { ...t, clips: [...t.clips, placed] } : t)) };
}

/**
 * Phase 4 (J) — append a clip to the first unlocked audio track where its
 * time range is free, else open a new audio track (same placement rule
 * as addClipToTextTrack, for audio clips).
 */
export function addClipToAudioTrack(project: VidoraProject, clip: Clip): VidoraProject {
  const start = clip.start;
  const end = start + clip.duration;
  const overlaps = (t: { clips: Clip[] }) =>
    t.clips.some((c) => c.start < end && start < c.start + c.duration);
  let track = project.tracks.find((t) => t.kind === 'audio' && !t.locked && !overlaps(t));
  let tracks = project.tracks;
  if (!track) {
    track = {
      clips: [],
      hidden: false,
      id: newId('track'),
      kind: 'audio',
      locked: false,
      muted: false,
      name: `Audio ${tracks.filter((t) => t.kind === 'audio').length + 1}`,
      solo: false,
      volume: 1,
    };
    tracks = [...tracks, track];
  }
  const placed = { ...clip, trackId: track.id };
  return { ...project, tracks: tracks.map((t) => (t.id === track!.id ? { ...t, clips: [...t.clips, placed] } : t)) };
}

/**
 * Phase 6 (O) — append a video/image clip to the first unlocked video
 * track where its time range is free, else open a new video track (same
 * placement rule as addClipToAudioTrack, for video clips). AI clips and
 * images land at the playhead so a frame/sticker overlay sits over the
 * video under the playhead.
 */
export function addClipToVideoTrack(project: VidoraProject, clip: Clip): VidoraProject {
  const start = clip.start;
  const end = start + clip.duration;
  const overlaps = (t: { clips: Clip[] }) =>
    t.clips.some((c) => c.start < end && start < c.start + c.duration);
  let track = project.tracks.find((t) => t.kind === 'video' && !t.locked && !overlaps(t));
  let tracks = project.tracks;
  if (!track) {
    track = {
      clips: [],
      hidden: false,
      id: newId('track'),
      kind: 'video',
      locked: false,
      muted: false,
      name: `Video ${tracks.filter((t) => t.kind === 'video').length + 1}`,
      solo: false,
      volume: 1,
    };
    tracks = [...tracks, track];
  }
  const placed = { ...clip, trackId: track.id };
  return { ...project, tracks: tracks.map((t) => (t.id === track!.id ? { ...t, clips: [...t.clips, placed] } : t)) };
}

/**
 * Phase 4 (J-DETACH) — separate a video clip's audio onto its own audio
 * clip. Returns null when the clip is not a video clip, has no audio
 * (no media), or its audio was already separated. The new audio clip
 * copies start/duration/sourceStart/speed/volume and links back via
 * linkedClipId; the video clip is muted and marked audioDetached so its
 * sound does not play twice. One call = one undo step (store commits it).
 */
export function detachAudio(
  project: VidoraProject,
  clipId: string,
): { project: VidoraProject; audioClipId: string } | null {
  const found = findClip(project, clipId);
  if (!found) return null;
  const { clip } = found;
  if (clip.type !== 'video') return null;
  if (clip.audioDetached) return null;
  if (!clip.mediaId && !clip.src) return null;
  const audioClip: Clip = {
    ...clip,
    audioRole: 'voice',
    id: newId('clip'),
    linkedClipId: clip.id,
    name: `${clip.name} (audio)`,
    type: 'audio',
  };
  let next = updateClip(project, clipId, { audioDetached: true, muted: true });
  next = addClipToAudioTrack(next, audioClip);
  return { audioClipId: audioClip.id, project: next };
}

/**
 * Phase 4 (J-BEAT) — split one clip at several absolute times (ascending).
 * Times within 0.1 s of a clip edge are skipped. Returns the new project
 * (unchanged when nothing could be split).
 */
export function splitClipAtTimes(project: VidoraProject, clipId: string, times: number[]): VidoraProject {
  let next = project;
  let currentId = clipId;
  for (const at of [...times].sort((a, b) => a - b)) {
    const found = findClip(next, currentId);
    if (!found) break;
    const { clip } = found;
    if (at <= clip.start + 0.1 || at >= clip.start + clip.duration - 0.1) continue;
    const split = splitClipAt(next, currentId, at);
    if (!split) continue;
    next = split;
    // The right-hand segment starts exactly at `at`.
    const track = next.tracks[found.trackIndex];
    const right = track?.clips.find((c) => c.id !== currentId && Math.abs(c.start - at) < 0.001);
    if (!right) break;
    currentId = right.id;
  }
  return next;
}
