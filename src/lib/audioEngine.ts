/**
 * Phase 4 (Section J) — the live audio engine.
 *
 * Routes every sounding media element (video clips and audio clips)
 * through one AudioContext so volume, fades, keyframes, EQ, voice
 * changer, noise reduction, ducking, mute/solo and pitch-preserving
 * speed all apply in one place. Falls back to plain element volume
 * when Web Audio is unavailable — never a crash, never silence by
 * accident (a failed graph means unprocessed sound, not no sound).
 *
 * The caller (PreviewArea) computes the per-clip gain with
 * src/lib/audio.ts `effectiveClipGain` and hands the engine a
 * ClipAudioState each tick; the engine owns elements, nodes and
 * smoothing.
 */
import { voicePreset } from './audio';
import type { EqSettings } from '../schema/project';

export interface ClipAudioState {
  clipId: string;
  /** Media URL (blob: or data:). Undefined = no audio. */
  src: string | undefined;
  /** Timeline time into the clip, in seconds (0 at clip start). */
  localTime: number;
  /** Source-media time to seek to (seconds into the source file). */
  seekTo: number;
  speed: number;
  reversed: boolean;
  /** Effective gain for this tick (already includes fades, keyframes, ducking, mute, solo, master). */
  gain: number;
  pitchPreserved: boolean;
  voiceId: string;
  eq: EqSettings;
  noiseReduction: boolean;
  /** Rebuild the processing chain when this changes. */
  chainKey: string;
}

interface ClipChain {
  input: GainNode;
  output: GainNode;
  key: string;
  source: MediaElementAudioSourceNode | null;
  nodes: AudioNode[];
}

function setPreservesPitch(el: HTMLMediaElement, value: boolean): void {
  const anyEl = el as HTMLMediaElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean };
  if ('preservesPitch' in el) anyEl.preservesPitch = value;
  if ('webkitPreservesPitch' in el) anyEl.webkitPreservesPitch = value;
}

/**
 * Modulated dual-delay pitch shifter (classic Web Audio technique):
 * two delay lines ramp their delay time in opposite directions and
 * crossfade, so the output keeps the input tempo but shifts pitch by
 * the given semitones. Audible artifacts on complex audio are
 * expected — the UI says so honestly (J-VOICE).
 */
