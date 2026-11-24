import { describe, expect, it } from 'vitest';
import { migrateProject, SAMPLE_PROJECT, validateProject } from '../schema/project';
import {
  analyzeReframe,
  applyLowLight,
  applyRelight,
  applyRetouch,
  cameraMoveKeyframes,
  centerChannelStems,
  detectSilences,
  estimateMotionVectors,
  estimateStabilization,
  fftInterleaved,
  findFillerRanges,
  interpolateFrame,
  makeFrame,
  mergeCutRanges,
  phaseCorrelation,
  pickHighlights,
  reframeWindowAt,
  scoreHighlightSegments,
  scriptToScenes,
  segmentBackground,
  setPixel,
  skinMask,
  smoothTrajectory,
  stabilizationAt,
  trackTemplate,
  upscaleFrame,
  type ImageFrame,
} from '../lib/aiTools';
import { listProviders, providerById } from '../lib/aiProviders';

/** Deterministic pseudo-random (same shape as lib/audio's mulberry32). */
function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dotFrames(count: number, w: number, h: number, startX: number, stepX: number, y: number): ImageFrame[] {
  const frames: ImageFrame[] = [];
  for (let i = 0; i < count; i++) {
    const f = makeFrame(w, h, 0);
    const cx = Math.round(startX + stepX * i);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) setPixel(f, cx + dx, y + dy, 255, 255, 255);
    }
    frames.push(f);
  }
  return frames;
}

describe('Phase 7 smart cut (K-SMARTCUT)', () => {
  it('finds a 1 s silence between two tones', () => {
    const sr = 8000;
    const samples = new Float32Array(sr * 3);
    for (let i = 0; i < sr; i++) samples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sr);
    for (let i = 2 * sr; i < 3 * sr; i++) samples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sr);
    const ranges = detectSilences(samples, sr, -40, 0.5);
    expect(ranges.length).toBe(1);
    expect(ranges[0].start).toBeCloseTo(1.0, 1);
    expect(ranges[0].end).toBeCloseTo(2.0, 1);
  });

  it('ignores silences shorter than the minimum', () => {
    const sr = 8000;
    const samples = new Float32Array(sr * 2);
    for (let i = 0; i < samples.length; i++) samples[i] = i < sr * 0.5 || i >= sr * 0.7 ? 0.4 : 0;
    expect(detectSilences(samples, sr, -40, 0.5).length).toBe(0);
  });

  it('finds single- and two-word fillers', () => {
    const words = [
      { end: 0.5, start: 0, text: 'Hello' },
      { end: 1.0, start: 0.5, text: 'um' },
      { end: 1.5, start: 1.0, text: 'you' },
      { end: 2.0, start: 1.5, text: 'know' },
      { end: 2.5, start: 2.0, text: 'the' },
      { end: 3.0, start: 2.5, text: 'like' },
    ];
    const found = findFillerRanges(words);
    expect(found.map((f) => f.word)).toEqual(['um', 'you know', 'like']);
  });

  it('merges overlapping ranges', () => {
    const merged = mergeCutRanges([
      { end: 2, start: 1 },
      { end: 3, start: 1.8 },
      { end: 5, start: 4 },
    ]);
    expect(merged).toEqual([
      { end: 3, start: 1 },
      { end: 5, start: 4 },
    ]);
  });
});

describe('Phase 7 auto reframe (K-REFRAME)', () => {
  it('follows a moving dot with the crop window', () => {
    const frames = dotFrames(5, 20, 12, 3, 3, 6);
    const windows = analyzeReframe(frames, 9 / 16);
    expect(windows.length).toBe(5);
    expect(windows[4].x).toBeGreaterThan(windows[0].x);
    expect(windows[0].width).toBeCloseTo(9 / 16 / (20 / 12), 2);
  });

  it('interpolates windows between seconds', () => {
    const windows = [
      { height: 1, width: 0.5, x: 0, y: 0 },
      { height: 1, width: 0.5, x: 0.5, y: 0 },
    ];
    const mid = reframeWindowAt(windows, 0.5);
    expect(mid?.x).toBeCloseTo(0.25, 5);
  });
});

