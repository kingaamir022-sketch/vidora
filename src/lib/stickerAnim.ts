/**
 * Animated sticker variants (Phase 5, SPEC N — H-STICKER).
 * 28 original keyframed motion specs, one per base sticker design.
 * Each spec is plain data (exported as Lottie-style JSON by build:assets)
 * and is evaluated here into the same loop-animation state the text
 * loop animations use, so stickers, text and captions share one motion
 * vocabulary. `kind` is the base design id (e.g. 'heart'); the spec is
 * looked up by that id.
 */

export interface MotionKeyframe {
  offsetX?: number;
  offsetY?: number;
  opacity?: number;
  rotation?: number;
  scale?: number;
  /** Position in the loop, 0..1. */
  t: number;
}

export interface MotionSpec {
  /** Loop duration in seconds. */
  duration: number;
  id: string;
  keyframes: MotionKeyframe[];
  name: string;
}

export interface MotionState {
  offsetX: number;
  offsetY: number;
  opacity: number;
  rotation: number;
  scale: number;
}

const K = (t: number, patch: Omit<MotionKeyframe, 't'>): MotionKeyframe => ({ t, ...patch });

export const STICKER_MOTION_SPECS: MotionSpec[] = [
  { duration: 2, id: 'heart', keyframes: [K(0, { scale: 1 }), K(0.15, { scale: 1.25 }), K(0.3, { scale: 1 }), K(0.45, { scale: 1.18 }), K(0.6, { scale: 1 })], name: 'Heartbeat' },
  { duration: 2, id: 'star', keyframes: [K(0, { opacity: 1, rotation: 0, scale: 1 }), K(0.5, { opacity: 0.7, rotation: 180, scale: 1.15 }), K(1, { opacity: 1, rotation: 360, scale: 1 })], name: 'Twinkle Spin' },
  { duration: 2, id: 'smile', keyframes: [K(0, { scale: 1 }), K(0.25, { scale: 1.1 }), K(0.5, { scale: 1 }), K(0.75, { scale: 1.1 }), K(1, { scale: 1 })], name: 'Happy Bounce' },
  { duration: 2, id: 'sparkle', keyframes: [K(0, { opacity: 0.2, scale: 0.7 }), K(0.5, { opacity: 1, scale: 1.2 }), K(1, { opacity: 0.2, scale: 0.7 })], name: 'Sparkle Pulse' },
  { duration: 2, id: 'crown', keyframes: [K(0, { offsetY: 0 }), K(0.5, { offsetY: -8 }), K(1, { offsetY: 0 })], name: 'Royal Float' },
  { duration: 2, id: 'flame', keyframes: [K(0, { scale: 1 }), K(0.25, { scale: 1.12 }), K(0.5, { scale: 0.96 }), K(0.75, { scale: 1.1 }), K(1, { scale: 1 })], name: 'Flicker' },
  { duration: 2, id: 'sun', keyframes: [K(0, { rotation: 0, scale: 1 }), K(0.5, { rotation: 180, scale: 1.1 }), K(1, { rotation: 360, scale: 1 })], name: 'Sun Spin' },
  { duration: 2, id: 'moon', keyframes: [K(0, { offsetY: 0, rotation: -6 }), K(0.5, { offsetY: -6, rotation: 6 }), K(1, { offsetY: 0, rotation: -6 })], name: 'Moon Sway' },
  { duration: 2, id: 'lightning', keyframes: [K(0, { opacity: 1, scale: 1 }), K(0.1, { opacity: 0.3 }), K(0.2, { opacity: 1 }), K(0.5, { scale: 1.15 }), K(1, { opacity: 1, scale: 1 })], name: 'Flash Zap' },
  { duration: 2, id: 'music-note', keyframes: [K(0, { offsetY: 0, rotation: 0 }), K(0.25, { offsetY: -8, rotation: -8 }), K(0.5, { offsetY: 0, rotation: 0 }), K(0.75, { offsetY: -8, rotation: 8 }), K(1, { offsetY: 0, rotation: 0 })], name: 'Note Dance' },
  { duration: 2, id: 'camera', keyframes: [K(0, { scale: 1 }), K(0.2, { scale: 0.92 }), K(0.4, { scale: 1.08 }), K(1, { scale: 1 })], name: 'Shutter Snap' },
  { duration: 2, id: 'gift', keyframes: [K(0, { rotation: -5 }), K(0.25, { rotation: 5 }), K(0.5, { rotation: -5 }), K(0.75, { rotation: 5 }), K(1, { rotation: -5 })], name: 'Gift Wiggle' },
  { duration: 2, id: 'party', keyframes: [K(0, { offsetY: 0, rotation: 0 }), K(0.5, { offsetY: -10, rotation: 15 }), K(1, { offsetY: 0, rotation: 0 })], name: 'Party Pop' },
  { duration: 2, id: 'rocket', keyframes: [K(0, { offsetY: 0, rotation: 0 }), K(0.5, { offsetY: -14, rotation: -4 }), K(1, { offsetY: 0, rotation: 0 })], name: 'Rocket Lift' },
  { duration: 2, id: 'flower', keyframes: [K(0, { rotation: 0, scale: 1 }), K(0.5, { rotation: 45, scale: 1.08 }), K(1, { rotation: 0, scale: 1 })], name: 'Bloom Turn' },
  { duration: 2, id: 'leaf', keyframes: [K(0, { offsetX: 0, rotation: -8 }), K(0.5, { offsetX: 6, rotation: 8 }), K(1, { offsetX: 0, rotation: -8 })], name: 'Leaf Drift' },
  { duration: 2, id: 'drop', keyframes: [K(0, { offsetY: 0, scale: 1 }), K(0.5, { offsetY: 6, scale: 1.1 }), K(1, { offsetY: 0, scale: 1 })], name: 'Drop Fall' },
  { duration: 2, id: 'bubble', keyframes: [K(0, { offsetY: 0, scale: 0.9 }), K(0.5, { offsetY: -10, scale: 1.1 }), K(1, { offsetY: 0, scale: 0.9 })], name: 'Bubble Rise' },
  { duration: 2, id: 'arrow', keyframes: [K(0, { offsetX: 0 }), K(0.5, { offsetX: 12 }), K(1, { offsetX: 0 })], name: 'Arrow Nudge' },
  { duration: 2, id: 'check', keyframes: [K(0, { scale: 0.8 }), K(0.3, { scale: 1.15 }), K(0.6, { scale: 1 }), K(1, { scale: 0.8 })], name: 'Check Pop' },
  { duration: 2, id: 'warning', keyframes: [K(0, { opacity: 1 }), K(0.25, { opacity: 0.4 }), K(0.5, { opacity: 1 }), K(0.75, { opacity: 0.4 }), K(1, { opacity: 1 })], name: 'Warn Blink' },
  { duration: 2, id: 'thumbs-up', keyframes: [K(0, { rotation: 0 }), K(0.3, { rotation: -12 }), K(0.6, { rotation: 8 }), K(1, { rotation: 0 })], name: 'Thumbs Rock' },
  { duration: 2, id: 'clapper', keyframes: [K(0, { rotation: 0, scale: 1 }), K(0.2, { rotation: -6, scale: 1.06 }), K(1, { rotation: 0, scale: 1 })], name: 'Clap Snap' },
  { duration: 2, id: 'mic', keyframes: [K(0, { scale: 1 }), K(0.5, { scale: 1.12 }), K(1, { scale: 1 })], name: 'Mic Pulse' },
  { duration: 2, id: 'play', keyframes: [K(0, { opacity: 1, scale: 1 }), K(0.5, { opacity: 0.75, scale: 1.12 }), K(1, { opacity: 1, scale: 1 })], name: 'Play Pulse' },
  { duration: 2, id: 'pause', keyframes: [K(0, { opacity: 1 }), K(0.5, { opacity: 0.5 }), K(1, { opacity: 1 })], name: 'Pause Fade' },
  { duration: 2, id: 'shield', keyframes: [K(0, { scale: 1 }), K(0.5, { scale: 1.08 }), K(1, { scale: 1 })], name: 'Shield Guard' },
  { duration: 2, id: 'bell', keyframes: [K(0, { rotation: 0 }), K(0.2, { rotation: 12 }), K(0.4, { rotation: -12 }), K(0.6, { rotation: 6 }), K(1, { rotation: 0 })], name: 'Bell Ring' },
];

