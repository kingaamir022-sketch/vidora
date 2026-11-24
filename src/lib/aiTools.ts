/**
 * AI Tools (Phase 7, SPEC K). Pure, deterministic, CPU-only engines —
 * no DOM, no network, no ML model. Every function is unit-tested in
 * src/test/phase7.test.ts with synthetic data.
 *
 * Honest scope (see docs/behavior/K-*.md): these are real signal /
 * pixel algorithms (silence RMS, phase-correlation stabilisation,
 * centre-channel stems, NCC template tracking, block-match optical
 * flow, edge flood-fill background segmentation). They are NOT neural
 * models, and the UI says so wherever the distinction matters.
 */

/** A frame of RGBA pixels (Uint8ClampedArray, row-major, 4 bytes/px). */
export interface ImageFrame {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function makeFrame(width: number, height: number, fill = 0): ImageFrame {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill;
    data[i * 4 + 1] = fill;
    data[i * 4 + 2] = fill;
    data[i * 4 + 3] = 255;
  }
  return { data, height, width };
}

export function setPixel(f: ImageFrame, x: number, y: number, r: number, g: number, b: number, a = 255): void {
  if (x < 0 || y < 0 || x >= f.width || y >= f.height) return;
  const i = (y * f.width + x) * 4;
  f.data[i] = r;
  f.data[i + 1] = g;
  f.data[i + 2] = b;
  f.data[i + 3] = a;
}

export function grayAt(f: ImageFrame, x: number, y: number): number {
  const i = (y * f.width + x) * 4;
  return 0.299 * f.data[i] + 0.587 * f.data[i + 1] + 0.114 * f.data[i + 2];
}

/** Downscale a frame to at most `maxW` wide (nearest neighbour). */
export function downscale(f: ImageFrame, maxW: number): ImageFrame {
  if (f.width <= maxW) return f;
  const s = maxW / f.width;
  const w = Math.max(1, Math.round(f.width * s));
  const h = Math.max(1, Math.round(f.height * s));
  const out = makeFrame(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(f.width - 1, Math.floor(x / s));
      const sy = Math.min(f.height - 1, Math.floor(y / s));
      const si = (sy * f.width + sx) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = f.data[si];
      out.data[di + 1] = f.data[si + 1];
      out.data[di + 2] = f.data[si + 2];
      out.data[di + 3] = 255;
    }
  }
  return out;
}

