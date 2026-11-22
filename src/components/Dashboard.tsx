import { useState } from 'react';
import { SAMPLE_PROJECT } from '../schema/project';
import { useProjectStore } from '../store/projectStore';
import { IconClock, IconFolder, IconPlus } from './icons';

/** Dashboard (SPEC Section A, Phase 0 scope): New / Recent / Drafts. One original sample project ships with Phase 0. */
export default function Dashboard() {
  const [tab, setTab] = useState<'recent' | 'drafts'>('recent');
  const openProject = useProjectStore((s) => s.openProject);
  const newProject = useProjectStore((s) => s.newProject);
  const theme = useProjectStore((s) => s.theme);
  const setTheme = useProjectStore((s) => s.setTheme);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex h-14 items-center gap-3 border-b border-zinc-800 px-5">
        <img src="/logo.svg" alt="Vidora logo" className="h-8 w-8" />
        <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-xl font-bold text-transparent">
          Vidora
        </span>
        <span className="hidden text-xs tracking-widest text-zinc-500 uppercase sm:block">
          Create. Cut. Shine.
        </span>
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
        <h1 className="text-3xl font-bold">Your projects</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Start a new edit or pick up where you left off. Phase 0 ships one sample project.
        </p>
        <button
          type="button"
          onClick={newProject}
          className="mt-6 flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white"
        >
          <IconPlus size={18} />
          New Project
        </button>
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
              {t}
            </button>
          ))}
        </div>
        {tab === 'recent' ? (
          <ul className="mt-4 space-y-3">
            <li>
              <button
                type="button"
                onClick={() => openProject(SAMPLE_PROJECT)}
                className="flex w-full items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left hover:border-violet-500/60"
              >
                <span className="rounded-lg bg-violet-600/20 p-3 text-violet-300">
                  <IconFolder size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{SAMPLE_PROJECT.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                    <IconClock size={12} />
                    Sample project · 16:9 · 30 fps · {SAMPLE_PROJECT.tracks.length} tracks · 1 clip
                  </span>
                </span>
                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">Open</span>
              </button>
            </li>
          </ul>
        ) : (
          <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
            <IconFolder size={16} />
            No drafts yet. Drafts appear here after Phase 1 autosave.
          </p>
        )}
      </main>
    </div>
  );
}
