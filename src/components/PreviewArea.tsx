import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip, projectDuration } from '../lib/timeline';
import { evaluateClipAt, renderClipFrame, rectsForLayout } from '../lib/compositor';
import { drawTransition, transitionProgress } from '../lib/transitions';
import { layoutRects } from '../lib/masks';
import { IconPause, IconPlay } from './icons';
import type { Clip, Track, TrackPoint } from '../schema/project';
import { canvasBlendMode } from '../lib/color';
import { canvasFontFor, evaluateLoopAnimation, wrapLines } from '../lib/text';
import { captionStyleById, cueAt, wordAt } from '../lib/captions';
import { shouldSpeak } from '../lib/tts';
import { effectiveClipGainForProject } from '../lib/audio';
import { AudioEngine, type ClipAudioState } from '../lib/audioEngine';

/** Caption overlay with word-level highlight (Phase 3, I-CAPTION-AUTO).
 * Draws the active cue in the active caption style; the word under the
 * playhead is highlighted. */
export function drawCaptionOverlay(
  ctx: CanvasRenderingContext2D,
  cues: import('../schema/project').CaptionCue[],
  playhead: number,
  captionStyleId: string | undefined,
  w: number,
  h: number,
): void {
  const cue = cueAt(cues, playhead);
  if (!cue) return;
  const style = captionStyleById(cue.styleId ?? captionStyleId);
  const active = wordAt(cue, playhead);
  ctx.save();
  ctx.font = `700 ${style.fontSize}px sans-serif`;
  const maxWidth = w * 0.8;
  // Wrap words into lines.
  const lines: { index: number; word: import('../schema/project').CaptionWord }[][] = [[]];
  let lineWidth = 0;
  const space = ctx.measureText(' ').width;
  cue.words.forEach((word, i) => {
    const ww = ctx.measureText(word.text).width;
    if (lineWidth + ww > maxWidth && lines[lines.length - 1].length > 0) {
      lines.push([]);
      lineWidth = 0;
    }
    lines[lines.length - 1].push({ index: i, word });
    lineWidth += ww + space;
  });
  const lineHeight = style.fontSize * 1.35;
  const blockHeight = lines.length * lineHeight;
  const top =
    style.position === 'top' ? h * 0.08 : style.position === 'center' ? h / 2 - blockHeight / 2 : h * 0.92 - blockHeight;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, li) => {
    const widths = line.map(({ word }) => ctx.measureText(word.text).width);
    const total = widths.reduce((a, b) => a + b, 0) + space * (line.length - 1);
    let x = (w - total) / 2;
    const y = top + li * lineHeight + style.fontSize;
    if (style.background !== 'transparent') {
      ctx.fillStyle = style.background;
      const pad = 8;
      ctx.fillRect((w - total) / 2 - pad, top + li * lineHeight - pad, total + pad * 2, lineHeight + pad);
    }
    line.forEach(({ index, word }, wi) => {
      const isActive = active?.index === index;
      const isPast = active ? index < active.index : false;
      ctx.globalAlpha = isPast ? 1 : isActive ? 1 : 0.55;
      if (isActive) {
        ctx.fillStyle = style.highlightBackground ?? '#7C3AED';
        ctx.fillRect(x - 3, y - style.fontSize - 2, widths[wi] + 6, style.fontSize + 8);
      }
      ctx.fillStyle = isActive ? (style.highlight ?? '#FFFFFF') : style.color;
      ctx.fillText(word.text, x, y);
      x += widths[wi] + space;
    });
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

/** Interpolated tracking position (preview-normalised 0–1) at an
 * absolute time, from manually placed points. */
export function trackingPositionAt(points: TrackPoint[], time: number): { x: number; y: number } | null {
  if (points.length === 0) return null;
  const sorted = [...points].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return { x: sorted[0].x, y: sorted[0].y };
  const last = sorted[sorted.length - 1];
  if (time >= last.time) return { x: last.x, y: last.y };
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (time >= a.time && time <= b.time) {
      const t = (time - a.time) / (b.time - a.time || 1);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return null;
}

function makeFrameCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Centre of a text/sticker overlay clip in frame pixels (tracking
 * points win over positionX/Y when the clip is attached). */
function overlayCenter(clip: Clip, ev: { positionX: number; positionY: number; animOffsetX: number; animOffsetY: number }, absTime: number, w: number, h: number): { x: number; y: number } {
  if (clip.tracking) {
    const tp = trackingPositionAt(clip.tracking.points, absTime);
    if (tp) return { x: tp.x * w, y: tp.y * h };
  }
  return {
    x: w / 2 + ((ev.positionX + ev.animOffsetX) / 100) * w,
    y: h / 2 + ((ev.positionY + ev.animOffsetY) / 100) * h,
  };
}

/** Render a text clip (full style: font, fill/gradient, stroke, shadow,
 * glow, background box, alignment, line spacing, word wrap) to a frame. */
export function renderTextFrame(clip: Clip, localTime: number, absTime: number, w: number, h: number): HTMLCanvasElement {
  const frame = makeFrameCanvas(w, h);
  const ctx = frame.getContext('2d');
  const style = clip.text?.style;
  if (!ctx || !style) return frame;
  const ev = evaluateClipAt(clip, localTime);
  const loop = evaluateLoopAnimation(clip.animationLoop?.kind ?? 'none', localTime, clip.animationLoop?.duration ?? 2);
  const center = overlayCenter(clip, ev, absTime, w, h);

  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, ev.opacity * ev.animOpacity * loop.opacity));
  ctx.translate(center.x, center.y + loop.offsetY);
  ctx.rotate(((ev.rotation + ev.animRotation + loop.rotation) * Math.PI) / 180);
  const s = ev.scale * ev.animScale * loop.scale;
  ctx.scale(s, s);

  ctx.font = canvasFontFor(style);
  const maxWidth = w * 0.85;
  const lines = wrapLines(style.content || ' ', maxWidth, (t) => ctx.measureText(t).width);
  const lineHeight = style.fontSize * style.lineSpacing;
  const blockHeight = lines.length * lineHeight;
  const widths = lines.map((l) => ctx.measureText(l).width);
  const blockWidth = Math.max(...widths, 0);
  const top = -blockHeight / 2;

  // Background box behind the whole block.
  if (style.backgroundColor !== 'transparent') {
    const pad = style.backgroundPadding;
    ctx.fillStyle = style.backgroundColor;
    ctx.fillRect(-blockWidth / 2 - pad, top - pad, blockWidth + pad * 2, blockHeight + pad * 2);
  }

  ctx.textAlign = style.align;
  ctx.textBaseline = 'alphabetic';
  const alignX = style.align === 'left' ? -blockWidth / 2 : style.align === 'right' ? blockWidth / 2 : 0;

  // Fill (solid or gradient across the block).
  let fillStyle: string | CanvasGradient = style.fill;
  if (style.fillGradient) {
    const stops = [...style.fillGradient.matchAll(/#[0-9A-Fa-f]{6}/g)].map((m) => m[0]);
    if (stops.length >= 2) {
      const grad = ctx.createLinearGradient(-blockWidth / 2, 0, blockWidth / 2, 0);
      grad.addColorStop(0, stops[0]);
      grad.addColorStop(1, stops[stops.length - 1]);
      fillStyle = grad;
    }
  }
  if (style.glow.enabled) {
    ctx.shadowColor = style.glow.color;
    ctx.shadowBlur = style.glow.blur;
  } else if (style.shadow.enabled) {
    ctx.shadowColor = style.shadow.color;
    ctx.shadowBlur = style.shadow.blur;
    ctx.shadowOffsetX = style.shadow.offsetX;
    ctx.shadowOffsetY = style.shadow.offsetY;
  }

  lines.forEach((line, i) => {
    const y = top + i * lineHeight + style.fontSize;
    if (style.fill !== 'transparent') {
      ctx.fillStyle = fillStyle;
      ctx.fillText(line, alignX, y);
      // Second pass makes the glow read on video.
      if (style.glow.enabled) ctx.fillText(line, alignX, y);
    }
    if (style.strokeWidth > 0) {
      ctx.lineWidth = style.strokeWidth;
      ctx.strokeStyle = style.strokeColor;
      ctx.strokeText(line, alignX, y);
    }
    if (style.underline) {
      const lw = ctx.measureText(line).width;
      const startX = style.align === 'left' ? alignX : style.align === 'right' ? alignX - lw : alignX - lw / 2;
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = style.fill === 'transparent' ? style.strokeColor : style.fill;
      ctx.lineWidth = Math.max(1, style.fontSize / 16);
      ctx.beginPath();
      ctx.moveTo(startX, y + 4);
      ctx.lineTo(startX + lw, y + 4);
      ctx.stroke();
      ctx.restore();
    }
  });
  ctx.restore();
  return frame;
}

/** Render a sticker/shape clip (procedural SVG image) to a frame. */
export function renderStickerFrame(
  clip: Clip,
  localTime: number,
  absTime: number,
  w: number,
  h: number,
  img: HTMLImageElement | null,
): HTMLCanvasElement {
  const frame = makeFrameCanvas(w, h);
  const ctx = frame.getContext('2d');
  if (!ctx || !img) return frame;
  const ev = evaluateClipAt(clip, localTime);
  const loop = evaluateLoopAnimation(clip.animationLoop?.kind ?? 'none', localTime, clip.animationLoop?.duration ?? 2);
  const center = overlayCenter(clip, ev, absTime, w, h);
  const size = Math.min(w, h) * 0.35 * ev.scale * ev.animScale * loop.scale;
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, ev.opacity * ev.animOpacity * loop.opacity));
  ctx.translate(center.x, center.y + loop.offsetY);
  ctx.rotate(((ev.rotation + ev.animRotation + loop.rotation) * Math.PI) / 180);
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
  return frame;
}

