import { useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { exportFileName, pickMimeType, resolutionSize, supportedMimeTypes, type ExportFps, type ExportResolution } from '../lib/exporter';
import { projectDuration } from '../lib/timeline';

/**
 * Basic export (Phase 1). Records the composited preview canvas in real
 * time with MediaRecorder. Limits are shown in the panel and in SPEC.md:
 * realtime only, WebM/MP4 as the browser supports, no audio mix yet, no 4K.
 */
export default function ExportPanel() {
  const project = useProjectStore((s) => s.project);
  const exportOpen = useProjectStore((s) => s.exportOpen);
  const setExportOpen = useProjectStore((s) => s.setExportOpen);
  const setPlaying = useProjectStore((s) => s.setPlaying);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);
  const [resolution, setResolution] = useState<ExportResolution>(720);
  const [fps, setFps] = useState<ExportFps>(30);
  const [format, setFormat] = useState<'webm' | 'mp4'>('webm');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const recordingRef = useRef(false);

  if (!exportOpen || !project) return null;
  const duration = projectDuration(project);
  const supported = supportedMimeTypes();

  const startExport = async () => {
    const mime = pickMimeType(format);
    if (!mime) {
      setStatus('This browser does not support MediaRecorder export. Try Chrome or Edge.');
      return;
    }
    const canvas = document.querySelector<HTMLCanvasElement>('#vidora-export-canvas');
    if (!canvas) {
      setStatus('Preview canvas is not ready. Open the editor and try again.');
      return;
    }
    recordingRef.current = true;
    setStatus('Recording preview in real time…');
    setProgress(0);
    setPlayhead(0);
    setPlaying(true);
    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: resolution === 1080 ? 8_000_000 : resolution === 720 ? 5_000_000 : 2_500_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      recordingRef.current = false;
      setPlaying(false);
      const ext = mime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFileName(project.name, ext);
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setStatus(`Export finished — ${exportFileName(project.name, ext)} downloaded (${(blob.size / 1_048_576).toFixed(1)} MB).`);
      setProgress(100);
    };
    recorder.start(250);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      setProgress(Math.min(100, Math.round((elapsed / Math.max(duration, 0.1)) * 100)));
      if (elapsed >= duration || !recordingRef.current) {
        window.clearInterval(tick);
        if (recorder.state !== 'inactive') recorder.stop();
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-label="Export">
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-950 p-5 text-zinc-100">
        <h2 className="text-lg font-semibold">Export</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Basic export (Phase 1): records the preview in real time. Duration {duration.toFixed(1)}s — export takes about that long.
        </p>
        <div className="mt-4 space-y-3 text-sm">
          <label className="flex items-center justify-between gap-3">
            Resolution
            <select value={resolution} onChange={(e) => setResolution(Number(e.target.value) as ExportResolution)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5">
              <option value={480}>480p ({resolutionSize(480).width}×480)</option>
              <option value={720}>720p (1280×720)</option>
              <option value={1080}>1080p (1920×1080)</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-3">
            Frame rate
            <select value={fps} onChange={(e) => setFps(Number(e.target.value) as ExportFps)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5">
              <option value={24}>24 fps</option>
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-3">
            Format
            <select value={format} onChange={(e) => setFormat(e.target.value as 'webm' | 'mp4')} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5">
              <option value="webm">WebM (recommended)</option>
              <option value="mp4">MP4 (if supported)</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
          Supported here: {supported.length > 0 ? supported.join(', ') : 'none detected'}. H.264 is used when the browser reports MP4 support; otherwise WebM. Audio is not mixed into the recording in Phase 1. 4K, H.265/VP9 choice, bitrate control, GIF and background queue arrive in Phase 8.
        </p>
        {progress > 0 && (
          <div className="mt-3 h-2 overflow-hidden rounded bg-zinc-800">
            <div className="h-full bg-gradient-to-r from-violet-600 to-cyan-500" style={{ width: `${progress}%` }} />
          </div>
        )}
        {status && <p className="mt-3 text-xs text-zinc-300">{status}</p>}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => void startExport()} className="flex-1 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white">
            Export
          </button>
          <button type="button" onClick={() => setExportOpen(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
