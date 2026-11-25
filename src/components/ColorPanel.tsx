import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { CURVE_PRESETS, curvePreset, moveCurvePoint } from '../lib/color';
import type { Adjustment, BlendMode, CurvePoint } from '../schema/project';
import ScopesPanel from './ScopesPanel';

const CURVE_PRESET_LABELS: Record<string, string> = {
  contrast: 'Contrast',
  cool: 'Cool tone',
  custom: 'Custom',
  darken: 'Darken',
  fade: 'Fade',
  lighten: 'Lighten',
  vintage: 'Vintage',
  warm: 'Warm tone',
};

/** CapCut's blend-mode dropdown (Basic panel): Normal, Overlay, Screen,
 * Darken, Brighten, Hard light, Multiply, Soft light, Linear burn,
 * Color burn, Color dodge. Linear burn has no canvas/CSS equivalent and
 * is omitted (see docs/behavior/F-BLEND.md). */
const BLEND_OPTIONS: { label: string; value: BlendMode }[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Overlay', value: 'overlay' },
  { label: 'Screen', value: 'screen' },
  { label: 'Darken', value: 'darken' },
  { label: 'Brighten', value: 'lighten' },
  { label: 'Hard light', value: 'hard-light' },
  { label: 'Multiply', value: 'multiply' },
  { label: 'Soft light', value: 'soft-light' },
  { label: 'Color burn', value: 'color-burn' },
  { label: 'Color dodge', value: 'color-dodge' },
  { label: 'Difference', value: 'difference' },
];

