import { newId, type MediaItem, type MediaKind } from '../schema/project';

/** Media import helpers (Phase 1, SPEC A). Probes real metadata from File objects. */

export function kindForFile(file: File): MediaKind | null {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'image/gif') return 'gif';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (/\.gif$/i.test(file.name)) return 'gif';
  if (/\.(mp4|mov|webm|mkv|avi)$/i.test(file.name)) return 'video';
  if (/\.(png|jpe?g|webp|bmp|svg)$/i.test(file.name)) return 'image';
  if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(file.name)) return 'audio';
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function probeVideo(url: string): Promise<{ duration?: number; width?: number; height?: number; thumbnail?: string }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = url;
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : undefined;
      const width = video.videoWidth || undefined;
      const height = video.videoHeight || undefined;
      video.currentTime = Math.min(0.5, (duration ?? 1) / 4);
      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = Math.max(1, Math.round((160 * (height ?? 90)) / (width ?? 160)));
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve({ duration, height, thumbnail: canvas.toDataURL('image/jpeg', 0.7), width });
        } catch {
          resolve({ duration, height, width });
        }
      };
      video.onerror = () => resolve({ duration, height, width });
    };
    video.onerror = () => resolve({});
    window.setTimeout(() => resolve({}), 5000);
  });
}

function probeImage(url: string): Promise<{ width?: number; height?: number; thumbnail?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = Math.max(1, Math.round((160 * img.naturalHeight) / img.naturalWidth));
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ height: img.naturalHeight, thumbnail: canvas.toDataURL('image/jpeg', 0.7), width: img.naturalWidth });
      } catch {
        resolve({ height: img.naturalHeight, width: img.naturalWidth });
      }
    };
    img.onerror = () => resolve({});
    img.src = url;
  });
}

/** Downsample raw PCM samples to `count` normalised peak buckets (0–1). Pure: unit-tested. */
export function peaksFromSamples(samples: ArrayLike<number>, count = 64): number[] {
  if (count <= 0) return [];
  const n = samples.length;
  if (n === 0) return Array.from({ length: count }, () => 0);
  const out: number[] = [];
  const per = n / count;
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * per);
    const end = Math.max(start + 1, Math.floor((i + 1) * per));
    let peak = 0;
    for (let j = start; j < end && j < n; j++) {
      const v = Math.abs(samples[j]);
      if (v > peak) peak = v;
    }
    out.push(Math.min(1, peak));
  }
  return out;
}

/** Decode an audio file and return its waveform peaks (64 buckets) and absolute peak level. Never throws. */
async function probeAudioPeaks(url: string): Promise<{ peakLevel?: number; peaks?: number[] }> {
  try {
    const Ctor =
      typeof window !== 'undefined'
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!Ctor) return {};
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const ctx = new Ctor();
    try {
      const decoded = await ctx.decodeAudioData(buf);
      const data = decoded.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < data.length; i += 1) peak = Math.max(peak, Math.abs(data[i]));
      return { peakLevel: peak, peaks: peaksFromSamples(data, 64) };
    } finally {
      await ctx.close().catch(() => undefined);
    }
  } catch {
    return {};
  }
}

function probeAudio(url: string): Promise<{ duration?: number }> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = url;
    audio.onloadedmetadata = () => resolve({ duration: Number.isFinite(audio.duration) ? audio.duration : undefined });
    audio.onerror = () => resolve({});
    window.setTimeout(() => resolve({}), 5000);
  });
}

/** Build a MediaItem from a File, probing duration/dimensions/thumbnail where possible. */
export async function importFile(file: File, folderId = 'folder-all'): Promise<MediaItem | null> {
  const kind = kindForFile(file);
  if (!kind) return null;
  const src = URL.createObjectURL(file);
  const base: Omit<MediaItem, 'duration' | 'height' | 'thumbnail' | 'width'> & Partial<MediaItem> = {
    createdAt: new Date().toISOString(),
    folderId,
    id: newId('media'),
    kind,
    mime: file.type || 'application/octet-stream',
    name: file.name,
    size: file.size,
    src,
  };
  if (kind === 'video' || kind === 'gif') {
    const meta = kind === 'video' ? await probeVideo(src) : await probeImage(src);
    return { ...base, ...meta };
  }
  if (kind === 'image') {
    const meta = await probeImage(src);
    return { ...base, ...meta, duration: 5 };
  }
  const meta = await probeAudio(src);
  const peaks = await probeAudioPeaks(src);
  return { ...base, ...meta, ...peaks };
}
