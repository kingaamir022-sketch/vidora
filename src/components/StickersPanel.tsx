import { useMemo, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { searchStickers, SHAPE_DEFS, shapeSvg, STICKER_CATALOG } from '../lib/stickers';
import { LOOP_ANIMATION_LABELS } from '../lib/text';
import type { LoopAnimationKind } from '../schema/project';
import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';

/**
 * Stickers panel (Phase 3, SPEC H — H-STICKER, H-SHAPE, H-DRAW).
 * CapCut-fix (2026-11-25, H1/H2): sub-nav Yours (Favorites) +
 * Stickers (Trending, Sale, Classic, NEW, Animal Meme, Squad, Shapes).
 * "Sale" is the original name in CapCut's "Black Friday" slot and
 * "Squad" is the original name in the "Free Fire" slot (a game brand —
 * never used). All sticker artwork is ORIGINAL procedural SVG
 * (src/lib/stickers.ts). 2-col dark cards (D3) with a ◆ badge on
 * featured items and a download icon that saves the sticker SVG.
 */
export const STICKER_NAV = ['Trending', 'Sale', 'Classic', 'NEW', 'Animal Meme', 'Squad', 'Shapes'] as const;

function stickerNavFilter(nav: string): (s: { category: string }) => boolean {
  switch (nav) {
    case 'Trending':
      return (s) => s.category === 'Faces' || s.category === 'Badges';
    case 'Sale':
      return (s) => s.category === 'Celebration' || s.category === 'Badges';
    case 'Classic':
      return (s) => s.category === 'Faces' || s.category === 'Symbols';
    case 'NEW':
      return (s) => s.category === 'Celebration' || s.category === 'Nature';
    case 'Animal Meme':
      return (s) => s.category === 'Nature';
    case 'Squad':
      return (s) => s.category === 'Arrows' || s.category === 'Speech';
    case 'Shapes':
      return (s) => s.category === 'Shapes';
    default:
      return () => true;
  }
}

function downloadSvg(svg: string, name: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StickersPanel() {
  const addStickerClip = useProjectStore((s) => s.addStickerClip);
  const addShapeClip = useProjectStore((s) => s.addShapeClip);
  const updateSelectedClip = useProjectStore((s) => s.updateSelectedClip);
  const drawMode = useProjectStore((s) => s.drawMode);
  const setDrawMode = useProjectStore((s) => s.setDrawMode);
  const drawColor = useProjectStore((s) => s.drawColor);
  const setDrawColor = useProjectStore((s) => s.setDrawColor);
  const drawWidth = useProjectStore((s) => s.drawWidth);
  const setDrawWidth = useProjectStore((s) => s.setDrawWidth);
  const clearDrawing = useProjectStore((s) => s.clearDrawing);
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('Trending');
  const [shapeFill, setShapeFill] = useState('#7C3AED');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vidora.sticker-favorites.v1') ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (id: string) => {
    setFavorites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      localStorage.setItem('vidora.sticker-favorites.v1', JSON.stringify(next));
      return next;
    });
  };

  const results = useMemo(() => {
    const found = searchStickers(query);
    if (query) return found;
    if (category === 'Favorites') return found.filter((s) => favorites.includes(s.id));
    if (category === 'Trending') return found.filter(stickerNavFilter('Trending')).slice(0, 32);
    if (category === 'NEW') return found.filter(stickerNavFilter('NEW')).slice(-32);
    return found.filter(stickerNavFilter(category));
  }, [query, category, favorites]);
  const selectedClip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const hasDrawing = Boolean(selectedClip?.drawing);

  return (
    <PanelShell
      subNav={<>
        <SubNavGroup title="Yours">
          <SubNavItem active={category === 'Favorites'} onClick={() => setCategory('Favorites')}>Favorites</SubNavItem>
        </SubNavGroup>
        <SubNavGroup title="Stickers">
          {STICKER_NAV.map((n) => (
            <SubNavItem key={n} active={category === n} onClick={() => setCategory(n)}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
      </>}
    >
      <PanelSearch value={query} onChange={setQuery} placeholder="People are searching stickers" />

      <section className="mt-3">
        <SectionHeading>
          {query ? `Results for "${query}" (${results.length})` : `${category} (${results.length})`}
        </SectionHeading>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {results.slice(0, 64).map((sticker) => (
            <div key={sticker.id} className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 hover:border-[#00D9D9]">
              <button
                type="button"
                onClick={() => addStickerClip(sticker.id)}
                title={sticker.name}
                aria-label={`Add sticker ${sticker.name}`}
                className="block w-full p-2"
              >
                <img src={`data:image/svg+xml;utf8,${encodeURIComponent(sticker.svg)}`} alt={sticker.name} className="mx-auto h-16 w-16" draggable={false} />
              </button>
              {category === 'Trending' && (
                <span className="absolute left-1 top-1 flex items-center rounded bg-[#7C3AED] px-1 py-0.5 text-[10px] leading-none text-white" title="Included in this build — nothing is charged.">◆</span>
              )}
              <button type="button" onClick={() => toggleFavorite(sticker.id)} aria-pressed={favorites.includes(sticker.id)} aria-label={`Favorite ${sticker.name}`} className={`absolute right-1 top-1 rounded p-0.5 ${favorites.includes(sticker.id) ? 'text-[#FFD34D]' : 'text-zinc-500 hover:text-zinc-200'}`}>★</button>
              <button type="button" onClick={() => downloadSvg(sticker.svg, sticker.name)} aria-label={`Download ${sticker.name} as SVG`} title="Download SVG" className="absolute bottom-1 right-1 rounded p-0.5 text-zinc-400 hover:text-zinc-100">⭳</button>
            </div>
          ))}
        </div>
        {results.length > 64 && <p className="mt-1 text-[11px] text-zinc-500">Showing 64 of {results.length} — refine your search to see more.</p>}
        {results.length === 0 && <p className="mt-2 text-[11px] text-zinc-500">No stickers match. Try another word.</p>}
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          Click a sticker to add it as a 3-second clip at the playhead. All {STICKER_CATALOG.length} stickers are original procedural SVG.
        </p>
      </section>

      {selectedClip?.type === 'sticker' && selectedClip.sticker && (
        <section className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
          <h3 className="text-xs font-semibold text-zinc-300">Motion — “{selectedClip.name}”</h3>
          <label className="flex items-center gap-2 text-xs">
            Animated motion
            <select
              value={selectedClip.animationLoop?.kind ?? 'none'}
              onChange={(e) => updateSelectedClip({ animationLoop: { duration: selectedClip.animationLoop?.duration ?? 2, kind: e.target.value as LoopAnimationKind } })}
              aria-label="Sticker motion"
              className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
            >
              <option value="none">None</option>
              {(Object.keys(LOOP_ANIMATION_LABELS) as LoopAnimationKind[])
                .filter((k) => k.startsWith('motion-'))
                .map((k) => (
                  <option key={k} value={k}>{LOOP_ANIMATION_LABELS[k]}</option>
                ))}
            </select>
          </label>
          <p className="text-[11px] leading-relaxed text-zinc-500">28 original motion presets, generated as Lottie-style JSON by <span className="font-mono">npm run build:assets</span>. The same motions are available on text clips in the Properties panel.</p>
        </section>
      )}

      <section className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Shapes</h3>
        <label className="flex items-center gap-2 text-xs">
          Fill colour
          <input type="color" value={shapeFill} onChange={(e) => setShapeFill(e.target.value)} aria-label="Shape fill colour" className="h-6 w-10 cursor-pointer rounded border border-zinc-700 bg-zinc-900" />
          <span className="font-mono text-[11px] text-zinc-400">{shapeFill}</span>
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {SHAPE_DEFS.map((shape) => (
            <button
              key={shape.id}
              type="button"
              onClick={() => addShapeClip(shape.id, shapeFill)}
              title={`${shape.name} — ${shape.description}`}
              aria-label={`Add shape ${shape.name}`}
              className="rounded-md border border-zinc-800 bg-zinc-900 p-1 hover:border-violet-500"
            >
              <img src={`data:image/svg+xml;utf8,${encodeURIComponent(shapeSvg(shape.id, shapeFill))}`} alt={shape.name} className="h-10 w-10" draggable={false} />
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Draw</h3>
        <button
          type="button"
          onClick={() => setDrawMode(!drawMode)}
          aria-pressed={drawMode}
          className={`w-full rounded-md border px-2 py-1.5 text-xs ${drawMode ? 'border-violet-500 bg-[#00D9D9]/10' : 'border-zinc-700'}`}
        >
          {drawMode ? 'Stop drawing (click again)' : 'Draw on the preview'}
        </button>
        {drawMode && (
          <>
            <label className="flex items-center gap-2 text-xs">
              Pen colour
              <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} aria-label="Pen colour" className="h-6 w-10 cursor-pointer rounded border border-zinc-700 bg-zinc-900" />
            </label>
            <label className="flex items-center gap-2 text-xs">
              Pen width
              <input type="range" min={1} max={40} step={1} value={drawWidth} onChange={(e) => setDrawWidth(Number(e.target.value))} className="flex-1" aria-label="Pen width" />
              <span className="w-8 text-right font-mono">{drawWidth}px</span>
            </label>
            <p className="text-[11px] leading-relaxed text-zinc-500">Drag on the preview to draw freehand strokes. They are stored on a drawing clip (5s at the playhead, or on the selected drawing clip).</p>
          </>
        )}
        {hasDrawing && (
          <button type="button" onClick={clearDrawing} className="w-full rounded-md border border-zinc-700 px-2 py-1.5 text-xs">
            Clear drawing strokes
          </button>
        )}
      </section>
    </PanelShell>
  );
}
