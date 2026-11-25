import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { projectDuration } from '../lib/timeline';
import {
  EXPORT_FORMATS,
  EXPORT_FPS,
  EXPORT_RESOLUTIONS,
  defaultExportOptions,
  downloadBlob,
  estimateFileSizeBytes,
  exportFileName,
  exportSizeFor,
  formatBytesShort,
  probeExportCapabilities,
  resolveExportPlan,
  type ExportCapabilities,
  type ExportFormat,
  type ExportFps,
  type ExportKind,
  type ExportOptions,
  type ExportQuality,
  type ExportResolution,
} from '../lib/exportEngine';
import {
  cancelJob,
  downloadJobFile,
  loadJobs,
  newExportJob,
  runQueue,
  saveJobs,
  type ExportJob,
} from '../lib/exportQueue';
import { buildBundle, bundleFileName, bundleToText, loadBackupRecords, saveBackupRecords } from '../lib/cloudBackup';
import { formatCommentTime } from '../lib/collab';
import { SOCIAL_TARGETS, buildPresentationHtml, buildShareCaption } from '../lib/share';

/**
 * Download settings panel (CapCut-fix 2026-11-25, V1/Y12). The Export
 * button opens the Export MENU (ExportMenu.tsx); this panel is the
 * single section the menu chose, via the store's exportTab
 * (download/review/present/social). It has NO tab bar of its own and
 * renders ONLY that section. Video export renders offline (frame by
 * frame, with the audio mix) — no longer realtime, and no longer
 * silent. H.265 is not offered: no browser encoder exists for it.
 * Social sharing opens the platform's own upload page — Vidora has no
 * connected social accounts, so it cannot post for you.
 */
