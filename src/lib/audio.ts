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

// ---- Phase 5 (Section N): data-driven loop/SFX pattern helpers.
// MIDI note -> frequency. All patterns are original Vidora compositions.
const NOTE = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);
const kick = (ctx: OfflineAudioContext, at: number, gain = 0.6): void => {
  osc(ctx, { at, dur: 0.25, freq: 150, freqEnd: 45, gain, type: 'sine' });
};
const hat = (ctx: OfflineAudioContext, at: number, gain = 0.12, dur = 0.05): void => {
  noise(ctx, { at, dur, filterType: 'highpass', freq: 7000, gain });
};
const snare = (ctx: OfflineAudioContext, at: number, gain = 0.3): void => {
  noise(ctx, { at, dur: 0.15, filterType: 'bandpass', freq: 1800, gain, q: 1 });
  osc(ctx, { at, dur: 0.1, freq: 180, gain: gain * 0.5, type: 'triangle' });
};
const pluck = (ctx: OfflineAudioContext, at: number, midi: number, gain = 0.12, type: OscillatorType = 'triangle'): void => {
  osc(ctx, { at, dur: 0.3, freq: NOTE(midi), gain, type });
};
const bassNote = (ctx: OfflineAudioContext, at: number, midi: number, dur = 0.5, gain = 0.3): void => {
  osc(ctx, { at, dur, freq: NOTE(midi), gain, type: 'sine' });
};
const arpLine = (ctx: OfflineAudioContext, notes: number[], t0: number, step: number, gain = 0.12, type: OscillatorType = 'triangle'): void => {
  notes.forEach((m, i) => pluck(ctx, t0 + i * step, m, gain, type));
};
const chordPad = (ctx: OfflineAudioContext, midis: number[], at: number, dur: number, gain: number): void => {
  pad(ctx, midis.map((m) => NOTE(m)), at, dur, gain);
};

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
  // ---- Phase 5 (Section N): 23 more original loops, 30 total. ----
  {
    bpm: 80, category: 'Ambient', duration: 8, id: 'loop-dawn-chorus', kind: 'music', name: 'Dawn Chorus',
    render: (ctx) => {
      chordPad(ctx, [57, 60, 64], 0, 4, 0.12);
      chordPad(ctx, [53, 57, 60], 4, 4, 0.12);
      arpLine(ctx, [69, 72, 76, 72], 0, 1, 0.07, 'sine');
      arpLine(ctx, [67, 71, 74, 71], 4, 1, 0.07, 'sine');
    },
    tags: ['ambient', 'dawn', 'calm', 'morning'],
  },
  {
    bpm: 120, category: 'Electronic', duration: 8, id: 'loop-city-lights', kind: 'music', name: 'City Lights',
    render: (ctx) => {
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        for (let i = 0; i < 4; i += 1) kick(ctx, t0 + i * 0.5, 0.5);
        for (let i = 0; i < 8; i += 1) hat(ctx, t0 + i * 0.25, 0.08);
        bassNote(ctx, t0, 33, 0.4, 0.35);
        bassNote(ctx, t0 + 1, 36, 0.4, 0.3);
        arpLine(ctx, [69, 72, 76, 79], t0, 0.5, 0.09, 'square');
      }
    },
    tags: ['electronic', 'city', 'night', 'dance'],
  },
  {
    bpm: 120, category: 'Pop', duration: 8, id: 'loop-summer-pop', kind: 'music', name: 'Summer Pop',
    render: (ctx) => {
      const notes = [72, 76, 79, 84, 79, 76, 74, 76];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        chordPad(ctx, [60, 64, 67], t0, 2, 0.08);
        arpLine(ctx, notes, t0, 0.25, 0.11);
        kick(ctx, t0, 0.4);
        kick(ctx, t0 + 1, 0.4);
      }
    },
    tags: ['pop', 'summer', 'bright', 'happy'],
  },
  {
    bpm: 100, category: 'Rock', duration: 8, id: 'loop-guitar-strum', kind: 'music', name: 'Guitar Strum',
    render: (ctx) => {
      const chords = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [55, 59, 62]];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        chords[bar].forEach((m, i) => pluck(ctx, t0 + i * 0.08, m + 12, 0.14, 'triangle'));
        chords[bar].forEach((m, i) => pluck(ctx, t0 + 1 + i * 0.08, m + 12, 0.12, 'triangle'));
        kick(ctx, t0, 0.35);
        snare(ctx, t0 + 1, 0.25);
      }
    },
    tags: ['rock', 'guitar', 'strum', 'acoustic'],
  },
  {
    bpm: 90, category: 'Cinematic', duration: 8, id: 'loop-epic-rise', kind: 'music', name: 'Epic Rise',
    render: (ctx) => {
      chordPad(ctx, [45, 52, 57], 0, 8, 0.14);
      for (let i = 0; i < 8; i += 1) pluck(ctx, i * 1, 69 + i, 0.06 + i * 0.01, 'sawtooth');
      for (let i = 0; i < 4; i += 1) kick(ctx, i * 2, 0.4);
      noise(ctx, { at: 0, dur: 8, filterType: 'bandpass', freq: 300, freqEnd: 3000, gain: 0.03, q: 1 });
    },
    tags: ['cinematic', 'epic', 'rise', 'drama'],
  },
  {
    bpm: 75, category: 'Lo-Fi', duration: 8, id: 'loop-lofi-dusk', kind: 'music', name: 'Lo-Fi Dusk',
    render: (ctx) => {
      noise(ctx, { at: 0, dur: 8, filterType: 'lowpass', freq: 800, gain: 0.02 });
      const chords = [[57, 60, 64, 67], [55, 59, 62, 65]];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        chordPad(ctx, chords[bar % 2], t0, 2, 0.1);
        kick(ctx, t0, 0.45);
        snare(ctx, t0 + 1, 0.22);
        for (let i = 0; i < 8; i += 1) hat(ctx, t0 + i * 0.25, 0.05);
      }
    },
    tags: ['lofi', 'chill', 'dusk', 'vinyl'],
  },
  {
    bpm: 128, category: 'Dance', duration: 8, id: 'loop-dance-floor', kind: 'music', name: 'Dance Floor',
    render: (ctx) => {
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        for (let i = 0; i < 4; i += 1) kick(ctx, t0 + i * 0.5, 0.55);
        snare(ctx, t0 + 0.5, 0.28);
        snare(ctx, t0 + 1.5, 0.28);
        for (let i = 0; i < 8; i += 1) hat(ctx, t0 + i * 0.25, i % 2 === 0 ? 0.06 : 0.1);
        bassNote(ctx, t0, 36, 0.45, 0.35);
        bassNote(ctx, t0 + 1.25, 41, 0.25, 0.3);
      }
    },
    tags: ['dance', 'club', 'beat', 'party'],
  },
  {
    bpm: 70, category: 'World', duration: 8, id: 'loop-desert-wind', kind: 'music', name: 'Desert Wind',
    render: (ctx) => {
      chordPad(ctx, [45, 52, 57], 0, 8, 0.1);
      noise(ctx, { at: 0, dur: 8, filterType: 'bandpass', freq: 500, freqEnd: 900, gain: 0.03, q: 0.8 });
      const notes = [69, 71, 74, 76, 74, 71];
      notes.forEach((m, i) => osc(ctx, { at: 0.6 + i * 1.2, attack: 0.3, dur: 1, freq: NOTE(m), gain: 0.09, type: 'sine' }));
    },
    tags: ['world', 'desert', 'wind', 'ethnic'],
  },
  {
    bpm: 85, category: 'Lo-Fi', duration: 8, id: 'loop-midnight-jazz', kind: 'music', name: 'Midnight Jazz',
    render: (ctx) => {
      const chords = [[57, 60, 64], [55, 58, 62], [53, 57, 60], [55, 59, 62]];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        chordPad(ctx, chords[bar], t0, 2, 0.1);
        bassNote(ctx, t0, 45 - bar, 0.5, 0.28);
        bassNote(ctx, t0 + 1, 48 - bar, 0.5, 0.24);
        hat(ctx, t0 + 0.5, 0.06);
        hat(ctx, t0 + 1.5, 0.06);
      }
    },
    tags: ['jazz', 'midnight', 'lofi', 'smooth'],
  },
  {
    bpm: 116, category: 'Pop', duration: 8, id: 'loop-happy-days', kind: 'music', name: 'Happy Days',
    render: (ctx) => {
      const notes = [72, 74, 76, 79, 81, 79, 76, 74];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        arpLine(ctx, notes, t0, 0.25, 0.1);
        kick(ctx, t0, 0.35);
        kick(ctx, t0 + 1, 0.35);
        snare(ctx, t0 + 0.5, 0.18);
      }
    },
    tags: ['pop', 'happy', 'cheerful', 'uplifting'],
  },
  {
    bpm: 60, category: 'Ambient', duration: 8, id: 'loop-space-drift', kind: 'music', name: 'Space Drift',
    render: (ctx) => {
      chordPad(ctx, [48, 55, 60], 0, 8, 0.12);
      const pings = [76, 81, 79, 84];
      pings.forEach((m, i) => osc(ctx, { at: 1 + i * 2, attack: 0.2, dur: 1.5, freq: NOTE(m), gain: 0.06, type: 'sine' }));
    },
    tags: ['ambient', 'space', 'drone', 'dreamy'],
  },
  {
    bpm: 105, category: 'Electronic', duration: 8, id: 'loop-urban-groove', kind: 'music', name: 'Urban Groove',
    render: (ctx) => {
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        bassNote(ctx, t0, 38, 0.4, 0.35);
        bassNote(ctx, t0 + 0.75, 38, 0.25, 0.3);
        bassNote(ctx, t0 + 1.25, 41, 0.4, 0.3);
        kick(ctx, t0, 0.4);
        snare(ctx, t0 + 1, 0.25);
        for (let i = 0; i < 8; i += 1) hat(ctx, t0 + i * 0.25, 0.07);
      }
    },
    tags: ['electronic', 'groove', 'urban', 'bass'],
  },
  {
    bpm: 72, category: 'Ambient', duration: 8, id: 'loop-soft-piano', kind: 'music', name: 'Soft Piano',
    render: (ctx) => {
      const notes = [72, 76, 79, 76, 74, 72, 71, 72];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        notes.forEach((m, i) => osc(ctx, { at: t0 + i * 0.25, dur: 0.6, freq: NOTE(m), gain: 0.1, type: 'triangle' }));
        chordPad(ctx, [48, 52, 55], t0, 2, 0.06);
      }
    },
    tags: ['ambient', 'piano', 'soft', 'calm'],
  },
  {
    bpm: 126, category: 'Dance', duration: 8, id: 'loop-festival-beat', kind: 'music', name: 'Festival Beat',
    render: (ctx) => {
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        for (let i = 0; i < 4; i += 1) kick(ctx, t0 + i * 0.5, 0.55);
        snare(ctx, t0 + 0.5, 0.3);
        snare(ctx, t0 + 1.5, 0.3);
        arpLine(ctx, [72, 76, 79, 84], t0, 0.5, 0.08, 'sawtooth');
        for (let i = 0; i < 8; i += 1) hat(ctx, t0 + i * 0.25, 0.08);
      }
    },
    tags: ['dance', 'festival', 'energy', 'party'],
  },
  {
    bpm: 66, category: 'Ambient', duration: 8, id: 'loop-rainy-evening', kind: 'music', name: 'Rainy Evening',
    render: (ctx) => {
      noise(ctx, { at: 0, dur: 8, filterType: 'bandpass', freq: 1000, gain: 0.04, q: 0.5 });
      chordPad(ctx, [57, 60, 64], 0, 4, 0.1);
      chordPad(ctx, [55, 59, 62], 4, 4, 0.1);
      const notes = [76, 74, 72, 74];
      notes.forEach((m, i) => osc(ctx, { at: 0.5 + i * 1.9, dur: 1, freq: NOTE(m), gain: 0.06, type: 'sine' }));
    },
    tags: ['ambient', 'rain', 'evening', 'cozy'],
  },
  {
    bpm: 124, category: 'Pop', duration: 8, id: 'loop-sunrise-run', kind: 'music', name: 'Sunrise Run',
    render: (ctx) => {
      const notes = [74, 76, 79, 81, 83, 81, 79, 76];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        arpLine(ctx, notes, t0, 0.25, 0.1);
        kick(ctx, t0, 0.4);
        kick(ctx, t0 + 0.5, 0.3);
        kick(ctx, t0 + 1, 0.4);
        kick(ctx, t0 + 1.5, 0.3);
        snare(ctx, t0 + 1, 0.2);
      }
    },
    tags: ['pop', 'sunrise', 'energy', 'run'],
  },
  {
    bpm: 122, category: 'Dance', duration: 8, id: 'loop-deep-house', kind: 'music', name: 'Deep House',
    render: (ctx) => {
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        for (let i = 0; i < 4; i += 1) kick(ctx, t0 + i * 0.5, 0.5);
        for (let i = 0; i < 8; i += 1) hat(ctx, t0 + i * 0.25, i % 2 === 1 ? 0.1 : 0.05);
        bassNote(ctx, t0, 36, 1.8, 0.3);
        chordPad(ctx, [60, 63, 67], t0, 2, 0.05);
      }
    },
    tags: ['dance', 'house', 'deep', 'club'],
  },
  {
    bpm: 64, category: 'Ambient', duration: 8, id: 'loop-calm-sea', kind: 'music', name: 'Calm Sea',
    render: (ctx) => {
      noise(ctx, { at: 0, dur: 8, filterType: 'lowpass', freq: 400, gain: 0.05 });
      chordPad(ctx, [53, 57, 60], 0, 8, 0.1);
      const notes = [72, 76, 79];
      notes.forEach((m, i) => osc(ctx, { at: 1 + i * 2.5, attack: 0.4, dur: 1.5, freq: NOTE(m), gain: 0.05, type: 'sine' }));
    },
    tags: ['ambient', 'sea', 'calm', 'ocean'],
  },
  {
    bpm: 110, category: 'Electronic', duration: 8, id: 'loop-street-beat', kind: 'music', name: 'Street Beat',
    render: (ctx) => {
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        kick(ctx, t0, 0.5);
        kick(ctx, t0 + 0.75, 0.4);
        snare(ctx, t0 + 0.5, 0.28);
        snare(ctx, t0 + 1.5, 0.28);
        bassNote(ctx, t0 + 0.25, 41, 0.3, 0.32);
        bassNote(ctx, t0 + 1.25, 38, 0.3, 0.32);
        for (let i = 0; i < 8; i += 1) hat(ctx, t0 + i * 0.25, 0.07);
      }
    },
    tags: ['electronic', 'street', 'beat', 'hip-hop'],
  },
  {
    bpm: 76, category: 'Cinematic', duration: 8, id: 'loop-winter-night', kind: 'music', name: 'Winter Night',
    render: (ctx) => {
      chordPad(ctx, [48, 53, 57], 0, 8, 0.1);
      const notes = [76, 74, 72, 71, 72];
      notes.forEach((m, i) => osc(ctx, { at: 0.8 + i * 1.4, dur: 1.2, freq: NOTE(m), gain: 0.08, type: 'triangle' }));
      noise(ctx, { at: 0, dur: 8, filterType: 'highpass', freq: 8000, gain: 0.008 });
    },
    tags: ['cinematic', 'winter', 'night', 'piano'],
  },
  {
    bpm: 96, category: 'World', duration: 8, id: 'loop-tropical-breeze', kind: 'music', name: 'Tropical Breeze',
    render: (ctx) => {
      const notes = [72, 76, 79, 84, 79, 76];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        notes.forEach((m, i) => pluck(ctx, t0 + i * 0.33, m, 0.11, 'sine'));
        bassNote(ctx, t0, 48, 0.6, 0.25);
        bassNote(ctx, t0 + 1, 45, 0.6, 0.25);
        hat(ctx, t0 + 0.5, 0.05);
        hat(ctx, t0 + 1.5, 0.05);
      }
    },
    tags: ['world', 'tropical', 'breeze', 'island'],
  },
  {
    bpm: 82, category: 'Lo-Fi', duration: 8, id: 'loop-focus-flow', kind: 'music', name: 'Focus Flow',
    render: (ctx) => {
      const chords = [[57, 60, 64], [55, 59, 62], [53, 57, 60], [55, 58, 62]];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        chordPad(ctx, chords[bar], t0, 2, 0.09);
        kick(ctx, t0, 0.4);
        snare(ctx, t0 + 1, 0.2);
        for (let i = 0; i < 8; i += 1) hat(ctx, t0 + i * 0.25, 0.05);
      }
    },
    tags: ['lofi', 'focus', 'study', 'flow'],
  },
  {
    bpm: 100, category: 'Cinematic', duration: 8, id: 'loop-victory-march', kind: 'music', name: 'Victory March',
    render: (ctx) => {
      const chords = [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        chords[bar].forEach((m) => osc(ctx, { at: t0, dur: 1.8, freq: NOTE(m), gain: 0.07, type: 'sawtooth' }));
        kick(ctx, t0, 0.45);
        kick(ctx, t0 + 1, 0.45);
        snare(ctx, t0 + 0.5, 0.25);
        snare(ctx, t0 + 1.5, 0.25);
      }
    },
    tags: ['cinematic', 'victory', 'march', 'bold'],
  },
  {
    bpm: 108, category: 'Pop', duration: 8, id: 'loop-golden-hour', kind: 'music', name: 'Golden Hour',
    render: (ctx) => {
      const notes = [72, 76, 79, 81, 79, 76, 74, 72];
      for (let bar = 0; bar < 4; bar += 1) {
        const t0 = bar * 2;
        chordPad(ctx, [60, 64, 67], t0, 2, 0.08);
        arpLine(ctx, notes, t0, 0.25, 0.1);
        kick(ctx, t0, 0.35);
        snare(ctx, t0 + 1, 0.2);
      }
    },
    tags: ['pop', 'golden', 'warm', 'sunset'],
  },
];