describe('Phase 7 stabilization FFT + phase correlation (K-STABILIZE)', () => {
  it('FFT round-trips a signal', () => {
    const rnd = mulberry(7);
    const n = 16;
    const data = new Float32Array(n * 2);
    const orig: number[] = [];
    for (let i = 0; i < n; i++) {
      orig.push(rnd());
      data[i * 2] = orig[i];
    }
    fftInterleaved(data, false);
    fftInterleaved(data, true);
    for (let i = 0; i < n; i++) expect(data[i * 2]).toBeCloseTo(orig[i], 5);
  });

  it('phase correlation recovers a known shift', () => {
    const w = 128;
    const h = 64;
    const a = new Float32Array(w * h);
    const b = new Float32Array(w * h);
    for (let y = 20; y < 40; y++) {
      for (let x = 20; x < 40; x++) a[y * w + x] = 255;
    }
    for (let y = 23; y < 43; y++) {
      for (let x = 25; x < 45; x++) b[y * w + x] = 255;
    }
    const { dx, dy, peak } = phaseCorrelation(a, b, w, h);
    expect(dx).toBe(5);
    expect(dy).toBe(3);
    expect(peak).toBeGreaterThan(0.05);
  });

  it('estimates a growing camera path from shifted frames', () => {
    const rnd = mulberry(42);
    const base = makeFrame(64, 32, 0);
    // Fixed pseudo-random dot pattern (non-periodic, so correlation is unambiguous).
    for (let i = 0; i < 120; i++) {
      setPixel(base, Math.floor(rnd() * 64), Math.floor(rnd() * 32), 255, 255, 255);
    }
    const frames: ImageFrame[] = [];
    for (let shift = 0; shift < 4; shift++) {
      const f = makeFrame(64, 32, 0);
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 64; x++) {
          const sx = x - shift * 2;
          if (sx >= 0 && sx < 64) {
            const i = (y * 64 + x) * 4;
            const j = (y * 64 + sx) * 4;
            f.data[i] = base.data[j];
            f.data[i + 1] = base.data[j + 1];
            f.data[i + 2] = base.data[j + 2];
            f.data[i + 3] = 255;
          }
        }
      }
      frames.push(f);
    }
    const path = estimateStabilization(frames);
    expect(path.length).toBe(4);
    expect(path[3].dx).toBeGreaterThan(path[0].dx);
  });

  it('smoothing pulls a jittery path back toward the mean', () => {
    const raw = [
      { dx: 0, dy: 0 },
      { dx: 4, dy: 0 },
      { dx: 0, dy: 0 },
      { dx: 4, dy: 0 },
    ];
    const smoothed = smoothTrajectory(raw);
    const corr = stabilizationAt(raw, smoothed, 0.25, 1);
    expect(corr.dx).toBeLessThan(0);
  });
});

describe('Phase 7 background removal (K-BGREMOVE)', () => {
  it('masks a solid background but keeps the subject', () => {
    const f = makeFrame(40, 30, 0);
    for (let i = 0; i < f.data.length; i += 4) {
      f.data[i] = 0;
      f.data[i + 1] = 0;
      f.data[i + 2] = 255;
    }
    for (let y = 10; y < 20; y++) {
      for (let x = 15; x < 25; x++) setPixel(f, x, y, 255, 0, 0);
    }
    const mask = segmentBackground(f, 25, 0);
    expect(mask[0]).toBe(0); // corner = background
    expect(mask[15 * 40 + 20]).toBe(255); // centre of the red square
  });
});

