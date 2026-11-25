import { useMemo, useRef, useState } from 'react';
import { AI_CLIPS, AI_IMAGES, AI_MUSIC_TRACKS, AI_SFX, withBase } from '../../lib/aiLibrary';
import { GrayButton, TealButton } from './HomeDialogs';

/**
 * Library page (CapCut desktop shot 17).
 * Generated assets = Vidora's AI library (music / clips / images / SFX,
 * all Vidora Originals). Elements = Characters / Locations / Props / Styles
 * groups drawn from the same AI images. Honest info bar: assets live on
 * this computer only — no cloud sync.
 */

type AssetKind = 'video' | 'image' | 'audio';
type LibFilter = 'All' | 'Videos' | 'Images' | 'Audio' | 'Documents';

interface LibAsset {
  duration?: number;
  file: string;
  kind: AssetKind;
  name: string;
  poster?: string;
  size?: number;
  sub: string;
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}
function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ALL_ASSETS: LibAsset[] = [
  ...AI_CLIPS.map((c) => ({
    duration: c.duration,
    file: c.file,
    kind: 'video' as const,
    name: c.name,
    poster: c.poster,
    size: c.size,
    sub: `${c.scene} · ${c.motion}`,
  })),
  ...AI_IMAGES.map((i) => ({
    file: i.file,
    kind: 'image' as const,
    name: i.name,
    size: i.size,
    sub: `${i.design} · ${i.kind}`,
  })),
  ...AI_MUSIC_TRACKS.map((t) => ({
    duration: t.duration,
    file: t.file,
    kind: 'audio' as const,
    name: t.name,
    size: t.size,
    sub: `${t.style} · ${t.bpm} BPM`,
  })),
  ...AI_SFX.map((s) => ({
    duration: s.duration,
    file: s.file,
    kind: 'audio' as const,
    name: s.name,
    size: s.size,
    sub: s.family,
  })),
];

const KIND_GRADIENT: Record<AssetKind, string> = {
  audio: 'linear-gradient(160deg,#0E7490,#164E63)',
  image: 'linear-gradient(160deg,#7C3AED,#312E81)',
  video: 'linear-gradient(160deg,#DB2777,#4C1D95)',
};

function EmptyState({ onStartCreating }: { onStartCreating: () => void }) {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="1.2" strokeLinecap="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="3" />
        <path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5" />
      </svg>
      <p className="mt-6 text-sm text-[#A8A8A8]">No assets yet</p>
      <TealButton className="mt-4" onClick={onStartCreating}>
        Start creating
      </TealButton>
    </div>
  );
}

