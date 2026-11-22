import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { projectDuration } from '../lib/timeline';
import { renderClipFrame, rectsForLayout } from '../lib/compositor';
import { drawTransition, transitionProgress } from '../lib/transitions';
import { layoutRects } from '../lib/masks';
import { IconPause, IconPlay } from './icons';
import type { Clip } from '../schema/project';

export function formatTimecode(t: number, fps: number): string {
  const f = Math.floor((t % 1) * fps);
  const s = Math.floor(t) % 60;
  const m = Math.floor(t / 60) % 60;
  const h = Math.floor(t / 3600);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoPoolRef = useRef(new Map<string, HTMLVideoElement>());
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>());
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);

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
  const secondaryClips = visibleClips.filter((c) => c.id !== primaryClip?.id);

  const activeAudio = (() => {
    if (!project) return null;
    for (const track of project.tracks) {
      if (track.kind !== 'audio' || track.muted) continue;
      const clip = track.clips.find((c) => playhead >= c.start && playhead < c.start + c.duration);
      if (clip) return clip;
    }
    return null;
  })();

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

  const getImageEl = (clip: Clip): HTMLImageElement | null => {
    if ((clip.type !== 'image' && clip.type !== 'sticker') || !clip.src) return null;
    let img = imageCacheRef.current.get(clip.id);
    if (!img) {
      img = new Image();
      img.src = clip.src;
      imageCacheRef.current.set(clip.id, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  };

  const syncVideo = (clip: Clip) => {
    const el = getVideoEl(clip);
    if (!el) return;
    const local = Math.max(0, playhead - clip.start);
    const target = clip.frozen
      ? clip.sourceStart
      : clip.reversed
        ? clip.sourceStart + Math.max(0, (clip.sourceDuration ?? clip.duration) - local * clip.speed)
        : clip.sourceStart + local * clip.speed;
    if (Math.abs(el.currentTime - target) > 0.3) el.currentTime = target;
    el.playbackRate = clip.speed;
    el.volume = clip.volume;
    if (playing && !clip.frozen) void el.play().catch(() => undefined);
    else el.pause();
  };

  // Sync every visible video clip.
  useEffect(() => {
    for (const clip of visibleClips) syncVideo(clip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleClips.map((c) => c.id).join(','), playing, Math.round(playhead * 4)]);

  // Audio element (single, as in Phase 1) — kept via a dedicated element.
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (activeAudio?.src) {
      if (audio.getAttribute('data-clip') !== activeAudio.id) {
        audio.setAttribute('data-clip', activeAudio.id);
        audio.src = activeAudio.src;
        audio.load();
      }
      audio.volume = activeAudio.volume;
      audio.playbackRate = activeAudio.speed;
      if (playing) void audio.play().catch(() => undefined);
      else audio.pause();
    } else {
      audio.pause();
    }
  }, [activeAudio?.id, activeAudio?.src, playing]);

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
        useProjectStore.getState().setPlayhead(duration);
        useProjectStore.getState().setPlaying(false);
        return;
      }
      useProjectStore.getState().setPlayhead(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, project, duration]);

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

  // Main compositor draw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const frameIndex = Math.floor(playhead * fps);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (!primaryClip) {
      ctx.fillStyle = '#71717a';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(project.name, W / 2, H / 2 - 8);
      ctx.font = '13px sans-serif';
      ctx.fillText('Import media and add it to the timeline to preview it here.', W / 2, H / 2 + 16);
      return;
    }

    const localTime = Math.max(0, playhead - primaryClip.start);

    const frameFor = (clip: Clip): HTMLCanvasElement | null => {
      const local = Math.max(0, playhead - clip.start);
      if (clip.type === 'video') {
        const el = getVideoEl(clip);
        if (!el || el.videoWidth === 0) return null;
        return renderClipFrame(el, el.videoWidth, el.videoHeight, clip, local, frameIndex, W, H);
      }
      if (clip.type === 'image' || clip.type === 'sticker') {
        const img = getImageEl(clip);
        if (!img) return null;
        return renderClipFrame(img, img.naturalWidth, img.naturalHeight, clip, local, frameIndex, W, H);
      }
      if (clip.type === 'text') {
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const cctx = c.getContext('2d');
        if (cctx) {
          cctx.fillStyle = '#fff';
          cctx.font = 'bold 64px sans-serif';
          cctx.textAlign = 'center';
          cctx.fillText(clip.name, W / 2, H / 2);
        }
        return c;
      }
      return null;
    };

    const primaryFrame = frameFor(primaryClip);

    // Background behind the primary frame.
    const bg = primaryClip.background;
    if (bg.type === 'color') {
      ctx.fillStyle = bg.color;
      ctx.fillRect(0, 0, W, H);
    } else if (bg.type === 'gradient') {
      const stops = [...bg.gradient.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0]);
      const grad = ctx.createLinearGradient(0, 0, W, H);
      if (stops.length >= 2) {
        grad.addColorStop(0, stops[0]);
        grad.addColorStop(1, stops[1]);
      } else {
        grad.addColorStop(0, '#7C3AED');
        grad.addColorStop(1, '#06B6D4');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    } else if (bg.type === 'image' && bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, W, H);
    } else if (primaryFrame) {
      ctx.save();
      ctx.filter = 'blur(24px) brightness(0.6)';
      ctx.drawImage(primaryFrame, 0, 0, W, H);
      ctx.restore();
    }

    const mode = primaryClip.layoutMode;
    const isSplit = mode === 'split2' || mode === 'split3' || mode === 'split4';
    const isPip = mode === 'pip';

    if (isSplit) {
      const all = [primaryClip, ...secondaryClips];
      const rects = layoutRects(mode, W, H);
      all.slice(0, rects.length).forEach((clip, i) => {
        const f = clip === primaryClip ? primaryFrame : frameFor(clip);
        if (!f) return;
        const r = rects[i];
        ctx.drawImage(f, r.x, r.y, r.width, r.height);
      });
    } else if (isPip) {
      if (primaryFrame) ctx.drawImage(primaryFrame, 0, 0, W, H);
      const rects = rectsForLayout('pip', W, H);
      const pipClip = secondaryClips[0];
      if (pipClip) {
        const f = frameFor(pipClip);
        if (f) {
          const r = rects[0];
          ctx.drawImage(f, r.x, r.y, r.width, r.height);
        }
      }
    } else if (primaryFrame) {
      // Transition-in: blend from the previous clip on the same track.
      const tr = primaryClip.transitionIn;
      if (tr && localTime < tr.duration) {
        const prev = project.tracks
          .find((t) => t.id === primaryClip.trackId)
          ?.clips.filter((c) => c.id !== primaryClip.id && c.start + c.duration <= primaryClip.start + 0.01)
          .sort((a, b) => b.start + b.duration - (a.start + a.duration))[0];
        if (prev) {
          const prevFrame = frameFor({ ...prev, start: prev.start, duration: prev.duration });
          drawTransition(ctx, prevFrame, primaryFrame, tr.type, transitionProgress(localTime, tr.duration), tr.direction, W, H);
        } else {
          ctx.drawImage(primaryFrame, 0, 0, W, H);
        }
      } else {
        ctx.drawImage(primaryFrame, 0, 0, W, H);
      }
    } else {
      ctx.fillStyle = '#71717a';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(primaryClip.name, W / 2, H / 2);
    }

    if (primaryClip.reversed) {
      ctx.fillStyle = 'rgba(124,58,237,0.85)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('REVERSED', 10, 20);
    }
    if (primaryClip.frozen) {
      ctx.fillStyle = 'rgba(6,182,212,0.9)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('FREEZE FRAME', 10, 38);
    }
    if (primaryClip.transitionIn && localTime < primaryClip.transitionIn.duration) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`TRANSITION: ${primaryClip.transitionIn.type.toUpperCase()}`, 10, 56);
    }
    if (primaryClip.mask) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`MASK: ${primaryClip.mask.shape.toUpperCase()}${maskEditing ? ' — click to add pen points' : ''}`, 10, 74);
    }
    void videoReady;
  });

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!maskEditing || !primaryClip?.mask || primaryClip.mask.shape !== 'pen') return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    addPenPoint(Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)));
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

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-zinc-900" aria-label="Preview">
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <div className={`${aspectClass} max-h-full max-w-full overflow-hidden rounded-lg border border-zinc-700 bg-black shadow-2xl`} style={{ width: aspectRatio === '9:16' || aspectRatio === '4:5' ? 'auto' : '100%', height: aspectRatio === '9:16' || aspectRatio === '4:5' ? '100%' : 'auto' }}>
          <canvas
            id="vidora-export-canvas"
            ref={canvasRef}
            width={project?.resolution.width ?? 1920}
            height={project?.resolution.height ?? 1080}
            className={`h-full w-full ${maskEditing ? 'cursor-crosshair' : ''}`}
            aria-label="Preview canvas"
            onClick={onCanvasClick}
          />
        </div>
        <audio ref={audioRef} className="hidden" />
      </div>
      <div className="flex h-12 shrink-0 items-center justify-center gap-3 border-t border-zinc-800 bg-zinc-950">
        <button type="button" onClick={() => setPlaying(!playing)} className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 p-2.5 text-white" aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
          {playing ? <IconPause size={18} /> : <IconPlay size={18} />}
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
          </span>
        )}
      </div>
    </section>
  );
}
