import { describe, expect, it } from 'vitest';
import { SAMPLE_PROJECT, type Clip, type Track, type VidoraProject } from '../schema/project';
import {
  ORIGINAL_LOOPS,
  ORIGINAL_SFX,
  VOICE_PRESETS,
  dbToGain,
  detectBeats,
  duckFactorFor,
  effectiveClipGain,
  effectiveClipGainForProject,
  encodeWav,
  fadeGainAt,
  formatDb,
  gainToDb,
  isTrackAudible,
  keyframeVolumeAt,
  normalizeGain,
  renderOriginal,
  voicePreset,
} from '../lib/audio';

const baseTrack: Track = {
  clips: [],
  hidden: false,
  id: 'track-test',
  kind: 'audio',
  locked: false,
  muted: false,
  name: 'Audio test',
  solo: false,
  volume: 1,
};

function audioClip(overrides: Partial<Clip> = {}): Clip {
  return {
    ...structuredClone(SAMPLE_PROJECT.tracks[0].clips[0]),
    audioRole: 'music',
    duration: 10,
    fadeIn: 0,
    fadeOut: 0,
    id: 'clip-audio-test',
    keyframes: [],
    muted: false,
    name: 'Test audio',
    reversed: false,
    start: 0,
    type: 'audio',
    volume: 1,
    ...overrides,
  };
}

describe('dB helpers', () => {
  it('converts dB to gain and back', () => {
    expect(dbToGain(0)).toBe(1);
    expect(dbToGain(-6)).toBeCloseTo(0.501, 3);
    expect(gainToDb(1)).toBe(0);
    expect(gainToDb(0)).toBe(Number.NEGATIVE_INFINITY);
  });

  it('formats dB readouts', () => {
    expect(formatDb(1)).toBe('0 dB');
    expect(formatDb(0)).toBe('−∞ dB');
    expect(formatDb(2)).toBe('+6.0 dB');
    expect(formatDb(0.5)).toBe('−6.0 dB');
  });
});

describe('fadeGainAt', () => {
  it('is 1 with no fades', () => {
    expect(fadeGainAt(5, 10, 0, 0)).toBe(1);
  });

  it('ramps linearly through fade-in', () => {
    expect(fadeGainAt(0, 10, 2, 0)).toBe(0);
    expect(fadeGainAt(1, 10, 2, 0)).toBe(0.5);
    expect(fadeGainAt(2, 10, 2, 0)).toBe(1);
  });

  it('ramps linearly through fade-out', () => {
    expect(fadeGainAt(9, 10, 0, 2)).toBe(0.5);
    expect(fadeGainAt(10, 10, 0, 2)).toBe(0);
  });

  it('clamps fades longer than the clip', () => {
    expect(fadeGainAt(5, 10, 20, 0)).toBe(0.5);
  });
});

describe('keyframeVolumeAt', () => {
  it('falls back to clip.volume with no keyframes', () => {
    expect(keyframeVolumeAt(audioClip({ volume: 0.7 }), 3)).toBe(0.7);
  });

  it('interpolates volume keyframes', () => {
    const clip = audioClip({
      keyframes: [
        { easing: 'linear', id: 'kf-1', property: 'volume', time: 0, value: 0.5 },
        { easing: 'linear', id: 'kf-2', property: 'volume', time: 10, value: 1 },
      ],
      volume: 1,
    });
    expect(keyframeVolumeAt(clip, 5)).toBeCloseTo(0.75, 5);
  });
});

describe('isTrackAudible', () => {
  it('hidden tracks are silent', () => {
    expect(isTrackAudible({ ...baseTrack, hidden: true }, false)).toBe(false);
  });

  it('muted tracks are silent', () => {
    expect(isTrackAudible({ ...baseTrack, muted: true }, false)).toBe(false);
  });

  it('unmuted tracks sound when nothing is soloed', () => {
    expect(isTrackAudible(baseTrack, false)).toBe(true);
  });

  it('only soloed tracks sound when a solo is active', () => {
    expect(isTrackAudible(baseTrack, true)).toBe(false);
    expect(isTrackAudible({ ...baseTrack, solo: true }, true)).toBe(true);
    expect(isTrackAudible({ ...baseTrack, muted: true, solo: true }, true)).toBe(false);
  });
});