/** Grayscale Float32Array (row-major) from a frame. */
export function toGray(f: ImageFrame): Float32Array {
  const g = new Float32Array(f.width * f.height);
  for (let y = 0; y < f.height; y++) {
    for (let x = 0; x < f.width; x++) g[y * f.width + x] = grayAt(f, x, y);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Smart cut: silence detection + filler words (K-SMARTCUT)
// ---------------------------------------------------------------------------

export interface TimeRange {
  end: number;
  start: number;
}

/**
 * Find silent ranges in PCM audio. Windows of 50 ms; a window is silent
 * when its RMS is below `thresholdDb`. Ranges shorter than
 * `minSilenceSec` are dropped; ranges are trimmed to the exact window
 * edges. Returns ranges in clip-local seconds.
 */
export function detectSilences(
  samples: ArrayLike<number>,
  sampleRate: number,
  thresholdDb = -40,
  minSilenceSec = 0.5,
): TimeRange[] {
  const win = Math.max(1, Math.floor(sampleRate * 0.05));
  const threshold = Math.pow(10, thresholdDb / 20);
  const ranges: TimeRange[] = [];
  let open: number | null = null;
  const nWin = Math.floor(samples.length / win);
  for (let w = 0; w < nWin; w++) {
    let sum = 0;
    for (let i = 0; i < win; i++) {
      const v = samples[w * win + i];
      sum += v * v;
    }
    const rms = Math.sqrt(sum / win);
    const silent = rms < threshold;
    if (silent && open === null) open = (w * win) / sampleRate;
    if (!silent && open !== null) {
      const end = (w * win) / sampleRate;
      if (end - open >= minSilenceSec) ranges.push({ end, start: open });
      open = null;
    }
  }
  if (open !== null) {
    const end = samples.length / sampleRate;
    if (end - open >= minSilenceSec) ranges.push({ end, start: open });
  }
  return ranges;
}

export const FILLER_WORDS = [
  'um', 'uh', 'hmm', 'er', 'ah', 'like', 'you know', 'basically',
  'actually', 'literally', 'sort of', 'kind of', 'right', 'yeah',
];

export interface FillerRange extends TimeRange {
  word: string;
}

/** Find filler-word ranges in caption words (case-insensitive). */
export function findFillerRanges(
  words: { end: number; start: number; text: string }[],
  fillers: string[] = FILLER_WORDS,
): FillerRange[] {
  const set = new Set(fillers.map((f) => f.toLowerCase()));
  const out: FillerRange[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i].text.toLowerCase().replace(/[^a-z' ]/g, '').trim();
    if (set.has(w)) {
      out.push({ end: words[i].end, start: words[i].start, word: words[i].text });
      continue;
    }
    // Two-word fillers ("you know", "sort of", "kind of").
    if (i + 1 < words.length) {
      const two = `${w} ${words[i + 1].text.toLowerCase().replace(/[^a-z']/g, '')}`.trim();
      if (set.has(two)) {
        out.push({ end: words[i + 1].end, start: words[i].start, word: `${words[i].text} ${words[i + 1].text}` });
        i++;
      }
    }
  }
  return out;
}

/** Merge overlapping / touching ranges into the minimal set. */
export function mergeCutRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: TimeRange[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    if (sorted[i].start <= last.end + 0.001) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      out.push({ ...sorted[i] });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Auto reframe (K-REFRAME)
// ---------------------------------------------------------------------------

export interface CropWindow {
  height: number;
  width: number;
  x: number;
  y: number;
}

/**
 * Analyse sampled frames (1 per second) and return one normalised crop
 * window per frame for `targetRatio` (width/height). The subject is the
 * centroid of pixels that differ from the running background (motion)
 * blended with the brightness centroid (saliency), centre-weighted and
 * smoothed over 3 frames. Falls back to the centre window when nothing
 * moves.
 */
export function analyzeReframe(frames: ImageFrame[], targetRatio: number): CropWindow[] {
  if (frames.length === 0) return [];
  const f0 = frames[0];
  const frameRatio = f0.width / f0.height;
  let ww: number;
  let wh: number;
  if (targetRatio < frameRatio) {
    wh = 1;
    ww = targetRatio / frameRatio;
  } else {
    ww = 1;
    wh = frameRatio / targetRatio;
  }
  const bg = toGray(downscale(f0, 80));
  const bw = Math.min(80, f0.width);
  const bh = Math.round((bw * f0.height) / f0.width);
  const centres: { x: number; y: number }[] = [];
  for (const frame of frames) {
    const small = downscale(frame, 80);
    const g = toGray(small);
    let mx = 0;
    let my = 0;
    let mTot = 0;
    let bx = 0;
    let by = 0;
    let bTot = 0;
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const i = y * bw + x;
        const motion = Math.abs(g[i] - bg[i]);
        const cxw = 1 - 0.4 * Math.abs(x / bw - 0.5) * 2;
        const cyw = 1 - 0.4 * Math.abs(y / bh - 0.5) * 2;
        const w = motion * cxw * cyw;
        mx += x * w;
        my += y * w;
        mTot += w;
        const b = g[i] * cxw * cyw;
        bx += x * b;
        by += y * b;
        bTot += b;
        bg[i] = bg[i] * 0.9 + g[i] * 0.1; // running background
      }
    }
    let cx: number;
    let cy: number;
    if (mTot > bw * bh * 2) {
      // Real motion dominates: trust the motion centroid.
      cx = mx / mTot / bw;
      cy = my / mTot / bh;
    } else {
      cx = bx / Math.max(1, bTot) / bw;
      cy = by / Math.max(1, bTot) / bh;
    }
    centres.push({ x: Math.min(1, Math.max(0, cx)), y: Math.min(1, Math.max(0, cy)) });
  }
  // Smooth over 3 frames.
  const windows: CropWindow[] = centres.map((c, i) => {
    const near = [centres[Math.max(0, i - 1)], c, centres[Math.min(centres.length - 1, i + 1)]];
    const sx = near.reduce((s, p) => s + p.x, 0) / near.length;
    const sy = near.reduce((s, p) => s + p.y, 0) / near.length;
    const x = Math.min(1 - ww, Math.max(0, sx - ww / 2));
    const y = Math.min(1 - wh, Math.max(0, sy - wh / 2));
    return { height: wh, width: ww, x, y };
  });
  return windows;
}

/** Interpolate a crop window at `time` (windows sampled 1/sec). */
export function reframeWindowAt(windows: CropWindow[], time: number): CropWindow | null {
  if (windows.length === 0) return null;
  const t = Math.min(windows.length - 1, Math.max(0, time));
  const i = Math.floor(t);
  const j = Math.min(windows.length - 1, i + 1);
  const f = t - i;
  const a = windows[i];
  const b = windows[j];
  return {
    height: a.height + (b.height - a.height) * f,
    width: a.width + (b.width - a.width) * f,
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
  };
}

// ---------------------------------------------------------------------------
// Stabilization: radix-2 FFT + phase correlation (K-STABILIZE)
// ---------------------------------------------------------------------------

/** Iterative radix-2 FFT on interleaved [re, im, re, im, ...]. In place. */
export function fftInterleaved(data: Float32Array, inverse: boolean): void {
  const n = data.length / 2;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const ti = i * 2;
      const tj = j * 2;
      const tr = data[ti];
      const tim = data[ti + 1];
      data[ti] = data[tj];
      data[ti + 1] = data[tj + 1];
      data[tj] = tr;
      data[tj + 1] = tim;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1;
      let cwi = 0;
      for (let k = 0; k < len / 2; k++) {
        const u = (i + k) * 2;
        const v = (i + k + len / 2) * 2;
        const vr = data[v] * cwr - data[v + 1] * cwi;
        const vi = data[v] * cwi + data[v + 1] * cwr;
        data[v] = data[u] - vr;
        data[v + 1] = data[u + 1] - vi;
        data[u] += vr;
        data[u + 1] += vi;
        const nwr = cwr * wr - cwi * wi;
        cwi = cwr * wi + cwi * wr;
        cwr = nwr;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < data.length; i++) data[i] /= n;
  }
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Phase correlation between two equal-size grayscale frames (row-major).
 * Returns the translation (dx, dy) that maps `a` onto `b` (i.e. b is a
 * shifted by dx, dy) and the normalised peak strength 0–1. Sizes must
 * be powers of two; the caller downscales to 128×64.
 */
export function phaseCorrelation(a: Float32Array, b: Float32Array, w: number, h: number): { dx: number; dy: number; peak: number } {
  const n = w * h;
  const fa = new Float32Array(n * 2);
  const fb = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    fa[i * 2] = a[i];
    fb[i * 2] = b[i];
  }
  // 2D FFT via rows then columns.
  const row = new Float32Array(w * 2);
  const col = new Float32Array(h * 2);
  const fft2 = (d: Float32Array, inverse: boolean) => {
    for (let y = 0; y < h; y++) {
      row.set(d.subarray(y * w * 2, y * w * 2 + w * 2));
      fftInterleaved(row, inverse);
      d.set(row, y * w * 2);
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        col[y * 2] = d[(y * w + x) * 2];
        col[y * 2 + 1] = d[(y * w + x) * 2 + 1];
      }
      fftInterleaved(col, inverse);
      for (let y = 0; y < h; y++) {
        d[(y * w + x) * 2] = col[y * 2];
        d[(y * w + x) * 2 + 1] = col[y * 2 + 1];
      }
    }
  };
  fft2(fa, false);
  fft2(fb, false);
  // Cross-power spectrum: R = (conj(Fa) * Fb) / |conj(Fa) * Fb|.
  // conj(Fa)*Fb has phase -2π k s / N when B is A shifted by +s, so
  // the inverse FFT peaks at +s: the returned (dx, dy) is the shift
  // of B's content relative to A.
  const r = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const ar = fa[i * 2];
    const ai = fa[i * 2 + 1];
    const br = fb[i * 2];
    const bi = fb[i * 2 + 1];
    const cr = ar * br + ai * bi;
    const ci = ar * bi - ai * br;
    const mag = Math.sqrt(cr * cr + ci * ci) || 1;
    r[i * 2] = cr / mag;
    r[i * 2 + 1] = ci / mag;
  }
  fft2(r, true);
  let best = 0;
  let bi = 0;
  for (let i = 0; i < n; i++) {
    const v = r[i * 2];
    if (v > best) {
      best = v;
      bi = i;
    }
  }
  let dx = bi % w;
  let dy = Math.floor(bi / w);
  if (dx > w / 2) dx -= w;
  if (dy > h / 2) dy -= h;
  // The inverse FFT already scales by 1/n, so `best` is the peak
  // height directly (1 = perfect shift, near 0 = no correlation).
  return { dx, dy, peak: best };
}

