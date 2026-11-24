/**
 * Shared timeline frame renderer (Phase 8, Section L).
 *
 * The frame helpers (text / sticker / background / drawing / captions)
 * and the full timeline composition used to live inside PreviewArea;
 * they were moved here verbatim so the PREVIEW and the OFFLINE EXPORT
 * render through exactly the same code — an exported file can never
 * drift from what the preview shows. PreviewArea calls
 * renderTimelineFrame on every playhead change; the export engine
 * (src/lib/exportEngine.ts) calls it once per output frame.
 *
 * Two differences between preview and export, both explicit:
 * - Preview renders at WORKING_MAX_WIDTH (960 px) for speed; export
 *   passes its real resolution via opts.maxWidth.
 * - Preview draws the REVERSED / FREEZE / TRANSITION / MASK badges;
 *   export hides them (opts.showBadges = false).
 */

import { evaluateClipAt, renderClipFrame, rectsForLayout } from './compositor';
import { drawTransition, transitionProgress } from './transitions';
import { layoutRects } from './masks';
import { canvasBlendMode } from './color';
import { canvasFontFor, evaluateLoopAnimation, wrapLines } from './text';
import { captionStyleById, cueAt, wordAt } from './captions';
import type { CaptionCue, Clip, TrackPoint, VidoraProject } from '../schema/project';

/** Caption overlay with word-level highlight (Phase 3, I-CAPTION-AUTO).
 * Draws the active cue in the active caption style; the word under the
 * playhead is highlighted. */
export function drawCaptionOverlay(
  ctx: CanvasRenderingContext2D,
  cues: CaptionCue[],
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

/** Render a drawing clip (freehand strokes) to a frame. */
export function renderDrawingFrame(clip: Clip, localTime: number, w: number, h: number): HTMLCanvasElement {
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

// ---------------------------------------------------------------------------
// Shared timeline composition
// ---------------------------------------------------------------------------

/** Element caches shared by preview + offline export. One pool per
 * render session (the preview keeps one for the app's lifetime; an
 * export creates one per job and disposes it at the end). */
export interface RenderPool {
  bgImage: HTMLImageElement | null;
  images: Map<string, HTMLImageElement>;
  stickers: Map<string, HTMLImageElement>;
  videos: Map<string, HTMLVideoElement>;
}

export function createRenderPool(): RenderPool {
  return { bgImage: null, images: new Map(), stickers: new Map(), videos: new Map() };
}

export function disposeRenderPool(pool: RenderPool): void {
  for (const el of pool.videos.values()) {
    el.pause();
    el.removeAttribute('src');
    el.load();
  }
  pool.videos.clear();
  pool.images.clear();
  pool.stickers.clear();
  pool.bgImage = null;
}

/** Source time inside a clip's media for an absolute timeline time. */
export function sourceTimeFor(clip: Clip, absTime: number): number {
  const local = Math.max(0, absTime - clip.start);
  if (clip.frozen) return clip.sourceStart;
  if (clip.reversed) {
    return clip.sourceStart + Math.max(0, (clip.sourceDuration ?? clip.duration) - local * clip.speed);
  }
  return clip.sourceStart + local * clip.speed;
}

function waitForEvent(el: HTMLVideoElement | HTMLImageElement, event: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      el.removeEventListener(event, onOk);
      resolve(ok);
    };
    const onOk = () => finish(true);
    const timer = window.setTimeout(() => finish(false), timeoutMs);
    el.addEventListener(event, onOk);
  });
}

/** Get (or create) the hidden video element for a clip, seeking it to
 * the exact source time for `absTime`. Resolves false when the video
 * has no usable frame yet (export counts it as a skipped clip). */
export async function seekVideoForFrame(pool: RenderPool, clip: Clip, absTime: number): Promise<boolean> {
  if (clip.type !== 'video' || !clip.src) return false;
  let el = pool.videos.get(clip.id);
  if (!el) {
    el = document.createElement('video');
    el.muted = true;
    el.playsInline = true;
    el.preload = 'auto';
    pool.videos.set(clip.id, el);
  }
  if (el.getAttribute('data-clip') !== clip.id || el.src !== clip.src) {
    el.setAttribute('data-clip', clip.id);
    el.src = clip.src;
    el.load();
  }
  const target = sourceTimeFor(clip, absTime);
  if (el.readyState < 1) {
    await waitForEvent(el, 'loadedmetadata', 5000);
  }
  // The first frame must actually be decoded before we report ready.
  // When the target equals the element's current time (frame 0), no
  // seek is issued below, so without this wait the first frame renders
  // black even though the media is fine (BUG-P8-004).
  if (el.readyState < 2) {
    await waitForEvent(el, 'loadeddata', 5000);
  }
  if (Math.abs(el.currentTime - target) > 0.05) {
    el.currentTime = Math.min(Math.max(0, target), Math.max(0, (el.duration || target) - 0.05));
    if (el.readyState >= 2 && Math.abs(el.currentTime - target) <= 0.05) return el.videoWidth > 0;
    const ok = await waitForEvent(el, 'seeked', 5000);
    if (!ok) return false;
  }
  return el.videoWidth > 0 && el.readyState >= 2;
}

