import { useMemo, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { searchTemplates, type TemplateDef } from '../../lib/templates';
import { GrayButton, HomeModal, TealButton } from './HomeDialogs';

/**
 * Templates home page (CapCut desktop shots 05/06).
 * Search + 3 filter dropdowns + category chips in two rows + vertical 9:16
 * cards. Templates are Vidora Originals. View counts are real local usage
 * counts (localStorage, starting at 0) — never invented.
 */

const CATEGORY_CHIPS = [
  'For you',
  'Pro',
  'Daily life',
  'Selfie',
  'Velocity',
  'AI',
  'Lyrics',
  'Relationship',
  'Friendship',
  'Family',
  'Meme',
  'School life',
  'Travel',
  'Anniversary',
  'Fashion',
  'Sports',
  'Motivation',
] as const;

const FEATURED_IDS = new Set([
  'bold-open',
  'neon-intro',
  'reel-hook',
  'sale-reel',
  'product-launch',
  'travel-vlog',
  'sunrise-intro',
  'dance-reel',
]);

const USES_KEY = 'vidora.templateUses.v1';
const FAVS_KEY = 'vidora.templateFavs.v1';

function readUses(): Record<string, number> {
  try {
    const raw = localStorage.getItem(USES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}
function readFavs(): string[] {
  try {
    const raw = localStorage.getItem(FAVS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

const POSTER_GRADIENTS: Record<string, string> = {
  Intro: 'linear-gradient(160deg,#7C3AED 0%,#312E81 55%,#0F172A 100%)',
  Outro: 'linear-gradient(160deg,#0E7490 0%,#164E63 55%,#0F172A 100%)',
  Promo: 'linear-gradient(160deg,#EA580C 0%,#7C2D12 55%,#1C1917 100%)',
  Social: 'linear-gradient(160deg,#DB2777 0%,#4C1D95 55%,#0F172A 100%)',
  Vlog: 'linear-gradient(160deg,#059669 0%,#134E4A 55%,#0F172A 100%)',
};

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function clipCountOf(t: TemplateDef): number {
  return t.slots.length > 0 ? t.slots.length : t.items.length;
}

function chipMatches(t: TemplateDef, chip: string): boolean {
  switch (chip) {
    case 'For you':
      return true;
    case 'Pro':
      return FEATURED_IDS.has(t.id);
    case 'Daily life':
      return t.category === 'Vlog';
    case 'Selfie':
      return t.category === 'Social';
    case 'Velocity':
      return t.category === 'Intro';
    case 'AI':
      return t.category === 'Social' || t.description.toLowerCase().includes('ai');
    case 'Lyrics':
      return t.category === 'Outro';
    case 'Travel':
      return t.category === 'Vlog' && /travel|wander|road|diary/i.test(`${t.name} ${t.description}`);
    default: {
      const q = chip.toLowerCase();
      return `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(q);
    }
  }
}

export default function TemplatesPage() {
  const [query, setQuery] = useState('');
  const [orientation, setOrientation] = useState<'All' | '16:9' | '9:16'>('All');
  const [clips, setClips] = useState('No limit');
  const [duration, setDuration] = useState('No limit');
  const [chip, setChip] = useState<string>('For you');
  const [preview, setPreview] = useState<TemplateDef | null>(null);
  const [uses, setUses] = useState<Record<string, number>>(readUses);
  const [favs, setFavs] = useState<string[]>(readFavs);
  const useTemplate = useProjectStore((s) => s.useTemplate);

  const shown = useMemo(() => {
    let list = searchTemplates(query).filter((t) => chipMatches(t, chip));
    if (orientation !== 'All') list = list.filter((t) => t.ratio === orientation);
    if (clips !== 'No limit') {
      list = list.filter((t) => {
        const n = clipCountOf(t);
        return clips === '5+' ? n >= 5 : n === Number(clips);
      });
    }
    if (duration !== 'No limit') {
      list = list.filter((t) =>
        duration === 'Up to 5s' ? t.duration <= 5 : duration === 'Up to 10s' ? t.duration <= 10 : t.duration > 10,
      );
    }
    return list;
  }, [query, chip, orientation, clips, duration]);

  const recordUse = (id: string) => {
    setUses((prev) => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 };
      try {
        localStorage.setItem(USES_KEY, JSON.stringify(next));
      } catch {
        /* session-only */
      }
      return next;
    });
  };

  const toggleFav = (id: string) => {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVS_KEY, JSON.stringify(next));
      } catch {
        /* session-only */
      }
      return next;
    });
  };

  const openInEditor = (t: TemplateDef) => {
    recordUse(t.id);
    setPreview(null);
    useTemplate(t.id);
  };

  return (
    <div>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A8A8]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for templates"
          aria-label="Search for templates"
          className="w-full rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] py-3 pl-11 pr-4 text-sm text-[#F2F2F2] placeholder:text-[#6E6E6E] focus:border-[#00D9D9] focus:outline-none"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="flex items-center gap-1 rounded-lg bg-[#242424] px-3 py-1.5 text-sm text-[#F2F2F2]">
          Orientation:
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as 'All' | '16:9' | '9:16')}
            aria-label="Orientation filter"
            className="bg-transparent font-medium text-[#F2F2F2] focus:outline-none"
          >
            <option value="All">All</option>
            <option value="16:9">Landscape (16:9)</option>
            <option value="9:16">Portrait (9:16)</option>
          </select>
        </label>
        <label className="flex items-center gap-1 rounded-lg bg-[#242424] px-3 py-1.5 text-sm text-[#F2F2F2]">
          Clips:
          <select
            value={clips}
            onChange={(e) => setClips(e.target.value)}
            aria-label="Clips filter"
            className="bg-transparent font-medium text-[#F2F2F2] focus:outline-none"
          >
            {['No limit', '1', '2', '3', '4', '5+'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 rounded-lg bg-[#242424] px-3 py-1.5 text-sm text-[#F2F2F2]">
          Duration:
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            aria-label="Duration filter"
            className="bg-transparent font-medium text-[#F2F2F2] focus:outline-none"
          >
            {['No limit', 'Up to 5s', 'Up to 10s', 'Over 10s'].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Template categories">
        {CATEGORY_CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={chip === c}
            onClick={() => setChip(c)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              chip === c
                ? 'border border-[#00D9D9] bg-transparent text-[#F2F2F2]'
                : 'border border-transparent bg-[#242424] text-[#A8A8A8] hover:text-[#F2F2F2]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <p className="text-sm text-[#A8A8A8]">No templates match these filters.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setChip('For you');
              setOrientation('All');
              setClips('No limit');
              setDuration('No limit');
            }}
            className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: '#00D9D9', color: '#062A2A' }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((t) => (
            <article key={t.id}>
              <button
                type="button"
                onClick={() => setPreview(t)}
                aria-label={`Preview template ${t.name}`}
                className="relative block aspect-[9/16] w-full overflow-hidden rounded-xl text-left"
                style={{ background: POSTER_GRADIENTS[t.category] }}
              >
                {FEATURED_IDS.has(t.id) && (
                  <span className="absolute left-2 top-2 rounded bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
                    Featured
                  </span>
                )}
                <span className="absolute inset-x-0 top-1/3 px-3 text-center text-lg font-bold leading-snug text-white/95">
                  {t.name}
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-6 text-xs text-white">
                  ✂ {uses[t.id] ?? 0} &nbsp;▦ {clipCountOf(t)}
                </span>
              </button>
              <p className="mt-2 truncate text-sm text-[#F2F2F2]">{t.name}</p>
              <p className="truncate text-xs text-[#6E6E6E]">
                {t.category} · {formatDuration(t.duration)}
              </p>
            </article>
          ))}
        </div>
      )}

      {preview && (
        <HomeModal onClose={() => setPreview(null)}>
          <div className="flex flex-col items-center">
            <div
              className="relative aspect-[9/16] w-56 overflow-hidden rounded-xl"
              style={{ background: POSTER_GRADIENTS[preview.category] }}
            >
              <span className="absolute inset-x-0 top-1/3 px-3 text-center text-xl font-bold leading-snug text-white/95">
                {preview.name}
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8">
                <span className="block text-base font-semibold text-white">{preview.name}</span>
                <span className="mt-1 flex items-center justify-between text-xs text-white/90">
                  <span>
                    ◷ {formatDuration(preview.duration)} &nbsp;▦ {clipCountOf(preview)}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFav(preview.id)}
                    aria-label={favs.includes(preview.id) ? 'Remove from favorites' : 'Add to favorites'}
                    className="text-lg leading-none"
                  >
                    {favs.includes(preview.id) ? '★' : '☆'}
                  </button>
                </span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-center text-sm text-[#A8A8A8]">{preview.description}</p>
            <div className="mt-4 flex items-center gap-2">
              <TealButton onClick={() => openInEditor(preview)}>Use template</TealButton>
              <span className="relative">
                <GrayButton onClick={() => openInEditor(preview)}>Edit more</GrayButton>
                <span
                  className="absolute -right-2 -top-2 rounded px-1 text-[10px] font-bold"
                  style={{ background: '#A78BFA', color: '#1E1B4B' }}
                  title="Included in this build — nothing is charged."
                >
                  ◆ Pro
                </span>
              </span>
            </div>
          </div>
        </HomeModal>
      )}
    </div>
  );
}