export interface StabilizationSample {
  dx: number;
  dy: number;
}

/**
 * Estimate per-frame camera translation (4 frames/sec) for a clip.
 * Frames are downscaled to 128×64 (power of two) and consecutive pairs
 * are phase-correlated; weak peaks (< 0.05) are skipped and the
 * trajectory interpolates across them. The result is the camera path;
 * applying the *negative*, smoothed path steadies the footage.
 */
export function estimateStabilization(frames: ImageFrame[]): StabilizationSample[] {
  if (frames.length === 0) return [];
  const W = 128;
  const H = 64;
  const grays = frames.map((f) => {
    const small = downscale(f, W);
    // Force exact 128×64 by cropping/padding the gray buffer.
    const g = toGray(small);
    const out = new Float32Array(W * H);
    const sw = small.width;
    const sh = small.height;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const sx = Math.min(sw - 1, Math.floor((x / W) * sw));
        const sy = Math.min(sh - 1, Math.floor((y / H) * sh));
        out[y * W + x] = g[sy * sw + sx];
      }
    }
    return out;
  });
  void nextPow2;
  const path: StabilizationSample[] = [{ dx: 0, dy: 0 }];
  let x = 0;
  let y = 0;
  for (let i = 1; i < grays.length; i++) {
    const { dx, dy, peak } = phaseCorrelation(grays[i - 1], grays[i], W, H);
    if (peak >= 0.05) {
      x += dx;
      y += dy;
    }
    path.push({ dx: x, dy: y });
  }
  return path;
}

