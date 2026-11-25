import { useEffect, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { SPEED_PRESETS } from '../lib/timeline';
import { findClip } from '../lib/timeline';
import { FONT_STACKS, LOOP_ANIMATION_LABELS, TEXT_STYLE_PRESETS } from '../lib/text';
import type { AnimationKind, AspectRatio, BlendMode, Clip, LoopAnimationKind, TextStyle, VidoraProject } from '../schema/project';
import { formatDb, VOICE_PRESETS } from '../lib/audio';
import KeyframesPanel from './KeyframesPanel';
import MaskPanel from './MaskPanel';
import ColorPanel from './ColorPanel';
import {
  IconAdjustment,
  IconAudio,
  IconClock,
  IconClose,
  IconEffects,
  IconMedia,
  IconSparkles,
  IconVolume,
} from './icons';

/**
 * Right inspector (CapCut-fix Q1–Q5, 2026-11-25).
 * Nothing selected → "Details" panel. Clip selected → vertical icon rail
 * (Basic, Background, Smart tools, Audio, Animation, Speed + X close)
 * with ONE sub-panel at a time. Near-black surfaces, teal #00D9D9 accent.
 */

type RailId = 'basic' | 'background' | 'smart' | 'audio' | 'animation' | 'speed';

const TEAL = '#00D9D9';
const BG = '#141414';
const PANEL = '#1E1E1E';
const BORDER = '#2E2E2E';

const btnCls = `rounded-md border border-[${BORDER}] px-2 py-1 text-xs hover:border-[#00D9D9]`;
const inputCls = `rounded-md border border-[${BORDER}] bg-[#242424] px-2 py-1 text-xs`;
const activeCls = 'border-[#00D9D9] bg-[#00D9D9]/10 text-[#00D9D9]';
const inactiveCls = `border-[${BORDER}]`;

/** Original Vidora animation kinds (animationKindSchema, minus 'none'),
 * grouped into CapCut's category chips. The grouping is ASSUMED — the
 * videos only showed the category names, never which preset sits where. */
const ANIM_CATEGORIES = ['Trending', 'Basic', 'Light', 'Glitch', 'Mask', '3D', 'Vibration'] as const;
type AnimCategory = (typeof ANIM_CATEGORIES)[number];
const ANIM_BY_CATEGORY: Record<AnimCategory, AnimationKind[]> = {
  Trending: ['fade', 'pop', 'bounce', 'zoom-in', 'spin', 'rise', 'float-up', 'heartbeat'],
  Basic: ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'slide-diagonal', 'zoom-out', 'drop', 'sway'],
  Light: ['blur', 'swing', 'elastic', 'rubber', 'scale-x', 'scale-y'],
  Glitch: ['jitter', 'skew', 'wobble', 'spin'],
  Mask: ['scale-x', 'scale-y', 'zoom-rotate', 'flip-x'],
  '3D': ['flip-x', 'flip-y', 'roll', 'rotate', 'zoom-rotate'],
  Vibration: ['jitter', 'wobble', 'heartbeat', 'sway', 'swing'],
};
const animLabel = (k: AnimationKind) =>
  k === 'none' ? 'None' : k.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

const BLEND_OPTIONS: { label: string; value: BlendMode }[] = [
  { label: 'Normal', value: 'normal' },
  { label: 'Overlay', value: 'overlay' },
  { label: 'Screen', value: 'screen' },
  { label: 'Darken', value: 'darken' },
  { label: 'Lighten', value: 'lighten' },
  { label: 'Soft light', value: 'soft-light' },
  { label: 'Hard light', value: 'hard-light' },
  { label: 'Multiply', value: 'multiply' },
  { label: 'Difference', value: 'difference' },
  { label: 'Color burn', value: 'color-burn' },
  { label: 'Color dodge', value: 'color-dodge' },
];

const SPEED_CURVE_PRESETS = [
  { id: 'none', label: 'None' },
  { id: 'custom', label: 'Custom' },
  { id: 'montage', label: 'Montage' },
  { id: 'hero', label: 'Hero' },
  { id: 'bullet', label: 'Bullet' },
  { id: 'jump-cut', label: 'Jump Cut' },
  { id: 'flash-in', label: 'Flash In' },
  { id: 'flash-out', label: 'Flash Out' },
] as const;

const RECOMMENDED_COLORS = [
  '#000000', '#FFFFFF', '#1E1E1E', '#3D3D3D', '#00D9D9', '#06B6D4', '#7C3AED',
  '#F97316', '#F43F5E', '#EC4899', '#F59E0B', '#84CC16', '#10B981', '#3B82F6',
  '#FDE68A', '#F9A8D4', '#A7F3D0', '#BFDBFE',
];

const RATIO_OPTIONS: AspectRatio[] = ['16:9', '9:16', '1:1', '4:5', '4:3', '2:1', '21:9', '3:4'];

/** v1.0.2 D5(a): CapCut shows the "Color space" row only once the
 * project has at least one clip (v05/v06 frames with a clip show
 * "Rec. 709 SDR"; the empty project in #19/#04 shows no such row). */
export function projectHasClips(project: VidoraProject | null | undefined): boolean {
  return (project?.tracks ?? []).some((t) => t.clips.length > 0);
}

/** v1.0.2 D5(d): CapCut's Details panel shows "Original" for the
 * default 16:9 ratio and the raw ratio otherwise. */
export function detailsAspectLabel(aspectRatio: AspectRatio): string {
  return aspectRatio === '16:9' ? 'Original' : aspectRatio === 'custom' ? 'Custom' : aspectRatio;
}

function railFor(clip: Clip): RailId[] {
  if (clip.type === 'audio') return ['audio', 'speed'];
  if (clip.type === 'text') return ['basic', 'background', 'animation', 'speed'];
  if (clip.type === 'image' || clip.type === 'sticker') return ['basic', 'background', 'smart', 'animation', 'speed'];
  return ['basic', 'background', 'smart', 'audio', 'animation', 'speed'];
}

