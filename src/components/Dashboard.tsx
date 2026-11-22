import { useMemo, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { IconClock, IconFolder, IconPlus } from './icons';

/** Dashboard (SPEC A, Phase 1): new / recent / drafts with rename, duplicate, delete. */
export default function Dashboard() {
  const [tab, setTab] = useState<'recent' | 'drafts'>('recent');
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const projects = useProjectStore((s) => s.projects);
  const openProject = useProjectStore((s) => s.openProject);
  const createProject = useProjectStore((s) => s.createProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const recoveredNotice = useProjectStore((s) => s.recoveredNotice);
  const dismissRecovery = useProjectStore((s) => s.dismissRecovery);
  const theme = useProjectStore((s) => s.theme);
  const setTheme = useProjectStore((s) => s.setTheme);

  const sorted = useMemo(() => [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [projects]);
  const drafts = useMemo(() => sorted.filter((p) => p.isDraft || p.tracks.every((t) => t.clips.length === 0)), [sorted]);
  const shown = tab === 'recent' ? sorted : drafts;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex h-14 items-center gap-3 border-b border-zinc-800 px-5">
        <img src="/logo.svg" alt="Vidora logo" className="h-8 w-8" />
        <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-xl font-bold text-transparent">Vidora</span>
        <span className="hidden text-xs tracking-widest text-zinc-500 uppercase sm:block">Create. Cut. Shine.</span>
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="ml-auto rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          title="Theme toggle (full light-theme styling lands in Phase 9 polish)"
        >
          Theme: {theme}
        </button>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-10">
        {recoveredNotice && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-3 text-sm" role="status">
            <span>{recoveredNotice}</span>
            <button type="button" onClick={dismissRecovery} className="rounded-md border border-zinc-700 px-2 py-1 text-xs">
              Dismiss
            </button>
          </div>
        )}
        <h1 className="text-3xl font-bold">Your projects</h1>
        <p className="mt-2 text-sm text-zinc-400">Start a new edit or pick up where you left off. Projects autosave every few seconds.</p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                createProject(newName || undefined);
                setNewName('');
              }
            }}
            placeholder="New project name (optional)"
            aria-label="New project name"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              createProject(newName || undefined);
              setNewName('');
            }}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white"
          >
            <IconPlus size={18} />
            New Project
          </button>
        </div>
        <div className="mt-10 flex gap-2 border-b border-zinc-800" role="tablist" aria-label="Project lists">
          {(['recent', 'drafts'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm capitalize ${tab === t ? 'border-b-2 border-violet-500 text-white' : 'text-zinc-400 hover:text-zinc-100'}`}
            >
              {t} ({t === 'recent' ? sorted.length : drafts.length})
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
            <IconFolder size={16} />
            {tab === 'drafts' ? 'No drafts yet. A new project is a draft until it has clips on the timeline.' : 'No projects yet.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {shown.map((p) => {
              const clipCount = p.tracks.reduce((n, t) => n + t.clips.length, 0);
              return (
                <li key={p.id} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <button type="button" onClick={() => openProject(p)} className="flex min-w-0 flex-1 items-center gap-4 text-left" aria-label={`Open ${p.name}`}>
                    <span className="rounded-lg bg-violet-600/20 p-3 text-violet-300">
                      <IconFolder size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      {renamingId === p.id ? (
                        <input
                          value={renameValue}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameProject(p.id, renameValue);
                              setRenamingId(null);
                            }
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onBlur={() => {
                            renameProject(p.id, renameValue);
                            setRenamingId(null);
                          }}
                          aria-label="Rename project"
                          className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="block truncate font-medium">{p.name}</span>
                      )}
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                        <IconClock size={12} />
                        {p.aspectRatio} · {p.fps} fps · {p.tracks.length} tracks · {clipCount} clips · {p.media.length} media · updated{' '}
                        {new Date(p.updatedAt).toLocaleString()}
                      </span>
                    </span>
                  </button>
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(p.id);
                        setRenameValue(p.name);
                      }}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
                    >
                      Rename
                    </button>
                    <button type="button" onClick={() => duplicateProject(p.id)} className="rounded-md border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800">
                      Duplicate
                    </button>
                    {confirmDeleteId === p.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          deleteProject(p.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded-md border border-red-500 bg-red-500/20 px-2 py-1 text-xs text-red-300"
                      >
                        Confirm delete
                      </button>
                    ) : (
                      <button type="button" onClick={() => setConfirmDeleteId(p.id)} className="rounded-md border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800">
                        Delete
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