/** Low-pass smooth a trajectory (moving average, window 3). */
export function smoothTrajectory(path: StabilizationSample[]): StabilizationSample[] {
  return path.map((p, i) => {
    const near = [path[Math.max(0, i - 1)], p, path[Math.min(path.length - 1, i + 1)]];
    return {
      dx: near.reduce((s, q) => s + q.dx, 0) / near.length,
      dy: near.reduce((s, q) => s + q.dy, 0) / near.length,
    };
  });
}

/**
 * The correction to apply at `time` (samples at 4 Hz): the smoothed
 * camera path minus the raw path, i.e. how much to shift the frame back.
 * Values are in 128×64-sample pixels; the caller scales to the frame.
 * `strength` 0–1 blends the correction (0 = no stabilisation).
 */
export function stabilizationAt(
  raw: StabilizationSample[],
  smoothed: StabilizationSample[],
  time: number,
  strength = 1,
): StabilizationSample {
  if (raw.length === 0) return { dx: 0, dy: 0 };
  const t = Math.min(raw.length - 1, Math.max(0, time * 4));
  const i = Math.floor(t);
  const j = Math.min(raw.length - 1, i + 1);
  const f = t - i;
  const lerp = (a: number, b: number) => a + (b - a) * f;
  return {
    dx: (lerp(smoothed[i].dx, smoothed[j].dx) - lerp(raw[i].dx, raw[j].dx)) * strength,
    dy: (lerp(smoothed[i].dy, smoothed[j].dy) - lerp(raw[i].dy, raw[j].dy)) * strength,
  };
}

// ---------------------------------------------------------------------------
// Background removal: edge flood-fill segmentation (K-BGREMOVE)
// ---------------------------------------------------------------------------

function colorDist(
  d: Uint8ClampedArray,
  i: number,
  j: number,
): number {
  const dr = d[i] - d[j];
  const dg = d[i + 1] - d[j + 1];
  const db = d[i + 2] - d[j + 2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Segment the background of a frame. The background is the set of
 * pixels connected to the frame edges whose colour stays within
 * `tolerance` of an edge pixel (BFS flood fill on a downscaled copy).
 * Returns a full-resolution alpha mask (255 = keep, 0 = background).
 * `feather` softens the mask edge (box blur radius in pixels).
 */
export function segmentBackground(frame: ImageFrame, tolerance = 25, feather = 3): Uint8ClampedArray {
  const small = downscale(frame, 80);
  const w = small.width;
  const h = small.height;
  const d = small.data;
  const bg = new Uint8Array(w * h); // 1 = background
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const i = y * w + x;
    if (!bg[i]) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length > 0) {
    const i = stack.pop() as number;
    const x = i % w;
    const y = Math.floor(i / w);
    const neighbours = [
      x + 1 < w ? i + 1 : -1,
      x - 1 >= 0 ? i - 1 : -1,
      y + 1 < h ? i + w : -1,
      y - 1 >= 0 ? i - w : -1,
    ];
    for (const j of neighbours) {
      if (j >= 0 && !bg[j] && colorDist(d, i * 4, j * 4) <= tolerance) {
        bg[j] = 1;
        stack.push(j);
      }
    }
  }
  // Feather the SMALL mask (cheap at 80px wide), then upscale.
  // Blurring the full-resolution mask every frame would be far too
  // slow for the live preview.
  const mask = new Uint8ClampedArray(frame.width * frame.height);
  if (feather > 0) {
    const r = Math.max(1, Math.round(feather / 2));
    const tmp = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let n = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < w && yy < h) {
              sum += bg[yy * w + xx] ? 0 : 255;
              n++;
            }
          }
        }
        tmp[y * w + x] = Math.round(sum / Math.max(1, n));
      }
    }
    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        const sx = Math.min(w - 1, Math.floor((x / frame.width) * w));
        const sy = Math.min(h - 1, Math.floor((y / frame.height) * h));
        mask[y * frame.width + x] = tmp[sy * w + sx];
      }
    }
    return mask;
  }
  // No feather: upscale the hard mask.
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const sx = Math.min(w - 1, Math.floor((x / frame.width) * w));
      const sy = Math.min(h - 1, Math.floor((y / frame.height) * h));
      mask[y * frame.width + x] = bg[sy * w + sx] ? 0 : 255;
    }
  }
  return mask;
}

