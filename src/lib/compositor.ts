import type { Clip } from '../schema/project';
import { cssFilterForAdjustment, applyAdjustmentToPixels, isAdjustmentIdentity, sharpenPixels } from './color';
import { cssFilterForEffects, effectParams, glitchSlices, pixelEffects } from './effects';
import { combinedAnimationState, valueAtKeyframes } from './keyframes';
import { applyLutToPixels } from './lut';
import { applyChromaKey, layoutRects, maskPath } from './masks';

/** Canvas compositor (Phase 2). Renders one clip frame to an offscreen
 * canvas, applying keyframes, animations, CSS effects, pixel effects,
 * LUT, colour adjustment, masks and chroma key — in that order.
 * Pixel work runs on a working canvas capped at 960 px wide so live
 * preview stays smooth; the result is composited up to full size. */

export const WORKING_MAX_WIDTH = 960;

export interface EvaluatedClip {
  opacity: number;
  positionX: number;
  positionY: number;
  rotation: number;
  scale: number;
  brightness: number;
  maskFeather: number;
  animOffsetX: number;
  animOffsetY: number;
  animOpacity: number;
  animRotation: number;
  animScale: number;
}

/** Keyframe-evaluated transform values for a clip at a clip-local time. */
export function evaluateClipAt(clip: Clip, localTime: number): EvaluatedClip {
  const anim = combinedAnimationState(clip.animationIn, clip.animationOut, localTime, clip.duration);
  return {
    opacity: valueAtKeyframes(clip.keyframes, 'opacity', localTime, clip.opacity),
    positionX: valueAtKeyframes(clip.keyframes, 'positionX', localTime, clip.positionX),
    positionY: valueAtKeyframes(clip.keyframes, 'positionY', localTime, clip.positionY),
    rotation: valueAtKeyframes(clip.keyframes, 'rotation', localTime, clip.rotation),
    scale: valueAtKeyframes(clip.keyframes, 'scale', localTime, clip.scale),
    brightness: valueAtKeyframes(clip.keyframes, 'brightness', localTime, clip.adjustment.brightness),
    maskFeather: valueAtKeyframes(clip.keyframes, 'maskFeather', localTime, clip.mask?.feather ?? 0),
    animOffsetX: anim.offsetX,
    animOffsetY: anim.offsetY,
    animOpacity: anim.opacity,
    animRotation: anim.rotation,
    animScale: anim.scale,
  };
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

/** Render one clip's source frame (video/image) into a working canvas. */
export function renderClipFrame(
  source: CanvasImageSource,
  sourceW: number,
  sourceH: number,
  clip: Clip,
  localTime: number,
  frameIndex: number,
  outWidth: number,
  outHeight: number,
): HTMLCanvasElement {
  const scale = Math.min(1, WORKING_MAX_WIDTH / Math.max(1, outWidth));
  const w = Math.max(1, Math.round(outWidth * scale));
  const h = Math.max(1, Math.round(outHeight * scale));
  const frame = makeCanvas(w, h);
  const ctx = frame.getContext('2d');
  if (!ctx) return frame;
  const ev = evaluateClipAt(clip, localTime);

  // 1. Draw the source with transforms + CSS filters.
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  const cssParts = [cssFilterForEffects(clip.effects), cssFilterForAdjustment({ ...clip.adjustment, brightness: ev.brightness })]
    .filter((f) => f !== 'none')
    .join(' ');
  if (cssParts) ctx.filter = cssParts;
  ctx.globalAlpha = Math.min(1, Math.max(0, ev.opacity * ev.animOpacity));
  const cx = w / 2 + ((ev.positionX + ev.animOffsetX) / 100) * w;
  const cy = h / 2 + ((ev.positionY + ev.animOffsetY) / 100) * h;
  ctx.translate(cx, cy);
  ctx.rotate(((ev.rotation + ev.animRotation) * Math.PI) / 180);
  ctx.scale((clip.flipH ? -1 : 1) * ev.scale * ev.animScale, (clip.flipV ? -1 : 1) * ev.scale * ev.animScale);
  const crop = clip.crop ?? { height: 1, width: 1, x: 0, y: 0 };
  const sx = sourceW * crop.x;
  const sy = sourceH * crop.y;
  const sW = Math.max(1, sourceW * crop.width);
  const sH = Math.max(1, sourceH * crop.height);
  let dw = w;
  let dh = (w * sH) / sW;
  if (clip.fit === 'fit' ? dh > h : dh < h) {
    dh = h;
    dw = (h * sW) / sH;
  }
  ctx.drawImage(source, sx, sy, sW, sH, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  ctx.filter = 'none';

  // 2. Pixel effects (pixelate / vignette / RGB split / glitch).
  for (const { def, effect } of pixelEffects(clip.effects)) {
    const params = effectParams(effect);
    const inten = effect.intensity;
    if (def.pixel === 'pixelate' && inten > 0) {
      const size = Math.max(2, Math.round((params.size ?? 12) * inten));
      const small = makeCanvas(Math.max(1, Math.round(w / size)), Math.max(1, Math.round(h / size)));
      const sctx = small.getContext('2d');
      if (sctx) {
        sctx.drawImage(frame, 0, 0, small.width, small.height);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(small, 0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
      }
    } else if (def.pixel === 'vignette' && inten > 0) {
      const strength = (params.strength ?? 0.6) * inten;
      const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${strength.toFixed(2)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (def.pixel === 'rgb-split' && inten > 0) {
      const off = Math.round((params.offset ?? 6) * inten);
      if (off > 0) {
        const copy = makeCanvas(w, h);
        const cctx = copy.getContext('2d');
        if (cctx) {
          cctx.drawImage(frame, 0, 0);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.6;
          ctx.drawImage(copy, off, 0);
          ctx.drawImage(copy, -off, 0);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    } else if (def.pixel === 'glitch' && inten > 0) {
      for (const s of glitchSlices(frameIndex, h, inten)) {
        const strip = makeCanvas(w, s.h);
        const sctx = strip.getContext('2d');
        if (!sctx) continue;
        sctx.drawImage(frame, 0, -s.y, w, h);
        ctx.clearRect(0, s.dy, w, s.h);
        ctx.drawImage(strip, s.shift, s.dy);
      }
    }
  }

  // 3. Mask (shape / pen / linear / mirror).
  if (clip.mask) {
    const mask = clip.mask;
    const feather = Math.max(mask.feather, ev.maskFeather);
    if (mask.shape === 'linear') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      const masked = makeCanvas(w, h);
      const mctx = masked.getContext('2d');
      if (mctx) {
        mctx.drawImage(frame, 0, 0);
        mctx.globalCompositeOperation = 'destination-in';
        mctx.fillStyle = mask.invert ? 'rgba(0,0,0,0)' : grad;
        mctx.fillRect(0, 0, w, h);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(masked, 0, 0);
      }
    } else if (mask.shape === 'mirror') {
      const masked = makeCanvas(w, h);
      const mctx = masked.getContext('2d');
      if (mctx) {
        mctx.drawImage(frame, 0, 0);
        mctx.globalCompositeOperation = 'destination-in';
        mctx.fillStyle = '#000';
        mctx.fillRect(0, 0, mask.invert ? w : w / 2, h);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(masked, 0, 0);
      }
    } else {
      const path = maskPath(mask.shape, mask.points, w, h);
      if (path) {
        const masked = makeCanvas(w, h);
        const mctx = masked.getContext('2d');
        if (mctx) {
          if (feather > 0) mctx.filter = `blur(${(feather * 24).toFixed(1)}px)`;
          mctx.fillStyle = '#000';
          mctx.fill(path);
          mctx.filter = 'none';
          mctx.globalCompositeOperation = 'source-in';
          mctx.drawImage(frame, 0, 0);
          ctx.clearRect(0, 0, w, h);
          if (mask.invert) {
            ctx.drawImage(frame, 0, 0);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.drawImage(masked, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
          } else {
            ctx.drawImage(masked, 0, 0);
          }
        }
      }
    }
  }

  // 4. Per-pixel passes: chroma key, LUT, full adjustment, sharpen.
  const needsPixels =
    (clip.chromaKey.enabled && clip.chromaKey.tolerance > 0) ||
    Boolean(clip.lut && clip.lut.intensity > 0) ||
    !isAdjustmentIdentity({ ...clip.adjustment, brightness: ev.brightness }) ||
    clip.adjustment.sharpen > 0;
  if (needsPixels) {
    const img = ctx.getImageData(0, 0, w, h);
    if (clip.chromaKey.enabled) {
      applyChromaKey(img.data, clip.chromaKey.color, clip.chromaKey.tolerance, clip.chromaKey.smoothness);
    }
    if (clip.lut && clip.lut.intensity > 0) {
      applyLutToPixels(img.data, clip.lut.data, clip.lut.size, clip.lut.intensity);
    }
    if (!isAdjustmentIdentity({ ...clip.adjustment, brightness: ev.brightness })) {
      applyAdjustmentToPixels(img.data, { ...clip.adjustment, brightness: ev.brightness });
    }
    if (clip.adjustment.sharpen > 0) {
      sharpenPixels(img.data, w, h, clip.adjustment.sharpen);
    }
    ctx.putImageData(img, 0, 0);
  }
  return frame;
}

/** Layout rects for PiP / split-screen, in preview-canvas pixels. */
export function rectsForLayout(mode: string, width: number, height: number) {
  return layoutRects(mode, width, height);
}