describe('duckFactorFor', () => {
  it('ducks music under voice when ducking is on', () => {
    expect(duckFactorFor('music', true, true, 12)).toBeCloseTo(dbToGain(-12), 5);
  });

  it('never ducks the voice itself, SFX, or anything when ducking is off', () => {
    expect(duckFactorFor('voice', true, true, 12)).toBe(1);
    expect(duckFactorFor('sfx', true, true, 12)).toBe(1);
    expect(duckFactorFor('music', true, false, 12)).toBe(1);
    expect(duckFactorFor('music', false, true, 12)).toBe(1);
  });
});

describe('effectiveClipGain', () => {
  const input = (clip: Clip, track: Track = baseTrack) => ({
    anyVoiceActive: false,
    clip,
    duckAmountDb: 12,
    ducking: false,
    localTime: 5,
    masterVolume: 1,
    soloActive: false,
    track,
  });

  it('multiplies clip volume, track volume and master', () => {
    expect(effectiveClipGain(input(audioClip({ volume: 0.5 }), { ...baseTrack, volume: 0.8 }))).toBeCloseTo(0.4, 5);
  });

  it('is silent for muted, reversed, hidden or muted-track clips', () => {
    expect(effectiveClipGain(input(audioClip({ muted: true })))).toBe(0);
    expect(effectiveClipGain(input(audioClip({ reversed: true })))).toBe(0);
    expect(effectiveClipGain(input(audioClip(), { ...baseTrack, hidden: true }))).toBe(0);
    expect(effectiveClipGain(input(audioClip(), { ...baseTrack, muted: true }))).toBe(0);
  });

  it('applies fades inside the gain', () => {
    expect(effectiveClipGain({ ...input(audioClip({ fadeIn: 2, volume: 0.5 })), localTime: 1 })).toBeCloseTo(0.25, 5);
  });

  it('respects solo and ducking', () => {
    expect(effectiveClipGain({ ...input(audioClip()), soloActive: true })).toBe(0);
    expect(effectiveClipGain({ ...input(audioClip(), { ...baseTrack, solo: true }), soloActive: true })).toBe(1);
    expect(effectiveClipGain({ ...input(audioClip()), anyVoiceActive: true, ducking: true })).toBeCloseTo(dbToGain(-12), 5);
  });
});

describe('effectiveClipGainForProject', () => {
  function projectWithVoice(): VidoraProject {
    const p = structuredClone(SAMPLE_PROJECT);
    const music = audioClip({ audioRole: 'music', id: 'clip-music', start: 0 });
    const voice = audioClip({ audioRole: 'voice', id: 'clip-voice', start: 2 });
    p.tracks[1].clips = [music];
    p.tracks.push({ ...baseTrack, id: 'track-voice', name: 'Voice 1' });
    p.tracks[2].clips = [voice];
    p.mixer = { duckAmountDb: 12, ducking: true, masterVolume: 1 };
    return p;
  }

  it('ducks music while a voice clip is under the playhead', () => {
    const p = projectWithVoice();
    const music = p.tracks[1].clips[0];
    expect(effectiveClipGainForProject(music, p.tracks[1], p, 1)).toBe(1); // voice not started yet
    expect(effectiveClipGainForProject(music, p.tracks[1], p, 5)).toBeCloseTo(dbToGain(-12), 5);
    const voice = p.tracks[2].clips[0];
    expect(effectiveClipGainForProject(voice, p.tracks[2], p, 5)).toBe(1); // voice never ducks itself
  });

  it('applies solo across the project', () => {
    const p = projectWithVoice();
    p.tracks[2].solo = true;
    expect(effectiveClipGainForProject(p.tracks[1].clips[0], p.tracks[1], p, 5)).toBe(0);
    expect(effectiveClipGainForProject(p.tracks[2].clips[0], p.tracks[2], p, 5)).toBe(1);
  });
});

