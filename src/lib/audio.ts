/**
 * Phase 4 (Section J) — audio math, voice presets, procedural originals,
 * voiceover recording and preview playback.
 *
 * Pure functions here are unit-tested (src/test/audio.test.ts). Anything
 * that touches Web Audio is guarded so the module imports safely in Node
 * (tests) — the live engine lives in src/lib/audioEngine.ts.
 */
import { valueAtKeyframes } from './keyframes';
import { peaksFromSamples } from './media';
import type { AudioRole, Clip, EqSettings, Keyframe, Track, VidoraProject } from '../schema/project';

/** dB → linear gain. */
export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

/** Linear gain → dB (−Infinity at silence). */
export function gainToDb(gain: number): number {
  return gain <= 0 ? Number.NEGATIVE_INFINITY : 20 * Math.log10(gain);
}

/** Human dB readout for a gain: "0 dB", "+3.5 dB", "−6.0 dB", "−∞ dB". */
export function formatDb(gain: number): string {
  if (gain <= 0) return '−∞ dB';
  const db = gainToDb(gain);
  if (Math.abs(db) < 0.05) return '0 dB';
  return `${db > 0 ? '+' : '−'}${Math.abs(db).toFixed(1)} dB`;
}

/**
 * Fade gain at a clip-local time (linear ramps, matching the behaviour
 * card J-INSPECTOR). Fades longer than the clip clamp to the clip length.
 */
export function fadeGainAt(localTime: number, duration: number, fadeIn: number, fadeOut: number): number {
  const fi = Math.min(Math.max(0, fadeIn), duration);
  const fo = Math.min(Math.max(0, fadeOut), duration);
  let g = 1;
  if (fi > 0 && localTime < fi) g = localTime / fi;
  if (fo > 0 && localTime > duration - fo) g = Math.min(g, (duration - localTime) / fo);
  return Math.min(1, Math.max(0, g));
}

/** Volume keyframe value at a clip-local time (falls back to clip.volume). */
export function keyframeVolumeAt(clip: Pick<Clip, 'keyframes' | 'volume'>, localTime: number): number {
  return valueAtKeyframes(clip.keyframes, 'volume', localTime, clip.volume ?? 1);
}

/**
 * Track audibility (J-MIXER): if any track is soloed, a track sounds only
 * when it is soloed and not muted; otherwise it sounds when not muted.
 * Hidden tracks are silent (same as hidden video tracks in the preview).
 */
export function isTrackAudible(track: Pick<Track, 'hidden' | 'muted' | 'solo'>, soloActive: boolean): boolean {
  if (track.hidden) return false;
  if (soloActive) return track.solo && !track.muted;
  return !track.muted;
}

/** Duck factor for a clip role: Music drops while any Voice is sounding. */
export function duckFactorFor(role: AudioRole, anyVoiceActive: boolean, ducking: boolean, duckAmountDb: number): number {
  if (role === 'music' && anyVoiceActive && ducking) return dbToGain(-duckAmountDb);
  return 1;
}

export interface EffectiveGainInput {
  clip: Pick<Clip, 'audioRole' | 'duration' | 'fadeIn' | 'fadeOut' | 'keyframes' | 'muted' | 'reversed' | 'volume'>;
  localTime: number;
  track: Pick<Track, 'hidden' | 'muted' | 'solo' | 'volume'>;
  soloActive: boolean;
  masterVolume: number;
  anyVoiceActive: boolean;
  ducking: boolean;
  duckAmountDb: number;
}

/**
 * The full per-clip gain at one moment (J-INSPECTOR + J-MIXER):
 * keyframed volume × fade × clip mute × track volume × track audibility
 * × master volume × duck factor. Reversed clips are silent (media
 * elements cannot play reversed audio).
 */
