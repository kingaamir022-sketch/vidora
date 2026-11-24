/**
 * Full export engine (Phase 8, Section L — closes BUG-D5).
 *
 * Phase 1 exported by recording the preview canvas in real time with
 * MediaRecorder and NO audio. Phase 8 renders OFFLINE, frame by frame,
 * through the same compositor the preview uses (src/lib/renderFrame.ts),
 * and mixes the full audio (volume, fades, keyframed volume, ducking,
 * mute/solo, master volume, 3-band EQ) through an OfflineAudioContext.
 * Video + audio are muxed with mediabunny (WebCodecs): MP4 (H.264+AAC),
 * MOV (H.264+AAC, QuickTime container), WebM (VP9/VP8+Opus).
 *
 * Honest limits (labelled in the Export panel):
 * - H.265 has no browser encoder — not offered.
 * - MP3 is not offered (no MP3 encoder bundled) — audio-only is WAV.
 * - Voice-changer presets are preview-only (the live shifter has no
 *   offline equivalent); a voice clip exports with its base audio.
 * - Reversed clips are silent in the export, exactly as in the preview
 *   (effectiveClipGain returns 0 for reversed clips).
 * - Live narration (speechSynthesis) has no audio file — render it with
 *   AI Tools → Narration first, or it is silent in the export.
 * - GIF is 10 fps, max 320 px wide, no audio, first 30 s only.
 * - 4K renders a 3840×2160 canvas — slow on long projects; the panel warns.
 */

import {
  AudioBufferSource,
  BufferTarget,
  CanvasSource,
  MovOutputFormat,
  Mp4OutputFormat,
  Output,
  WebMOutputFormat,
  canEncodeAudio,
  canEncodeVideo,
} from 'mediabunny';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { createRenderPool, disposeRenderPool, renderTimelineFrame } from './renderFrame';
import { effectiveClipGainForProject, encodeWav } from './audio';
import { projectDuration } from './timeline';
import type { Clip, VidoraProject } from '../schema/project';

export type ExportResolution = 360 | 480 | 720 | 1080 | 1440 | 2160;
export type ExportFps = 24 | 25 | 30 | 50 | 60;
export type ExportQuality = 'fast' | 'recommended' | 'high';
export type ExportFormat = 'mp4' | 'webm' | 'mov';
export type ExportKind = 'video' | 'audio' | 'gif' | 'frames' | 'cover';

export const EXPORT_RESOLUTIONS: ExportResolution[] = [360, 480, 720, 1080, 1440, 2160];
export const EXPORT_FPS: ExportFps[] = [24, 25, 30, 50, 60];
export const EXPORT_FORMATS: ExportFormat[] = ['mp4', 'webm', 'mov'];

export interface ExportOptions {
  coverTime?: number;
  fileName?: string;
  format: ExportFormat;
  fps: ExportFps;
  gifWidth?: 160 | 240 | 320;
  includeAudio: boolean;
  kind: ExportKind;
  quality: ExportQuality;
  resolution: ExportResolution;
}

export function defaultExportOptions(): ExportOptions {
  return { format: 'mp4', fps: 30, gifWidth: 320, includeAudio: true, kind: 'video', quality: 'recommended', resolution: 720 };
}

/** Output size for a resolution, honouring the project's aspect ratio. */
export function exportSizeFor(project: VidoraProject, resolution: ExportResolution): { height: number; width: number } {
  const r = project.resolution;
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  const landscape = r.width >= r.height;
  if (landscape) {
    const h = resolution;
    const w = Math.round((h * r.width) / r.height);
    return { height: even(h), width: even(w) };
  }
  const w = resolution;
  const h = Math.round((w * r.height) / r.width);
  return { height: even(h), width: even(w) };
}

/** Video bitrate (bps) per quality tier and resolution — CapCut's three
 * quality tiers mapped to concrete numbers. */
