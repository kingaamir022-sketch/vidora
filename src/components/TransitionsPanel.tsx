import { useMemo, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { TRANSITION_TYPES, searchTransitions } from '../lib/transitions';
import type { TransitionType } from '../schema/project';
import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';

/** Transitions panel (Phase 2, SPEC E; Phase 5: 32 transitions with
 * search + category filter). CapCut-fix (2026-11-25, J1–J3): sub-nav
 * Favorites + Transitions (Trending, Classic, NEW, Hits, Pals,
 * Overlay, Light). "Pals" is the original name in CapCut's "B.Duck"
 * slot (character IP — never used). Dismissible hint banner (J2) and
 * the 2-col card grid (D3). Transition names stay Vidora Originals. */
export const TRANSITION_NAV = ['Trending', 'Classic', 'NEW', 'Hits', 'Pals', 'Overlay', 'Light'] as const;

function transitionNavFilter(nav: string): (t: { category: string }) => boolean {
  switch (nav) {
    case 'Classic':
      return (t) => t.category === 'Fade';
    case 'NEW':
      return (t) => t.category === 'Camera';
    case 'Hits':
      return (t) => t.category === 'Slide';
    case 'Pals':
      return (t) => t.category === 'Shape';
    case 'Overlay':
      return (t) => t.category === 'Wipe';
    case 'Light':
      return (t) => t.category === 'Pixel';
    default:
      return () => true;
  }
}

export default function TransitionsPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const setTransition = useProjectStore((s) => s.setTransition);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('Trending');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vidora.transition-favorites.v1') ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (id: string) => {
    setFavorites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      localStorage.setItem('vidora.transition-favorites.v1', JSON.stringify(next));
      return next;
    });
  };

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const tr = clip?.transitionIn ?? null;
  const results = useMemo(() => {
    const found = searchTransitions(query);
    if (query) return found;
    if (category === 'Favorites') return found.filter((t) => favorites.includes(t.id));
    if (category === 'Trending') return found.slice(0, 12);
    return found.filter(transitionNavFilter(category));
  }, [query, category, favorites]);

  return (
    <PanelShell
      subNav={<>
        <SubNavItem active={category === 'Favorites'} onClick={() => setCategory('Favorites')}>Favorites</SubNavItem>
        <SubNavGroup title="Transitions">
          {TRANSITION_NAV.map((n) => (
            <SubNavItem key={n} active={category === n} onClick={() => setCategory(n)}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
      </>}
    >
      {!bannerDismissed && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-[#2E2E2E] bg-[#242424] px-2.5 py-2 text-[11px] leading-relaxed text-[#A8A8A8]">
          <span>Drag and drop a transition between two clips on the timeline.</span>
          <button type="button" onClick={() => setBannerDismissed(true)} className="shrink-0 rounded-md bg-[#00D9D9] px-2.5 py-1 font-semibold text-[#062A2A]">OK</button>
        </div>
      )}
      {!clip && <p className="mt-2 text-xs text-zinc-400">Select a clip on the timeline to give it an incoming transition.</p>}
      {clip && (
        <div className="mt-3 space-y-3">
          <p className="text-[11px] leading-relaxed text-zinc-500">
            The transition plays at the start of “{clip.name}”, blending in from the previous clip on the same track.
          </p>
          <PanelSearch value={query} onChange={setQuery} placeholder="People are searching transitions" />
          <SectionHeading>{query ? `Results for "${query}"` : category}</SectionHeading>
          <div className="grid grid-cols-2 gap-2">
            {results.map((t) => (
              <div key={t.id} className={`relative overflow-hidden rounded-lg border ${tr?.type === t.id ? 'border-[#00D9D9]' : 'border-[#2E2E2E] hover:border-[#3D3D3D]'} bg-[#242424]`}>
                <button
                  type="button"
                  title={t.description}
                  onClick={() => setTransition({ direction: tr?.direction ?? 'right', duration: tr?.duration ?? 0.5, type: t.id as TransitionType })}
                  className="block w-full text-left"
                >
                  <span className="flex h-14 w-full items-center justify-center bg-gradient-to-br from-[#3D3D3D] via-[#242424] to-[#141414] text-lg font-bold capitalize text-[#F2F2F2]">{t.id[0]}</span>
                  <span className="block truncate px-2 py-1 text-[11px] capitalize">{t.id}</span>
                </button>
                <button type="button" onClick={() => toggleFavorite(t.id)} aria-pressed={favorites.includes(t.id)} aria-label={`Favorite ${t.id}`} className={`absolute right-1 top-1 rounded p-0.5 ${favorites.includes(t.id) ? 'text-[#FFD34D]' : 'text-[#A8A8A8] hover:text-[#F2F2F2]'}`}>★</button>
              </div>
            ))}
            {results.length === 0 && <p className="col-span-2 text-[11px] text-zinc-500">No transitions match “{query}”.</p>}
            <button
              type="button"
              onClick={() => setTransition(null)}
              className={`rounded-lg border px-2 py-2 text-left text-[11px] ${!tr ? 'border-[#00D9D9] bg-[#00D9D9]/10 text-[#00D9D9]' : 'border-[#2E2E2E] hover:border-[#3D3D3D]'}`}
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
    </PanelShell>
  );
}
