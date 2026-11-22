import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import type { Adjustment, BlendMode, CurvePoint } from '../schema/project';
import ScopesPanel from './ScopesPanel';

/** Colour & adjustment panel (Phase 2, SPEC F). Left panel for the Adjustment tab. */
export default function ColorPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const updateAdjustment = useProjectStore((s) => s.updateAdjustment);
  const [curveChannel, setCurveChannel] = useState<'r' | 'g' | 'b'>('r');

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const adj: Adjustment | null = clip?.adjustment ?? null;

  const slider = (label: string, value: number, min: number, max: number, step: number, key: keyof Adjustment) => (
    <label className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => adj && updateAdjustment({ [key]: Number(e.target.value) } as Partial<Adjustment>)}
        className="flex-1"
        aria-label={label}
      />
      <span className="w-12 text-right font-mono">{typeof value === 'number' ? value.toFixed(2) : value}</span>
    </label>
  );

  const wheel = (label: string, wheelKey: 'lift' | 'gamma' | 'gain') => {
    if (!adj) return null;
    const w = adj[wheelKey];
    return (
      <div className="rounded-md border border-zinc-800 bg-zinc-900 p-2">
        <p className="text-[11px] font-semibold capitalize text-zinc-300">{label}</p>
        {(['r', 'g', 'b'] as const).map((ch) => (
          <label key={ch} className="mt-1 flex items-center gap-2 text-[11px] uppercase">
            {ch}
            <input
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={w[ch]}
              onChange={(e) =>
                updateAdjustment({ [wheelKey]: { ...w, [ch]: Number(e.target.value) } } as Partial<Adjustment>)
              }
              className="flex-1"
              aria-label={`${label} ${ch}`}
            />
            <span className="w-10 text-right font-mono">{w[ch].toFixed(2)}</span>
          </label>
        ))}
      </div>
    );
  };

  const onCurveClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!adj || !clip) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height));
    const pts = adj.curves[curveChannel];
    const next: CurvePoint[] = [...pts, { x, y }].sort((a, b) => a.x - b.x);
    updateAdjustment({ curves: { ...adj.curves, [curveChannel]: next } });
  };

  const curvePointsAttr = (pts: CurvePoint[]) => pts.map((p) => `${(p.x * 100).toFixed(1)},${((1 - p.y) * 100).toFixed(1)}`).join(' ');

  return (
    <div className="w-80 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4 text-zinc-100" aria-label="Colour and adjustment">
      <h2 className="text-sm font-semibold">Adjustment</h2>
      {!clip && <p className="mt-2 text-xs text-zinc-400">Select a clip on the timeline to adjust its colour.</p>}
      {clip && adj && (
        <div className="mt-3 space-y-3">
          <section className="space-y-1.5">
            {slider('Brightness', adj.brightness, -1, 1, 0.05, 'brightness')}
            {slider('Contrast', adj.contrast, -1, 1, 0.05, 'contrast')}
            {slider('Saturation', adj.saturation, -1, 1, 0.05, 'saturation')}
            {slider('Exposure', adj.exposure, -2, 2, 0.1, 'exposure')}
            {slider('Highlights', adj.highlights, -1, 1, 0.05, 'highlights')}
            {slider('Shadows', adj.shadows, -1, 1, 0.05, 'shadows')}
            {slider('Temperature', adj.temperature, -1, 1, 0.05, 'temperature')}
            {slider('Tint', adj.tint, -1, 1, 0.05, 'tint')}
            {slider('Hue', adj.hue, -180, 180, 1, 'hue')}
            {slider('Sharpen', adj.sharpen, 0, 1, 0.05, 'sharpen')}
          </section>

          <section className="space-y-2 border-t border-zinc-800 pt-3">
            <h3 className="text-xs font-semibold text-zinc-300">RGB curves — click to add a point</h3>
            <div className="flex gap-1">
              {(['r', 'g', 'b'] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setCurveChannel(ch)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] uppercase ${curveChannel === ch ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
                >
                  {ch}
                </button>
              ))}
              <button
                type="button"
                onClick={() => updateAdjustment({ curves: { ...adj.curves, [curveChannel]: [{ x: 0, y: 0 }, { x: 1, y: 1 }] } })}
                className="ml-auto rounded-md border border-zinc-700 px-2 py-0.5 text-[11px]"
              >
                Reset curve
              </button>
            </div>
            <svg viewBox="0 0 100 100" onClick={onCurveClick} className="h-28 w-full cursor-crosshair rounded-md border border-zinc-700 bg-zinc-900" aria-label="RGB curves editor">
              <line x1="0" y1="100" x2="100" y2="0" stroke="#3f3f46" strokeWidth="0.5" />
              <polyline points={curvePointsAttr(adj.curves[curveChannel])} fill="none" stroke={curveChannel === 'r' ? '#f87171' : curveChannel === 'g' ? '#4ade80' : '#60a5fa'} strokeWidth="1.5" />
              {adj.curves[curveChannel].map((p, i) => (
                <circle key={i} cx={p.x * 100} cy={(1 - p.y) * 100} r="3.5" fill="#fff" stroke="#8b5cf6" strokeWidth="1" />
              ))}
            </svg>
            <p className="text-[11px] text-zinc-500">{adj.curves[curveChannel].length} point(s) on the {curveChannel.toUpperCase()} curve.</p>
          </section>

          <section className="space-y-2 border-t border-zinc-800 pt-3">
            <h3 className="text-xs font-semibold text-zinc-300">Colour wheels</h3>
            {wheel('Lift (shadows)', 'lift')}
            {wheel('Gamma (mid-tones)', 'gamma')}
            {wheel('Gain (highlights)', 'gain')}
          </section>

          <section className="space-y-1.5 border-t border-zinc-800 pt-3">
            <h3 className="text-xs font-semibold text-zinc-300">HSL</h3>
            {slider('HSL hue', adj.hslHue, -180, 180, 1, 'hslHue')}
            {slider('HSL saturation', adj.hslSaturation, -1, 1, 0.05, 'hslSaturation')}
            {slider('HSL lightness', adj.hslLightness, -1, 1, 0.05, 'hslLightness')}
            <label className="flex items-center justify-between gap-2 text-xs">
              Blend mode
              <select
                value={adj.blendMode}
                onChange={(e) => updateAdjustment({ blendMode: e.target.value as BlendMode })}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
              >
                {['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'soft-light', 'hard-light', 'difference'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <p className="text-[11px] text-zinc-500">Blend mode is stored in the project and applied in the full export render (Phase 8); the live preview composites clips normally.</p>
          </section>

          <section className="space-y-1.5 border-t border-zinc-800 pt-3">
            <h3 className="text-xs font-semibold text-zinc-300">Cleanup</h3>
            <label className="flex items-center gap-2 text-xs">
              <input type="range" min={0} max={1} step={0.05} value={adj.denoise} onChange={(e) => updateAdjustment({ denoise: Number(e.target.value) })} className="flex-1" aria-label="Denoise" />
              <span className="w-10 text-right font-mono">Denoise {Math.round(adj.denoise * 100)}%</span>
            </label>
            <p className="text-[11px] text-zinc-500">Denoise applies a light spatial soften in the preview.</p>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={adj.stabilization} onChange={(e) => updateAdjustment({ stabilization: e.target.checked })} />
              Stabilization (deferred)
            </label>
            <p className="text-[11px] text-zinc-500">
              Stabilization is stored as a flag only: real stabilization needs motion analysis of the whole clip (Phase 7). It is not faked in the preview.
            </p>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={adj.lensCorrection} onChange={(e) => updateAdjustment({ lensCorrection: e.target.checked })} />
              Lens correction (deferred)
            </label>
            <p className="text-[11px] text-zinc-500">
              Lens correction is stored as a flag only: it needs a camera/lens profile (Phase 8). It is not faked in the preview.
            </p>
            <button
              type="button"
              onClick={() => {
                const clean: Adjustment = {
                  blendMode: 'normal', brightness: 0, contrast: 0,
                  curves: { b: [{ x: 0, y: 0 }, { x: 1, y: 1 }], g: [{ x: 0, y: 0 }, { x: 1, y: 1 }], r: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
                  denoise: 0, exposure: 0, gain: { b: 0, g: 0, r: 0 }, gamma: { b: 0, g: 0, r: 0 },
                  highlights: 0, hslHue: 0, hslLightness: 0, hslSaturation: 0, hue: 0, lensCorrection: false,
                  lift: { b: 0, g: 0, r: 0 }, saturation: 0, shadows: 0, sharpen: 0, stabilization: false, temperature: 0, tint: 0,
                };
                updateAdjustment(clean);
              }}
              className="rounded-md border border-zinc-700 px-2 py-1 text-[11px]"
            >
              Reset all adjustments
            </button>
          </section>

          <ScopesPanel />
        </div>
      )}
    </div>
  );
}
