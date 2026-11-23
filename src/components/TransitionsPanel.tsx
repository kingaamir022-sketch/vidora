import { useMemo, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { TRANSITION_CATEGORIES, TRANSITION_TYPES, searchTransitions, type TransitionCategory } from '../lib/transitions';
import type { TransitionType } from '../schema/project';

/** Transitions panel (Phase 2, SPEC E; Phase 5: 32 transitions with
 * search + category filter). Left panel for the Transitions tab. */
export default function TransitionsPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const setTransition = useProjectStore((s) => s.setTransition);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TransitionCategory | 'All'>('All');

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const tr = clip?.transitionIn ?? null;
  const results = useMemo(() => {
    const found = searchTransitions(query);
    return category === 'All' ? found : found.filter((t) => t.category === category);
  }, [query, category]);

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4 text-zinc-100" aria-label="Transitions">
      <h2 className="text-sm font-semibold">Transitions</h2>
      {!clip && <p className="mt-2 text-xs text-zinc-400">Select a clip on the timeline to give it an incoming transition.</p>}
      {clip && (
        <div className="mt-3 space-y-3">
          <p className="text-[11px] leading-relaxed text-zinc-500">
            The transition plays at the start of “{clip.name}”, blending in from the previous clip on the same track.
          </p>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transitions…"
            aria-label="Search transitions"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
          />
          <div className="flex flex-wrap gap-1">
            {(['All', ...TRANSITION_CATEGORIES] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`rounded-full border px-2 py-0.5 text-[11px] ${category === c ? 'border-violet-500 bg-violet-600/20 text-violet-200' : 'border-zinc-700 text-zinc-400'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {results.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.description}
                onClick={() => setTransition({ direction: tr?.direction ?? 'right', duration: tr?.duration ?? 0.5, type: t.id as TransitionType })}
                className={`rounded-md border px-2 py-2 text-left text-[11px] capitalize ${tr?.type === t.id ? 'border-violet-500 bg-violet-600/20 text-violet-200' : 'border-zinc-700 hover:border-zinc-500'}`}
              >
                {t.id}
              </button>
            ))}
            {results.length === 0 && <p className="col-span-2 text-[11px] text-zinc-500">No transitions match “{query}”.</p>}
            <button
              type="button"
              onClick={() => setTransition(null)}
              className={`rounded-md border px-2 py-2 text-left text-[11px] ${!tr ? 'border-violet-500 bg-violet-600/20 text-violet-200' : 'border-zinc-700 hover:border-zinc-500'}`}
            >
              None
            </button>
          </div>
          {tr && (
            <>
              <label className="flex items-center gap-2 text-xs">
                Duration
                <input
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.05}
                  value={tr.duration}
                  onChange={(e) => setTransition({ ...tr, duration: Number(e.target.value) })}
                  className="flex-1"
                  aria-label="Transition duration"
                />
                <span className="w-12 text-right font-mono">{tr.duration.toFixed(2)}s</span>
              </label>
              <label className="flex items-center justify-between gap-2 text-xs">
                Direction
                <select
                  value={tr.direction}
                  onChange={(e) => setTransition({ ...tr, direction: e.target.value as 'left' | 'right' | 'up' | 'down' })}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
                >
                  <option value="right">Right</option>
                  <option value="left">Left</option>
                  <option value="up">Up</option>
                  <option value="down">Down</option>
                </select>
              </label>
              <p className="text-[11px] text-zinc-500">{TRANSITION_TYPES.find((t) => t.id === tr.type)?.description}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
