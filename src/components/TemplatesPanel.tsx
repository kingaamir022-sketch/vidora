import { useMemo, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { searchTemplates, type TemplateDef } from '../lib/templates';
import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';

/** Templates panel (Phase 5, SPEC N — N-TEMPLATES; Phase 8 — L-TEMPLATES-SLOTS:
 * templates with media slots let you pick your own clip for each slot).
 * CapCut-fix (2026-11-25, N1/N2): sub-nav Yours (Favorites) + Templates
 * (For you, Pro, Daily life, Selfie, Velocity, AI, Lyrics); search
 * "Search for templates"; filter dropdowns Orientation / Clips /
 * Duration; "For you" heading; vertical cards with a "Featured" badge.
 * 35 original templates built only from Vidora's own assets. "Use template"
 * always creates a NEW project — it never overwrites the current one. A slot
 * with no media shows its label on the canvas until footage is added. */
export const TEMPLATE_NAV = ['For you', 'Pro', 'Daily life', 'Selfie', 'Velocity', 'AI', 'Lyrics'] as const;

function templateNavFilter(nav: string): (t: TemplateDef) => boolean {
  switch (nav) {
    case 'Pro':
      return (t) => t.category === 'Promo';
    case 'Daily life':
      return (t) => t.category === 'Vlog';
    case 'Selfie':
      return (t) => t.category === 'Social';
    case 'Velocity':
      return (t) => t.category === 'Intro';
    case 'AI':
      return () => false;
    case 'Lyrics':
      return (t) => t.category === 'Outro';
    default:
      return () => true;
  }
}

export default function TemplatesPanel() {
  const project = useProjectStore((s) => s.project);
  const useTemplate = useProjectStore((s) => s.useTemplate);
  const addMediaFiles = useProjectStore((s) => s.addMediaFiles);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('For you');
  const [orientation, setOrientation] = useState<string>('All');
  const [clips, setClips] = useState<string>('No limit');
  const [duration, setDuration] = useState<string>('No limit');
  const [usedId, setUsedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [slotMedia, setSlotMedia] = useState<Record<string, Record<string, string>>>({});
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vidora.template-favorites.v1') ?? '[]') as string[];
    } catch {
      return [];
    }
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleFavorite = (id: string) => {
    setFavorites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      localStorage.setItem('vidora.template-favorites.v1', JSON.stringify(next));
      return next;
    });
  };

  const results = useMemo(() => {
    const found = searchTemplates(query);
    const byNav = category === 'Favorites' ? found.filter((t) => favorites.includes(t.id)) : found.filter(templateNavFilter(category));
    return byNav.filter(
      (t) =>
        (orientation === 'All' || t.ratio === orientation) &&
        (clips === 'No limit' ||
          (clips === '1' && t.slots.length <= 1) ||
          (clips === '2–3' && t.slots.length >= 2 && t.slots.length <= 3) ||
          (clips === '4+' && t.slots.length >= 4)) &&
        (duration === 'No limit' ||
          (duration === 'Under 15s' && t.duration < 15) ||
          (duration === '15–30s' && t.duration >= 15 && t.duration <= 30) ||
          (duration === 'Over 30s' && t.duration > 30)),
    );
  }, [query, category, favorites, orientation, clips, duration]);

  const media = (project?.media ?? []).filter((m) => m.kind === 'video' || m.kind === 'image' || m.kind === 'gif');

  const onUse = (def: TemplateDef) => {
    const filled = slotMedia[def.id] ?? {};
    useTemplate(def.id, def.slots.length > 0 ? filled : undefined);
    setUsedId(def.id);
  };

  return (
    <PanelShell
      subNav={<>
        <SubNavGroup title="Yours">
          <SubNavItem active={category === 'Favorites'} onClick={() => setCategory('Favorites')}>Favorites</SubNavItem>
        </SubNavGroup>
        <SubNavGroup title="Templates">
          {TEMPLATE_NAV.map((n) => (
            <SubNavItem key={n} active={category === n} onClick={() => setCategory(n)}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
      </>}
    >
      <PanelSearch value={query} onChange={setQuery} placeholder="Search for templates" />
      <div className="mt-2 flex gap-1">
        <label className="flex min-w-0 flex-1 items-center gap-1 text-[11px] text-zinc-400">
          Orientation
          <select value={orientation} onChange={(e) => setOrientation(e.target.value)} aria-label="Orientation filter" className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs text-zinc-100">
            {['All', '9:16', '16:9', '1:1'].map((o) => (
              <option key={o} value={o}>{o === 'All' ? 'All' : o}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-1 text-[11px] text-zinc-400">
          Clips
          <select value={clips} onChange={(e) => setClips(e.target.value)} aria-label="Clip count filter" className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs text-zinc-100">
            {['No limit', '1', '2–3', '4+'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-1 text-[11px] text-zinc-400">
          Duration
          <select value={duration} onChange={(e) => setDuration(e.target.value)} aria-label="Duration filter" className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-1 py-1 text-xs text-zinc-100">
            {['No limit', 'Under 15s', '15–30s', 'Over 30s'].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
        Original Vidora layouts. “Use template” starts a new project from the template — your current project is kept. Templates with media slots let you pick your own clip for each slot first.
      </p>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="video/*,image/*,.gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void addMediaFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <SectionHeading>{query ? `Results for "${query}"` : category}</SectionHeading>
      <div className="mt-3 space-y-2">
        {results.map((def, i) => (
          <TemplateCard
            key={def.id}
            def={def}
            featured={i < 3 && category === 'For you'}
            favorite={favorites.includes(def.id)}
            onToggleFavorite={() => toggleFavorite(def.id)}
            onUse={() => onUse(def)}
            used={usedId === def.id}
            hasProject={Boolean(project)}
            expanded={expandedId === def.id}
            onToggleExpand={() => setExpandedId(expandedId === def.id ? null : def.id)}
            media={media.map((m) => ({ id: m.id, kind: m.kind, name: m.name }))}
            filled={slotMedia[def.id] ?? {}}
            onPickSlot={(slotId, mediaId) =>
              setSlotMedia((prev) => ({ ...prev, [def.id]: { ...(prev[def.id] ?? {}), [slotId]: mediaId } }))
            }
            onImport={() => fileRef.current?.click()}
          />
        ))}
        {results.length === 0 && <p className="text-[11px] text-zinc-500">{category === 'AI' ? 'No AI templates yet — templates built from Vidora’s AI clips are coming to this list.' : `No templates match “${query}”.`}</p>}
      </div>
    </PanelShell>
  );
}

function TemplateCard({
  def,
  featured,
  favorite,
  onToggleFavorite,
  onUse,
  used,
  hasProject,
  expanded,
  onToggleExpand,
  media,
  filled,
  onPickSlot,
  onImport,
}: {
  def: TemplateDef;
  featured?: boolean;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  onUse: () => void;
  used: boolean;
  hasProject: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  media: { id: string; kind: string; name: string }[];
  filled: Record<string, string>;
  onPickSlot: (slotId: string, mediaId: string) => void;
  onImport: () => void;
}) {
  const W = 232;
  const H = def.ratio === '9:16' ? 160 : 130;
  const scaleX = W / def.duration;
  const allFilled = def.slots.every((s) => filled[s.id]);
  return (
    <div className="relative rounded-md border border-zinc-800 bg-zinc-900 p-2">
      {featured && (
        <span className="absolute left-2 top-2 z-10 rounded bg-[#00D9D9] px-1.5 py-0.5 text-[10px] font-semibold text-[#062A2A]">Featured</span>
      )}
      {onToggleFavorite && (
        <button type="button" onClick={onToggleFavorite} aria-pressed={favorite} aria-label={`Favorite ${def.name}`} className={`absolute right-2 top-2 z-10 rounded bg-black/50 px-1 text-[13px] ${favorite ? 'text-[#FFD34D]' : 'text-zinc-300 hover:text-white'}`}>★</button>
      )}
      <button type="button" onClick={onToggleExpand} className="block w-full text-left" aria-expanded={expanded} aria-label={`${def.name} details`}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded bg-zinc-950" role="img" aria-label={`${def.name} layout preview`}>
          {def.slots.map((s) => (
            <rect key={s.id} x={s.start * scaleX} y={8} width={Math.max(4, s.duration * scaleX)} height={H - 16} rx={4} fill="#7C3AED" opacity={0.55} />
          ))}
          {def.items
            .filter((i) => i.kind === 'text')
            .map((i, idx) => (
              <rect key={idx} x={i.start * scaleX} y={H - 26} width={Math.max(4, i.duration * scaleX)} height={10} rx={2} fill="#F4F4F5" opacity={0.8} />
            ))}
          {def.items
            .filter((i) => i.kind === 'background')
            .map((i, idx) => (
              <rect key={idx} x={i.start * scaleX} y={8} width={Math.max(4, i.duration * scaleX)} height={H - 16} rx={4} fill="none" stroke="#06B6D4" strokeWidth={1.5} />
            ))}
        </svg>
      </button>
      <div className="mt-1.5 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">{def.name}</p>
          <p className="text-[11px] text-zinc-400">{def.description}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {def.ratio} · {def.duration}s
            {def.slots.length > 0 ? ` · ${def.slots.length} media slot${def.slots.length > 1 ? 's' : ''}` : ' · no media needed'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            // Templates with slots open the slot pickers first — the user
            // picks their own clips before the project is built.
            if (def.slots.length > 0 && !expanded) onToggleExpand();
            else onUse();
          }}
          disabled={!hasProject}
          title={
            !hasProject
              ? 'Create a project first'
              : def.slots.length > 0 && !expanded
                ? 'Pick your media for each slot first'
                : 'Start a new project from this template'
          }
          className="shrink-0 rounded-md border border-violet-500 bg-[#00D9D9]/10 px-2 py-1 text-[11px] text-violet-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {used ? 'Used ✓' : def.slots.length > 0 && !expanded ? 'Choose media' : 'Use template'}
        </button>
      </div>
      {expanded && def.slots.length > 0 && (
        <div className="mt-2 space-y-2 border-t border-zinc-800 pt-2">
          <p className="text-[11px] font-semibold text-zinc-300">Your media for each slot</p>
          {def.slots.map((slot) => (
            <label key={slot.id} className="block text-[11px] text-zinc-400">
              {slot.label} — {slot.duration}s
              <select
                value={filled[slot.id] ?? ''}
                onChange={(e) => onPickSlot(slot.id, e.target.value)}
                aria-label={`Media for ${slot.label}`}
                className="mt-0.5 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
              >
                <option value="">— Choose media —</option>
                {media.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="flex gap-2">
            <button type="button" onClick={onImport} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200">
              Import media…
            </button>
            <button
              type="button"
              onClick={onUse}
              disabled={!hasProject}
              className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 disabled:opacity-40"
              title="Build the project with labelled placeholder clips instead of your media"
            >
              Use empty slots
            </button>
          </div>
          {!allFilled && <p className="text-[11px] text-zinc-500">Pick media for every slot to use your own clips, or “Use empty slots” for placeholders.</p>}
        </div>
      )}
      {expanded && def.slots.length === 0 && (
        <p className="mt-2 border-t border-zinc-800 pt-2 text-[11px] text-zinc-500">This template needs no media — “Use template” builds it straight away.</p>
      )}
    </div>
  );
}
