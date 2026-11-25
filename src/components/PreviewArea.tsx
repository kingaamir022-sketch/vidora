import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip, projectDuration } from '../lib/timeline';
import {
  IconChevronDown,
  IconCrop,
  IconDots,
  IconDownload,
  IconFit,
  IconFullscreen,
  IconMenu,
  IconPause,
  IconPlay,
  IconSparkles,
} from './icons';
import type { Clip, Track } from '../schema/project';
import { shouldSpeak } from '../lib/tts';
import { effectiveClipGainForProject } from '../lib/audio';
import { AudioEngine, type ClipAudioState } from '../lib/audioEngine';
import {
  createRenderPool,
  disposeRenderPool,
  formatTimecode,
  renderTimelineFrame,
  type RenderPool,
} from '../lib/renderFrame';

/** Center preview (Phase 2): canvas compositor with keyframes, effects,
 * LUT, colour, masks, transitions, PiP / split-screen and backgrounds.
 * CapCut-fix (P1–P4, v1.0.1): title "Player-Timeline 01" + ≡ menu,
 * bottom bar (timecode / play / Full / fit / Ratio / fullscreen),
 * floating clip toolbar, preview axis, hand/move tools, empty state. */
export default function PreviewArea() {
  const project = useProjectStore((s) => s.project);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const setAspectRatio = useProjectStore((s) => s.setAspectRatio);
  const playhead = useProjectStore((s) => s.playhead);
  const playing = useProjectStore((s) => s.playing);
  const setPlaying = useProjectStore((s) => s.setPlaying);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);
  const previewAxis = useProjectStore((s) => s.previewAxis);
  const previewTool = useProjectStore((s) => s.previewTool);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const setAiToolsOverlay = useProjectStore((s) => s.setAiToolsOverlay);
  const addMediaFiles = useProjectStore((s) => s.addMediaFiles);
  const splitAtPlayhead = useProjectStore((s) => s.splitAtPlayhead);
  const copySelected = useProjectStore((s) => s.copySelected);
  const pasteClipboard = useProjectStore((s) => s.pasteClipboard);
  const deleteSelected = useProjectStore((s) => s.deleteSelected);
  const duplicateSelected = useProjectStore((s) => s.duplicateSelected);
  const detachAudio = useProjectStore((s) => s.detachAudio);
  const freezeSelected = useProjectStore((s) => s.freezeSelected);
  const reverseSelected = useProjectStore((s) => s.reverseSelected);
  const updateSelectedClip = useProjectStore((s) => s.updateSelectedClip);
  const maskEditing = useProjectStore((s) => s.maskEditing);
  const addPenPoint = useProjectStore((s) => s.addPenPoint);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const drawMode = useProjectStore((s) => s.drawMode);
  const addDrawingStroke = useProjectStore((s) => s.addDrawingStroke);
  const trackingMode = useProjectStore((s) => s.trackingMode);
  const addTrackPoint = useProjectStore((s) => s.addTrackPoint);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [loop, setLoop] = useState(false);
  const [showSafe, setShowSafe] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  // CapCut-fix (P1–P4): ≡ menu, Ratio menu, clip "…" menu, pan/zoom.
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [ratioOpen, setRatioOpen] = useState(false);
  const [clipMenuOpen, setClipMenuOpen] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewZoom, setViewZoom] = useState(1);
  const panDragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPoolRef = useRef(new Map<string, HTMLVideoElement>());
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  // Shared frame renderer (Phase 8): the preview and the offline export
  // draw through the same code, so they can never drift apart.
  const renderPoolRef = useRef<RenderPool | null>(null);
  const drawSeqRef = useRef(0);
  const getRenderPool = (): RenderPool => {
    if (!renderPoolRef.current) renderPoolRef.current = createRenderPool();
    return renderPoolRef.current;
  };
  const [videoReady, setVideoReady] = useState(false);
  const prevPlayheadRef = useRef(0);
  const drawingStrokeRef = useRef<{ x: number; y: number }[] | null>(null);

  const duration = project ? projectDuration(project) : 0;
  const fps = project?.fps ?? 30;

  // All visible clips under the playhead (video/image/text), track order.
  const visibleClips: Clip[] = (() => {
    if (!project) return [];
    const out: Clip[] = [];
    for (const track of project.tracks) {
      if (track.hidden || track.kind === 'audio') continue;
      for (const clip of track.clips) {
        if (playhead >= clip.start && playhead < clip.start + clip.duration) out.push(clip);
      }
    }
    return out;
  })();
  const primaryClip = visibleClips.length > 0 ? visibleClips[visibleClips.length - 1] : null;

  // Phase 4 audio engine: one AudioContext; every sounding clip (audio
  // clips AND video clips' embedded audio) routes through it, so volume,
  // fades, keyframes, EQ, voice, noise reduction, ducking, mute/solo and
  // pitch-preserving speed all apply in one place. When Web Audio is
  // unavailable the engine falls back to plain element volume.
  const engineRef = useRef<AudioEngine | null>(null);
  const getEngine = (): AudioEngine => {
    if (!engineRef.current) engineRef.current = new AudioEngine();
    return engineRef.current;
  };

  /** Per-clip audio state for one tick (gain already includes fades,
   * keyframes, ducking, mute, solo and master volume). */
  const audioStateFor = (clip: Clip, track: Track): ClipAudioState => {
    const local = Math.max(0, playhead - clip.start);
    const seekTo = clip.reversed
      ? clip.sourceStart + Math.max(0, (clip.sourceDuration ?? clip.duration) - local * clip.speed)
      : clip.sourceStart + local * clip.speed;
    return {
      chainKey: `${clip.voice}|${clip.noiseReduction}|${clip.eq.low},${clip.eq.mid},${clip.eq.high}`,
      clipId: clip.id,
      eq: clip.eq,
      gain: project ? effectiveClipGainForProject(clip, track, project, playhead) : 0,
      localTime: local,
      noiseReduction: clip.noiseReduction,
      pitchPreserved: clip.pitchPreserved,
      reversed: clip.reversed,
      seekTo,
      speed: clip.speed,
      src: clip.src,
      voiceId: clip.voice,
    };
  };

  /** Sync every audio clip under the playhead through the engine. */
  const syncAllAudio = () => {
    if (!project) return;
    const engine = getEngine();
    const activeIds = new Set<string>(visibleClips.map((c) => c.id));
    for (const track of project.tracks) {
      if (track.kind !== 'audio' || track.hidden) continue;
      for (const clip of track.clips) {
        if (playhead < clip.start || playhead >= clip.start + clip.duration) continue;
        const state = audioStateFor(clip, track);
        if (engine.syncAudioClip(state, playing)) activeIds.add(clip.id);
      }
    }
    engine.prune(activeIds);
  };

  // Video element pool: one hidden <video> per video clip, synced to the playhead.
  const getVideoEl = (clip: Clip): HTMLVideoElement | null => {
    if (clip.type !== 'video' || !clip.src) return null;
    let el = videoPoolRef.current.get(clip.id);
    if (!el) {
      el = document.createElement('video');
      el.muted = false;
      el.playsInline = true;
      el.preload = 'auto';
      el.addEventListener('canplay', () => setVideoReady(true));
      videoPoolRef.current.set(clip.id, el);
    }
    if (el.getAttribute('data-clip') !== clip.id || el.src !== clip.src) {
      el.setAttribute('data-clip', clip.id);
      el.src = clip.src;
      el.load();
    }
    return el;
  };

  // TTS narration: speak once when the playhead enters a narration clip.
  useEffect(() => {
    const prev = prevPlayheadRef.current;
    prevPlayheadRef.current = playhead;
    if (!project || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!playing) {
      window.speechSynthesis.cancel();
      return;
    }
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (!shouldSpeak(clip, prev, playhead) || !clip.text?.tts) continue;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(clip.text.content);
        const voice = window.speechSynthesis.getVoices().find((v) => v.name === clip.text!.tts!.voice);
        if (voice) utter.voice = voice;
        utter.rate = clip.text.tts.rate;
        utter.pitch = clip.text.tts.pitch;
        window.speechSynthesis.speak(utter);
      }
    }
  }, [playhead, playing, project]);

  const syncVideo = (clip: Clip) => {
    const el = getVideoEl(clip);
    if (!el || !project) return;
    const local = Math.max(0, playhead - clip.start);
    const target = clip.frozen
      ? clip.sourceStart
      : clip.reversed
        ? clip.sourceStart + Math.max(0, (clip.sourceDuration ?? clip.duration) - local * clip.speed)
        : clip.sourceStart + local * clip.speed;
    if (Math.abs(el.currentTime - target) > 0.3) el.currentTime = target;
    el.playbackRate = clip.speed;
    // Route the video's embedded audio through the engine (volume, fades,
    // keyframes, ducking, mute/solo, pitch). Falls back to el.volume.
    const track = project.tracks.find((t) => t.clips.some((c) => c.id === clip.id));
    if (track) {
      const routed = getEngine().syncMediaElement(el, audioStateFor(clip, track));
      if (!routed) el.volume = audioStateFor(clip, track).gain;
    } else {
      el.volume = clip.volume;
    }
    if (playing && !clip.frozen) void el.play().catch(() => undefined);
    else el.pause();
  };

  // Sync every visible video clip + every audio clip under the playhead.
  useEffect(() => {
    for (const clip of visibleClips) syncVideo(clip);
    syncAllAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleClips.map((c) => c.id).join(','), playing, Math.round(playhead * 4)]);

  // Resume the AudioContext on play (browsers require a user gesture)
  // and release it when the preview unmounts.
  useEffect(() => {
    if (playing) getEngine().resume();
  }, [playing]);
  useEffect(
    () => () => {
      engineRef.current?.dispose();
      engineRef.current = null;
      if (renderPoolRef.current) disposeRenderPool(renderPoolRef.current);
      renderPoolRef.current = null;
    },
    [],
  );

  // Playhead driver.
  useEffect(() => {
    if (!playing || !project) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = useProjectStore.getState().playhead + dt;
      if (next >= duration) {
        if (loop && duration > 0) {
          useProjectStore.getState().setPlayhead(0);
          last = now;
          raf = requestAnimationFrame(tick);
          return;
        }
        useProjectStore.getState().setPlayhead(duration);
        useProjectStore.getState().setPlaying(false);
        return;
      }
      useProjectStore.getState().setPlayhead(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, project, duration, loop]);

  // Background image for the primary clip.
  useEffect(() => {
    const src = primaryClip?.background.imageSrc;
    if (primaryClip?.background.type === 'image' && src) {
      const img = new Image();
      img.onload = () => {
        bgImageRef.current = img;
      };
      img.src = src;
    } else {
      bgImageRef.current = null;
    }
  }, [primaryClip?.background.type, primaryClip?.background.imageSrc]);

  // Main compositor draw — shared with the offline export (Phase 8,
  // src/lib/renderFrame.ts). Draws are async (video seeks); a newer
  // playhead aborts a stale draw via the sequence token.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const seq = ++drawSeqRef.current;
    const pool = getRenderPool();
    pool.bgImage = bgImageRef.current;
    void renderTimelineFrame(ctx, project, playhead, canvas.width, canvas.height, fps, pool, {
      isCurrent: () => drawSeqRef.current === seq,
      maskEditing,
      showBadges: true,
    });
    void videoReady;
  });

  const canvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // CapCut-fix (P4): hand tool (H) drags the preview to pan; move tool
    // (V) is the default. Pan is a view transform only — it never edits.
    if (previewTool === 'hand') {
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      panDragRef.current = { panX: pan.x, panY: pan.y, startX: e.clientX, startY: e.clientY };
      return;
    }
    if (drawMode) {
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      drawingStrokeRef.current = [canvasPoint(e)];
      return;
    }
    if (trackingMode) {
      const clip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
      if (clip?.tracking) {
        const p = canvasPoint(e);
        addTrackPoint(p.x, p.y);
      }
      return;
    }
    if (maskEditing && primaryClip?.mask && primaryClip.mask.shape === 'pen') {
      const p = canvasPoint(e);
      addPenPoint(p.x, p.y);
    }
  };

  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (panDragRef.current) {
      setPan({
        x: panDragRef.current.panX + (e.clientX - panDragRef.current.startX),
        y: panDragRef.current.panY + (e.clientY - panDragRef.current.startY),
      });
      return;
    }
    if (!drawMode || !drawingStrokeRef.current) return;
    drawingStrokeRef.current.push(canvasPoint(e));
  };

  const onCanvasPointerUp = () => {
    if (panDragRef.current) {
      panDragRef.current = null;
      return;
    }
    if (!drawMode || !drawingStrokeRef.current) return;
    const points = drawingStrokeRef.current;
    drawingStrokeRef.current = null;
    if (points.length >= 2) addDrawingStroke(points);
  };

  // CapCut-fix (W1): Ctrl+Shift+F (fullscreen action) toggles the
  // preview fullscreen from anywhere in the editor.
  useEffect(() => {
    const onFullscreenEvent = () => {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void sectionRef.current?.requestFullscreen().catch(() => undefined);
    };
    window.addEventListener('vidora:preview-fullscreen', onFullscreenEvent);
    return () => window.removeEventListener('vidora:preview-fullscreen', onFullscreenEvent);
  }, []);

  const aspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16]'
      : aspectRatio === '1:1'
        ? 'aspect-square'
        : aspectRatio === '4:5'
          ? 'aspect-[4/5]'
          : aspectRatio === '21:9'
            ? 'aspect-[21/9]'
            : aspectRatio === '4:3'
              ? 'aspect-[4/3]'
              : aspectRatio === '2:1'
                ? 'aspect-[2/1]'
                : aspectRatio === '3:4'
                  ? 'aspect-[3/4]'
                  : 'aspect-video';

  const stepFrame = (dir: 1 | -1) => setPlayhead(Math.max(0, Math.min(duration, playhead + dir / fps)));
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void sectionRef.current?.requestFullscreen().catch(() => undefined);
  };
  void stepFrame;

  /** "Original" ratio = the project's own resolution, snapped to the nearest known ratio. */
  const originalRatio = (): '9:16' | '16:9' | '1:1' | '4:5' | '21:9' | '4:3' | '2:1' | '3:4' | 'custom' => {
    const w = project?.resolution.width ?? 1920;
    const h = project?.resolution.height ?? 1080;
    const r = w / h;
    const candidates: { ratio: number; value: '9:16' | '16:9' | '1:1' | '4:5' | '21:9' | '4:3' | '2:1' | '3:4' }[] = [
      { ratio: 16 / 9, value: '16:9' },
      { ratio: 9 / 16, value: '9:16' },
      { ratio: 1, value: '1:1' },
      { ratio: 4 / 3, value: '4:3' },
      { ratio: 2, value: '2:1' },
      { ratio: 3 / 4, value: '3:4' },
      { ratio: 4 / 5, value: '4:5' },
      { ratio: 21 / 9, value: '21:9' },
    ];
    let best = candidates[0];
    for (const c of candidates) if (Math.abs(c.ratio - r) < Math.abs(best.ratio - r)) best = c;
    return Math.abs(best.ratio - r) < 0.02 ? best.value : 'custom';
  };

  // CapCut-fix (2026-11-25, P3): the upload prompt shows only when the
  // timeline is completely empty — a text-only timeline still renders
  // its clips on the canvas, so media presence alone is not the test.
  const hasClips = project?.tracks.some((t) => t.clips.length > 0) ?? false;
  const selectedClip = selectedClipIds.length > 0 && project ? findClip(project, selectedClipIds[0])?.clip ?? null : null;

  const clipMenuItem = (label: string, shortcut: string, onClick: () => void) => (
    <button type="button" onClick={() => { setClipMenuOpen(false); onClick(); }} className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[13px] hover:bg-[#242424]">
      <span>{label}</span>
      <span className="text-[11px] text-[#6E6E6E]">{shortcut}</span>
    </button>
  );

  return (
    <section
      ref={sectionRef}
      className="flex min-w-0 flex-1 flex-col bg-[#141414]"
      aria-label="Preview"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) void addMediaFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*,audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) void addMediaFiles(e.target.files);
          e.target.value = '';
        }}
      />
      {/* CapCut-fix (P1): preview title top-left, ≡ menu top-right. */}
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <span className="truncate text-[13px] font-medium text-[#F2F2F2]">{project?.name ?? 'Player-Timeline 01'}</span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setTopMenuOpen((v) => !v)}
            aria-label="Preview options"
            aria-expanded={topMenuOpen}
            className="rounded-md p-1.5 text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]"
          >
            <IconMenu size={18} />
          </button>
          {topMenuOpen && (
            <div className="absolute right-0 top-9 z-40 w-48 rounded-lg border border-[#3D3D3D] bg-[#1E1E1E] py-1 text-sm shadow-xl">
              <button type="button" onClick={() => { setLoop(!loop); }} aria-pressed={loop} className="block w-full px-3 py-1.5 text-left hover:bg-[#242424]">
                Loop {loop ? '✓' : ''}
              </button>
              <button type="button" onClick={() => { setShowSafe(!showSafe); }} aria-pressed={showSafe} className="block w-full px-3 py-1.5 text-left hover:bg-[#242424]">
                Safe zones {showSafe ? '✓' : ''}
              </button>
              <button type="button" onClick={() => { setShowGrid(!showGrid); }} aria-pressed={showGrid} aria-label="Thirds grid" className="block w-full px-3 py-1.5 text-left hover:bg-[#242424]">
                Thirds grid {showGrid ? '✓' : ''}
              </button>
              <button type="button" onClick={() => { setTopMenuOpen(false); toggleFullscreen(); }} className="block w-full px-3 py-1.5 text-left hover:bg-[#242424]">
                Fullscreen
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4">
        <div
          className={`${aspectClass} relative max-h-full max-w-full overflow-hidden rounded-lg border border-[#2E2E2E] bg-black shadow-2xl`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${viewZoom})`,
            width: aspectRatio === '9:16' || aspectRatio === '4:5' || aspectRatio === '3:4' ? 'auto' : '100%',
            height: aspectRatio === '9:16' || aspectRatio === '4:5' || aspectRatio === '3:4' ? '100%' : 'auto',
          }}
        >
          <canvas
            id="vidora-export-canvas"
            ref={canvasRef}
            width={project?.resolution.width ?? 1920}
            height={project?.resolution.height ?? 1080}
            className={`h-full w-full ${maskEditing || drawMode || trackingMode ? 'cursor-crosshair' : previewTool === 'hand' ? 'cursor-grab' : ''}`}
            aria-label="Preview canvas"
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
          />
          {showSafe && (
            <div className="pointer-events-none absolute inset-0" aria-label="Safe zones overlay">
              <div className="absolute border border-yellow-400/70" style={{ inset: '5%' }} />
              <div className="absolute border border-cyan-400/70" style={{ inset: '10%' }} />
            </div>
          )}
          {showGrid && (
            <div className="pointer-events-none absolute inset-0" aria-label="Thirds grid overlay">
              <div className="absolute top-0 bottom-0 border-l border-white/40" style={{ left: '33.33%' }} />
              <div className="absolute top-0 bottom-0 border-l border-white/40" style={{ left: '66.66%' }} />
              <div className="absolute right-0 left-0 border-t border-white/40" style={{ top: '33.33%' }} />
              <div className="absolute right-0 left-0 border-t border-white/40" style={{ top: '66.66%' }} />
            </div>
          )}
          {previewAxis && (
            <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-px bg-[#00D9D9]" aria-label="Preview axis" />
          )}
          {!hasClips && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg bg-[#00D9D9] px-5 py-2 text-sm font-semibold text-[#062A2A]">
                Click to upload
              </button>
              <span className="text-xs text-[#A8A8A8]">Or drag and drop file here</span>
            </div>
          )}
        </div>

        {/* CapCut-fix (P3): floating toolbar when a clip is selected. */}
        {selectedClip && (
          <div className="absolute top-2 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-[#3D3D3D] bg-[#1E1E1E]/95 px-1 py-1 shadow-xl">
            <button type="button" onClick={() => setAiToolsOverlay('enhance')} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-[#242424]" title="Edit with AI">
              <IconSparkles size={14} /> Edit with AI
            </button>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('vidora:open-inspector-basic'))} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-[#242424]" title="Crop">
              <IconCrop size={14} /> Crop
            </button>
            <button type="button" onClick={() => setAiToolsOverlay('auto-reframe')} className="rounded-md px-2 py-1 text-xs hover:bg-[#242424]" title="Auto reframe">
              Auto reframe
            </button>
            <button type="button" onClick={() => setActiveTab('Captions')} className="rounded-md px-2 py-1 text-xs hover:bg-[#242424]" title="Captions" aria-label="Captions">
              CC
            </button>
            <button type="button" onClick={() => setAiToolsOverlay('enhance')} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs hover:bg-[#242424]" title="Smart tools">
              Smart tools <IconChevronDown size={12} />
            </button>
            <div className="relative">
              <button type="button" onClick={() => setClipMenuOpen((v) => !v)} aria-label="More clip actions" aria-expanded={clipMenuOpen} className="rounded-md p-1.5 hover:bg-[#242424]">
                <IconDots size={16} />
              </button>
              {clipMenuOpen && (
                <div className="absolute right-0 top-8 z-40 w-56 rounded-lg border border-[#3D3D3D] bg-[#1E1E1E] py-1 shadow-xl">
                  {clipMenuItem('Split', 'Ctrl B', () => splitAtPlayhead())}
                  {clipMenuItem('Copy', 'Ctrl C', () => copySelected())}
                  {clipMenuItem('Cut', 'Ctrl X', () => { copySelected(); deleteSelected(); })}
                  {clipMenuItem('Paste', 'Ctrl V', () => pasteClipboard())}
                  {clipMenuItem('Duplicate', 'Ctrl D', () => duplicateSelected())}
                  {clipMenuItem('Delete', 'Backspace', () => deleteSelected())}
                  {clipMenuItem('Separate audio', 'Ctrl Shift S', () => detachAudio())}
                  {clipMenuItem('Freeze', '', () => freezeSelected())}
                  {clipMenuItem('Reverse', '', () => reverseSelected())}
                  {clipMenuItem('Flip horizontal', '', () => updateSelectedClip({ flipH: !selectedClip.flipH }))}
                  {clipMenuItem('Crop', '', () => window.dispatchEvent(new CustomEvent('vidora:open-inspector-basic')))}
                  <button type="button" onClick={() => { setClipMenuOpen(false); window.dispatchEvent(new CustomEvent('vidora:download-clip')); }} className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[13px] hover:bg-[#242424]">
                    <IconDownload size={14} /> Download clip
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CapCut-fix (P2): bottom bar — timecode left, play center, Full / fit / Ratio / fullscreen right. Seek stays on the timeline ruler. */}
      <div className="flex h-12 shrink-0 items-center justify-between border-t border-[#2E2E2E] bg-[#141414] px-3">
        <span className="font-mono text-xs text-[#A8A8A8]" aria-label="Timecode">
          {formatTimecode(playhead, fps)} / {formatTimecode(duration, fps)}
        </span>
        <button type="button" onClick={() => setPlaying(!playing)} className="rounded-full bg-[#00D9D9] p-2.5 text-[#062A2A]" aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
          {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setViewZoom((z) => (z === 1 ? 1.5 : 1)); setPan({ x: 0, y: 0 }); }}
            className="rounded-md px-2 py-1 text-[11px] text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]"
            title="Fill the preview area"
          >
            Full
          </button>
          <button
            type="button"
            onClick={() => { setViewZoom(1); setPan({ x: 0, y: 0 }); }}
            aria-label="Fit preview"
            title="Fit preview"
            className="rounded-md p-1.5 text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]"
          >
            <IconFit size={16} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setRatioOpen((v) => !v)}
              aria-expanded={ratioOpen}
              className="rounded-md px-2 py-1 text-[11px] text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]"
              title="Aspect ratio"
            >
              Ratio
            </button>
            {ratioOpen && (
              <div className="absolute right-0 bottom-9 z-40 w-36 rounded-lg border border-[#3D3D3D] bg-[#1E1E1E] py-1 text-sm shadow-xl">
                {(['Original', '16:9', '4:3', '2:1', '9:16', '1:1', '3:4'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { setAspectRatio(r === 'Original' ? originalRatio() : r); setRatioOpen(false); }}
                    className="block w-full px-3 py-1.5 text-left hover:bg-[#242424]"
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={toggleFullscreen} aria-label="Fullscreen preview" title="Fullscreen preview" className="rounded-md p-1.5 text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]">
            <IconFullscreen size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
