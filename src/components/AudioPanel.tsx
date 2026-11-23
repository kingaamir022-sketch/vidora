import { useMemo, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { findClip } from '../lib/timeline';
import {
  ORIGINAL_LOOPS,
  ORIGINAL_SFX,
  detectBeats,
  playPreview,
  renderOriginal,
  startVoiceoverRecording,
  type OriginalRecipe,
  type VoiceoverRecorder,
} from '../lib/audio';
import { formatDuration } from '../lib/media';
import { newId } from '../schema/project';
import type { MediaItem } from '../schema/project';

/**
 * Audio panel (Phase 4, SPEC J — J-AUDIO, J-BEAT, J-VOICEOVER).
 * Reference: signed-in CapCut Web walkthrough — Music / Sound effects
 * sub-tabs, search box, suggestion chips, Categories with "View all",
 * Recommended lists (cover, title, duration, author) with play + "+"
 * add buttons. Vidora's tracks are ORIGINAL: procedural loops/SFX
 * synthesized in-browser (src/lib/audio.ts) plus the user's imported
 * audio. No reference track/sound names are used anywhere.
 */
const MUSIC_CHIPS = ['calm', 'electronic', 'ambient', 'pop', 'beat', 'happy'];
const SFX_CHIPS = ['ui', 'whoosh', 'impact', 'magic', 'transition', 'bell'];

function swatchFor(id: string): string {
  const palette = ['#7C3AED', '#06B6D4', '#F59E0B', '#10B981', '#EF4444', '#EC4899'];
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % palette.length;
  return palette[h];
}

export default function AudioPanel() {
  const project = useProjectStore((s) => s.project);
  const selectedClipIds = useProjectStore((s) => s.selectedClipIds);
  const addMediaItem = useProjectStore((s) => s.addMediaItem);
  const addAudioClip = useProjectStore((s) => s.addAudioClip);
  const addBeatMarkers = useProjectStore((s) => s.addBeatMarkers);
  const splitSelectedAtTimes = useProjectStore((s) => s.splitSelectedAtTimes);
  const addVoiceoverClip = useProjectStore((s) => s.addVoiceoverClip);
  const selectClip = useProjectStore((s) => s.selectClip);

  const [subTab, setSubTab] = useState<'music' | 'sfx'>('music');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [showCategories, setShowCategories] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [renderingId, setRenderingId] = useState<string | null>(null);
  const [beatInfo, setBeatInfo] = useState<{ bpm: number | null; times: number[] } | null>(null);
  const [beatError, setBeatError] = useState<string | null>(null);
  const [voState, setVoState] = useState<'idle' | 'requesting' | 'recording' | 'error'>('idle');
  const [voError, setVoError] = useState<string | null>(null);
  const [voSeconds, setVoSeconds] = useState(0);
  const [voRecorder, setVoRecorder] = useState<VoiceoverRecorder | null>(null);
  const [voTimer, setVoTimer] = useState<number | null>(null);

  const originals: OriginalRecipe[] = subTab === 'music' ? ORIGINAL_LOOPS : ORIGINAL_SFX;
  const importedAudio: MediaItem[] = useMemo(
    () => (project?.media ?? []).filter((m) => m.kind === 'audio'),
    [project?.media],
  );
  const categories = useMemo(() => ['All', ...Array.from(new Set(originals.map((o) => o.category)))], [originals]);
  const chips = subTab === 'music' ? MUSIC_CHIPS : SFX_CHIPS;

  const matches = (name: string, tags: string[], cat: string) => {
    const q = query.trim().toLowerCase();
    if (category !== 'All' && cat !== category) return false;
    if (!q) return true;
    return name.toLowerCase().includes(q) || tags.some((t) => t.toLowerCase().includes(q));
  };
  const filteredOriginals = originals.filter((o) => matches(o.name, o.tags, o.category));
  const filteredImported = importedAudio.filter((m) => matches(m.name, [], 'All'));

  const selectedClip = project && selectedClipIds.length > 0 ? findClip(project, selectedClipIds[0])?.clip ?? null : null;
  const selectedMedia = selectedClip?.mediaId ? project?.media.find((m) => m.id === selectedClip.mediaId) ?? null : null;
  const canBeat = Boolean(selectedClip && selectedClip.type === 'audio' && selectedMedia?.peaks && selectedMedia.peaks.length >= 8);

  const previewOriginal = async (recipe: OriginalRecipe) => {
    setRenderingId(recipe.id);
    try {
      const rendered = await renderOriginal(recipe);
      const started = playPreview(rendered.url);
      setPlayingId(started ? recipe.id : null);
    } catch {
      // Rendering unavailable in this environment — nothing to preview.
    } finally {
      setRenderingId(null);
    }
  };

  const togglePreview = (id: string, src: string) => {
    const started = playPreview(src);
    setPlayingId(started ? id : null);
  };

  const addOriginal = async (recipe: OriginalRecipe) => {
    setRenderingId(recipe.id);
    try {
      const rendered = await renderOriginal(recipe);
      const item: MediaItem = {
        createdAt: new Date().toISOString(),
        duration: rendered.duration,
        folderId: 'folder-all',
        id: newId('media'),
        kind: 'audio',
        mime: 'audio/wav',
        name: recipe.name,
        peakLevel: rendered.peakLevel,
        peaks: rendered.peaks,
        size: rendered.blob.size,
        src: rendered.url,
      };
      addMediaItem(item);
      addAudioClip(item.id);
    } catch {
      // OfflineAudioContext unavailable (e.g. headless test env) — the row stays usable.
    } finally {
      setRenderingId(null);
    }
  };

  const detectBeatsForSelected = () => {
    setBeatError(null);
    if (!canBeat || !selectedClip || !selectedMedia?.peaks) {
      setBeatError('Select an audio clip with a waveform first.');
      return;
    }
    const result = detectBeats(selectedMedia.peaks, selectedClip.duration);
    if (result.times.length === 0) {
      setBeatError('No clear beats found in this clip.');
      setBeatInfo(null);
      return;
    }
    setBeatInfo(result);
  };

  const startRecording = async () => {
    setVoError(null);
    setVoState('requesting');
    try {
      const recorder = await startVoiceoverRecording();
      setVoRecorder(recorder);
      setVoSeconds(0);
      setVoState('recording');
      const startedAt = Date.now();
      const timer = window.setInterval(() => setVoSeconds(Math.floor((Date.now() - startedAt) / 1000)), 500);
      setVoTimer(timer);
    } catch (e) {
      setVoError((e as Error).message);
      setVoState('error');
    }
  };

  const stopRecording = async () => {
    if (!voRecorder) return;
    const seconds = voSeconds;
    const recorder = voRecorder;
    if (voTimer !== null) {
      window.clearInterval(voTimer);
      setVoTimer(null);
    }
    setVoRecorder(null);
    setVoState('idle');
    const blob = await recorder.stop();
    if (seconds < 1 && blob.size < 1000) {
      setVoError('Recording too short — nothing saved.');
      return; // too short — nothing saved
    }
    const stamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
    await addVoiceoverClip(blob, `Voiceover ${stamp}`, Math.max(1, seconds));
  };

  const row = (
    id: string,
    name: string,
    duration: number | undefined,
    author: string,
    onPlay: () => void,
    onAdd: () => void,
    adding?: boolean,
  ) => (
    <li key={id} className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white" style={{ backgroundColor: swatchFor(id) }} aria-hidden="true">
        ♪
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{name}</span>
        <span className="block text-[10px] text-zinc-500">
          {duration !== undefined ? formatDuration(duration) : '—'} · {author}
        </span>
      </span>
      <button type="button" onClick={onPlay} aria-label={playingId === id ? `Stop preview ${name}` : `Preview ${name}`} className="rounded border border-zinc-700 px-1.5 py-0.5 text-[11px]" title={playingId === id ? 'Stop preview' : 'Preview'}>
        {playingId === id ? '■' : '▶'}
      </button>
      <button type="button" onClick={onAdd} disabled={adding} aria-label={`Add ${name} to timeline`} className="rounded border border-zinc-700 px-1.5 py-0.5 text-[11px] disabled:opacity-50" title="Add to timeline">
        {adding ? '…' : '+'}
      </button>
    </li>
  );

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4 text-zinc-100" aria-label="Audio panel">
      <h2 className="text-sm font-semibold">Audio</h2>

      <div className="mt-2 flex gap-1" role="tablist" aria-label="Audio library">
        {(['music', 'sfx'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={subTab === t}
            onClick={() => { setSubTab(t); setQuery(''); setCategory('All'); setBeatInfo(null); }}
            className={`flex-1 rounded-md border px-2 py-1 text-xs ${subTab === t ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
          >
            {t === 'music' ? 'Music' : 'Sound effects'}
          </button>
        ))}
      </div>

      <label className="mt-2 block">
        <span className="sr-only">{subTab === 'music' ? 'Search music' : 'Search sound effects'}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={subTab === 'music' ? 'Search music' : 'Search sound effects'}
          aria-label={subTab === 'music' ? 'Search music' : 'Search sound effects'}
          className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
        />
      </label>

      <div className="mt-2 flex flex-wrap gap-1">
        {chips.map((c) => (
          <button key={c} type="button" onClick={() => setQuery(c)} className="rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] hover:border-violet-500">
            {c}
          </button>
        ))}
      </div>

      <section className="mt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-300">Categories</h3>
          <button type="button" onClick={() => setShowCategories((v) => !v)} className="text-[11px] text-violet-400">
            {showCategories ? 'Hide' : 'View all'}
          </button>
        </div>
        {showCategories ? (
          <div className="mt-1 grid grid-cols-3 gap-1">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-md border px-2 py-1 text-[11px] ${category === c ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
              >
                {c}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-[11px] text-zinc-500">{category === 'All' ? 'All categories' : category}</p>
        )}
      </section>

      <section className="mt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Vidora Originals — {subTab === 'music' ? 'Music' : 'Sound effects'}</h3>
        <p className="mt-0.5 text-[11px] text-zinc-500">Synthesized in your browser. Original sounds, free to use in your videos.</p>
        {filteredOriginals.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">
            No tracks match “{query}”. <button type="button" className="text-violet-400" onClick={() => { setQuery(''); setCategory('All'); }}>Clear</button>
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {filteredOriginals.map((o) =>
              row(o.id, o.name, o.duration, 'Vidora Originals', () => previewOriginal(o), () => addOriginal(o), renderingId === o.id),
            )}
          </ul>
        )}
      </section>

      <section className="mt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Your imported audio</h3>
        {filteredImported.length === 0 ? (
          <p className="mt-1 text-xs text-zinc-500">No audio imported yet — import an audio file from Media.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {filteredImported.map((m) =>
              row(m.id, m.name, m.duration, 'Imported', () => togglePreview(m.id, m.src), () => addAudioClip(m.id)),
            )}
          </ul>
        )}
      </section>

      <section className="mt-4 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Voiceover</h3>
        {voState === 'recording' ? (
          <div className="mt-2 space-y-2">
            <p className="text-xs text-red-400">● Recording {String(Math.floor(voSeconds / 60)).padStart(2, '0')}:{String(voSeconds % 60).padStart(2, '0')}</p>
            <button type="button" onClick={stopRecording} className="w-full rounded-md border border-red-500 bg-red-600/20 px-2 py-1.5 text-xs">
              Stop and add to timeline
            </button>
          </div>
        ) : (
          <>
            <button type="button" onClick={startRecording} disabled={voState === 'requesting'} className="mt-2 w-full rounded-md border border-zinc-700 px-2 py-1.5 text-xs disabled:opacity-50">
              {voState === 'requesting' ? 'Asking for microphone…' : '● Record voiceover'}
            </button>
            {voState === 'error' && voError && <p className="mt-1 text-[11px] text-red-400">{voError}</p>}
            <p className="mt-1 text-[11px] text-zinc-500">Records from your microphone and adds the clip at the playhead.</p>
          </>
        )}
      </section>

      <section className="mt-4 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Tools</h3>
        <button
          type="button"
          onClick={detectBeatsForSelected}
          disabled={!canBeat}
          className="mt-2 w-full rounded-md border border-zinc-700 px-2 py-1.5 text-xs disabled:opacity-50"
          title={canBeat ? 'Detect beats in the selected audio clip' : 'Select an audio clip first'}
        >
          Detect beats
        </button>
        {beatError && <p className="mt-1 text-[11px] text-red-400">{beatError}</p>}
        {beatInfo && (
          <div className="mt-2 space-y-2 rounded-md border border-zinc-800 bg-zinc-900 p-2">
            <p className="text-[11px] text-zinc-400">
              {beatInfo.times.length} beats found{beatInfo.bpm ? ` (~${beatInfo.bpm} BPM estimate)` : ''}. Estimated from waveform energy — not true BPM analysis.
            </p>
            <div className="flex gap-1">
              <button type="button" onClick={() => addBeatMarkers(beatInfo.times)} className="flex-1 rounded-md border border-zinc-700 px-2 py-1 text-[11px]">
                Add beat markers
              </button>
              <button type="button" onClick={() => splitSelectedAtTimes(beatInfo.times)} className="flex-1 rounded-md border border-zinc-700 px-2 py-1 text-[11px]">
                Cut at beats
              </button>
            </div>
          </div>
        )}
        <button type="button" onClick={() => selectClip(null)} className="mt-2 w-full rounded-md border border-zinc-700 px-2 py-1.5 text-xs">
          Open mixer
        </button>
      </section>
    </div>
  );
}
