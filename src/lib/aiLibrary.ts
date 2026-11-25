/**
 * AI library catalog (Phase 6, Section O).
 * Runtime source of truth is `assets/ai-manifest.json`, written by
 * `python3 generation/render_all.py` (100 AI tracks, 100 AI SFX,
 * 100 AI clips, 110 AI images — all Vidora Originals, CC0).
 * Media files live in `public/ai-library/` and ship in the Drive release
 * zip; a text-only checkout has the catalog but not the files, so every
 * entry is checked for availability before use and music falls back to
 * in-browser Web Audio rendering of the same pattern (audio.ts).
 */
import aiManifest from '../../assets/ai-manifest.json' with { type: 'json' };
import { ORIGINAL_SFX, renderAiTrack, type AiTrackPattern, type RenderedOriginal } from './audio';
import type { MediaItem } from '../schema/project';

export interface AiMusicEntry {
  bpm: number;
  duration: number;
  file: string;
  id: string;
  key: string;
  loopable: boolean;
  mood: string;
  name: string;
  pattern: AiTrackPattern;
  peak: number;
  peaks: number[];
  rms: number;
  seed: number;
  size: number;
  style: string;
  tags: string[];
}

export interface AiSfxEntry {
  duration: number;
  family: string;
  file: string;
  id: string;
  name: string;
  peaks: number[];
  rms: number;
  seed: number;
  size: number;
  tags: string[];
}

export interface AiClipEntry {
  duration: number;
  file: string;
  fps: number;
  height: number;
  id: string;
  motion: string;
  name: string;
  poster: string;
  scene: string;
  seed: number;
  size: number;
  tags: string[];
  width: number;
}

export interface AiImageEntry {
  design: string;
  file: string;
  height: number;
  id: string;
  kind: 'frame' | 'sticker' | 'texture';
  name: string;
  seed: number;
  size: number;
  tags: string[];
  width: number;
}

export interface AiManifest {
  counts: { clips: number; images: number; music: number; sfx: number };
  entries: {
    clips: AiClipEntry[];
    images: AiImageEntry[];
    music: AiMusicEntry[];
    sfx: AiSfxEntry[];
  };
  generated: string;
  generatedBy: string;
  license: string;
  version: string;
}

const manifest = aiManifest as unknown as AiManifest;

/**
 * Prefix a root-absolute public path with the Vite deploy base
 * (import.meta.env.BASE_URL — '/' locally, '/vidora/' on GitHub Pages).
 * The ai-manifest stores root-absolute paths ('/ai-library/...'); without
 * this the library media 404s under a subpath deploy. Already-relative
 * paths pass through untouched.
 */
export function withBase(path: string): string {
  // import.meta.env exists under Vite/Vitest but is undefined under plain
  // node (e.g. `npm run build:assets`) — optional-chain so the library
  // module loads in both environments; base '/' is correct for node.
  const base = import.meta.env?.BASE_URL ?? '/';
  if (!path.startsWith('/')) return path;
  return `${base}${path.slice(1)}`;
}

const baseEntries = <T extends { file: string; poster?: string }>(entries: T[]): T[] =>
  entries.map((e) => {
    const out = { ...e, file: withBase(e.file) };
    if (e.poster) out.poster = withBase(e.poster);
    return out;
  });

export const AI_MUSIC_TRACKS: AiMusicEntry[] = baseEntries(manifest.entries.music ?? []);
export const AI_SFX: AiSfxEntry[] = baseEntries(manifest.entries.sfx ?? []);
export const AI_CLIPS: AiClipEntry[] = baseEntries(manifest.entries.clips ?? []);
export const AI_IMAGES: AiImageEntry[] = baseEntries(manifest.entries.images ?? []);
export const AI_MANIFEST_VERSION = manifest.version;

export const AI_MUSIC_STYLES: string[] = [...new Set(AI_MUSIC_TRACKS.map((t) => t.style))].sort();
export const AI_CLIP_SCENES: string[] = [...new Set(AI_CLIPS.map((c) => c.scene))].sort();
export const AI_SFX_FAMILIES: string[] = [...new Set(AI_SFX.map((s) => s.family))].sort();

