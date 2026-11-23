import { useProjectStore } from '../store/projectStore';
import { formatDb } from '../lib/audio';

/**
 * Audio mixer (Phase 4, SPEC J — J-MIXER).
 * Shown in the right Properties panel when no clip is selected.
 * The reference has no mixer panel; this follows the standard mixer
 * shape (master fader + one strip per audio-bearing track).
 */
export default function MixerPanel() {
  const project = useProjectStore((s) => s.project);
  const setMixer = useProjectStore((s) => s.setMixer);
  const setTrackProp = useProjectStore((s) => s.setTrackProp);

  if (!project) return null;
  const mixer = project.mixer;
  const audioTracks = project.tracks.filter((t) => t.kind === 'audio' || t.clips.some((c) => c.type === 'video' || c.type === 'audio'));
  const soloActive = project.tracks.some((t) => t.solo);

  return (
    <div>
      <h2 className="text-sm font-semibold">Mixer</h2>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
        Master volume and per-track levels. Changes apply live during playback.
      </p>

      <label className="mt-3 block text-xs">
        <span className="flex items-center justify-between text-zinc-400">
          <span>Master volume</span>
          <span className="font-mono">{formatDb(mixer.masterVolume)}</span>
        </span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={mixer.masterVolume}
          onChange={(e) => setMixer({ masterVolume: Number(e.target.value) })}
          aria-label="Master volume"
          className="mt-1 w-full"
        />
      </label>

      <label className="mt-3 flex items-center gap-2 text-xs" title="Music clips drop in volume while any voice is sounding">
        <input type="checkbox" checked={mixer.ducking} onChange={(e) => setMixer({ ducking: e.target.checked })} />
        Duck music under speech
      </label>
      {mixer.ducking && (
        <label className="mt-2 block text-xs">
          <span className="flex items-center justify-between text-zinc-400">
            <span>Duck amount</span>
            <span className="font-mono">−{mixer.duckAmountDb} dB</span>
          </span>
          <input
            type="range"
            min={0}
            max={24}
            step={1}
            value={mixer.duckAmountDb}
            onChange={(e) => setMixer({ duckAmountDb: Number(e.target.value) })}
            aria-label="Duck amount"
            className="mt-1 w-full"
          />
        </label>
      )}

      <section className="mt-4 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Tracks</h3>
        {audioTracks.length === 0 ? (
          <p className="mt-1 text-xs text-zinc-500">No audio tracks yet — import audio or add a video clip.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {audioTracks.map((track) => (
              <li key={track.id} className="rounded-md border border-zinc-800 bg-zinc-900 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium" title={track.name}>{track.name}</span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setTrackProp(track.id, { muted: !track.muted })}
                      aria-label={track.muted ? `Unmute track ${track.name}` : `Mute track ${track.name}`}
                      aria-pressed={track.muted}
                      title={track.muted ? 'Unmute track' : 'Mute track'}
                      className={`rounded border px-1.5 py-0.5 text-[11px] ${track.muted ? 'border-red-500 bg-red-600/20' : 'border-zinc-700'}`}
                    >
                      {track.muted ? '🔇' : '🔊'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrackProp(track.id, { solo: !track.solo })}
                      aria-label={track.solo ? `Unsolo track ${track.name}` : `Solo track ${track.name}`}
                      aria-pressed={track.solo}
                      title={track.solo ? 'Unsolo track' : 'Solo track (only soloed tracks sound)'}
                      className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${track.solo ? 'border-amber-500 bg-amber-600/20 text-amber-300' : 'border-zinc-700'}`}
                    >
                      S
                    </button>
                  </span>
                </div>
                <label className="mt-1 block text-xs">
                  <span className="flex items-center justify-between text-zinc-400">
                    <span>Volume</span>
                    <span className="font-mono">{formatDb(track.volume)}</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={track.volume}
                    onChange={(e) => setTrackProp(track.id, { volume: Number(e.target.value) })}
                    aria-label={`Volume for track ${track.name}`}
                    className="mt-1 w-full"
                  />
                </label>
                {soloActive && !track.solo && <p className="mt-1 text-[11px] text-zinc-500">Soloed out — another track is soloed.</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