export default function LibraryPage({ onStartCreating }: { onStartCreating: () => void }) {
  const [tab, setTab] = useState<'generated' | 'elements'>('generated');
  const [filter, setFilter] = useState<LibFilter>('All');
  const [favOnly, setFavOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sort, setSort] = useState<'Newest' | 'Name' | 'Duration'>('Newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshKey, setRefreshKey] = useState(0);
  const [favs, setFavs] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vidora.libraryFavs.v1') ?? '[]') as string[];
    } catch {
      return [];
    }
  });
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const assets = useMemo(() => {
    void refreshKey;
    let list = [...ALL_ASSETS];
    if (filter === 'Videos') list = list.filter((a) => a.kind === 'video');
    if (filter === 'Images') list = list.filter((a) => a.kind === 'image');
    if (filter === 'Audio') list = list.filter((a) => a.kind === 'audio');
    if (filter === 'Documents') list = [];
    if (favOnly) list = list.filter((a) => favs.includes(a.file));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((a) => `${a.name} ${a.sub}`.toLowerCase().includes(q));
    }
    if (sort === 'Name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'Duration') list.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, favOnly, query, sort, refreshKey, favs]);

  const toggleFav = (file: string) => {
    setFavs((prev) => {
      const next = prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file];
      try {
        localStorage.setItem('vidora.libraryFavs.v1', JSON.stringify(next));
      } catch {
        /* session-only */
      }
      return next;
    });
  };

  const togglePlay = (a: LibAsset) => {
    if (playingId === a.file) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = a.file;
    audioRef.current.play().catch(() => setPlayingId(null));
    audioRef.current.onended = () => setPlayingId(null);
    setPlayingId(a.file);
  };

  const openAsset = (a: LibAsset) => {
    if (a.kind === 'audio') {
      togglePlay(a);
      return;
    }
    window.open(a.file, '_blank', 'noopener');
  };

  // Elements tab groups, drawn from the real AI image catalog.
  const elementGroups = useMemo(() => {
    const has = (i: (typeof AI_IMAGES)[number], words: string[]) =>
      words.some((w) => `${i.name} ${i.design} ${i.tags.join(' ')}`.toLowerCase().includes(w));
    return [
      { items: AI_IMAGES.filter((i) => has(i, ['portrait', 'character', 'person', 'face'])), title: 'Characters' },
      { items: AI_IMAGES.filter((i) => has(i, ['landscape', 'scene', 'coast', 'city', 'mountain', 'forest'])), title: 'Locations' },
      { items: AI_IMAGES.filter((i) => i.kind === 'sticker'), title: 'Props' },
      { items: AI_IMAGES.filter((i) => i.kind === 'texture' || i.kind === 'frame'), title: 'Styles' },
    ];
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#F2F2F2]">Library</h1>
      <div className="mt-5 flex gap-6 border-b border-[#2E2E2E]" role="tablist" aria-label="Library tabs">
        {(
          [
            ['generated', 'Generated assets'],
            ['elements', 'Elements'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`pb-2 text-sm font-medium ${
              tab === key ? 'border-b-2 border-[#00D9D9] text-[#F2F2F2]' : 'text-[#A8A8A8] hover:text-[#F2F2F2]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'generated' ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(['All', 'Videos', 'Images', 'Audio', 'Documents'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  filter === f ? 'font-semibold text-[#062A2A]' : 'bg-[#242424] text-[#A8A8A8] hover:text-[#F2F2F2]'
                }`}
                style={filter === f ? { background: '#00D9D9' } : undefined}
              >
                {f}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-2">
              {showSearch && (
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search assets"
                  aria-label="Search assets"
                  className="w-44 rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-1.5 text-sm text-[#F2F2F2] placeholder:text-[#6E6E6E] focus:border-[#00D9D9] focus:outline-none"
                />
              )}
              <button
                type="button"
                onClick={() => setShowSearch((v) => !v)}
                aria-label="Search"
                className="rounded-lg p-2 text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setFavOnly((v) => !v)}
                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm ${favOnly ? 'text-[#00D9D9]' : 'text-[#A8A8A8] hover:text-[#F2F2F2]'}`}
              >
                {favOnly ? '★' : '☆'} Favorites
              </button>
              <button
                type="button"
                onClick={() => setViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
                className="rounded-lg px-2 py-1.5 text-sm text-[#A8A8A8] hover:text-[#F2F2F2]"
              >
                ▦ Grid
              </button>
              <label className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-[#A8A8A8]">
                Sort
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as 'Newest' | 'Name' | 'Duration')}
                  aria-label="Sort assets"
                  className="bg-transparent text-[#F2F2F2] focus:outline-none"
                >
                  <option value="Newest">Newest</option>
                  <option value="Name">Name</option>
                  <option value="Duration">Duration</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                aria-label="Refresh"
                title="Refresh"
                className="rounded-lg p-2 text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]"
              >
                ↻
              </button>
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#1E1E1E] px-4 py-3 text-sm text-[#A8A8A8]">
            <span className="text-[#00D9D9]">✦</span>
            Your generated assets live on this computer.
          </div>

          {assets.length === 0 ? (
            <EmptyState onStartCreating={onStartCreating} />
          ) : viewMode === 'grid' ? (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {assets.map((a) => (
                <article key={a.file}>
                  <button
                    type="button"
                    onClick={() => openAsset(a)}
                    aria-label={`${a.kind === 'audio' ? (playingId === a.file ? 'Pause' : 'Play') : 'Open'} ${a.name}`}
                    className="relative block aspect-video w-full overflow-hidden rounded-xl"
                    style={{ background: KIND_GRADIENT[a.kind] }}
                  >
                    {a.poster || a.kind === 'image' ? (
                      <img
                        src={a.poster ?? a.file}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-2xl text-white/80">
                        {a.kind === 'audio' ? (playingId === a.file ? '⏸' : '▶') : '▶'}
                      </span>
                    )}
                    {a.duration !== undefined && (
                      <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                        {formatDuration(a.duration)}
                      </span>
                    )}
                  </button>
                  <span className="mt-2 flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-[#F2F2F2]">{a.name}</span>
                      <span className="block truncate text-xs text-[#6E6E6E]">
                        {a.sub}
                        {a.size !== undefined ? ` · ${formatBytes(a.size)}` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleFav(a.file)}
                      aria-label={favs.includes(a.file) ? 'Remove from favorites' : 'Add to favorites'}
                      className="shrink-0 text-base leading-none text-[#A8A8A8] hover:text-[#00D9D9]"
                    >
                      {favs.includes(a.file) ? '★' : '☆'}
                    </button>
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-[#2E2E2E]">
              {assets.map((a) => (
                <li key={a.file} className="flex items-center gap-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => openAsset(a)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-label={`${a.kind === 'audio' ? 'Play' : 'Open'} ${a.name}`}
                  >
                    <span
                      className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ background: KIND_GRADIENT[a.kind] }}
                    >
                      {a.kind === 'audio' ? '♪' : '▶'}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-[#F2F2F2]">{a.name}</span>
                      <span className="block truncate text-xs text-[#6E6E6E]">
                        {a.sub}
                        {a.duration !== undefined ? ` · ${formatDuration(a.duration)}` : ''}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFav(a.file)}
                    aria-label="Toggle favorite"
                    className="text-base text-[#A8A8A8] hover:text-[#00D9D9]"
                  >
                    {favs.includes(a.file) ? '★' : '☆'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="mt-6 space-y-8">
          {elementGroups.map((g) => (
            <section key={g.title}>
              <h2 className="text-base font-semibold text-[#F2F2F2]">
                {g.title} <span className="ml-1 text-sm font-normal text-[#6E6E6E]">({g.items.length})</span>
              </h2>
              {g.items.length === 0 ? (
                <p className="mt-3 text-sm text-[#6E6E6E]">No elements in this group yet.</p>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {g.items.slice(0, 12).map((i) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => window.open(withBase(i.file), '_blank', 'noopener')}
                      className="overflow-hidden rounded-xl text-left"
                      aria-label={`Open ${i.name}`}
                    >
                      <img
                        src={withBase(i.file)}
                        alt={i.name}
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="mt-1 block truncate text-xs text-[#A8A8A8]">{i.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
          <GrayButton onClick={onStartCreating}>Start creating</GrayButton>
        </div>
      )}
    </div>
  );
}