/** Render a procedural background clip (Phase 5, N-BACKGROUNDS): the SVG
 * fills the whole frame (cover), unlike square stickers. */
export function renderBackgroundFrame(
  clip: Clip,
  localTime: number,
  w: number,
  h: number,
  img: HTMLImageElement | null,
): HTMLCanvasElement {
  const frame = makeFrameCanvas(w, h);
  const ctx = frame.getContext('2d');
  if (!ctx || !img || img.naturalWidth === 0) return frame;
  const ev = evaluateClipAt(clip, localTime);
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, ev.opacity * ev.animOpacity));
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * ev.scale * ev.animScale;
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.translate(w / 2 + (ev.positionX / 100) * w, h / 2 + (ev.positionY / 100) * h);
  ctx.rotate(((ev.rotation + ev.animRotation) * Math.PI) / 180);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  return frame;
}

/** Render a drawing clip (freehand strokes) to a frame. */export function renderDrawingFrame(clip: Clip, localTime: number, w: number, h: number): HTMLCanvasElement {
  const frame = makeFrameCanvas(w, h);
  const ctx = frame.getContext('2d');
  if (!ctx || !clip.drawing) return frame;
  const ev = evaluateClipAt(clip, localTime);
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, ev.opacity * ev.animOpacity));
  ctx.translate(w / 2 + (ev.positionX / 100) * w, h / 2 + (ev.positionY / 100) * h);
  ctx.rotate((ev.rotation * Math.PI) / 180);
  ctx.scale(ev.scale, ev.scale);
  ctx.translate(-w / 2, -h / 2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of clip.drawing.strokes) {
    if (stroke.points.length < 2) continue;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width * (w / 960);
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
    for (const p of stroke.points.slice(1)) ctx.lineTo(p.x * w, p.y * h);
    ctx.stroke();
  }
  ctx.restore();
  return frame;
}

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
  const imageCacheRef = useRef(new Map<string, HTMLImageElement>());
  const stickerCacheRef = useRef(new Map<string, HTMLImageElement>());
  const bgImageRef = useRef<HTMLImageElement | null>(null);
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
  const secondaryClips = visibleClips.filter((c) => c.id !== primaryClip?.id);

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

  /** Image element for a procedural sticker SVG (cached by SVG string). */
  const getStickerEl = (svg: string): HTMLImageElement | null => {
    let img = stickerCacheRef.current.get(svg);
    if (!img) {
      img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      stickerCacheRef.current.set(svg, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
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
  useEffect(() => () => {
    engineRef.current?.dispose();
    engineRef.current = null;
  }, []);

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
      drawCaptionOverlay(ctx, project.captions ?? [], playhead, project.captionStyleId, W, H);
      return;
    }

    // Base media clip (BUG-P5-001): the last visible video/image clip,
    // not the last clip of any type, so text/sticker overlays sit ON the
    // video instead of replacing it in the preview.
    const baseClip = [...visibleClips].reverse().find((c) => c.type === 'video' || c.type === 'image') ?? null;

    const frameFor = (clip: Clip): HTMLCanvasElement | null => {
      const local = Math.max(0, playhead - clip.start);
      if (clip.type === 'video') {
        const el = getVideoEl(clip);
        if (!el || el.videoWidth === 0) return null;
        return renderClipFrame(el, el.videoWidth, el.videoHeight, clip, local, frameIndex, W, H);
      }
      if (clip.type === 'image') {
        const img = getImageEl(clip);
        if (!img) return null;
        return renderClipFrame(img, img.naturalWidth, img.naturalHeight, clip, local, frameIndex, W, H);
      }
      if (clip.type === 'sticker') {
        if (clip.drawing) return renderDrawingFrame(clip, local, W, H);
        if (clip.sticker?.category === 'Backgrounds') return renderBackgroundFrame(clip, local, W, H, getStickerEl(clip.sticker.svg));
        if (clip.sticker) return renderStickerFrame(clip, local, playhead, W, H, getStickerEl(clip.sticker.svg));
        const img = getImageEl(clip);
        if (!img) return null;
        return renderClipFrame(img, img.naturalWidth, img.naturalHeight, clip, local, frameIndex, W, H);
      }
      if (clip.type === 'text') {
        return renderTextFrame(clip, local, playhead, W, H);
      }
      return null;
    };

    const primaryFrame = frameFor(primaryClip);

    // Draw a rendered clip frame with the clip's blend mode applied live
    // (CapCut Blend dropdown: Normal, Overlay, Screen, ...). The frame
    // already carries the clip's opacity from the compositor.
    const drawBlended = (frame: HTMLCanvasElement, clip: Clip, x: number, y: number, w: number, h: number) => {
      ctx.save();
      ctx.globalCompositeOperation = canvasBlendMode(clip.adjustment.blendMode);
      ctx.drawImage(frame, x, y, w, h);
      ctx.restore();
    };

    // Background behind the primary frame (from the base media clip).
    const bg = (baseClip ?? primaryClip).background;
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
        drawBlended(f, clip, r.x, r.y, r.width, r.height);
      });
    } else if (isPip) {
      if (primaryFrame) drawBlended(primaryFrame, primaryClip, 0, 0, W, H);
      const rects = rectsForLayout('pip', W, H);
      const pipClip = secondaryClips[0];
      if (pipClip) {
        const f = frameFor(pipClip);
        if (f) {
          const r = rects[0];
          drawBlended(f, pipClip, r.x, r.y, r.width, r.height);
        }
      }
    } else {
      // Normal mode (BUG-P5-001 fix): composite ALL visible clips
      // bottom-to-top — backgrounds, then the base video/image clip
      // (with its transition-in), then text/sticker overlays — instead
      // of drawing only the last clip, which hid the video under
      // overlays. A base clip with no media still shows its name
      // (template slot label) in the centre, as before.
      const isBg = (c: Clip) => c.sticker?.category === 'Backgrounds';
      for (const clip of visibleClips.filter(isBg)) {
        const f = clip === primaryClip ? primaryFrame : frameFor(clip);
        if (f) drawBlended(f, clip, 0, 0, W, H);
      }
      if (baseClip) {
        const baseLocal = Math.max(0, playhead - baseClip.start);
        const baseFrame = baseClip === primaryClip ? primaryFrame : frameFor(baseClip);
        if (baseFrame) {
          const tr = baseClip.transitionIn;
          if (tr && baseLocal < tr.duration) {
            const prev = project.tracks
              .find((t) => t.id === baseClip.trackId)
              ?.clips.filter((c) => c.id !== baseClip.id && c.start + c.duration <= baseClip.start + 0.01)
              .sort((a, b) => b.start + b.duration - (a.start + a.duration))[0];
            if (prev) {
              const prevFrame = frameFor({ ...prev, start: prev.start, duration: prev.duration });
              drawTransition(ctx, prevFrame, baseFrame, tr.type, transitionProgress(baseLocal, tr.duration), tr.direction, W, H);
            } else {
              drawBlended(baseFrame, baseClip, 0, 0, W, H);
            }
          } else {
            drawBlended(baseFrame, baseClip, 0, 0, W, H);
          }
        } else {
          ctx.fillStyle = '#71717a';
          ctx.font = '15px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(baseClip.name, W / 2, H / 2);
        }
      }
      for (const clip of visibleClips) {
        if (isBg(clip) || clip === baseClip) continue;
        const f = clip === primaryClip ? primaryFrame : frameFor(clip);
        if (f) drawBlended(f, clip, 0, 0, W, H);
      }
    }

    // Caption overlay (word-level highlight) on top of everything.
    drawCaptionOverlay(ctx, project.captions ?? [], playhead, project.captionStyleId, W, H);

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
    if (primaryClip.transitionIn && Math.max(0, playhead - primaryClip.start) < primaryClip.transitionIn.duration) {
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
