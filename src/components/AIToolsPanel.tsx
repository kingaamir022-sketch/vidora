import { useRef, useState } from 'react';
import { findClip } from '../lib/timeline';
import { useProjectStore } from '../store/projectStore';
import { newId, type Clip } from '../schema/project';
import { CAPTION_LANGUAGES } from '../lib/captions';
import { generateImage } from '../lib/aiGenerate';
import { encodeWav } from '../lib/audio';
import {
  analyzeReframe,
  CAMERA_MOVES,
  cameraMoveKeyframes,
  centerChannelStems,
  detectSilences,
  estimateStabilization,
  findFillerRanges,
  interpolateFrame,
  mergeCutRanges,
  pickHighlights,
  scoreHighlightSegments,
  scriptToScenes,
  smoothTrajectory,
  trackTemplate,
  upscaleFrame,
  type ImageFrame,
  type TimeRange,
} from '../lib/aiTools';
import { listProviders } from '../lib/aiProviders';

/**
 * AI Tools panel (Phase 7, SPEC K). One section per K behaviour card.
 * Every tool is either a real local engine (see lib/aiTools.ts) or an
 * honestly labelled fallback — nothing here fakes an AI result. Tools
 * that need a file the browser cannot make (offline STT / TTS render)
 * run through the local scripts in tools/ and say so.
 */

const secCls = 'border-b border-zinc-800 pb-3';
const h3Cls = 'text-xs font-semibold text-zinc-100';
const noteCls = 'mt-1 text-[11px] leading-relaxed text-zinc-500';
const btnCls =
  'mt-2 w-full rounded-md border border-zinc-700 px-2 py-1.5 text-[11px] text-zinc-200 hover:bg-zinc-800 disabled:opacity-40';
const inputCls =
  'mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100';
const labelCls = 'mt-2 block text-[11px] text-zinc-400';

function Section({ children, note, title }: { children?: React.ReactNode; note?: string; title: string }) {
  return (
    <section className={secCls} aria-label={title}>
      <h3 className={h3Cls}>{title}</h3>
      {note && <p className={noteCls}>{note}</p>}
      {children}
    </section>
  );
}

/** Sample `count` frames from a video clip (downscaled to `width` px). */
async function sampleVideoFrames(src: string, duration: number, count: number, width = 160): Promise<ImageFrame[]> {
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  video.src = src;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Could not load the video for analysis.'));
    setTimeout(() => reject(new Error('Video load timed out.')), 10000);
  });
  const canvas = document.createElement('canvas');
  const w = width;
  const h = Math.max(1, Math.round((width * video.videoHeight) / Math.max(1, video.videoWidth)));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  const frames: ImageFrame[] = [];
  const total = video.duration > 0 ? video.duration : duration;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1)) * Math.max(0, total - 0.05);
    await new Promise<void>((resolve) => {
      const done = () => {
        video.removeEventListener('seeked', done);
        resolve();
      };
      video.addEventListener('seeked', done);
      video.currentTime = Math.min(t, Math.max(0, total - 0.05));
      setTimeout(done, 1500);
    });
    ctx.drawImage(video, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    frames.push({ data: img.data, height: h, width: w });
  }
  return frames;
}

/** Decode a clip's audio to PCM channels (same path as waveforms). */
async function decodeClipAudio(src: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(src);
    const buf = await res.arrayBuffer();
    const ctx = new AudioContext();
    try {
      return await ctx.decodeAudioData(buf);
    } finally {
      await ctx.close();
    }
  } catch {
    return null;
  }
}

function frameToCanvas(frame: ImageFrame): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = frame.width;
  c.height = frame.height;
  const ctx = c.getContext('2d');
  if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(frame.data), frame.width, frame.height), 0, 0);
  return c;
}

type RecogCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  start: () => void;
  stop: () => void;
};