export function effectiveClipGain(input: EffectiveGainInput): number {
  const { clip, localTime, track, soloActive, masterVolume, anyVoiceActive, ducking, duckAmountDb } = input;
  if (clip.reversed) return 0;
  if (clip.muted) return 0;
  if (!isTrackAudible(track, soloActive)) return 0;
  const volume = keyframeVolumeAt(clip, localTime);
  const fade = fadeGainAt(localTime, clip.duration, clip.fadeIn ?? 0, clip.fadeOut ?? 0);
  const duck = duckFactorFor(clip.audioRole ?? 'music', anyVoiceActive, ducking, duckAmountDb);
  return volume * fade * (track.volume ?? 1) * masterVolume * duck;
}

/**
 * Gain multiplier that normalises a clip so its peak hits targetDb
 * (default −1 dBFS), clamped to the 0–2 volume range. Returns null when
 * the peak level is unknown or the file is silent.
 */
export function normalizeGain(peakLevel: number | undefined, targetDb = -1): number | null {
  if (peakLevel === undefined || peakLevel <= 0) return null;
  return Math.min(2, dbToGain(targetDb) / peakLevel);
}

/** Project-level wrapper: derives solo/ducking/master from the project
 * at the given timeline time. A "voice" clip counts as active only while
 * it is actually under the playhead and audible. */
export function effectiveClipGainForProject(clip: Clip, track: Track, project: VidoraProject, time: number): number {
  const soloActive = project.tracks.some((t) => t.solo);
  const anyVoiceActive = project.tracks.some((t) => {
    if (!isTrackAudible(t, soloActive)) return false;
    return t.clips.some(
      (c) => c.audioRole === 'voice' && !c.muted && !c.reversed && time >= c.start && time < c.start + c.duration,
    );
  });
  return effectiveClipGain({
    anyVoiceActive,
    clip,
    duckAmountDb: project.mixer?.duckAmountDb ?? 12,
    ducking: project.mixer?.ducking ?? false,
    localTime: Math.max(0, time - clip.start),
    masterVolume: project.mixer?.masterVolume ?? 1,
    soloActive,
    track,
  });
}

/**
 * Beat detection from waveform peaks (J-BEAT): energy onsets above
 * mean + 1 standard deviation, minimum 0.25 s apart, edges dropped.
 * Honest estimate — not true BPM analysis.
 */
export function detectBeats(peaks: number[], duration: number): { times: number[]; bpm: number | null } {
  if (!peaks || peaks.length < 8 || duration < 2) return { bpm: null, times: [] };
  const bucket = duration / peaks.length;
  const diffs = peaks.map((p, i) => (i === 0 ? 0 : Math.max(0, p - peaks[i - 1])));
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const variance = diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / diffs.length;
  const threshold = mean + Math.sqrt(variance);
  const minGap = Math.max(1, Math.ceil(0.25 / bucket));
  const times: number[] = [];
  let last = -minGap;
  for (let i = 1; i < diffs.length; i += 1) {
    if (diffs[i] > threshold && i - last >= minGap) {
      const t = (i + 0.5) * bucket;
      if (t > 0.1 && t < duration - 0.1) {
        times.push(t);
        last = i;
      }
    }
  }
  let bpm: number | null = null;
  if (times.length >= 2) {
    const gaps = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)];
    if (median > 0) bpm = Math.round(60 / median);
  }
  return { bpm, times };
}

// ---------------------------------------------------------------------------
// Voice changer presets (J-VOICE) — original names, real Web Audio chains.
// ---------------------------------------------------------------------------

export interface VoicePreset {
  /** Pitch shift in semitones (modulated-delay shifter, may artifact). */
  semitones?: number;
  /** Bandpass [low, high] Hz. */
  bandpass?: [number, number];
  /** Gentle dynamics compression. */
  compress?: boolean;
  /** Echo: delay time, feedback, wet level. */
  delay?: { feedback: number; time: number; wet: number };
  /** Amplitude-modulation rate in Hz (robot effect). */
  amRate?: number;
  /** Extra EQ on top of the clip EQ. */
  eq?: Partial<EqSettings>;
  id: string;
  name: string;
  blurb: string;
}

