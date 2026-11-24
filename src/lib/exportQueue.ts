/**
 * Background export queue (Phase 8, Section L — L-EXPORT-QUEUE).
 *
 * Jobs run one at a time so the encoder and memory stay bounded, while
 * the editor stays usable. Job METADATA persists in localStorage
 * (`vidora.exportJobs.v1`); the finished FILE is a Blob kept only in
 * memory — after a reload the job still lists, but its file is gone and
 * the job must be re-run (the panel says so). A job interrupted by a
 * reload is marked "interrupted" on next load.
 */

import {
  defaultExportOptions,
  downloadBlob,
  exportAudioWav,
  exportCoverFrame,
  exportFrames,
  exportGif,
  exportVideo,
  type ExportCapabilities,
  type ExportKind,
  type ExportOptions,
} from './exportEngine';
import type { VidoraProject } from '../schema/project';

export type ExportJobStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled' | 'interrupted';

export interface ExportJob {
  createdAt: string;
  error?: string;
  fileName?: string;
  id: string;
  kind: ExportKind;
  options: ExportOptions;
  progress: number;
  projectId: string;
  projectName: string;
  size?: number;
  status: ExportJobStatus;
  step: string;
  warnings?: string[];
}

const JOBS_KEY = 'vidora.exportJobs.v1';
const MAX_JOBS = 20;

/** Finished file blobs, in-memory only (gone after reload). */
const jobBlobs = new Map<string, Blob>();
const jobControllers = new Map<string, AbortController>();

let running = false;
/** Jobs that were running/queued when the app closed are marked
 * interrupted — but only once per page load, so the runner's own
 * updates never flip a waiting job. */
let interruptedMarked = false;

export function loadJobs(): ExportJob[] {
  // The first load of the session is the "app opened" moment: jobs that
  // were running/queued when the app closed are interrupted. Mark it
  // here, at entry — an empty store must still count as a load, or the
  // first load AFTER a job is saved would flip that fresh job to
  // 'interrupted' and the queue would never see a queued job (BUG-P8-001).
  const firstLoad = !interruptedMarked;
  interruptedMarked = true;
  try {
    const raw = localStorage.getItem(JOBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExportJob[];
    if (!Array.isArray(parsed)) return [];
    if (firstLoad) {
      return parsed.map((j) =>
        j.status === 'running' || j.status === 'queued'
          ? { ...j, error: 'Interrupted when the app closed — re-run to export again.', status: 'interrupted' as const }
          : j,
      );
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveJobs(jobs: ExportJob[]): void {
  try {
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs.slice(0, MAX_JOBS)));
  } catch {
    // Storage full — the queue still works in memory.
  }
}

export function newExportJob(project: VidoraProject, kind: ExportKind, options: ExportOptions): ExportJob {
  return {
    createdAt: new Date().toISOString(),
    id: `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    options: { ...defaultExportOptions(), ...options, kind },
    progress: 0,
    projectId: project.id,
    projectName: project.name,
    status: 'queued',
    step: 'Queued',
  };
}

export function downloadJobFile(job: ExportJob): boolean {
  const blob = jobBlobs.get(job.id);
  if (!blob || !job.fileName) return false;
  downloadBlob(blob, job.fileName);
  return true;
}

export function cancelJob(id: string): void {
  jobControllers.get(id)?.abort();
}

/** Run the queue: one job at a time. `getProject` must return the live
 * project for the job's projectId (or null when it is gone / media is
 * not loaded). `onUpdate` receives the full job list after each change. */
export async function runQueue(
  getProject: (projectId: string) => VidoraProject | null,
  caps: ExportCapabilities,
  onUpdate: (jobs: ExportJob[]) => void,
): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (;;) {
      const jobs = loadJobs();
      const next = jobs.find((j) => j.status === 'queued');
      if (!next) return;
      const controller = new AbortController();
      jobControllers.set(next.id, controller);
      const update = (patch: Partial<ExportJob>) => {
        const all = loadJobs().map((j) => (j.id === next.id ? { ...j, ...patch } : j));
        saveJobs(all);
        onUpdate(all);
      };
      update({ progress: 0, status: 'running', step: 'Starting…' });
      try {
        const project = getProject(next.projectId);
        if (!project) throw new Error('Project no longer exists.');
        const opts = next.options;
        const onProgress = (p: { done: number; step: string; total: number }) =>
          update({ progress: Math.round((p.done / Math.max(1, p.total)) * 100), step: stepLabel(p.step) });
        if (next.kind === 'video') {
          const res = await exportVideo(project, opts, caps, onProgress, controller.signal);
          jobBlobs.set(next.id, res.blob);
          update({ fileName: res.fileName, progress: 100, size: res.blob.size, status: 'done', step: 'Done', warnings: res.warnings });
          downloadBlob(res.blob, res.fileName);
        } else if (next.kind === 'audio') {
          const res = await exportAudioWav(project, onProgress);
          jobBlobs.set(next.id, res.blob);
          update({ fileName: res.fileName, progress: 100, size: res.blob.size, status: 'done', step: 'Done', warnings: res.warnings });
          downloadBlob(res.blob, res.fileName);
        } else if (next.kind === 'gif') {
          const res = await exportGif(project, opts, onProgress, controller.signal);
          jobBlobs.set(next.id, res.blob);
          update({ fileName: res.fileName, progress: 100, size: res.blob.size, status: 'done', step: 'Done', warnings: res.warnings });
          downloadBlob(res.blob, res.fileName);
        } else if (next.kind === 'cover') {
          const res = await exportCoverFrame(project, opts);
          jobBlobs.set(next.id, res.blob);
          update({ fileName: res.fileName, progress: 100, size: res.blob.size, status: 'done', step: 'Done', warnings: res.warnings });
          downloadBlob(res.blob, res.fileName);
        } else {
          const res = await exportFrames(project, opts, onProgress, controller.signal);
          // Frames download one by one (browsers cannot zip here).
          res.blobs.forEach((b, i) => downloadBlob(b, res.fileNames[i]));
          update({
            fileName: `${res.fileNames.length} PNG frames`,
            progress: 100,
            size: res.blobs.reduce((a, b) => a + b.size, 0),
            status: 'done',
            step: 'Done',
            warnings: res.warnings,
          });
        }
      } catch (e) {
        const err = e as Error;
        if (err.name === 'AbortError' || controller.signal.aborted) {
          update({ error: 'Cancelled.', progress: 0, status: 'cancelled', step: 'Cancelled' });
        } else {
          update({ error: err.message || 'Export failed.', status: 'failed', step: 'Failed' });
        }
      } finally {
        jobControllers.delete(next.id);
      }
    }
  } finally {
    running = false;
  }
}

function stepLabel(step: string): string {
  if (step === 'frames') return 'Rendering frames';
  if (step === 'audio') return 'Mixing audio';
  if (step === 'muxing') return 'Muxing file';
  if (step === 'finishing') return 'Finishing';
  return step;
}