describe('normalizeGain', () => {
  it('raises a quiet clip toward −1 dBFS', () => {
    expect(normalizeGain(0.5)).toBeCloseTo(dbToGain(-1) / 0.5, 5);
  });

  it('clamps to the 0–2 volume range and returns null without peak data', () => {
    expect(normalizeGain(0.1)).toBe(2);
    expect(normalizeGain(undefined)).toBeNull();
    expect(normalizeGain(0)).toBeNull();
  });
});

describe('detectBeats', () => {
  it('finds regular pulses and estimates BPM', () => {
    const peaks = new Array<number>(64).fill(0.2);
    for (const i of [8, 16, 24, 32, 40, 48, 56]) peaks[i] = 0.9;
    const { bpm, times } = detectBeats(peaks, 8);
    expect(times).toHaveLength(7);
    expect(times[0]).toBeCloseTo(1.06, 2);
    expect(bpm).toBe(60);
  });

  it('finds nothing in a flat waveform or a too-short clip', () => {
    expect(detectBeats(new Array<number>(64).fill(0.5), 8).times).toEqual([]);
    expect(detectBeats([0.9, 0.2, 0.9], 1).times).toEqual([]);
  });
});

describe('encodeWav', () => {
  it('writes a valid 16-bit mono WAV header', async () => {
    const blob = encodeWav(new Float32Array([0, 1, -1, 0.5]), 44100);
    expect(blob.type).toBe('audio/wav');
    const buf = await blob.arrayBuffer();
    const view = new DataView(buf);
    const str = (o: number, n: number) => String.fromCharCode(...new Uint8Array(buf, o, n));
    expect(str(0, 4)).toBe('RIFF');
    expect(str(8, 4)).toBe('WAVE');
    expect(str(36, 4)).toBe('data');
    expect(buf.byteLength).toBe(44 + 8);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x8000);
  });
});

describe('voice presets (originality)', () => {
  it('has 8 presets with unique ids and original names', () => {
    expect(VOICE_PRESETS).toHaveLength(8);
    expect(new Set(VOICE_PRESETS.map((p) => p.id)).size).toBe(8);
    expect(VOICE_PRESETS.map((p) => p.name)).toEqual([
      'None',
      'Deep Voice',
      'Bright Voice',
      'Radio Booth',
      'Telephone',
      'Cave Echo',
      'Robot',
      'Warm Studio',
    ]);
  });

  it('falls back to None for an unknown id', () => {
    expect(voicePreset('no-such-voice').id).toBe('none');
    expect(voicePreset('deep').semitones).toBe(-4);
    expect(voicePreset('bright').semitones).toBe(6);
  });
});

describe('Vidora Originals (originality)', () => {
  it('has 30 loops and 100 SFX, all original names, no duplicate ids', () => {
    expect(ORIGINAL_LOOPS).toHaveLength(30);
    expect(ORIGINAL_SFX).toHaveLength(100);
    expect(ORIGINAL_LOOPS.map((o) => o.name).slice(0, 6)).toEqual([
      'Calm Pad',
      'Soft Pulse',
      'Night Drive',
      'Morning Light',
      'Deep Focus',
      'Gentle Rain',
    ]);
    expect(ORIGINAL_SFX.map((o) => o.name).slice(0, 8)).toEqual([
      'Soft Pop',
      'Air Whoosh',
      'Bright Chime',
      'Deep Thud',
      'Tick Click',
      'Sparkle',
      'Rising Sweep',
      'Quick Blip',
    ]);
    const ids = [...ORIGINAL_LOOPS, ...ORIGINAL_SFX].map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const o of [...ORIGINAL_LOOPS, ...ORIGINAL_SFX]) {
      expect(o.duration).toBeGreaterThan(0);
      expect(o.category.length).toBeGreaterThan(0);
    }
  });

  it('rendering fails clearly where OfflineAudioContext is unavailable (jsdom)', async () => {
    await expect(renderOriginal(ORIGINAL_LOOPS[0])).rejects.toThrow('OfflineAudioContext');
  });
});
