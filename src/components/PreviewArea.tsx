import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { IconPause, IconPlay } from './icons';

/** Center preview (SPEC Section 3). Phase 0: real transport controls over an empty canvas — playback of media lands in Phase 1. */
export default function PreviewArea() {
  const [playing, setPlaying] = useState(false);
  const project = useProjectStore((s) => s.project);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);

  const aspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16]'
      : aspectRatio === '1:1'
        ? 'aspect-square'
        : aspectRatio === '4:5'
          ? 'aspect-[4/5]'
          : aspectRatio === '21:9'
            ? 'aspect-[21/9]'
            : 'aspect-video';

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-zinc-900" aria-label="Preview">
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <div
          className={`${aspectClass} flex max-h-full max-w-full flex-col items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-black shadow-2xl`}
          style={{ width: aspectRatio === '9:16' || aspectRatio === '4:5' ? 'auto' : '100%', height: aspectRatio === '9:16' || aspectRatio === '4:5' ? '100%' : 'auto' }}
        >
          <img src="/logo.svg" alt="" className="h-12 w-12 opacity-60" />
          <p className="px-4 text-center text-sm text-zinc-400">
            Preview — {project?.name ?? 'Untitled Project'} ({aspectRatio})
          </p>
          <p className="px-4 text-center text-xs text-zinc-500">
            Import media in Phase 1 to see clips here.
          </p>
        </div>
      </div>
      <div className="flex h-12 shrink-0 items-center justify-center gap-3 border-t border-zinc-800 bg-zinc-950">
        <button
          type="button"
          onClick={() => setPlaying((v) => !v)}
          className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 p-2.5 text-white"
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
        </button>
        <span className="font-mono text-xs text-zinc-400" aria-label="Timecode">
          00:00:00:00 / 00:00:10:00
        </span>
      </div>
    </section>
  );
}
