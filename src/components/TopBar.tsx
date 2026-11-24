import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { t } from '../lib/i18n';
import { IconExport, IconRedo, IconUndo } from './icons';

const RATIOS = ['9:16', '16:9', '1:1', '4:5', '21:9', 'custom'] as const;

/**
 * Top bar (SPEC Section 3, Phase 1 + Phase 9, Section M).
 * Phase 9: "…" menu (Feature usage / task bar / sidebar / Help /
 * Settings — mirroring the reference), account chip, and a read-only
 * banner when a CUSTOMER is signed in. When the task bar is hidden,
 * only a slim strip with "Show task bar" remains.
 */
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
  const locale = useProjectStore((s) => s.locale);
  const account = useProjectStore((s) => s.account);
  const showTaskBar = useProjectStore((s) => s.showTaskBar);
  const setShowTaskBar = useProjectStore((s) => s.setShowTaskBar);
  const showSidebar = useProjectStore((s) => s.showSidebar);
  const setShowSidebar = useProjectStore((s) => s.setShowSidebar);
  const setSettingsOpen = useProjectStore((s) => s.setSettingsOpen);
  const setGuideOpen = useProjectStore((s) => s.setGuideOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const readOnly = account?.role === 'customer';

  if (!showTaskBar) {
    return (
      <div className="flex h-8 shrink-0 items-center justify-center border-b border-zinc-800 bg-zinc-950">
        <button type="button" onClick={() => setShowTaskBar(true)} className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800">
          Show task bar
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="flex h-12 shrink-0 flex-wrap items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-3 text-zinc-100">
        <button type="button" onClick={openDashboard} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-zinc-800" aria-label="Back to dashboard" title="Back to dashboard">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Vidora logo" className="h-7 w-7" />
          <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-lg font-bold text-transparent">Vidora</span>
        </button>
        <span className="hidden max-w-56 truncate text-sm text-zinc-300 sm:block" title={project?.name}>
          {project?.name ?? 'Untitled Project'}
        </span>
        <span className="hidden text-[11px] text-zinc-500 md:block" title={dirty ? 'Changes not yet autosaved' : 'All changes saved'}>
          {dirty ? `● ${t(locale, 'topbar.unsaved')}` : lastSavedAt ? `✓ ${t(locale, 'topbar.saved')}` : `✓ ${t(locale, 'topbar.saved')}`}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={undo} disabled={undoStack.length === 0 || readOnly} className="rounded-md p-2 text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40" title={readOnly ? t(locale, 'auth.readOnly') : undoStack.length === 0 ? 'Undo (nothing to undo)' : `Undo (${undoStack.length})`} aria-label="Undo">
            <IconUndo size={18} />
          </button>
          <button type="button" onClick={redo} disabled={redoStack.length === 0 || readOnly} className="rounded-md p-2 text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40" title={readOnly ? t(locale, 'auth.readOnly') : redoStack.length === 0 ? 'Redo (nothing to redo)' : `Redo (${redoStack.length})`} aria-label="Redo">
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
          ⌨ {t(locale, 'topbar.shortcuts')}
        </button>
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          disabled={readOnly}
          title={readOnly ? t(locale, 'auth.readOnly') : 'Export'}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          <IconExport size={16} />
          {t(locale, 'topbar.export')}
        </button>
        {account && (
          <button
            type="button"
            onClick={openDashboard}
            className="rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            title={`${account.name} — ${account.role === 'owner' ? 'OWNER' : 'CUSTOMER'} (click to open the account panel)`}
          >
            {account.name} · {account.role === 'owner' ? 'OWNER' : 'CUSTOMER'}
          </button>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            title="More options"
          >
            …
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-900 py-1 text-sm shadow-lg">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}
                className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
              >
                {t(locale, 'settings.featureUsage')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); setShowTaskBar(false); }}
                className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
              >
                Hide task bar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); setShowSidebar(!showSidebar); }}
                className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
              >
                {showSidebar ? 'Hide sidebar' : 'Show sidebar'}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); setGuideOpen(true); }}
                className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
              >
                {t(locale, 'settings.help')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}
                className="block w-full px-3 py-2 text-left hover:bg-zinc-800"
              >
                {t(locale, 'settings.title')}
              </button>
            </div>
          )}
        </div>
      </header>
      {readOnly && (
        <div className="shrink-0 border-b border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-center text-xs text-amber-200" role="status">
          {t(locale, 'auth.readOnly')}
        </div>
      )}
    </>
  );
}
