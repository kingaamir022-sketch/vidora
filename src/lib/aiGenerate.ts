/**
 * In-browser AI generation (Phase 6, Section O — O-AI-GENERATE).
 * The Generate tab of the AI Library: prompt -> seeded local generation,
 * no sign-in, no credits, nothing uploaded.
 *  - AI music: seeded pattern (same spec as the offline renderer) rendered
 *    with OfflineAudioContext -> WAV.
 *  - AI image: procedural scene painted on canvas -> PNG data URL.
 *  - AI video: animated procedural scene on canvas, captured with
 *    MediaRecorder -> WebM (3 s, 720p).
 *  - AI dialogue scene: image + two caption lines + a narration clip
 *    (the panel wires the store actions).
 * Same prompt always generates the same results (seeded from the prompt
 * text), so re-running a prompt is deterministic.
 */
import { renderAiTrack, type AiTrackPattern, type RenderedOriginal } from './audio';
import { AI_VOICES, type AiVoicePreset } from './voices';

export type AiGenerateType = 'dialogue' | 'image' | 'music' | 'video';

export const AI_GENERATE_TYPES: { id: AiGenerateType; label: string; model: string }[] = [
  { id: 'image', label: 'AI image', model: 'Vidora Canvas' },
  { id: 'video', label: 'AI video', model: 'Vidora Motion' },
  { id: 'music', label: 'AI music', model: 'Vidora Synth' },
  { id: 'dialogue', label: 'AI dialogue scene', model: 'Vidora Canvas' },
];