// ---- Phase 5 (Section N): SFX builders (compact data-driven recipes). ----
const sfx = (id: string, name: string, category: string, duration: number, render: (ctx: OfflineAudioContext) => void, tags: string[]): OriginalRecipe => ({
  category,
  duration,
  id,
  kind: 'sfx',
  name,
  render,
  tags,
});
const tone = (freq: number, freqEnd: number | undefined, dur: number, gain: number, type: OscillatorType = 'sine') => (ctx: OfflineAudioContext) =>
  osc(ctx, { at: 0, dur, freq, freqEnd, gain, type });
const burst = (filterType: BiquadFilterType, freq: number, freqEnd: number | undefined, dur: number, gain: number, q = 1) => (ctx: OfflineAudioContext) =>
  noise(ctx, { at: 0, dur, filterType, freq, freqEnd, gain, q });
const chimeSeq = (notes: number[], step: number, dur: number, gain: number) => (ctx: OfflineAudioContext) => {
  notes.forEach((f, i) => osc(ctx, { at: i * step, dur, freq: f, gain, type: 'sine' }));
};

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
  // ---- Phase 5 (Section N): 92 more original SFX, 100 total. ----
  // Interface (11 more)
  sfx('sfx-tap', 'Screen Tap', 'Interface', 0.15, tone(1000, 500, 0.12, 0.4), ['tap', 'ui', 'touch']),
  sfx('sfx-double-tap', 'Double Tap', 'Interface', 0.3, (ctx) => { osc(ctx, { at: 0, dur: 0.1, freq: 1000, gain: 0.4, type: 'sine' }); osc(ctx, { at: 0.15, dur: 0.1, freq: 1000, gain: 0.4, type: 'sine' }); }, ['tap', 'double', 'ui']),
  sfx('sfx-swipe', 'Swipe Whoosh', 'Interface', 0.25, burst('bandpass', 800, 2500, 0.25, 0.25, 1.2), ['swipe', 'ui', 'slide']),
  sfx('sfx-page-turn', 'Page Turn', 'Interface', 0.4, burst('highpass', 2000, 3500, 0.35, 0.2, 1), ['page', 'turn', 'book']),
  sfx('sfx-toggle-on', 'Toggle On', 'Interface', 0.25, (ctx) => { osc(ctx, { at: 0, dur: 0.1, freq: 500, gain: 0.35, type: 'sine' }); osc(ctx, { at: 0.1, dur: 0.15, freq: 800, gain: 0.35, type: 'sine' }); }, ['toggle', 'on', 'switch']),
  sfx('sfx-toggle-off', 'Toggle Off', 'Interface', 0.25, (ctx) => { osc(ctx, { at: 0, dur: 0.1, freq: 800, gain: 0.35, type: 'sine' }); osc(ctx, { at: 0.1, dur: 0.15, freq: 500, gain: 0.35, type: 'sine' }); }, ['toggle', 'off', 'switch']),
  sfx('sfx-success-ding', 'Success Ding', 'Interface', 0.8, chimeSeq([880, 1174.66], 0.15, 0.5, 0.3), ['success', 'ding', 'done']),
  sfx('sfx-error-buzz', 'Error Buzz', 'Interface', 0.4, tone(160, 120, 0.35, 0.4, 'sawtooth'), ['error', 'buzz', 'fail']),
  sfx('sfx-notification-pop', 'Notification Pop', 'Interface', 0.4, (ctx) => { osc(ctx, { at: 0, dur: 0.15, freq: 1200, gain: 0.35, type: 'sine' }); osc(ctx, { at: 0.12, dur: 0.2, freq: 1600, gain: 0.3, type: 'sine' }); }, ['notification', 'pop', 'alert']),
  sfx('sfx-message-arrive', 'Message Arrive', 'Interface', 0.5, chimeSeq([1046.5, 1318.5], 0.12, 0.3, 0.3), ['message', 'arrive', 'chat']),
  sfx('sfx-typing-tick', 'Typing Tick', 'Interface', 0.1, tone(2000, undefined, 0.05, 0.2, 'square'), ['typing', 'tick', 'keyboard']),
  // Whoosh (6 more)
  sfx('sfx-whoosh-low', 'Low Whoosh', 'Whoosh', 0.9, burst('bandpass', 200, 1200, 0.9, 0.4, 1.2), ['whoosh', 'low', 'transition']),
  sfx('sfx-whoosh-high', 'High Whoosh', 'Whoosh', 0.7, burst('bandpass', 1500, 5000, 0.7, 0.35, 1.2), ['whoosh', 'high', 'transition']),
  sfx('sfx-whoosh-fast', 'Fast Whoosh', 'Whoosh', 0.4, burst('bandpass', 500, 4000, 0.4, 0.4, 1.5), ['whoosh', 'fast', 'cut']),
  sfx('sfx-swoosh-down', 'Swoosh Down', 'Whoosh', 0.6, burst('bandpass', 3000, 300, 0.6, 0.35, 1.2), ['swoosh', 'down', 'fall']),
  sfx('sfx-air-rush', 'Air Rush', 'Whoosh', 1.0, burst('highpass', 1000, 3000, 1.0, 0.3, 0.8), ['air', 'rush', 'wind']),
  sfx('sfx-wind-pass', 'Wind Pass', 'Whoosh', 1.2, burst('bandpass', 400, 900, 1.2, 0.25, 0.6), ['wind', 'pass', 'breeze']),
  // Bell (7 more)
  sfx('sfx-bell-single', 'Single Bell', 'Bell', 1.0, chimeSeq([1046.5], 0, 0.9, 0.35), ['bell', 'single', 'ring']),
  sfx('sfx-bell-double', 'Double Bell', 'Bell', 1.4, chimeSeq([1046.5, 1046.5], 0.4, 0.9, 0.35), ['bell', 'double', 'ring']),
  sfx('sfx-bell-triple', 'Triple Bell', 'Bell', 1.8, chimeSeq([1046.5, 1046.5, 1046.5], 0.4, 0.9, 0.35), ['bell', 'triple', 'ring']),
  sfx('sfx-chime-soft', 'Soft Chime', 'Bell', 1.0, chimeSeq([1318.5, 1568], 0.2, 0.7, 0.22), ['chime', 'soft', 'gentle']),
  sfx('sfx-church-bell', 'Church Bell', 'Bell', 2.0, (ctx) => { osc(ctx, { at: 0, dur: 1.8, freq: 523.25, gain: 0.4, type: 'sine' }); osc(ctx, { at: 0, dur: 1.8, freq: 1046.5, gain: 0.15, type: 'sine' }); }, ['church', 'bell', 'toll']),
  sfx('sfx-alarm-bell', 'Alarm Bell', 'Bell', 1.5, (ctx) => { for (let i = 0; i < 4; i += 1) osc(ctx, { at: i * 0.35, dur: 0.25, freq: 1568, gain: 0.3, type: 'square' }); }, ['alarm', 'bell', 'warning']),
  sfx('sfx-doorbell', 'Doorbell', 'Bell', 1.2, chimeSeq([880, 659.25], 0.35, 0.6, 0.35), ['doorbell', 'door', 'ring']),
  // Impact (9 more)
  sfx('sfx-thud-soft', 'Soft Thud', 'Impact', 0.4, tone(100, 50, 0.35, 0.5), ['thud', 'soft', 'impact']),
  sfx('sfx-boom', 'Big Boom', 'Impact', 1.2, (ctx) => { osc(ctx, { at: 0, dur: 1, freq: 100, freqEnd: 30, gain: 0.8, type: 'sine' }); noise(ctx, { at: 0, dur: 0.3, filterType: 'lowpass', freq: 200, gain: 0.4 }); }, ['boom', 'explosion', 'big']),
  sfx('sfx-crash', 'Crash', 'Impact', 1.0, burst('highpass', 3000, 1000, 0.9, 0.45, 0.8), ['crash', 'break', 'noise']),
  sfx('sfx-slam', 'Door Slam', 'Impact', 0.5, (ctx) => { osc(ctx, { at: 0, dur: 0.4, freq: 90, freqEnd: 40, gain: 0.7, type: 'sine' }); noise(ctx, { at: 0, dur: 0.1, filterType: 'lowpass', freq: 400, gain: 0.3 }); }, ['slam', 'door', 'bang']),
  sfx('sfx-knock', 'Knock Knock', 'Impact', 0.6, (ctx) => { osc(ctx, { at: 0, dur: 0.12, freq: 200, gain: 0.5, type: 'sine' }); osc(ctx, { at: 0.25, dur: 0.12, freq: 200, gain: 0.5, type: 'sine' }); }, ['knock', 'door', 'tap']),
  sfx('sfx-stomp', 'Stomp', 'Impact', 0.4, tone(80, 40, 0.3, 0.6), ['stomp', 'foot', 'step']),
  sfx('sfx-punch', 'Punch Hit', 'Impact', 0.3, (ctx) => { osc(ctx, { at: 0, dur: 0.2, freq: 150, freqEnd: 60, gain: 0.6, type: 'sine' }); noise(ctx, { at: 0, dur: 0.08, filterType: 'bandpass', freq: 1000, gain: 0.3 }); }, ['punch', 'hit', 'fight']),
  sfx('sfx-explosion-small', 'Small Explosion', 'Impact', 1.0, (ctx) => { osc(ctx, { at: 0, dur: 0.8, freq: 120, freqEnd: 35, gain: 0.7, type: 'sine' }); noise(ctx, { at: 0, dur: 0.6, filterType: 'lowpass', freq: 500, gain: 0.5 }); }, ['explosion', 'small', 'blast']),
  sfx('sfx-glass-break', 'Glass Break', 'Impact', 0.8, (ctx) => { noise(ctx, { at: 0, dur: 0.5, filterType: 'highpass', freq: 4000, gain: 0.5 }); osc(ctx, { at: 0, dur: 0.3, freq: 2500, gain: 0.15, type: 'square' }); }, ['glass', 'break', 'shatter']),
  // Magic (9 more)
  sfx('sfx-twinkle', 'Twinkle', 'Magic', 0.7, chimeSeq([2093, 2637, 3136], 0.1, 0.3, 0.16), ['twinkle', 'magic', 'star']),
  sfx('sfx-magic-poof', 'Magic Poof', 'Magic', 0.6, burst('bandpass', 1000, 300, 0.5, 0.35, 1), ['poof', 'magic', 'disappear']),
  sfx('sfx-fairy-dust', 'Fairy Dust', 'Magic', 1.0, chimeSeq([1568, 2093, 2637, 3136], 0.12, 0.4, 0.14), ['fairy', 'dust', 'magic']),
  sfx('sfx-spell-cast', 'Spell Cast', 'Magic', 1.2, (ctx) => { osc(ctx, { at: 0, dur: 1, freq: 300, freqEnd: 1200, gain: 0.25, type: 'sawtooth' }); chimeSeq([1046.5, 1568], 0.5, 0.5, 0.2)(ctx); }, ['spell', 'cast', 'magic']),
  sfx('sfx-shimmer', 'Shimmer', 'Magic', 0.9, (ctx) => { for (let i = 0; i < 6; i += 1) osc(ctx, { at: i * 0.12, dur: 0.3, freq: 1500 + i * 200, gain: 0.1, type: 'sine' }); }, ['shimmer', 'magic', 'shine']),
  sfx('sfx-star-burst-sfx', 'Star Burst', 'Magic', 0.8, chimeSeq([1318.5, 1760, 2093], 0.08, 0.4, 0.2), ['star', 'burst', 'magic']),
  sfx('sfx-potion-bubble', 'Potion Bubble', 'Magic', 1.0, (ctx) => { for (let i = 0; i < 5; i += 1) osc(ctx, { at: i * 0.18, dur: 0.15, freq: 300 + i * 120, freqEnd: 600 + i * 100, gain: 0.2, type: 'sine' }); }, ['potion', 'bubble', 'magic']),
  sfx('sfx-enchant', 'Enchant', 'Magic', 1.4, (ctx) => { osc(ctx, { at: 0, dur: 1.2, freq: 440, freqEnd: 880, gain: 0.2, type: 'triangle' }); chimeSeq([880, 1108.7, 1318.5], 0.3, 0.5, 0.18)(ctx); }, ['enchant', 'magic', 'charm']),
  sfx('sfx-portal-open', 'Portal Open', 'Magic', 1.5, (ctx) => { noise(ctx, { at: 0, dur: 1.2, filterType: 'bandpass', freq: 300, freqEnd: 2500, gain: 0.3, q: 2 }); osc(ctx, { at: 0, dur: 1.2, freq: 110, freqEnd: 440, gain: 0.25, type: 'sine' }); }, ['portal', 'open', 'magic']),
  // Nature (10)
  sfx('sfx-rain-drop', 'Rain Drop', 'Nature', 0.3, tone(1800, 900, 0.2, 0.25), ['rain', 'drop', 'water']),
  sfx('sfx-thunder-rumble', 'Thunder Rumble', 'Nature', 2.0, (ctx) => { noise(ctx, { at: 0, dur: 1.8, filterType: 'lowpass', freq: 120, gain: 0.6 }); osc(ctx, { at: 0, dur: 1.5, freq: 60, freqEnd: 35, gain: 0.5, type: 'sine' }); }, ['thunder', 'rumble', 'storm']),
  sfx('sfx-wind-gust', 'Wind Gust', 'Nature', 1.5, burst('bandpass', 300, 800, 1.4, 0.3, 0.7), ['wind', 'gust', 'breeze']),
  sfx('sfx-leaves-rustle', 'Leaves Rustle', 'Nature', 0.8, burst('highpass', 2500, 3500, 0.7, 0.2, 0.8), ['leaves', 'rustle', 'tree']),
  sfx('sfx-water-splash', 'Water Splash', 'Nature', 0.7, burst('bandpass', 800, 400, 0.6, 0.4, 0.8), ['water', 'splash', 'wave']),
  sfx('sfx-wave-crash', 'Wave Crash', 'Nature', 1.5, burst('lowpass', 600, 200, 1.4, 0.45), ['wave', 'crash', 'ocean']),
  sfx('sfx-fire-crackle', 'Fire Crackle', 'Nature', 1.2, (ctx) => { for (let i = 0; i < 8; i += 1) noise(ctx, { at: i * 0.14, dur: 0.06, filterType: 'bandpass', freq: 2000 + i * 300, gain: 0.15, q: 2 }); }, ['fire', 'crackle', 'flame']),
  sfx('sfx-birds-chirp', 'Birds Chirp', 'Nature', 1.2, (ctx) => { for (let i = 0; i < 4; i += 1) osc(ctx, { at: i * 0.3, dur: 0.2, freq: 2500 + i * 200, freqEnd: 3500, gain: 0.12, type: 'sine' }); }, ['birds', 'chirp', 'morning']),
  sfx('sfx-stream-flow', 'Stream Flow', 'Nature', 2.0, burst('bandpass', 1200, 1500, 1.9, 0.18, 0.5), ['stream', 'flow', 'water']),
  sfx('sfx-snow-fall', 'Snow Fall', 'Nature', 1.0, burst('highpass', 5000, 6000, 0.9, 0.08, 0.5), ['snow', 'fall', 'winter']),
  // Animals (8)
  sfx('sfx-dog-bark', 'Dog Bark', 'Animals', 0.5, (ctx) => { osc(ctx, { at: 0, dur: 0.12, freq: 300, freqEnd: 150, gain: 0.5, type: 'square' }); osc(ctx, { at: 0.2, dur: 0.12, freq: 280, freqEnd: 140, gain: 0.5, type: 'square' }); }, ['dog', 'bark', 'pet']),
  sfx('sfx-cat-meow', 'Cat Meow', 'Animals', 0.8, tone(700, 1100, 0.7, 0.3, 'triangle'), ['cat', 'meow', 'pet']),
  sfx('sfx-bird-tweet', 'Bird Tweet', 'Animals', 0.6, (ctx) => { osc(ctx, { at: 0, dur: 0.15, freq: 3000, freqEnd: 3800, gain: 0.15, type: 'sine' }); osc(ctx, { at: 0.2, dur: 0.15, freq: 3200, freqEnd: 4000, gain: 0.15, type: 'sine' }); }, ['bird', 'tweet', 'song']),
  sfx('sfx-lion-roar', 'Lion Roar', 'Animals', 1.5, (ctx) => { osc(ctx, { at: 0, dur: 1.2, freq: 120, freqEnd: 70, gain: 0.5, type: 'sawtooth' }); noise(ctx, { at: 0, dur: 1.2, filterType: 'lowpass', freq: 300, gain: 0.4 }); }, ['lion', 'roar', 'wild']),
  sfx('sfx-horse-gallop', 'Horse Gallop', 'Animals', 1.0, (ctx) => { for (let i = 0; i < 6; i += 1) osc(ctx, { at: i * 0.16, dur: 0.08, freq: 180, gain: 0.3, type: 'sine' }); }, ['horse', 'gallop', 'ride']),
  sfx('sfx-bee-buzz', 'Bee Buzz', 'Animals', 1.0, tone(220, 200, 0.9, 0.25, 'sawtooth'), ['bee', 'buzz', 'insect']),
  sfx('sfx-frog-croak', 'Frog Croak', 'Animals', 0.6, tone(120, 90, 0.5, 0.4, 'square'), ['frog', 'croak', 'pond']),
  sfx('sfx-owl-hoot', 'Owl Hoot', 'Animals', 0.8, (ctx) => { osc(ctx, { at: 0, dur: 0.3, freq: 400, gain: 0.35, type: 'sine' }); osc(ctx, { at: 0.4, dur: 0.35, freq: 350, gain: 0.35, type: 'sine' }); }, ['owl', 'hoot', 'night']),
  // Human (6)
  sfx('sfx-clap-single', 'Single Clap', 'Human', 0.3, burst('bandpass', 1500, 1200, 0.15, 0.5, 1), ['clap', 'hand', 'applause']),
  sfx('sfx-applause', 'Applause', 'Human', 2.0, (ctx) => { for (let i = 0; i < 10; i += 1) noise(ctx, { at: i * 0.18, dur: 0.12, filterType: 'bandpass', freq: 1200 + (i % 3) * 300, gain: 0.25, q: 1 }); }, ['applause', 'crowd', 'cheer']),
  sfx('sfx-laugh-giggle', 'Giggle', 'Human', 0.9, (ctx) => { for (let i = 0; i < 4; i += 1) osc(ctx, { at: i * 0.2, dur: 0.12, freq: 800 + i * 60, gain: 0.2, type: 'sine' }); }, ['laugh', 'giggle', 'happy']),
  sfx('sfx-cough', 'Cough', 'Human', 0.4, burst('bandpass', 500, 300, 0.25, 0.4, 1), ['cough', 'human', 'throat']),
  sfx('sfx-sneeze', 'Sneeze', 'Human', 0.6, burst('bandpass', 800, 400, 0.45, 0.4, 1), ['sneeze', 'human', 'achoo']),
  sfx('sfx-whistle', 'Whistle', 'Human', 0.8, tone(2200, 2600, 0.7, 0.2), ['whistle', 'human', 'tune']),
  // Sci-Fi (10)
  sfx('sfx-laser-zap', 'Laser Zap', 'Sci-Fi', 0.5, tone(1800, 200, 0.4, 0.3, 'sawtooth'), ['laser', 'zap', 'sci-fi']),
  sfx('sfx-robot-beep', 'Robot Beep', 'Sci-Fi', 0.6, (ctx) => { osc(ctx, { at: 0, dur: 0.15, freq: 1200, gain: 0.3, type: 'square' }); osc(ctx, { at: 0.25, dur: 0.15, freq: 900, gain: 0.3, type: 'square' }); }, ['robot', 'beep', 'sci-fi']),
  sfx('sfx-teleport', 'Teleport', 'Sci-Fi', 1.0, (ctx) => { osc(ctx, { at: 0, dur: 0.8, freq: 400, freqEnd: 2000, gain: 0.25, type: 'sine' }); noise(ctx, { at: 0, dur: 0.8, filterType: 'bandpass', freq: 1000, freqEnd: 4000, gain: 0.15, q: 2 }); }, ['teleport', 'sci-fi', 'warp']),
  sfx('sfx-warp-drive', 'Warp Drive', 'Sci-Fi', 1.5, tone(200, 1500, 1.4, 0.3, 'sawtooth'), ['warp', 'drive', 'sci-fi']),
  sfx('sfx-alien-blip', 'Alien Blip', 'Sci-Fi', 0.5, (ctx) => { osc(ctx, { at: 0, dur: 0.12, freq: 1400, gain: 0.25, type: 'sine' }); osc(ctx, { at: 0.15, dur: 0.12, freq: 1800, gain: 0.25, type: 'sine' }); }, ['alien', 'blip', 'sci-fi']),
  sfx('sfx-power-up', 'Power Up', 'Sci-Fi', 0.9, (ctx) => { const notes = [523.25, 659.25, 783.99, 1046.5]; notes.forEach((f, i) => osc(ctx, { at: i * 0.15, dur: 0.3, freq: f, gain: 0.25, type: 'square' })); }, ['power', 'up', 'game']),
  sfx('sfx-power-down', 'Power Down', 'Sci-Fi', 0.9, (ctx) => { const notes = [1046.5, 783.99, 659.25, 523.25]; notes.forEach((f, i) => osc(ctx, { at: i * 0.15, dur: 0.3, freq: f, gain: 0.25, type: 'square' })); }, ['power', 'down', 'game']),
  sfx('sfx-scan-beep', 'Scan Beep', 'Sci-Fi', 0.7, tone(1500, 1500, 0.5, 0.25, 'square'), ['scan', 'beep', 'sci-fi']),
  sfx('sfx-drone-hum', 'Drone Hum', 'Sci-Fi', 1.5, tone(110, 110, 1.4, 0.3, 'sawtooth'), ['drone', 'hum', 'sci-fi']),
  sfx('sfx-hologram-on', 'Hologram On', 'Sci-Fi', 0.8, (ctx) => { noise(ctx, { at: 0, dur: 0.6, filterType: 'highpass', freq: 3000, gain: 0.15 }); osc(ctx, { at: 0.1, dur: 0.5, freq: 1200, freqEnd: 2400, gain: 0.2, type: 'sine' }); }, ['hologram', 'on', 'sci-fi']),
  // Household (10)
  sfx('sfx-door-open', 'Door Open', 'Household', 0.6, burst('bandpass', 300, 500, 0.5, 0.3, 1), ['door', 'open', 'house']),
  sfx('sfx-door-close', 'Door Close', 'Household', 0.5, tone(120, 60, 0.4, 0.5), ['door', 'close', 'house']),
  sfx('sfx-key-turn', 'Key Turn', 'Household', 0.4, (ctx) => { osc(ctx, { at: 0, dur: 0.08, freq: 2000, gain: 0.2, type: 'square' }); osc(ctx, { at: 0.15, dur: 0.08, freq: 1800, gain: 0.2, type: 'square' }); }, ['key', 'turn', 'lock']),
  sfx('sfx-phone-ring', 'Phone Ring', 'Household', 1.2, (ctx) => { osc(ctx, { at: 0, dur: 0.4, freq: 1200, gain: 0.25, type: 'sine' }); osc(ctx, { at: 0.5, dur: 0.4, freq: 1200, gain: 0.25, type: 'sine' }); }, ['phone', 'ring', 'call']),
  sfx('sfx-camera-shutter', 'Camera Shutter', 'Household', 0.3, burst('highpass', 3000, 5000, 0.12, 0.45, 1), ['camera', 'shutter', 'photo']),
  sfx('sfx-kettle-whistle', 'Kettle Whistle', 'Household', 1.0, tone(2400, 2800, 0.9, 0.18), ['kettle', 'whistle', 'kitchen']),
  sfx('sfx-clock-tick', 'Clock Tick', 'Household', 0.2, tone(1500, undefined, 0.06, 0.3, 'square'), ['clock', 'tick', 'time']),
  sfx('sfx-microwave-ding', 'Microwave Ding', 'Household', 0.8, chimeSeq([1174.66], 0, 0.6, 0.35), ['microwave', 'ding', 'kitchen']),
  sfx('sfx-vacuum-hum', 'Vacuum Hum', 'Household', 1.5, (ctx) => { noise(ctx, { at: 0, dur: 1.4, filterType: 'lowpass', freq: 400, gain: 0.3 }); osc(ctx, { at: 0, dur: 1.4, freq: 90, gain: 0.15, type: 'sawtooth' }); }, ['vacuum', 'hum', 'clean']),
  sfx('sfx-light-switch', 'Light Switch', 'Household', 0.15, tone(1800, 1200, 0.08, 0.35, 'square'), ['light', 'switch', 'click']),
  // Sports (6) — brings the SFX total to 100.
  sfx('sfx-referee-whistle', 'Referee Whistle', 'Sports', 0.7, (ctx) => { osc(ctx, { at: 0, dur: 0.25, freq: 2200, gain: 0.25, type: 'square' }); osc(ctx, { at: 0.3, dur: 0.3, freq: 2200, gain: 0.25, type: 'square' }); }, ['whistle', 'referee', 'sport']),
  sfx('sfx-crowd-cheer', 'Crowd Cheer', 'Sports', 2.0, (ctx) => { noise(ctx, { at: 0, dur: 1.9, filterType: 'bandpass', freq: 1000, gain: 0.3, q: 0.5 }); for (let i = 0; i < 6; i += 1) osc(ctx, { at: i * 0.3, dur: 0.15, freq: 700 + i * 80, gain: 0.12, type: 'sine' }); }, ['crowd', 'cheer', 'sport']),
  sfx('sfx-ball-bounce', 'Ball Bounce', 'Sports', 0.5, (ctx) => { osc(ctx, { at: 0, dur: 0.1, freq: 250, freqEnd: 120, gain: 0.45, type: 'sine' }); osc(ctx, { at: 0.25, dur: 0.1, freq: 220, freqEnd: 110, gain: 0.35, type: 'sine' }); }, ['ball', 'bounce', 'sport']),
  sfx('sfx-goal-horn', 'Goal Horn', 'Sports', 1.5, (ctx) => { osc(ctx, { at: 0, dur: 1.2, freq: 220, gain: 0.35, type: 'sawtooth' }); osc(ctx, { at: 0, dur: 1.2, freq: 330, gain: 0.25, type: 'sawtooth' }); }, ['goal', 'horn', 'sport']),
  sfx('sfx-bat-hit', 'Bat Hit', 'Sports', 0.4, (ctx) => { osc(ctx, { at: 0, dur: 0.2, freq: 180, freqEnd: 80, gain: 0.55, type: 'sine' }); noise(ctx, { at: 0, dur: 0.1, filterType: 'bandpass', freq: 1500, gain: 0.3 }); }, ['bat', 'hit', 'sport']),
  sfx('sfx-ski-whoosh', 'Ski Whoosh', 'Sports', 0.9, burst('bandpass', 600, 2500, 0.8, 0.35, 1), ['ski', 'whoosh', 'sport']),
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
// Phase 6 — AI track pattern renderer (Section O).
// Renders an AI track's compact pattern spec (the same spec the offline
// Python renderer uses in generation/render_music.py) with the Phase 5
// helpers above, so a track still plays when its MP3 file is absent
// (text-only checkout) and so the Generate tab can compose new tracks
// from a prompt. The melody walk mirrors the Python rules (seeded,
// 8th-note grid, rests by energy); the exact note sequence is not
// bit-identical to numpy's RandomState, but the structure is the same.
// ---------------------------------------------------------------------------

