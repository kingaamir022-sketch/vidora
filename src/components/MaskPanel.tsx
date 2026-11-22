import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import { validateMask } from '../lib/masks';
import type { MaskShape } from '../schema/project';

/** Masks & compositing panel (Phase 2, SPEC G). Lives in PropertiesPanel. */
export default function MaskPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const setMask = useProjectStore((s) => s.setMask);
  const updateMask = useProjectStore((s) => s.updateMask);
  const updateChromaKey = useProjectStore((s) => s.updateChromaKey);
  const setLayout = useProjectStore((s) => s.setLayout);
  const setBackground = useProjectStore((s) => s.setBackground);
  const maskEditing = useProjectStore((s) => s.maskEditing);
  const setMaskEditing = useProjectStore((s) => s.setMaskEditing);
  const clearPenPoints = useProjectStore((s) => s.clearPenPoints);

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  if (!clip) return null;
  const mask = clip.mask ?? null;
  const maskError = mask ? validateMask(mask) : null;

  return (
    <section className="space-y-2 border-t border-zinc-800 pt-3">
      <h3 className="text-xs font-semibold text-zinc-300">Mask &amp; Compositing</h3>

      <label className="flex items-center justify-between gap-2 text-xs">
        Mask shape
        <select
          value={mask?.shape ?? ''}
          onChange={(e) => {
            const shape = e.target.value as MaskShape | '';
            if (!shape) setMask(null);
            else setMask({ feather: mask?.feather ?? 0, invert: mask?.invert ?? false, points: [], shape });
          }}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
        >
          <option value="">None</option>
          <option value="linear">Linear</option>
          <option value="mirror">Mirror</option>
          <option value="circle">Circle</option>
          <option value="rectangle">Rectangle</option>
          <option value="heart">Heart</option>
          <option value="star">Star</option>
          <option value="pen">Custom pen</option>
        </select>
      </label>

      {mask && (
        <>
          <label className="flex items-center gap-2 text-xs">
            Feather
            <input type="range" min={0} max={1} step={0.05} value={mask.feather} onChange={(e) => updateMask({ feather: Number(e.target.value) })} className="flex-1" aria-label="Mask feather" />
            <span className="w-10 text-right font-mono">{Math.round(mask.feather * 100)}%</span>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={mask.invert} onChange={(e) => updateMask({ invert: e.target.checked })} /> Invert mask
          </label>
          {mask.shape === 'pen' && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setMaskEditing(!maskEditing)}
                className={`w-full rounded-md border px-2 py-1 text-[11px] ${maskEditing ? 'border-cyan-500 bg-cyan-600/20' : 'border-zinc-700'}`}
              >
                {maskEditing ? 'Stop adding points (click preview to add)' : 'Add pen points (click on preview)'}
              </button>
              <p className="text-[11px] text-zinc-500">{mask.points.length} point(s) — need at least 3.</p>
              <button type="button" onClick={clearPenPoints} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px]">
                Clear pen points
              </button>
            </div>
          )}
          {maskError && <p className="text-[11px] text-amber-400">{maskError}</p>}
        </>
      )}

      <div className="space-y-1.5 border-t border-zinc-800 pt-2">
        <h4 className="text-xs font-semibold text-zinc-300">Chroma key</h4>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={clip.chromaKey.enabled} onChange={(e) => updateChromaKey({ enabled: e.target.checked })} /> Enable
          <input type="color" value={clip.chromaKey.color} onChange={(e) => updateChromaKey({ color: e.target.value })} aria-label="Key colour" className="h-6 w-8 rounded border border-zinc-700 bg-zinc-900" />
          <span className="font-mono">{clip.chromaKey.color}</span>
        </label>
        <label className="flex items-center gap-2 text-xs">
          Tolerance
          <input type="range" min={0} max={1} step={0.05} value={clip.chromaKey.tolerance} onChange={(e) => updateChromaKey({ tolerance: Number(e.target.value) })} className="flex-1" aria-label="Chroma tolerance" />
          <span className="w-10 text-right font-mono">{Math.round(clip.chromaKey.tolerance * 100)}%</span>
        </label>
        <label className="flex items-center gap-2 text-xs">
          Smoothness
          <input type="range" min={0} max={1} step={0.05} value={clip.chromaKey.smoothness} onChange={(e) => updateChromaKey({ smoothness: Number(e.target.value) })} className="flex-1" aria-label="Chroma smoothness" />
          <span className="w-10 text-right font-mono">{Math.round(clip.chromaKey.smoothness * 100)}%</span>
        </label>
      </div>

      <div className="space-y-1.5 border-t border-zinc-800 pt-2">
        <h4 className="text-xs font-semibold text-zinc-300">Picture-in-picture / split-screen</h4>
        <div className="flex flex-wrap gap-1">
          {(['full', 'pip', 'split2', 'split3', 'split4'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setLayout(mode)}
              className={`rounded-md border px-2 py-1 text-[11px] ${clip.layoutMode === mode ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
            >
              {mode === 'full' ? 'Full' : mode === 'pip' ? 'PiP' : mode.replace('split', '') + '-up'}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500">
          PiP shows the next visible clip in the corner; split-screen lays out the visible clips side by side. Add a second clip on another track at the same time to see it.
        </p>
        <label className="flex items-center justify-between gap-2 text-xs">
          Background
          <select
            value={clip.background.type}
            onChange={(e) => setBackground({ type: e.target.value as 'blur' | 'color' | 'gradient' | 'image' })}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
          >
            <option value="blur">Blurred frame</option>
            <option value="color">Colour</option>
            <option value="gradient">Gradient</option>
            <option value="image">Image (from media)</option>
          </select>
        </label>
        {clip.background.type === 'color' && (
          <label className="flex items-center gap-2 text-xs">
            Colour
            <input type="color" value={clip.background.color} onChange={(e) => setBackground({ color: e.target.value })} aria-label="Background colour" className="h-6 w-8 rounded border border-zinc-700 bg-zinc-900" />
            <span className="font-mono">{clip.background.color}</span>
          </label>
        )}
        {clip.background.type === 'gradient' && (
          <label className="flex items-center gap-2 text-xs">
            Gradient
            <input type="text" value={clip.background.gradient} onChange={(e) => setBackground({ gradient: e.target.value })} aria-label="Background gradient" className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono" />
          </label>
        )}
        {clip.background.type === 'image' && (
          <label className="flex items-center gap-2 text-xs">
            Image URL
            <input type="text" value={clip.background.imageSrc ?? ''} onChange={(e) => setBackground({ imageSrc: e.target.value || undefined })} placeholder="https://… or media URL" aria-label="Background image URL" className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1" />
          </label>
        )}
      </div>
    </section>
  );
}
