import { useEffect, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { CAPTION_LANGUAGES, CAPTION_STYLE_PRESETS, captionStyleById } from '../lib/captions';
import { clampTtsRatePitch, pickVoice, voiceInfos, type TtsVoiceInfo } from '../lib/tts';
import PanelShell, { PanelSearch, SectionHeading, SubNavGroup, SubNavItem } from './PanelShell';

/**
 * Captions panel (Phase 3, SPEC I — I-CAPTION-AUTO/MANUAL/STYLE, I-SRT,
 * I-TRANSLATE, I-TTS, I-TRANSCRIPT).
 * CapCut-fix (2026-11-25, K1–K5): sub-nav Auto captions, Templates ^
 * (Favorites, Trending, Classic, NEW, Hits, Word), Auto lyrics.
 * Templates view: search "People are searching Basic" + filter, a
 * "Trending" heading, a 2-col grid of caption style cards (dark, styled
 * text preview) with star + download icons, and a bottom bar —
 * "Delete current captions" + "Generate captions" (K3). Auto captions:
 * language dropdown + Generate. Auto lyrics: the same flow for lyrics.
 * Manual captions + .srt/.vtt/.ass/.lrc upload (K4 — .lrc import added
 * 2026-11-25). CapCut's "1 use/month" limit does NOT apply — generation
 * is local, and the panel says so. All caption styles are ORIGINAL
 * Vidora designs. Word category (K5): 3 word-by-word highlight styles.
 */
export const CAPTION_TEMPLATE_NAV = ['Favorites', 'Trending', 'Classic', 'NEW', 'Hits', 'Word'] as const;

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

  const [capSection, setCapSection] = useState<'auto' | 'templates' | 'lyrics'>('auto');
  const [templateCategory, setTemplateCategory] = useState<string>('Trending');
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('en');
  const [transcript, setTranscript] = useState('');
  const [lyrics, setLyrics] = useState('');
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
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('vidora.caption-favorites.v1') ?? '[]') as string[];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (id: string) => {
    setFavorites((f) => {
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      localStorage.setItem('vidora.caption-favorites.v1', JSON.stringify(next));
      return next;
    });
  };

  const cues = project?.captions ?? [];
  const activeStyleId = project?.captionStyleId ?? 'classic-box';
  const activeStyle = captionStyleById(activeStyleId);

  const templateStyles = CAPTION_STYLE_PRESETS.filter((s) => {
    if (query && !`${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (templateCategory === 'Favorites') return favorites.includes(s.id);
    return s.category === templateCategory;
  });

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

  const generateFrom = (text: string) => {
    if (!text.trim()) return;
    generateCaptionsFromTranscript(text, language);
    setTranscript('');
    setLyrics('');
  };

  return (
    <PanelShell
      subNav={<>
        <SubNavItem active={capSection === 'auto'} onClick={() => setCapSection('auto')}>Auto captions</SubNavItem>
        <SubNavGroup title="Templates">
          {CAPTION_TEMPLATE_NAV.map((n) => (
            <SubNavItem key={n} active={capSection === 'templates' && templateCategory === n} onClick={() => { setCapSection('templates'); setTemplateCategory(n); }}>{n}</SubNavItem>
          ))}
        </SubNavGroup>
        <SubNavItem active={capSection === 'lyrics'} onClick={() => setCapSection('lyrics')}>Auto lyrics</SubNavItem>
      </>}
    >
      {capSection === 'templates' && (
        <>
          <PanelSearch value={query} onChange={setQuery} placeholder="People are searching Basic" />
          <SectionHeading>{query ? `Results for "${query}"` : templateCategory}</SectionHeading>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {templateStyles.map((style) => (
              <div key={style.id} className={`relative overflow-hidden rounded-lg border ${activeStyleId === style.id ? 'border-[#00D9D9]' : 'border-[#2E2E2E] hover:border-[#3D3D3D]'} bg-[#242424]`}>
                <button type="button" onClick={() => setCaptionStyle(style.id)} title={style.description} className="block w-full text-left">
                  <span className="block px-2 py-3 text-center text-sm font-semibold" style={{ background: style.background, color: style.color }}>
                    {style.name}
                  </span>
                  <span className="block px-2 py-1 text-[11px] text-zinc-500">{style.position} · {style.fontSize}px</span>
                </button>
                <button type="button" onClick={() => toggleFavorite(style.id)} aria-pressed={favorites.includes(style.id)} aria-label={`Favorite ${style.name}`} className={`absolute right-1 top-1 rounded bg-black/50 px-1 text-[13px] ${favorites.includes(style.id) ? 'text-[#FFD34D]' : 'text-zinc-300 hover:text-white'}`}>★</button>
                <button type="button" onClick={() => download('srt')} aria-label={`Download ${style.name} sample as SRT`} title="Download sample" className="absolute bottom-1 right-1 rounded bg-black/50 px-1 text-[11px] text-zinc-300 hover:text-white">⭳</button>
              </div>
            ))}
            {templateStyles.length === 0 && <p className="col-span-2 text-[11px] text-zinc-500">No caption styles match.</p>}
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">Active style: {activeStyle.name}. It applies to every cue unless a cue picks its own style.</p>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-zinc-800 pt-3">
            <button type="button" onClick={deleteAllCaptions} disabled={cues.length === 0} className="rounded-md border border-zinc-700 px-2 py-1.5 text-xs text-red-300 disabled:opacity-40">
              ☐ Delete current captions
            </button>
            <button
              type="button"
              onClick={() => setCapSection('auto')}
              className="rounded-md bg-[#00D9D9] px-4 py-1.5 text-xs font-semibold text-[#062A2A]"
            >
              Generate captions
            </button>
          </div>
        </>
      )}

      {capSection === 'auto' && (
        <>
          <section className="space-y-2">
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
              onClick={() => generateFrom(transcript)}
              disabled={!transcript.trim()}
              className="w-full rounded-md bg-[#00D9D9] px-2 py-1.5 text-xs font-semibold text-[#062A2A] disabled:opacity-40"
            >
              Generate captions
            </button>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Speech-to-text (Whisper) is Phase 7. This build times a transcript you paste: it spreads the words evenly across the selected clip (or the whole project) with word-level timing. No monthly limit — generation is local.
            </p>
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
                  <div key={cue.id} className={`rounded-md border p-2 text-xs ${active ? 'border-[#00D9D9] bg-[#00D9D9]/10' : 'border-zinc-800 bg-zinc-900'}`}>
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
                          className="rounded border border-[#00D9D9] px-1.5 py-0.5 text-[11px]"
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
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Machine translation needs a provider (Phase 7). The translation editor above is the real feature: write the translation yourself, per cue, per language.
            </p>
          </section>

          <section className="mt-4 space-y-2 border-t border-zinc-800 pt-3">
            <h3 className="text-xs font-semibold text-zinc-300">Import / export</h3>
            <label className="block text-xs">
              <span className="text-zinc-400">Import caption file (.srt / .vtt / .ass / .lrc)</span>
              <input type="file" accept=".srt,.vtt,.ass,.lrc" onChange={(e) => void onImport(e.target.files?.[0])} className="mt-1 block w-full text-[11px] text-zinc-400" />
            </label>
            <p className="text-[11px] text-zinc-500">.ass styles are not imported — cues use the current caption style. .lrc lines look like “[00:12.34] your lyrics”.</p>
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
                      className={`mr-1 rounded px-0.5 hover:bg-[#00D9D9]/20 ${playhead >= word.start && playhead < word.end ? 'bg-[#00D9D9]/30 text-white' : ''}`}
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
        </>
      )}

      {capSection === 'lyrics' && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-300">Auto lyrics</h3>
          <label className="flex items-center justify-between gap-2 text-xs">
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1" aria-label="Lyrics language">
              {CAPTION_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="text-zinc-400">Lyrics (paste or type the song words)</span>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              rows={5}
              placeholder="Type or paste the lyrics here…"
              aria-label="Lyrics for auto lyrics"
              className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
            />
          </label>
          <button
            type="button"
            onClick={() => generateFrom(lyrics)}
            disabled={!lyrics.trim()}
            className="w-full rounded-md bg-[#00D9D9] px-2 py-1.5 text-xs font-semibold text-[#062A2A] disabled:opacity-40"
          >
            Generate lyrics
          </button>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Lyrics are timed like captions: the words spread evenly across the selected clip (or the whole project). For a timed .lrc file, use Import in the Auto captions section. No monthly limit — generation is local.
          </p>
          <p className="text-[11px] text-zinc-500">Tip: the “Lyric Centre” and “Word Karaoke” styles in Templates suit song words.</p>
        </section>
      )}
    </PanelShell>
  );
}
