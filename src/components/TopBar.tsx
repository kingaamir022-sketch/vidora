import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { IconChevronDown, IconCloud, IconExport, IconLayout, IconPro, IconShare } from './icons';

/**
 * Top bar (CapCut-fix 2026-11-25, B1–B6). 48px, near-black #0A0A0A.
 * Order: [Vidora logo+wordmark] [Menu ⌄] … [project name CENTERED,
 * editable] … [layout icons] [cloud autosave icon] [Pro ◆] [Share]
 * [Export teal]. No save-state text, no undo/redo (they live in the
 * timeline toolbar), no aspect-ratio select (ratio lives in the
 * preview "Ratio" button + Details + Modify), no "⌨ Shortcuts"
 * button (shortcuts open from the keyboard icon at the bottom of the
 * left column), no account chip or read-only banner (auth removed, Y3).
 * Window controls: N/A (browser chrome).
 */
export default function TopBar({
  onExport,
  onNewProject,
  onShare,
  onShowFeatureUsage,
  onShowHelp,
  onShowSettings,
  onShowShortcuts,
  onToggleSidebar,
  onToggleTimeline,
  sidebarVisible,
  timelineVisible,
}: {
  onExport: () => void;
  onNewProject: () => void;
  onShare: () => void;
  onShowFeatureUsage: () => void;
  onShowHelp: () => void;
  onShowSettings: () => void;
  onShowShortcuts: () => void;
  onToggleSidebar: () => void;
  onToggleTimeline: () => void;
  sidebarVisible: boolean;
  timelineVisible: boolean;
}) {
  const project = useProjectStore((s) => s.project);
  const openDashboard = useProjectStore((s) => s.openDashboard);
  const renameProject = useProjectStore((s) => s.renameProject);
  const dirty = useProjectStore((s) => s.dirty);
  const lastSavedAt = useProjectStore((s) => s.lastSavedAt);
  const showTaskBar = useProjectStore((s) => s.showTaskBar);
  const setShowTaskBar = useProjectStore((s) => s.setShowTaskBar);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  if (!showTaskBar) {
    return (
      <div className="flex h-8 shrink-0 items-center justify-center border-b border-[#2E2E2E] bg-[#0A0A0A]">
        <button type="button" onClick={() => setShowTaskBar(true)} className="rounded-md border border-[#3D3D3D] px-3 py-1 text-xs text-[#F2F2F2] hover:bg-[#242424]">
          Show task bar
        </button>
      </div>
    );
  }

  const commitName = () => {
    setEditingName(false);
    if (project && nameDraft.trim() && nameDraft.trim() !== project.name) renameProject(project.id, nameDraft.trim());
  };

  return (
    <header className="relative flex h-12 shrink-0 items-center gap-2 border-b border-[#2E2E2E] bg-[#0A0A0A] px-3 text-[#F2F2F2]">
      <button type="button" onClick={openDashboard} className="flex shrink-0 items-center gap-2 rounded-md px-1 py-1 hover:bg-[#242424]" aria-label="Back to dashboard" title="Back to dashboard">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Vidora logo" className="h-7 w-7" />
        <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-lg font-bold text-transparent">Vidora</span>
      </button>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => { setMenuOpen((v) => !v); setMoreOpen(false); }}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-[#242424]"
        >
          Menu <IconChevronDown size={14} />
        </button>
        {menuOpen && (
          <div role="menu" className="absolute left-0 z-50 mt-1 w-52 rounded-lg border border-[#3D3D3D] bg-[#1E1E1E] py-1 text-sm shadow-lg">
            {[
              { label: 'New project', run: () => { setMenuOpen(false); onNewProject(); } },
              { label: 'Open dashboard', run: () => { setMenuOpen(false); openDashboard(); } },
              { label: 'Shortcuts', run: () => { setMenuOpen(false); onShowShortcuts(); } },
              { label: 'Settings', run: () => { setMenuOpen(false); onShowSettings(); } },
              { label: 'Help', run: () => { setMenuOpen(false); onShowHelp(); } },
            ].map((item) => (
              <button key={item.label} type="button" role="menuitem" onClick={item.run} className="block w-full px-3 py-2 text-left hover:bg-[#242424]">
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Centered, editable project name (B1). */}
      <div className="flex min-w-0 flex-1 justify-center">
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') setEditingName(false); }}
            aria-label="Project name"
            className="w-64 rounded-md border border-[#00D9D9] bg-[#242424] px-2 py-1 text-center text-sm outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => { setNameDraft(project?.name ?? 'Untitled Project'); setEditingName(true); }}
            title="Click to rename"
            className="max-w-72 truncate rounded-md px-2 py-1 text-sm text-[#F2F2F2] hover:bg-[#242424]"
          >
            {project?.name ?? 'Untitled Project'}
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={onToggleSidebar} aria-pressed={sidebarVisible} title={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'} className="rounded-md p-2 text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]">
          <IconLayout size={18} />
        </button>
        <button type="button" onClick={onToggleTimeline} aria-pressed={timelineVisible} title={timelineVisible ? 'Hide timeline' : 'Show timeline'} className="rounded-md p-2 text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]">
          <IconChevronDown size={18} />
        </button>
        <span
          className="rounded-md p-2 text-[#00D9D9]"
          title={dirty ? 'Saving…' : lastSavedAt ? `All changes saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'All changes saved'}
          aria-label={dirty ? 'Saving' : 'All changes saved'}
        >
          <IconCloud size={18} />
        </span>
      </div>

      <button
        type="button"
        onClick={() => setProOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#7C3AED] px-2.5 py-1.5 text-sm font-semibold text-[#C4B5FD] hover:bg-[#242424]"
        title="Pro"
      >
        <IconPro size={15} />
        Pro
      </button>
      <button type="button" onClick={onShare} className="flex shrink-0 items-center gap-1.5 rounded-md border border-[#3D3D3D] px-3 py-1.5 text-sm hover:bg-[#242424]" title="Share">
        <IconShare size={15} />
        Share
      </button>
      <button
        type="button"
        onClick={onExport}
        className="flex shrink-0 items-center gap-2 rounded-md bg-[#00D9D9] px-4 py-1.5 text-sm font-semibold text-[#062A2A] hover:bg-[#00C5C5]"
        title="Export"
      >
        <IconExport size={16} />
        Export
      </button>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => { setMoreOpen((v) => !v); setMenuOpen(false); }}
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          className="rounded-md border border-[#3D3D3D] px-2 py-1.5 text-sm hover:bg-[#242424]"
          title="More options"
        >
          …
        </button>
        {moreOpen && (
          <div role="menu" className="absolute right-0 z-50 mt-1 w-60 rounded-lg border border-[#3D3D3D] bg-[#1E1E1E] py-1 text-sm shadow-lg">
            <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); onShowFeatureUsage(); }} className="block w-full px-3 py-2 text-left hover:bg-[#242424]">
              Feature usage
            </button>
            <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); setShowTaskBar(!showTaskBar); }} className="block w-full px-3 py-2 text-left hover:bg-[#242424]">
              Task bar — {showTaskBar ? 'Shown' : 'Hidden'}
            </button>
            <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); onToggleSidebar(); }} className="block w-full px-3 py-2 text-left hover:bg-[#242424]">
              Sidebar — {sidebarVisible ? 'Shown' : 'Hidden'}
            </button>
            <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); onShowHelp(); }} className="block w-full px-3 py-2 text-left hover:bg-[#242424]">
              Help
            </button>
            <button type="button" role="menuitem" onClick={() => { setMoreOpen(false); onShowSettings(); }} className="block w-full px-3 py-2 text-left hover:bg-[#242424]">
              Settings
            </button>
          </div>
        )}
      </div>

      {proOpen && (
        <div role="dialog" aria-modal="true" aria-label="Pro" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setProOpen(false)}>
          <div className="w-80 rounded-lg border border-[#3D3D3D] bg-[#1E1E1E] p-4 text-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <span className="text-[#7C3AED]"><IconPro size={18} /></span> Pro
            </h2>
            <p className="mt-2 leading-relaxed text-[#A8A8A8]">
              Pro features are included in this build. Nothing is charged.
            </p>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setProOpen(false)} className="rounded-md bg-[#00D9D9] px-4 py-1.5 font-semibold text-[#062A2A]">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