describe('Phase 7 enhance ops (K-ENHANCE)', () => {
  it('low-light brightens a dark frame', () => {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 20;
      data[i + 1] = 20;
      data[i + 2] = 20;
      data[i + 3] = 255;
    }
    const before = data[0];
    applyLowLight(data, 1);
    expect(data[0]).toBeGreaterThan(before);
  });

  it('skin mask finds skin tones, not blue', () => {
    const data = new Uint8ClampedArray(2 * 4);
    data[0] = 200;
    data[1] = 150;
    data[2] = 120;
    data[3] = 255;
    data[4] = 0;
    data[5] = 0;
    data[6] = 255;
    data[7] = 255;
    const mask = skinMask(data);
    expect(mask[0]).toBe(255);
    expect(mask[1]).toBe(0);
  });

  it('retouch smooths skin but leaves other pixels alone', () => {
    const f = makeFrame(8, 8, 0);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const skin = x < 4;
        setPixel(f, x, y, skin ? 200 : 30, skin ? 150 : 30, skin ? 120 : 200);
      }
    }
    // Add noise to the skin half (skin-coloured outlier, not white —
    // pure white is not skin, so it must be left alone).
    setPixel(f, 1, 1, 240, 200, 170);
    setPixel(f, 2, 2, 100, 80, 60);
    const beforeNoise = f.data[(1 * 8 + 1) * 4];
    const beforeOther = f.data[(0 * 8 + 6) * 4];
    applyRetouch(f, 1);
    expect(f.data[(1 * 8 + 1) * 4]).toBeLessThan(beforeNoise);
    expect(f.data[(0 * 8 + 6) * 4]).toBe(beforeOther);
  });

  it('relight lifts dark areas more than bright ones', () => {
    const f = makeFrame(16, 4, 0);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 16; x++) {
        const v = x < 8 ? 30 : 220;
        setPixel(f, x, y, v, v, v);
      }
    }
    const darkBefore = f.data[0];
    const brightBefore = f.data[(0 * 16 + 12) * 4];
    applyRelight(f, 1);
    expect(f.data[0] - darkBefore).toBeGreaterThan(f.data[(0 * 16 + 12) * 4] - brightBefore);
  });
});

describe('Phase 7 vocal isolation (K-VOCAL)', () => {
  it('splits centre and side content into voice and music stems', () => {
    const sr = 8000;
    const n = 800;
    const left = new Float32Array(n);
    const right = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const centre = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sr);
      const side = 0.5 * Math.sin((2 * Math.PI * 880 * i) / sr);
      left[i] = centre + side;
      right[i] = centre - side;
    }
    const { music, voice } = centerChannelStems(left, right);
    const i = 100;
    expect(voice[i]).toBeCloseTo(0.5 * Math.sin((2 * Math.PI * 440 * i) / sr), 5);
    expect(music[i]).toBeCloseTo(0.5 * Math.sin((2 * Math.PI * 880 * i) / sr), 5);
  });
});

describe('Phase 7 camera tracking (K-TRACK)', () => {
  it('follows a moving dot across frames', () => {
    const frames = dotFrames(5, 80, 40, 20, 4, 20);
    const points = trackTemplate(frames, { height: 0.2, width: 0.2, x: 0.15, y: 0.3 }, 1);
    expect(points.length).toBe(5);
    expect(points[4].x).toBeGreaterThan(points[0].x);
  });
});

describe('Phase 7 optical flow (K-OPTFLOW)', () => {
  it('interpolates a translating square to its midpoint', () => {
    const a = makeFrame(64, 32, 0);
    const b = makeFrame(64, 32, 0);
    for (let y = 12; y < 20; y++) {
      for (let x = 10; x < 18; x++) setPixel(a, x, y, 255, 255, 255);
      for (let x = 18; x < 26; x++) setPixel(b, x, y, 255, 255, 255);
    }
    const mid = interpolateFrame(a, b, 0.5, 8, 8);
    const atMid = mid.data[(16 * 64 + 14) * 4];
    const atStart = mid.data[(16 * 64 + 10) * 4];
    expect(atMid).toBeGreaterThan(100);
    expect(atMid).toBeGreaterThan(atStart);
  });

  it('motion vectors point along the translation', () => {
    const a = makeFrame(64, 32, 0);
    const b = makeFrame(64, 32, 0);
    for (let y = 8; y < 24; y++) {
      for (let x = 8; x < 24; x++) setPixel(a, x, y, 255, 255, 255);
      for (let x = 16; x < 32; x++) setPixel(b, x, y, 255, 255, 255);
    }
    const { vectors } = estimateMotionVectors(a, b, 8, 8);
    // Block (1,1) covers the square's left edge: it moves +8 in x.
    expect(vectors[(1 * 8 + 1) * 2]).toBe(8);
    expect(vectors[(1 * 8 + 1) * 2 + 1]).toBe(0);
  });
});

