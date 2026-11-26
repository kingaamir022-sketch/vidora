import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip, projectDuration, snapTime, snapToFrame } from '../lib/timeline';
import { canShowEffects, decodePanelDrag } from '../lib/panelDrag';
import { formatCommentTime } from '../lib/collab';
import { importFile } from '../lib/media';
import {
  IconAxis,
  IconChevronDown,
  IconCrop,
  IconDownload,
  IconFlip,
  IconFreeze,
  IconFullscreen,
  IconLayout,
  IconMagnet,
  IconMic,
  IconRedo,
  IconReference,
  IconReverse,
  IconScissors,
  IconSplitScene,
  IconTranscript,
  IconTrash,
  IconUndo,
  IconVolume,
  IconVolumeOff,
  IconLink,
  IconPlus,
} from './icons';

type Drag = {
  clipId: string;
  mode: 'move' | 'trim-start' | 'trim-end';
  origDuration: number;
  origStart: number;
  startX: number;
};

/**
 * Bottom multi-track timeline, rebuilt to CapCut's shape (CAPCUT-FIX R1–R7,
 * F2, W1, Y6/Y7/Y13/Y14). Icon-only ~50px toolbar in CapCut's order, dashed
 * empty state, name + speaker + link track headers, neutral clip bodies with
 * filmstrip/waveform look, teal selection ring, CapCut-order context menu.
 * Drag/trim/snap/seek logic is unchanged from the previous version.
 */