const RAIL_META: { id: RailId; label: string; icon: (p: { size?: number }) => React.ReactElement }[] = [
  { id: 'basic', label: 'Basic', icon: IconAdjustment },
  { id: 'background', label: 'Background', icon: IconMedia },
  { id: 'smart', label: 'Smart tools', icon: IconSparkles },
  { id: 'audio', label: 'Audio', icon: IconAudio },
  { id: 'animation', label: 'Animation', icon: IconEffects },
  { id: 'speed', label: 'Speed', icon: IconClock },
];

export default function PropertiesPanel() {
  const project = useProjectStore((s) => s.project);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const arrangeLayers = useProjectStore((s) => s.arrangeLayers);
  const setAspectRatio = useProjectStore((s) => s.setAspectRatio);
  const updateProjectSettings = useProjectStore((s) => s.updateProjectSettings);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const selectClip = useProjectStore((s) => s.selectClip);
  const updateSelectedClip = useProjectStore((s) => s.updateSelectedClip);
  const updateAdjustment = useProjectStore((s) => s.updateAdjustment);
  const setClipSpeed = useProjectStore((s) => s.setClipSpeed);
  const setClipDuration = useProjectStore((s) => s.setClipDuration);
  const updateTextStyle = useProjectStore((s) => s.updateTextStyle);
  const applyTextStyleToAll = useProjectStore((s) => s.applyTextStyleToAll);
  const setTracking = useProjectStore((s) => s.setTracking);
  const trackingMode = useProjectStore((s) => s.trackingMode);
  const setTrackingMode = useProjectStore((s) => s.setTrackingMode);
  const clearTrackPoints = useProjectStore((s) => s.clearTrackPoints);
  const detachAudio = useProjectStore((s) => s.detachAudio);
  const normalizeSelectedClip = useProjectStore((s) => s.normalizeSelectedClip);
  const applyVoiceToAll = useProjectStore((s) => s.applyVoiceToAll);
  const setAiToolsOverlay = useProjectStore((s) => s.setAiToolsOverlay);
  const setBackground = useProjectStore((s) => s.setBackground);
  const applyBackgroundToAll = useProjectStore((s) => s.applyBackgroundToAll);

  const [openPanel, setOpenPanel] = useState<RailId>('basic');
  const [colorOpen, setColorOpen] = useState(false);
  const [maskOpen, setMaskOpen] = useState(false);
  const [animTab, setAnimTab] = useState<'in' | 'out' | 'combo'>('in');
  const [animCategory, setAnimCategory] = useState<AnimCategory>('Trending');
  const [speedTab, setSpeedTab] = useState<'normal' | 'curve'>('normal');
  const [audioTab, setAudioTab] = useState<'basic' | 'voice'>('basic');
  const [bgMode, setBgMode] = useState<'color' | 'blur' | 'image'>('color');
  const [recents, setRecents] = useState<string[]>([]);
  const [brandColor, setBrandColor] = useState('#00D9D9');
  const [modifyOpen, setModifyOpen] = useState(false);
  const [modifyRatio, setModifyRatio] = useState<AspectRatio>('16:9');
  const [modifyW, setModifyW] = useState(1920);
  const [modifyH, setModifyH] = useState(1080);
  const [modifyFps, setModifyFps] = useState(30);
  const [normalizeNote, setNormalizeNote] = useState<string | null>(null);
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const [fontError, setFontError] = useState<string | null>(null);

  const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const clipId = clip?.id ?? null;

  // When the selection changes, open the first rail item for that clip type.
  useEffect(() => {
    if (!clip) return;
    setOpenPanel(railFor(clip)[0]);
    setColorOpen(false);
    setMaskOpen(false);
  }, [clipId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-worker dependency (TimelineShell Crop button): open the Basic
  // sub-panel for the selected clip when it fires.
  useEffect(() => {
    const openBasic = () => setOpenPanel('basic');
    window.addEventListener('vidora:open-inspector-basic', openBasic);
    return () => window.removeEventListener('vidora:open-inspector-basic', openBasic);
  }, []);

  const isText = clip?.type === 'text';
  const isAudioClip = clip?.type === 'audio';
  const isVideoClip = clip?.type === 'video';
  const hasAudio = isVideoClip || isAudioClip;
  const style: TextStyle | null = clip?.text?.style ?? null;
  const adj = clip?.adjustment ?? null;

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
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-20 rounded-md border border-[${BORDER}] bg-[#242424] px-2 py-1 text-xs`}
      />
    </label>
  );

  const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void, note?: string) => (
    <div>
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-[${TEAL}]' : 'bg-[#3D3D3D]'}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      </label>
      {note && <p className="mt-1 text-[11px] leading-relaxed text-[#8A8A8A]">{note}</p>}
    </div>
  );

  const openModify = () => {
    if (!project) return;
    setModifyRatio(project.aspectRatio);
    setModifyW(project.resolution.width);
    setModifyH(project.resolution.height);
    setModifyFps(project.fps);
    setModifyOpen(true);
  };

  /* ---------------- Details panel (nothing selected) ---------------- */
  // v1.0.2 D5(a): CapCut shows "Color space — Rec. 709 SDR" only once a
  // clip exists on the timeline (v05/v06 frames); the empty project has
  // no Color space row.
  const hasClips = projectHasClips(project);
  if (!clip) {
    return (
      <aside
        className="w-[min(520px,28vw)] shrink-0 overflow-y-auto border-l text-[#F2F2F2]"
        style={{ backgroundColor: BG, borderColor: BORDER }}
        aria-label="Details"
      >
        <div className="p-4">
          <h2 className="text-sm font-semibold" style={{ color: TEAL }}>Details</h2>
          <dl className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2 border-b pb-3" style={{ borderColor: BORDER }}>
              <dt className="text-[#A8A8A8]">Name</dt>
              <dd className="truncate font-medium">{project?.name ?? 'Untitled Project'}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b pb-3" style={{ borderColor: BORDER }}>
              <dt className="text-[#A8A8A8]">Path</dt>
              <dd>Browser storage (this computer)</dd>
            </div>
            {hasClips && (
              <div className="flex items-center justify-between gap-2 border-b pb-3" style={{ borderColor: BORDER }}>
                <dt className="text-[#A8A8A8]">Color space</dt>
                <dd>Rec. 709 SDR</dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 border-b pb-3" style={{ borderColor: BORDER }}>
              <dt className="text-[#A8A8A8]">Imported media</dt>
              <dd>Stay in original location</dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b pb-3" style={{ borderColor: BORDER }}>
              <dt className="text-[#A8A8A8]">Arrange layers ⓘ</dt>
              <dd>{arrangeLayers ? 'Turned on' : 'Turned off'}</dd>
            </div>
            <div className="border-b pb-3" style={{ borderColor: BORDER }}>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-[#A8A8A8]">Proxy ⓘ</dt>
                <dd>Turned off</dd>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-b pb-3" style={{ borderColor: BORDER }}>
              <dt className="text-[#A8A8A8]">Aspect ratio</dt>
              <dd>{detailsAspectLabel(aspectRatio)}</dd>
            </div>
            <div className="flex items-center justify-between gap-2 border-b pb-3" style={{ borderColor: BORDER }}>
              <dt className="text-[#A8A8A8]">Resolution</dt>
              <dd>Adapted</dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={openModify}
              className="rounded-md bg-[#3D3D3D] px-4 py-1.5 text-xs font-semibold text-[#F2F2F2]"
            >
              Modify
            </button>
          </div>
        </div>
        {modifyOpen && project && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" role="dialog" aria-label="Project settings">
            <div className="w-80 space-y-3 rounded-lg p-4" style={{ backgroundColor: PANEL, border: `1px solid ${BORDER}` }}>
              <h3 className="text-sm font-semibold">Project settings</h3>
              <label className="flex items-center justify-between gap-2 text-xs">
                Aspect ratio
                <select value={modifyRatio} onChange={(e) => setModifyRatio(e.target.value as AspectRatio)} className={inputCls} aria-label="Aspect ratio">
                  {RATIO_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-2 text-xs">
                Resolution width
                <input type="number" min={16} max={7680} value={modifyW} onChange={(e) => setModifyW(Number(e.target.value) || 1920)} className="w-24 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs" />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs">
                Resolution height
                <input type="number" min={16} max={7680} value={modifyH} onChange={(e) => setModifyH(Number(e.target.value) || 1080)} className="w-24 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs" />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs">
                Frame rate (fps)
                <input type="number" min={1} max={120} value={modifyFps} onChange={(e) => setModifyFps(Number(e.target.value) || 30)} className="w-24 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs" />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setModifyOpen(false)} className={btnCls}>Cancel</button>
                <button
                  type="button"
                  onClick={() => {
                    setAspectRatio(modifyRatio);
                    updateProjectSettings({ fps: modifyFps, resolution: { height: modifyH, width: modifyW } });
                    setModifyOpen(false);
                  }}
                  className="rounded-md px-4 py-1.5 text-xs font-semibold"
                  style={{ backgroundColor: TEAL, color: '#062A2A' }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  }

  /* ---------------- Clip inspector: icon rail + one sub-panel ---------------- */
  const rail = railFor(clip);
  const resetTransform = () => updateSelectedClip({ positionX: 0, positionY: 0, rotation: 0, scale: 1 });
  const applyBgColor = (color: string) => {
    setBackground({ color, type: 'color' });
    setRecents((r) => [color, ...r.filter((c) => c !== color)].slice(0, 8));
  };

  return (
    <aside
      className="flex w-[min(520px,28vw)] shrink-0 overflow-hidden border-l text-[#F2F2F2]"
      style={{ backgroundColor: BG, borderColor: BORDER }}
      aria-label="Properties"
    >
      {/* Vertical icon rail */}
      <nav className="flex w-14 shrink-0 flex-col items-center gap-1 border-r py-2" style={{ borderColor: BORDER, backgroundColor: PANEL }} aria-label="Inspector panels">
        {RAIL_META.filter((m) => rail.includes(m.id)).map((m) => {
          const Icon = m.icon;
          const active = openPanel === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-pressed={active}
              title={m.label}
              onClick={() => setOpenPanel(m.id)}
              className={`flex w-12 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] leading-tight ${active ? 'text-[#00D9D9]' : 'text-[#A8A8A8] hover:text-[#F2F2F2]'}`}
            >
              <Icon size={20} />
              <span className="text-center">{m.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Close inspector"
          title="Close inspector"
          onClick={() => selectClip(null)}
          className="mt-auto flex w-12 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] text-[#A8A8A8] hover:text-[#F2F2F2]"
        >
          <IconClose size={18} />
          <span>Close</span>
        </button>
      </nav>

      {/* One sub-panel at a time */}
      <div className="min-w-0 flex-1 overflow-y-auto p-4">
        <h2 className="truncate text-sm font-semibold" style={{ color: TEAL }}>{clip.name}</h2>
        <p className="mt-0.5 truncate text-[11px] text-[#8A8A8A]">
          {clip.type} · {clip.duration.toFixed(2)}s · start {clip.start.toFixed(2)}s
        </p>

        {openPanel === 'basic' && (
          <div className="mt-4 space-y-4">
            {isText && style && clip.text && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold text-[#D8D8D8]">Text</h3>
                <label className="block text-xs">
                  <span className="text-[#A8A8A8]">Text</span>
                  <textarea
                    value={style.content}
                    onChange={(e) => patchStyle({ content: e.target.value })}
                    rows={2}
                    aria-label="Text content"
                    className="mt-1 w-full rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs"
                  />
                </label>
                <label className="block text-xs">
                  <span className="text-[#A8A8A8]">Font</span>
                  <select
                    value={FONT_STACKS.some((f) => f.stack === style.fontFamily) || customFonts.includes(style.fontFamily) ? style.fontFamily : FONT_STACKS[0].stack}
                    onChange={(e) => patchStyle({ fontFamily: e.target.value })}
                    className="mt-1 w-full rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs"
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
                  <span className="text-[#A8A8A8]">Upload a custom font (.ttf / .otf / .woff2)</span>
                  <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={(e) => void onCustomFont(e.target.files?.[0])} className="mt-1 block w-full text-[11px] text-[#A8A8A8]" />
                </label>
                {fontError && <p className="text-[11px] text-red-400">{fontError}</p>}
                <p className="text-[11px] leading-relaxed text-[#8A8A8A]">40 open-license fonts ship with Vidora and appear in the font list above, plus the 4 system stacks. An uploaded font works in this session; reload the page and it must be uploaded again (the project keeps only the font name).</p>
                {num('Size', style.fontSize, 8, 200, 1, (v) => patchStyle({ fontSize: Math.min(200, Math.max(8, v)) }))}
                <div className="flex gap-1">
                  {(['bold', 'italic', 'underline'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={style[k]}
                      onClick={() => patchStyle({ [k]: !style[k] })}
                      className={`flex-1 rounded-md border px-2 py-1 text-xs capitalize ${style[k] ? activeCls : inactiveCls}`}
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
                      className={`flex-1 rounded-md border px-2 py-1 text-[11px] capitalize ${style.align === a ? activeCls : inactiveCls}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                {num('Line spacing', style.lineSpacing, 0.8, 3, 0.1, (v) => patchStyle({ lineSpacing: Math.min(3, Math.max(0.8, v)) }))}
                <label className="flex items-center justify-between gap-2 text-xs">
                  Fill
                  <input type="color" value={style.fill === 'transparent' ? '#ffffff' : style.fill} onChange={(e) => patchStyle({ fill: e.target.value, fillGradient: null })} aria-label="Fill colour" className="h-6 w-10 cursor-pointer rounded border border-[#2E2E2E] bg-[#242424]" />
                </label>
                <label className="flex items-center justify-between gap-2 text-xs">
                  Fill gradient
                  <select
                    value={style.fillGradient ?? ''}
                    onChange={(e) => patchStyle({ fillGradient: e.target.value || null })}
                    className="rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1"
                    aria-label="Fill gradient"
                  >
                    <option value="">Solid fill</option>
                    <option value="linear-gradient(90deg, #00D9D9 0%, #06B6D4 100%)">Teal → Cyan</option>
                    <option value="linear-gradient(90deg, #F97316 0%, #FDE68A 100%)">Sunset</option>
                    <option value="linear-gradient(90deg, #F43F5E 0%, #EC4899 100%)">Rose</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-2 text-xs">
                  Stroke colour
                  <input type="color" value={style.strokeColor} onChange={(e) => patchStyle({ strokeColor: e.target.value })} aria-label="Stroke colour" className="h-6 w-10 cursor-pointer rounded border border-[#2E2E2E] bg-[#242424]" />
                </label>
                {num('Stroke width', style.strokeWidth, 0, 20, 1, (v) => patchStyle({ strokeWidth: Math.min(20, Math.max(0, v)) }))}
                <label className="flex items-center justify-between gap-2 text-xs">
                  Background box
                  <input type="color" value={style.backgroundColor === 'transparent' ? '#000000' : style.backgroundColor} onChange={(e) => patchStyle({ backgroundColor: e.target.value })} aria-label="Background box colour" className="h-6 w-10 cursor-pointer rounded border border-[#2E2E2E] bg-[#242424]" />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => patchStyle({ backgroundColor: 'transparent' })} className={btnCls}>No background</button>
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
                      <input type="color" value={style.shadow.color} onChange={(e) => patchStyle({ shadow: { ...style.shadow, color: e.target.value } })} aria-label="Shadow colour" className="h-6 w-10 cursor-pointer rounded border border-[#2E2E2E] bg-[#242424]" />
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
                      <input type="color" value={style.glow.color} onChange={(e) => patchStyle({ glow: { ...style.glow, color: e.target.value } })} aria-label="Glow colour" className="h-6 w-10 cursor-pointer rounded border border-[#2E2E2E] bg-[#242424]" />
                    </label>
                    {num('Glow blur', style.glow.blur, 0, 60, 1, (v) => patchStyle({ glow: { ...style.glow, blur: v } }))}
                  </>
                )}
                <label className="block text-xs">
                  <span className="text-[#A8A8A8]">Loop animation</span>
                  <select
                    value={clip.animationLoop?.kind ?? 'none'}
                    onChange={(e) => updateSelectedClip({ animationLoop: { duration: clip.animationLoop?.duration ?? 2, kind: e.target.value as LoopAnimationKind } })}
                    className="mt-1 w-full rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs"
                    aria-label="Loop animation"
                  >
                    {(Object.keys(LOOP_ANIMATION_LABELS) as LoopAnimationKind[]).map((k) => (
                      <option key={k} value={k}>{LOOP_ANIMATION_LABELS[k]}</option>
                    ))}
                  </select>
                </label>
                <div>
                  <p className="text-[11px] font-semibold text-[#A8A8A8]">Presets</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {TEXT_STYLE_PRESETS.map((p) => (
                      <button key={p.id} type="button" onClick={() => patchStyle({ ...p.style, content: style.content })} title={p.description} className={btnCls}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={applyTextStyleToAll} className={`w-full rounded-md border px-2 py-1.5 text-xs ${inactiveCls}`}>
                  Apply to all text clips
                </button>
                <p className="text-[11px] leading-relaxed text-[#8A8A8A]">
                  {clip.text?.tts
                    ? `Narration clip — speaks once with voice "${clip.text.tts.voice || 'default'}" at ${clip.text.tts.rate}× rate when the playhead enters it.`
                    : 'Text-to-speech narration is added from the Captions / narration tools; a narration clip speaks once when the playhead enters it.'}
                </p>
              </section>
            )}

            {!isText && !isAudioClip && (
              <>
                <section className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setMaskOpen((v) => !v)}
                    aria-expanded={maskOpen}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-xs"
                  >
                    <span className="text-[#A8A8A8]">Mask</span>
                    <span>{clip.mask ? clip.mask.shape : 'None'}</span>
                  </button>
                  {maskOpen && <MaskPanel />}
                </section>

                <section className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setColorOpen((v) => !v)}
                    aria-expanded={colorOpen}
                    className="flex w-full items-center justify-between gap-2 rounded-md border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2 text-xs"
                  >
                    <span className="text-[#A8A8A8]">Color adjustment</span>
                    <span>Basic, HSL, Curves</span>
                  </button>
                  {colorOpen && <ColorPanel />}
                </section>

                <section className="min-w-0 space-y-2 border-t pt-3" style={{ borderColor: BORDER }}>
                  <h3 className="text-xs font-semibold text-[#D8D8D8]">Blend</h3>
                  <label className="flex min-w-0 items-center justify-between gap-2 text-xs">
                    Mode
                    <select
                      value={adj?.blendMode ?? 'normal'}
                      onChange={(e) => updateAdjustment({ blendMode: e.target.value as BlendMode })}
                      className="min-w-0 shrink-0 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1"
                      aria-label="Blend mode"
                    >
                      {BLEND_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-0 items-center gap-2 text-xs">
                    <span className="w-16 shrink-0">Opacity</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={clip.opacity}
                      onChange={(e) => updateSelectedClip({ opacity: Number(e.target.value) })}
                      className="min-w-0 flex-1"
                      aria-label="Opacity"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round(clip.opacity * 100)}
                      onChange={(e) => updateSelectedClip({ opacity: Math.min(1, Math.max(0, Number(e.target.value) / 100)) })}
                      aria-label="Opacity percent"
                      className="w-16 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs"
                    />
                    <span className="text-[#A8A8A8]">%</span>
                    <button type="button" onClick={() => updateSelectedClip({ opacity: 1 })} title="Reset opacity to 100%" className={btnCls}>Reset</button>
                  </label>
                  {adj && (
                    <>
                      {toggle('Stabilize', adj.stabilization, (v) => updateAdjustment({ stabilization: v }), 'Flag for the render engine — real motion analysis is not in this build.')}
                      {toggle('Reduce image noise', adj.denoise > 0, (v) => updateAdjustment({ denoise: v ? 0.5 : 0 }), 'Applies a light spatial soften in the preview.')}
                      {toggle('Remove flicker', clip.removeFlicker, (v) => updateSelectedClip({ removeFlicker: v }), 'Stored with the clip; flicker removal is not rendered in this build.')}
                    </>
                  )}
                </section>

                <section className="space-y-2 border-t pt-3" style={{ borderColor: BORDER }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#D8D8D8]">Transform</h3>
                    <button type="button" onClick={resetTransform} title="Reset scale, position and rotation" className={btnCls}>Reset</button>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <span className="w-16 shrink-0">Scale</span>
                    <input
                      type="range"
                      min={0.05}
                      max={10}
                      step={0.05}
                      value={clip.scale}
                      onChange={(e) => updateSelectedClip({ scale: Number(e.target.value) })}
                      className="flex-1"
                      aria-label="Scale"
                    />
                    <input
                      type="number"
                      min={5}
                      max={1000}
                      step={1}
                      value={Math.round(clip.scale * 100)}
                      onChange={(e) => updateSelectedClip({ scale: Math.min(10, Math.max(0.05, Number(e.target.value) / 100)) })}
                      aria-label="Scale percent"
                      className="w-16 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs"
                    />
                    <span className="text-[#A8A8A8]">%</span>
                  </label>
                  {num('Position X', clip.positionX, -100, 100, 1, (v) => updateSelectedClip({ positionX: v }))}
                  {num('Position Y', clip.positionY, -100, 100, 1, (v) => updateSelectedClip({ positionY: v }))}
                  {num('Rotate', clip.rotation, -360, 360, 1, (v) => updateSelectedClip({ rotation: v }))}
                  <label className="flex items-center justify-between gap-2 text-xs">
                    Fit / fill
                    <select value={clip.fit} onChange={(e) => updateSelectedClip({ fit: e.target.value as 'fit' | 'fill' })} className="rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1">
                      <option value="fit">Fit</option>
                      <option value="fill">Fill</option>
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateSelectedClip({ flipH: !clip.flipH })} aria-pressed={clip.flipH} className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${clip.flipH ? activeCls : inactiveCls}`}>
                      Flip horizontal
                    </button>
                    <button type="button" onClick={() => updateSelectedClip({ flipV: !clip.flipV })} aria-pressed={clip.flipV} className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${clip.flipV ? activeCls : inactiveCls}`}>
                      Flip vertical
                    </button>
                    <button type="button" onClick={() => updateSelectedClip({ frozen: !clip.frozen })} aria-pressed={clip.frozen} className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${clip.frozen ? activeCls : inactiveCls}`}>
                      {clip.frozen ? 'Unfreeze' : 'Freeze'}
                    </button>
                  </div>
                  <KeyframesPanel />
                </section>

                <section className="space-y-2 border-t pt-3" style={{ borderColor: BORDER }}>
                  <h3 className="text-xs font-semibold text-[#D8D8D8]">Crop (0–1)</h3>
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
                          className="w-full rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs"
                        />
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => updateSelectedClip({ crop: undefined })} className={btnCls}>Clear crop</button>
                    <button type="button" onClick={() => updateSelectedClip({ reversed: !clip.reversed })} className={btnCls}>
                      {clip.reversed ? 'Un-reverse' : 'Reverse'}
                    </button>
                  </div>
                </section>
              </>
            )}

            {isAudioClip && (
              <p className="text-[11px] leading-relaxed text-[#8A8A8A]">
                Audio clips are edited under the Audio rail item. Transform, colour and mask controls apply to video, image and text clips.
              </p>
            )}
          </div>
        )}

        {openPanel === 'background' && (
          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              {([
                { id: 'color', label: 'Color' },
                { id: 'blur', label: 'Blur' },
                { id: 'image', label: 'Image' },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={bgMode === m.id && clip.background.type === m.id}
                  onClick={() => {
                    setBgMode(m.id);
                    setBackground({ type: m.id });
                  }}
                  className={`flex-1 rounded-md border px-2 py-2 text-xs ${clip.background.type === m.id ? activeCls : inactiveCls}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-[#8A8A8A]">
              The background fills the clip&apos;s letterbox area (the canvas around the clip when it does not fill the frame).
            </p>
            {clip.background.type === 'image' ? (
              <label className="block text-xs">
                <span className="text-[#A8A8A8]">Background image URL</span>
                <input
                  type="text"
                  value={clip.background.imageSrc ?? ''}
                  onChange={(e) => setBackground({ imageSrc: e.target.value || undefined })}
                  placeholder="https://… or media URL"
                  className="mt-1 w-full rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs"
                />
              </label>
            ) : (
              <label className="flex items-center justify-between gap-2 text-xs">
                Background color
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={clip.background.color}
                    onChange={(e) => applyBgColor(e.target.value)}
                    aria-label="Background colour"
                    className="h-6 w-10 cursor-pointer rounded border border-[#2E2E2E] bg-[#242424]"
                  />
                  <span className="font-mono">{clip.background.color}</span>
                </span>
              </label>
            )}
            {recents.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#A8A8A8]">Recents</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {recents.map((c) => (
                    <button key={c} type="button" title={c} aria-label={`Recent colour ${c}`} onClick={() => applyBgColor(c)} className="h-7 w-7 rounded border border-[#2E2E2E]" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold text-[#A8A8A8]">Brand Color</p>
              <button
                type="button"
                title="Brand colour — applies as the background colour"
                onClick={() => applyBgColor(brandColor)}
                className="mt-1 flex items-center gap-2 rounded-md border border-[#2E2E2E] px-2 py-1.5 text-xs"
              >
                <span className="h-6 w-6 rounded" style={{ backgroundColor: brandColor }} />
                <span className="font-mono">{brandColor}</span>
              </button>
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                aria-label="Brand colour"
                className="mt-1 h-6 w-10 cursor-pointer rounded border border-[#2E2E2E] bg-[#242424]"
              />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#A8A8A8]">Recommended</p>
              <div className="mt-1 grid grid-cols-6 gap-1">
                {RECOMMENDED_COLORS.map((c) => (
                  <button key={c} type="button" title={c} aria-label={`Recommended colour ${c}`} onClick={() => applyBgColor(c)} className="h-8 w-full rounded border border-[#2E2E2E]" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <button type="button" onClick={() => applyBackgroundToAll(clip.background)} className={`w-full rounded-md border px-2 py-1.5 text-xs ${inactiveCls}`}>
              Apply to all
            </button>
          </div>
        )}

        {openPanel === 'smart' && (
          <div className="mt-4 space-y-2">
            {([
              { id: 'auto-reframe', label: 'Auto reframe', pro: true, note: 'Change aspect ratios' },
              { id: 'enhance', label: 'Retouch', pro: false, note: 'Beauty enhancement' },
              { id: 'background-removal', label: 'Remove background', pro: true, note: 'Cut the subject out of the frame' },
              { id: 'camera-tracking', label: 'Camera tracking', pro: true, note: 'Camera follows a selected subject' },
              { id: 'enhance', label: 'Relight', pro: false, note: 'Enhance lighting' },
              { id: 'ai-movement', label: 'AI movement', pro: false, note: 'Dynamic camera movements' },
              { id: 'optical-flow', label: 'Optical flow', pro: false, note: 'Smoother motion with intermediate frames' },
            ] as const).map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={() => setAiToolsOverlay(row.id)}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-2.5 text-left text-xs hover:border-[#00D9D9]"
              >
                <span>
                  <span className="block font-medium">{row.label}</span>
                  <span className="block text-[11px] text-[#8A8A8A]">{row.note}</span>
                </span>
                {row.pro && (
                  <span title="Included in this build — nothing is charged." className="shrink-0 text-[#00D9D9]" aria-label="Included in this build — nothing is charged.">◆</span>
                )}
              </button>
            ))}
            <section className="space-y-2 border-t pt-3" style={{ borderColor: BORDER }}>
              <h3 className="text-xs font-semibold text-[#D8D8D8]">Camera tracking — manual track points</h3>
              <p className="text-[11px] leading-relaxed text-[#8A8A8A]">
                Manual tracking points — automatic detection is not in this build. Attach this clip to a video clip, then click “Add track points” and click on the preview at different playhead times; the clip’s position interpolates between your points.
              </p>
              <label className="block text-xs">
                <span className="text-[#A8A8A8]">Follow clip</span>
                <select
                  value={clip.tracking?.targetClipId ?? ''}
                  onChange={(e) => setTracking(e.target.value || null)}
                  className="mt-1 w-full rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs"
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
                    className={`w-full rounded-md border px-2 py-1.5 text-xs ${trackingMode ? activeCls : inactiveCls}`}
                  >
                    {trackingMode ? 'Stop adding points (click again)' : 'Add track points'}
                  </button>
                  {trackingMode && <p className="text-[11px] text-[#8A8A8A]">Click on the preview to add a point at the current playhead time.</p>}
                  {clip.tracking.points.length > 0 && (
                    <ul className="space-y-0.5 text-[11px] text-[#A8A8A8]">
                      {clip.tracking.points.map((pt, i) => (
                        <li key={`${pt.time}-${i}`} className="font-mono">
                          {pt.time.toFixed(2)}s → x {pt.x.toFixed(2)}, y {pt.y.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" onClick={clearTrackPoints} className={btnCls}>Clear track points</button>
                </>
              )}
            </section>
          </div>
        )}

        {openPanel === 'audio' && hasAudio && (
          <div className="mt-4 space-y-4">
            <div className="flex gap-1" role="tablist" aria-label="Audio mode">
              {(['basic', 'voice'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={audioTab === tab}
                  onClick={() => setAudioTab(tab)}
                  className={`rounded-md border px-3 py-1 text-xs capitalize ${audioTab === tab ? activeCls : inactiveCls}`}
                >
                  {tab === 'basic' ? 'Basic' : 'Voice changer'}
                </button>
              ))}
            </div>
            {audioTab === 'basic' ? (
              <div className="space-y-3">
                <label className="block text-xs">
                  <span className="flex items-center justify-between text-[#A8A8A8]">
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
                <button type="button" onClick={() => updateSelectedClip({ volume: 1 })} title="Reset volume to 0 dB" className={btnCls}>Reset volume</button>
                <p className="text-[11px] text-[#8A8A8A]">Volume keyframes live under Basic → Keyframes.</p>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={clip.muted} onChange={(e) => updateSelectedClip({ muted: e.target.checked })} />
                  Mute this clip
                </label>
                <div>
                  <p className="text-[11px] font-semibold text-[#A8A8A8]">Fade in and out</p>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    {num('Fade in (s)', clip.fadeIn, 0, 10, 0.1, (v) => updateSelectedClip({ fadeIn: Math.min(10, Math.max(0, v)) }))}
                    {num('Fade out (s)', clip.fadeOut, 0, 10, 0.1, (v) => updateSelectedClip({ fadeOut: Math.min(10, Math.max(0, v)) }))}
                  </div>
                </div>
                {toggle('Noise reduction', clip.noiseReduction, (v) => updateSelectedClip({ noiseReduction: v }), 'Noise reduction removes low rumble and evens out loud peaks. It does not remove background voices or room noise.')}
                {isAudioClip && (
                  <>
                    <label className="flex items-center justify-between gap-2 text-xs">
                      Role
                      <select
                        value={clip.audioRole}
                        onChange={(e) => updateSelectedClip({ audioRole: e.target.value as 'music' | 'voice' | 'sfx' })}
                        className="rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1"
                        aria-label="Audio role"
                      >
                        <option value="music">Music</option>
                        <option value="voice">Voice</option>
                        <option value="sfx">Sound effect</option>
                      </select>
                    </label>
                    <div className="space-y-1">
                      <span className="text-xs text-[#A8A8A8]">Equalizer (dB)</span>
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
                    <button
                      type="button"
                      onClick={() => {
                        const gain = normalizeSelectedClip();
                        setNormalizeNote(gain === null ? 'Could not normalize — the clip has no loudness data yet.' : `Volume set to ${formatDb(gain)} (peak at −1 dB).`);
                      }}
                      className={`w-full rounded-md border px-2 py-1.5 text-xs ${inactiveCls}`}
                    >
                      Normalize volume
                    </button>
                    {normalizeNote && <p className="text-[11px] text-[#8A8A8A]">{normalizeNote}</p>}
                  </>
                )}
                {isVideoClip && !clip.audioDetached && (
                  <button type="button" onClick={detachAudio} className={`w-full rounded-md border px-2 py-1.5 text-xs ${inactiveCls}`} title="Move this video's audio onto its own track (Ctrl+Shift+S)">
                    Separate audio (Ctrl+Shift+S)
                  </button>
                )}
                {isVideoClip && clip.audioDetached && (
                  <p className="text-[11px] text-[#8A8A8A]">This video&apos;s audio was separated onto its own track and the video is muted.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {VOICE_PRESETS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      aria-pressed={clip.voice === v.id}
                      onClick={() => updateSelectedClip({ voice: v.id })}
                      title={`${v.blurb} Preview it in the timeline.`}
                      className={`flex items-center justify-between gap-1 rounded-md border px-2 py-2 text-left text-xs ${clip.voice === v.id ? activeCls : inactiveCls}`}
                    >
                      <span>
                        <span className="block font-medium">{v.name}</span>
                        <span className="block text-[10px] text-[#8A8A8A]">{v.blurb}</span>
                      </span>
                      <IconVolume size={16} />
                    </button>
                  ))}
                </div>
                <p className="text-[11px] leading-relaxed text-[#8A8A8A]">Voice effects apply during timeline playback. Pick one, then play the timeline to hear it.</p>
                <button type="button" onClick={() => applyVoiceToAll(clip.voice)} className={`w-full rounded-md border px-2 py-1.5 text-xs ${inactiveCls}`}>
                  Apply to all
                </button>
              </div>
            )}
          </div>
        )}

        {openPanel === 'animation' && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-1" role="tablist" aria-label="Animation phase">
              {(['in', 'out', 'combo'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={animTab === tab}
                  onClick={() => setAnimTab(tab)}
                  className={`rounded-md border px-3 py-1 text-xs capitalize ${animTab === tab ? activeCls : inactiveCls}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {ANIM_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAnimCategory(cat)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-[11px] ${animCategory === cat ? activeCls : inactiveCls}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#8A8A8A]">People are searching Rock Vertically</p>
            <div className="grid grid-cols-4 gap-2">
              {(['none', ...ANIM_BY_CATEGORY[animCategory]] as AnimationKind[]).map((kind) => {
                const current =
                  animTab === 'in' ? clip.animationIn.kind : animTab === 'out' ? clip.animationOut.kind : clip.animationCombo?.kind ?? 'none';
                const selected = current === kind;
                return (
                  <button
                    key={`${animTab}-${kind}`}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      if (animTab === 'in') updateSelectedClip({ animationIn: { duration: clip.animationIn.duration, kind } });
                      else if (animTab === 'out') updateSelectedClip({ animationOut: { duration: clip.animationOut.duration, kind } });
                      else updateSelectedClip({ animationCombo: { duration: clip.animationCombo?.duration ?? 0.5, kind } });
                    }}
                    className={`flex h-16 flex-col items-center justify-center rounded-md border px-1 py-2 text-center text-[11px] leading-tight ${selected ? activeCls : inactiveCls}`}
                  >
                    <span className="text-base leading-none">{kind === 'none' ? '∅' : '✦'}</span>
                    <span className="mt-1">{animLabel(kind)}</span>
                  </button>
                );
              })}
            </div>
            <label className="flex items-center justify-between gap-2 text-xs">
              Duration (s)
              <input
                type="number"
                min={0.05}
                max={5}
                step={0.05}
                value={animTab === 'in' ? clip.animationIn.duration : animTab === 'out' ? clip.animationOut.duration : clip.animationCombo?.duration ?? 0.5}
                onChange={(e) => {
                  const d = Math.min(5, Math.max(0.05, Number(e.target.value) || 0.5));
                  if (animTab === 'in') updateSelectedClip({ animationIn: { duration: d, kind: clip.animationIn.kind } });
                  else if (animTab === 'out') updateSelectedClip({ animationOut: { duration: d, kind: clip.animationOut.kind } });
                  else updateSelectedClip({ animationCombo: { duration: d, kind: clip.animationCombo?.kind ?? 'none' } });
                }}
                aria-label="Animation duration in seconds"
                className="w-20 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs"
              />
            </label>
            <p className="text-[11px] leading-relaxed text-[#8A8A8A]">
              Animation names are Vidora originals. In and Out play in the preview; a Combo preset is saved with the clip and the preview plays its In and Out animations.
            </p>
          </div>
        )}

        {openPanel === 'speed' && (
          <div className="mt-4 space-y-4">
            <div className="flex gap-1" role="tablist" aria-label="Speed mode">
              {(['normal', 'curve'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={speedTab === tab}
                  onClick={() => setSpeedTab(tab)}
                  className={`rounded-md border px-3 py-1 text-xs capitalize ${speedTab === tab ? activeCls : inactiveCls}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {speedTab === 'normal' ? (
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs">
                  <span className="w-12 shrink-0">Speed</span>
                  <input type="range" min={0.1} max={100} step={0.1} value={clip.speed} onChange={(e) => setClipSpeed(Number(e.target.value))} className="flex-1" aria-label="Speed" />
                  <input
                    type="number"
                    min={0.1}
                    max={100}
                    step={0.1}
                    value={clip.speed}
                    onChange={(e) => setClipSpeed(Number(e.target.value) || 1)}
                    aria-label="Exact speed"
                    className="w-16 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs"
                  />
                  <span className="text-[#A8A8A8]">×</span>
                  <button type="button" onClick={() => setClipSpeed(1)} title="Reset speed to 1×" className={btnCls}>Reset</button>
                </label>
                <label className="flex items-center justify-between gap-2 text-xs">
                  Duration (s)
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={Number(clip.duration.toFixed(2))}
                    onChange={(e) => setClipDuration(Number(e.target.value) || clip.duration)}
                    aria-label="Clip duration in seconds"
                    className="w-20 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs"
                  />
                </label>
                <div className="flex flex-wrap gap-1">
                  {SPEED_PRESETS.map((p) => (
                    <button key={p} type="button" onClick={() => setClipSpeed(p)} className={`rounded-md border px-2 py-0.5 text-[11px] ${clip.speed === p ? activeCls : inactiveCls}`}>
                      {p}×
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs" title={clip.speed <= 0.1 || clip.speed >= 100 ? 'Pitch is unavailable at the extreme speeds (0.1× / 100×)' : 'Keep the original pitch when the speed changes'}>
                  <input
                    type="checkbox"
                    checked={clip.pitchPreserved}
                    disabled={clip.speed <= 0.1 || clip.speed >= 100}
                    onChange={(e) => updateSelectedClip({ pitchPreserved: e.target.checked })}
                  />
                  Pitch
                </label>
                <label className="flex items-center gap-2 text-xs" title="Smooth slow motion (optical flow in Phase 7)">
                  <input type="checkbox" checked={clip.smoothSlowMo} onChange={(e) => updateSelectedClip({ smoothSlowMo: e.target.checked })} />
                  Smooth slow-mo
                </label>
                <p className="text-[11px] leading-relaxed text-[#8A8A8A]">
                  Speed is clamped to 0.1×–100×. Pitch is kept by the browser&apos;s pitch-preserving playback while the Pitch switch is on. Smooth slow-mo is a flag for the optical-flow engine.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {SPEED_CURVE_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-pressed={clip.speedCurve === p.id}
                      onClick={() => updateSelectedClip({ speedCurve: p.id as Clip['speedCurve'] })}
                      className={`rounded-md border px-2 py-2 text-xs ${clip.speedCurve === p.id ? activeCls : inactiveCls}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={clip.smoothSlowMo} onChange={(e) => updateSelectedClip({ smoothSlowMo: e.target.checked })} />
                  Smooth slow-mo
                </label>
                <p className="text-[11px] leading-relaxed text-[#8A8A8A]">
                  The speed-curve preset is stored with the clip; the preview and export play the constant speed above — variable-speed playback is not rendered in this build.
                </p>
                {clip.speedCurve === 'custom' && (
                  <div>
                    <p className="mb-2 text-[11px] text-[#8A8A8A]">Curve editing opens the keyframes graph:</p>
                    <KeyframesPanel />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