export const VOICE_PRESETS: VoicePreset[] = [
  { blurb: 'No processing.', id: 'none', name: 'None' },
  { blurb: 'Lower pitch, same tempo.', id: 'deep', name: 'Deep Voice', semitones: -4 },
  { blurb: 'Higher pitch, same tempo.', id: 'bright', name: 'Bright Voice', semitones: 6 },
  { blurb: 'Broadcast sound: bandpass + compression.', bandpass: [300, 3400], compress: true, id: 'radio', name: 'Radio Booth' },
  { blurb: 'Narrow phone-line sound.', bandpass: [300, 3400], id: 'telephone', name: 'Telephone' },
  { blurb: 'Spacious echo.', delay: { feedback: 0.35, time: 0.28, wet: 0.4 }, id: 'echo', name: 'Cave Echo' },
  { blurb: 'Metallic amplitude-modulated voice.', amRate: 30, id: 'robot', name: 'Robot' },
  { blurb: 'Warm low boost + gentle compression.', compress: true, eq: { high: -1, low: 4, mid: 0 }, id: 'warm', name: 'Warm Studio' },
];

export function voicePreset(id: string | undefined): VoicePreset {
  return VOICE_PRESETS.find((p) => p.id === id) ?? VOICE_PRESETS[0];
}

// ---------------------------------------------------------------------------
// WAV encoding (16-bit PCM mono) — used for rendered originals.
// ---------------------------------------------------------------------------

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

// ---------------------------------------------------------------------------
// Vidora Originals (J-AUDIO) — procedural music loops + SFX, synthesized
// in-browser with Web Audio. All names and sounds are original; nothing
// is copied from the reference. Phase 5 expands this seed library.
// ---------------------------------------------------------------------------

export interface OriginalRecipe {
  id: string;
  name: string;
  kind: 'music' | 'sfx';
  category: string;
  tags: string[];
  duration: number;
  bpm?: number;
  render: (ctx: OfflineAudioContext) => void;
}

export interface RenderedOriginal {
  blob: Blob;
  url: string;
  duration: number;
  peaks: number[];
  peakLevel: number;
}

function osc(
  ctx: OfflineAudioContext,
  opts: { type: OscillatorType; freq: number; freqEnd?: number; at: number; dur: number; gain: number; attack?: number },
): void {
  const o = ctx.createOscillator();
  o.type = opts.type;
  o.frequency.setValueAtTime(opts.freq, opts.at);
  if (opts.freqEnd !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), opts.at + opts.dur);
  const g = ctx.createGain();
  const attack = opts.attack ?? 0.01;
  g.gain.setValueAtTime(0, opts.at);
  g.gain.linearRampToValueAtTime(opts.gain, opts.at + attack);
  g.gain.setValueAtTime(opts.gain, opts.at + Math.max(attack, opts.dur - 0.05));
  g.gain.linearRampToValueAtTime(0, opts.at + opts.dur);
  o.connect(g).connect(ctx.destination);
  o.start(opts.at);
  o.stop(opts.at + opts.dur + 0.05);
}

function pad(
  ctx: OfflineAudioContext,
  freqs: number[],
  at: number,
  dur: number,
  gain: number,
): void {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.4);
  g.gain.setValueAtTime(gain, at + dur - 0.4);
  g.gain.linearRampToValueAtTime(0, at + dur);
  filter.connect(g).connect(ctx.destination);
  for (const f of freqs) {
    for (const detune of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = detune;
      o.connect(filter);
      o.start(at);
      o.stop(at + dur);
    }
  }
}