/** Compact pattern spec for one AI music track (stored in assets/ai-manifest.json). */
export interface AiTrackPattern {
  arp: boolean;
  bars: number;
  bass: 'off' | 'root' | 'walk';
  drums: 'break' | 'four' | 'none' | 'soft';
  energy: number;
  melody: boolean;
  pad: boolean;
  progression: number[];
  rootMidi: number;
  scale: number[];
}

/** mulberry32 seeded RNG (deterministic per track seed). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Render one AI track pattern into an OfflineAudioContext. */
export function renderPatternTrack(
  ctx: OfflineAudioContext,
  pattern: AiTrackPattern,
  bpm: number,
  duration: number,
  seed: number,
): void {
  const barLen = 240 / bpm;
  const step16 = 15 / bpm;
  const step8 = 30 / bpm;
  const { energy, progression, root, scale } = { energy: pattern.energy, progression: pattern.progression, root: pattern.rootMidi, scale: pattern.scale };
  const third = scale.includes(3) ? 3 : 4;
  const chordTones = (chordRoot: number): number[] => [chordRoot, chordRoot + third, chordRoot + 7];
  // Drums.
  for (let bar = 0; bar < pattern.bars; bar += 1) {
    const t0 = bar * barLen;
    if (pattern.drums === 'four') {
      for (const s of [0, 4, 8, 12]) kick(ctx, t0 + s * step16);
      for (const s of [4, 12]) snare(ctx, t0 + s * step16);
      for (let s = 0; s < 16; s += 2) hat(ctx, t0 + s * step16);
    } else if (pattern.drums === 'soft') {
      for (const s of [0, 8]) kick(ctx, t0 + s * step16, 0.45);
      snare(ctx, t0 + 4 * step16, 0.2);
      for (const s of [2, 6, 10, 14]) hat(ctx, t0 + s * step16, 0.07);
    } else if (pattern.drums === 'break') {
      // Syncopated kicks (0/7/10) + soft kicks on beats 2/3/4 + accented
      // hats on every beat, so the quarter-note pulse stays detectable
      // (matches the offline renderer, BUG-P6-006).
      for (const s of [0, 7, 10]) kick(ctx, t0 + s * step16, 0.5);
      for (const s of [4, 8, 12]) kick(ctx, t0 + s * step16, 0.4);
      for (const s of [4, 12]) snare(ctx, t0 + s * step16, 0.25);
      for (let s = 0; s < 16; s += 1) hat(ctx, t0 + s * step16, s % 4 === 0 ? 0.12 : 0.05);
    }
    // Chords / bass / arp per bar.
    const chordRoot = root + progression[bar % progression.length];
    const tones = chordTones(chordRoot);
    if (pattern.pad) chordPad(ctx, tones, t0, barLen, 0.1 + 0.08 * energy);
    if (pattern.bass === 'root') {
      bassNote(ctx, chordRoot - 12, t0, barLen * 0.5, 0.3);
      bassNote(ctx, chordRoot - 12, t0 + barLen * 0.5, barLen * 0.5, 0.26);
    } else if (pattern.bass === 'walk') {
      const walk = [chordRoot - 12, chordRoot - 5, chordRoot - 7, chordRoot - 4];
      walk.forEach((m, i) => bassNote(ctx, m, t0 + (i * barLen) / 4, barLen / 4, 0.28));
    }
    if (pattern.arp) {
      const seq = [...tones, tones[0] + 12, tones[2] + 12, tones[1] + 12];
      const notes = Array.from({ length: 16 }, (_, i) => seq[i % seq.length] + 12);
      arpLine(ctx, notes, t0, step16, 0.09 + 0.05 * energy);
    }
  }
  // Melody: seeded walk on the scale, 8th-note grid, rests by energy.
  // The seed is the track seed from the manifest (same value the offline
  // renderer uses), so a fallback render follows the same walk.
  if (pattern.melody) {
    const rng = mulberry32(seed);
    let degree = 4;
    const nSteps = Math.floor(duration / step8);
    const moves = [-2, -1, -1, 0, 1, 1, 2];
    for (let i = 0; i < nSteps; i += 1) {
      if (rng() < 0.3) continue;
      degree = Math.min(2 * scale.length - 1, Math.max(0, degree + moves[Math.floor(rng() * moves.length)]));
      const octave = 12 * Math.floor(degree / scale.length);
      const midi = root + 12 + octave + scale[degree % scale.length];
      pluck(ctx, i * step8, midi, 0.1 + 0.06 * energy);
    }
  }
}

/** Render an AI track pattern to a WAV blob (same shape as renderOriginal). */
export async function renderAiTrack(
  pattern: AiTrackPattern,
  bpm: number,
  duration: number,
  seed: number,
): Promise<RenderedOriginal> {
  const Ctor =
    typeof window !== 'undefined'
      ? window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
      : undefined;
  if (!Ctor) throw new Error('OfflineAudioContext is not available in this environment.');
  const sampleRate = 44100;
  const ctx = new Ctor(1, Math.max(1, Math.floor(duration * sampleRate)), sampleRate);
  renderPatternTrack(ctx, { ...pattern }, bpm, duration, seed);
  const buffer = await ctx.startRendering();
  const samples = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) peak = Math.max(peak, Math.abs(samples[i]));
  const blob = encodeWav(samples, sampleRate);
  return { blob, duration, peakLevel: peak, peaks: peaksFromSamples(samples, 64), url: URL.createObjectURL(blob) };
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
