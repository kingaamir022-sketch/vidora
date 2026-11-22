import { useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { projectDuration } from '../lib/timeline';
import { formatTimecode } from './PreviewArea';

type Drag = {
  clipId: string;
  mode: 'move' | 'trim-start' | 'trim-end';
  origDuration: number;
  origStart: number;
  startX: number;
};

/** Bottom multi-track timeline (Phase 1, SPEC B): split/trim/drag, markers, zoom, snapping, ripple. */
export default function TimelineShell() {
  const project = useProjectStore((s) => s.project);
  const tracks = project?.tracks ?? [];
  const playhead = useProjectStore((s) => s.playhead);
  const zoom = useProjectStore((s) => s.zoom);
  const setZoom = useProjectStore((s) => s.setZoom);
  const magnetic = useProjectStore((s) => s.magnetic);
  const setMagnetic = useProjectStore((s) => s.setMagnetic);
  const ripple = useProjectStore((s) => s.ripple);
  const setRipple = useProjectStore((s) => s.setRipple);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const selectClip = useProjectStore((s) => s.selectClip);
  const selectTrack = useProjectStore((s) => s.selectTrack);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);
  const setPlaying = useProjectStore((s) => s.setPlaying);
  const splitAtPlayhead = useProjectStore((s) => s.splitAtPlayhead);
  const deleteSelected = useProjectStore((s) => s.deleteSelected);
  const duplicateSelected = useProjectStore((s) => s.duplicateSelected);
  const rippleDeleteSelected = useProjectStore((s) => s.rippleDeleteSelected);
  const freezeSelected = useProjectStore((s) => s.freezeSelected);
  const reverseSelected = useProjectStore((s) => s.reverseSelected);
  const copySelected = useProjectStore((s) => s.copySelected);
  const pasteClipboard = useProjectStore((s) => s.pasteClipboard);
  const groupSelected = useProjectStore((s) => s.groupSelected);
  const ungroupSelected = useProjectStore((s) => s.ungroupSelected);
  const makeCompoundSelected = useProjectStore((s) => s.makeCompoundSelected);
  const addMarker = useProjectStore((s) => s.addMarker);
  const addTrack = useProjectStore((s) => s.addTrack);
  const setTrackProp = useProjectStore((s) => s.setTrackProp);
  const moveSelected = useProjectStore((s) => s.moveSelected);
  const trimSelected = useProjectStore((s) => s.trimSelected);
  const snapshot = useProjectStore((s) => s.snapshot);

  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const duration = project ? projectDuration(project) : 0;
  const totalWidth = Math.max(duration + 10, 30) * zoom;

  const snap = (t: number): number => {
    if (!magnetic || !project) return Math.max(0, t);
    const candidates: number[] = [0, playhead, ...project.markers.map((m) => m.time)];
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        candidates.push(clip.start, clip.start + clip.duration);
      }
    }
    let best = t;
    let bestDist = 0.25;
    for (const c of candidates) {
      const d = Math.abs(c - t);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return Math.max(0, best);
  };

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

  const toolbarBtn = 'rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800 disabled:opacity-40';
  const hasSelection = selectedClipIds.length > 0;

  return (
    <section className="flex h-72 shrink-0 flex-col border-t border-zinc-800 bg-zinc-950 text-zinc-100" aria-label="Timeline">
      <div className="flex h-10 flex-wrap items-center gap-1.5 border-b border-zinc-800 px-3 py-1 text-xs text-zinc-400">
        <span className="font-semibold text-zinc-200">Timeline</span>
        <button type="button" onClick={splitAtPlayhead} disabled={!hasSelection} className={toolbarBtn} title="Split clip at playhead (S)">
          ✂ Split
        </button>
        <button type="button" onClick={deleteSelected} disabled={!hasSelection} className={toolbarBtn} title="Delete selected clip (Delete)">
          Delete
        </button>
        <button type="button" onClick={ripple ? rippleDeleteSelected : deleteSelected} disabled={!hasSelection} className={toolbarBtn} title="Ripple delete selected clip (Shift+Delete)">
          Ripple delete
        </button>
        <button type="button" onClick={duplicateSelected} disabled={!hasSelection} className={toolbarBtn} title="Duplicate (Ctrl+D)">
          Duplicate
        </button>
        <button type="button" onClick={copySelected} disabled={!hasSelection} className={toolbarBtn} title="Copy (Ctrl+C)">
          Copy
        </button>
        <button type="button" onClick={pasteClipboard} className={toolbarBtn} title="Paste (Ctrl+V)">
          Paste
        </button>
        <button type="button" onClick={freezeSelected} disabled={!hasSelection} className={toolbarBtn} title="Freeze frame">
          Freeze
        </button>
        <button type="button" onClick={reverseSelected} disabled={!hasSelection} className={toolbarBtn} title="Reverse clip">
          Reverse
        </button>
        <button type="button" onClick={groupSelected} disabled={selectedClipIds.length < 2} className={toolbarBtn} title="Group selected clips">
          Group
        </button>
        <button type="button" onClick={ungroupSelected} disabled={!hasSelection} className={toolbarBtn} title="Ungroup">
          Ungroup
        </button>
        <button type="button" onClick={makeCompoundSelected} disabled={selectedClipIds.length < 2} className={toolbarBtn} title="Make compound clip">
          Compound
        </button>
        <button type="button" onClick={() => addMarker()} className={toolbarBtn} title="Add marker at playhead (M)">
          + Marker
        </button>
        <label className="ml-2 flex items-center gap-1">
          <input type="checkbox" checked={magnetic} onChange={(e) => setMagnetic(e.target.checked)} /> Snap
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={ripple} onChange={(e) => setRipple(e.target.checked)} /> Ripple
        </label>
        <label className="ml-auto flex items-center gap-1">
          Zoom
          <input type="range" min={8} max={120} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Timeline zoom" className="w-24" />
        </label>
        <span className="font-mono">{formatTimecode(playhead, project?.fps ?? 30)}</span>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="w-36 shrink-0 overflow-y-auto border-r border-zinc-800">
          {tracks.map((track) => (
            <div key={track.id} className="flex h-14 flex-col justify-center border-b border-zinc-800/70 px-2" onClick={() => selectTrack(track.id)}>
              <span className="truncate text-xs font-medium">{track.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">{track.kind}</span>
              <span className="mt-0.5 flex gap-1">
                <button type="button" onClick={(e) => { e.stopPropagation(); setTrackProp(track.id, { locked: !track.locked }); }} className="rounded border border-zinc-700 px-1 text-[10px]" title={track.locked ? 'Unlock track' : 'Lock track'}>
                  {track.locked ? '🔒' : '🔓'}
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setTrackProp(track.id, { hidden: !track.hidden }); }} className="rounded border border-zinc-700 px-1 text-[10px]" title={track.hidden ? 'Show track' : 'Hide track'}>
                  {track.hidden ? '🙈' : '👁'}
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setTrackProp(track.id, { muted: !track.muted }); }} className="rounded border border-zinc-700 px-1 text-[10px]" title={track.muted ? 'Unmute track' : 'Mute track'}>
                  {track.muted ? '🔇' : '🔊'}
                </button>
              </span>
            </div>
          ))}
          <div className="flex gap-1 p-2">
            <button type="button" onClick={() => addTrack('video')} className={toolbarBtn}>
              + Video track
            </button>
            <button type="button" onClick={() => addTrack('audio')} className={toolbarBtn}>
              + Audio
            </button>
            <button type="button" onClick={() => addTrack('text')} className={toolbarBtn}>
              + Text
            </button>
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto overflow-y-auto" onClick={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setPlayhead(Math.max(0, (e.clientX - rect.left) / zoom));
        }}>
          <div className="relative" style={{ width: totalWidth, minHeight: '100%' }}>
            {/* Ruler */}
            <div className="relative h-6 border-b border-zinc-800">
              {Array.from({ length: Math.ceil(totalWidth / zoom) + 1 }, (_, i) => (
                <span key={i} className="absolute top-0 border-l border-zinc-700 pl-1 font-mono text-[10px] text-zinc-500" style={{ left: i * zoom }}>
                  {i}s
                </span>
              ))}
              {(project?.markers ?? []).map((m) => (
                <span key={m.time} className="absolute top-0 h-full w-0.5 bg-cyan-400" style={{ left: m.time * zoom }} title={`${m.label} @ ${m.time}s`} />
              ))}
              <span className="absolute top-0 h-full w-0.5 bg-red-500" style={{ left: playhead * zoom }} />
            </div>
            {tracks.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500">No tracks yet. Add a track, then import media and add it to the timeline.</p>
            ) : (
              tracks.map((track) => (
                <div key={track.id} className="relative h-14 border-b border-zinc-800/70" style={{ opacity: track.hidden ? 0.35 : 1 }}>
                  {track.clips.map((clip) => {
                    const selected = selectedClipIds.includes(clip.id);
                    return (
                      <div
                        key={clip.id}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectClip(clip.id, e.ctrlKey || e.metaKey);
                        }}
                        onPointerDown={(e) => onClipPointerDown(e, clip.id, clip.start, clip.duration)}
                        onPointerMove={onClipPointerMove}
                        onPointerUp={endDrag}
                        onKeyDown={(e) => {
                          if (e.key === 'Delete') deleteSelected();
                        }}
                        className={`absolute top-2 bottom-2 flex cursor-grab items-center overflow-hidden rounded-md px-2 text-xs select-none ${
                          clip.type === 'audio' ? 'bg-emerald-600/70' : clip.type === 'image' ? 'bg-amber-600/70' : clip.isCompound ? 'bg-fuchsia-600/70' : 'bg-violet-600/70'
                        } ${selected ? 'ring-2 ring-white' : ''}`}
                        style={{ left: clip.start * zoom, width: Math.max(clip.duration * zoom, 12) }}
                        title={`${clip.name} · ${clip.duration.toFixed(2)}s · ${clip.speed}×${clip.reversed ? ' · reversed' : ''}${clip.frozen ? ' · frozen' : ''}${clip.groupId ? ' · grouped' : ''}`}
                      >
                        <span data-edge="start" className="absolute top-0 left-0 h-full w-2 cursor-ew-resize bg-white/30" title="Drag to trim start" />
                        <span className="truncate px-1">
                          {clip.name} {clip.speed !== 1 ? `· ${clip.speed}×` : ''}
                        </span>
                        <span data-edge="end" className="absolute top-0 right-0 h-full w-2 cursor-ew-resize bg-white/30" title="Drag to trim end" />
                      </div>
                    );
                  })}
                  <span className="absolute top-0 h-full w-0.5 bg-red-500/70" style={{ left: playhead * zoom }} />
                </div>
              ))
            )}
            <span className="absolute top-0 bottom-0 w-0.5 bg-red-500" style={{ left: playhead * zoom }} />
          </div>
        </div>
      </div>
      <div className="flex h-6 items-center gap-3 border-t border-zinc-800 px-3 text-[11px] text-zinc-500">
        <span>Click the ruler / track area to seek. Drag a clip to move it; drag its edges to trim.</span>
        <button type="button" onClick={() => setPlaying(true)} className="ml-auto rounded border border-zinc-700 px-2 py-0.5 text-zinc-300">
          Play from playhead
        </button>
        <span>{drag ? `Dragging (${drag.mode})…` : `${tracks.length} tracks · ${duration.toFixed(1)}s total`}</span>
      </div>
    </section>
  );
}
