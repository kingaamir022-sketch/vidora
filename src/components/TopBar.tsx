import { useProjectStore } from '../store/projectStore';
import { IconExport, IconRedo, IconUndo } from './icons';

const RATIOS = ['9:16', '16:9', '1:1', '4:5', '21:9'] as const;

/** Top bar (SPEC Section 3). Export is a real button, disabled in Phase 0 — export lands in Phase 1. */
export default function TopBar() {
  const project = useProjectStore((s) => s.project);
  const undoStack = useProjectStore((s) => s.undoStack);
  const redoStack = useProjectStore((s) => s.redoStack);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const setAspectRatio = useProjectStore((s) => s.setAspectRatio);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const openDashboard = useProjectStore((s) => s.openDashboard);

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-3 text-zinc-100">
      <button
        type="button"
        onClick={openDashboard}
        className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-zinc-800"
        aria-label="Back to dashboard"
        title="Back to dashboard"
      >
        <img src="/logo.svg" alt="Vidora logo" className="h-7 w-7" />
        <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-lg font-bold text-transparent">
          Vidora
        </span>
      </button>
      <span className="hidden max-w-56 truncate text-sm text-zinc-300 sm:block" title={project?.name}>
        {project?.name ?? 'Untitled Project'}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={undo}
          disabled={undoStack.length === 0}
          className="rounded-md p-2 text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          title="Undo (no actions to undo yet)"
          aria-label="Undo"
        >
          <IconUndo size={18} />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={redoStack.length === 0}
          className="rounded-md p-2 text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          title="Redo (no actions to redo yet)"
          aria-label="Redo"
        >
          <IconRedo size={18} />
        </button>
      </div>
      <label className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
        Aspect ratio
        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value as (typeof RATIOS)[number])}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          aria-label="Aspect ratio"
        >
          {RATIOS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled
        title="Export arrives in Phase 1"
        className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white opacity-50"
      >
        <IconExport size={16} />
        Export
      </button>
    </header>
  );
}
