import { useMemo, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { EFFECT_CATALOG, anyEffectDef } from '../lib/effects';
import { GLSL_EFFECT_CATALOG, searchGlslEffects } from '../lib/glslEffects';
import { glslThumbnail, isGlslSupported } from '../lib/glsl';
import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';

/**
 * Effects panel (Phase 2, SPEC E; Phase 5: 62 GLSL effects).
 * CapCut-fix (2026-11-25, I1/I2): sub-nav Favorites + Video effects
 * (Trending, Sale, Classic, Cutout, NEW, Hits) + Body effects
 * (Trending, Pro, Hits, Clone, Glowing lines, Stroke). "Sale" is the
 * original name in CapCut's "Black Friday" slot and "Cutout" is the
 * original name in the "Magic cutout" slot. Body effects apply to the
 * WHOLE clip in this build — there is no body-detection engine, and
 * the panel says so honestly. LUT filters moved to the Filters tab
 * (L1). 2-col card grid (D3) with thumbnails + names below. Effect
 * names stay Vidora Originals.
 */
export const VIDEO_EFFECT_NAV = ['Trending', 'Sale', 'Classic', 'Cutout', 'NEW', 'Hits'] as const;
export const BODY_EFFECT_NAV = ['Trending', 'Pro', 'Hits', 'Clone', 'Glowing lines', 'Stroke'] as const;

type EffectNav = { category: string; group: 'video' | 'body' | 'favorites' };

function keywordFilter(re: RegExp, fallbackCategory: string) {
  const found = GLSL_EFFECT_CATALOG.filter((d) => re.test(`${d.name} ${d.description}`));
  return found.length > 0 ? found : GLSL_EFFECT_CATALOG.filter((d) => d.category === fallbackCategory);
}

export default function EffectsPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const addEffect = useProjectStore((s) => s.addEffect);
  const removeEffect = useProjectStore((s) => s.removeEffect);
  const updateEffect = useProjectStore((s) => s.updateEffect);
  const [query, setQuery] = useState('');
  const [effectNav, setEffectNav] = useState<EffectNav>({ category: 'Trending', group: 'video' });
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vidora.effect-favorites.v1') ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (id: string) => {
    setFavorites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      localStorage.setItem('vidora.effect-favorites.v1', JSON.stringify(next));
      return next;
    });
  };

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const glslSupported = useMemo(() => isGlslSupported(), []);

  const results = useMemo(() => {
    if (query) {
      const glsl = searchGlslEffects(query);
      const classic = EFFECT_CATALOG.filter((d) => `${d.name} ${d.description}`.toLowerCase().includes(query.toLowerCase()));
      return { classic, glsl };
    }
    if (effectNav.group === 'favorites') {
      return {
        classic: EFFECT_CATALOG.filter((d) => favorites.includes(d.id)),
        glsl: GLSL_EFFECT_CATALOG.filter((d) => favorites.includes(d.id)),
      };
    }
    if (effectNav.group === 'body') {
      const byCat = (c: string) => GLSL_EFFECT_CATALOG.filter((d) => d.category === c);
      switch (effectNav.category) {
        case 'Pro':
          return { classic: [], glsl: byCat('Stylize') };
        case 'Hits':
          return { classic: [], glsl: byCat('Motion') };
        case 'Clone':
          return { classic: [], glsl: keywordFilter(/mirror|clone|duplic/i, 'Distort') };
        case 'Glowing lines':
          return { classic: [], glsl: keywordFilter(/glow|neon|line/i, 'Light') };
        case 'Stroke':
          return { classic: [], glsl: keywordFilter(/edge|outline|stroke/i, 'Stylize') };
        default:
          return { classic: [], glsl: GLSL_EFFECT_CATALOG.slice(0, 12) };
      }
    }
    switch (effectNav.category) {
      case 'Sale':
        return { classic: [], glsl: GLSL_EFFECT_CATALOG.filter((d) => d.category === 'Retro') };
      case 'Classic':
        return { classic: EFFECT_CATALOG, glsl: [] };
      case 'Cutout':
        return { classic: [], glsl: keywordFilter(/key|mask|cutout|alpha/i, 'Stylize') };
      case 'NEW':
        return { classic: [], glsl: GLSL_EFFECT_CATALOG.slice(-12) };
      case 'Hits':
        return { classic: [], glsl: GLSL_EFFECT_CATALOG.filter((d) => d.category === 'Light') };
      default:
        return { classic: [], glsl: GLSL_EFFECT_CATALOG.slice(0, 12) };
    }
  }, [query, effectNav, favorites]);

  const heading = query
    ? `Results for "${query}"`
    : effectNav.group === 'favorites'
      ? 'Favorites'
      : effectNav.group === 'body'
        ? `Body effects — ${effectNav.category}`
        : `Video effects — ${effectNav.category}`;

  return (
    <PanelShell
      subNav={<>
        <SubNavItem active={effectNav.group === 'favorites'} onClick={() => setEffectNav({ category: 'All', group: 'favorites' })}>Favorites</SubNavItem>
        <SubNavGroup title="Video effects">
          {VIDEO_EFFECT_NAV.map((n) => (
            <SubNavItem key={n} active={effectNav.group === 'video' && effectNav.category === n} onClick={() => setEffectNav({ category: n, group: 'video' })}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
        <SubNavGroup title="Body effects">
          {BODY_EFFECT_NAV.map((n) => (
            <SubNavItem key={n} active={effectNav.group === 'body' && effectNav.category === n} onClick={() => setEffectNav({ category: n, group: 'body' })}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
      </>}
    >
      <PanelSearch value={query} onChange={setQuery} placeholder="People are searching effects" />
      {!clip && <p className="mt-2 text-xs text-zinc-400">Select a clip on the timeline to add effects.</p>}
      {effectNav.group === 'body' && (
        <p className="mt-2 rounded-md border border-[#2E2E2E] bg-[#242424] px-2.5 py-2 text-[11px] leading-relaxed text-[#A8A8A8]">
          Body effects apply to the whole clip in this build — there is no body-detection engine.
        </p>
      )}
      {clip && (
        <div className="mt-3 space-y-4">
          <section>
            <SectionHeading>{heading}</SectionHeading>
            {!glslSupported && results.glsl.length > 0 && (
              <p className="mt-1 text-[11px] text-amber-400">WebGL2 is not available in this browser, so GLSL effects are disabled. The classic effects below still work.</p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {results.classic.map((def) => {
                const active = clip.effects.some((e) => e.name === def.id);
                return (
                  <div key={def.id} className={`relative overflow-hidden rounded-lg border ${active ? 'border-[#00D9D9]' : 'border-[#2E2E2E] hover:border-[#3D3D3D]'} bg-[#242424]`}>
                    <button
                      type="button"
                      onClick={() => addEffect(def.id)}
                      disabled={active}
                      title={def.description}
                      className="block w-full text-left disabled:opacity-60"
                    >
                      <span className="flex h-14 w-full items-center justify-center bg-gradient-to-br from-[#3D3D3D] via-[#242424] to-[#141414] text-sm font-bold text-[#F2F2F2]">{def.name}</span>
                      <span className="block truncate px-2 py-1 text-[11px]">
                        {def.name}
                        {active && ' ✓'}
                      </span>
                    </button>
                    <button type="button" onClick={() => toggleFavorite(def.id)} aria-pressed={favorites.includes(def.id)} aria-label={`Favorite ${def.name}`} className={`absolute right-1 top-1 rounded p-0.5 ${favorites.includes(def.id) ? 'text-[#FFD34D]' : 'text-[#A8A8A8] hover:text-[#F2F2F2]'}`}>★</button>
                  </div>
                );
              })}
              {results.glsl.map((def) => {
                const active = clip.effects.some((e) => e.name === def.id);
                const thumb = glslSupported ? glslThumbnail(def.body, def.p1?.default ?? 0, def.p2?.default ?? 0) : null;
                return (
                  <div key={def.id} className={`relative overflow-hidden rounded-lg border ${active ? 'border-[#00D9D9]' : 'border-[#2E2E2E] hover:border-[#3D3D3D]'} bg-[#242424]`}>
                    <button
                      type="button"
                      onClick={() => addEffect(def.id)}
                      disabled={active || !glslSupported}
                      title={def.description}
                      className="block w-full text-left disabled:opacity-60"
                    >
                      {thumb ? (
                        <img src={thumb} alt="" className="h-14 w-full object-cover" />
                      ) : (
                        <span className="flex h-14 w-full items-center justify-center bg-gradient-to-br from-[#3D3D3D] via-[#242424] to-[#141414] text-sm font-bold text-[#F2F2F2]">{def.name}</span>
                      )}
                      <span className="block truncate px-2 py-1 text-[11px]">
                        {def.name}
                        {active && ' ✓'}
                      </span>
                    </button>
                    <button type="button" onClick={() => toggleFavorite(def.id)} aria-pressed={favorites.includes(def.id)} aria-label={`Favorite ${def.name}`} className={`absolute right-1 top-1 rounded p-0.5 ${favorites.includes(def.id) ? 'text-[#FFD34D]' : 'text-[#A8A8A8] hover:text-[#F2F2F2]'}`}>★</button>
                  </div>
                );
              })}
              {results.classic.length === 0 && results.glsl.length === 0 && (
                <p className="col-span-2 text-[11px] text-zinc-500">No effects match{query ? ` “${query}”` : ''}.</p>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-300">Applied effects</h3>
            {clip.effects.length === 0 && <p className="text-[11px] text-zinc-500">None yet.</p>}
            {clip.effects.map((effect) => {
              const def = anyEffectDef(effect.name);
              const params = def && 'params' in def ? def.params : undefined;
              const glslParams: { p1?: { default: number; label: string; max: number; min: number; step: number }; p2?: { default: number; label: string; max: number; min: number; step: number } } | undefined =
                def && 'body' in def ? { p1: def.p1, p2: def.p2 } : undefined;
              return (
                <div key={effect.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{def?.name ?? effect.name}</span>
                    <button type="button" onClick={() => removeEffect(effect.id)} aria-label={`Remove ${def?.name ?? effect.name}`} className="rounded border border-zinc-700 px-1.5 text-zinc-400">×</button>
                  </div>
                  <label className="mt-1.5 flex items-center gap-2">
                    Intensity
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={effect.intensity}
                      onChange={(e) => updateEffect(effect.id, { intensity: Number(e.target.value) })}
                      className="flex-1"
                      aria-label={`${def?.name ?? effect.name} intensity`}
                    />
                    <span className="w-8 text-right font-mono">{Math.round(effect.intensity * 100)}%</span>
                  </label>
                  {params &&
                    Object.entries(params).map(([key, p]) => (
                      <label key={key} className="mt-1 flex items-center gap-2">
                        {p.label}
                        <input
                          type="range"
                          min={p.min}
                          max={p.max}
                          step={p.step}
                          value={typeof effect.params[key] === 'number' ? (effect.params[key] as number) : p.default}
                          onChange={(e) => updateEffect(effect.id, { params: { [key]: Number(e.target.value) } })}
                          className="flex-1"
                          aria-label={p.label}
                        />
                        <span className="w-10 text-right font-mono">{typeof effect.params[key] === 'number' ? (effect.params[key] as number) : p.default}</span>
                      </label>
                    ))}
                  {glslParams &&
                    (['p1', 'p2'] as const).map((key) => {
                      const p = glslParams[key];
                      if (!p) return null;
                      return (
                        <label key={key} className="mt-1 flex items-center gap-2">
                          {p.label}
                          <input
                            type="range"
                            min={p.min}
                            max={p.max}
                            step={p.step}
                            value={typeof effect.params[key] === 'number' ? (effect.params[key] as number) : p.default}
                            onChange={(e) => updateEffect(effect.id, { params: { [key]: Number(e.target.value) } })}
                            className="flex-1"
                            aria-label={p.label}
                          />
                          <span className="w-10 text-right font-mono">{typeof effect.params[key] === 'number' ? (effect.params[key] as number) : p.default}</span>
                        </label>
                      );
                    })}
                </div>
              );
            })}
          </section>
        </div>
      )}
    </PanelShell>
  );
}