export function videoElementFor(pool: RenderPool, clip: Clip): HTMLVideoElement | null {
  if (clip.type !== 'video' || !clip.src) return null;
  const el = pool.videos.get(clip.id);
  return el && el.videoWidth > 0 ? el : null;
}

/** Get (or load) the image element for an image/sticker clip. Resolves
 * null while the image is still loading or has failed. */
export async function imageElementFor(pool: RenderPool, clip: Clip): Promise<HTMLImageElement | null> {
  if ((clip.type !== 'image' && clip.type !== 'sticker') || !clip.src) return null;
  let img = pool.images.get(clip.id);
  if (!img) {
    img = new Image();
    img.src = clip.src;
    pool.images.set(clip.id, img);
  }
  if (img.complete && img.naturalWidth > 0) return img;
  if (img.complete) return null;
  const ok = await waitForEvent(img, 'load', 5000);
  return ok && img.naturalWidth > 0 ? img : null;
}

/** Image element for a procedural sticker SVG (cached by SVG string). */
export function stickerElementFor(pool: RenderPool, svg: string): HTMLImageElement | null {
  let img = pool.stickers.get(svg);
  if (!img) {
    img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    pool.stickers.set(svg, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

/** Load an arbitrary image URL (used for a clip background image). */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export interface RenderFrameOptions {
  /** Abort predicate for async draws (preview: a newer playhead wins). */
  isCurrent?: () => boolean;
  /** Draw the REVERSED / FREEZE / TRANSITION / MASK badges (preview only). */
  maskEditing?: boolean;
  /** Full-resolution render cap for renderClipFrame (preview: 960). */
  maxWidth?: number;
  /** Draw the status badges (preview: true; export: false). */
  showBadges?: boolean;
}

export interface RenderFrameReport {
  /** Clips that were visible but had no playable frame (no media loaded). */
  skippedClips: string[];
}

/**
 * Composite one timeline frame into `ctx` at absolute time `time`.
 * This is the exact composition the preview used before Phase 8 —
 * backgrounds, base video/image clip (with transition-in), overlays
 * bottom-to-top, caption overlay, layout modes (full / PiP / split).
 * Returns the names of visible clips that could not be drawn (no
 * media in this session) so the export can warn instead of failing.
 */
export async function renderTimelineFrame(
  ctx: CanvasRenderingContext2D,
  project: VidoraProject,
  time: number,
  W: number,
  H: number,
  fps: number,
  pool: RenderPool,
  opts: RenderFrameOptions = {},
): Promise<RenderFrameReport> {
  const showBadges = opts.showBadges ?? false;
  const maxWidth = opts.maxWidth;
  const frameIndex = Math.floor(time * fps);
  const skipped: string[] = [];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  const visibleClips: Clip[] = [];
  for (const track of project.tracks) {
    if (track.hidden || track.kind === 'audio') continue;
    for (const clip of track.clips) {
      if (time >= clip.start && time < clip.start + clip.duration) visibleClips.push(clip);
    }
  }
  const primaryClip = visibleClips.length > 0 ? visibleClips[visibleClips.length - 1] : null;
  const secondaryClips = visibleClips.filter((c) => c.id !== primaryClip?.id);

  if (!primaryClip) {
    ctx.fillStyle = '#71717a';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(project.name, W / 2, H / 2 - 8);
    ctx.font = '13px sans-serif';
    ctx.fillText('Import media and add it to the timeline to preview it here.', W / 2, H / 2 + 16);
    drawCaptionOverlay(ctx, project.captions ?? [], time, project.captionStyleId, W, H);
    return { skippedClips: skipped };
  }

  // Seek every visible video clip to this frame's time first.
  for (const clip of visibleClips) {
    if (clip.type === 'video') {
      const ok = await seekVideoForFrame(pool, clip, time);
      if (!ok) skipped.push(clip.name);
    }
  }
  if (opts.isCurrent && !opts.isCurrent()) return { skippedClips: skipped };

  // Base media clip (BUG-P5-001): the last visible video/image clip,
  // not the last clip of any type, so text/sticker overlays sit ON the
  // video instead of replacing it in the preview.
  const baseClip = [...visibleClips].reverse().find((c) => c.type === 'video' || c.type === 'image') ?? null;

  const frameFor = async (clip: Clip): Promise<HTMLCanvasElement | null> => {
    const local = Math.max(0, time - clip.start);
    if (clip.type === 'video') {
      const el = videoElementFor(pool, clip);
      if (!el || el.videoWidth === 0) return null;
      return renderClipFrame(el, el.videoWidth, el.videoHeight, clip, local, frameIndex, W, H, maxWidth);
    }
    if (clip.type === 'image') {
      const img = await imageElementFor(pool, clip);
      if (!img) return null;
      return renderClipFrame(img, img.naturalWidth, img.naturalHeight, clip, local, frameIndex, W, H, maxWidth);
    }
    if (clip.type === 'sticker') {
      if (clip.drawing) return renderDrawingFrame(clip, local, W, H);
      if (clip.sticker?.category === 'Backgrounds') return renderBackgroundFrame(clip, local, W, H, stickerElementFor(pool, clip.sticker.svg));
      if (clip.sticker) return renderStickerFrame(clip, local, time, W, H, stickerElementFor(pool, clip.sticker.svg));
      const img = await imageElementFor(pool, clip);
      if (!img) return null;
      return renderClipFrame(img, img.naturalWidth, img.naturalHeight, clip, local, frameIndex, W, H, maxWidth);
    }
    if (clip.type === 'text') {
      return renderTextFrame(clip, local, time, W, H);
    }
    return null;
  };

  const primaryFrame = await frameFor(primaryClip);
  if (opts.isCurrent && !opts.isCurrent()) return { skippedClips: skipped };

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
  } else if (bg.type === 'image' && pool.bgImage) {
    ctx.drawImage(pool.bgImage, 0, 0, W, H);
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
    for (let i = 0; i < Math.min(all.length, rects.length); i += 1) {
      const clip = all[i];
      const f = clip === primaryClip ? primaryFrame : await frameFor(clip);
      if (!f) continue;
      const r = rects[i];
      drawBlended(f, clip, r.x, r.y, r.width, r.height);
    }
  } else if (isPip) {
    if (primaryFrame) drawBlended(primaryFrame, primaryClip, 0, 0, W, H);
    const rects = rectsForLayout('pip', W, H);
    const pipClip = secondaryClips[0];
    if (pipClip) {
      const f = await frameFor(pipClip);
      if (f) {
        const r = rects[0];
        drawBlended(f, pipClip, r.x, r.y, r.width, r.height);
      }
    }
  } else {
    // Normal mode (BUG-P5-001 fix): composite ALL visible clips
    // bottom-to-top — backgrounds, then the base video/image clip
    // (with its transition-in), then text/sticker overlays.
    const isBg = (c: Clip) => c.sticker?.category === 'Backgrounds';
    for (const clip of visibleClips.filter(isBg)) {
      const f = clip === primaryClip ? primaryFrame : await frameFor(clip);
      if (f) drawBlended(f, clip, 0, 0, W, H);
    }
    if (baseClip) {
      const baseLocal = Math.max(0, time - baseClip.start);
      const baseFrame = baseClip === primaryClip ? primaryFrame : await frameFor(baseClip);
      if (baseFrame) {
        const tr = baseClip.transitionIn;
        if (tr && baseLocal < tr.duration) {
          const prev = project.tracks
            .find((t) => t.id === baseClip.trackId)
            ?.clips.filter((c) => c.id !== baseClip.id && c.start + c.duration <= baseClip.start + 0.01)
            .sort((a, b) => b.start + b.duration - (a.start + a.duration))[0];
          if (prev) {
            const prevFrame = await frameFor({ ...prev, start: prev.start, duration: prev.duration });
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
      const f = clip === primaryClip ? primaryFrame : await frameFor(clip);
      if (f) drawBlended(f, clip, 0, 0, W, H);
    }
  }

  // Caption overlay (word-level highlight) on top of everything.
  drawCaptionOverlay(ctx, project.captions ?? [], time, project.captionStyleId, W, H);
  if (opts.isCurrent && !opts.isCurrent()) return { skippedClips: skipped };

  if (showBadges) {
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
    if (primaryClip.transitionIn && Math.max(0, time - primaryClip.start) < primaryClip.transitionIn.duration) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`TRANSITION: ${primaryClip.transitionIn.type.toUpperCase()}`, 10, 56);
    }
    if (primaryClip.mask) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`MASK: ${primaryClip.mask.shape.toUpperCase()}${opts.maskEditing ? ' — click to add pen points' : ''}`, 10, 74);
    }
  }

  return { skippedClips: skipped };
}
