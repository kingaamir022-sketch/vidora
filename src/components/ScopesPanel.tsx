import { useRef, useState } from 'react';
import { computeHistogram, computeVectorscope, computeWaveform, frameExposure } from '../lib/scopes';

/** Scopes (Phase 2, SPEC F). Reads the current preview frame and draws
 * real waveform / vectorscope / histogram from its pixels. */
export default function ScopesPanel() {
  const histRef = useRef<HTMLCanvasElement>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);
  const vecRef = useRef<HTMLCanvasElement>(null);
  const [info, setInfo] = useState<string>('Capture the current preview frame to draw its scopes.');
  const [captured, setCaptured] = useState(false);

  const capture = () => {
    const canvas = document.getElementById('vidora-export-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      setInfo('Preview canvas not found.');
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setInfo('Could not read the preview canvas.');
      return;
    }
    let data: ImageData;
    try {
      data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch {
      setInfo('This frame cannot be read (cross-origin media). Import a local file to scope it.');
      return;
    }
    const hist = computeHistogram(data.data);
    const wave = computeWaveform(data.data, canvas.width, canvas.height, 64);
    const vec = computeVectorscope(data.data, 32);
    const exp = frameExposure(data.data);

    const hctx = histRef.current?.getContext('2d');
    if (hctx && histRef.current) {
      const w = histRef.current.width;
      const h = histRef.current.height;
      hctx.clearRect(0, 0, w, h);
      const max = Math.max(1, ...hist.r, ...hist.g, ...hist.b);
      (['r', 'g', 'b'] as const).forEach((ch, ci) => {
        hctx.fillStyle = ['#f87171', '#4ade80', '#60a5fa'][ci];
        hctx.globalAlpha = 0.7;
        for (let x = 0; x < 256; x += 1) {
          const bh = (hist[ch][x] / max) * h;
          hctx.fillRect((x / 256) * w, h - bh, w / 256 + 1, bh);
        }
      });
      hctx.globalAlpha = 1;
    }
    const wctx = waveRef.current?.getContext('2d');
    if (wctx && waveRef.current) {
      const w = waveRef.current.width;
      const h = waveRef.current.height;
      wctx.clearRect(0, 0, w, h);
      wctx.fillStyle = '#34d399';
      for (let c = 0; c < wave.min.length; c += 1) {
        const x = (c / wave.min.length) * w;
        const y0 = h - (wave.max[c] / 255) * h;
        const y1 = h - (wave.min[c] / 255) * h;
        wctx.fillRect(x, y0, w / wave.min.length + 1, Math.max(1, y1 - y0));
      }
    }
    const vctx = vecRef.current?.getContext('2d');
    if (vctx && vecRef.current) {
      const w = vecRef.current.width;
      const h = vecRef.current.height;
      vctx.clearRect(0, 0, w, h);
      const max = Math.max(1, ...vec.flat());
      for (let y = 0; y < vec.length; y += 1) {
        for (let x = 0; x < vec[y].length; x += 1) {
          const v = vec[y][x] / max;
          if (v > 0.02) {
            vctx.fillStyle = `rgba(139,92,246,${Math.min(1, v * 3).toFixed(2)})`;
            vctx.fillRect((x / vec.length) * w, (y / vec.length) * h, w / vec.length + 1, h / vec.length + 1);
          }
        }
      }
    }
    setInfo(
      `Avg luma ${(exp.avgLuma * 100).toFixed(0)}% · clipped black ${(exp.clippedBlack * 100).toFixed(1)}% · clipped white ${(exp.clippedWhite * 100).toFixed(1)}%`,
    );
    setCaptured(true);
  };

  return (
    <section className="space-y-2 border-t border-zinc-800 pt-3">
      <h3 className="text-xs font-semibold text-zinc-300">Scopes</h3>
      <button type="button" onClick={capture} className="w-full rounded-md border border-zinc-700 px-2 py-1 text-[11px]">
        Capture frame scopes
      </button>
      <p className="text-[11px] text-zinc-500">{info}</p>
      {captured && (
        <div className="space-y-2">
          <div>
            <p className="text-[11px] text-zinc-400">Histogram</p>
            <canvas ref={histRef} width={240} height={64} className="w-full rounded border border-zinc-800 bg-black" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-400">Waveform (luma)</p>
            <canvas ref={waveRef} width={240} height={64} className="w-full rounded border border-zinc-800 bg-black" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-400">Vectorscope</p>
            <canvas ref={vecRef} width={120} height={120} className="rounded border border-zinc-800 bg-black" />
          </div>
        </div>
      )}
    </section>
  );
}
