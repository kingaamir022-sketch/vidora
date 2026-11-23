import { useEffect, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { CAPTION_LANGUAGES, CAPTION_STYLE_PRESETS, captionStyleById } from '../lib/captions';
import { clampTtsRatePitch, pickVoice, voiceInfos, type TtsVoiceInfo } from '../lib/tts';

/**
 * Captions panel (Phase 3, SPEC I — I-CAPTION-AUTO/MANUAL/STYLE, I-SRT,
 * I-TRANSLATE, I-TTS, I-TRANSCRIPT).
 * Reference: desktop screenshot 26-editor-captions.png — "Auto
 * captions" button, Templates (Favorites/Trending/Classic/NEW/Hits/
 * Word), "Auto lyrics", bottom bar "Delete current captions" +
 * "Generate captions". Manual captions + .srt/.ass/.lrc upload are
 * supplemented from WEB-CHECK-2026-11-23 §4 (desktop is silent there).
 * All caption styles are ORIGINAL Vidora designs. (.ass import is not
 * supported — the panel says so; .srt/.vtt are.)
 */
export default function CaptionsPanel() {
  const project = useProjectStore((s) => s.project);
  const playhead = useProjectStore((s) => s.playhead);
  const setPlayhead = useProjectStore((s) => s.setPlayhead);
  const addCaptionCue = useProjectStore((s) => s.addCaptionCue);
  const updateCaptionCue = useProjectStore((s) => s.updateCaptionCue);
  const deleteCaptionCue = useProjectStore((s) => s.deleteCaptionCue);
  const deleteAllCaptions = useProjectStore((s) => s.deleteAllCaptions);
  const splitCaptionCueAtPlayhead = useProjectStore((s) => s.splitCaptionCueAtPlayhead);
  const setCaptionStyle = useProjectStore((s) => s.setCaptionStyle);
  const importCaptionsFile = useProjectStore((s) => s.importCaptionsFile);
  const exportCaptions = useProjectStore((s) => s.exportCaptions);
  const generateCaptionsFromTranscript = useProjectStore((s) => s.generateCaptionsFromTranscript);
  const translateCaptionCue = useProjectStore((s) => s.translateCaptionCue);
  const addTtsNarration = useProjectStore((s) => s.addTtsNarration);

  const [language, setLanguage] = useState('en');
  const [transcript, setTranscript] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const [translateLang, setTranslateLang] = useState('ur');
  const [translateDrafts, setTranslateDrafts] = useState<Record<string, string>>({});
  const [ttsText, setTtsText] = useState('');
  const [ttsVoice, setTtsVoice] = useState('');
  const [ttsRate, setTtsRate] = useState(1);
  const [ttsPitch, setTtsPitch] = useState(1);
  const [voices, setVoices] = useState<TtsVoiceInfo[]>([]);
  const [ttsNote, setTtsNote] = useState<string | null>(null);

  const cues = project?.captions ?? [];
  const activeStyleId = project?.captionStyleId ?? 'classic-box';
  const activeStyle = captionStyleById(activeStyleId);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => setVoices(voiceInfos(window.speechSynthesis.getVoices().map((v) => ({ lang: v.lang, localService: v.localService, name: v.name }))));
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const err = await importCaptionsFile(file);
    if (err) {
      setImportError(err);
      setImportInfo(null);
    } else {
      setImportError(null);
      setImportInfo(`Imported ${file.name}.`);
    }
  };

  const download = (format: 'srt' | 'vtt') => {
    const text = exportCaptions(format);
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name ?? 'captions'}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewTts = () => {
    if (!ttsText.trim()) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setTtsNote('Speech synthesis is not available in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(ttsText.trim());
    const voice = window.speechSynthesis.getVoices().find((v) => v.name === pickVoice(voices, ttsVoice));
    if (voice) utter.voice = voice;
    utter.rate = clampTtsRatePitch(ttsRate);
    utter.pitch = clampTtsRatePitch(ttsPitch);
    window.speechSynthesis.speak(utter);
    setTtsNote(null);
  };

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4 text-zinc-100" aria-label="Captions panel">
      <h2 className="text-sm font-semibold">Captions</h2>

      <section className="mt-3 space-y-2">
        <h3 className="text-xs font-semibold text-zinc-300">Auto captions</h3>
        <label className="flex items-center justify-between gap-2 text-xs">
          Language
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1" aria-label="Caption language">
            {CAPTION_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          <span className="text-zinc-400">Transcript (paste or type what is said)</span>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={3}
            placeholder="Type or paste the spoken words here…"
            aria-label="Transcript for auto captions"
            className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
          />
        </label>
        <button
          type="button"
          onClick={() => { if (transcript.trim()) { generateCaptionsFromTranscript(transcript, language); setTranscript(''); } }}
          disabled={!transcript.trim()}
          className="w-full rounded-md bg-gradient-to-r from-violet-600 to-cyan-500 px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          Generate captions
        </button>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Speech-to-text (Whisper) is Phase 7. This build times a transcript you paste: it spreads the words evenly across the selected clip (or the whole project) with word-level timing.
        </p>
      </section>

      <section className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Caption styles ({CAPTION_STYLE_PRESETS.length})</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {CAPTION_STYLE_PRESETS.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setCaptionStyle(style.id)}
              title={style.description}
              className={`rounded-md border px-2 py-1.5 text-left text-[11px] ${activeStyleId === style.id ? 'border-violet-500 bg-violet-600/20' : 'border-zinc-700'}`}
            >
              <span className="block rounded px-1 py-0.5 text-center font-semibold" style={{ background: style.background, color: style.color }}>
                {style.name}
              </span>
              <span className="mt-0.5 block text-zinc-500">{style.position} · {style.fontSize}px</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500">Active style: {activeStyle.name}. It applies to every cue unless a cue picks its own style.</p>
      </section>

      <section className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Manual captions ({cues.length})</h3>
        <div className="flex gap-2">
          <button type="button" onClick={addCaptionCue} className="flex-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs">Add cue at playhead</button>
          <button type="button" onClick={splitCaptionCueAtPlayhead} className="flex-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs" title="Split the cue under the playhead into two">
            Split cue at playhead
          </button>
        </div>
        {cues.length === 0 && <p className="text-[11px] text-zinc-500">No captions yet. Generate from a transcript, import a file, or add a cue.</p>}
        <div className="space-y-2">
          {cues.map((cue) => {
            const active = playhead >= cue.start && playhead < cue.end;
            return (
              <div key={cue.id} className={`rounded-md border p-2 text-xs ${active ? 'border-violet-500 bg-violet-600/10' : 'border-zinc-800 bg-zinc-900'}`}>
                <button type="button" onClick={() => setPlayhead(cue.start)} className="font-mono text-[11px] text-cyan-300" title="Seek to this cue">
                  {cue.start.toFixed(2)}s – {cue.end.toFixed(2)}s
                </button>
                <div className="mt-1 flex gap-1">
                  <input
                    type="number" min={0} step={0.1} value={cue.start}
                    onChange={(e) => updateCaptionCue(cue.id, { start: Number(e.target.value) })}
                    aria-label="Cue start seconds" className="w-16 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-[11px]"
                  />
                  <input
                    type="number" min={0} step={0.1} value={cue.end}
                    onChange={(e) => updateCaptionCue(cue.id, { end: Number(e.target.value) })}
                    aria-label="Cue end seconds" className="w-16 rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-[11px]"
                  />
                  <button type="button" onClick={() => deleteCaptionCue(cue.id)} aria-label="Delete cue" className="rounded border border-zinc-700 px-1.5 text-zinc-400">×</button>
                </div>
                <input
                  type="text" value={cue.text}
                  onChange={(e) => updateCaptionCue(cue.id, { text: e.target.value })}
                  aria-label="Cue text" className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-1.5 py-1 text-xs"
                />
                <div className="mt-1 flex gap-1">
                  <select value={translateLang} onChange={(e) => setTranslateLang(e.target.value)} aria-label="Translation language" className="rounded border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-[11px]">
                    {CAPTION_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setTranslateDrafts((d) => ({ ...d, [cue.id]: cue.text }))}
                    className="rounded border border-zinc-700 px-1.5 py-0.5 text-[11px]"
                    title="Copy the source text as a starting point for your translation"
                  >
                    Copy source
                  </button>
                </div>
                {translateDrafts[cue.id] !== undefined && (
                  <div className="mt-1 flex gap-1">
                    <input
                      type="text" value={translateDrafts[cue.id]}
                      onChange={(e) => setTranslateDrafts((d) => ({ ...d, [cue.id]: e.target.value }))}
                      placeholder={`Translation (${CAPTION_LANGUAGES.find((l) => l.code === translateLang)?.label ?? translateLang})`}
                      aria-label="Translation text" className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-1.5 py-1 text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => { translateCaptionCue(cue.id, translateLang, translateDrafts[cue.id]); setTranslateDrafts((d) => { const next = { ...d }; delete next[cue.id]; return next; }); }}
                      className="rounded border border-violet-500 px-1.5 py-0.5 text-[11px]"
                    >
                      Save
                    </button>
                  </div>
                )}
                {cue.translations && Object.keys(cue.translations).length > 0 && (
                  <p className="mt-1 text-[11px] text-zinc-500">Translations: {Object.keys(cue.translations).join(', ')}</p>
                )}
              </div>
            );
          })}
        </div>
        {cues.length > 0 && (
          <button type="button" onClick={deleteAllCaptions} className="w-full rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-red-300">
            Delete current captions
          </button>
        )}
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Machine translation needs a provider (Phase 7). The translation editor above is the real feature: write the translation yourself, per cue, per language.
        </p>
      </section>

      <section className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Import / export</h3>
        <label className="block text-xs">
          <span className="text-zinc-400">Import caption file (.srt / .vtt)</span>
          <input type="file" accept=".srt,.vtt" onChange={(e) => void onImport(e.target.files?.[0])} className="mt-1 block w-full text-[11px] text-zinc-400" />
        </label>
        <p className="text-[11px] text-zinc-500">.ass files are not supported in this build — convert them to .srt first.</p>
        {importError && <p className="text-[11px] text-red-400">{importError}</p>}
        {importInfo && <p className="text-[11px] text-emerald-400">{importInfo}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => download('srt')} disabled={cues.length === 0} className="flex-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs disabled:opacity-40">Export .srt</button>
          <button type="button" onClick={() => download('vtt')} disabled={cues.length === 0} className="flex-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs disabled:opacity-40">Export .vtt</button>
        </div>
      </section>

      <section className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Transcript</h3>
        {cues.length === 0 && <p className="text-[11px] text-zinc-500">No cues yet — the transcript appears here once captions exist. Click any word to seek to it.</p>}
        <div className="space-y-1">
          {cues.map((cue) => (
            <p key={cue.id} className="text-xs leading-relaxed text-zinc-300">
              {cue.words.map((word, i) => (
                <button
                  key={`${cue.id}-${i}`}
                  type="button"
                  onClick={() => setPlayhead(word.start)}
                  className={`mr-1 rounded px-0.5 hover:bg-violet-600/30 ${playhead >= word.start && playhead < word.end ? 'bg-violet-600/40 text-white' : ''}`}
                  title={`${word.start.toFixed(2)}s`}
                >
                  {word.text}
                </button>
              ))}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
        <h3 className="text-xs font-semibold text-zinc-300">Text-to-speech</h3>
        <label className="block text-xs">
          <span className="text-zinc-400">Narration text</span>
          <textarea value={ttsText} onChange={(e) => setTtsText(e.target.value)} rows={2} placeholder="Type the narration…" aria-label="Narration text" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs" />
        </label>
        <label className="block text-xs">
          <span className="text-zinc-400">Voice {voices.length === 0 ? '(none available in this browser)' : `(${voices.length} available)`}</span>
          <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs" aria-label="TTS voice">
            <option value="">Default voice</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs">
          Rate
          <input type="range" min={0.5} max={2} step={0.1} value={ttsRate} onChange={(e) => setTtsRate(Number(e.target.value))} className="flex-1" aria-label="TTS rate" />
          <span className="w-8 text-right font-mono">{ttsRate.toFixed(1)}×</span>
        </label>
        <label className="flex items-center gap-2 text-xs">
          Pitch
          <input type="range" min={0.5} max={2} step={0.1} value={ttsPitch} onChange={(e) => setTtsPitch(Number(e.target.value))} className="flex-1" aria-label="TTS pitch" />
          <span className="w-8 text-right font-mono">{ttsPitch.toFixed(1)}</span>
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={previewTts} disabled={!ttsText.trim()} className="flex-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs disabled:opacity-40">Preview voice</button>
          <button
            type="button"
            onClick={() => { if (ttsText.trim()) { addTtsNarration(ttsText.trim(), pickVoice(voices, ttsVoice), ttsRate, ttsPitch); setTtsText(''); } }}
            disabled={!ttsText.trim()}
            className="flex-1 rounded-md border border-zinc-700 px-2 py-1.5 text-xs disabled:opacity-40"
          >
            Add narration clip
          </button>
        </div>
        {ttsNote && <p className="text-[11px] text-amber-400">{ttsNote}</p>}
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Narration clips speak once via the browser voice when the playhead enters them during preview. Rendered TTS audio in export needs an offline TTS engine (Phase 4/7).
        </p>
      </section>
    </div>
  );
}
