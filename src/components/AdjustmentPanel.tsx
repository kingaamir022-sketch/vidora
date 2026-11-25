import { useMemo, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { BUILTIN_LUTS, lutThumbnail } from '../lib/lut';
import { deleteAdjustmentPreset, loadAdjustmentPresets, saveAdjustmentPreset } from '../lib/adjustmentPresets';
import { newId } from '../schema/project';
import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';

/**
 * Adjustment tab (CapCut-fix 2026-11-25, M1/M2). The tab is now the
 * presets library, not the colour sliders: "Add adjustment" saves the
 * selected clip's current colour adjustment as a named preset; Yours
 * lists saved presets (Brand presets = the brand kit on the Spaces
 * page); LUT holds the .cube import + the 32 Vidora looks. Content
 * header: "<space>'s space" + refresh + settings icons; preset cards
 * show a thumbnail + truncated name. The colour sliders themselves
 * live in the inspector: Basic → "Color adjustment" (Q3/M2).
 */
export default function AdjustmentPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const setBuiltinLut = useProjectStore((s) => s.setBuiltinLut);
  const setLut = useProjectStore((s) => s.setLut);
  const importLutFile = useProjectStore((s) => s.importLutFile);
  const updateAdjustment = useProjectStore((s) => s.updateAdjustment);
  const setSettingsOpen = useProjectStore((s) => s.setSettingsOpen);
  const [section, setSection] = useState<'yours' | 'lut'>('yours');
  const [query, setQuery] = useState('');
  const [presets, setPresets] = useState(() => loadAdjustmentPresets());
  const [presetName, setPresetName] = useState('');
  const [saving, setSaving] = useState(false);
  const [lutError, setLutError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const spaceName = `${project?.name ?? 'Untitled'}'s space`;

  const visiblePresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return presets.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [presets, query, refreshTick]);

  const savePreset = () => {
    if (!clip) return;
    const name = presetName.trim() || `Adjust ${presets.length + 1}`;
    setPresets(saveAdjustmentPreset({ adjustment: clip.adjustment, id: newId('preset'), name }));
    setPresetName('');
    setSaving(false);
  };

  const onImportLut = async (file: File | undefined) => {
    if (!file) return;
    const err = await importLutFile(file);
    setLutError(err);
  };

  const applyPreset = (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset || !clip) return;
    updateAdjustment(preset.adjustment);
  };

  return (
    <PanelShell
      subNav={<>
        <button
          type="button"
          onClick={() => setSaving((v) => !v)}
          className="mb-1 w-full rounded-md bg-[#00D9D9] px-2.5 py-1.5 text-left text-xs font-semibold text-[#062A2A]"
        >
          + Add adjustment
        </button>
        <SubNavGroup title="Yours">
          <SubNavItem active={section === 'yours'} onClick={() => setSection('yours')}>Brand presets</SubNavItem>
        </SubNavGroup>
        <SubNavItem active={section === 'lut'} onClick={() => setSection('lut')}>LUT</SubNavItem>
      </>}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold" title={spaceName}>{spaceName}</h3>
        <span className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => { setPresets(loadAdjustmentPresets()); setRefreshTick((t) => t + 1); }} aria-label="Refresh presets" title="Refresh" className="rounded-md p-1.5 text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]">↻</button>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings" title="Settings" className="rounded-md p-1.5 text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]">⚙</button>
        </span>
      </div>
      <PanelSearch value={query} onChange={setQuery} placeholder="People are searching presets" />

      {saving && (
        <div className="mt-3 rounded-md border border-[#2E2E2E] bg-[#242424] p-2">
          <p className="text-[11px] leading-relaxed text-[#A8A8A8]">
            {clip
              ? `Save “${clip.name}”’s current colour adjustment as a preset.`
              : 'Select a clip on the timeline first — the preset saves that clip’s colour adjustment.'}
          </p>
          <div className="mt-2 flex gap-1">
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              aria-label="Preset name"
              className="min-w-0 flex-1 rounded-md border border-[#2E2E2E] bg-[#1E1E1E] px-2 py-1 text-xs outline-none"
            />
            <button type="button" onClick={savePreset} disabled={!clip} className="shrink-0 rounded-md bg-[#00D9D9] px-2.5 py-1 text-xs font-semibold text-[#062A2A] disabled:opacity-40">Save</button>
          </div>
        </div>
      )}

      {section === 'yours' && (
        <>
          <SectionHeading>Brand presets</SectionHeading>
          {visiblePresets.length === 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              No presets yet. Select a clip, tune its colours in the inspector (Basic → Color adjustment), then “+ Add adjustment” to save it here.
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {visiblePresets.map((p) => (
                <div key={p.id} className="relative overflow-hidden rounded-lg border border-[#2E2E2E] bg-[#242424]">
                  <button type="button" onClick={() => applyPreset(p.id)} disabled={!clip} title={clip ? `Apply “${p.name}” to “${clip.name}”` : 'Select a clip first'} className="block w-full text-left disabled:opacity-60">
                    <span
                      className="block h-14 w-full"
                      style={{
                        background: `linear-gradient(135deg, hsl(${Math.round(((p.adjustment.hue ?? 0) + 360) % 360)}, 60%, ${Math.round(30 + (p.adjustment.brightness ?? 0) * 30)}%), hsl(${Math.round(((p.adjustment.hue ?? 0) + 120) % 360)}, 55%, 35%))`,
                      }}
                    />
                    <span className="block truncate px-2 py-1 text-[11px]" title={p.name}>{p.name}</span>
                  </button>
                  <button type="button" onClick={() => setPresets(deleteAdjustmentPreset(p.id))} aria-label={`Delete preset ${p.name}`} className="absolute right-1 top-1 rounded bg-black/50 px-1 text-[11px] text-zinc-300 hover:text-white">×</button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Brand presets from the Spaces page’s Brand kit appear here too. Colour sliders live in the inspector: select a clip → Basic → Color adjustment.
          </p>
        </>
      )}

      {section === 'lut' && (
        <>
          <SectionHeading>LUT</SectionHeading>
          <p className="mt-1 text-[11px] text-zinc-500">Import a .cube file or pick a built-in Vidora look. Intensity blends the look in.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {BUILTIN_LUTS.map((lut) => {
              const thumb = lutThumbnail(lut);
              return (
                <button
                  key={lut.id}
                  type="button"
                  onClick={() => clip && setBuiltinLut(lut.name)}
                  disabled={!clip}
                  title={lut.name}
                  className={`overflow-hidden rounded-lg border text-left text-[11px] disabled:opacity-60 ${clip?.lut?.name === lut.name ? 'border-[#00D9D9]' : 'border-[#2E2E2E] hover:border-[#3D3D3D]'} bg-[#242424]`}
                >
                  {thumb && <img src={thumb} alt="" className="h-12 w-full object-cover" />}
                  <span className="block truncate px-2 py-1">{lut.name}</span>
                </button>
              );
            })}
            {clip?.lut && (
              <button type="button" onClick={() => setLut(null)} className="rounded-lg border border-[#2E2E2E] px-2 py-1 text-[11px]">
                Clear LUT
              </button>
            )}
          </div>
          {clip?.lut && (
            <label className="mt-3 flex items-center gap-2 text-xs">
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
          <label className="mt-3 block text-xs">
            <span className="text-zinc-400">Import .cube file</span>
            <input type="file" accept=".cube" onChange={(e) => void onImportLut(e.target.files?.[0])} className="mt-1 block w-full text-[11px] text-zinc-400" />
          </label>
          {lutError && <p className="text-[11px] text-red-400">{lutError}</p>}
          {!clip && <p className="mt-2 text-[11px] text-zinc-500">Select a clip on the timeline to apply a LUT.</p>}
        </>
      )}
    </PanelShell>
  );
}
