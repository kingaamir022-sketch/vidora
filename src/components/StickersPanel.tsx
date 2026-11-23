import { useMemo, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { searchStickers, SHAPE_DEFS, shapeSvg, STICKER_CATEGORIES, type StickerCategory } from '../lib/stickers';

/**
 * Stickers panel (Phase 3, SPEC H — H-STICKER, H-SHAPE, H-DRAW).
 * Reference: desktop screenshot 22-editor-stickers.png — search box,
 * category list (Yours / Stickers / Trending / Black Friday / Classic /
 * NEW / Animal Meme / Free Fire / Shapes), grid cards with download +
 * Pro badges. Vidora's categories and all sticker artwork are ORIGINAL
 * procedural SVG (src/lib/stickers.ts); there are no downloads and no
 * Pro badges because every sticker is built in.
 */
export default function StickersPanel() {
  const addStickerClip = useProjectStore((s) => s.addStickerClip);
  const addShapeClip = useProjectStore((s) => s.addShapeClip);
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
  const [category, setCategory] = useState<StickerCategory>('Faces');
  const [shapeFill, setShapeFill] = useState('#7C3AED');

  const results = useMemo(() => searchStickers(query).filter((s) => (query ? true : s.category === category)), [query, category]);
  const selectedClip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const hasDrawing = Boolean(selectedClip?.drawing);

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4 text-zinc-100" aria-label="Stickers panel">
      <h2 className="text-sm font-semibold">Stickers</h2>
      <label className="mt-2 block">
        <span className="sr-only">Search stickers</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stickers"
          aria-label="Search stickers"
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
        />
      </label>

      <section className="mt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Categories</h3>
        <div className="mt-1 flex flex-wrap gap-1">
          {STICKER_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => { setCategory(c); setQuery(''); }}
              className={`rounded-md border px-2 py-0.5 text-[11px] ${category === c && !query ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-3">
        <h3 className="text-xs font-semibold text-zinc-300">
          {query ? `Results for "${query}" (${results.length})` : `${category} (${results.length})`}
        </h3>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {results.slice(0, 64).map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => addStickerClip(sticker.id)}
              title={sticker.name}
              aria-label={`Add sticker ${sticker.name}`}
              className="rounded-md border border-zinc-800 bg-zinc-900 p-1 hover:border-violet-500"
            >
              <img src={`data:image/svg+xml;utf8,${encodeURIComponent(sticker.svg)}`} alt={sticker.name} className="h-12 w-12" draggable={false} />
            </button>
          ))}
        </div>
        {results.length > 64 && <p className="mt-1 text-[11px] text-zinc-500">Showing 64 of {results.length} — refine your search to see more.</p>}
        {results.length === 0 && <p className="mt-2 text-[11px] text-zinc-500">No stickers match. Try another word.</p>}
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          Click a sticker to add it as a 3-second clip at the playhead. All {224} stickers are original procedural SVG — no downloads, no Pro locks.
        </p>
      </section>

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
          className={`w-full rounded-md border px-2 py-1.5 text-xs ${drawMode ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
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
    </div>
  );
}
