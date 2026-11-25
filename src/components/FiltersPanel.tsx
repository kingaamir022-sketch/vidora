import { useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { BUILTIN_LUTS, lutToCubeText, type BuiltinLut } from '../lib/lut';
import { FILTER_SAMPLE_SRC, downloadTextFile, loadSampleImage, lutPhotoDataUrl } from '../lib/tileThumbs';
import { encodePanelDrag, PANEL_DRAG_MIME } from '../lib/panelDrag';
import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';

/**
 * Filters tab (CapCut-fix 2026-11-25, L1–L3). Dedicated panel (it used
 * to reuse the Effects panel with lutFocus). Sub-nav: Favorites,
 * Filters ^ (Featured, NEW, Hits, Life, Landscape, Portrait, Mono),
 * Tools (Enhance, 4K, HD Upscale, Quality Restoration, Night-view
 * Color, HD Cam 2, HD Pet). 2-col grid of the 32 Vidora looks (D3).
 * The Tools entries open Vidora's Enhance / Upscale engines in the AI
 * tools overlay, labelled honestly (resample + sharpen, no detail
 * recovery).
 *
 * v1.0.2 (W4, D14): the applied-filter card (name + intensity + Clear)
 * renders ABOVE the tile grid — it used to sit below the grid, below
 * the fold, so applying a filter showed nothing.
 *
 * v1.0.2 (W4, D15): every tile is draggable onto a timeline clip or
 * the preview, and carries a visible "+" apply button (whole-tile
 * click still applies too). A filter on a sticker/text/audio selection
 * redirects to the video clip under the playhead and says so.
 *
 * v1.0.2 (W4, D16): every tile shows a SAMPLE PHOTO with the filter
 * actually applied (the LUT sampled over one of Vidora's own AI-library
 * posters through the same sampleLut the compositor uses) — CapCut #25
 * shows real photo thumbnails, never a flat gradient. The download
 * icon at bottom-right is REAL: it downloads the look as a .cube
 * preset. There is NO Pro badge — Vidora has no paid tier and every
 * look is included, so a Pro diamond would be misleading.
 */
export const FILTER_NAV = ['Featured', 'NEW', 'Hits', 'Life', 'Landscape', 'Portrait', 'Mono'] as const;
export const FILTER_TOOLS: { label: string; tool: string; note: string }[] = [
  { label: 'Enhance', note: 'Low-light + retouch (local enhancement)', tool: 'enhance' },
  { label: '4K', note: 'Upscale to 3840×2160 (resample + sharpen)', tool: 'upscale' },
  { label: 'HD Upscale', note: 'Upscale to 1920×1080 (resample + sharpen)', tool: 'upscale' },
  { label: 'Quality Restoration', note: 'Denoise + sharpen (no detail recovery)', tool: 'enhance' },
  { label: 'Night-view Color', note: 'Low-light colour lift', tool: 'enhance' },
  { label: 'HD Cam 2', note: 'Upscale + sharpen (resample, no detail recovery)', tool: 'upscale' },
  { label: 'HD Pet', note: 'Pet-photo enhancement (local enhancement)', tool: 'enhance' },
];

function filterNavFilter(nav: string): (l: { category: string }) => boolean {
  switch (nav) {
    case 'NEW':
      return (l) => l.category === 'Cool' || l.category === 'Soft';
    case 'Hits':
      return (l) => l.category === 'Vivid';
    case 'Life':
      return (l) => l.category === 'Warm';
    case 'Landscape':
      return (l) => l.category === 'Film';
    case 'Portrait':
      return (l) => l.category === 'Soft';
    case 'Mono':
      return (l) => l.category === 'Mono';
    default:
      return () => true;
  }
}

/** One tile's photo thumbnail: the sample photo with this LUT applied. */
function FilterPhotoThumb({ lut }: { lut: BuiltinLut }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void loadSampleImage(FILTER_SAMPLE_SRC).then((img) => {
      if (live && img) setSrc(lutPhotoDataUrl(lut, img));
    });
    return () => {
      live = false;
    };
  }, [lut]);
  if (!src) {
    return <span className="flex h-14 w-full items-center justify-center bg-[#1A1A1A] text-[11px] text-zinc-500">Loading photo…</span>;
  }
  return <img src={src} alt={`${lut.name} preview`} className="h-14 w-full object-cover" />;
}