export function qualityBitrate(quality: ExportQuality, resolution: ExportResolution): number {
  const table: Record<ExportResolution, number> = {
    360: 1_200_000,
    480: 2_500_000,
    720: 5_000_000,
    1080: 8_000_000,
    1440: 16_000_000,
    2160: 32_000_000,
  };
  const base = table[resolution];
  if (quality === 'fast') return Math.round(base * 0.5);
  if (quality === 'high') return Math.round(base * 1.6);
  return base;
}

export const EXPORT_AUDIO_BITRATE = 128_000;

/** Rough file-size estimate (bytes) — labelled "estimate" in the UI. */
export function estimateFileSizeBytes(duration: number, options: ExportOptions): number {
  const video = qualityBitrate(options.quality, options.resolution) * duration;
  const audio = options.includeAudio ? EXPORT_AUDIO_BITRATE * duration : 0;
  return Math.round((video + audio) / 8);
}

export function exportFileName(projectName: string, ext: string): string {
  const safe = projectName.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'vidora-export';
  return `${safe}.${ext}`;
}

export function formatBytesShort(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export interface ExportCapabilities {
  aac: boolean;
  h264: boolean;
  mediaRecorder: boolean;
  notes: string[];
  opus: boolean;
  videoEncoder: boolean;
  vp8: boolean;
  vp9: boolean;
}

/** Probe what this browser can actually encode. Never assumes. */
export async function probeExportCapabilities(): Promise<ExportCapabilities> {
  const notes: string[] = [];
  const videoEncoder = typeof VideoEncoder !== 'undefined';
  const audioEncoder = typeof AudioEncoder !== 'undefined';
  let h264 = false;
  let vp9 = false;
  let vp8 = false;
  let aac = false;
  let opus = false;
  if (videoEncoder) {
    try { h264 = await canEncodeVideo('avc'); } catch { h264 = false; }
    try { vp9 = await canEncodeVideo('vp9'); } catch { vp9 = false; }
    try { vp8 = await canEncodeVideo('vp8'); } catch { vp8 = false; }
  }
  if (audioEncoder) {
    try { aac = await canEncodeAudio('aac'); } catch { aac = false; }
    try { opus = await canEncodeAudio('opus'); } catch { opus = false; }
  }
  if (!videoEncoder) notes.push('This browser has no WebCodecs VideoEncoder — video export is unavailable here.');
  if (videoEncoder && !h264 && !vp9 && !vp8) notes.push('No video codec is encodable in this browser.');
  if (!h264) notes.push('H.264 is not available here — MP4/MOV need it, so WebM is offered instead.');
  if (h264 && !vp9) notes.push('VP9 is not available here — WebM falls back to VP8.');
  if (!aac) notes.push('AAC is not available here — MP4/MOV audio falls back to no audio track (video only).');
  if (!opus) notes.push('Opus is not available here — WebM exports without an audio track.');
  return { aac, h264, mediaRecorder: typeof MediaRecorder !== 'undefined', notes, opus, videoEncoder, vp8, vp9 };
}

export interface ExportPlan {
  audioCodec: 'aac' | 'opus' | null;
  audioNote: string | null;
  format: ExportFormat;
  videoCodec: 'avc' | 'vp9' | 'vp8' | null;
  videoNote: string | null;
}

/** Pick the real codecs for a format, given the capabilities. Returns
 * null videoCodec when the format cannot be produced here. */
export function resolveExportPlan(format: ExportFormat, caps: ExportCapabilities): ExportPlan {
  if (format === 'mp4' || format === 'mov') {
    if (!caps.h264) return { audioCodec: null, audioNote: 'H.264 is not available in this browser, so MP4/MOV cannot be made here.', format, videoCodec: null, videoNote: 'H.264 is not available in this browser.' };
    return { audioCodec: caps.aac ? 'aac' : null, audioNote: caps.aac ? null : 'AAC is not available — this file will have no audio track.', format, videoCodec: 'avc', videoNote: null };
  }
  const videoCodec = caps.vp9 ? 'vp9' : caps.vp8 ? 'vp8' : null;
  return {
    audioCodec: caps.opus ? 'opus' : null,
    audioNote: caps.opus ? null : 'Opus is not available — this file will have no audio track.',
    format,
    videoCodec,
    videoNote: videoCodec ? (caps.vp9 ? null : 'VP9 is not available — VP8 is used instead.') : 'No VP8/VP9 encoder is available in this browser.',
  };
}

export type ExportStep = 'frames' | 'audio' | 'muxing' | 'finishing';
export interface ExportProgress {
  done: number;
  step: ExportStep;
  total: number;
}
export type ExportProgressFn = (p: ExportProgress) => void;

export interface ExportResult {
  blob: Blob;
  fileName: string;
  frameCount: number;
  warnings: string[];
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`Could not capture a ${type} frame.`))), type, quality);
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const e = new Error('Export cancelled.');
    e.name = 'AbortError';
    throw e;
  }
}