/** Apply an alpha mask to a frame's data in place (multiplies alpha). */
export function applyAlphaMask(frame: ImageFrame, mask: Uint8ClampedArray): void {
  for (let i = 0; i < mask.length; i++) {
    frame.data[i * 4 + 3] = Math.round((frame.data[i * 4 + 3] * mask[i]) / 255);
  }
}

// ---------------------------------------------------------------------------
// Enhance: low-light / retouch / relight (K-ENHANCE)
// ---------------------------------------------------------------------------

/**
 * Low-light enhance: gamma lift + histogram stretch, blended by
 * `amount` (0 = no change, 1 = full). Brightens shadows without
 * blowing highlights; cannot create detail that is not there.
 */
export function applyLowLight(data: Uint8ClampedArray, amount: number): void {
  if (amount <= 0) return;
  const gamma = 1 - 0.55 * amount;
  // 1st / 99th percentile luminance for the stretch.
  const lum = new Uint8Array(data.length / 4);
  for (let i = 0; i < lum.length; i++) {
    lum[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }
  const sorted = [...lum].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.01)] ?? 0;
  const hi = sorted[Math.floor(sorted.length * 0.99)] ?? 255;
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = data[i + c];
      const stretched = ((v - lo) / span) * 255;
      const g = Math.pow(Math.max(0, v) / 255, gamma) * 255;
      const mixed = stretched * 0.5 + g * 0.5;
      data[i + c] = Math.min(255, Math.max(0, Math.round(v + (mixed - v) * amount)));
    }
  }
}

/** Skin-tone mask (YCbCr range): 255 where the pixel looks like skin. */
export function skinMask(data: Uint8ClampedArray): Uint8Array {
  const mask = new Uint8Array(data.length / 4);
  for (let i = 0; i < mask.length; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    mask[i] = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 ? 255 : 0;
  }
  return mask;
}

/** 3×3 box blur of RGB data (ignores alpha). */
export function boxBlur(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < width && yy < height) {
            const i = (yy * width + xx) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n++;
          }
        }
      }
      const o = (y * width + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = data[o + 3];
    }
  }
  return out;
}

/**
 * Retouch: gentle blur applied ONLY to skin-toned regions, blended by
 * `amount`. Eyes, hair, clothes and background keep their detail.
 */
export function applyRetouch(frame: ImageFrame, amount: number): void {
  if (amount <= 0) return;
  const mask = skinMask(frame.data);
  const blurred = boxBlur(frame.data, frame.width, frame.height);
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 0) continue;
    const o = i * 4;
    for (let c = 0; c < 3; c++) {
      frame.data[o + c] = Math.round(frame.data[o + c] + (blurred[o + c] - frame.data[o + c]) * amount);
    }
  }
}

/**
 * Relight: dodge dark areas using a blurred luminance map — local
 * contrast lift. Bright areas are held; dark areas are lifted by up to
 * `amount`.
 */
export function applyRelight(frame: ImageFrame, amount: number): void {
  if (amount <= 0) return;
  const small = downscale(frame, 64);
  const blurred = boxBlur(small.data, small.width, small.height);
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const sx = Math.min(small.width - 1, Math.floor((x / frame.width) * small.width));
      const sy = Math.min(small.height - 1, Math.floor((y / frame.height) * small.height));
      const bi = (sy * small.width + sx) * 4;
      const blum = (blurred[bi] + blurred[bi + 1] + blurred[bi + 2]) / 3 / 255;
      const lift = (0.5 - blum) * 2 * amount;
      const o = (y * frame.width + x) * 4;
      for (let c = 0; c < 3; c++) {
        frame.data[o + c] = Math.min(255, Math.max(0, Math.round(frame.data[o + c] * (1 + lift))));
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Vocal isolation: centre-channel stems (K-VOCAL)
// ---------------------------------------------------------------------------

/**
 * Centre-channel separation. In most mixes the lead vocal is panned
 * centre while instruments spread wide: mid = (L+R)/2 estimates the
 * centred content (voice + centred instruments), side = (L−R)/2
 * estimates the wide content. NOT an ML stem separator — the panel
 * says so. Returns new arrays; inputs are unchanged.
 */
export function centerChannelStems(
  left: Float32Array,
  right: Float32Array,
): { music: Float32Array; voice: Float32Array } {
  const n = Math.min(left.length, right.length);
  const voice = new Float32Array(n);
  const music = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    voice[i] = (left[i] + right[i]) / 2;
    music[i] = (left[i] - right[i]) / 2;
  }
  return { music, voice };
}

// ---------------------------------------------------------------------------
// Camera tracking: NCC template matching (K-TRACK)
// ---------------------------------------------------------------------------

export interface TrackBox {
  height: number;
  width: number;
  x: number;
  y: number;
}

/** Normalised cross-correlation of a template against a frame patch. */
export function nccAt(
  frame: Float32Array,
  fw: number,
  template: Float32Array,
  tw: number,
  th: number,
  ox: number,
  oy: number,
): number {
  let sumT = 0;
  let sumF = 0;
  let n = 0;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      sumT += template[y * tw + x];
      sumF += frame[(oy + y) * fw + (ox + x)];
      n++;
    }
  }
  const meanT = sumT / n;
  const meanF = sumF / n;
  let num = 0;
  let denT = 0;
  let denF = 0;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const t = template[y * tw + x] - meanT;
      const f = frame[(oy + y) * fw + (ox + x)] - meanF;
      num += t * f;
      denT += t * t;
      denF += f * f;
    }
  }
  const den = Math.sqrt(denT * denF);
  return den === 0 ? 0 : num / den;
}