function noise(
  ctx: OfflineAudioContext,
  opts: { at: number; dur: number; gain: number; filterType: BiquadFilterType; freq: number; freqEnd?: number; q?: number },
): void {
  const len = Math.max(1, Math.floor(ctx.sampleRate * opts.dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = opts.filterType;
  filter.frequency.setValueAtTime(opts.freq, opts.at);
  if (opts.freqEnd !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(10, opts.freqEnd), opts.at + opts.dur);
  filter.Q.value = opts.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, opts.at);
  g.gain.linearRampToValueAtTime(opts.gain, opts.at + 0.02);
  g.gain.linearRampToValueAtTime(0, opts.at + opts.dur);
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(opts.at);
}

const AM = [220, 261.63, 329.63]; // A minor
const FM = [174.61, 220, 261.63]; // F major
const CM = [261.63, 329.63, 392]; // C major
const GM = [196, 246.94, 293.66]; // G major

export const ORIGINAL_LOOPS: OriginalRecipe[] = [
  {
    bpm: 80,
    category: 'Ambient',
    duration: 8,
    id: 'loop-calm-pad',
    kind: 'music',
    name: 'Calm Pad',
    render: (ctx) => {
      pad(ctx, AM, 0, 2, 0.16);
      pad(ctx, FM, 2, 2, 0.16);
      pad(ctx, CM, 4, 2, 0.16);
      pad(ctx, GM, 6, 2, 0.16);
    },
    tags: ['ambient', 'calm', 'pad', 'slow'],
  },
  {
    bpm: 100,
    category: 'Electronic',
    duration: 8,
    id: 'loop-soft-pulse',
    kind: 'music',
    name: 'Soft Pulse',
    render: (ctx) => {
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        for (let i = 0; i < 4; i += 1) {
          osc(ctx, { at: t0 + i * 0.5, dur: 0.22, freq: 55, gain: 0.5, type: 'sine' });
          if (i % 2 === 1) noise(ctx, { at: t0 + i * 0.5, dur: 0.05, filterType: 'highpass', freq: 6000, gain: 0.08 });
        }
        osc(ctx, { at: t0, dur: 0.5, freq: 220, gain: 0.08, type: 'triangle' });
        osc(ctx, { at: t0 + 1, dur: 0.5, freq: 277.18, gain: 0.08, type: 'triangle' });
      }
    },
    tags: ['electronic', 'pulse', 'beat', 'bass'],
  },
  {
    bpm: 96,
    category: 'Electronic',
    duration: 8,
    id: 'loop-night-drive',
    kind: 'music',
    name: 'Night Drive',
    render: (ctx) => {
      const notes = [220, 261.63, 329.63, 392, 329.63, 261.63, 246.94, 293.66];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        for (let i = 0; i < 8; i += 1) {
          osc(ctx, { at: t0 + i * 0.25, dur: 0.2, freq: notes[i], gain: 0.12, type: 'square' });
        }
        osc(ctx, { at: t0, dur: 1.8, freq: 55, gain: 0.35, type: 'sine' });
      }
    },
    tags: ['electronic', 'night', 'arp', 'synth'],
  },
  {
    bpm: 112,
    category: 'Pop',
    duration: 8,
    id: 'loop-morning-light',
    kind: 'music',
    name: 'Morning Light',
    render: (ctx) => {
      const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 783.99, 1046.5];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        pad(ctx, CM, t0, 2, 0.08);
        for (let i = 0; i < 8; i += 1) {
          osc(ctx, { at: t0 + i * 0.25, dur: 0.18, freq: notes[i], gain: 0.14, type: 'triangle' });
        }
      }
    },
    tags: ['pop', 'bright', 'pluck', 'happy'],
  },
  {
    bpm: 60,
    category: 'Ambient',
    duration: 8,
    id: 'loop-deep-focus',
    kind: 'music',
    name: 'Deep Focus',
    render: (ctx) => {
      pad(ctx, [110, 164.81, 220], 0, 8, 0.14);
      for (let i = 0; i < 4; i += 1) {
        osc(ctx, { attack: 0.3, at: i * 2 + 0.5, dur: 1.2, freq: 440, gain: 0.05, type: 'sine' });
      }
    },
    tags: ['ambient', 'focus', 'drone', 'slow'],
  },
  {
    bpm: 70,
    category: 'Ambient',
    duration: 8,
    id: 'loop-gentle-rain',
    kind: 'music',
    name: 'Gentle Rain',
    render: (ctx) => {
      noise(ctx, { at: 0, dur: 8, filterType: 'bandpass', freq: 1200, gain: 0.05, q: 0.6 });
      const notes = [392, 523.25, 440, 587.33];
      for (let i = 0; i < 8; i += 1) {
        osc(ctx, { at: 0.4 + i * 0.95, dur: 0.5, freq: notes[i % 4], gain: 0.07, type: 'sine' });
      }
    },
    tags: ['ambient', 'rain', 'soft', 'nature'],
  },
];