interface MixSource {
  buffer: AudioBuffer;
  clip: Clip;
  gainCurve: Float32Array;
  sampleRate: number;
  sourceDuration: number;
  sourceStart: number;
  speed: number;
}

/** Build the full audio mix offline (48 kHz stereo): every sounding
 * clip (audio tracks + video clips' embedded audio) with volume, fades,
 * keyframed volume, ducking, mute/solo, master volume and 3-band EQ.
 * Returns null when the project has no sounding audio at all. */
export async function buildAudioMix(
  project: VidoraProject,
  duration: number,
  onProgress?: ExportProgressFn,
): Promise<AudioBuffer | null> {
  const sampleRate = 48_000;
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(duration * sampleRate)), sampleRate);
  const sources: MixSource[] = [];
  const decodeCache = new Map<string, AudioBuffer>();

  const decode = async (src: string): Promise<AudioBuffer | null> => {
    const hit = decodeCache.get(src);
    if (hit) return hit;
    try {
      const res = await fetch(src);
      const ab = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab);
      decodeCache.set(src, buf);
      return buf;
    } catch {
      return null;
    }
  };

  // Sample the effective gain (fades, keyframes, ducking, mute/solo,
  // master) at 20 Hz — the same function the preview uses per tick.
  const gainCurveFor = (clip: Clip, track: { hidden: boolean; muted: boolean; solo: boolean; volume: number }): Float32Array => {
    const n = Math.max(1, Math.ceil(clip.duration * 20));
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const t = clip.start + (i / 20);
      curve[i] = effectiveClipGainForProject(clip, track as never, project, Math.min(t, clip.start + clip.duration - 0.001));
    }
    return curve;
  };

  for (const track of project.tracks) {
    if (track.hidden) continue;
    for (const clip of track.clips) {
      if (!clip.src) continue;
      if (clip.frozen) continue;
      if (clip.reversed) continue; // Silent in preview too — keep parity.
      if (clip.muted) continue;
      const isAudio = track.kind === 'audio';
      const isVideoAudio = track.kind === 'video' && clip.type === 'video';
      if (!isAudio && !isVideoAudio) continue;
      const buffer = await decode(clip.src);
      if (!buffer) continue;
      const curve = gainCurveFor(clip, track);
      const audible = curve.some((g) => g > 0.001);
      if (!audible) continue;
      sources.push({ buffer, clip, gainCurve: curve, sampleRate, sourceDuration: clip.sourceDuration ?? clip.duration, sourceStart: clip.sourceStart, speed: clip.speed });
    }
  }

  if (sources.length === 0) return null;

  for (const [i, s] of sources.entries()) {
    onProgress?.({ done: i, step: 'audio', total: sources.length });
    const src = ctx.createBufferSource();
    src.buffer = s.buffer;
    src.playbackRate.value = s.speed;
    // Source window: the clip plays sourceStart..sourceStart+duration/speed.
    const offset = Math.min(Math.max(0, s.sourceStart), Math.max(0, s.buffer.duration - 0.01));
    const playDur = Math.min(s.clip.duration / s.speed, Math.max(0, s.buffer.duration - offset));
    if (playDur <= 0) continue;
    let node: AudioNode = src;
    // 3-band EQ (same bands as the live engine: 200 Hz shelf, 1 kHz peak, 4 kHz shelf).
    const eq = s.clip.eq;
    if (eq.low !== 0 || eq.mid !== 0 || eq.high !== 0) {
      const low = ctx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 200;
      low.gain.value = eq.low;
      const mid = ctx.createBiquadFilter();
      mid.type = 'peaking';
      mid.frequency.value = 1000;
      mid.Q.value = 1;
      mid.gain.value = eq.mid;
      const high = ctx.createBiquadFilter();
      high.type = 'highshelf';
      high.frequency.value = 4000;
      high.gain.value = eq.high;
      node.connect(low);
      low.connect(mid);
      mid.connect(high);
      node = high;
    }
    // Rumble filter for the noise-reduction switch (honest label: it only
    // removes low rumble, as in the preview).
    if (s.clip.noiseReduction) {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 120;
      node.connect(hp);
      node = hp;
    }
    const gain = ctx.createGain();
    // 20 Hz gain curve, starting at the clip's timeline start.
    gain.gain.setValueCurveAtTime(s.gainCurve, s.clip.start, Math.max(0.05, s.gainCurve.length / 20));
    node.connect(gain);
    gain.connect(ctx.destination);
    src.start(s.clip.start, offset, playDur);
  }

  onProgress?.({ done: sources.length, step: 'audio', total: sources.length });
  return ctx.startRendering();
}