export interface TrackPoint {
  time: number;
  x: number;
  y: number;
}

/**
 * Track a subject across sampled frames (1/sec by default via `stepSec`
 * over the frame list). `initialBox` is normalised (0–1) on the first
 * frame. Returns normalised centre points; stops early when the best
 * match falls below 0.7 (lock lost). Coordinates are normalised 0–1.
 */
export function trackTemplate(
  frames: ImageFrame[],
  initialBox: TrackBox,
  stepSec = 1,
): TrackPoint[] {
  if (frames.length === 0) return [];
  const points: TrackPoint[] = [];
  const first = downscale(frames[0], 160);
  const fw = first.width;
  const fh = first.height;
  const tw = Math.max(4, Math.round(initialBox.width * fw));
  const th = Math.max(4, Math.round(initialBox.height * fh));
  const tx = Math.min(fw - tw, Math.max(0, Math.round(initialBox.x * fw)));
  const ty = Math.min(fh - th, Math.max(0, Math.round(initialBox.y * fh)));
  const gray0 = toGray(first);
  const template = new Float32Array(tw * th);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) template[y * tw + x] = gray0[(ty + y) * fw + (tx + x)];
  }
  let cx = tx;
  let cy = ty;
  points.push({ time: 0, x: (cx + tw / 2) / fw, y: (cy + th / 2) / fh });
  const SEARCH = 16;
  for (let i = 1; i < frames.length; i++) {
    const f = downscale(frames[i], 160);
    const g = toGray(f);
    let best = -1;
    let bx = cx;
    let by = cy;
    for (let oy = Math.max(0, cy - SEARCH); oy <= Math.min(fh - th, cy + SEARCH); oy++) {
      for (let ox = Math.max(0, cx - SEARCH); ox <= Math.min(fw - tw, cx + SEARCH); ox++) {
        const s = nccAt(g, fw, template, tw, th, ox, oy);
        if (s > best) {
          best = s;
          bx = ox;
          by = oy;
        }
      }
    }
    if (best < 0.7) break; // lock lost
    cx = bx;
    cy = by;
    points.push({ time: i * stepSec, x: (cx + tw / 2) / fw, y: (cy + th / 2) / fh });
  }
  return points;
}

// ---------------------------------------------------------------------------
// Optical flow: block matching + frame interpolation (K-OPTFLOW)
// ---------------------------------------------------------------------------

function sad(
  a: Float32Array,
  aw: number,
  b: Float32Array,
  bw: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  block: number,
): number {
  let s = 0;
  for (let y = 0; y < block; y++) {
    for (let x = 0; x < block; x++) {
      s += Math.abs(a[(ay + y) * aw + (ax + x)] - b[(by + y) * bw + (bx + x)]);
    }
  }
  return s;
}

/**
 * Per-block motion vectors from frame A to frame B (grayscale, block
 * size `block`, search radius `search`). Returns Int16Array of
 * [vx, vy] pairs, row-major over blocks.
 */
export function estimateMotionVectors(
  a: ImageFrame,
  b: ImageFrame,
  block = 16,
  search = 8,
): { height: number; vectors: Int16Array; width: number } {
  const ga = toGray(downscale(a, 320));
  const gb = toGray(downscale(b, 320));
  const w = Math.min(320, a.width);
  const h = Math.round((w * a.height) / a.width);
  const cols = Math.floor(w / block);
  const rows = Math.floor(h / block);
  const vectors = new Int16Array(cols * rows * 2);
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const ax = bx * block;
      const ay = by * block;
      let best = Infinity;
      let bvx = 0;
      let bvy = 0;
      for (let vy = -search; vy <= search; vy++) {
        for (let vx = -search; vx <= search; vx++) {
          const px = ax + vx;
          const py = ay + vy;
          if (px < 0 || py < 0 || px + block > w || py + block > h) continue;
          const s = sad(ga, w, gb, w, ax, ay, px, py, block);
          if (s < best) {
            best = s;
            bvx = vx;
            bvy = vy;
          }
        }
      }
      vectors[(by * cols + bx) * 2] = bvx;
      vectors[(by * cols + bx) * 2 + 1] = bvy;
    }
  }
  return { height: rows, vectors, width: cols };
}

