import { useProjectStore } from '../store/projectStore';
import { SPEED_PRESETS } from '../lib/timeline';
import { findClip } from '../lib/timeline';
import KeyframesPanel from './KeyframesPanel';
import MaskPanel from './MaskPanel';

/** Right contextual properties panel (Phase 1): selected-clip controls for video/audio/speed/transform. */
export default function PropertiesPanel() {
  const activeTab = useProjectStore((s) => s.activeTab);
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const updateSelectedClip = useProjectStore((s) => s.updateSelectedClip);
  const setClipSpeed = useProjectStore((s) => s.setClipSpeed);
  const setExportOpen = useProjectStore((s) => s.setExportOpen);

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;

  const num = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
    <label className="flex items-center justify-between gap-2 text-xs">
      {label}
      <input type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} className="w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs" />
    </label>
  );

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 text-zinc-100" aria-label="Properties">
      <h2 className="text-sm font-semibold">{clip ? clip.name : activeTab}</h2>
      {clip ? (
        <div className="mt-3 space-y-3">
          <p className="text-[11px] text-zinc-500">
            {clip.type} · start {clip.start.toFixed(2)}s · {clip.duration.toFixed(2)}s · source {clip.sourceStart.toFixed(2)}s
            {clip.groupId ? ' · grouped' : ''} {clip.isCompound ? ' · compound' : ''}
          </p>

          <section>
            <h3 className="text-xs font-semibold text-zinc-300">Speed</h3>
            <label className="mt-1 flex items-center gap-2 text-xs">
              <input type="range" min={0.1} max={8} step={0.05} value={Math.min(clip.speed, 8)} onChange={(e) => setClipSpeed(Number(e.target.value))} className="flex-1" aria-label="Speed" />
              <span className="w-12 text-right font-mono">{clip.speed}×</span>
            </label>
            <input type="number" min={0.1} max={100} step={0.1} value={clip.speed} onChange={(e) => setClipSpeed(Number(e.target.value) || 1)} aria-label="Exact speed" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs" />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {SPEED_PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => setClipSpeed(p)} className={`rounded-md border px-2 py-0.5 text-[11px] ${clip.speed === p ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}>
                  {p}×
                </button>
              ))}
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={clip.pitchPreserved} onChange={(e) => updateSelectedClip({ pitchPreserved: e.target.checked })} />
              Preserve pitch
            </label>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
              Pitch preservation is a flag in the project JSON. The Web Audio pitch-preserving playback path is Phase 4 audio-engine work; playback here uses the browser rate control.
            </p>
          </section>

          <section className="space-y-2 border-t border-zinc-800 pt-3">
            <h3 className="text-xs font-semibold text-zinc-300">Transform</h3>
            {num('Opacity', clip.opacity, 0, 1, 0.05, (v) => updateSelectedClip({ opacity: Math.min(1, Math.max(0, v)) }))}
            {num('Scale', clip.scale, 0.05, 10, 0.05, (v) => updateSelectedClip({ scale: v }))}
            {num('Rotation°', clip.rotation, -360, 360, 1, (v) => updateSelectedClip({ rotation: v }))}
            {num('Position X %', clip.positionX, -100, 100, 1, (v) => updateSelectedClip({ positionX: v }))}
            {num('Position Y %', clip.positionY, -100, 100, 1, (v) => updateSelectedClip({ positionY: v }))}
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={clip.flipH} onChange={(e) => updateSelectedClip({ flipH: e.target.checked })} /> Flip horizontal
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={clip.flipV} onChange={(e) => updateSelectedClip({ flipV: e.target.checked })} /> Flip vertical
            </label>
            <label className="flex items-center justify-between gap-2 text-xs">
              Fit / fill
              <select value={clip.fit} onChange={(e) => updateSelectedClip({ fit: e.target.value as 'fit' | 'fill' })} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1">
                <option value="fit">Fit</option>
                <option value="fill">Fill</option>
              </select>
            </label>
          </section>

          <section className="space-y-2 border-t border-zinc-800 pt-3">
            <h3 className="text-xs font-semibold text-zinc-300">Crop (0–1)</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['x', 'y', 'width', 'height'] as const).map((k) => (
                <label key={k} className="flex items-center gap-1 text-xs capitalize">
                  {k}
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={clip.crop?.[k] ?? (k === 'width' || k === 'height' ? 1 : 0)}
                    onChange={(e) => updateSelectedClip({ crop: { ...(clip.crop ?? { height: 1, width: 1, x: 0, y: 0 }), [k]: Number(e.target.value) } })}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => updateSelectedClip({ crop: undefined })} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px]">
                Clear crop
              </button>
              <button type="button" onClick={() => updateSelectedClip({ frozen: !clip.frozen })} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px]">
                {clip.frozen ? 'Unfreeze frame' : 'Freeze frame'}
              </button>
              <button type="button" onClick={() => updateSelectedClip({ reversed: !clip.reversed })} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px]">
                {clip.reversed ? 'Un-reverse' : 'Reverse'}
              </button>
            </div>
            {clip.type === 'audio' && num('Volume', clip.volume, 0, 2, 0.05, (v) => updateSelectedClip({ volume: v }))}
          </section>

          <KeyframesPanel />
          <MaskPanel />

          <p className="border-t border-zinc-800 pt-3 text-[11px] leading-relaxed text-zinc-500">
            Effects, transitions, LUTs and colour live in the left tabs (Effects / Transitions / Filters / Adjustment). Text, stickers and captions arrive in Phase 3; the audio mixer in Phase 4.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            {activeTab === 'Media'
              ? 'Use the Media panel on the left to import files. Select a clip on the timeline to edit its speed, transform, crop, freeze and reverse settings here.'
              : 'Select a clip on the timeline to edit it here.'}
          </p>
          <div className="mt-4 space-y-2 border-t border-zinc-800 pt-4 text-xs text-zinc-400">
            <p><span className="text-zinc-200">Project:</span> {project?.name ?? 'Untitled Project'}</p>
            <p><span className="text-zinc-200">Tracks:</span> {project?.tracks.length ?? 0}</p>
            <p><span className="text-zinc-200">Media items:</span> {project?.media.length ?? 0}</p>
            <p><span className="text-zinc-200">Markers:</span> {project?.markers.length ?? 0}</p>
            <p><span className="text-zinc-200">Frame rate:</span> {project?.fps ?? 30} fps</p>
            <p><span className="text-zinc-200">Resolution:</span> {project?.resolution.width ?? 1920} × {project?.resolution.height ?? 1080}</p>
          </div>
          <button type="button" onClick={() => setExportOpen(true)} className="mt-4 w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-3 py-2 text-xs font-semibold text-white">
            Export…
          </button>
        </>
      )}
    </aside>
  );
}