/** Warning for clips that had no media for a real share of the export.
 * A clip skipped on a frame or two (e.g. while its video element was
 * still loading) is not worth warning about — only clips missing for
 * more than 10% of frames, which is what "rendered as a label" means. */
function skipWarnings(counts: Map<string, number>, total: number, suffix: string): string[] {
  const bad = [...counts.entries()].filter(([, n]) => n > Math.max(1, total * 0.1)).map(([name]) => name);
  return bad.length > 0 ? [`${bad.join(', ')} had no media loaded in this session and rendered as a label${suffix}.`] : [];
}

/** Render one timeline frame into `canvas` at `time` (shared compositor). */
export async function renderExportFrame(
  canvas: HTMLCanvasElement,
  project: VidoraProject,
  time: number,
  fps: number,
  pool: ReturnType<typeof createRenderPool>,
): Promise<string[]> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Export canvas has no 2D context.');
  const report = await renderTimelineFrame(ctx, project, time, canvas.width, canvas.height, fps, pool, {
    maxWidth: canvas.width,
    showBadges: false,
  });
  return report.skippedClips;
}

/**
 * Full video export (MP4/WebM/MOV) with the audio mix. Renders offline,
 * frame by frame — not realtime. Throws AbortError on cancel.
 */
export async function exportVideo(
  project: VidoraProject,
  options: ExportOptions,
  caps: ExportCapabilities,
  onProgress?: ExportProgressFn,
  signal?: AbortSignal,
): Promise<ExportResult> {
  const duration = projectDuration(project);
  if (duration <= 0) throw new Error('Project is empty and cannot be exported.');
  const plan = resolveExportPlan(options.format, caps);
  if (!plan.videoCodec) throw new Error(plan.videoNote ?? 'This format cannot be produced in this browser.');
  const size = exportSizeFor(project, options.resolution);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const pool = createRenderPool();
  // Background image for the primary clip (blur backdrop needs it).
  const warnings: string[] = [];
  try {
    const format = options.format === 'mov' ? new MovOutputFormat() : options.format === 'webm' ? new WebMOutputFormat() : new Mp4OutputFormat();
    const target = new BufferTarget();
    const output = new Output({ format, target });
    const videoSource = new CanvasSource(canvas, {
      bitrate: qualityBitrate(options.quality, options.resolution),
      codec: plan.videoCodec,
    });
    output.addVideoTrack(videoSource);
    // Build the audio mix first (it can fail fast on undecodable media).
    let mix: AudioBuffer | null = null;
    let audioSource: AudioBufferSource | null = null;
    if (options.includeAudio && plan.audioCodec) {
      mix = await buildAudioMix(project, duration, onProgress);
      if (mix) {
        audioSource = new AudioBufferSource({ bitrate: EXPORT_AUDIO_BITRATE, codec: plan.audioCodec });
        output.addAudioTrack(audioSource);
      } else {
        warnings.push('No audio in this project — the file has no audio track.');
      }
    } else if (options.includeAudio && !plan.audioCodec) {
      warnings.push(plan.audioNote ?? 'No audio encoder is available — the file has no audio track.');
    }
    await output.start();
    if (audioSource && mix) {
      await audioSource.add(mix);
    }
    const total = Math.max(1, Math.ceil(duration * options.fps));
    const skipped = new Map<string, number>();
    for (let i = 0; i < total; i += 1) {
      throwIfAborted(signal);
      const t = Math.min(i / options.fps, duration - 0.001);
      const names = await renderExportFrame(canvas, project, t, options.fps, pool);
      for (const n of names) skipped.set(n, (skipped.get(n) ?? 0) + 1);
      await videoSource.add(t, 1 / options.fps);
      if (i % 5 === 0 || i === total - 1) onProgress?.({ done: i + 1, step: 'frames', total });
    }
    warnings.push(...skipWarnings(skipped, total, ''));
    onProgress?.({ done: total, step: 'muxing', total });
    await output.finalize();
    const buf = target.buffer;
    if (!buf) throw new Error('The encoder produced no file.');
    const ext = options.format === 'mov' ? 'mov' : options.format === 'webm' ? 'webm' : 'mp4';
    const mime = options.format === 'webm' ? 'video/webm' : options.format === 'mov' ? 'video/quicktime' : 'video/mp4';
    return {
      blob: new Blob([buf], { type: mime }),
      fileName: exportFileName(project.name, ext),
      frameCount: total,
      warnings,
    };
  } finally {
    disposeRenderPool(pool);
  }
}