/**
 * Motion-compensated intermediate frame at `t` (0 = A, 1 = B).
 * Each block is warped by its motion vector; pixels are the average
 * of A sampled backwards and B sampled forwards. Falls back to a
 * plain crossfade when a block has no motion.
 */
export function interpolateFrame(a: ImageFrame, b: ImageFrame, t = 0.5, block = 16, search = 8): ImageFrame {
  const out = makeFrame(a.width, a.height);
  const { height: rows, vectors, width: cols } = estimateMotionVectors(a, b, block, search);
  const sample = (f: ImageFrame, x: number, y: number): [number, number, number] => {
    const xx = Math.min(f.width - 1, Math.max(0, Math.round(x)));
    const yy = Math.min(f.height - 1, Math.max(0, Math.round(y)));
    const i = (yy * f.width + xx) * 4;
    return [f.data[i], f.data[i + 1], f.data[i + 2]];
  };
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      const bcx = Math.min(cols - 1, Math.floor(x / block));
      const bcy = Math.min(rows - 1, Math.floor(y / block));
      const vx = vectors[(bcy * cols + bcx) * 2];
      const vy = vectors[(bcy * cols + bcx) * 2 + 1];
      // Scale vectors from the 320-wide analysis to full resolution.
      const s = a.width / Math.min(320, a.width);
      const [ar, ag, ab] = sample(a, x - vx * s * t, y - vy * s * t);
      const [br, bg, bb] = sample(b, x + vx * s * (1 - t), y + vy * s * (1 - t));
      const o = (y * a.width + x) * 4;
      out.data[o] = Math.round(ar * (1 - t) + br * t);
      out.data[o + 1] = Math.round(ag * (1 - t) + bg * t);
      out.data[o + 2] = Math.round(ab * (1 - t) + bb * t);
      out.data[o + 3] = 255;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Auto highlights (K-HIGHLIGHTS)
// ---------------------------------------------------------------------------

export interface SegmentScore {
  end: number;
  loudness: number;
  motion: number;
  score: number;
  speech: number;
  start: number;
}

export interface HighlightWeights {
  loudness: number;
  motion: number;
  speech: number;
}

/**
 * Score every `segLen`-second segment of a clip. `peaks` and `motion`
 * are per-second (or finer) 0–1 series covering `duration`; `words`
 * are caption words with start/end. Score is the weighted sum of the
 * three normalised signals.
 */
export function scoreHighlightSegments(
  peaks: number[],
  motion: number[],
  words: { end: number; start: number }[],
  duration: number,
  segLen = 2,
  weights: HighlightWeights = { loudness: 0.5, motion: 0.3, speech: 0.2 },
): SegmentScore[] {
  const out: SegmentScore[] = [];
  const perSec = (series: number[], start: number, end: number): number => {
    if (series.length === 0) return 0;
    const step = duration / series.length;
    let sum = 0;
    let n = 0;
    for (let t = start; t < end; t += step) {
      const i = Math.min(series.length - 1, Math.floor(t / step));
      sum += series[i];
      n++;
    }
    return n === 0 ? 0 : sum / n;
  };
  const maxWords = Math.max(
    1,
    ...Array.from({ length: Math.ceil(duration / segLen) }, (_, k) => {
      const s = k * segLen;
      const e = Math.min(duration, s + segLen);
      return words.filter((w) => w.start >= s && w.start < e).length;
    }),
  );
  for (let s = 0; s < duration; s += segLen) {
    const e = Math.min(duration, s + segLen);
    const loudness = perSec(peaks, s, e);
    const mot = perSec(motion, s, e);
    const wordCount = words.filter((w) => w.start >= s && w.start < e).length;
    const speech = wordCount / maxWords;
    const score = loudness * weights.loudness + mot * weights.motion + speech * weights.speech;
    out.push({ end: e, loudness, motion: mot, score, speech, start: s });
  }
  return out;
}

/** Pick the top `count` segments, enforcing at least `minGap` seconds between picks. */
export function pickHighlights(scores: SegmentScore[], count: number, minGap = 2): SegmentScore[] {
  const ranked = [...scores].sort((a, b) => b.score - a.score);
  const picked: SegmentScore[] = [];
  for (const s of ranked) {
    if (picked.length >= count) break;
    if (picked.every((p) => Math.abs(p.start - s.start) >= minGap)) picked.push(s);
  }
  return picked.sort((a, b) => a.start - b.start);
}

// ---------------------------------------------------------------------------
// Upscale (K-UPSCALE)
// ---------------------------------------------------------------------------

/** Bilinear upsample by `factor` (integer 2 or 4). */
export function bilinearUpscale(f: ImageFrame, factor: number): ImageFrame {
  const w = f.width * factor;
  const h = f.height * factor;
  const out = makeFrame(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = (x + 0.5) / factor - 0.5;
      const sy = (y + 0.5) / factor - 0.5;
      const x0 = Math.max(0, Math.floor(sx));
      const y0 = Math.max(0, Math.floor(sy));
      const x1 = Math.min(f.width - 1, x0 + 1);
      const y1 = Math.min(f.height - 1, y0 + 1);
      const fx = Math.min(1, Math.max(0, sx - x0));
      const fy = Math.min(1, Math.max(0, sy - y0));
      const o = (y * w + x) * 4;
      for (let c = 0; c < 4; c++) {
        const a = f.data[(y0 * f.width + x0) * 4 + c];
        const b2 = f.data[(y0 * f.width + x1) * 4 + c];
        const cc = f.data[(y1 * f.width + x0) * 4 + c];
        const d = f.data[(y1 * f.width + x1) * 4 + c];
        out.data[o + c] = Math.round(
          (a * (1 - fx) + b2 * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy,
        );
      }
    }
  }
  return out;
}

/**
 * Upscale a frame by `factor` with unsharp-mask sharpening
 * (`sharpen` 0–1). Honest label: resample + sharpen, no new detail.
 */
export function upscaleFrame(f: ImageFrame, factor: number, sharpen = 0.4): ImageFrame {
  const up = bilinearUpscale(f, factor);
  if (sharpen <= 0) return up;
  const blurred = boxBlur(up.data, up.width, up.height);
  for (let i = 0; i < up.data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const v = up.data[i + c] + (up.data[i + c] - blurred[i + c]) * sharpen;
      up.data[i + c] = Math.min(255, Math.max(0, Math.round(v)));
    }
  }
  return up;
}

