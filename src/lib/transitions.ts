import type { TransitionType } from '../schema/project';

/** Transitions (Phase 2, SPEC E). Pure progress math + canvas drawing. */

export type TransitionCategory = 'Fade' | 'Slide' | 'Wipe' | 'Shape' | 'Pixel' | 'Camera';

export const TRANSITION_CATEGORIES: TransitionCategory[] = ['Fade', 'Slide', 'Wipe', 'Shape', 'Pixel', 'Camera'];

export const TRANSITION_TYPES: { category: TransitionCategory; description: string; id: TransitionType }[] = [
  { category: 'Fade', description: 'Cross-fade to the new clip.', id: 'fade' },
  { category: 'Fade', description: 'Soft dissolve.', id: 'dissolve' },
  { category: 'Fade', description: 'Dip to black, then reveal.', id: 'dip-black' },
  { category: 'Fade', description: 'Dip to white, then reveal.', id: 'dip-white' },
  { category: 'Fade', description: 'White flash at the cut.', id: 'flash' },
  { category: 'Slide', description: 'New clip slides in.', id: 'slide' },
  { category: 'Slide', description: 'New clip pushes the old one out.', id: 'push' },
  { category: 'Slide', description: 'Slide in with a blur.', id: 'slide-blur' },
  { category: 'Slide', description: 'Rotate like a cube face.', id: 'cube' },
  { category: 'Slide', description: 'Flip over like a card.', id: 'flip' },
  { category: 'Slide', description: 'Two halves split apart.', id: 'split' },
  { category: 'Wipe', description: 'A wipe edge sweeps across.', id: 'wipe' },
  { category: 'Wipe', description: 'Diagonal wipe sweep.', id: 'diagonal' },
  { category: 'Wipe', description: 'Venetian slats open.', id: 'venetian' },
  { category: 'Wipe', description: 'Vertical bars sweep in.', id: 'bars' },
  { category: 'Wipe', description: 'Shutter strips open.', id: 'shutter' },
  { category: 'Shape', description: 'Circle iris opens.', id: 'circle' },
  { category: 'Shape', description: 'Diamond iris opens.', id: 'diamond' },
  { category: 'Shape', description: 'Clock-hand sweep.', id: 'clock' },
  { category: 'Shape', description: 'Rounded-rect iris opens.', id: 'iris' },
  { category: 'Shape', description: 'Heart-shaped reveal.', id: 'heart' },
  { category: 'Shape', description: 'Star-shaped reveal.', id: 'star' },
  { category: 'Pixel', description: 'Checkerboard cells flip in.', id: 'checker' },
  { category: 'Pixel', description: 'Pixels dissolve in.', id: 'pixel-dissolve' },
  { category: 'Pixel', description: 'Horizontal blinds flip open.', id: 'blinds' },
  { category: 'Camera', description: 'Zoom from the old frame into the new.', id: 'zoom' },
  { category: 'Camera', description: 'Spin into the new clip.', id: 'spin' },
  { category: 'Camera', description: 'Blur through the cut.', id: 'blur' },
  { category: 'Camera', description: 'Zoom and rotate in.', id: 'zoom-rotate' },
  { category: 'Camera', description: 'Water ripple across the cut.', id: 'ripple' },
  { category: 'Camera', description: 'Wave sweep across the cut.', id: 'wave' },
  { category: 'Camera', description: 'Glitch slices, then clean cut.', id: 'glitch-cut' },
];

export function transitionDef(id: string): { category: TransitionCategory; description: string; id: TransitionType } | undefined {
  return TRANSITION_TYPES.find((t) => t.id === id);
}