/** Audio-only export: the full mix as 48 kHz 16-bit stereo WAV. */
export async function exportAudioWav(
  project: VidoraProject,
  onProgress?: ExportProgressFn,
): Promise<ExportResult> {
  const duration = projectDuration(project);
  if (duration <= 0) throw new Error('Project is empty and cannot be exported.');
  const mix = await buildAudioMix(project, duration, onProgress);
  if (!mix) throw new Error('This project has no audio to export.');
  const interleaved = new Float32Array(mix.length * 2);
  const left = mix.getChannelData(0);
  const right = mix.numberOfChannels > 1 ? mix.getChannelData(1) : left;
  for (let i = 0; i < mix.length; i += 1) {
    interleaved[i * 2] = left[i];
    interleaved[i * 2 + 1] = right[i];
  }
  const blob = encodeWav(interleaved, mix.sampleRate, 2); // interleaved stereo
  return { blob, fileName: exportFileName(project.name, 'wav'), frameCount: 0, warnings: [] };
}

/** Animated GIF export: 10 fps, max 320 px wide, first 30 s only, no audio. */
export async function exportGif(
  project: VidoraProject,
  options: ExportOptions,
  onProgress?: ExportProgressFn,
  signal?: AbortSignal,
): Promise<ExportResult> {
  const duration = projectDuration(project);
  if (duration <= 0) throw new Error('Project is empty and cannot be exported.');
  const gifFps = 10;
  const gifDuration = Math.min(duration, 30);
  const size = exportSizeFor(project, options.resolution);
  const scale = Math.min(1, (options.gifWidth ?? 320) / size.width);
  const w = Math.max(16, Math.round(size.width * scale));
  const h = Math.max(16, Math.round(size.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Export canvas has no 2D context.');
  const pool = createRenderPool();
  const encoder = GIFEncoder();
  const total = Math.max(1, Math.ceil(gifDuration * gifFps));
  const warnings: string[] = [];
  if (duration > 30) warnings.push('GIF export is limited to the first 30 seconds.');
  warnings.push('GIF has no audio and runs at 10 fps.');
  try {
    const skipped = new Map<string, number>();
    for (let i = 0; i < total; i += 1) {
      throwIfAborted(signal);
      const t = Math.min(i / gifFps, duration - 0.001);
      const names = await renderExportFrame(canvas, project, t, gifFps, pool);
      for (const n of names) skipped.set(n, (skipped.get(n) ?? 0) + 1);
      const data = ctx.getImageData(0, 0, w, h);
      const rgba = new Uint8Array(data.data);
      const palette = quantize(rgba, 256);
      const index = applyPalette(rgba, palette);
      encoder.writeFrame(index, w, h, { delay: 100, palette });
      if (i % 10 === 0 || i === total - 1) onProgress?.({ done: i + 1, step: 'frames', total });
    }
    warnings.push(...skipWarnings(skipped, total, ''));
    encoder.finish();
    const bytes = encoder.bytes();
    return { blob: new Blob([bytes.slice()], { type: 'image/gif' }), fileName: exportFileName(project.name, 'gif'), frameCount: total, warnings };
  } finally {
    disposeRenderPool(pool);
  }
}

/** Image sequence: one PNG per frame at the export fps. Returns the blobs
 * (the caller downloads them one by one — browsers cannot zip here). */
export async function exportFrames(
  project: VidoraProject,
  options: ExportOptions,
  onProgress?: ExportProgressFn,
  signal?: AbortSignal,
): Promise<{ blobs: Blob[]; fileNames: string[]; warnings: string[] }> {
  const duration = projectDuration(project);
  if (duration <= 0) throw new Error('Project is empty and cannot be exported.');
  const size = exportSizeFor(project, options.resolution);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const pool = createRenderPool();
  const total = Math.max(1, Math.ceil(duration * options.fps));
  const blobs: Blob[] = [];
  const fileNames: string[] = [];
  const warnings: string[] = [];
  const base = exportFileName(project.name, '').replace(/\.+$/, '');
  try {
    const skipped = new Map<string, number>();
    for (let i = 0; i < total; i += 1) {
      throwIfAborted(signal);
      const t = Math.min(i / options.fps, duration - 0.001);
      const names = await renderExportFrame(canvas, project, t, options.fps, pool);
      for (const n of names) skipped.set(n, (skipped.get(n) ?? 0) + 1);
      blobs.push(await canvasToBlob(canvas, 'image/png'));
      fileNames.push(`${base}-frame-${String(i + 1).padStart(4, '0')}.png`);
      if (i % 10 === 0 || i === total - 1) onProgress?.({ done: i + 1, step: 'frames', total });
    }
    warnings.push(...skipWarnings(skipped, total, ''));
    return { blobs, fileNames, warnings };
  } finally {
    disposeRenderPool(pool);
  }
}

/** Cover frame: one PNG of the frame at `time` (default 0). */
export async function exportCoverFrame(project: VidoraProject, options: ExportOptions): Promise<ExportResult> {
  const duration = projectDuration(project);
  if (duration <= 0) throw new Error('Project is empty and cannot be exported.');
  const t = Math.min(Math.max(0, options.coverTime ?? 0), duration - 0.001);
  const size = exportSizeFor(project, options.resolution);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const pool = createRenderPool();
  try {
    await renderExportFrame(canvas, project, t, options.fps, pool);
    const blob = await canvasToBlob(canvas, 'image/png');
    return { blob, fileName: exportFileName(project.name, 'png'), frameCount: 1, warnings: [] };
  } finally {
    disposeRenderPool(pool);
  }
}

/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
