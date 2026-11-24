import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip, projectDuration } from '../lib/timeline';
import { IconPause, IconPlay } from './icons';
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
 * LUT, colour, masks, transitions, PiP / split-screen and backgrounds. */
export default function PreviewArea() {
  const project = useProjectStore((s) => s.project);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const playhead = useProjectStore((s) => s.playhead);
  const playing = useProjectStore((s) => s.playing);
  const setPlaying = useProjectStore((s) => s.setPlaying);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);
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
    if (!drawMode || !drawingStrokeRef.current) return;
    drawingStrokeRef.current.push(canvasPoint(e));
  };

  const onCanvasPointerUp = () => {
    if (!drawMode || !drawingStrokeRef.current) return;
    const points = drawingStrokeRef.current;
    drawingStrokeRef.current = null;
    if (points.length >= 2) addDrawingStroke(points);
  };

  const aspectClass =
    aspectRatio === '9:16'
      ? 'aspect-[9/16]'
      : aspectRatio === '1:1'
        ? 'aspect-square'
        : aspectRatio === '4:5'
          ? 'aspect-[4/5]'
          : aspectRatio === '21:9'
            ? 'aspect-[21/9]'
            : 'aspect-video';

  const stepFrame = (dir: 1 | -1) => setPlayhead(Math.max(0, Math.min(duration, playhead + dir / fps)));
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void sectionRef.current?.requestFullscreen().catch(() => undefined);
  };

  return (
    <section ref={sectionRef} className="flex min-w-0 flex-1 flex-col bg-zinc-900" aria-label="Preview">
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <div className={`${aspectClass} relative max-h-full max-w-full overflow-hidden rounded-lg border border-zinc-700 bg-black shadow-2xl`} style={{ width: aspectRatio === '9:16' || aspectRatio === '4:5' ? 'auto' : '100%', height: aspectRatio === '9:16' || aspectRatio === '4:5' ? '100%' : 'auto' }}>
          <canvas
            id="vidora-export-canvas"
            ref={canvasRef}
            width={project?.resolution.width ?? 1920}
            height={project?.resolution.height ?? 1080}
            className={`h-full w-full ${maskEditing || drawMode || trackingMode ? 'cursor-crosshair' : ''}`}
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
        </div>
      </div>
      <div className="flex h-12 shrink-0 items-center justify-center gap-2 border-t border-zinc-800 bg-zinc-950 px-2">
        <button type="button" onClick={() => stepFrame(-1)} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800" aria-label="Previous frame" title="Previous frame (one frame back)">
          −1f
        </button>
        <button type="button" onClick={() => setPlaying(!playing)} className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 p-2.5 text-white" aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
          {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
        </button>
        <button type="button" onClick={() => stepFrame(1)} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800" aria-label="Next frame" title="Next frame (one frame forward)">
          +1f
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 0.1)}
          step={0.01}
          value={Math.min(playhead, Math.max(duration, 0.1))}
          onChange={(e) => setPlayhead(Number(e.target.value))}
          aria-label="Seek"
          className="w-48"
        />
        <span className="font-mono text-xs text-zinc-400" aria-label="Timecode">
          {formatTimecode(playhead, fps)} / {formatTimecode(duration, fps)}
        </span>
        {primaryClip && (
          <span className="max-w-48 truncate text-xs text-zinc-400" title={primaryClip.name}>
            {primaryClip.name} · {primaryClip.speed}×
            {selectedClipIds.length > 0 && maskEditing ? ' · pen-mask editing' : ''}
            {drawMode ? ' · drawing' : ''}
            {trackingMode ? ' · adding track points' : ''}
          </span>
        )}
        <button type="button" onClick={() => setLoop(!loop)} aria-pressed={loop} className={`rounded-md border px-2 py-1 text-[11px] ${loop ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`} title="Loop playback">
          Loop
        </button>
        <button type="button" onClick={() => setShowSafe(!showSafe)} aria-pressed={showSafe} className={`rounded-md border px-2 py-1 text-[11px] ${showSafe ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`} title="Toggle safe zones (action-safe 90%, title-safe 80%)">
          Safe
        </button>
        <button type="button" onClick={() => setShowGrid(!showGrid)} aria-pressed={showGrid} className={`rounded-md border px-2 py-1 text-[11px] ${showGrid ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`} title="Toggle thirds grid">
          Grid
        </button>
        <button type="button" onClick={toggleFullscreen} className="rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-800" aria-label="Fullscreen preview" title="Fullscreen preview">
          ⛶
        </button>
      </div>
    </section>
  );
}