/** Total AI SFX in the library: Phase 6 WAV effects + Phase 5
 * Web Audio effects (src/lib/audio.ts ORIGINAL_SFX). */
export const AI_SFX_TOTAL = AI_SFX.length + ORIGINAL_SFX.length;

/** Probe whether one library file is actually served (HEAD request).
 * False when the file is absent (text-only checkout) or on any error. */
export async function aiFileAvailable(path: string): Promise<boolean> {
  try {
    const res = await fetch(path, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Probe one file per kind to decide whether the full library is
 * installed at all (one HEAD per kind, not one per row). */
export async function aiLibraryInstalled(): Promise<{ clips: boolean; images: boolean; music: boolean; sfx: boolean }> {
  const [music, sfx, clips, images] = await Promise.all([
    AI_MUSIC_TRACKS.length > 0 ? aiFileAvailable(AI_MUSIC_TRACKS[0].file) : Promise.resolve(false),
    AI_SFX.length > 0 ? aiFileAvailable(AI_SFX[0].file) : Promise.resolve(false),
    AI_CLIPS.length > 0 ? aiFileAvailable(AI_CLIPS[0].file) : Promise.resolve(false),
    AI_IMAGES.length > 0 ? aiFileAvailable(AI_IMAGES[0].file) : Promise.resolve(false),
  ]);
  return { clips, images, music, sfx };
}

/** Render an AI track in the browser (fallback when its MP3 is absent,
 * and the engine behind the Generate tab). Returns a WAV RenderedOriginal. */
export async function renderAiTrackEntry(entry: AiMusicEntry): Promise<RenderedOriginal> {
  return renderAiTrack(entry.pattern, entry.bpm, entry.duration, entry.seed);
}

/** Search helper shared by the panel: name/tags/style/scene match. */
export function aiMatches(haystack: string[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystack.some((h) => h.toLowerCase().includes(q));
}

/**
 * Build the project MediaItem for one AI library entry, so the editor
 * panels can add library tracks/clips/images to the timeline with the
 * same add path as imported media (addMediaItem + add*Clip). The src
 * is the served library URL (withBase), never file bytes. CapCut-fix
 * 2026-11-25: this completes the O3 redistribution — the deleted AI
 * Library panel's catalog now lives in the Audio tab (music/SFX) and
 * the Media tab (clips/images), instead of only on the Library page.
 */

function mimeFor(file: string): string {
  if (file.endsWith('.mp3')) return 'audio/mpeg';
  if (file.endsWith('.wav')) return 'audio/wav';
  if (file.endsWith('.mp4')) return 'video/mp4';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

export function aiMusicToMediaItem(entry: AiMusicEntry, id: string): MediaItem {
  return {
    createdAt: new Date().toISOString(),
    duration: entry.duration,
    folderId: 'folder-all',
    id,
    kind: 'audio',
    mime: 'audio/mpeg',
    name: entry.name,
    peakLevel: entry.peak,
    peaks: entry.peaks,
    size: entry.size,
    src: entry.file,
  };
}

export function aiSfxToMediaItem(entry: AiSfxEntry, id: string): MediaItem {
  return {
    createdAt: new Date().toISOString(),
    duration: entry.duration,
    folderId: 'folder-all',
    id,
    kind: 'audio',
    mime: 'audio/mpeg',
    name: entry.name,
    peaks: entry.peaks,
    size: entry.size,
    src: entry.file,
  };
}

export function aiClipToMediaItem(entry: AiClipEntry, id: string): MediaItem {
  return {
    createdAt: new Date().toISOString(),
    duration: entry.duration,
    folderId: 'folder-all',
    height: entry.height,
    id,
    kind: 'video',
    mime: 'video/mp4',
    name: entry.name,
    size: entry.size,
    src: entry.file,
    thumbnail: entry.poster,
    width: entry.width,
  };
}

export function aiImageToMediaItem(entry: AiImageEntry, id: string): MediaItem {
  return {
    createdAt: new Date().toISOString(),
    folderId: 'folder-all',
    height: entry.height,
    id,
    kind: 'image',
    mime: mimeFor(entry.file),
    name: entry.name,
    size: entry.size,
    src: entry.file,
    thumbnail: entry.file,
    width: entry.width,
  };
}
