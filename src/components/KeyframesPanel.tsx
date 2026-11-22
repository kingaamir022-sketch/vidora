import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { KEYFRAME_PROPERTIES } from '../schema/project';
import type { Easing } from '../schema/project';

/** Keyframes & animation panel (Phase 2, SPEC D). Lives in PropertiesPanel. */
export default function KeyframesPanel() {
  const project = useProjectStore((s) => s.project);
  const playhead = useProjectStore((s) => s.playhead);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const addKeyframeAtPlayhead = useProjectStore((s) => s.addKeyframeAtPlayhead);
  const updateKf = useProjectStore((s) => s.updateKeyframe);
  const removeKf = useProjectStore((s) => s.removeKeyframe);
  const setAnimation = useProjectStore((s) => s.setAnimation);
  const [property, setProperty] = useState<string>('opacity');

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  if (!clip) return null;
  const local = Math.max(0, Math.min(clip.duration, playhead - clip.start));
  const kfs = clip.keyframes.filter((k) => k.property === property).sort((a, b) => a.time - b.time);
  const allKfs = [...clip.keyframes].sort((a, b) => a.time - b.time);

  // Graph: value (normalised 0..1 across the property's keyframes) over clip time.
  const graphPoints = (() => {
    if (kfs.length === 0) return '';
    const values = kfs.map((k) => k.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return kfs.map((k) => `${((k.time / Math.max(clip.duration, 0.01)) * 100).toFixed(1)},${(90 - ((k.value - min) / span) * 80).toFixed(1)}`).join(' ');
  })();

  return (
    <section className="space-y-2 border-t border-zinc-800 pt-3">
      <h3 className="text-xs font-semibold text-zinc-300">Keyframes &amp; Animation</h3>
      <label className="flex items-center justify-between gap-2 text-xs">
        Property
        <select value={property} onChange={(e) => setProperty(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1">
          {KEYFRAME_PROPERTIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => addKeyframeAtPlayhead(property)}
        className="w-full rounded-md border border-violet-500 bg-violet-600/20 px-2 py-1 text-[11px]"
      >
        + Add keyframe at {local.toFixed(2)}s
      </button>
      {kfs.length > 0 && (
        <svg viewBox="0 0 100 100" className="h-20 w-full rounded-md border border-zinc-700 bg-zinc-900" aria-label="Keyframe graph">
          <line x1="0" y1="90" x2="100" y2="90" stroke="#3f3f46" strokeWidth="0.5" />
          <polyline points={graphPoints} fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
          {kfs.map((k) => {
            const values = kfs.map((x) => x.value);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const span = max - min || 1;
            return <circle key={k.id} cx={(k.time / Math.max(clip.duration, 0.01)) * 100} cy={90 - ((k.value - min) / span) * 80} r="3" fill="#06b6d4" />;
          })}
          <line x1={(local / Math.max(clip.duration, 0.01)) * 100} y1="0" x2={(local / Math.max(clip.duration, 0.01)) * 100} y2="100" stroke="#f59e0b" strokeWidth="0.7" />
        </svg>
      )}
      {kfs.length === 0 && <p className="text-[11px] text-zinc-500">No keyframes for {property} yet.</p>}
      <div className="space-y-1.5">
        {kfs.map((k) => (
          <div key={k.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-2 text-xs">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step={0.1}
                value={k.time}
                onChange={(e) => updateKf(k.id, { time: Math.max(0, Number(e.target.value) || 0) })}
                aria-label="Keyframe time"
                className="w-16 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5"
              />
              <span className="text-zinc-500">s</span>
              <input
                type="number"
                step={0.05}
                value={k.value}
                onChange={(e) => updateKf(k.id, { value: Number(e.target.value) || 0 })}
                aria-label="Keyframe value"
                className="w-16 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5"
              />
              <select
                value={k.easing}
                onChange={(e) => updateKf(k.id, { easing: e.target.value as Easing })}
                aria-label="Easing"
                className="rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5"
              >
                {(['linear', 'ease', 'ease-in', 'ease-out', 'bezier'] as const).map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <button type="button" onClick={() => removeKf(k.id)} aria-label="Delete keyframe" className="ml-auto rounded border border-zinc-700 px-1.5 text-zinc-400">×</button>
            </div>
            {k.easing === 'bezier' && (
              <div className="mt-1.5 grid grid-cols-4 gap-1">
                {(['x1', 'y1', 'x2', 'y2'] as const).map((axis, i) => (
                  <label key={axis} className="flex flex-col text-[10px] text-zinc-500">
                    {axis}
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={k.bezier?.[i] ?? [0.25, 0.1, 0.25, 1][i]}
                      onChange={(e) => {
                        const b: [number, number, number, number] = [...(k.bezier ?? [0.25, 0.1, 0.25, 1])] as [number, number, number, number];
                        b[i] = Math.min(1, Math.max(0, Number(e.target.value) || 0));
                        updateKf(k.id, { bezier: b });
                      }}
                      className="rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-xs"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
          Animation in
          <select
            value={clip.animationIn.kind}
            onChange={(e) => setAnimation('in', e.target.value as never, clip.animationIn.duration)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          >
            {['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out', 'spin', 'bounce', 'pop'].map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
          Animation out
          <select
            value={clip.animationOut.kind}
            onChange={(e) => setAnimation('out', e.target.value as never, clip.animationOut.duration)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          >
            {['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out', 'spin', 'bounce', 'pop'].map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-[11px] text-zinc-400">
          In dur
          <input
            type="number"
            min={0.05}
            max={5}
            step={0.1}
            value={clip.animationIn.duration}
            onChange={(e) => setAnimation('in', clip.animationIn.kind, Number(e.target.value) || 0.5)}
            className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-xs"
          />
          s
        </label>
        <label className="flex items-center gap-1 text-[11px] text-zinc-400">
          Out dur
          <input
            type="number"
            min={0.05}
            max={5}
            step={0.1}
            value={clip.animationOut.duration}
            onChange={(e) => setAnimation('out', clip.animationOut.kind, Number(e.target.value) || 0.5)}
            className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1 py-0.5 text-xs"
          />
          s
        </label>
      </div>
      {allKfs.length > 0 && (
        <p className="text-[11px] text-zinc-500">{allKfs.length} keyframe(s) on this clip.</p>
      )}
    </section>
  );
}
