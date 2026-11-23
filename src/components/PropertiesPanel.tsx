import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { SPEED_PRESETS } from '../lib/timeline';
import { findClip } from '../lib/timeline';
import { FONT_STACKS, LOOP_ANIMATION_LABELS, TEXT_STYLE_PRESETS } from '../lib/text';
import type { LoopAnimationKind, TextStyle } from '../schema/project';
import { formatDb, VOICE_PRESETS } from '../lib/audio';
import KeyframesPanel from './KeyframesPanel';
import MaskPanel from './MaskPanel';
import MixerPanel from './MixerPanel';

/** Right contextual properties panel (Phase 1): selected-clip controls for video/audio/speed/transform. */
export default function PropertiesPanel() {
  const activeTab = useProjectStore((s) => s.activeTab);
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const updateSelectedClip = useProjectStore((s) => s.updateSelectedClip);
  const setClipSpeed = useProjectStore((s) => s.setClipSpeed);
  const setClipDuration = useProjectStore((s) => s.setClipDuration);
  const setExportOpen = useProjectStore((s) => s.setExportOpen);
  const updateTextStyle = useProjectStore((s) => s.updateTextStyle);
  const applyTextStyleToAll = useProjectStore((s) => s.applyTextStyleToAll);
  const setTracking = useProjectStore((s) => s.setTracking);
  const trackingMode = useProjectStore((s) => s.trackingMode);
  const setTrackingMode = useProjectStore((s) => s.setTrackingMode);
  const clearTrackPoints = useProjectStore((s) => s.clearTrackPoints);
  const detachAudio = useProjectStore((s) => s.detachAudio);
  const normalizeSelectedClip = useProjectStore((s) => s.normalizeSelectedClip);
  const applyVoiceToAll = useProjectStore((s) => s.applyVoiceToAll);
  const [normalizeNote, setNormalizeNote] = useState<string | null>(null);
  const [speedTab, setSpeedTab] = useState<'normal' | 'curve'>('normal');
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const [fontError, setFontError] = useState<string | null>(null);

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const isText = clip?.type === 'text';
  const style: TextStyle | null = clip?.text?.style ?? null;

  const patchStyle = (patch: Partial<TextStyle>) => {
    if (style) updateTextStyle(patch);
  };

  const onCustomFont = async (file: File | undefined) => {
    if (!file) return;
    const family = file.name.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/[^A-Za-z0-9 _-]/g, '') || 'Custom font';
    try {
      const face = new FontFace(family, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      setCustomFonts((f) => (f.includes(family) ? f : [...f, family]));
      patchStyle({ fontFamily: family });
      setFontError(null);
    } catch {
      setFontError('Could not load that font file — try a .ttf, .otf or .woff2 file.');
    }
  };

  const trackTargets = project
    ? project.tracks.flatMap((t) => t.clips).filter((c) => c.id !== clip?.id && (c.type === 'video' || c.type === 'image'))
    : [];

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

          {isText && style && clip.text && (
            <section className="space-y-2 border-t border-zinc-800 pt-3">
              <h3 className="text-xs font-semibold text-zinc-300">Text</h3>
              <label className="block text-xs">
                <span className="text-zinc-400">Text</span>
                <textarea
                  value={style.content}
                  onChange={(e) => patchStyle({ content: e.target.value })}
                  rows={2}
                  aria-label="Text content"
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                />
              </label>
              <label className="block text-xs">
                <span className="text-zinc-400">Font</span>
                <select
                  value={FONT_STACKS.some((f) => f.stack === style.fontFamily) || customFonts.includes(style.fontFamily) ? style.fontFamily : FONT_STACKS[0].stack}
                  onChange={(e) => patchStyle({ fontFamily: e.target.value })}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                  aria-label="Font family"
                >
                  {FONT_STACKS.map((f) => (
                    <option key={f.id} value={f.stack}>{f.label}</option>
                  ))}
                  {customFonts.map((f) => (
                    <option key={f} value={f}>{f} (uploaded)</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs">
                <span className="text-zinc-400">Upload a custom font (.ttf / .otf / .woff2)</span>
                <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={(e) => void onCustomFont(e.target.files?.[0])} className="mt-1 block w-full text-[11px] text-zinc-400" />
              </label>
              {fontError && <p className="text-[11px] text-red-400">{fontError}</p>}
              <p className="text-[11px] leading-relaxed text-zinc-500">40 open-license fonts ship with Vidora and appear in the font list above, plus the 4 system stacks. An uploaded font works in this session; reload the page and it must be uploaded again (the project keeps only the font name).</p>
              {num('Size', style.fontSize, 8, 200, 1, (v) => patchStyle({ fontSize: Math.min(200, Math.max(8, v)) }))}
              <div className="flex gap-1">
                {(['bold', 'italic', 'underline'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={style[k]}
                    onClick={() => patchStyle({ [k]: !style[k] })}
                    className={`flex-1 rounded-md border px-2 py-1 text-xs capitalize ${style[k] ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
                  >
                    {k === 'bold' ? 'B' : k === 'italic' ? 'I' : 'U'}
                  </button>
                ))}
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={style.align === a}
                    onClick={() => patchStyle({ align: a })}
                    className={`flex-1 rounded-md border px-2 py-1 text-[11px] capitalize ${style.align === a ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              {num('Line spacing', style.lineSpacing, 0.8, 3, 0.1, (v) => patchStyle({ lineSpacing: Math.min(3, Math.max(0.8, v)) }))}
              <label className="flex items-center justify-between gap-2 text-xs">
                Fill
                <input type="color" value={style.fill === 'transparent' ? '#ffffff' : style.fill} onChange={(e) => patchStyle({ fill: e.target.value, fillGradient: null })} aria-label="Fill colour" className="h-6 w-10 cursor-pointer rounded border border-zinc-700 bg-zinc-900" />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs">
                Fill gradient
                <select
                  value={style.fillGradient ?? ''}
                  onChange={(e) => patchStyle({ fillGradient: e.target.value || null })}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
                  aria-label="Fill gradient"
                >
                  <option value="">Solid fill</option>
                  <option value="linear-gradient(90deg, #7C3AED 0%, #06B6D4 100%)">Violet → Cyan</option>
                  <option value="linear-gradient(90deg, #F97316 0%, #FDE68A 100%)">Sunset</option>
                  <option value="linear-gradient(90deg, #F43F5E 0%, #EC4899 100%)">Rose</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2 text-xs">
                Stroke colour
                <input type="color" value={style.strokeColor} onChange={(e) => patchStyle({ strokeColor: e.target.value })} aria-label="Stroke colour" className="h-6 w-10 cursor-pointer rounded border border-zinc-700 bg-zinc-900" />
              </label>
              {num('Stroke width', style.strokeWidth, 0, 20, 1, (v) => patchStyle({ strokeWidth: Math.min(20, Math.max(0, v)) }))}
              <label className="flex items-center justify-between gap-2 text-xs">
                Background box
                <input type="color" value={style.backgroundColor === 'transparent' ? '#000000' : style.backgroundColor} onChange={(e) => patchStyle({ backgroundColor: e.target.value })} aria-label="Background box colour" className="h-6 w-10 cursor-pointer rounded border border-zinc-700 bg-zinc-900" />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => patchStyle({ backgroundColor: 'transparent' })} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px]">No background</button>
                {num('Box padding', style.backgroundPadding, 0, 60, 1, (v) => patchStyle({ backgroundPadding: Math.min(60, Math.max(0, v)) }))}
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={style.shadow.enabled} onChange={(e) => patchStyle({ shadow: { ...style.shadow, enabled: e.target.checked } })} />
                Shadow
              </label>
              {style.shadow.enabled && (
                <>
                  <label className="flex items-center justify-between gap-2 text-xs">
                    Shadow colour
                    <input type="color" value={style.shadow.color} onChange={(e) => patchStyle({ shadow: { ...style.shadow, color: e.target.value } })} aria-label="Shadow colour" className="h-6 w-10 cursor-pointer rounded border border-zinc-700 bg-zinc-900" />
                  </label>
                  {num('Shadow blur', style.shadow.blur, 0, 50, 1, (v) => patchStyle({ shadow: { ...style.shadow, blur: v } }))}
                  {num('Shadow offset X', style.shadow.offsetX, -50, 50, 1, (v) => patchStyle({ shadow: { ...style.shadow, offsetX: v } }))}
                  {num('Shadow offset Y', style.shadow.offsetY, -50, 50, 1, (v) => patchStyle({ shadow: { ...style.shadow, offsetY: v } }))}
                </>
              )}
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={style.glow.enabled} onChange={(e) => patchStyle({ glow: { ...style.glow, enabled: e.target.checked } })} />
                Glow
              </label>
              {style.glow.enabled && (
                <>
                  <label className="flex items-center justify-between gap-2 text-xs">
                    Glow colour
                    <input type="color" value={style.glow.color} onChange={(e) => patchStyle({ glow: { ...style.glow, color: e.target.value } })} aria-label="Glow colour" className="h-6 w-10 cursor-pointer rounded border border-zinc-700 bg-zinc-900" />
                  </label>
                  {num('Glow blur', style.glow.blur, 0, 60, 1, (v) => patchStyle({ glow: { ...style.glow, blur: v } }))}
                </>
              )}
              {num('Opacity', clip.opacity, 0, 1, 0.05, (v) => updateSelectedClip({ opacity: Math.min(1, Math.max(0, v)) }))}
              <label className="block text-xs">
                <span className="text-zinc-400">Loop animation</span>
                <select
                  value={clip.animationLoop?.kind ?? 'none'}
                  onChange={(e) => updateSelectedClip({ animationLoop: { duration: clip.animationLoop?.duration ?? 2, kind: e.target.value as LoopAnimationKind } })}
                  className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                  aria-label="Loop animation"
                >
                  {(Object.keys(LOOP_ANIMATION_LABELS) as LoopAnimationKind[]).map((k) => (
                    <option key={k} value={k}>{LOOP_ANIMATION_LABELS[k]}</option>
                  ))}
                </select>
              </label>
              <div>
                <p className="text-[11px] font-semibold text-zinc-400">Presets</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {TEXT_STYLE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => patchStyle({ ...p.style, content: style.content })}
                      title={p.description}
                      className="rounded-md border border-zinc-700 px-2 py-0.5 text-[11px]"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={applyTextStyleToAll} className="w-full rounded-md border border-violet-500 px-2 py-1.5 text-xs">
                Apply to all text clips
              </button>
              <p className="text-[11px] leading-relaxed text-zinc-500">
                {clip.text?.tts ? `Narration clip — speaks once with voice "${clip.text.tts.voice || 'default'}" at ${clip.text.tts.rate}× rate when the playhead enters it.` : 'Scale, position and rotation live in the Transform section below; in/out animation in the Keyframes section.'}
              </p>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-zinc-300">Speed</h3>
            <div className="mt-1 flex gap-1" role="tablist" aria-label="Speed mode">
              {(['normal', 'curve'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={speedTab === tab}
                  onClick={() => setSpeedTab(tab)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] capitalize ${speedTab === tab ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {speedTab === 'normal' ? (
              <>
                <label className="mt-1 flex items-center gap-2 text-xs">
                  <input type="range" min={0.1} max={100} step={0.1} value={clip.speed} onChange={(e) => setClipSpeed(Number(e.target.value))} className="flex-1" aria-label="Speed" />
                  <span className="w-12 text-right font-mono">{clip.speed}×</span>
                </label>
                <input type="number" min={0.1} max={100} step={0.1} value={clip.speed} onChange={(e) => setClipSpeed(Number(e.target.value) || 1)} aria-label="Exact speed" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs" />
                <label className="mt-1 flex items-center justify-between gap-2 text-xs">
                  Duration (s)
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={Number(clip.duration.toFixed(2))}
                    onChange={(e) => setClipDuration(Number(e.target.value) || clip.duration)}
                    aria-label="Clip duration in seconds"
                    className="w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                  />
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {SPEED_PRESETS.map((p) => (
                    <button key={p} type="button" onClick={() => setClipSpeed(p)} className={`rounded-md border px-2 py-0.5 text-[11px] ${clip.speed === p ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}>
                      {p}×
                    </button>
                  ))}
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs" title={clip.speed <= 0.1 || clip.speed >= 100 ? 'Pitch is unavailable at the extreme speeds (0.1× / 100×)' : 'Keep the original pitch when the speed changes'}>
                  <input
                    type="checkbox"
                    checked={clip.pitchPreserved}
                    disabled={clip.speed <= 0.1 || clip.speed >= 100}
                    onChange={(e) => updateSelectedClip({ pitchPreserved: e.target.checked })}
                  />
                  Pitch
                </label>
                <label className="mt-1 flex items-center gap-2 text-xs" title="Smooth slow motion (optical flow in Phase 7)">
                  <input type="checkbox" checked={clip.smoothSlowMo} onChange={(e) => updateSelectedClip({ smoothSlowMo: e.target.checked })} />
                  Smooth slow-mo
                </label>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">
                  Speed is clamped to 0.1×–100× (typing 0.05 gives 0.10×, 200 gives 100×). Pitch is kept by the browser's pitch-preserving playback while the Pitch switch is on (the same mechanism the reference uses); the Web Audio pitch shifter is used for the voice-changer presets in the Audio section. At 0.1× / 100× the switch is off and the voice sounds deeper / higher. Smooth slow-mo is a flag for the Phase 7 optical-flow engine.
                </p>
              </>
            ) : (
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                Bezier speed curves are not editable yet — the constant speed above is fully supported. The keyframes engine (Phase 2) already supports eased curves for position, scale, rotation, opacity and volume; see the Keyframes section below.
              </p>
            )}
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
          </section>

          {(clip.type === 'audio' || clip.type === 'video') && (
            <section className="space-y-2 border-t border-zinc-800 pt-3">
              <h3 className="text-xs font-semibold text-zinc-300">Audio</h3>
              <label className="block text-xs">
                <span className="flex items-center justify-between text-zinc-400">
                  <span>Volume</span>
                  <span className="font-mono">{formatDb(clip.volume)}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={clip.volume}
                  onChange={(e) => updateSelectedClip({ volume: Number(e.target.value) })}
                  aria-label="Clip volume"
                  className="mt-1 w-full"
                />
              </label>
              {num('Volume (number)', clip.volume, 0, 2, 0.05, (v) => updateSelectedClip({ volume: v }))}
              <p className="text-[11px] text-zinc-500">Volume keyframes live in the Keyframes section below (Volume property).</p>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={clip.muted} onChange={(e) => updateSelectedClip({ muted: e.target.checked })} />
                Mute this clip
              </label>
              <div className="grid grid-cols-2 gap-2">
                {num('Fade in (s)', clip.fadeIn, 0, 10, 0.1, (v) => updateSelectedClip({ fadeIn: Math.min(10, Math.max(0, v)) }))}
                {num('Fade out (s)', clip.fadeOut, 0, 10, 0.1, (v) => updateSelectedClip({ fadeOut: Math.min(10, Math.max(0, v)) }))}
              </div>
              {clip.type === 'audio' && (
                <>
                  <label className="flex items-center justify-between gap-2 text-xs">
                    Role
                    <select
                      value={clip.audioRole}
                      onChange={(e) => updateSelectedClip({ audioRole: e.target.value as 'music' | 'voice' | 'sfx' })}
                      className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
                      aria-label="Audio role"
                    >
                      <option value="music">Music</option>
                      <option value="voice">Voice</option>
                      <option value="sfx">Sound effect</option>
                    </select>
                  </label>
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400">Equalizer (dB)</span>
                    {(['low', 'mid', 'high'] as const).map((band) => (
                      <label key={band} className="flex items-center justify-between gap-2 text-xs capitalize">
                        {band}
                        <input
                          type="range"
                          min={-12}
                          max={12}
                          step={1}
                          value={clip.eq[band]}
                          onChange={(e) => updateSelectedClip({ eq: { ...clip.eq, [band]: Number(e.target.value) } })}
                          aria-label={`EQ ${band}`}
                          className="w-32"
                        />
                        <span className="w-10 text-right font-mono">{clip.eq[band] > 0 ? '+' : ''}{clip.eq[band]} dB</span>
                      </label>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs" title="High-pass filter (cuts low rumble) plus a compressor that evens out loud peaks">
                    <input type="checkbox" checked={clip.noiseReduction} onChange={(e) => updateSelectedClip({ noiseReduction: e.target.checked })} />
                    Noise reduction
                  </label>
                  <p className="text-[11px] leading-relaxed text-zinc-500">
                    Noise reduction removes low rumble and evens out loud peaks. It does not remove background voices or room noise — real voice isolation needs an AI model (Phase 7).
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const gain = normalizeSelectedClip();
                      setNormalizeNote(gain === null ? 'Could not normalize — the clip has no loudness data yet.' : `Volume set to ${formatDb(gain)} (peak at −1 dB).`);
                    }}
                    className="w-full rounded-md border border-zinc-700 px-2 py-1.5 text-xs"
                  >
                    Normalize volume
                  </button>
                  {normalizeNote && <p className="text-[11px] text-zinc-500">{normalizeNote}</p>}
                  <label className="flex items-center justify-between gap-2 text-xs">
                    Voice
                    <select
                      value={clip.voice}
                      onChange={(e) => updateSelectedClip({ voice: e.target.value })}
                      className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1"
                      aria-label="Voice changer preset"
                    >
                      {VOICE_PRESETS.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => applyVoiceToAll(clip.voice)} className="w-full rounded-md border border-zinc-700 px-2 py-1.5 text-xs">
                    Apply voice to all audio
                  </button>
                </>
              )}
              {clip.type === 'video' && !clip.audioDetached && (
                <button type="button" onClick={detachAudio} className="w-full rounded-md border border-zinc-700 px-2 py-1.5 text-xs" title="Move this video's audio onto its own track (Ctrl+Shift+S)">
                  Separate audio (Ctrl+Shift+S)
                </button>
              )}
              {clip.type === 'video' && clip.audioDetached && (
                <p className="text-[11px] text-zinc-500">This video's audio was separated onto its own track and the video is muted.</p>
              )}
            </section>
          )}

          <KeyframesPanel />
          <MaskPanel />

          <section className="space-y-2 border-t border-zinc-800 pt-3">
            <h3 className="text-xs font-semibold text-zinc-300">Motion tracking</h3>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Manual tracking points — automatic detection is Phase 7. Attach this clip to a video clip, then click “Add track points” and click on the preview at different playhead times; the clip’s position interpolates between your points.
            </p>
            <label className="block text-xs">
              <span className="text-zinc-400">Follow clip</span>
              <select
                value={clip.tracking?.targetClipId ?? ''}
                onChange={(e) => setTracking(e.target.value || null)}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                aria-label="Tracking target clip"
              >
                <option value="">Not attached</option>
                {trackTargets.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            {clip.tracking && (
              <>
                <button
                  type="button"
                  onClick={() => setTrackingMode(!trackingMode)}
                  aria-pressed={trackingMode}
                  className={`w-full rounded-md border px-2 py-1.5 text-xs ${trackingMode ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
                >
                  {trackingMode ? 'Stop adding points (click again)' : 'Add track points'}
                </button>
                {trackingMode && <p className="text-[11px] text-zinc-500">Click on the preview to add a point at the current playhead time.</p>}
                {clip.tracking.points.length > 0 && (
                  <ul className="space-y-0.5 text-[11px] text-zinc-400">
                    {clip.tracking.points.map((pt, i) => (
                      <li key={`${pt.time}-${i}`} className="font-mono">
                        {pt.time.toFixed(2)}s → x {pt.x.toFixed(2)}, y {pt.y.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={clearTrackPoints} className="w-full rounded-md border border-zinc-700 px-2 py-1.5 text-xs">
                  Clear track points
                </button>
              </>
            )}
          </section>

          <p className="border-t border-zinc-800 pt-3 text-[11px] leading-relaxed text-zinc-500">
            Effects, transitions, LUTs and colour live in the left tabs (Effects / Transitions / Filters / Adjustment). Text, stickers and captions live in the left tabs too (Phase 3). With no clip selected, the mixer is shown here.
          </p>
        </div>
      ) : (
        <>
          <MixerPanel />
          <p className="mt-3 text-xs leading-relaxed text-zinc-400">
            {activeTab === 'Media'
              ? 'Use the Media panel on the left to import files. Select a clip on the timeline to edit it here.'
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