/** Colour & adjustment panel (Phase 2, SPEC F). Left panel for the Adjustment tab. */
export default function ColorPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const updateAdjustment = useProjectStore((s) => s.updateAdjustment);
  const [curveChannel, setCurveChannel] = useState<'r' | 'g' | 'b'>('r');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ channel: 'r' | 'g' | 'b'; index: number } | null>(null);
  const suppressClickRef = useRef(false);

  // Dragging a curve point: window-level pointer tracking so a fast drag
  // outside the point still moves it. moveCurvePoint clamps the point
  // between its neighbours, so the sorted order (and the index) stay valid.
  useEffect(() => {
    if (dragIndex === null) return;
    const onMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      const d = dragRef.current;
      if (!svg || !d) return;
      const store = useProjectStore.getState();
      const clip = store.project && store.selectedClipIds[0] ? findClip(store.project, store.selectedClipIds[0])?.clip ?? null : null;
      const adj = clip?.adjustment;
      if (!adj) return;
      const rect = svg.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height));
      const next = moveCurvePoint(adj.curves[d.channel], d.index, x, y);
      suppressClickRef.current = true;
      store.updateAdjustment({ curves: { ...adj.curves, [d.channel]: next } });
    };
    const onUp = () => {
      dragRef.current = null;
      setDragIndex(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragIndex]);

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

  const onCurveClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (!adj || !clip) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height));
    const pts = adj.curves[curveChannel];
    const next: CurvePoint[] = [...pts, { x, y }].sort((a, b) => a.x - b.x);
    updateAdjustment({ curves: { ...adj.curves, [curveChannel]: next } });
  };

  const onCurvePointDown = (e: React.PointerEvent, index: number) => {
    e.stopPropagation();
    dragRef.current = { channel: curveChannel, index };
    setDragIndex(index);
  };

  const curvePointsAttr = (pts: CurvePoint[]) => pts.map((p) => `${(p.x * 100).toFixed(1)},${((1 - p.y) * 100).toFixed(1)}`).join(' ');

  return (
    <div className="space-y-3" aria-label="Color adjustment">
      {!clip && <p className="mt-2 text-xs text-[#A8A8A8]">Select a clip on the timeline to adjust its colour.</p>}
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

          <section className="space-y-2 border-t border-[#2E2E2E] pt-3">
            <h3 className="text-xs font-semibold text-[#D8D8D8]">RGB curves — click to add a point, drag a point to move it</h3>
            <div className="flex gap-1">
              {(['r', 'g', 'b'] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setCurveChannel(ch)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] uppercase ${curveChannel === ch ? 'border-[#00D9D9] bg-[#00D9D9]/10' : 'border-[#3D3D3D]'}`}
                >
                  {ch}
                </button>
              ))}
              <button
                type="button"
                onClick={() => updateAdjustment({ curves: { ...adj.curves, [curveChannel]: [{ x: 0, y: 0 }, { x: 1, y: 1 }] } })}
                className="ml-auto rounded-md border border-[#3D3D3D] px-2 py-0.5 text-[11px]"
              >
                Reset curve
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {CURVE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => updateAdjustment({ curves: { ...adj.curves, [curveChannel]: curvePreset(preset) } })}
                  className="rounded-md border border-[#3D3D3D] px-2 py-0.5 text-[11px]"
                  title={`Apply the ${CURVE_PRESET_LABELS[preset]} preset to the ${curveChannel.toUpperCase()} curve`}
                >
                  {CURVE_PRESET_LABELS[preset]}
                </button>
              ))}
            </div>
            <svg ref={svgRef} viewBox="0 0 100 100" onClick={onCurveClick} className="h-28 w-full cursor-crosshair rounded-md border border-[#3D3D3D] bg-[#242424]" aria-label="RGB curves editor">
              <line x1="0" y1="100" x2="100" y2="0" stroke="#3f3f46" strokeWidth="0.5" />
              <polyline points={curvePointsAttr(adj.curves[curveChannel])} fill="none" stroke={curveChannel === 'r' ? '#f87171' : curveChannel === 'g' ? '#4ade80' : '#60a5fa'} strokeWidth="1.5" />
              {adj.curves[curveChannel].map((p, i) => (
                <circle
                  key={i}
                  cx={p.x * 100}
                  cy={(1 - p.y) * 100}
                  r="4.5"
                  fill="#fff"
                  stroke="#00d9d9"
                  strokeWidth="1"
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => onCurvePointDown(e, i)}
                  onClick={(e) => e.stopPropagation()}
                />
              ))}
            </svg>
            <p className="text-[11px] text-[#6E6E6E]">{adj.curves[curveChannel].length} point(s) on the {curveChannel.toUpperCase()} curve. Presets apply to the active channel.</p>
          </section>

          <section className="space-y-1.5 border-t border-[#2E2E2E] pt-3">
            <h3 className="text-xs font-semibold text-[#D8D8D8]">HSL</h3>
            {slider('HSL hue', adj.hslHue, -180, 180, 1, 'hslHue')}
            {slider('HSL saturation', adj.hslSaturation, -1, 1, 0.05, 'hslSaturation')}
            {slider('HSL lightness', adj.hslLightness, -1, 1, 0.05, 'hslLightness')}
            <label className="flex items-center justify-between gap-2 text-xs">
              Blend mode
              <select
                value={adj.blendMode}
                onChange={(e) => updateAdjustment({ blendMode: e.target.value as BlendMode })}
                className="rounded-md border border-[#3D3D3D] bg-[#242424] px-2 py-1"
              >
                {BLEND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <p className="text-[11px] text-[#6E6E6E]">Blend mode applies live in the preview (and in export, which records the preview canvas). Use Transform → Opacity for the blend opacity. Linear burn has no canvas equivalent and is not offered.</p>
          </section>

          <section className="space-y-1.5 border-t border-[#2E2E2E] pt-3">
            <h3 className="text-xs font-semibold text-[#D8D8D8]">Cleanup</h3>
            <label className="flex items-center gap-2 text-xs">
              <input type="range" min={0} max={1} step={0.05} value={adj.denoise} onChange={(e) => updateAdjustment({ denoise: Number(e.target.value) })} className="flex-1" aria-label="Reduce image noise" />
              <span className="w-10 text-right font-mono">Reduce image noise {Math.round(adj.denoise * 100)}%</span>
            </label>
            <p className="text-[11px] text-[#6E6E6E]">CapCut calls this “Reduce image noise” (Free). Applies a light spatial soften in the preview.</p>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={adj.stabilization} onChange={(e) => updateAdjustment({ stabilization: e.target.checked })} />
              Stabilize
            </label>
            <p className="text-[11px] text-[#6E6E6E]">
              Real stabilization lives in AI Tools → Stabilize (motion analysis, Phase 7). This toggle is kept for compatibility and does not change the preview.
            </p>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={adj.lensCorrection} onChange={(e) => updateAdjustment({ lensCorrection: e.target.checked })} />
              Lens correction
            </label>
            {adj.lensCorrection && (
              <label className="flex items-center gap-2 text-xs">
                Strength
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={adj.lensStrength ?? 0}
                  onChange={(e) => updateAdjustment({ lensStrength: Number(e.target.value) })}
                  className="flex-1"
                  aria-label="Lens correction strength"
                />
                <span className="w-10 text-right font-mono">{(adj.lensStrength ?? 0).toFixed(2)}</span>
              </label>
            )}
            <p className="text-[11px] text-[#6E6E6E]">
              Generic correction — no camera profile; adjust by eye. Negative straightens bulging (barrel) lines, positive fixes pinched (pincushion) lines. Applies in the preview and in export.
            </p>
            <button
              type="button"
              onClick={() => {
                const clean: Adjustment = {
                  blendMode: 'normal', brightness: 0, contrast: 0,
                  curves: { b: [{ x: 0, y: 0 }, { x: 1, y: 1 }], g: [{ x: 0, y: 0 }, { x: 1, y: 1 }], r: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
                  denoise: 0, exposure: 0, gain: { b: 0, g: 0, r: 0 }, gamma: { b: 0, g: 0, r: 0 },
                  highlights: 0, hslHue: 0, hslLightness: 0, hslSaturation: 0, hue: 0, lensCorrection: false, lensStrength: 0,
                  lift: { b: 0, g: 0, r: 0 }, saturation: 0, shadows: 0, sharpen: 0, stabilization: false, temperature: 0, tint: 0,
                };
                updateAdjustment(clean);
              }}
              className="rounded-md border border-[#3D3D3D] px-2 py-1 text-[11px]"
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
