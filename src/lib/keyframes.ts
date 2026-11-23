import { newId, type Easing, type Keyframe } from '../schema/project';

/** Keyframe engine (Phase 2, SPEC D). Pure functions — no DOM. */

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Cubic-bezier easing solver (Newton + bisection fallback). */
export function cubicBezierEasing(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    const t0 = clamp01(x);
    let t = t0;
    for (let i = 0; i < 8; i += 1) {
      const err = sampleX(t) - t0;
      if (Math.abs(err) < 1e-6) return clamp01(sampleY(t));
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = t0;
    while (hi - lo > 1e-6) {
      if (sampleX(t) < t0) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return clamp01(sampleY(t));
  };
}

export function easingFunction(easing: Easing, bezier?: [number, number, number, number]): (t: number) => number {
  switch (easing) {
    case 'linear':
      return (t) => clamp01(t);
    case 'ease':
      return cubicBezierEasing(0.25, 0.1, 0.25, 1);
    case 'ease-in':
      return cubicBezierEasing(0.42, 0, 1, 1);
    case 'ease-out':
      return cubicBezierEasing(0, 0, 0.58, 1);
    case 'bezier':
      return cubicBezierEasing(bezier?.[0] ?? 0.25, bezier?.[1] ?? 0.1, bezier?.[2] ?? 0.25, bezier?.[3] ?? 1);
    default:
      return (t) => clamp01(t);
  }
}

/** Interpolated value of one property at a clip-local time (seconds). */
export function valueAtKeyframes(
  keyframes: Keyframe[],
  property: string,
  time: number,
  fallback: number,
): number {
  const list = keyframes
    .filter((k) => k.property === property)
    .sort((a, b) => a.time - b.time);
  if (list.length === 0) return fallback;
  if (time <= list[0].time) return list[0].value;
  const last = list[list.length - 1];
  if (time >= last.time) return last.value;
  for (let i = 0; i < list.length - 1; i += 1) {
    const a = list[i];
    const b = list[i + 1];
    if (time >= a.time && time <= b.time) {
      const span = b.time - a.time || 1;
      const raw = (time - a.time) / span;
      const eased = easingFunction(b.easing, b.bezier)(raw);
      return a.value + (b.value - a.value) * eased;
    }
  }
  return fallback;
}

export function addKeyframe(keyframes: Keyframe[], property: string, time: number, value: number, easing: Easing = 'linear'): Keyframe[] {
  const existing = keyframes.find((k) => k.property === property && Math.abs(k.time - time) < 0.001);
  if (existing) {
    return keyframes.map((k) => (k.id === existing.id ? { ...k, easing, value } : k));
  }
  return [...keyframes, { bezier: undefined, easing, id: newId('kf'), property, time: Math.max(0, time), value }].sort(
    (a, b) => a.time - b.time || a.property.localeCompare(b.property),
  );
}

export function removeKeyframe(keyframes: Keyframe[], id: string): Keyframe[] {
  return keyframes.filter((k) => k.id !== id);
}

export function updateKeyframe(keyframes: Keyframe[], id: string, patch: Partial<Keyframe>): Keyframe[] {
  return keyframes.map((k) => (k.id === id ? { ...k, ...patch } : k));
}

/** In/out/combo animation presets (SPEC D). Returns opacity/scale/offset multipliers at a clip-local time. */
export interface AnimationState {
  offsetX: number;
  offsetY: number;
  opacity: number;
  rotation: number;
  scale: number;
}

const KIND_OFFSETS: Record<string, { x: number; y: number }> = {
  'slide-left': { x: -1, y: 0 },
  'slide-right': { x: 1, y: 0 },
  'slide-up': { x: 0, y: -1 },
  'slide-down': { x: 0, y: 1 },
};

export function animationState(
  kind: string,
  duration: number,
  localTime: number,
  clipDuration: number,
  phase: 'in' | 'out',
): AnimationState {
  const base: AnimationState = { offsetX: 0, offsetY: 0, opacity: 1, rotation: 0, scale: 1 };
  if (kind === 'none' || duration <= 0) return base;
  const t = phase === 'in' ? clamp01(localTime / duration) : clamp01((clipDuration - localTime) / duration);
  // `t` = 1 means animation fully settled; 0 means fully in the animated start/end state.
  const eased = 1 - (1 - t) * (1 - t); // ease-out
  const settle = phase === 'in' ? eased : eased;
  if (kind === 'fade') return { ...base, opacity: settle };
  if (kind.startsWith('slide-')) {
    const off = KIND_OFFSETS[kind] ?? { x: 0, y: 0 };
    return { ...base, offsetX: off.x * (1 - settle) * 100, offsetY: off.y * (1 - settle) * 100, opacity: 0.4 + 0.6 * settle };
  }
  if (kind === 'zoom-in') return { ...base, opacity: settle, scale: 0.5 + 0.5 * settle };
  if (kind === 'zoom-out') return { ...base, opacity: settle, scale: 1.5 - 0.5 * settle };
  if (kind === 'spin') return { ...base, opacity: settle, rotation: (1 - settle) * 360, scale: 0.6 + 0.4 * settle };
  if (kind === 'bounce') {
    const b = Math.abs(Math.sin(settle * Math.PI * 2)) * (1 - settle);
    return { ...base, offsetY: -b * 40, scale: 1 + b * 0.15 };
  }
  if (kind === 'pop') return { ...base, opacity: settle, scale: 0.2 + 0.8 * settle };
  // Phase 5 (Section N): 20 more original in/out kinds.
  if (kind === 'rise') return { ...base, offsetY: (1 - settle) * 60, opacity: settle };
  if (kind === 'drop') return { ...base, offsetY: -(1 - settle) * 60, opacity: settle };
  if (kind === 'flip-x') return { ...base, opacity: settle, scale: Math.abs(Math.cos((1 - settle) * Math.PI * 0.5)) * 0.9 + 0.1 };
  if (kind === 'flip-y') return { ...base, opacity: settle, rotation: (1 - settle) * 180 };
  if (kind === 'roll') return { ...base, offsetX: (1 - settle) * 120, rotation: (1 - settle) * 360 };
  if (kind === 'swing') return { ...base, opacity: settle, rotation: (1 - settle) * 45 * (settle < 0.5 ? 1 : -1) };
  if (kind === 'elastic') {
    const e = settle === 1 ? 1 : Math.pow(2, -10 * settle) * Math.sin((settle * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
    return { ...base, opacity: settle, scale: 0.3 + 0.7 * e };
  }
  if (kind === 'blur') return { ...base, opacity: settle, scale: 1.1 - 0.1 * settle };
  if (kind === 'slide-diagonal') return { ...base, offsetX: (1 - settle) * 80, offsetY: (1 - settle) * 50, opacity: 0.3 + 0.7 * settle };
  if (kind === 'zoom-rotate') return { ...base, opacity: settle, rotation: (1 - settle) * 120, scale: 0.4 + 0.6 * settle };
  if (kind === 'skew') return { ...base, offsetX: (1 - settle) * 60, rotation: (1 - settle) * 12, scale: 0.8 + 0.2 * settle };
  if (kind === 'heartbeat') {
    const beat = Math.abs(Math.sin(settle * Math.PI * 2)) * (1 - settle * 0.5);
    return { ...base, opacity: settle, scale: 1 + beat * 0.25 };
  }
  if (kind === 'jitter') return { ...base, opacity: settle, offsetX: (settle < 1 ? (Math.sin(settle * 40) * 4 * (1 - settle)) : 0) };
  if (kind === 'float-up') return { ...base, offsetY: (1 - settle) * 30, opacity: 0.5 + 0.5 * settle, scale: 0.95 + 0.05 * settle };
  if (kind === 'scale-x') return { ...base, opacity: settle, scale: 0.1 + 0.9 * settle };
  if (kind === 'scale-y') return { ...base, offsetY: (1 - settle) * 20, opacity: settle, scale: 0.1 + 0.9 * settle };
  if (kind === 'rotate') return { ...base, opacity: settle, rotation: (1 - settle) * 90 };
  if (kind === 'rubber') {
    const r = 1 + 0.25 * Math.sin(settle * Math.PI * 2) * (1 - settle);
    return { ...base, opacity: settle, scale: r };
  }
  if (kind === 'wobble') return { ...base, offsetX: Math.sin(settle * Math.PI * 3) * 12 * (1 - settle), rotation: Math.sin(settle * Math.PI * 3) * 6 * (1 - settle) };
  if (kind === 'sway') return { ...base, offsetX: Math.sin(settle * Math.PI) * 20 * (1 - settle), rotation: Math.sin(settle * Math.PI) * 8 * (1 - settle) };
  return base;
}

/** Combined in + out animation state at a clip-local time. */
export function combinedAnimationState(
  animIn: { duration: number; kind: string },
  animOut: { duration: number; kind: string },
  localTime: number,
  clipDuration: number,
): AnimationState {
  const sIn = animationState(animIn.kind, animIn.duration, localTime, clipDuration, 'in');
  const sOut = animationState(animOut.kind, animOut.duration, localTime, clipDuration, 'out');
  return {
    offsetX: sIn.offsetX + sOut.offsetX,
    offsetY: sIn.offsetY + sOut.offsetY,
    opacity: Math.min(sIn.opacity, sOut.opacity),
    rotation: sIn.rotation + sOut.rotation,
    scale: sIn.scale * sOut.scale,
  };
}