export const ORIGINAL_SFX: OriginalRecipe[] = [
  {
    category: 'Interface',
    duration: 0.3,
    id: 'sfx-pop',
    kind: 'sfx',
    name: 'Soft Pop',
    render: (ctx) => osc(ctx, { at: 0, dur: 0.25, freq: 600, freqEnd: 200, gain: 0.5, type: 'sine' }),
    tags: ['pop', 'click', 'ui'],
  },
  {
    category: 'Whoosh',
    duration: 0.8,
    id: 'sfx-whoosh',
    kind: 'sfx',
    name: 'Air Whoosh',
    render: (ctx) => noise(ctx, { at: 0, dur: 0.8, filterType: 'bandpass', freq: 400, freqEnd: 4000, gain: 0.4, q: 1.5 }),
    tags: ['whoosh', 'sweep', 'transition'],
  },
  {
    category: 'Bell',
    duration: 1.2,
    id: 'sfx-chime',
    kind: 'sfx',
    name: 'Bright Chime',
    render: (ctx) => {
      for (const [f, g] of [[880, 0.35], [1318.5, 0.2], [1760, 0.12]] as const) {
        osc(ctx, { at: 0, dur: 1.1, freq: f, gain: g, type: 'sine' });
      }
    },
    tags: ['chime', 'bell', 'notification'],
  },
  {
    category: 'Impact',
    duration: 0.5,
    id: 'sfx-thud',
    kind: 'sfx',
    name: 'Deep Thud',
    render: (ctx) => {
      osc(ctx, { at: 0, dur: 0.45, freq: 120, freqEnd: 40, gain: 0.7, type: 'sine' });
      noise(ctx, { at: 0, dur: 0.08, filterType: 'lowpass', freq: 300, gain: 0.3 });
    },
    tags: ['thud', 'impact', 'deep'],
  },
  {
    category: 'Interface',
    duration: 0.12,
    id: 'sfx-click',
    kind: 'sfx',
    name: 'Tick Click',
    render: (ctx) => osc(ctx, { at: 0, dur: 0.08, freq: 1200, gain: 0.3, type: 'square' }),
    tags: ['click', 'tick', 'ui'],
  },
  {
    category: 'Magic',
    duration: 0.9,
    id: 'sfx-sparkle',
    kind: 'sfx',
    name: 'Sparkle',
    render: (ctx) => {
      const notes = [1046.5, 1318.5, 1568, 2093, 2637];
      notes.forEach((f, i) => osc(ctx, { at: i * 0.12, dur: 0.3, freq: f, gain: 0.16, type: 'sine' }));
    },
    tags: ['sparkle', 'magic', 'twinkle'],
  },
  {
    category: 'Whoosh',
    duration: 0.7,
    id: 'sfx-sweep',
    kind: 'sfx',
    name: 'Rising Sweep',
    render: (ctx) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(200, 0);
      o.frequency.exponentialRampToValueAtTime(2000, 0.7);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, 0);
      g.gain.linearRampToValueAtTime(0.2, 0.1);
      g.gain.linearRampToValueAtTime(0, 0.7);
      o.connect(filter).connect(g).connect(ctx.destination);
      o.start(0);
      o.stop(0.75);
    },
    tags: ['sweep', 'rise', 'transition'],
  },
  {
    category: 'Interface',
    duration: 0.2,
    id: 'sfx-blip',
    kind: 'sfx',
    name: 'Quick Blip',
    render: (ctx) => osc(ctx, { at: 0, dur: 0.15, freq: 900, gain: 0.35, type: 'sine' }),
    tags: ['blip', 'alert', 'ui'],
  },
];

