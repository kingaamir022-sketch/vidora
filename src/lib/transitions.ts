import type { TransitionType } from '../schema/project';

/** Transitions (Phase 2, SPEC E). Pure progress math + canvas drawing. */

export const TRANSITION_TYPES: { description: string; id: TransitionType }[] = [
  { description: 'Cross-fade to the new clip.', id: 'fade' },
  { description: 'Soft dissolve.', id: 'dissolve' },
  { description: 'New clip slides in.', id: 'slide' },
  { description: 'New clip pushes the old one out.', id: 'push' },
  { description: 'Zoom from the old frame into the new.', id: 'zoom' },
  { description: 'A wipe edge sweeps across.', id: 'wipe' },
  { description: 'Blur through the cut.', id: 'blur' },
  { description: 'Spin into the new clip.', id: 'spin' },
];

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
    default: {
      ctx.drawImage(to, 0, 0, width, height);
    }
  }
  ctx.restore();
}
