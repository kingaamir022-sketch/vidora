import { useProjectStore } from '../store/projectStore';
import { IconExport, IconRedo, IconUndo } from './icons';

const RATIOS = ['9:16', '16:9', '1:1', '4:5', '21:9', 'custom'] as const;

/** Top bar (SPEC Section 3, Phase 1): real undo/redo, ratio incl. custom, Export opens the export panel. */
export default function TopBar() {
  const project = useProjectStore((s) => s.project);
  const undoStack = useProjectStore((s) => s.undoStack);
  const redoStack = useProjectStore((s) => s.redoStack);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const setAspectRatio = useProjectStore((s) => s.setAspectRatio);
  const customRatio = useProjectStore((s) => s.customRatio);
  const setCustomRatio = useProjectStore((s) => s.setCustomRatio);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const openDashboard = useProjectStore((s) => s.openDashboard);
  const setExportOpen = useProjectStore((s) => s.setExportOpen);
  const setShortcutsOpen = useProjectStore((s) => s.setShortcutsOpen);
  const dirty = useProjectStore((s) => s.dirty);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);

  return (
    <header className="flex h-12 shrink-0 flex-wrap items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-3 text-zinc-100">
      <button type="button" onClick={openDashboard} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-zinc-800" aria-label="Back to dashboard" title="Back to dashboard">
        <img src="/logo.svg" alt="Vidora logo" className="h-7 w-7" />
        <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-lg font-bold text-transparent">Vidora</span>
      </button>
      <span className="hidden max-w-56 truncate text-sm text-zinc-300 sm:block" title={project?.name}>
        {project?.name ?? 'Untitled Project'}
      </span>
      <span className="hidden text-[11px] text-zinc-500 md:block" title={dirty ? 'Changes not yet autosaved' : 'All changes saved'}>
        {dirty ? '● Unsaved' : lastSavedAt ? '✓ Saved' : '✓ Saved'}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={undo} disabled={undoStack.length === 0} className="rounded-md p-2 text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40" title={undoStack.length === 0 ? 'Undo (nothing to undo)' : `Undo (${undoStack.length})`} aria-label="Undo">
          <IconUndo size={18} />
        </button>
        <button type="button" onClick={redo} disabled={redoStack.length === 0} className="rounded-md p-2 text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40" title={redoStack.length === 0 ? 'Redo (nothing to redo)' : `Redo (${redoStack.length})`} aria-label="Redo">
          <IconRedo size={18} />
        </button>
      </div>
      <label className="ml-auto flex items-center gap-2 text-xs text-zinc-400">
        Aspect ratio
        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as (typeof RATIOS)[number])} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100" aria-label="Aspect ratio">
          {RATIOS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      {aspectRatio === 'custom' && (
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <input type="number" min={1} max={7680} value={customRatio.width} onChange={(e) => setCustomRatio(Number(e.target.value) || 1920, customRatio.height)} aria-label="Custom width" className="w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm" />
          ×
          <input type="number" min={1} max={7680} value={customRatio.height} onChange={(e) => setCustomRatio(customRatio.width, Number(e.target.value) || 1080)} aria-label="Custom height" className="w-16 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm" />
        </span>
      )}
      <button type="button" onClick={() => setShortcutsOpen(true)} className="rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800" title="Keyboard shortcuts">
        ⌨ Shortcuts
      </button>
      <button type="button" onClick={() => setExportOpen(true)} className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white" title="Export (Phase 1 basic export)">
        <IconExport size={16} />
        Export
      </button>
    </header>
  );
}