export default function ExportPanel() {
  const project = useProjectStore((s) => s.project);
  const playhead = useProjectStore((s) => s.playhead);
  const exportOpen = useProjectStore((s) => s.exportOpen);
  const exportTab = useProjectStore((s) => s.exportTab);
  const setExportOpen = useProjectStore((s) => s.setExportOpen);
  const setPlaying = useProjectStore((s) => s.setPlaying);
  const setPresentMode = useProjectStore((s) => s.setPresentMode);
  const addComment = useProjectStore((s) => s.addComment);
  const setCommentResolved = useProjectStore((s) => s.setCommentResolved);
  const shareWith = useProjectStore((s) => s.shareWith);

  const [options, setOptions] = useState<ExportOptions>(defaultExportOptions());
  const [caps, setCaps] = useState<ExportCapabilities | null>(null);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [status, setStatus] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [author, setAuthor] = useState(() => localStorage.getItem('vidora.commentAuthor.v1') ?? '');
  const [commentText, setCommentText] = useState('');
  const [shareName, setShareName] = useState('');
  const [caption, setCaption] = useState('');
  const [copied, setCopied] = useState(false);

  const duration = project ? projectDuration(project) : 0;

  useEffect(() => {
    if (!exportOpen) return;
    setJobs(loadJobs());
    void probeExportCapabilities().then(setCaps);
    // Cover thumbnail from the preview canvas.
    const canvas = document.querySelector<HTMLCanvasElement>('#vidora-export-canvas');
    if (canvas) {
      const tmp = document.createElement('canvas');
      const scale = Math.min(1, 320 / canvas.width);
      tmp.width = Math.max(1, Math.round(canvas.width * scale));
      tmp.height = Math.max(1, Math.round(canvas.height * scale));
      const tctx = tmp.getContext('2d');
      if (tctx) {
        tctx.drawImage(canvas, 0, 0, tmp.width, tmp.height);
        setCover(tmp.toDataURL('image/png'));
      }
    }
    if (project) setCaption(buildShareCaption(project.name, duration));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportOpen]);

  const plan = useMemo(() => (caps ? resolveExportPlan(options.format, caps) : null), [caps, options.format]);
  const size = project ? exportSizeFor(project, options.resolution) : { height: 720, width: 1280 };
  const estimate = estimateFileSizeBytes(duration, options);
  const videoBlocked = !caps ? 'Checking what this browser can encode…' : !caps.videoEncoder ? 'This browser has no WebCodecs VideoEncoder — video export is unavailable here.' : plan && !plan.videoCodec ? plan.videoNote : null;
  const framesCount = Math.ceil(duration * options.fps);

  if (!exportOpen || !project) return null;

  const enqueue = (kind: ExportKind, opts: ExportOptions, note?: string) => {
    if (duration <= 0) {
      setStatus('Project is empty and cannot be exported.');
      return;
    }
    if (kind === 'frames' && framesCount > 600) {
      const ok = window.confirm(`This will download ${framesCount} PNG files, one by one. Continue?`);
      if (!ok) return;
    }
    const job = newExportJob(project, kind, opts);
    const all = [job, ...loadJobs()];
    saveJobs(all);
    setJobs(all);
    setStatus(note ?? `Queued: ${job.fileName ?? 'export'} — it runs in the background while you keep editing.`);
    void runQueue(
      (id) => (useProjectStore.getState().project?.id === id ? useProjectStore.getState().project : null),
      caps ?? { aac: false, h264: false, mediaRecorder: false, notes: [], opus: false, videoEncoder: false, vp8: false, vp9: false },
      setJobs,
    );
  };

  const rerun = (job: ExportJob) => {
    const next = newExportJob(project, job.kind, job.options);
    const all = [next, ...loadJobs()];
    saveJobs(all);
    setJobs(all);
    void runQueue(
      (id) => (useProjectStore.getState().project?.id === id ? useProjectStore.getState().project : null),
      caps ?? { aac: false, h264: false, mediaRecorder: false, notes: [], opus: false, videoEncoder: false, vp8: false, vp9: false },
      setJobs,
    );
  };

  const clearFinished = () => {
    const kept = loadJobs().filter((j) => j.status === 'queued' || j.status === 'running');
    saveJobs(kept);
    setJobs(kept);
  };

  const submitComment = () => {
    if (!commentText.trim()) return;
    localStorage.setItem('vidora.commentAuthor.v1', author);
    addComment(author || 'You', commentText);
    setCommentText('');
  };

  const downloadReviewPackage = () => {
    const bundle = buildBundle(project);
    downloadBlob(new Blob([bundleToText(bundle)], { type: 'application/json' }), bundleFileName(project));
    const records = loadBackupRecords();
    saveBackupRecords([{ createdAt: new Date().toISOString(), id: `bk-${Date.now().toString(36)}`, projectId: project.id, projectName: project.name, size: bundleToText(bundle).length }, ...records]);
    setStatus(`Review package downloaded (${bundleFileName(project)}). Send the file to your reviewer — their comments come back in the same file.`);
  };

  const downloadPresentation = () => {
    const videoName = exportFileName(project.name, options.format === 'webm' ? 'webm' : 'mp4');
    const html = buildPresentationHtml(project.name, videoName, duration);
    downloadBlob(new Blob([html], { type: 'text/html' }), exportFileName(project.name, 'html').replace(/\.html$/, '-presentation.html'));
    setStatus(`Presentation page downloaded. Keep it next to ${videoName} in the same folder, then open it.`);
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatus('Copy did not work here — select the caption text and copy it yourself.');
    }
  };

  const comments = project.comments ?? [];
  const sharedWith = project.sharedWith ?? [];
  const finishedJobs = jobs.filter((j) => j.status === 'done');

  const sectionTitle =
    exportTab === 'review'
      ? 'Share for review'
      : exportTab === 'present'
        ? 'Share as presentation'
        : exportTab === 'social'
          ? 'Share on social'
          : 'Download';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Export and share">
      <div className="w-full max-w-lg rounded-xl border border-[#3D3D3D] bg-[#0A0A0A] p-5 text-zinc-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{sectionTitle}</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Duration {duration.toFixed(1)}s · offline render with the audio mix (not realtime).</p>
          </div>
          <button type="button" onClick={() => setExportOpen(false)} className="rounded-md border border-zinc-700 px-3 py-1 text-sm" aria-label="Close export">
            ✕
          </button>
        </div>

        {exportTab === 'download' && (
          <div className="mt-4">
            <div className="flex gap-3">
              {cover && <img src={cover} alt="Video cover" className="h-16 w-28 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <label className="block text-xs text-zinc-400">
                  File name
                  <input
                    value={options.fileName ?? project.name}
                    aria-label="Export file name"
                    className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
                    onChange={(e) => setOptions({ ...options, fileName: e.target.value })}
                  />
                </label>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {size.width}×{size.height} · {options.fps} fps · {options.format.toUpperCase()} · about {formatBytesShort(estimate)} (estimate)
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <label className="flex items-center justify-between gap-3">
                Resolution
                <select
                  value={options.resolution}
                  onChange={(e) => setOptions({ ...options, resolution: Number(e.target.value) as ExportResolution })}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5"
                >
                  {EXPORT_RESOLUTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r >= 2160 ? '4K (2160p)' : r >= 1440 ? '2K (1440p)' : `${r}p`}
                      {r === 1080 ? ' — Recommended on TikTok' : r === 720 ? ' — Recommended on TikTok Ads Manager' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3">
                Quality
                <select
                  value={options.quality}
                  onChange={(e) => setOptions({ ...options, quality: e.target.value as ExportQuality })}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5"
                >
                  <option value="high">High quality</option>
                  <option value="recommended">Recommended quality</option>
                  <option value="fast">Fast exporting</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-3">
                Frame rate
                <select value={options.fps} onChange={(e) => setOptions({ ...options, fps: Number(e.target.value) as ExportFps })} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5">
                  {EXPORT_FPS.map((f) => (
                    <option key={f} value={f}>
                      {f} fps
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3">
                Format
                <select
                  value={options.format}
                  onChange={(e) => setOptions({ ...options, format: e.target.value as ExportFormat })}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5"
                >
                  {EXPORT_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f === 'mp4' ? 'MP4 (H.264 + AAC)' : f === 'webm' ? 'WebM (VP9/VP8 + Opus)' : 'MOV (H.264 + AAC)'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={options.includeAudio} onChange={(e) => setOptions({ ...options, includeAudio: e.target.checked })} />
                Include audio mix (volume, fades, ducking, EQ)
              </label>
            </div>
            {options.resolution === 2160 && <p className="mt-2 text-[11px] text-amber-300">4K renders a 3840×2160 canvas — slow on long projects. Use 1080p for a quick check.</p>}
            {caps && caps.notes.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-zinc-500">
                {caps.notes.map((n) => (
                  <li key={n}>• {n}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              H.265 is not offered — no browser can encode it. Voice-changer presets are preview-only; a voice clip exports with its base audio. Reversed clips are silent in the export, as in the preview.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={duration <= 0 || Boolean(videoBlocked)}
                onClick={() => enqueue('video', options)}
                className="flex-1 rounded-lg bg-[#00D9D9] px-4 py-2 text-sm font-semibold text-[#062A2A] disabled:opacity-40"
              >
                {duration <= 0 ? 'Project is empty and cannot be exported' : 'Export'}
              </button>
              <button type="button" onClick={() => setExportOpen(false)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
                Close
              </button>
            </div>
            {videoBlocked && <p className="mt-2 text-xs text-amber-300">{videoBlocked}</p>}

            <div className="mt-5 border-t border-zinc-800 pt-3">
              <h3 className="text-sm font-semibold">More export kinds</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <button type="button" onClick={() => enqueue('audio', { ...options, kind: 'audio' })} className="rounded-lg border border-zinc-700 px-3 py-2 text-left hover:bg-zinc-900">
                  <span className="font-semibold">Audio only (WAV)</span>
                  <span className="block text-zinc-500">48 kHz stereo mix. MP3 is not offered — no MP3 encoder is bundled.</span>
                </button>
                <button type="button" onClick={() => enqueue('gif', { ...options, kind: 'gif' })} className="rounded-lg border border-zinc-700 px-3 py-2 text-left hover:bg-zinc-900">
                  <span className="font-semibold">Animated GIF</span>
                  <span className="block text-zinc-500">10 fps, max 320 px, first 30 s, no audio.</span>
                </button>
                <button
                  type="button"
                  onClick={() => enqueue('frames', { ...options, kind: 'frames' })}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-left hover:bg-zinc-900"
                >
                  <span className="font-semibold">Image sequence (PNG)</span>
                  <span className="block text-zinc-500">
                    One PNG per frame — {framesCount} files, downloaded one by one.
                  </span>
                </button>
                <div className="rounded-lg border border-zinc-700 px-3 py-2">
                  <span className="font-semibold">Cover frame (PNG)</span>
                  <label className="mt-1 flex items-center gap-2 text-zinc-400">
                    Time (s)
                    <input
                      type="number"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={options.coverTime ?? 0}
                      onChange={(e) => setOptions({ ...options, coverTime: Math.min(duration, Math.max(0, Number(e.target.value) || 0)) })}
                      aria-label="Cover frame time in seconds"
                      className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-zinc-100"
                    />
                  </label>
                  <button type="button" onClick={() => enqueue('cover', { ...options, kind: 'cover' })} className="mt-1.5 rounded-md bg-[#00D9D9] px-2 py-1 font-semibold text-[#062A2A]">
                    Export cover
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-zinc-800 pt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Export queue ({jobs.length})</h3>
                <button type="button" onClick={clearFinished} className="text-[11px] text-zinc-400 underline">
                  Clear finished
                </button>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">Jobs run one at a time. Finished files can be re-downloaded until you close the app.</p>
              {jobs.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">No exports yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {jobs.map((job) => (
                    <li key={job.id} data-job-id={job.id} data-kind={job.kind} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate font-semibold">
                          {job.fileName ?? `${job.kind} export`} · {job.projectName}
                        </span>
                        <span className="shrink-0 text-zinc-400">{job.status}</span>
                      </div>
                      {(job.status === 'running' || job.status === 'queued') && (
                        <div className="mt-1.5 h-2 overflow-hidden rounded bg-zinc-800">
                          <div className="h-full bg-[#00D9D9]" style={{ width: `${job.progress}%` }} />
                        </div>
                      )}
                      <p className="mt-1 text-zinc-500">
                        {job.step}
                        {job.progress > 0 && job.status === 'running' ? ` — ${job.progress}%` : ''}
                        {job.size ? ` · ${formatBytesShort(job.size)}` : ''}
                      </p>
                      {job.warnings?.map((w) => (
                        <p key={w} className="mt-0.5 text-[11px] text-amber-300">
                          ⚠ {w}
                        </p>
                      ))}
                      {job.error && <p className="mt-0.5 text-[11px] text-red-300">{job.error}</p>}
                      <div className="mt-1.5 flex gap-2">
                        {job.status === 'running' && (
                          <button type="button" onClick={() => cancelJob(job.id)} className="rounded border border-zinc-700 px-2 py-0.5 text-[11px]">
                            Cancel
                          </button>
                        )}
                        {job.status === 'done' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!downloadJobFile(job)) setStatus('That file is gone (the app was closed) — re-run the export to make it again.');
                            }}
                            className="rounded border border-zinc-700 px-2 py-0.5 text-[11px]"
                          >
                            Download again
                          </button>
                        )}
                        {(job.status === 'failed' || job.status === 'cancelled' || job.status === 'interrupted') && (
                          <button type="button" onClick={() => rerun(job)} className="rounded border border-zinc-700 px-2 py-0.5 text-[11px]">
                            Re-run
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {exportTab === 'review' && (
          <div className="mt-4">
            <p className="text-xs leading-relaxed text-zinc-400">People can add comments to your video. Send them the review package file — their comments come back in the same file. No account, no server.</p>
            <div className="mt-3">
              <label className="block text-xs text-zinc-400">
                Your name
                <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" aria-label="Your name for comments" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100" />
              </label>
              <label className="mt-2 block text-xs text-zinc-400">
                Add a comment at {formatCommentTime(playhead)} (current playhead)
                <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a note about this moment…" aria-label="Comment text" rows={2} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100" />
              </label>
              <button type="button" onClick={submitComment} disabled={!commentText.trim()} className="mt-2 rounded-lg bg-[#00D9D9] px-4 py-2 text-sm font-semibold text-[#062A2A] disabled:opacity-40">
                Add comment
              </button>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-semibold">Comments ({comments.length})</h3>
              {comments.length === 0 ? (
                <p className="mt-1 text-xs text-zinc-500">No comments yet — add one at the playhead.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {comments.map((c) => (
                    <li key={c.id} className={`rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-xs ${c.resolved ? 'opacity-60' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <button type="button" onClick={() => useProjectStore.getState().setPlayhead(c.time)} className="font-mono text-[#00D9D9]" title="Seek to this moment">
                          {formatCommentTime(c.time)}
                        </button>
                        <button type="button" onClick={() => setCommentResolved(c.id, !c.resolved)} className="rounded border border-zinc-700 px-2 py-0.5 text-[11px]">
                          {c.resolved ? 'Reopen' : 'Resolve'}
                        </button>
                      </div>
                      <p className={`mt-1 ${c.resolved ? 'line-through' : ''}`}>{c.text}</p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        {c.author} · {new Date(c.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4 border-t border-zinc-800 pt-3">
              <h3 className="text-sm font-semibold">Shared with</h3>
              <p className="mt-1 text-[11px] text-zinc-500">A record of who received the file — Vidora sends nothing itself.</p>
              <div className="mt-2 flex gap-2">
                <input value={shareName} onChange={(e) => setShareName(e.target.value)} placeholder="Person's name" aria-label="Share with name" className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100" />
                <button
                  type="button"
                  onClick={() => {
                    if (shareName.trim()) {
                      shareWith(shareName);
                      setShareName('');
                    }
                  }}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm"
                >
                  Add
                </button>
              </div>
              {sharedWith.length > 0 && <p className="mt-2 text-xs text-zinc-400">Shared with: {sharedWith.join(', ')}</p>}
              <button type="button" onClick={downloadReviewPackage} className="mt-3 w-full rounded-lg bg-[#00D9D9] px-4 py-2 text-sm font-semibold text-[#062A2A]">
                Download review package (.vidora)
              </button>
            </div>
          </div>
        )}

        {exportTab === 'present' && (
          <div className="mt-4">
            <p className="text-xs leading-relaxed text-zinc-400">People can only watch your video. Present it fullscreen here, or download a small player page to send with the exported video file.</p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                disabled={duration <= 0}
                onClick={() => {
                  setPlaying(true);
                  setExportOpen(false);
                  setPresentMode(true);
                }}
                className="rounded-lg bg-[#00D9D9] px-4 py-2 text-sm font-semibold text-[#062A2A] disabled:opacity-40"
              >
                Present now (fullscreen, watch only)
              </button>
              <button type="button" onClick={downloadPresentation} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
                Download presentation page (.html)
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              The presentation page plays {exportFileName(project.name, options.format === 'webm' ? 'webm' : 'mp4')} — keep both files in the same folder. Press Esc to leave presentation mode.
            </p>
          </div>
        )}

        {exportTab === 'social' && (
          <div className="mt-4">
            <p className="text-xs leading-relaxed text-zinc-400">
              Vidora prepares the file — you upload it on the platform. Direct posting needs a connected account (Phase 9). Export the video first (Download), then open the platform&apos;s upload page.
            </p>
            {finishedJobs.length === 0 && <p className="mt-2 text-xs text-amber-300">No exported file yet in this session — export the video first.</p>}
            <label className="mt-3 block text-xs text-zinc-400">
              Caption
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} aria-label="Share caption" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100" />
            </label>
            <button type="button" onClick={() => void copyCaption()} className="mt-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm">
              {copied ? 'Copied ✓' : 'Copy caption'}
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SOCIAL_TARGETS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  disabled={!t.url}
                  onClick={() => {
                    if (t.url) window.open(t.url, '_blank', 'noopener');
                    else void copyCaption();
                  }}
                  className="rounded-lg border border-zinc-700 px-3 py-2 text-left text-xs hover:bg-zinc-900 disabled:opacity-60"
                  title={t.note}
                >
                  <span className="font-semibold">{t.name}</span>
                  <span className="block text-zinc-500">{t.note}</span>
                </button>
              ))}
              <button type="button" disabled title="Scheduling needs a connected account (Phase 9)" className="cursor-not-allowed rounded-lg border border-zinc-800 px-3 py-2 text-left text-xs opacity-50">
                <span className="font-semibold">Free Schedule</span>
                <span className="block text-zinc-500">Needs a connected account — not available yet.</span>
              </button>
            </div>
          </div>
        )}

        {status && <p className="mt-4 text-xs text-zinc-300">{status}</p>}
      </div>
    </div>
  );
}