/** FNV-1a hash of the prompt text -> stable seed. */
export function seedFromPrompt(prompt: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < prompt.length; i += 1) {
    h ^= prompt.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface PromptKeywords {
  bpm: number;
  mood: string;
  palette: [string, string, string];
  style: string;
  tempo: 'fast' | 'medium' | 'slow';
}

const PALETTES: Record<string, [string, string, string]> = {
  ocean: ['#0c4a6e', '#38bdf8', '#e0f2fe'],
  sunset: ['#7c2d12', '#fb923c', '#fde68a'],
  neon: ['#1e1b4b', '#ec4899', '#22d3ee'],
  forest: ['#14532d', '#22c55e', '#d9f99d'],
  city: ['#18181b', '#f59e0b', '#fde68a'],
  space: ['#020617', '#8b5cf6', '#f472b6'],
  rain: ['#0f172a', '#64748b', '#bae6fd'],
  warm: ['#451a03', '#f59e0b', '#fde68a'],
  dreamy: ['#1e1b4b', '#a78bfa', '#f0abfc'],
  calm: ['#0f172a', '#38bdf8', '#e0f2fe'],
  happy: ['#78350f', '#facc15', '#fde68a'],
  dark: ['#09090b', '#3f3f46', '#a1a1aa'],
  epic: ['#450a0a', '#ef4444', '#fbbf24'],
  default: ['#1e1b4b', '#7c3aed', '#06b6d4'],
};

const KEYWORD_MAP: { key: string; palette: string; style: string; tempo: 'fast' | 'medium' | 'slow' }[] = [
  { key: 'ocean', palette: 'ocean', style: 'Ambient', tempo: 'slow' },
  { key: 'sea', palette: 'ocean', style: 'Ambient', tempo: 'slow' },
  { key: 'sunset', palette: 'sunset', style: 'Cinematic', tempo: 'slow' },
  { key: 'neon', palette: 'neon', style: 'Synthwave', tempo: 'fast' },
  { key: 'forest', palette: 'forest', style: 'Acoustic', tempo: 'medium' },
  { key: 'city', palette: 'city', style: 'Electronic', tempo: 'fast' },
  { key: 'space', palette: 'space', style: 'Ambient', tempo: 'slow' },
  { key: 'rain', palette: 'rain', style: 'Lo-Fi', tempo: 'slow' },
  { key: 'warm', palette: 'warm', style: 'Acoustic', tempo: 'medium' },
  { key: 'dream', palette: 'dreamy', style: 'Chillwave', tempo: 'medium' },
  { key: 'calm', palette: 'calm', style: 'Ambient', tempo: 'slow' },
  { key: 'happy', palette: 'happy', style: 'Corporate', tempo: 'medium' },
  { key: 'dark', palette: 'dark', style: 'Minimal', tempo: 'slow' },
  { key: 'epic', palette: 'epic', style: 'Epic', tempo: 'fast' },
  { key: 'party', palette: 'neon', style: 'Dance', tempo: 'fast' },
  { key: 'fast', palette: 'neon', style: 'Dance', tempo: 'fast' },
  { key: 'slow', palette: 'calm', style: 'Ambient', tempo: 'slow' },
];

/** Map a prompt to a style/palette/tempo (first matching keyword wins). */
export function keywordsFor(prompt: string): PromptKeywords {
  const lower = prompt.toLowerCase();
  for (const m of KEYWORD_MAP) {
    if (lower.includes(m.key)) {
      return {
        bpm: m.tempo === 'fast' ? 128 : m.tempo === 'medium' ? 96 : 80,
        mood: m.key,
        palette: PALETTES[m.palette],
        style: m.style,
        tempo: m.tempo,
      };
    }
  }
  return { bpm: 96, mood: 'original', palette: PALETTES.default, style: 'Chillwave', tempo: 'medium' };
}

const STYLE_TABLE: Record<string, { drums: AiTrackPattern['drums']; bass: AiTrackPattern['bass']; pad: boolean; arp: boolean; melody: boolean; energy: number; scale: number[]; progression: number[] }> = {
  Ambient: { arp: false, bass: 'off', drums: 'none', energy: 0.25, melody: true, pad: true, progression: [0, 5, 7, 3], scale: [0, 2, 4, 7, 9] },
  'Lo-Fi': { arp: true, bass: 'walk', drums: 'soft', energy: 0.45, melody: true, pad: true, progression: [0, -4, 3, 7], scale: [0, 3, 5, 7, 10] },
  Cinematic: { arp: false, bass: 'root', drums: 'soft', energy: 0.6, melody: true, pad: true, progression: [0, -4, -2, 7], scale: [0, 2, 3, 5, 7, 8, 10] },
  Electronic: { arp: true, bass: 'root', drums: 'four', energy: 0.75, melody: true, pad: false, progression: [0, 5, 7, 5], scale: [0, 2, 4, 5, 7, 9, 11] },
  Acoustic: { arp: false, bass: 'root', drums: 'soft', energy: 0.5, melody: true, pad: false, progression: [0, 5, -4, 7], scale: [0, 2, 4, 5, 7, 9, 11] },
  Corporate: { arp: true, bass: 'root', drums: 'four', energy: 0.65, melody: true, pad: true, progression: [0, 5, 7, -4], scale: [0, 2, 4, 5, 7, 9, 11] },
  Chillwave: { arp: true, bass: 'walk', drums: 'soft', energy: 0.5, melody: true, pad: true, progression: [0, 3, -4, 5], scale: [0, 2, 3, 5, 7, 8, 10] },
  Synthwave: { arp: true, bass: 'root', drums: 'four', energy: 0.7, melody: false, pad: true, progression: [0, -4, 5, 7], scale: [0, 2, 3, 5, 7, 8, 10] },
  Epic: { arp: false, bass: 'root', drums: 'four', energy: 0.85, melody: true, pad: true, progression: [0, 7, -4, 5], scale: [0, 2, 3, 5, 7, 8, 10] },
  Minimal: { arp: false, bass: 'off', drums: 'none', energy: 0.2, melody: true, pad: true, progression: [0, 7, 5, 3], scale: [0, 2, 4, 7, 9] },
  Dance: { arp: true, bass: 'root', drums: 'four', energy: 0.8, melody: true, pad: false, progression: [0, -4, 7, 5], scale: [0, 2, 4, 5, 7, 9, 11] },
};

const KEYS = [60, 57, 55, 52, 62, 59, 53, 50];

/** Build a deterministic track pattern from a prompt + variation index. */
export function patternForPrompt(prompt: string, index: number): { bpm: number; duration: number; pattern: AiTrackPattern; seed: number; style: string } {
  const kw = keywordsFor(prompt);
  const table = STYLE_TABLE[kw.style] ?? STYLE_TABLE.Chillwave;
  const seed = (seedFromPrompt(prompt) + index * 7919) >>> 0;
  const bpm = kw.bpm;
  const duration = 15;
  const bars = Math.round((duration * bpm) / 240);
  return {
    bpm,
    duration,
    pattern: {
      arp: table.arp,
      bars,
      bass: table.bass,
      drums: table.drums,
      energy: table.energy,
      melody: table.melody,
      pad: table.pad,
      progression: table.progression,
      rootMidi: KEYS[seed % KEYS.length],
      scale: table.scale,
    },
    seed,
    style: kw.style,
  };
}

/** Generate `count` music tracks from a prompt (WAV blobs). */
export async function generateMusic(prompt: string, count: number): Promise<(RenderedOriginal & { name: string; style: string })[]> {
  const out: (RenderedOriginal & { name: string; style: string })[] = [];
  for (let i = 0; i < count; i += 1) {
    const { bpm, duration, pattern, seed, style } = patternForPrompt(prompt, i);
    const rendered = await renderAiTrack(pattern, bpm, duration, seed);
    out.push({ ...rendered, name: `${keywordsFor(prompt).style} ${i + 1} — "${prompt.trim().slice(0, 24)}"`, style });
  }
  return out;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Paint a procedural scene on a canvas (shared by image + video gen). */
export function paintAiScene(ctx: CanvasRenderingContext2D, w: number, h: number, palette: [string, string, string], seed: number, t: number): void {
  const [c1, c2, c3] = palette.map(hexToRgb);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, `rgb(${c1[0]},${c1[1]},${c1[2]})`);
  g.addColorStop(0.55, `rgb(${c2[0]},${c2[1]},${c2[2]})`);
  g.addColorStop(1, `rgb(${c3[0]},${c3[1]},${c3[2]})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Seeded soft blobs drifting with time.
  let s = seed;
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 9; i += 1) {
    const bx = ((rnd() + t * 0.02 * (i % 3 + 1)) % 1.2) * w - 0.1 * w;
    const by = rnd() * h;
    const r = (0.12 + rnd() * 0.2) * w;
    const grad = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    grad.addColorStop(0, `rgba(255,255,255,${0.16 + rnd() * 0.12})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Sine bands.
  ctx.lineWidth = Math.max(8, h * 0.03);
  for (let b = 0; b < 4; b += 1) {
    ctx.strokeStyle = `rgba(255,255,255,${0.14 - b * 0.02})`;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 16) {
      const y = h * (0.2 + b * 0.2) + Math.sin((x / w) * Math.PI * 2 + t * 0.6 + b) * h * 0.08;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** Generate one AI image from a prompt -> PNG data URL (1280x720). */
export function generateImage(prompt: string, index = 0): string | null {
  if (typeof document === 'undefined') return null;
  const kw = keywordsFor(prompt);
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  paintAiScene(ctx, 1280, 720, kw.palette, (seedFromPrompt(prompt) + index * 7919) >>> 0, index * 1.7);
  return canvas.toDataURL('image/png');
}

export interface GeneratedClip {
  blob: Blob;
  duration: number;
  url: string;
}

/** Generate one AI video clip from a prompt -> WebM (3 s, 720p, realtime). */
export async function generateClip(prompt: string, index = 0): Promise<GeneratedClip | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  if (!ctx || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') return null;
  const kw = keywordsFor(prompt);
  const seed = (seedFromPrompt(prompt) + index * 7919) >>> 0;
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
  });
  const start = performance.now();
  const durationMs = 3000;
  recorder.start(250);
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      paintAiScene(ctx, 1280, 720, kw.palette, seed, t);
      if (performance.now() - start < durationMs) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
  recorder.stop();
  const blob = await done;
  return { blob, duration: 3, url: URL.createObjectURL(blob) };
}

/** Build a dialogue scene from a prompt: image + two lines + a voice.
 * The panel creates the image clip, the caption cues and the narration
 * clip from this spec. Lines are original sentences derived from the
 * prompt keywords (no copied dialogue). */
export function dialogueSceneFor(prompt: string): { image: string | null; lines: [string, string]; voice: AiVoicePreset } {
  const kw = keywordsFor(prompt);
  const topic = prompt.trim().slice(0, 40) || 'a quiet morning';
  const lines: [string, string] = [
    `A: Have you seen ${topic} today? It looks wonderful.`,
    `B: Yes! Let us go and enjoy ${topic} together.`,
  ];
  const voice = AI_VOICES.find((v) => v.lang === 'English' && v.role === 'Warm') ?? AI_VOICES[0];
  void kw;
  return { image: generateImage(prompt, 0), lines, voice };
}
