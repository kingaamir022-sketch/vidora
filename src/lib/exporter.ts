/** Basic export (Phase 1, SPEC C scope). Real MediaRecorder export of the
 * preview canvas. Honest limits (documented in SPEC.md):
 * - Records the composited preview in real time (export takes as long as the video).
 * - Output is WebM (VP8/VP9) when supported, otherwise MP4 if the browser reports it.
 * - No offline faster-than-realtime render, no H.265/VP9 choice, no 4K — those land in Phase 8.
 * - Audio is not mixed into the recording in Phase 1 (canvas capture only).
 */

export type ExportResolution = 480 | 720 | 1080;
export type ExportFps = 24 | 30 | 60;

export interface ExportOptions {
  fps: ExportFps;
  format: 'webm' | 'mp4';
  resolution: ExportResolution;
}

export function supportedMimeTypes(): string[] {
  if (typeof MediaRecorder === 'undefined') return [];
  return [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ].filter((m) => MediaRecorder.isTypeSupported(m));
}

export function pickMimeType(preferred: 'webm' | 'mp4'): string | null {
  const supported = supportedMimeTypes();
  if (preferred === 'mp4') {
    return supported.find((m) => m.startsWith('video/mp4')) ?? supported[0] ?? null;
  }
  return supported.find((m) => m.startsWith('video/webm')) ?? supported[0] ?? null;
}

export function exportFileName(projectName: string, ext: string): string {
  const safe = projectName.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'vidora-export';
  return `${safe}.${ext}`;
}

export function resolutionSize(resolution: ExportResolution): { height: number; width: number } {
  if (resolution === 480) return { height: 480, width: 854 };
  if (resolution === 720) return { height: 720, width: 1280 };
  return { height: 1080, width: 1920 };
}