export function motionSpec(id: string): MotionSpec | undefined {
  return STICKER_MOTION_SPECS.find((s) => s.id === id);
}

const BASE: MotionState = { offsetX: 0, offsetY: 0, opacity: 1, rotation: 0, scale: 1 };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Evaluate a motion spec at a clip-local time (loops forever). */
export function evaluateStickerAnim(id: string, localTime: number): MotionState {
  const spec = motionSpec(id);
  if (!spec || spec.keyframes.length === 0) return { ...BASE };
  const duration = Math.max(0.1, spec.duration);
  const phase = ((localTime % duration) + duration) % duration / duration;
  const frames = spec.keyframes;
  let prev = frames[frames.length - 1];
  let next = frames[0];
  for (let i = 0; i < frames.length; i += 1) {
    if (frames[i].t <= phase) prev = frames[i];
    if (frames[i].t >= phase) {
      next = frames[i];
      break;
    }
  }
  if (prev === next) {
    return {
      offsetX: prev.offsetX ?? 0,
      offsetY: prev.offsetY ?? 0,
      opacity: prev.opacity ?? 1,
      rotation: prev.rotation ?? 0,
      scale: prev.scale ?? 1,
    };
  }
  const span = next.t - prev.t || 1;
  const t = Math.min(1, Math.max(0, (phase - prev.t) / span));
  return {
    offsetX: lerp(prev.offsetX ?? 0, next.offsetX ?? 0, t),
    offsetY: lerp(prev.offsetY ?? 0, next.offsetY ?? 0, t),
    opacity: lerp(prev.opacity ?? 1, next.opacity ?? 1, t),
    rotation: lerp(prev.rotation ?? 0, next.rotation ?? 0, t),
    scale: lerp(prev.scale ?? 1, next.scale ?? 1, t),
  };
}

/** The 28 `motion-*` loop-animation kinds (one per base sticker design). */
export const MOTION_LOOP_KINDS: string[] = STICKER_MOTION_SPECS.map((s) => `motion-${s.id}`);

/** Evaluate a `motion-*` loop kind at a clip-local time. */
export function evaluateMotionLoop(kind: string, localTime: number): MotionState {
  if (!kind.startsWith('motion-')) return { ...BASE };
  return evaluateStickerAnim(kind.slice('motion-'.length), localTime);
}