export default function FiltersPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const setBuiltinLut = useProjectStore((s) => s.setBuiltinLut);
  const setLut = useProjectStore((s) => s.setLut);
  const importLutFile = useProjectStore((s) => s.importLutFile);
  const setAiToolsOverlay = useProjectStore((s) => s.setAiToolsOverlay);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('Featured');
  const [lutError, setLutError] = useState<string | null>(null);
  const [applyNote, setApplyNote] = useState<string | null>(null);
  const appliedRef = useRef<HTMLDivElement>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vidora.filter-favorites.v1') ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (id: string) => {
    setFavorites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      localStorage.setItem('vidora.filter-favorites.v1', JSON.stringify(next));
      return next;
    });
  };

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const results = useMemo(() => {
    const found = BUILTIN_LUTS.filter((l) => !query || `${l.name} ${l.category}`.toLowerCase().includes(query.toLowerCase()));
    if (category === 'Favorites') return found.filter((l) => favorites.includes(l.id));
    if (category === 'Featured') return found.slice(0, 12);
    return found.filter(filterNavFilter(category));
  }, [query, category, favorites]);

  const onImportLut = async (file: File | undefined) => {
    if (!file) return;
    const err = await importLutFile(file);
    setLutError(err);
  };

  const applyFilter = (lutName: string) => {
    const res = setBuiltinLut(lutName);
    if (res.status === 'redirected') {
      setApplyNote(`“${clip?.name ?? ''}” can't show a filter — applied to the video clip “${res.targetName ?? ''}” under the playhead instead.`);
    } else if (res.status === 'blocked') {
      setApplyNote('This clip can’t show a filter, and there is no video clip under the playhead to apply it to.');
    } else {
      setApplyNote(null);
    }
    requestAnimationFrame(() => appliedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const downloadLut = (lut: BuiltinLut) => {
    const safe = lut.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    downloadTextFile(`${safe}.cube`, lutToCubeText(lut.name, lut.size, lut.data));
  };

  return (
    <PanelShell
      subNav={<>
        <SubNavItem active={category === 'Favorites'} onClick={() => setCategory('Favorites')}>Favorites</SubNavItem>
        <SubNavGroup title="Filters">
          {FILTER_NAV.map((n) => (
            <SubNavItem key={n} active={category === n} onClick={() => setCategory(n)}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
        <SubNavGroup title="Tools">
          {FILTER_TOOLS.map((t) => (
            <SubNavItem key={t.label} onClick={() => setAiToolsOverlay(t.tool)}>{t.label}</SubNavItem>
          ))}
        </SubNavGroup>
      </>}
    >
      <PanelSearch value={query} onChange={setQuery} placeholder="People are searching filters" />
      {!clip && <p className="mt-2 text-xs text-zinc-400">Select a clip on the timeline to apply a filter.</p>}
      {applyNote && (
        <p className="mt-2 rounded-md border border-[#2E2E2E] bg-[#242424] px-2.5 py-2 text-[11px] leading-relaxed text-[#A8A8A8]" role="status">
          {applyNote}
        </p>
      )}
      {/* D14: the applied-filter card sits ABOVE the grid. */}
      {clip?.lut && (
        <div ref={appliedRef} className="mt-3 rounded-md border border-zinc-800 bg-zinc-900 p-2 text-xs" aria-label="Applied filter">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">Applied filter — {clip.lut.name}</span>
            <button type="button" onClick={() => setLut(null)} className="rounded border border-zinc-700 px-1.5 text-zinc-400">
              Clear filter
            </button>
          </div>
          <label className="mt-1.5 flex items-center gap-2">
            Filter intensity
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={clip.lut.intensity}
              onChange={(e) => setLut({ ...clip.lut!, intensity: Number(e.target.value) })}
              className="flex-1"
              aria-label="Filter intensity"
            />
            <span className="w-10 text-right font-mono">{Math.round(clip.lut.intensity * 100)}%</span>
          </label>
        </div>
      )}
      <SectionHeading>{query ? `Results for "${query}"` : category}</SectionHeading>
      <p className="mt-1 text-[11px] text-zinc-500">Click a tile or its + to apply it — or drag a tile onto a video clip on the timeline or onto the preview.</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {results.map((lut) => {
          return (
            <div
              key={lut.id}
              draggable
              onDragStart={(e) => {
                const payload = encodePanelDrag({ id: lut.name, kind: 'filter' });
                e.dataTransfer.setData(PANEL_DRAG_MIME, payload);
                e.dataTransfer.setData('text/plain', payload);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className={`relative overflow-hidden rounded-lg border ${clip?.lut?.name === lut.name ? 'border-[#00D9D9]' : 'border-[#2E2E2E] hover:border-[#3D3D3D]'} bg-[#242424]`}
            >
              <button type="button" onClick={() => clip && applyFilter(lut.name)} disabled={!clip} title={lut.name} className="block w-full text-left disabled:opacity-60">
                <FilterPhotoThumb lut={lut} />
                <span className="block truncate py-1 pl-7 pr-2 text-[11px]">{lut.name}{clip?.lut?.name === lut.name ? ' ✓' : ''}</span>
              </button>
              <button type="button" onClick={() => clip && applyFilter(lut.name)} disabled={!clip} aria-label={`Apply filter ${lut.name}`} title={`Apply filter ${lut.name}`} className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#00D9D9] text-sm font-bold leading-none text-[#062A2A] hover:bg-[#00E5E5] disabled:opacity-40">+</button>
              <button type="button" onClick={() => toggleFavorite(lut.id)} aria-pressed={favorites.includes(lut.id)} aria-label={`Favorite ${lut.name}`} className={`absolute right-1 top-1 rounded bg-black/50 px-1 text-[13px] ${favorites.includes(lut.id) ? 'text-[#FFD34D]' : 'text-zinc-300 hover:text-white'}`}>★</button>
              <button type="button" onClick={() => downloadLut(lut)} aria-label={`Download ${lut.name} as a .cube file`} title="Download as .cube" className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-[13px] text-zinc-300 hover:text-white">⭳</button>
            </div>
          );
        })}
        {results.length === 0 && <p className="col-span-2 text-[11px] text-zinc-500">No filters match.</p>}
      </div>
      <section className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Import .cube file</h3>
        <label className="block text-xs">
          <span className="text-zinc-400">Import a .cube LUT to use as a filter</span>
          <input type="file" accept=".cube" onChange={(e) => void onImportLut(e.target.files?.[0])} className="mt-1 block w-full text-[11px] text-zinc-400" />
        </label>
        {lutError && <p className="text-[11px] text-red-400">{lutError}</p>}
        <p className="text-[11px] leading-relaxed text-zinc-500">
          All {BUILTIN_LUTS.length} looks are original Vidora designs. The Tools above open Vidora’s Enhance and Upscale engines — resample + sharpen, no detail recovery.
        </p>
      </section>
    </PanelShell>
  );
}