export function searchTransitions(query: string): { category: TransitionCategory; description: string; id: TransitionType }[] {
  const q = query.trim().toLowerCase();
  if (!q) return TRANSITION_TYPES;
  return TRANSITION_TYPES.filter((t) => t.id.includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
}

/** Deterministic pseudo-random from an integer seed (0..1). */
function hash01(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Transition progress 0..1 for a clip-local time inside its transition-in. */
export function transitionProgress(localTime: number, duration: number): number {
  if (duration <= 0) return 1;
  return Math.min(1, Math.max(0, localTime / duration));
}

/** Draw a transition frame. `from` is the previous clip's frame canvas (may be null),
 * `to` is the incoming clip's frame canvas. Both are the full preview size. */
export function drawTransition(
  ctx: CanvasRenderingContext2D,
  from: HTMLCanvasElement | null,
  to: HTMLCanvasElement,
  type: TransitionType,
  progress: number,
  direction: string,
  width: number,
  height: number,
): void {
  const p = Math.min(1, Math.max(0, progress));
  const ease = p * p * (3 - 2 * p); // smoothstep
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  if (!from || p >= 1) {
    ctx.drawImage(to, 0, 0, width, height);
    ctx.restore();
    return;
  }
  switch (type) {
    case 'fade':
    case 'dissolve': {
      ctx.drawImage(from, 0, 0, width, height);
      ctx.globalAlpha = ease;
      ctx.drawImage(to, 0, 0, width, height);
      break;
    }
    case 'slide': {
      const dx = direction === 'left' ? -1 : direction === 'up' || direction === 'down' ? 0 : 1;
      const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
      ctx.drawImage(from, 0, 0, width, height);
      ctx.drawImage(to, dx * width * (1 - ease), dy * height * (1 - ease), width, height);
      break;
    }
    case 'push': {
      const dx = direction === 'left' ? -1 : direction === 'up' || direction === 'down' ? 0 : 1;
      const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
      ctx.drawImage(from, -dx * width * ease, -dy * height * ease, width, height);
      ctx.drawImage(to, dx * width * (1 - ease), dy * height * (1 - ease), width, height);
      break;
    }
    case 'zoom': {
      ctx.drawImage(from, 0, 0, width, height);
      const s = 0.6 + 0.4 * ease;
      const dw = width * s;
      const dh = height * s;
      ctx.globalAlpha = ease;
      ctx.drawImage(to, (width - dw) / 2, (height - dh) / 2, dw, dh);
      break;
    }
    case 'wipe': {
      ctx.drawImage(from, 0, 0, width, height);
      const horizontal = direction === 'left' || direction === 'right';
      ctx.save();
      ctx.beginPath();
      if (horizontal) ctx.rect(0, 0, width * ease, height);
      else ctx.rect(0, 0, width, height * ease);
      ctx.clip();
      ctx.drawImage(to, 0, 0, width, height);
      ctx.restore();
      break;
    }
    case 'blur': {
      ctx.drawImage(from, 0, 0, width, height);
      ctx.filter = `blur(${(1 - ease) * 12}px)`;
      ctx.globalAlpha = ease;
      ctx.drawImage(to, 0, 0, width, height);
      ctx.filter = 'none';
      break;
    }
    case 'spin': {
      ctx.drawImage(from, 0, 0, width, height);
      ctx.translate(width / 2, height / 2);
      ctx.rotate((1 - ease) * Math.PI);
      ctx.scale(0.5 + 0.5 * ease, 0.5 + 0.5 * ease);
      ctx.globalAlpha = ease;
      ctx.drawImage(to, -width / 2, -height / 2, width, height);
      break;
    }
    case 'dip-black':
    case 'dip-white': {
      ctx.drawImage(from, 0, 0, width, height);
      const a = Math.sin(ease * Math.PI);
      ctx.globalAlpha = a;
      ctx.fillStyle = type === 'dip-black' ? '#000000' : '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = ease > 0.5 ? (ease - 0.5) * 2 : 0;
      ctx.drawImage(to, 0, 0, width, height);
      break;
    }
    case 'flash': {
      ctx.drawImage(from, 0, 0, width, height);
      ctx.globalAlpha = ease;
      ctx.drawImage(to, 0, 0, width, height);
      ctx.globalAlpha = (1 - Math.abs(2 * ease - 1)) * 0.9;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case 'slide-blur': {
      const dx = direction === 'left' ? -1 : direction === 'up' || direction === 'down' ? 0 : 1;
      const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0;
      ctx.drawImage(from, 0, 0, width, height);
      ctx.filter = `blur(${((1 - ease) * 8).toFixed(1)}px)`;
      ctx.drawImage(to, dx * width * (1 - ease), dy * height * (1 - ease), width, height);
      ctx.filter = 'none';
      break;
    }
    case 'cube': {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(Math.max(0.05, 1 - ease), 1);
      ctx.drawImage(from, -width / 2, -height / 2, width, height);
      ctx.restore();
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(Math.max(0.05, ease), 1);
      ctx.globalAlpha = ease;
      ctx.drawImage(to, -width / 2, -height / 2, width, height);
      ctx.restore();
      break;
    }
    case 'flip': {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      if (ease < 0.5) {
        ctx.scale(Math.max(0.05, Math.cos(ease * Math.PI)), 1);
        ctx.drawImage(from, -width / 2, -height / 2, width, height);
      } else {
        ctx.scale(Math.max(0.05, Math.sin((ease - 0.5) * Math.PI)), 1);
        ctx.drawImage(to, -width / 2, -height / 2, width, height);
      }
      ctx.restore();
      break;
    }
    case 'split': {
      ctx.drawImage(to, 0, 0, width, height);
      const half = height / 2;
      ctx.drawImage(from, 0, 0, width, half, 0, -ease * half, width, half);
      ctx.drawImage(from, 0, half, width, half, 0, half + ease * half, width, half);
      break;
    }
    case 'diagonal': {
      ctx.drawImage(from, 0, 0, width, height);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width * ease + height * 0.5, 0);
      ctx.lineTo(width * ease - height * 0.5, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(to, 0, 0, width, height);
      ctx.restore();
      break;
    }
    case 'venetian': {
      const strips = 8;
      const sh = height / strips;
      for (let i = 0; i < strips; i += 1) {
        const local = Math.min(1, Math.max(0, ease * strips - i));
        if (local <= 0) continue;
        const y = i * sh + (sh * (1 - local)) / 2;
        ctx.drawImage(to, 0, i * sh, width, sh, 0, y, width, sh * local);
      }
      break;
    }
    case 'bars': {
      const barsN = 6;
      const bw = width / barsN;
      for (let i = 0; i < barsN; i += 1) {
        const local = Math.min(1, Math.max(0, ease * barsN - i));
        if (local <= 0) continue;
        ctx.drawImage(to, i * bw, 0, bw, height, i * bw, 0, bw * local, height);
      }
      break;
    }
    case 'shutter': {
      const strips = 8;
      const sh = height / strips;
      for (let i = 0; i < strips; i += 1) {
        const local = Math.min(1, Math.max(0, ease * 2 - Math.abs(i - 3.5) / 4));
        if (local <= 0) continue;
        const y = i * sh + (sh * (1 - local)) / 2;
        ctx.drawImage(to, 0, i * sh, width, sh, 0, y, width, sh * local);
      }
      break;
    }
    case 'circle': {
      ctx.drawImage(from, 0, 0, width, height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, ease * Math.max(width, height) * 0.75, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(to, 0, 0, width, height);
      ctx.restore();
      break;
    }
    case 'diamond': {
      const r = ease * Math.max(width, height) * 0.75;
      ctx.drawImage(from, 0, 0, width, height);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(width / 2, height / 2 - r);
      ctx.lineTo(width / 2 + r, height / 2);
      ctx.lineTo(width / 2, height / 2 + r);
      ctx.lineTo(width / 2 - r, height / 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(to, 0, 0, width, height);
      ctx.restore();
      break;
    }
    case 'clock': {
      ctx.drawImage(from, 0, 0, width, height);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(width / 2, height / 2);
      ctx.arc(width / 2, height / 2, Math.max(width, height), -Math.PI / 2, -Math.PI / 2 + ease * Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(to, 0, 0, width, height);
      ctx.restore();
      break;
    }
    case 'iris': {
      const rw = width * (0.1 + 0.9 * ease);
      const rh = height * (0.1 + 0.9 * ease);
      ctx.drawImage(from, 0, 0, width, height);
      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect((width - rw) / 2, (height - rh) / 2, rw, rh, Math.min(rw, rh) * 0.2);
      else ctx.rect((width - rw) / 2, (height - rh) / 2, rw, rh);
      ctx.clip();
      ctx.drawImage(to, 0, 0, width, height);
      ctx.restore();
      break;
    }
    case 'heart': {
      const path = new Path2D('M60 100 C20 72 14 40 34 26 C46 18 58 26 60 36 C62 26 74 18 86 26 C106 40 100 72 60 100 Z');
      const s = (ease * Math.max(width, height) * 1.4) / 120;
      ctx.drawImage(from, 0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2 - 60 * s, height / 2 - 60 * s);
      ctx.scale(s, s);
      ctx.clip(path);
      ctx.drawImage(to, -((width / 2 - 60 * s) / s), -((height / 2 - 60 * s) / s), width / s, height / s);
      ctx.restore();
      break;
    }
    case 'star': {
      const path = new Path2D('M60 14 L74 46 L108 48 L82 70 L90 104 L60 86 L30 104 L38 70 L12 48 L46 46 Z');
      const s = (ease * Math.max(width, height) * 1.4) / 120;
      ctx.drawImage(from, 0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2 - 60 * s, height / 2 - 60 * s);
      ctx.scale(s, s);
      ctx.clip(path);
      ctx.drawImage(to, -((width / 2 - 60 * s) / s), -((height / 2 - 60 * s) / s), width / s, height / s);
      ctx.restore();
      break;
    }
    case 'checker': {
      const cols = 8;
      const rows = 6;
      const cw = width / cols;
      const ch = height / rows;
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          if (ease * 1.2 > hash01(i * 31 + j * 7)) {
            ctx.drawImage(to, i * cw, j * ch, cw, ch, i * cw, j * ch, cw, ch);
          }
        }
      }
      break;
    }
    case 'pixel-dissolve': {
      const cols = 16;
      const rows = 9;
      const cw = width / cols;
      const ch = height / rows;
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          if (hash01(i * 17 + j * 13) < ease) {
            ctx.drawImage(to, i * cw, j * ch, cw, ch, i * cw, j * ch, cw, ch);
          }
        }
      }
      break;
    }
    case 'blinds': {
      const strips = 8;
      const sh = height / strips;
      for (let i = 0; i < strips; i += 1) {
        const local = Math.min(1, Math.max(0, ease * strips - i));
        if (local <= 0) continue;
        ctx.drawImage(to, 0, i * sh, width, sh, 0, i * sh, width, sh * local);
      }
      break;
    }
    case 'zoom-rotate': {
      ctx.drawImage(from, 0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((1 - ease) * (Math.PI / 2));
      const s = 0.5 + 0.5 * ease;
      ctx.globalAlpha = ease;
      ctx.drawImage(to, (-width * s) / 2, (-height * s) / 2, width * s, height * s);
      ctx.restore();
      break;
    }
    case 'ripple': {
      const step = 8;
      for (let y = 0; y < height; y += step) {
        const off = Math.sin(y * 0.1 + ease * 6) * 12 * (1 - ease);
        ctx.drawImage(to, 0, y, width, step, off, y, width, step);
      }
      break;
    }
    case 'wave': {
      const step = 8;
      for (let x = 0; x < width; x += step) {
        const off = Math.sin(x * 0.1 + ease * 6) * 12 * (1 - ease);
        ctx.drawImage(to, x, 0, step, height, x, off, step, height);
      }
      break;
    }
    case 'glitch-cut': {
      if (ease < 0.5) {
        const step = 12;
        for (let y = 0, i = 0; y < height; y += step, i += 1) {
          const shift = (hash01(i * 7 + Math.floor(ease * 20)) - 0.5) * 40 * (1 - ease * 2);
          ctx.drawImage(from, 0, y, width, step, shift, y, width, step);
        }
      } else {
        ctx.drawImage(to, 0, 0, width, height);
      }
      break;
    }
    default: {
      ctx.drawImage(to, 0, 0, width, height);
    }
  }
  ctx.restore();
}