export default function TimelineShell() {
  const project = useProjectStore((s) => s.project);
  const tracks = project?.tracks ?? [];
  const playhead = useProjectStore((s) => s.playhead);
  const zoom = useProjectStore((s) => s.zoom);
  const setZoom = useProjectStore((s) => s.setZoom);
  const magnetic = useProjectStore((s) => s.magnetic);
  const setMagnetic = useProjectStore((s) => s.setMagnetic);
  const previewAxis = useProjectStore((s) => s.previewAxis);
  const setPreviewAxis = useProjectStore((s) => s.setPreviewAxis);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const selectClip = useProjectStore((s) => s.selectClip);
  const selectAllClips = useProjectStore((s) => s.selectAllClips);
  const selectTrack = useProjectStore((s) => s.selectTrack);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const undoCount = useProjectStore((s) => s.undoStack.length);
  const redoCount = useProjectStore((s) => s.redoStack.length);
  const clipboard = useProjectStore((s) => s.clipboard);
  const splitAtPlayhead = useProjectStore((s) => s.splitAtPlayhead);
  const deleteSelected = useProjectStore((s) => s.deleteSelected);
  const duplicateSelected = useProjectStore((s) => s.duplicateSelected);
  const freezeSelected = useProjectStore((s) => s.freezeSelected);
  const reverseSelected = useProjectStore((s) => s.reverseSelected);
  const copySelected = useProjectStore((s) => s.copySelected);
  const pasteClipboard = useProjectStore((s) => s.pasteClipboard);
  const addTrack = useProjectStore((s) => s.addTrack);
  const setTrackProp = useProjectStore((s) => s.setTrackProp);
  const detachAudio = useProjectStore((s) => s.detachAudio);
  const moveSelected = useProjectStore((s) => s.moveSelected);
  const trimSelected = useProjectStore((s) => s.trimSelected);
  const snapshot = useProjectStore((s) => s.snapshot);
  const updateSelectedClip = useProjectStore((s) => s.updateSelectedClip);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const setAiToolsOverlay = useProjectStore((s) => s.setAiToolsOverlay);
  const setExportOpen = useProjectStore((s) => s.setExportOpen);
  const addMediaItem = useProjectStore((s) => s.addMediaItem);
  const addMediaToTimeline = useProjectStore((s) => s.addMediaToTimeline);
  const addEffect = useProjectStore((s) => s.addEffect);
  const setBuiltinLut = useProjectStore((s) => s.setBuiltinLut);
  const setTransition = useProjectStore((s) => s.setTransition);
  const addStickerClip = useProjectStore((s) => s.addStickerClip);
  const addShapeClip = useProjectStore((s) => s.addShapeClip);
  const addTextClip = useProjectStore((s) => s.addTextClip);
  // v1.0.2 (W4, D15): HTML5 drop targets on clips + a transient hint
  // line (e.g. "can't apply here" when an effect is dropped on a
  // sticker/text clip — never a silent stack).
  const [dropHint, setDropHint] = useState<string | null>(null);
  const [dragOverClipId, setDragOverClipId] = useState<string | null>(null);
  useEffect(() => {
    if (!dropHint) return;
    const t = window.setTimeout(() => setDropHint(null), 4000);
    return () => window.clearTimeout(t);
  }, [dropHint]);

  /** Handle a panel-tile drop on one timeline clip. Returns nothing;
   * the outcome is reported in the hint line. */
  const onClipDrop = (e: React.DragEvent, clipId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverClipId(null);
    const payload = decodePanelDrag(e.dataTransfer);
    if (!payload || !project) return;
    const target = findClip(project, clipId)?.clip;
    if (!target) return;
    if (payload.kind === 'effect') {
      if (!canShowEffects(target.type)) {
        setDropHint(`Effects can't apply to “${target.name}” (${target.type} clips don't show effects) — drop it on a video clip instead.`);
        return;
      }
      const res = addEffect(payload.id, clipId);
      setDropHint(res.status === 'applied' ? `Effect applied to “${target.name}”.` : 'That effect is already on this clip.');
    } else if (payload.kind === 'filter') {
      if (!canShowEffects(target.type)) {
        setDropHint(`Filters can't apply to “${target.name}” (${target.type} clips don't show filters) — drop it on a video clip instead.`);
        return;
      }
      setBuiltinLut(payload.id, clipId);
      setDropHint(`Filter applied to “${target.name}”.`);
    } else if (payload.kind === 'transition') {
      setTransition({ direction: 'right', duration: 0.5, type: payload.id as never }, clipId);
      setDropHint(`Transition applied at the start of “${target.name}”.`);
    } else {
      // sticker / shape / text: add at the drop position inside the clip.
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const at = Math.max(target.start, Math.min(target.start + target.duration, target.start + (e.clientX - rect.left) / zoom));
      if (payload.kind === 'sticker') addStickerClip(payload.id, at);
      else if (payload.kind === 'shape') addShapeClip(payload.id, payload.fill ?? '#7C3AED', at);
      else addTextClip(payload.id, at);
      setDropHint('Added at the drop position.');
    }
  };

  const [, setDrag] = useState<Drag | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; clipId: string } | null>(null);
  const [subMenu, setSubMenu] = useState<string | null>(null);
  const [toolMenu, setToolMenu] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  // Per-track audio/video link state. No store field exists for this, so it
  // is local-only: it changes only this icon's appearance, not clip behaviour.
  const [linkedTracks, setLinkedTracks] = useState<Record<string, boolean>>({});
  const [fileTarget, setFileTarget] = useState<{ kind: 'replace' | 'overlay'; clipId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const duration = project ? projectDuration(project) : 0;
  const totalWidth = Math.max(duration + 10, 30) * zoom;
  const menuClip = menu && project ? findClip(project, menu.clipId)?.clip ?? null : null;
  const selectedClip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const hasClips = tracks.some((t) => t.clips.length > 0);
  const hasSelection = selectedClipIds.length > 0;
  const fps = project?.fps ?? 30;

  // Frame-level snapping with the "Attach" magnet toggle (CapCut Web:
  // frame-level snap, "Attach" on by default). See lib/timeline.ts.
  const snap = (t: number): number => (project ? snapTime(t, project, magnetic, playhead) : Math.max(0, t));

  const onClipPointerDown = (e: React.PointerEvent, clipId: string, start: number, clipDuration: number) => {
    e.stopPropagation();
    selectClip(clipId);
    const target = e.target as HTMLElement;
    const mode: Drag['mode'] = target.dataset.edge === 'start' ? 'trim-start' : target.dataset.edge === 'end' ? 'trim-end' : 'move';
    const d: Drag = { clipId, mode, origDuration: clipDuration, origStart: start, startX: e.clientX };
    dragRef.current = d;
    setDrag(d);
    snapshot();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onClipPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const deltaSec = (e.clientX - d.startX) / zoom;
    if (d.mode === 'move') {
      moveSelected(snap(d.origStart + deltaSec));
    } else if (d.mode === 'trim-start') {
      trimSelected('start', deltaSec);
      // trimSelected is delta-based from current state; reset the drag origin each move.
      dragRef.current = { ...d, origStart: d.origStart + deltaSec, origDuration: d.origDuration - deltaSec, startX: e.clientX };
      setDrag(dragRef.current);
    } else {
      trimSelected('end', deltaSec);
      dragRef.current = { ...d, origDuration: d.origDuration + deltaSec, startX: e.clientX };
      setDrag(dragRef.current);
    }
  };

  const endDrag = () => {
    dragRef.current = null;
    setDrag(null);
  };

  /** Crop: ask the inspector (worker 1) to open its Basic sub-panel, and
   * focus the inspector panel itself, which is always visible. */
  const openCrop = () => {
    window.dispatchEvent(new CustomEvent('vidora:open-inspector-basic'));
    document.querySelector('[aria-label="Properties"]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const flipSelected = (vertical: boolean) => {
    if (!selectedClip) return;
    updateSelectedClip(vertical ? { flipV: !selectedClip.flipV } : { flipH: !selectedClip.flipH });
  };

  const cutSelected = () => {
    copySelected();
    deleteSelected();
  };

  /** "Download clip" has no single-clip export in this build (the export
   * queue exports the whole project), so both submenu entries open the
   * Export panel, which exports the full timeline. Gap, reported honestly. */
  const openExportForClip = () => setExportOpen(true);

  const openSplitScene = () => setAiToolsOverlay('smart-cut');

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !fileTarget || !project) return;
    const item = await importFile(file);
    if (!item) return;
    addMediaItem(item);
    if (fileTarget.kind === 'replace') {
      // Replaces the clip's media in place (same start/duration slot; the
      // duration follows the new media when it has one). Kind is not
      // validated against the old clip type.
      selectClip(fileTarget.clipId);
      updateSelectedClip({ mediaId: item.id, name: item.name, ...(item.duration ? { duration: item.duration } : {}) });
    } else {
      // Adds the file as a new clip (appended to the matching-kind track,
      // or a new track) via the normal add-to-timeline path.
      addMediaToTimeline(item.id);
    }
    setFileTarget(null);
  };

  const pickFile = (kind: 'replace' | 'overlay', clipId: string) => {
    setFileTarget({ clipId, kind });
    fileInputRef.current?.click();
  };

  const iconBtn =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-300 hover:bg-[#2E2E2E] hover:text-zinc-100 disabled:opacity-35 disabled:hover:bg-transparent';
  const iconBtnActive = 'text-[#00D9D9] hover:bg-[#2E2E2E]';

  const closeMenus = () => {
    setMenu(null);
    setSubMenu(null);
    setToolMenu(null);
  };

  if (collapsed) {
    return (
      <section className="flex h-7 shrink-0 items-center gap-2 border-t border-[#2E2E2E] bg-[#141414] px-3 text-xs text-zinc-400" aria-label="Timeline (collapsed)">
        <span>Timeline</span>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-300 hover:bg-[#2E2E2E]"
          title="Expand timeline panel"
          aria-label="Expand timeline panel"
        >
          <span className="rotate-180 inline-flex">
            <IconChevronDown size={16} />
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="flex h-[clamp(200px,26.7vh,288px)] shrink-0 flex-col border-t border-[#2E2E2E] bg-[#141414] text-zinc-100" aria-label="Timeline" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* v1.0.7 (BUG-CF-040, auto-fit): the timeline is fluid — 288px at
          1080px viewport height (exactly CapCut), 200px on short
          screens (720px tall) so the preview column keeps room. */}
      {/* Toolbar ~50px, icon-only, CapCut order (R1) */}
      <div className="flex h-[50px] shrink-0 items-center gap-0.5 border-b border-[#2E2E2E] bg-[#1E1E1E] px-2 text-xs">
        {/* Left group */}
        <div className="relative">
          <button type="button" onClick={() => setToolMenu(toolMenu === 'add' ? null : 'add')} className={iconBtn} title="Add track" aria-label="Add track" aria-haspopup="menu">
            <IconPlus size={18} />
            <IconChevronDown size={12} />
          </button>
          {toolMenu === 'add' && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setToolMenu(null)} />
              <div role="menu" className="absolute left-0 top-9 z-50 w-36 overflow-hidden rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] py-1 text-xs shadow-2xl">
                {(['video', 'audio', 'text', 'sticker'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-1.5 text-left capitalize hover:bg-[#2E2E2E]"
                    onClick={() => {
                      addTrack(kind);
                      setToolMenu(null);
                    }}
                  >
                    {kind === 'video' ? 'Video' : kind === 'audio' ? 'Audio' : kind === 'text' ? 'Text' : 'Stickers'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="relative">
          <button type="button" onClick={() => setToolMenu(toolMenu === 'select' ? null : 'select')} className={iconBtn} title="Select" aria-label="Select" aria-haspopup="menu">
            <IconLayout size={18} />
            <IconChevronDown size={12} />
          </button>
          {toolMenu === 'select' && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setToolMenu(null)} />
              <div role="menu" className="absolute left-0 top-9 z-50 w-44 overflow-hidden rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] py-1 text-xs shadow-2xl">
                <button type="button" role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => { selectAllClips(); setToolMenu(null); }}>
                  Select all (Ctrl+A)
                </button>
                <button type="button" role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => { selectClip(null); setToolMenu(null); }}>
                  Select none
                </button>
              </div>
            </>
          )}
        </div>
        <button type="button" onClick={undo} disabled={undoCount === 0} className={iconBtn} title="Undo (Ctrl+Z)" aria-label="Undo">
          <IconUndo size={18} />
        </button>
        <button type="button" onClick={redo} disabled={redoCount === 0} className={iconBtn} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
          <IconRedo size={18} />
        </button>
        <button type="button" onClick={splitAtPlayhead} disabled={!hasSelection} className={iconBtn} title="Split (Ctrl+B)" aria-label="Split at playhead">
          <IconScissors size={18} />
        </button>
        <button type="button" onClick={deleteSelected} disabled={!hasSelection} className={iconBtn} title="Delete (Backspace)" aria-label="Delete selected clip">
          <IconTrash size={18} />
        </button>
        <button type="button" onClick={reverseSelected} disabled={!hasSelection} className={iconBtn} title="Reverse" aria-label="Reverse clip">
          <IconReverse size={18} />
        </button>
        <button type="button" onClick={openCrop} disabled={!hasSelection} className={iconBtn} title="Crop" aria-label="Crop selected clip">
          <IconCrop size={18} />
        </button>
        <button type="button" onClick={() => flipSelected(false)} disabled={!hasSelection} className={iconBtn} title="Flip horizontal" aria-label="Flip horizontal">
          <IconFlip size={18} />
        </button>
        <button type="button" onClick={freezeSelected} disabled={!hasSelection} className={iconBtn} title="Freeze" aria-label="Freeze frame">
          <IconFreeze size={18} />
        </button>
        <button type="button" onClick={() => setActiveTab('Captions')} className={iconBtn} title="Transcript-based editing" aria-label="Transcript-based editing">
          <IconTranscript size={18} />
        </button>
        <button type="button" onClick={openSplitScene} disabled={!hasSelection} className={iconBtn} title="Split scene — automatically find scenes in a video and split it into several clips" aria-label="Split scene">
          <IconSplitScene size={18} />
        </button>
        <button type="button" onClick={() => setActiveTab('Media')} className={iconBtn} title="Create from reference" aria-label="Create from reference">
          <IconReference size={18} />
        </button>
        <div className="relative">
          <button type="button" onClick={() => setToolMenu(toolMenu === 'download' ? null : 'download')} disabled={!hasSelection} className={iconBtn} title="Download clip" aria-label="Download clip" aria-haspopup="menu">
            <IconDownload size={18} />
            <IconChevronDown size={12} />
          </button>
          {toolMenu === 'download' && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setToolMenu(null)} />
              <div role="menu" className="absolute left-0 top-9 z-50 w-40 overflow-hidden rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] py-1 text-xs shadow-2xl">
                <button type="button" role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => { openExportForClip(); setToolMenu(null); }}>
                  This clip
                </button>
                <button type="button" role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => { openExportForClip(); setToolMenu(null); }}>
                  This track
                </button>
              </div>
            </>
          )}
        </div>
        <button type="button" onClick={() => setActiveTab('Audio')} className={iconBtn} title="Voiceover" aria-label="Voiceover">
          <IconMic size={18} />
        </button>

        {/* Center: intentionally empty (v1.0.2 D9) — play + timecode live
            ONLY in the preview bottom bar, never in the timeline toolbar. */}

        {/* Right group */}
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setMagnetic(!magnetic)}
            aria-pressed={magnetic}
            className={`${iconBtn} ${magnetic ? iconBtnActive : ''}`}
            title={magnetic ? 'Turn off Attach (N)' : 'Turn on Attach (N)'}
            aria-label="Attach"
          >
            <IconMagnet size={18} />
          </button>
          <button
            type="button"
            onClick={() => setPreviewAxis(!previewAxis)}
            aria-pressed={previewAxis}
            className={`${iconBtn} ${previewAxis ? iconBtnActive : ''}`}
            title={previewAxis ? 'Turn off preview axis (S)' : 'Turn on preview axis (S)'}
            aria-label="Preview axis"
          >
            <IconAxis size={18} />
          </button>
          <span className="mx-1 h-5 w-px bg-[#2E2E2E]" aria-hidden="true" />
          <button type="button" onClick={() => setZoom(Math.max(8, zoom - 8))} className={iconBtn} title="Zoom out (Ctrl+-)" aria-label="Zoom out">
            <span className="text-base leading-none">−</span>
          </button>
          <input type="range" min={8} max={120} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Timeline zoom" className="w-24 accent-[#00D9D9]" />
          <button type="button" onClick={() => setZoom(Math.min(120, zoom + 8))} className={iconBtn} title="Zoom in (Ctrl++)" aria-label="Zoom in">
            <span className="text-base leading-none">+</span>
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('vidora:preview-fullscreen'))}
            className={iconBtn}
            title="Fullscreen (Ctrl+Shift+F)"
            aria-label="Fullscreen preview"
          >
            <IconFullscreen size={18} />
          </button>
          <button type="button" onClick={() => setCollapsed(true)} className={iconBtn} title="Collapse timeline panel" aria-label="Collapse timeline panel">
            <IconChevronDown size={18} />
          </button>
        </div>
      </div>

      {dropHint && (
        <div className="shrink-0 border-b border-[#2E2E2E] bg-[#1E1E1E] px-3 py-1.5 text-[11px] text-[#A8A8A8]" role="status">
          {dropHint}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {hasClips && (
          <div className="w-36 shrink-0 overflow-y-auto border-r border-[#2E2E2E] bg-[#1E1E1E]">
            {tracks
              .filter((t) => t.clips.length > 0)
              .map((track) => {
                const linked = linkedTracks[track.id] ?? true;
                return (
                  <div key={track.id} className="flex h-14 flex-col justify-center border-b border-[#2E2E2E] px-2" onClick={() => selectTrack(track.id)}>
                    <span className="truncate text-xs font-medium text-zinc-200">{track.name}</span>
                    <span className="mt-1 flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setTrackProp(track.id, { muted: !track.muted }); }}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-300 hover:bg-[#2E2E2E]"
                        title={track.muted ? 'Unmute track' : 'Mute track'}
                        aria-label={track.muted ? 'Unmute track' : 'Mute track'}
                      >
                        {track.muted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setLinkedTracks((prev) => ({ ...prev, [track.id]: !linked })); }}
                        className={`flex h-6 w-6 items-center justify-center rounded-md hover:bg-[#2E2E2E] ${linked ? 'text-[#00D9D9]' : 'text-zinc-500'}`}
                        title={linked ? 'Unlink audio and video (local display only — no linked-audio state exists in this build)' : 'Link audio and video (local display only — no linked-audio state exists in this build)'}
                        aria-label={linked ? 'Unlink audio and video' : 'Link audio and video'}
                        aria-pressed={linked}
                      >
                        <IconLink size={16} />
                      </button>
                    </span>
                  </div>
                );
              })}
          </div>
        )}

        <div
          className="min-w-0 flex-1 overflow-x-auto overflow-y-auto"
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            // Ruler/timecode are frame-based (CapCut Web): seek to the nearest frame.
            setPlayhead(snapToFrame(Math.max(0, (e.clientX - rect.left) / zoom), fps));
          }}
        >
          <div className="relative" style={{ width: totalWidth, minWidth: '100%', minHeight: '100%' }}>
            {/* Ruler — neutral, red playhead with handle (R5) */}
            <div className="relative h-6 border-b border-[#2E2E2E]">
              {hasClips &&
                Array.from({ length: Math.ceil(totalWidth / zoom) + 1 }, (_, i) => {
                  // CapCut-fix (2026-11-25, R5): ruler labels every 5 s
                  // ("00:00", "00:05", …) with a minor tick each second.
                  const labelled = i % 5 === 0;
                  const mm = String(Math.floor(i / 60)).padStart(2, '0');
                  const ss = String(i % 60).padStart(2, '0');
                  return (
                    <span
                      key={i}
                      className={`absolute top-0 border-l pl-1 font-mono text-[10px] text-zinc-500 ${labelled ? 'h-full border-[#3A3A3A]' : 'h-1.5 border-[#2E2E2E]'}`}
                      style={{ left: i * zoom }}
                    >
                      {labelled ? `${mm}:${ss}` : ''}
                    </span>
                  );
                })}
              {/* Review comments (Phase 8, L-COLLAB): amber dots on the ruler;
                  click one to jump to that moment. Resolved comments are dimmed. */}
              {(project?.comments ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPlayhead(c.time);
                  }}
                  className={`absolute top-0.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full ${c.resolved ? 'bg-zinc-600' : 'bg-amber-400'}`}
                  style={{ left: c.time * zoom }}
                  title={`Comment @ ${formatCommentTime(c.time)} — ${c.author}: ${c.text}`}
                  aria-label={`Comment at ${formatCommentTime(c.time)}: ${c.text}`}
                />
              ))}
              <span className="pointer-events-none absolute top-0 h-full w-0.5 bg-red-500" style={{ left: playhead * zoom }} />
              <span className="pointer-events-none absolute top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-b bg-red-500" style={{ left: playhead * zoom }} aria-hidden="true" />
            </div>
            {!hasClips ? (
              <div className="flex p-8">
                <div className="flex h-28 w-full items-center justify-start gap-3 rounded-xl border border-dashed border-[#3A3A3A] px-4 text-left text-sm text-zinc-400">
                  {/* Filmstrip icon (v1.0.2 D8) — inline here; icons.tsx is
                      outside this worker's file scope, move it there later. */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5" />
                  </svg>
                  <span>Drag material here and start to create</span>
                </div>
              </div>
            ) : (
              tracks
                .filter((t) => t.clips.length > 0)
                .map((track) => (
                  <div key={track.id} className="relative h-14 border-b border-[#2E2E2E]" style={{ opacity: track.hidden ? 0.35 : 1 }}>
                    {track.clips.map((clip) => {
                      const selected = selectedClipIds.includes(clip.id);
                      const media = project?.media.find((m) => m.id === clip.mediaId);
                      return (
                        <div
                          key={clip.id}
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectClip(clip.id, e.ctrlKey || e.metaKey);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            selectClip(clip.id);
                            setSubMenu(null);
                            setMenu({ x: e.clientX, y: e.clientY, clipId: clip.id });
                          }}
                          onPointerDown={(e) => onClipPointerDown(e, clip.id, clip.start, clip.duration)}
                          onPointerMove={onClipPointerMove}
                          onPointerUp={endDrag}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverClipId(clip.id); }}
                          onDragLeave={() => setDragOverClipId((cur) => (cur === clip.id ? null : cur))}
                          onDrop={(e) => onClipDrop(e, clip.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Delete') deleteSelected();
                          }}
                          className={`absolute top-2 bottom-2 flex cursor-grab items-center overflow-hidden rounded-md bg-[#262626] px-2 text-xs select-none ${
                            dragOverClipId === clip.id ? 'ring-2 ring-[#00D9D9] brightness-125' : selected ? 'ring-2 ring-[#00D9D9]' : 'ring-1 ring-[#3A3A3A]'
                          }`}
                          style={{
                            left: clip.start * zoom,
                            width: Math.max(clip.duration * zoom, 12),
                            ...(media?.thumbnail
                              ? { backgroundImage: `url(${media.thumbnail})`, backgroundPosition: 'center', backgroundSize: 'cover' }
                              : {}),
                          }}
                          title={`${clip.name} · ${clip.duration.toFixed(2)}s · ${clip.speed}×${clip.reversed ? ' · reversed' : ''}${clip.frozen ? ' · frozen' : ''}${clip.groupId ? ' · grouped' : ''}`}
                        >
                          {media?.thumbnail && <span className="pointer-events-none absolute inset-0 bg-black/45" aria-hidden="true" />}
                          <span data-edge="start" className="absolute top-0 left-0 h-full w-2 cursor-ew-resize bg-white/30" title="Drag to trim start" />
                          {clip.type === 'audio' && media?.peaks && media.peaks.length > 0 && (
                            <span className="pointer-events-none absolute inset-x-1 bottom-0.5 flex h-5 items-end gap-px opacity-80" aria-hidden="true">
                              {media.peaks.map((p, i) => (
                                <span key={i} className="w-0.5 shrink-0 bg-white/80" style={{ height: `${Math.max(8, Math.round(p * 100))}%` }} />
                              ))}
                            </span>
                          )}
                          <span className="relative truncate px-1 text-zinc-100 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                            {clip.name} · {clip.duration.toFixed(1)}s{clip.speed !== 1 ? ` · ${clip.speed}×` : ''}
                          </span>
                          <span data-edge="end" className="absolute top-0 right-0 h-full w-2 cursor-ew-resize bg-white/30" title="Drag to trim end" />
                        </div>
                      );
                    })}
                    <span className="pointer-events-none absolute top-0 h-full w-0.5 bg-red-500/70" style={{ left: playhead * zoom }} />
                  </div>
                ))
            )}
            <span className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: playhead * zoom }} />
          </div>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="video/*,image/*,audio/*" className="hidden" aria-hidden="true" tabIndex={-1} onChange={onFilePicked} />
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenus} onContextMenu={(e) => { e.preventDefault(); closeMenus(); }} />
          <div
            role="menu"
            aria-label="Clip context menu"
            className="fixed z-50 w-56 overflow-visible rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] py-1 text-xs text-zinc-100 shadow-2xl"
            style={{ left: Math.min(menu.x, window.innerWidth - 240), top: Math.min(menu.y, window.innerHeight - 480) }}
          >
            {/* CapCut order (R6): Split, Copy, Cut, Paste, Duplicate, Delete,
                Replace, Download clip ⌄, Transcript-based editing, Separate
                audio, Split scene, Freeze, Crop, Flip ⌄, Overlay ⌄, Add overlay. */}
            {[
              { key: 'split', label: 'Split (Ctrl B)', disabled: false, run: () => splitAtPlayhead() },
              { key: 'copy', label: 'Copy (Ctrl C)', disabled: false, run: () => copySelected() },
              { key: 'cut', label: 'Cut (Ctrl X)', disabled: false, run: () => cutSelected() },
              { key: 'paste', label: 'Paste (Ctrl V)', disabled: !clipboard || clipboard.length === 0, disabledReason: 'Clipboard is empty', run: () => pasteClipboard() },
              { key: 'duplicate', label: 'Duplicate (Ctrl D)', disabled: false, run: () => duplicateSelected() },
              { key: 'delete', label: 'Delete (Backspace)', disabled: false, run: () => deleteSelected() },
              { key: 'replace', label: 'Replace (Choose File)', disabled: false, run: () => pickFile('replace', menu.clipId) },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                title={item.disabled ? item.disabledReason : undefined}
                onClick={() => { item.run(); closeMenus(); }}
                className="block w-full px-3 py-1.5 text-left hover:bg-[#2E2E2E] disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {item.label}
              </button>
            ))}
            {/* Download clip (submenu) */}
            <div className="relative" onMouseEnter={() => setSubMenu('download')} onMouseLeave={() => setSubMenu(null)}>
              <button type="button" role="menuitem" aria-haspopup="menu" className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => setSubMenu(subMenu === 'download' ? null : 'download')}>
                Download clip <span aria-hidden="true">›</span>
              </button>
              {subMenu === 'download' && (
                <div role="menu" className="absolute top-0 left-full z-50 w-40 overflow-hidden rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] py-1 shadow-2xl">
                  <button type="button" role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => { openExportForClip(); closeMenus(); }}>
                    This clip
                  </button>
                  <button type="button" role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => { openExportForClip(); closeMenus(); }}>
                    This track
                  </button>
                </div>
              )}
            </div>
            {[
              { key: 'transcript', label: 'Transcript-based editing', disabled: false, run: () => setActiveTab('Captions') },
              {
                key: 'separate',
                label: 'Separate audio (Ctrl Shift S)',
                disabled: !(menuClip?.type === 'video' && !menuClip.audioDetached),
                disabledReason: menuClip?.type !== 'video' ? 'Only video clips have audio to separate' : 'Audio is already separated',
                run: () => detachAudio(),
              },
              { key: 'splitscene', label: 'Split scene', disabled: false, run: () => openSplitScene() },
              { key: 'freeze', label: 'Freeze', disabled: false, run: () => freezeSelected() },
              { key: 'crop', label: 'Crop', disabled: false, run: () => openCrop() },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                title={item.disabled ? item.disabledReason : undefined}
                onClick={() => { item.run(); closeMenus(); }}
                className="block w-full px-3 py-1.5 text-left hover:bg-[#2E2E2E] disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {item.label}
              </button>
            ))}
            {/* Flip (submenu) */}
            <div className="relative" onMouseEnter={() => setSubMenu('flip')} onMouseLeave={() => setSubMenu(null)}>
              <button type="button" role="menuitem" aria-haspopup="menu" className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => setSubMenu(subMenu === 'flip' ? null : 'flip')}>
                Flip <span aria-hidden="true">›</span>
              </button>
              {subMenu === 'flip' && (
                <div role="menu" className="absolute top-0 left-full z-50 w-40 overflow-hidden rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] py-1 shadow-2xl">
                  <button type="button" role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => { flipSelected(false); closeMenus(); }}>
                    Horizontal
                  </button>
                  <button type="button" role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => { flipSelected(true); closeMenus(); }}>
                    Vertical
                  </button>
                </div>
              )}
            </div>
            {/* Overlay (submenu) */}
            <div className="relative" onMouseEnter={() => setSubMenu('overlay')} onMouseLeave={() => setSubMenu(null)}>
              <button type="button" role="menuitem" aria-haspopup="menu" className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => setSubMenu(subMenu === 'overlay' ? null : 'overlay')}>
                Overlay <span aria-hidden="true">›</span>
              </button>
              {subMenu === 'overlay' && (
                <div role="menu" className="absolute top-0 left-full z-50 w-48 overflow-hidden rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] py-1 shadow-2xl">
                  <button type="button" role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => { pickFile('overlay', menu.clipId); closeMenus(); }}>
                    Add overlay (Choose File)
                  </button>
                </div>
              )}
            </div>
            <button type="button" role="menuitem" className="block w-full px-3 py-1.5 text-left hover:bg-[#2E2E2E]" onClick={() => { pickFile('overlay', menu.clipId); closeMenus(); }}>
              Add overlay (Choose File)
            </button>
          </div>
        </>
      )}
    </section>
  );
}
