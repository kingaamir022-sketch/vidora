import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { searchTransitions } from '../lib/transitions';
import type { TransitionType } from '../schema/project';
import {
  TRANSITION_FROM_SRC,
  TRANSITION_TO_SRC,
  downloadDataUrlFile,
  loadSampleImage,
  transitionStillDataUrl,
} from '../lib/tileThumbs';
import { encodePanelDrag, PANEL_DRAG_MIME } from '../lib/panelDrag';
import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';

/** Transitions panel (Phase 2, SPEC E; Phase 5: 32 transitions with
 * search + category filter). CapCut-fix (2026-11-25, J1–J3): sub-nav
 * Favorites + Transitions (Trending, Classic, NEW, Hits, Pals,
 * Overlay, Light). "Pals" is the original name in CapCut's "B.Duck"
 * slot (character IP — never used). v1.0.2 (D12.2): search on top,
 * then heading, then the 2-col tile grid — the grid renders even with
 * no clip selected (CapCut #25 shows tiles with an empty project).
 * No description paragraph, no hint banner, no "select a clip" text.
 * Tile click with no clip selected is a no-op (setTransition in the
 * store returns early with no selection). Duration/Direction show only
 * when a transition is applied to the selected clip. Transition names
 * stay Vidora Originals.
 *
 * v1.0.2 (W4, D15): every tile is draggable onto a timeline clip
 * (applies the transition at that clip's start) or the preview, and
 * carries a visible "+" apply button (whole-tile click still applies
 * to the selected clip).
 *
 * v1.0.2 (W4, D16): tiles show a REAL preview still — the transition
 * frozen mid-way between two sample photos, rendered through the
 * preview's own drawTransition — never a single big letter (CapCut #25
 * shows real photo thumbnails). The download icon is REAL: it
 * downloads that mid-transition still as a PNG. There is NO Pro badge
 * — Vidora has no paid tier and every transition is included, so a Pro
 * diamond would be misleading.
 */
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

/** One tile's photo thumbnail: the transition frozen mid-way. The
 * still is computed once per tile and exposed for the download icon
 * via the onStill callback. */
function TransitionThumb({ type, onStill }: { type: TransitionType; onStill?: (dataUrl: string) => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([loadSampleImage(TRANSITION_FROM_SRC), loadSampleImage(TRANSITION_TO_SRC)]).then(([from, to]) => {
      if (!live || !from || !to) return;
      const url = transitionStillDataUrl(type, from, to);
      if (live) {
        setSrc(url);
        onStill?.(url);
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);
  if (!src) {
    return <span className="flex h-14 w-full items-center justify-center bg-[#1A1A1A] text-[11px] text-zinc-500">Loading photo…</span>;
  }
  return <img src={src} alt={`${type} preview`} className="h-14 w-full object-cover" />;
}

export default function TransitionsPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const setTransition = useProjectStore((s) => s.setTransition);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('Trending');
  const [stills, setStills] = useState<Record<string, string>>({});
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

  const applyTransition = (id: string) =>
    setTransition({ direction: tr?.direction ?? 'right', duration: tr?.duration ?? 0.5, type: id as TransitionType });

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
      <div className="mt-3 space-y-3">
        <PanelSearch value={query} onChange={setQuery} placeholder="People are searching transitions" />
        <SectionHeading>{query ? `Results for "${query}"` : category}</SectionHeading>
        <p className="text-[11px] text-zinc-500">Click a tile or its + to apply it to the selected clip — or drag a tile onto a clip on the timeline to put the transition at its start.</p>
        <div className="grid grid-cols-2 gap-2">
          {results.map((t) => (
            <div
              key={t.id}
              draggable
              onDragStart={(e) => {
                const payload = encodePanelDrag({ id: t.id, kind: 'transition' });
                e.dataTransfer.setData(PANEL_DRAG_MIME, payload);
                e.dataTransfer.setData('text/plain', payload);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className={`relative overflow-hidden rounded-lg border ${tr?.type === t.id ? 'border-[#00D9D9]' : 'border-[#2E2E2E] hover:border-[#3D3D3D]'} bg-[#242424]`}
            >
              <button
                type="button"
                title={t.description}
                onClick={() => applyTransition(t.id)}
                className="block w-full text-left"
              >
                <TransitionThumb type={t.id as TransitionType} onStill={(url) => setStills((prev) => (prev[t.id] === url ? prev : { ...prev, [t.id]: url }))} />
                <span className="block truncate py-1 pl-7 pr-2 text-[11px] capitalize">{t.id}</span>
              </button>
              <button type="button" onClick={() => applyTransition(t.id)} aria-label={`Apply transition ${t.id}`} title={`Apply transition ${t.id}`} className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#00D9D9] text-sm font-bold leading-none text-[#062A2A] hover:bg-[#00E5E5]">+</button>
              <button type="button" onClick={() => toggleFavorite(t.id)} aria-pressed={favorites.includes(t.id)} aria-label={`Favorite ${t.id}`} className={`absolute right-1 top-1 rounded bg-black/50 p-0.5 ${favorites.includes(t.id) ? 'text-[#FFD34D]' : 'text-[#A8A8A8] hover:text-[#F2F2F2]'}`}>★</button>
              <button
                type="button"
                onClick={() => {
                  const still = stills[t.id];
                  if (still) downloadDataUrlFile(`${t.id}-transition.png`, still);
                }}
                disabled={!stills[t.id]}
                aria-label={`Download ${t.id} preview still as PNG`}
                title="Download preview still (PNG)"
                className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-[13px] text-zinc-300 hover:text-white disabled:opacity-40"
              >
                ⭳
              </button>
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
      </div>
      {tr && (
        <div className="mt-3 space-y-3">
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
        </div>
      )}
    </PanelShell>
  );
}
