import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { projectDuration } from '../lib/timeline';
import { IconPause, IconPlay } from './icons';

export function formatTimecode(t: number, fps: number): string {
  const f = Math.floor((t % 1) * fps);
  const s = Math.floor(t) % 60;
  const m = Math.floor(t / 60) % 60;
  const h = Math.floor(t / 3600);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

/** Center preview (Phase 1): real playback of imported video/image/audio clips on a canvas compositor. */
export default function PreviewArea() {
  const project = useProjectStore((s) => s.project);
  const aspectRatio = useProjectStore((s) => s.aspectRatio);
  const playhead = useProjectStore((s) => s.playhead);
  const playing = useProjectStore((s) => s.playing);
  const setPlaying = useProjectStore((s) => s.setPlaying);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const duration = project ? projectDuration(project) : 0;
  const fps = project?.fps ?? 30;

  // Active clip at the playhead: topmost (last) video/image track wins.
  const activeClip = (() => {
    if (!project) return null;
    for (let i = project.tracks.length - 1; i >= 0; i -= 1) {
      const track = project.tracks[i];
      if (track.hidden) continue;
      const clip = track.clips.find((c) => playhead >= c.start && playhead < c.start + c.duration);
      if (clip) return clip;
    }
    return null;
  })();
  const activeAudio = (() => {
    if (!project) return null;
    for (const track of project.tracks) {
      if (track.kind !== 'audio' || track.muted) continue;
      const clip = track.clips.find((c) => playhead >= c.start && playhead < c.start + c.duration);
      if (clip) return clip;
    }
    return null;
  })();

  // Load image source for image clips.
  useEffect(() => {
    if (activeClip?.type === 'image' && activeClip.src) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageSrc(activeClip.src ?? null);
      };
      img.src = activeClip.src;
    } else {
      setImageSrc(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClip?.id, activeClip?.src]);

  // Sync the hidden video element to the active clip.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (activeClip?.type === 'video' && activeClip.src) {
      if (video.getAttribute('data-clip') !== activeClip.id) {
        video.setAttribute('data-clip', activeClip.id);
        video.src = activeClip.src;
        video.load();
      }
      const local = Math.max(0, playhead - activeClip.start);
      const target = activeClip.frozen
        ? activeClip.sourceStart
        : activeClip.reversed
          ? activeClip.sourceStart + Math.max(0, (activeClip.sourceDuration ?? activeClip.duration) - local * activeClip.speed)
          : activeClip.sourceStart + local * activeClip.speed;
      if (Math.abs(video.currentTime - target) > 0.3) video.currentTime = target;
      video.playbackRate = activeClip.speed;
      video.volume = activeClip.volume;
      if (playing && !activeClip.frozen) void video.play().catch(() => undefined);
      else video.pause();
    } else {
      video.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClip?.id, activeClip?.src, playing]);

  // Sync audio element.
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

  // Playhead driver: advance while playing; stop at the end.
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

  // Canvas compositor: draw the active frame with clip transforms.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (!activeClip) {
      ctx.fillStyle = '#71717a';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(project.name, W / 2, H / 2 - 8);
      ctx.font = '13px sans-serif';
      ctx.fillText('Import media and add it to the timeline to preview it here.', W / 2, H / 2 + 16);
      return;
    }
    ctx.save();
    ctx.globalAlpha = activeClip.opacity;
    const cx = W / 2 + (activeClip.positionX / 100) * W;
    const cy = H / 2 + (activeClip.positionY / 100) * H;
    ctx.translate(cx, cy);
    ctx.rotate((activeClip.rotation * Math.PI) / 180);
    ctx.scale((activeClip.flipH ? -1 : 1) * activeClip.scale, (activeClip.flipV ? -1 : 1) * activeClip.scale);
    // Draw a video/image source honouring crop (source rect), then fit/fill.
    const drawSource = (source: CanvasImageSource, sw: number, sh: number) => {
      const crop = activeClip.crop ?? { height: 1, width: 1, x: 0, y: 0 };
      const sx = sw * crop.x;
      const sy = sh * crop.y;
      const sW = Math.max(1, sw * crop.width);
      const sH = Math.max(1, sh * crop.height);
      let dw = W;
      let dh = (W * sH) / sW;
      if (activeClip.fit === 'fit' ? dh > H : dh < H) {
        dh = H;
        dw = (H * sW) / sH;
      }
      ctx.drawImage(source, sx, sy, sW, sH, -dw / 2, -dh / 2, dw, dh);
    };
    if (activeClip.type === 'video' && videoRef.current && videoReady && videoRef.current.videoWidth > 0) {
      const v = videoRef.current;
      drawSource(v, v.videoWidth, v.videoHeight);
    } else if (activeClip.type === 'image' && imageRef.current) {
      const img = imageRef.current;
      drawSource(img, img.naturalWidth, img.naturalHeight);
    } else if (activeClip.type === 'audio') {
      ctx.fillStyle = '#a78bfa';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`♪ ${activeClip.name}`, 0, 0);
    } else {
      ctx.fillStyle = '#71717a';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(activeClip.name, 0, 0);
    }
    ctx.restore();
    if (activeClip.reversed) {
      ctx.fillStyle = 'rgba(124,58,237,0.85)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('REVERSED', 10, 20);
    }
    if (activeClip.frozen) {
      ctx.fillStyle = 'rgba(6,182,212,0.9)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('FREEZE FRAME', 10, 38);
    }
    void imageSrc;
  });

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
            className="h-full w-full"
            aria-label="Preview canvas"
          />
        </div>
        <video ref={videoRef} className="hidden" muted={false} playsInline onCanPlay={() => setVideoReady(true)} onError={() => setVideoReady(false)} />
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
        {activeClip && (
          <span className="max-w-48 truncate text-xs text-zinc-400" title={activeClip.name}>
            {activeClip.name} · {activeClip.speed}×
          </span>
        )}
      </div>
    </section>
  );
}