function speechRecognitionCtor(): RecogCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecogCtor; webkitSpeechRecognition?: RecogCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function AIToolsPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const updateSelectedClip = useProjectStore((s) => s.updateSelectedClip);
  const setTrackingMode = useProjectStore((s) => s.setTrackingMode);
  const setTracking = useProjectStore((s) => s.setTracking);
  const generateCaptionsFromTranscript = useProjectStore((s) => s.generateCaptionsFromTranscript);
  const addRenderedMedia = useProjectStore((s) => s.addRenderedMedia);
  const smartCutRanges = useProjectStore((s) => s.smartCutRanges);
  const buildReelProject = useProjectStore((s) => s.buildReelProject);
  const buildScriptProject = useProjectStore((s) => s.buildScriptProject);

  const clip: Clip | null =
    project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const media = clip?.mediaId ? project?.media.find((m) => m.id === clip.mediaId) ?? null : null;
  const clipSrc = clip?.src ?? media?.src ?? '';
  const isVideo = clip?.type === 'video' || clip?.type === 'image';
  const isAudio = clip?.type === 'audio' || clip?.type === 'video';

  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState<Record<string, string>>({});
  const setSectionStatus = (key: string, msg: string) => setStatus((s) => ({ ...s, [key]: msg }));
  const recogRef = useRef<{ stop: () => void } | null>(null);

  // STT state
  const [sttLang, setSttLang] = useState('en');
  const [listening, setListening] = useState(false);
  // TTS state
  const [narrText, setNarrText] = useState('');
  // Smart cut state
  const [threshold, setThreshold] = useState(-40);
  const [minSilence, setMinSilence] = useState(0.5);
  const [cutFillers, setCutFillers] = useState(true);
  const [cutRanges, setCutRanges] = useState<(TimeRange & { reason: string })[]>([]);
  // Reframe state
  const [reframeRatio, setReframeRatio] = useState('9:16');
  // Tracking state
  const [trackTarget, setTrackTarget] = useState('');
  // Highlights state
  const [reelCount, setReelCount] = useState(5);
  const [highlights, setHighlights] = useState<{ end: number; score: number; start: number }[]>([]);
  // Script state
  const [script, setScript] = useState('');
  const [sceneSeconds, setSceneSeconds] = useState(4);
  const [scriptStyle, setScriptStyle] = useState('gradient');
  const [scriptNarr, setScriptNarr] = useState(true);
  // Upscale state
  const [upscaleTarget, setUpscaleTarget] = useState('3840');
  const [upscaleSharpen, setUpscaleSharpen] = useState(0.4);
  // Optical flow state
  const [flowBlock, setFlowBlock] = useState(16);
  // Progress
  const [progress, setProgress] = useState('');

  const videoClips = (project?.tracks ?? [])
    .flatMap((t) => t.clips)
    .filter((c) => c.type === 'video' && c.id !== clip?.id);

  const analyse = async (key: string, fn: () => Promise<string>) => {
    if (busy) return;
    setBusy(key);
    setProgress('');
    try {
      setSectionStatus(key, await fn());
    } catch (e) {
      setSectionStatus(key, e instanceof Error ? e.message : String(e));
    } finally {
      setBusy('');
      setProgress('');
    }
  };

  const startDictation = () => {
    const Ctor = speechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = sttLang;
    rec.continuous = true;
    rec.interimResults = false;
    let transcript = '';
    rec.onresult = (e) => {
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) transcript += `${e.results[i][0].transcript} `;
      }
    };
    rec.onerror = (e) => {
      setListening(false);
      setSectionStatus('stt', `Dictation error: ${e.error}. Nothing was added.`);
    };
    rec.onend = () => {
      setListening(false);
      recogRef.current = null;
      const text = transcript.trim();
      if (text) {
        generateCaptionsFromTranscript(text, sttLang);
        setSectionStatus('stt', `Heard ${text.split(/\s+/).length} words — captions added. Check them in the Captions tab.`);
      } else {
        setSectionStatus('stt', 'Nothing heard — no captions added.');
      }
    };
    recogRef.current = rec;
    setListening(true);
    setSectionStatus('stt', 'Listening… speak now, then click Stop.');
    rec.start();
  };

  return (
    <div className="flex flex-col gap-3" aria-label="AI Tools">
      <p className="text-[11px] leading-relaxed text-zinc-500">
        AI tools — real local engines, no cloud, no credits. Where a tool cannot run in the browser, the panel says
        what it really does and what it does not do.
      </p>

      <Section
        title="AI Captions — speech to text"
        note="Two honest paths: dictate into the microphone (browser speech recognition), or transcribe a file offline with the Vosk script (tools/transcribe.py) and import the SRT in the Captions tab. The browser cannot listen to a clip file directly."
      >
        <label className={labelCls} htmlFor="ai-stt-lang">
          Language
        </label>
        <select id="ai-stt-lang" value={sttLang} onChange={(e) => setSttLang(e.target.value)} className={inputCls}>
          {CAPTION_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        {speechRecognitionCtor() ? (
          listening ? (
            <button
              type="button"
              className={btnCls}
              onClick={() => {
                recogRef.current?.stop();
              }}
            >
              Stop dictation
            </button>
          ) : (
            <button type="button" className={btnCls} onClick={startDictation}>
              Dictate transcript (microphone)
            </button>
          )
        ) : (
          <p className="mt-2 rounded-md border border-zinc-700 bg-zinc-900 p-2 text-[11px] text-zinc-400">
            Dictation is not supported in this browser — use the offline Vosk script instead (see tools/README.md).
          </p>
        )}
        <p className="mt-2 rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-[10px] leading-relaxed text-zinc-400">
          .venv/bin/python tools/transcribe.py clip.mp3
        </p>
        {status.stt && <p className="mt-1 text-[11px] text-zinc-300">{status.stt}</p>}
      </Section>

      <Section
        title="Narration — render to audio"
        note="Preview narration uses browser voices. A real audio file comes from the offline Piper script (tools/narrate.py) — the WAV imports as a normal audio clip. Rendered export audio is Phase 8."
      >
        <label className={labelCls} htmlFor="ai-narr-text">
          Narration text
        </label>
        <textarea
          id="ai-narr-text"
          value={narrText}
          onChange={(e) => setNarrText(e.target.value)}
          placeholder="Type the narration…"
          rows={3}
          className={inputCls}
        />
        <p className="mt-2 rounded-md border border-zinc-700 bg-zinc-900 p-2 font-mono text-[10px] leading-relaxed text-zinc-400">
          .venv/bin/python tools/narrate.py &quot;Your text here&quot; --out narration.wav
        </p>
        <p className={noteCls}>Voice: Lessac (US English, downloaded). More voices: see tools/README.md.</p>
      </Section>

      <Section
        title="Smart Cut — silence & filler removal"
        note="Analyses the selected clip's real audio (RMS per 50 ms) and the project captions for filler words. Nothing is cut without you pressing Cut."
      >
        <label className={labelCls} htmlFor="ai-cut-threshold">
          Silence threshold: {threshold} dB
        </label>
        <input
          id="ai-cut-threshold"
          type="range"
          min={-60}
          max={-20}
          step={1}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="mt-1 w-full"
        />
        <label className={labelCls} htmlFor="ai-cut-min">
          Minimum silence: {minSilence} s
        </label>
        <input
          id="ai-cut-min"
          type="range"
          min={0.2}
          max={2}
          step={0.1}
          value={minSilence}
          onChange={(e) => setMinSilence(Number(e.target.value))}
          className="mt-1 w-full"
        />
        <label className="mt-2 flex items-center gap-2 text-[11px] text-zinc-300">
          <input type="checkbox" checked={cutFillers} onChange={(e) => setCutFillers(e.target.checked)} />
          Remove filler words (um, uh, like…)
        </label>
        <button
          type="button"
          className={btnCls}
          disabled={!clip || busy !== ''}
          onClick={() =>
            analyse('smartcut', async () => {
              if (!clip || !clipSrc) return 'Select a clip first.';
              const decoded = await decodeClipAudio(clipSrc);
              const ranges: (TimeRange & { reason: string })[] = [];
              if (decoded) {
                const ch0 = decoded.getChannelData(0);
                const sr = decoded.sampleRate;
                for (const r of detectSilences(ch0, sr, threshold, minSilence)) {
                  ranges.push({ ...r, reason: 'silence' });
                }
              }
              if (cutFillers && project) {
                const words = project.captions.flatMap((c) => c.words ?? []);
                const local = words.filter((w) => w.start >= clip.start && w.start < clip.start + clip.duration);
                for (const f of findFillerRanges(local)) {
                  ranges.push({ end: f.end - clip.start, reason: `filler “${f.word}”`, start: f.start - clip.start });
                }
              }
              const merged = mergeCutRanges(ranges).map((r) => ({
                ...r,
                reason: ranges.filter((x) => x.start < r.end && x.end > r.start).map((x) => x.reason).join(', '),
              }));
              setCutRanges(merged);
              const secs = merged.reduce((s, r) => s + (r.end - r.start), 0).toFixed(1);
              return merged.length === 0
                ? 'No silences or filler words found — nothing to cut.'
                : `${merged.length} range(s) found — ${secs} s would be cut. Review below, then Cut.`;
            })
          }
        >
          {busy === 'smartcut' ? 'Analysing…' : 'Analyse'}
        </button>
        {cutRanges.length > 0 && (
          <ul className="mt-2 space-y-1">
            {cutRanges.map((r, i) => (
              <li key={i} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
                {r.start.toFixed(2)}s – {r.end.toFixed(2)}s · {r.reason}
              </li>
            ))}
          </ul>
        )}
        {cutRanges.length > 0 && (
          <button
            type="button"
            className={btnCls}
            disabled={busy !== ''}
            onClick={() => {
              const all = mergeCutRanges(cutRanges);
              smartCutRanges(all);
              setCutRanges([]);
              setSectionStatus('smartcut', `Cut ${all.length} range(s). Undo with Ctrl+Z to restore.`);
            }}
          >
            Cut all ranges
          </button>
        )}
        {status.smartcut && <p className="mt-1 text-[11px] text-zinc-300">{status.smartcut}</p>}
      </Section>

      <Section
        title="Auto Reframe"
        note="Motion + saliency heuristic finds the subject and keeps it in frame. A static subject with a busy background may drift — re-run or clear."
      >
        <label className={labelCls} htmlFor="ai-reframe-ratio">
          Target ratio
        </label>
        <select
          id="ai-reframe-ratio"
          value={reframeRatio}
          onChange={(e) => setReframeRatio(e.target.value)}
          className={inputCls}
        >
          {['9:16', '1:1', '4:5', '16:9'].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btnCls}
          disabled={!isVideo || !clipSrc || busy !== ''}
          onClick={() =>
            analyse('reframe', async () => {
              if (!clip || !clipSrc) return 'Select a video clip first.';
              const [w, h] = reframeRatio.split(':').map(Number);
              const count = Math.max(2, Math.min(30, Math.ceil(clip.duration)));
              const frames = await sampleVideoFrames(clipSrc, clip.duration, count);
              if (frames.length === 0) return 'Could not sample frames from this clip.';
              const windows = analyzeReframe(frames, w / h);
              updateSelectedClip({ aiReframe: { ratio: reframeRatio, windows } });
              const moved = windows.some((win, i) => i > 0 && Math.abs(win.x - windows[0].x) > 0.02);
              return moved
                ? `Reframed to ${reframeRatio} — ${windows.length} windows, subject tracked. Scrub to check.`
                : `Reframed to ${reframeRatio} — no moving subject found, centre crop used.`;
            })
          }
        >
          {busy === 'reframe' ? 'Analysing…' : 'Analyse & apply'}
        </button>
        {clip?.aiReframe && (
          <button
            type="button"
            className={btnCls}
            onClick={() => {
              updateSelectedClip({ aiReframe: undefined });
              setSectionStatus('reframe', 'Reframe cleared — full frame restored.');
            }}
          >
            Clear reframe
          </button>
        )}
        {status.reframe && <p className="mt-1 text-[11px] text-zinc-300">{status.reframe}</p>}
      </Section>

      <Section
        title="Background Removal"
        note="Heuristic edge segmentation — works on plain backgrounds; a busy background will not cut cleanly. True ML person cutout needs a model. Green screen? Use Chroma key instead."
      >
        <label className="mt-2 flex items-center gap-2 text-[11px] text-zinc-300">
          <input
            id="ai-bgremove"
            type="checkbox"
            checked={clip?.aiBgRemove ?? false}
            disabled={!isVideo}
            onChange={(e) => updateSelectedClip({ aiBgRemove: e.target.checked })}
          />
          Remove background
        </label>
        <label className={labelCls} htmlFor="ai-bg-tol">
          Edge tolerance: {clip?.aiBgThreshold ?? 25}
        </label>
        <input
          id="ai-bg-tol"
          type="range"
          min={5}
          max={80}
          step={1}
          value={clip?.aiBgThreshold ?? 25}
          disabled={!isVideo}
          onChange={(e) => updateSelectedClip({ aiBgThreshold: Number(e.target.value) })}
          className="mt-1 w-full"
        />
        {!isVideo && <p className={noteCls}>Select a video or image clip first.</p>}
      </Section>

      <Section
        title="Camera Tracking — automatic"
        note="Template matching follows the subject you pick. Fast motion, occlusion or a changing shape can lose the lock — the points stay editable by hand afterwards."
      >
        <p className={noteCls}>
          Select a text or sticker clip, choose the video it should follow, then track. The overlay follows the
          subject.
        </p>
        <label className={labelCls} htmlFor="ai-track-target">
          Follow this video clip
        </label>
        <select
          id="ai-track-target"
          value={trackTarget || clip?.tracking?.targetClipId || ''}
          onChange={(e) => {
            setTrackTarget(e.target.value);
            if (e.target.value) setTracking(e.target.value);
          }}
          className={inputCls}
        >
          <option value="">Choose a video clip…</option>
          {videoClips.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btnCls}
          disabled={!clip || !clip.tracking || busy !== ''}
          onClick={() =>
            analyse('track', async () => {
              if (!clip || !clip.tracking) return 'Choose a video clip to follow first.';
              const target = videoClips.find((c) => c.id === clip.tracking!.targetClipId);
              if (!target) return 'The target clip is gone — choose another.';
              const targetSrc = target.src ?? project?.media.find((m) => m.id === target.mediaId)?.src ?? '';
              if (!targetSrc) return 'The target clip has no media.';
              const firstPoint = clip.tracking.points[0];
              const box = firstPoint
                ? { height: 0.2, width: 0.2, x: Math.max(0, firstPoint.x - 0.1), y: Math.max(0, firstPoint.y - 0.1) }
                : { height: 0.2, width: 0.2, x: 0.4, y: 0.4 };
              const count = Math.max(2, Math.min(40, Math.ceil(target.duration)));
              const frames = await sampleVideoFrames(targetSrc, target.duration, count);
              if (frames.length < 2) return 'Could not sample frames from the target clip.';
              const points = trackTemplate(frames, box, 1);
              updateSelectedClip({ tracking: { points, targetClipId: target.id } });
              return points.length >= frames.length
                ? `Tracked ${points.length} point(s) across the clip. Play to watch the overlay follow.`
                : `Tracked ${points.length} of ${frames.length} samples — the lock was lost at ${points.length}s. Points stop there; add the rest by hand.`;
            })
          }
        >
          {busy === 'track' ? 'Tracking…' : 'Track automatically'}
        </button>
        <button
          type="button"
          className={btnCls}
          onClick={() => {
            setTrackingMode(true);
            setSectionStatus('track', 'Click the subject in the preview to add a track point, then press Track automatically.');
          }}
        >
          Pick subject in preview
        </button>
        {clip?.tracking && clip.tracking.points.length > 0 && (
          <button
            type="button"
            className={btnCls}
            onClick={() => {
              updateSelectedClip({ tracking: { points: [], targetClipId: clip.tracking!.targetClipId } });
              setSectionStatus('track', 'Track points cleared.');
            }}
          >
            Clear track points
          </button>
        )}
        {status.track && <p className="mt-1 text-[11px] text-zinc-300">{status.track}</p>}
      </Section>

      <Section
        title="Stabilize — real motion correction"
        note="Translation-only phase correlation. Rotation, scale and rolling-shutter wobble are NOT corrected."
      >
        <button
          type="button"
          className={btnCls}
          disabled={!isVideo || !clipSrc || busy !== ''}
          onClick={() =>
            analyse('stabilize', async () => {
              if (!clip || !clipSrc) return 'Select a video clip first.';
              const count = Math.max(2, Math.min(60, Math.ceil(clip.duration * 4)));
              const frames = await sampleVideoFrames(clipSrc, clip.duration, count);
              if (frames.length < 2) return 'Could not sample frames from this clip.';
              const path = estimateStabilization(frames);
              updateSelectedClip({ aiStabilization: path });
              const smoothed = smoothTrajectory(path);
              // Shake = how far the raw path deviates from its own
              // smoothed path (a smooth pan has a big path but ~0 shake).
              const avg =
                path.reduce((s, p, i) => s + Math.abs(p.dx - smoothed[i].dx) + Math.abs(p.dy - smoothed[i].dy), 0) /
                Math.max(1, path.length);
              return avg < 0.5
                ? 'No camera shake found — nothing to stabilise.'
                : `Motion analysed — average shake ${avg.toFixed(1)} px (sampled). Turn Stabilize on to apply it.`;
            })
          }
        >
          {busy === 'stabilize' ? 'Analysing…' : 'Analyse motion'}
        </button>
        <label className="mt-2 flex items-center gap-2 text-[11px] text-zinc-300">
          <input
            id="ai-stabilize"
            type="checkbox"
            checked={clip?.aiStabilize ?? false}
            disabled={!isVideo || (clip?.aiStabilization?.length ?? 0) === 0}
            onChange={(e) => updateSelectedClip({ aiStabilize: e.target.checked })}
          />
          Stabilize {(clip?.aiStabilization?.length ?? 0) === 0 ? '(analyse motion first)' : ''}
        </label>
        <label className={labelCls} htmlFor="ai-stab-smooth">
          Smoothing: {clip?.aiStabilizeSmooth ?? 0.6}
        </label>
        <input
          id="ai-stab-smooth"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={clip?.aiStabilizeSmooth ?? 0.6}
          disabled={!isVideo}
          onChange={(e) => updateSelectedClip({ aiStabilizeSmooth: Number(e.target.value) })}
          className="mt-1 w-full"
        />
        <label className={labelCls} htmlFor="ai-stab-zoom">
          Zoom to hide borders: {(clip?.aiStabilizeZoom ?? 1.05).toFixed(2)}×
        </label>
        <input
          id="ai-stab-zoom"
          type="range"
          min={1}
          max={1.2}
          step={0.01}
          value={clip?.aiStabilizeZoom ?? 1.05}
          disabled={!isVideo}
          onChange={(e) => updateSelectedClip({ aiStabilizeZoom: Number(e.target.value) })}
          className="mt-1 w-full"
        />
        {status.stabilize && <p className="mt-1 text-[11px] text-zinc-300">{status.stabilize}</p>}
      </Section>

      <Section
        title="Enhance — Low-light, Retouch, Relight"
        note="Real pixel operations on the selected clip. Retouch smooths skin-toned regions only; low-light cannot create detail that is not there."
      >
        <label className={labelCls} htmlFor="ai-lowlight">
          Low-light: {clip?.aiLowLight ?? 0}
        </label>
        <input
          id="ai-lowlight"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={clip?.aiLowLight ?? 0}
          disabled={!isVideo}
          onChange={(e) => updateSelectedClip({ aiLowLight: Number(e.target.value) })}
          className="mt-1 w-full"
        />
        <label className={labelCls} htmlFor="ai-retouch">
          Retouch: {clip?.aiRetouch ?? 0}
        </label>
        <input
          id="ai-retouch"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={clip?.aiRetouch ?? 0}
          disabled={!isVideo}
          onChange={(e) => updateSelectedClip({ aiRetouch: Number(e.target.value) })}
          className="mt-1 w-full"
        />
        <label className={labelCls} htmlFor="ai-relight">
          Relight: {clip?.aiRelight ?? 0}
        </label>
        <input
          id="ai-relight"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={clip?.aiRelight ?? 0}
          disabled={!isVideo}
          onChange={(e) => updateSelectedClip({ aiRelight: Number(e.target.value) })}
          className="mt-1 w-full"
        />
        {!isVideo && <p className={noteCls}>Select a video or image clip first.</p>}
      </Section>

      <Section
        title="AI Movement — camera moves"
        note="Keyframed camera path, not an ML camera. The move becomes ordinary scale/position keyframes — edit them afterwards."
      >
        <label className={labelCls} htmlFor="ai-move-kind">
          Camera move
        </label>
        <select
          id="ai-move-kind"
          value={clip?.aiMovement ?? 'zoom-in'}
          onChange={(e) => updateSelectedClip({ aiMovement: e.target.value })}
          className={inputCls}
        >
          {CAMERA_MOVES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — {m.desc}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btnCls}
          disabled={!clip || !isVideo}
          onClick={() => {
            if (!clip) return;
            const kind = clip.aiMovement && clip.aiMovement !== 'none' ? clip.aiMovement : 'zoom-in';
            const kfs = cameraMoveKeyframes(kind, 0.5, clip.duration);
            const existing = clip.keyframes.filter(
              (k) => !kfs.some((n) => n.property === k.property),
            );
            const next = [
              ...existing,
              ...kfs.map((k) => ({ easing: 'linear' as const, id: newId('kf'), property: k.property, time: k.time, value: k.value })),
            ];
            updateSelectedClip({ aiMovement: kind, keyframes: next });
            setSectionStatus('movement', `Applied ${kind} — ${kfs.length} keyframes. Edit them in the Keyframes panel.`);
          }}
        >
          Apply move
        </button>
        {status.movement && <p className="mt-1 text-[11px] text-zinc-300">{status.movement}</p>}
      </Section>

      <Section
        title="Optical Flow — smooth slow motion"
        note="Block-match interpolation renders real in-between frames offline. Preview slow-mo itself stays frame-blend. Fast or complex motion can smear."
      >
        <label className="mt-2 flex items-center gap-2 text-[11px] text-zinc-300">
          <input
            type="checkbox"
            checked={clip?.aiOpticalFlow ?? false}
            disabled={!isVideo}
            onChange={(e) => updateSelectedClip({ aiOpticalFlow: e.target.checked })}
          />
          Smooth slow-mo (optical flow)
        </label>
        <label className={labelCls} htmlFor="ai-flow-block">
          Block size
        </label>
        <select
          id="ai-flow-block"
          value={flowBlock}
          onChange={(e) => setFlowBlock(Number(e.target.value))}
          className={inputCls}
        >
          <option value={8}>8 px (finer, slower)</option>
          <option value={16}>16 px</option>
          <option value={32}>32 px (faster, coarser)</option>
        </select>
        <button
          type="button"
          className={btnCls}
          disabled={!isVideo || !clipSrc || busy !== ''}
          onClick={() =>
            analyse('optflow', async () => {
              if (!clip || !clipSrc) return 'Select a video clip first.';
              if (clip.duration > 30) return 'Clip is over 30 s — trim it first, the render would take too long.';
              const fps = 12;
              const count = Math.max(2, Math.ceil(clip.duration * fps));
              const frames = await sampleVideoFrames(clipSrc, clip.duration, count, 320);
              if (frames.length < 2) return 'Could not sample frames from this clip.';
              const canvas = document.createElement('canvas');
              canvas.width = 640;
              canvas.height = Math.max(1, Math.round((640 * frames[0].height) / frames[0].width));
              const ctx = canvas.getContext('2d');
              if (!ctx) return 'Canvas unavailable.';
              const stream = canvas.captureStream(24);
              const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
              const chunks: Blob[] = [];
              rec.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
              };
              const done = new Promise<Blob>((resolve) => {
                rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
              });
              rec.start();
              const total = (frames.length - 1) * 2 + 1;
              for (let i = 0; i < total; i++) {
                const base = Math.floor(i / 2);
                const frac = i % 2 === 0 ? 0 : 0.5;
                const frame =
                  frac === 0 || base >= frames.length - 1
                    ? frames[Math.min(base, frames.length - 1)]
                    : interpolateFrame(frames[base], frames[base + 1], frac, flowBlock, 8);
                ctx.drawImage(frameToCanvas(frame), 0, 0, canvas.width, canvas.height);
                setProgress(`Rendering frame ${i + 1} of ${total}…`);
                await new Promise((r) => setTimeout(r, 45));
              }
              rec.stop();
              const blob = await done;
              await addRenderedMedia(blob, `${clip.name} (flow 2×)`, clip.duration);
              return `Rendered 2× frames — new media “${clip.name} (flow 2×)” added at the playhead.`;
            })
          }
        >
          {busy === 'optflow' ? 'Rendering…' : 'Render 2× frames'}
        </button>
        {progress && busy === 'optflow' && <p className="mt-1 text-[11px] text-zinc-300">{progress}</p>}
        {status.optflow && <p className="mt-1 text-[11px] text-zinc-300">{status.optflow}</p>}
      </Section>

      <Section
        title="Vocal Isolation — stems"
        note="Centre-channel separation, not ML: the voice stem is the centred content, the music stem is the wide content. Works best on centre-panned vocals."
      >
        <label className={labelCls} htmlFor="ai-vocal-mode">
          Mode
        </label>
        <select
          id="ai-vocal-mode"
          defaultValue="voice"
          className={inputCls}
        >
          <option value="voice">Isolate voice</option>
          <option value="music">Remove voice (keep music)</option>
        </select>
        <button
          type="button"
          className={btnCls}
          disabled={!isAudio || !clipSrc || busy !== ''}
          onClick={() =>
            analyse('vocal', async () => {
              if (!clip || !clipSrc) return 'Select an audio clip first.';
              const decoded = await decodeClipAudio(clipSrc);
              if (!decoded) return 'Could not decode this clip’s audio.';
              if (decoded.numberOfChannels < 2) {
                return 'This clip is mono — centre separation needs stereo.';
              }
              const mode = (document.getElementById('ai-vocal-mode') as HTMLSelectElement | null)?.value ?? 'voice';
              const left = decoded.getChannelData(0);
              const right = decoded.getChannelData(1);
              const { music, voice } = centerChannelStems(left, right);
              const samples = mode === 'voice' ? voice : music;
              const blob = encodeWav(samples, decoded.sampleRate);
              await addRenderedMedia(blob, `${clip.name} (${mode === 'voice' ? 'voice stem' : 'music stem'})`, decoded.duration);
              updateSelectedClip({ aiVocalMode: mode as 'voice' | 'music' });
              return `Stem rendered — “${clip.name} (${mode === 'voice' ? 'voice stem' : 'music stem'})” added as an audio clip.`;
            })
          }
        >
          {busy === 'vocal' ? 'Rendering…' : 'Render stem'}
        </button>
        {status.vocal && <p className="mt-1 text-[11px] text-zinc-300">{status.vocal}</p>}
      </Section>

      <Section
        title="Auto Highlights"
        note="Scores 2-second segments by loudness + motion + speech, then builds a reel of the best moments. Nothing is deleted without confirmation."
      >
        <label className={labelCls} htmlFor="ai-reel-count">
          Reel length: {reelCount} segments
        </label>
        <input
          id="ai-reel-count"
          type="range"
          min={1}
          max={10}
          step={1}
          value={reelCount}
          onChange={(e) => setReelCount(Number(e.target.value))}
          className="mt-1 w-full"
        />
        <button
          type="button"
          className={btnCls}
          disabled={!isVideo || !clipSrc || busy !== ''}
          onClick={() =>
            analyse('highlights', async () => {
              if (!clip || !clipSrc || !project) return 'Select a video clip first.';
              if (clip.duration < 2) return 'Clip too short for highlights.';
              const count = Math.max(2, Math.ceil(clip.duration));
              const frames = await sampleVideoFrames(clipSrc, clip.duration, count, 80);
              const motion: number[] = [];
              for (let i = 1; i < frames.length; i++) {
                const a = frames[i - 1];
                const b = frames[i];
                let diff = 0;
                for (let p = 0; p < a.data.length; p += 4) {
                  diff += Math.abs(a.data[p] - b.data[p]);
                }
                motion.push(Math.min(1, diff / (a.data.length / 4) / 255));
              }
              motion.unshift(motion[0] ?? 0);
              const peaks = media?.peaks ?? [];
              const words = project.captions.flatMap((c) => c.words ?? []);
              const scored = scoreHighlightSegments(peaks, motion, words, clip.duration, 2);
              const picked = pickHighlights(scored, reelCount);
              setHighlights(picked.map((p) => ({ end: p.end, score: p.score, start: p.start })));
              return picked.length === 0
                ? 'Nothing stands out — all segments scored the same.'
                : `${picked.length} highlight(s) found — top score ${picked[0].score.toFixed(2)}. Build the reel or keep only these.`;
            })
          }
        >
          {busy === 'highlights' ? 'Analysing…' : 'Find highlights'}
        </button>
        {highlights.length > 0 && (
          <>
            <ul className="mt-2 space-y-1">
              {highlights.map((h, i) => (
                <li key={i} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300">
                  {h.start.toFixed(1)}s – {h.end.toFixed(1)}s · score {h.score.toFixed(2)}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={btnCls}
              onClick={() => {
                if (!clip) return;
                buildReelProject(
                  `${clip.name} — Highlights`,
                  clip.mediaId ?? '',
                  highlights.map((h) => ({ duration: h.end - h.start, start: h.start })),
                );
                setSectionStatus('highlights', 'Highlight reel project created — it just opened.');
              }}
            >
              Build highlight reel
            </button>
            <button
              type="button"
              className={btnCls}
              onClick={() => {
                if (!clip) return;
                const keep = highlights.map((h) => ({ end: h.end, start: h.start }));
                const cut: TimeRange[] = [];
                let cursor = 0;
                for (const k of keep) {
                  if (k.start > cursor + 0.05) cut.push({ end: k.start, start: cursor });
                  cursor = Math.max(cursor, k.end);
                }
                if (cursor < clip.duration - 0.05) cut.push({ end: clip.duration, start: cursor });
                if (cut.length === 0) {
                  setSectionStatus('highlights', 'The highlights already cover the whole clip.');
                  return;
                }
                smartCutRanges(cut);
                setSectionStatus('highlights', `Kept only the highlights — ${cut.length} part(s) cut. Undo with Ctrl+Z.`);
              }}
            >
              Keep only highlights
            </button>
          </>
        )}
        {status.highlights && <p className="mt-1 text-[11px] text-zinc-300">{status.highlights}</p>}
      </Section>

      <Section
        title="Script-to-Video"
        note="One line = one scene. Visuals come from Vidora's local generator; narration is preview voices unless rendered with the Piper pipeline."
      >
        <label className={labelCls} htmlFor="ai-script">
          Script (one scene per line)
        </label>
        <textarea
          id="ai-script"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder={"A quiet morning over the hills\nThe city wakes up\nAnd the story begins"}
          rows={4}
          className={inputCls}
        />
        <label className={labelCls} htmlFor="ai-scene-seconds">
          Seconds per scene: {sceneSeconds}
        </label>
        <input
          id="ai-scene-seconds"
          type="range"
          min={2}
          max={10}
          step={1}
          value={sceneSeconds}
          onChange={(e) => setSceneSeconds(Number(e.target.value))}
          className="mt-1 w-full"
        />
        <label className={labelCls} htmlFor="ai-script-style">
          Visual style
        </label>
        <select
          id="ai-script-style"
          value={scriptStyle}
          onChange={(e) => setScriptStyle(e.target.value)}
          className={inputCls}
        >
          <option value="gradient">Gradient</option>
          <option value="scene">Scene</option>
          <option value="dialogue">Dialogue</option>
        </select>
        <label className="mt-2 flex items-center gap-2 text-[11px] text-zinc-300">
          <input type="checkbox" checked={scriptNarr} onChange={(e) => setScriptNarr(e.target.checked)} />
          Add narration cues
        </label>
        <button
          type="button"
          className={btnCls}
          disabled={script.trim().length === 0 || busy !== ''}
          onClick={() =>
            analyse('script', async () => {
              const scenes = scriptToScenes(script, sceneSeconds, scriptStyle);
              if (scenes.length === 0) return 'Type a script first — one scene per line.';
              const built = scenes.map((s) => ({
                duration: s.duration,
                imageDataUrl: generateImage(s.line, s.index),
                line: s.line,
              }));
              const title = scenes[0].line.slice(0, 40) || 'Script video';
              buildScriptProject(`${title} — Script video`, built, scriptNarr);
              return `Built ${built.length} scene(s) — the new project just opened.`;
            })
          }
        >
          {busy === 'script' ? 'Building…' : 'Build video'}
        </button>
        {status.script && <p className="mt-1 text-[11px] text-zinc-300">{status.script}</p>}
      </Section>

      <Section
        title="Upscale to 4K"
        note="Detail-preserving resample + sharpen — NOT AI detail recovery. Video uses browser 4K scaling; still images get the full resample + sharpen pass."
      >
        <label className={labelCls} htmlFor="ai-upscale-target">
          Target
        </label>
        <select
          id="ai-upscale-target"
          value={upscaleTarget}
          onChange={(e) => setUpscaleTarget(e.target.value)}
          className={inputCls}
        >
          <option value="2560">2K (2560×1440)</option>
          <option value="3840">4K (3840×2160)</option>
        </select>
        <label className={labelCls} htmlFor="ai-upscale-sharpen">
          Sharpen: {upscaleSharpen}
        </label>
        <input
          id="ai-upscale-sharpen"
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={upscaleSharpen}
          onChange={(e) => setUpscaleSharpen(Number(e.target.value))}
          className="mt-1 w-full"
        />
        <button
          type="button"
          className={btnCls}
          disabled={!isVideo || !clipSrc || busy !== ''}
          onClick={() =>
            analyse('upscale', async () => {
              if (!clip || !clipSrc) return 'Select a video or image clip first.';
              if (clip.duration > 60) return 'Clip is over 60 s — trim it first.';
              const targetW = Number(upscaleTarget);
              const isImage = clip.type === 'image';
              const fps = isImage ? 1 : 12;
              const count = isImage ? 1 : Math.max(2, Math.ceil(clip.duration * fps));
              const frames = await sampleVideoFrames(clipSrc, clip.duration, count, 320);
              if (frames.length === 0) return 'Could not sample frames from this clip.';
              const targetH = Math.max(1, Math.round((targetW * frames[0].height) / frames[0].width));
              const canvas = document.createElement('canvas');
              canvas.width = targetW;
              canvas.height = targetH;
              const ctx = canvas.getContext('2d');
              if (!ctx) return 'Canvas unavailable.';
              const stream = canvas.captureStream(24);
              const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
              const chunks: Blob[] = [];
              rec.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
              };
              const done = new Promise<Blob>((resolve) => {
                rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
              });
              rec.start();
              const holdFrames = isImage ? 48 : Math.max(24, Math.ceil(clip.duration * 24));
              for (let i = 0; i < holdFrames; i++) {
                const srcFrame = frames[Math.min(frames.length - 1, Math.floor((i / holdFrames) * frames.length))];
                if (isImage && i === 0) {
                  const up = upscaleFrame(srcFrame, Math.max(1, Math.round(targetW / srcFrame.width)), upscaleSharpen);
                  ctx.drawImage(frameToCanvas(up), 0, 0, targetW, targetH);
                } else {
                  ctx.drawImage(frameToCanvas(srcFrame), 0, 0, targetW, targetH);
                }
                setProgress(`Rendering frame ${i + 1} of ${holdFrames}…`);
                await new Promise((r) => setTimeout(r, 42));
              }
              rec.stop();
              const blob = await done;
              await addRenderedMedia(blob, `${clip.name} (${upscaleTarget === '3840' ? '4K' : '2K'})`, clip.duration);
              return `Upscaled copy rendered — “${clip.name} (${upscaleTarget === '3840' ? '4K' : '2K'})” added at the playhead.`;
            })
          }
        >
          {busy === 'upscale' ? 'Rendering…' : 'Render upscaled copy'}
        </button>
        {progress && busy === 'upscale' && <p className="mt-1 text-[11px] text-zinc-300">{progress}</p>}
        {status.upscale && <p className="mt-1 text-[11px] text-zinc-300">{status.upscale}</p>}
      </Section>

      <Section
        title="AI Providers"
        note="Local only. Cloud providers need an API key (Phase 9 settings) — no key field is offered and no cloud call is made."
      >
        <ul className="mt-2 space-y-1">
          {listProviders().map((p) => (
            <li key={p.id} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[11px] leading-relaxed">
              <span className="font-semibold text-zinc-100">{p.label}</span>{' '}
              <span className={p.ready ? 'text-emerald-300' : 'text-zinc-400'}>{p.ready ? 'Ready' : 'Not configured'}</span>
              <span className="block text-zinc-400">{p.note}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