function buildPitchShifter(ctx: AudioContext, semitones: number): { input: GainNode; output: GainNode } {
  const factor = 2 ** (semitones / 12);
  const windowSize = 0.05;
  const input = ctx.createGain();
  const output = ctx.createGain();
  const rate = Math.abs(1 - factor) / windowSize;
  const lfo = ctx.createOscillator();
  lfo.type = 'sawtooth';
  lfo.frequency.value = Math.max(0.5, rate);
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = windowSize / 2;
  const lfoInvert = ctx.createGain();
  lfoInvert.gain.value = -1;
  const lfoGainB = ctx.createGain();
  lfoGainB.gain.value = windowSize / 2;
  const delayA = ctx.createDelay(0.2);
  const delayB = ctx.createDelay(0.2);
  delayA.delayTime.value = windowSize / 2;
  delayB.delayTime.value = windowSize / 2;
  lfo.connect(lfoGain);
  lfoGain.connect(delayA.delayTime);
  lfo.connect(lfoInvert);
  lfoInvert.connect(lfoGainB);
  lfoGainB.connect(delayB.delayTime);
  // Complementary crossfades driven by the same LFO (0..1 and 1..0).
  const fadeA = ctx.createGain();
  const fadeB = ctx.createGain();
  const half = ctx.createConstantSource();
  half.offset.value = 0.5;
  const fadeScaleA = ctx.createGain();
  fadeScaleA.gain.value = 0.5;
  const fadeScaleB = ctx.createGain();
  fadeScaleB.gain.value = -0.5;
  lfo.connect(fadeScaleA);
  fadeScaleA.connect(fadeA.gain);
  half.connect(fadeA.gain);
  lfo.connect(fadeScaleB);
  fadeScaleB.connect(fadeB.gain);
  half.connect(fadeB.gain);
  input.connect(delayA);
  input.connect(delayB);
  delayA.connect(fadeA);
  delayB.connect(fadeB);
  fadeA.connect(output);
  fadeB.connect(output);
  lfo.start();
  half.start();
  return { input, output };
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private elementSources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private chains = new Map<string, ClipChain>();
  private audioPool = new Map<string, HTMLAudioElement>();
  private failed = false;

  /** True when Web Audio could not be set up (caller falls back to element volume). */
  isFailed(): boolean {
    return this.failed;
  }

  private ensureContext(): AudioContext | null {
    if (this.failed) return null;
    if (this.ctx) return this.ctx;
    try {
      const Ctor =
        typeof window !== 'undefined'
          ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
          : undefined;
      if (!Ctor) {
        this.failed = true;
        return null;
      }
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
      return this.ctx;
    } catch {
      this.failed = true;
      return null;
    }
  }

  /** Resume a suspended context (call from a user gesture, e.g. Play). */
  resume(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  }

  setMasterVolume(volume: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;
    this.master.gain.setTargetAtTime(Math.min(2, Math.max(0, volume)), ctx.currentTime, 0.05);
  }

  private attachElement(el: HTMLMediaElement): MediaElementAudioSourceNode | null {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    const existing = this.elementSources.get(el);
    if (existing) return existing;
    try {
      const source = ctx.createMediaElementSource(el);
      this.elementSources.set(el, source);
      return source;
    } catch {
      return null;
    }
  }

  private buildChain(clipId: string, state: ClipAudioState): ClipChain | null {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return null;
    const preset = voicePreset(state.voiceId);
    const input = ctx.createGain();
    const output = ctx.createGain();
    const nodes: AudioNode[] = [input, output];
    let head: AudioNode = input;
    const connect = (node: AudioNode) => {
      head.connect(node);
      head = node;
      nodes.push(node);
    };
    try {
      // Pitch shift (voice presets with semitones).
      if (preset.semitones !== undefined && preset.semitones !== 0) {
        const shifter = buildPitchShifter(ctx, preset.semitones);
        connect(shifter.input);
        head = shifter.output;
        nodes.push(shifter.input, shifter.output);
      }
      // 3-band EQ: clip EQ + preset EQ on top.
      const eq = {
        high: (state.eq.high ?? 0) + (preset.eq?.high ?? 0),
        low: (state.eq.low ?? 0) + (preset.eq?.low ?? 0),
        mid: (state.eq.mid ?? 0) + (preset.eq?.mid ?? 0),
      };
      const lowshelf = ctx.createBiquadFilter();
      lowshelf.type = 'lowshelf';
      lowshelf.frequency.value = 200;
      lowshelf.gain.value = eq.low;
      const peaking = ctx.createBiquadFilter();
      peaking.type = 'peaking';
      peaking.frequency.value = 1000;
      peaking.Q.value = 1;
      peaking.gain.value = eq.mid;
      const highshelf = ctx.createBiquadFilter();
      highshelf.type = 'highshelf';
      highshelf.frequency.value = 4000;
      highshelf.gain.value = eq.high;
      connect(lowshelf);
      connect(peaking);
      connect(highshelf);
      // Bandpass for Radio / Telephone presets.
      if (preset.bandpass) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = Math.sqrt(preset.bandpass[0] * preset.bandpass[1]);
        bp.Q.value = 0.8;
        connect(bp);
      }
      // Noise reduction: high-pass (rumble) + compressor (gate-ish).
      if (state.noiseReduction) {
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 120;
        connect(hp);
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -40;
        comp.ratio.value = 4;
        connect(comp);
      } else if (preset.compress) {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -24;
        comp.ratio.value = 3;
        connect(comp);
      }
      // Echo / robot voice effects.
      if (preset.delay) {
        const dry = ctx.createGain();
        dry.gain.value = 1 - preset.delay.wet;
        const wet = ctx.createGain();
        wet.gain.value = preset.delay.wet;
        const delay = ctx.createDelay(1);
        delay.delayTime.value = preset.delay.time;
        const feedback = ctx.createGain();
        feedback.gain.value = preset.delay.feedback;
        head.connect(dry);
        dry.connect(output);
        head.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wet);
        wet.connect(output);
        nodes.push(dry, wet, delay, feedback);
        head = output;
      }
      if (preset.amRate) {
        const am = ctx.createGain();
        am.gain.value = 0.5;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = preset.amRate;
        const depth = ctx.createGain();
        depth.gain.value = 0.5;
        lfo.connect(depth);
        depth.connect(am.gain);
        lfo.start();
        connect(am);
      }
      // The echo preset already wired its head to the output above.
      if (head !== output) head.connect(output);
      output.connect(this.master);
      const chain: ClipChain = { input, key: state.chainKey, nodes, output, source: null };
      this.chains.set(clipId, chain);
      return chain;
    } catch {
      try {
        for (const n of nodes) n.disconnect();
      } catch {
        // ignore cleanup errors
      }
      this.chains.delete(clipId);
      return null;
    }
  }

  /**
   * Sync one media element (video or pooled audio) through the graph.
   * Returns false when Web Audio is unavailable — the caller then sets
   * el.volume directly instead.
   */
  syncMediaElement(el: HTMLMediaElement, state: ClipAudioState): boolean {
    const ctx = this.ensureContext();
    if (!ctx || !this.master) {
      el.volume = state.gain;
      return false;
    }
    const source = this.attachElement(el);
    if (!source) {
      el.volume = state.gain;
      return false;
    }
    el.playbackRate = state.speed;
    setPreservesPitch(el, state.pitchPreserved);
    let chain = this.chains.get(state.clipId);
    if (!chain || chain.key !== state.chainKey) {
      const old = chain;
      if (old) {
        try {
          old.source?.disconnect();
          for (const n of old.nodes) n.disconnect();
        } catch {
          // ignore cleanup errors
        }
      }
      chain = this.buildChain(state.clipId, state) ?? undefined;
      if (!chain) {
        el.volume = state.gain;
        return false;
      }
    }
    if (chain.source !== source) {
      try {
        source.disconnect();
      } catch {
        // ignore
      }
      source.connect(chain.input);
      chain.source = source;
    }
    el.volume = 1;
    chain.input.gain.setTargetAtTime(state.gain, ctx.currentTime, 0.05);
    return true;
  }

  /** Sync one pooled <audio> element for an audio clip (create/seek/play). */
  syncAudioClip(state: ClipAudioState, playing: boolean): boolean {
    if (!state.src) return false;
    let el = this.audioPool.get(state.clipId);
    if (!el) {
      el = new Audio();
      el.preload = 'auto';
      this.audioPool.set(state.clipId, el);
    }
    if (el.getAttribute('data-src') !== state.src) {
      el.setAttribute('data-src', state.src);
      el.src = state.src;
      el.load();
    }
    if (Number.isFinite(state.seekTo) && Math.abs(el.currentTime - state.seekTo) > 0.3) {
      try {
        el.currentTime = Math.max(0, state.seekTo);
      } catch {
        // seeking before metadata loads throws in some browsers; retry next tick
      }
    }
    const routed = this.syncMediaElement(el, state);
    if (!routed) el.volume = state.gain;
    if (playing && state.gain > 0) void el.play().catch(() => undefined);
    else el.pause();
    return true;
  }

  /** Drop pooled audio elements and chains that are no longer sounding. */
  prune(activeClipIds: ReadonlySet<string>): void {
    for (const [id, el] of this.audioPool) {
      if (!activeClipIds.has(id)) {
        el.pause();
        this.audioPool.delete(id);
        const chain = this.chains.get(id);
        if (chain) {
          try {
            for (const n of chain.nodes) n.disconnect();
          } catch {
            // ignore
          }
          this.chains.delete(id);
        }
      }
    }
    for (const [id, chain] of this.chains) {
      if (!activeClipIds.has(id)) {
        try {
          for (const n of chain.nodes) n.disconnect();
        } catch {
          // ignore
        }
        this.chains.delete(id);
      }
    }
  }

  dispose(): void {
    for (const el of this.audioPool.values()) el.pause();
    this.audioPool.clear();
    this.chains.clear();
    if (this.ctx) void this.ctx.close().catch(() => undefined);
    this.ctx = null;
    this.master = null;
  }
}