const renderCache = new Map<string, Promise<RenderedOriginal>>();

/** Render a Vidora Original to a WAV blob (cached per recipe id). */
export function renderOriginal(recipe: OriginalRecipe): Promise<RenderedOriginal> {
  const cached = renderCache.get(recipe.id);
  if (cached) return cached;
  const job = (async (): Promise<RenderedOriginal> => {
    const Ctor =
      typeof window !== 'undefined'
        ? window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
        : undefined;
    if (!Ctor) throw new Error('OfflineAudioContext is not available in this environment.');
    const sampleRate = 44100;
    const ctx = new Ctor(1, Math.max(1, Math.floor(recipe.duration * sampleRate)), sampleRate);
    recipe.render(ctx);
    const buffer = await ctx.startRendering();
    const samples = buffer.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < samples.length; i += 1) peak = Math.max(peak, Math.abs(samples[i]));
    const blob = encodeWav(samples, sampleRate);
    return {
      blob,
      duration: recipe.duration,
      peakLevel: peak,
      peaks: peaksFromSamples(samples, 64),
      url: URL.createObjectURL(blob),
    };
  })();
  renderCache.set(recipe.id, job);
  return job;
}

// ---------------------------------------------------------------------------
// Voiceover recording (J-VOICEOVER) + preview playback (J-AUDIO).
// ---------------------------------------------------------------------------

export type VoiceoverErrorKind = 'denied' | 'unavailable' | 'insecure';

export class VoiceoverError extends Error {
  kind: VoiceoverErrorKind;
  constructor(kind: VoiceoverErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export interface VoiceoverRecorder {
  stream: MediaStream;
  stop: () => Promise<Blob>;
}

/** Request the microphone and return a recorder. Throws VoiceoverError. */
export async function startVoiceoverRecording(): Promise<VoiceoverRecorder> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new VoiceoverError('unavailable', 'Microphone recording is not available in this browser.');
  }
  if (!window.isSecureContext) {
    throw new VoiceoverError('insecure', 'Microphone recording needs a secure (HTTPS or localhost) page.');
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    const name = (e as Error)?.name ?? '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      throw new VoiceoverError('denied', 'Microphone access was denied — allow it in your browser site settings and try again.');
    }
    throw new VoiceoverError('unavailable', 'No microphone was found.');
  }
  const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined;
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  rec.ondataavailable = (ev) => {
    if (ev.data.size > 0) chunks.push(ev.data);
  };
  const stopped = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
    };
  });
  rec.start(250);
  return {
    stream,
    stop: () => {
      if (rec.state !== 'inactive') rec.stop();
      return stopped;
    },
  };
}

let previewEl: HTMLAudioElement | null = null;
let previewSrc: string | null = null;

/**
 * Toggle preview playback of one audio URL (J-AUDIO play buttons).
 * Returns true when playback started, false when it stopped.
 */
export function playPreview(src: string): boolean {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return false;
  if (!previewEl) {
    previewEl = new Audio();
    previewEl.volume = 0.8;
  }
  if (previewSrc === src && !previewEl.paused) {
    previewEl.pause();
    previewSrc = null;
    return false;
  }
  previewEl.src = src;
  previewSrc = src;
  void previewEl.play().catch(() => undefined);
  return true;
}

export function stopPreview(): void {
  if (previewEl) {
    previewEl.pause();
    previewSrc = null;
  }
}

export type { Keyframe };
