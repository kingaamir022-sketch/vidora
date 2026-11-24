"""Vidora Phase 6 — shared offline synthesis primitives (numpy).

Deterministic, CPU-only (GPU-safe mode: no GPU is ever used). All sounds
are synthesized from scratch — no samples, no recordings, no existing
melodies. Used by render_music.py and render_sfx.py.
"""
import numpy as np

SR = 44100


def midi_freq(midi: int) -> float:
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))


def _slice(out: np.ndarray, at: float, dur: float):
    """Start/end sample indices for a note at `at` seconds lasting `dur`."""
    s0 = int(round(at * SR))
    s1 = min(len(out), s0 + max(1, int(round(dur * SR))))
    return s0, s1


def _env(n: int, attack: float, decay_exp: float = 6.0) -> np.ndarray:
    """Raised attack + exponential decay envelope, peak 1."""
    t = np.arange(n) / SR
    a = max(1, int(round(attack * SR)))
    env = np.ones(n)
    env[:a] = np.linspace(0.0, 1.0, a)
    env[a:] = np.exp(-decay_exp * (t[a:] - attack) / max(0.05, (n / SR) - attack))
    return env


def add_tone(out: np.ndarray, freq: float, at: float, dur: float, gain: float,
             kind: str = "sine", freq_end: float | None = None,
             attack: float = 0.01) -> None:
    """Add an oscillator note (sine/triangle/saw) with pitch glide + decay."""
    s0, s1 = _slice(out, at, dur)
    n = s1 - s0
    if n <= 0:
        return
    t = np.arange(n) / SR
    if freq_end is not None and freq_end != freq:
        phase = 2 * np.pi * (freq * t + (freq_end - freq) * t * t / (2 * dur))
    else:
        phase = 2 * np.pi * freq * t
    if kind == "sine":
        sig = np.sin(phase)
    elif kind == "triangle":
        sig = np.sin(phase) + 0.3 * np.sin(3 * phase) / 3 + 0.1 * np.sin(5 * phase) / 5
        sig = sig / 1.13
    elif kind == "saw":
        sig = np.zeros(n)
        for h in range(1, 7):
            sig += np.sin(h * phase) / h
        sig = sig / 1.8
    else:
        raise ValueError(f"unknown tone kind {kind}")
    out[s0:s1] += gain * sig * _env(n, attack)


def one_pole_lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = a * acc + (1 - a) * v
        y[i] = acc
    return y


def one_pole_highpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    prev_in = 0.0
    prev_out = 0.0
    for i, v in enumerate(x):
        out_v = a * (prev_out + v - prev_in)
        y[i] = out_v
        prev_in, prev_out = v, out_v
    return y


def add_noise(out: np.ndarray, at: float, dur: float, gain: float,
              filter_type: str = "lowpass", freq: float = 1000.0,
              freq_end: float | None = None, rng: np.random.RandomState | None = None,
              attack: float = 0.005) -> None:
    """Add filtered white noise with a decay envelope (optional sweep)."""
    s0, s1 = _slice(out, at, dur)
    n = s1 - s0
    if n <= 0:
        return
    r = rng if rng is not None else np.random
    x = r.uniform(-1.0, 1.0, n).astype(np.float64)
    if freq_end is not None and freq_end != freq:
        # Two-stage filter: split into 8 chunks, interpolate the cutoff.
        y = np.zeros(n)
        chunk = max(1, n // 8)
        for c in range(8):
            a, b = c * chunk, min(n, (c + 1) * chunk)
            f = freq + (freq_end - freq) * (c / 7.0)
            seg = x[a:b]
            y[a:b] = (one_pole_lowpass(seg, f) if filter_type == "lowpass"
                      else one_pole_highpass(seg, f))
        x = y
    else:
        x = one_pole_lowpass(x, freq) if filter_type == "lowpass" else one_pole_highpass(x, freq)
    out[s0:s1] += gain * x * _env(n, attack)


def add_pad(out: np.ndarray, freqs: list[float], at: float, dur: float,
            gain: float, cutoff: float = 900.0) -> None:
    """Detuned saw pad chord with slow attack/release + lowpass."""
    s0, s1 = _slice(out, at, dur)
    n = s1 - s0
    if n <= 0:
        return
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for f in freqs:
        for detune in (-6.0, 6.0):
            fd = f * (2.0 ** (detune / 1200.0))
            phase = 2 * np.pi * fd * t
            for h in range(1, 5):
                sig += np.sin(h * phase) / h
    sig = one_pole_lowpass(sig / (len(freqs) * 2 * 2.5), cutoff)
    a = max(1, int(round(0.4 * SR)))
    rel = max(1, int(round(0.4 * SR)))
    env = np.ones(n)
    env[:a] = np.linspace(0.0, 1.0, a)
    env[-rel:] = np.linspace(1.0, 0.0, rel)
    out[s0:s1] += gain * sig * env


def normalize(out: np.ndarray, peak: float = 0.89) -> np.ndarray:
    m = float(np.max(np.abs(out))) if out.size else 0.0
    if m <= 0:
        return out
    return out * (peak / m)


def edge_fade(out: np.ndarray, ms: float = 5.0) -> np.ndarray:
    """Tiny raised-cosine fades at both ends to avoid clicks (loop-safe)."""
    n = max(1, int(round(ms / 1000.0 * SR)))
    if len(out) < 2 * n:
        return out
    ramp = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n))
    out[:n] *= ramp
    out[-n:] *= ramp[::-1]
    return out


def peaks_buckets(samples: np.ndarray, buckets: int = 32) -> list[float]:
    if samples.size == 0:
        return [0.0] * buckets
    chunk = max(1, samples.size // buckets)
    return [round(float(np.max(np.abs(samples[i * chunk:(i + 1) * chunk]))), 4)
            for i in range(buckets)]


def write_mp3(samples: np.ndarray, path: str, bitrate: str = "128k") -> None:
    """Encode float samples (-1..1) to MP3 via ffmpeg (libmp3lame)."""
    import subprocess
    pcm = np.clip(samples, -1.0, 1.0)
    pcm16 = (pcm * 32767).astype("<i2").tobytes()
    proc = subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1",
         "-i", "pipe:0", "-codec:a", "libmp3lame", "-b:a", bitrate, path],
        input=pcm16, capture_output=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg mp3 encode failed for {path}: {proc.stderr.decode()[:300]}")