describe('Phase 7 highlights (K-HIGHLIGHTS)', () => {
  it('ranks the loud, moving, spoken segment first', () => {
    const peaks = [0.1, 0.1, 0.9, 0.9, 0.2, 0.2];
    const motion = [0.1, 0.1, 0.8, 0.8, 0.1, 0.1];
    const words = [
      { end: 3.5, start: 3 },
      { end: 4, start: 3.5 },
    ];
    const scored = scoreHighlightSegments(peaks, motion, words, 6, 2);
    expect(scored.length).toBe(3);
    const picked = pickHighlights(scored, 1);
    expect(picked[0].start).toBe(2);
  });
});

describe('Phase 7 upscale + movement + script (K-UPSCALE, K-MOVEMENT, K-SCRIPT)', () => {
  it('upscales dimensions and sharpens edges', () => {
    const f = makeFrame(2, 2, 0);
    setPixel(f, 0, 0, 0, 0, 0);
    setPixel(f, 1, 0, 255, 255, 255);
    setPixel(f, 0, 1, 255, 255, 255);
    setPixel(f, 1, 1, 0, 0, 0);
    const up = upscaleFrame(f, 2, 0);
    expect(up.width).toBe(4);
    expect(up.height).toBe(4);
    const sharp = upscaleFrame(f, 2, 0.8);
    expect(sharp.data).not.toEqual(up.data);
  });

  it('zoom-in move starts at scale 1 and ends higher', () => {
    const kfs = cameraMoveKeyframes('zoom-in', 0.5, 4);
    expect(kfs[0]).toEqual({ property: 'scale', time: 0, value: 1 });
    expect(kfs[1]).toEqual({ property: 'scale', time: 4, value: 1.25 });
    expect(cameraMoveKeyframes('nope', 0.5, 4)).toEqual([]);
  });

  it('splits a script into scenes, ignoring blanks, capping at 20', () => {
    const scenes = scriptToScenes('Line one\n\nLine two\nLine three', 4, 'gradient');
    expect(scenes.length).toBe(3);
    expect(scenes[1].line).toBe('Line two');
    expect(scenes[0].duration).toBe(4);
    const many = scriptToScenes(Array.from({ length: 25 }, (_, i) => `Line ${i}`).join('\n'));
    expect(many.length).toBe(20);
  });
});

describe('Phase 7 providers (K-PROVIDERS)', () => {
  it('lists Local as the ready provider', () => {
    const providers = listProviders();
    expect(providers[0].id).toBe('local');
    expect(providers[0].ready).toBe(true);
    expect(providerById('local').label).toBe('Local (on-device)');
  });

  it('throws a readable error for unknown providers', () => {
    expect(() => providerById('nope')).toThrow(/Unknown AI provider/);
  });
});

describe('Phase 7 schema (v0.8.0)', () => {
  it('accepts the shipped sample project', () => {
    expect(validateProject(SAMPLE_PROJECT).success).toBe(true);
  });

  it('migrates a v0.7.0 document to 1.0.0 with AI defaults', () => {
    const old = { ...SAMPLE_PROJECT, version: '0.7.0' as const };
    const migrated = migrateProject(old);
    expect(migrated.version).toBe('1.0.0');
    const clip = migrated.tracks[0].clips[0];
    expect(clip.aiLowLight).toBe(0);
    expect(clip.aiBgRemove).toBe(false);
    expect(clip.aiStabilize).toBe(false);
    expect(clip.aiStabilization).toEqual([]);
    expect(clip.aiMovement).toBe('none');
    expect(clip.aiVocalMode).toBe('none');
  });

  it('accepts a v0.5.0 clip without AI fields', () => {
    const old = JSON.parse(JSON.stringify(SAMPLE_PROJECT)) as Record<string, unknown>;
    old.version = '0.5.0';
    const track = (old.tracks as Record<string, unknown>[])[0];
    const clips = track.clips as Record<string, unknown>[];
    for (const k of [
      'aiLowLight', 'aiRetouch', 'aiRelight', 'aiBgRemove', 'aiBgThreshold',
      'aiStabilize', 'aiStabilization', 'aiStabilizeSmooth', 'aiStabilizeZoom',
      'aiMovement', 'aiOpticalFlow', 'aiVocalMode',
    ]) {
      delete clips[0][k];
    }
    const migrated = migrateProject(old);
    expect(migrated.version).toBe('1.0.0');
    expect(migrated.tracks[0].clips[0].aiLowLight).toBe(0);
  });
});