// ---------------------------------------------------------------------------
// AI movement (K-MOVEMENT) + script-to-video (K-SCRIPT)
// ---------------------------------------------------------------------------

export const CAMERA_MOVES = [
  { desc: 'Slow push-in on the subject', id: 'zoom-in', label: 'Zoom in' },
  { desc: 'Slow pull-back revealing the scene', id: 'zoom-out', label: 'Zoom out' },
  { desc: 'Camera drifts left across the frame', id: 'pan-left', label: 'Pan left' },
  { desc: 'Camera drifts right across the frame', id: 'pan-right', label: 'Pan right' },
  { desc: 'Camera tilts upward', id: 'tilt-up', label: 'Tilt up' },
  { desc: 'Camera tilts downward', id: 'tilt-down', label: 'Tilt down' },
  { desc: 'Push-in with a slight arc', id: 'dolly-arc', label: 'Dolly arc' },
] as const;

export type CameraMoveId = (typeof CAMERA_MOVES)[number]['id'];

export interface MoveKeyframe {
  property: 'positionX' | 'positionY' | 'scale';
  time: number;
  value: number;
}

/**
 * Keyframes for a camera move across `duration` seconds at `strength`
 * 0–1. Scale moves 1 → 1+0.5·strength; pans move ±8·strength percent;
 * tilts move ±6·strength percent vertically. Values are clip-local.
 */
export function cameraMoveKeyframes(kind: string, strength: number, duration: number): MoveKeyframe[] {
  const s = Math.min(1, Math.max(0, strength));
  const d = Math.max(0.1, duration);
  const at = (property: MoveKeyframe['property'], time: number, value: number): MoveKeyframe => ({ property, time, value });
  switch (kind) {
    case 'zoom-in':
      return [at('scale', 0, 1), at('scale', d, 1 + 0.5 * s)];
    case 'zoom-out':
      return [at('scale', 0, 1 + 0.5 * s), at('scale', d, 1)];
    case 'pan-left':
      return [at('positionX', 0, 8 * s), at('positionX', d, -8 * s)];
    case 'pan-right':
      return [at('positionX', 0, -8 * s), at('positionX', d, 8 * s)];
    case 'tilt-up':
      return [at('positionY', 0, 6 * s), at('positionY', d, -6 * s)];
    case 'tilt-down':
      return [at('positionY', 0, -6 * s), at('positionY', d, 6 * s)];
    case 'dolly-arc':
      return [
        at('scale', 0, 1),
        at('scale', d, 1 + 0.4 * s),
        at('positionX', 0, 0),
        at('positionX', d, 5 * s),
        at('positionY', 0, 0),
        at('positionY', d, -3 * s),
      ];
    default:
      return [];
  }
}

export interface ScriptScene {
  duration: number;
  index: number;
  line: string;
  narration: string;
  visualKind: string;
}

/** Split a script into scenes: one non-empty line = one scene. */
export function scriptToScenes(script: string, secondsPerScene = 4, visualKind = 'gradient'): ScriptScene[] {
  const lines = script
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .slice(0, 20);
  return lines.map((line, i) => ({
    duration: secondsPerScene,
    index: i,
    line,
    narration: line,
    visualKind,
  }));
}
