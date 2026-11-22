import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { EFFECT_CATALOG } from '../lib/effects';
import { BUILTIN_LUTS } from '../lib/lut';

/** Effects + LUT filters panel (Phase 2, SPEC E). Left panel for the Effects / Filters tabs. */
export default function EffectsPanel({ lutFocus = false }: { lutFocus?: boolean }) {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const addEffect = useProjectStore((s) => s.addEffect);
  const removeEffect = useProjectStore((s) => s.removeEffect);
  const updateEffect = useProjectStore((s) => s.updateEffect);
  const setBuiltinLut = useProjectStore((s) => s.setBuiltinLut);
  const setLut = useProjectStore((s) => s.setLut);
  const importLutFile = useProjectStore((s) => s.importLutFile);
  const [lutError, setLutError] = useState<string | null>(null);

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;

  const onImportLut = async (file: File | undefined) => {
    if (!file) return;
    const err = await importLutFile(file);
    setLutError(err);
  };

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4 text-zinc-100" aria-label="Effects and filters">
      <h2 className="text-sm font-semibold">Effects &amp; Filters</h2>
      {!clip && <p className="mt-2 text-xs text-zinc-400">Select a clip on the timeline to add effects, filters or a LUT.</p>}
      {clip && (
        <div className="mt-3 space-y-4">
          <section>
            <h3 className="text-xs font-semibold text-zinc-300">Video effects ({EFFECT_CATALOG.length})</h3>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {EFFECT_CATALOG.map((def) => {
                const active = clip.effects.some((e) => e.name === def.id);
                return (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => addEffect(def.id)}
                    disabled={active}
                    title={def.description}
                    className={`rounded-md border px-2 py-1.5 text-left text-[11px] ${active ? 'border-violet-500 bg-violet-600/20 text-violet-200' : 'border-zinc-700 hover:border-zinc-500'}`}
                  >
                    {def.name}
                    {active && ' ✓'}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-300">Applied effects</h3>
            {clip.effects.length === 0 && <p className="text-[11px] text-zinc-500">None yet.</p>}
            {clip.effects.map((effect) => {
              const def = EFFECT_CATALOG.find((d) => d.id === effect.name);
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
                  {def &&
                    Object.entries(def.params).map(([key, p]) => (
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
                </div>
              );
            })}
          </section>

          <section className="space-y-2 border-t border-zinc-800 pt-3">
            <h3 className="text-xs font-semibold text-zinc-300">LUT filters (.cube)</h3>
            {lutFocus && <p className="text-[11px] text-zinc-500">Import a .cube file or pick a built-in Vidora look. Intensity blends the look in.</p>}
            <div className="flex flex-wrap gap-1.5">
              {BUILTIN_LUTS.map((lut) => (
                <button
                  key={lut.name}
                  type="button"
                  onClick={() => setBuiltinLut(lut.name)}
                  className={`rounded-md border px-2 py-1 text-[11px] ${clip.lut?.name === lut.name ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
                >
                  {lut.name}
                </button>
              ))}
              {clip.lut && (
                <button type="button" onClick={() => setLut(null)} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px]">
                  Clear LUT
                </button>
              )}
            </div>
            {clip.lut && (
              <label className="flex items-center gap-2 text-xs">
                LUT intensity
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={clip.lut.intensity}
                  onChange={(e) => setLut({ ...clip.lut!, intensity: Number(e.target.value) })}
                  className="flex-1"
                  aria-label="LUT intensity"
                />
                <span className="w-10 text-right font-mono">{clip.lut.name} · {Math.round(clip.lut.intensity * 100)}%</span>
              </label>
            )}
            <label className="block text-xs">
              <span className="text-zinc-400">Import .cube file</span>
              <input
                type="file"
                accept=".cube"
                onChange={(e) => void onImportLut(e.target.files?.[0])}
                className="mt-1 block w-full text-[11px] text-zinc-400"
              />
            </label>
            {lutError && <p className="text-[11px] text-red-400">{lutError}</p>}
          </section>
        </div>
      )}
    </div>
  );
}
