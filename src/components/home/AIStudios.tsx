/**
 * AI Studio pages (CapCut-fix doc U1–U6, shots 07–16).
 * Standalone wrapper: switches between the AI studio pages with its own
 * local state. NOT wired into the Dashboard yet — another agent wires it in.
 *
 * All generation is Vidora LOCAL (lib/aiGenerate.ts): prompt -> procedural
 * image / 3 s video clip / synth music track, rendered on this computer.
 * No credits, no upload, no sign-in. Honest labels where an engine is
 * limited (video is a 3 s procedural clip, not a 4K AI render).
 *
 * Originality: only the name "Vidora" and its logo stay original by rule;
 * every model name, title and creator below is original. No CapCut brand
 * names (CapCut, Seedance, Seedream, Dreamina, Pippit, GPT Image,
 * ChatGPT) appear anywhere.
 */
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AI_CLIPS, AI_IMAGES, withBase } from '../../lib/aiLibrary';
import { generateClip, generateImage, generateMusic } from '../../lib/aiGenerate';
import { useProjectStore } from '../../store/projectStore';

export type AIStudioView =
  | 'video'
  | 'inspiration'
  | 'design'
  | 'create'
  | 'explore'
  | 'canvas'
  | 'marketing'
  | 'promo';

export interface AIStudiosProps {
  initialView?: AIStudioView;
  onOpenEditor?: () => void;
}

type GenKind = 'video' | 'image' | 'music';

interface GenResult {
  detail: string;
  id: string;
  kind: GenKind;
  label: string;
  url: string;
}

const SERIF: CSSProperties = { fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic' };

const fmtDur = (s: number) => `00:${String(Math.round(s)).padStart(2, '0')}`;

/** Run Vidora's local generation for one prompt. */
async function runLocalGeneration(prompt: string, kind: GenKind): Promise<GenResult[]> {
  const p = prompt.trim();
  if (kind === 'video') {
    const clip = await generateClip(p);
    if (!clip) return [];
    return [{ detail: 'Procedural 3 s clip (720p WebM) rendered on this computer', id: 'gen-video', kind, label: p.slice(0, 48) || 'Untitled clip', url: clip.url }];
  }
  if (kind === 'image') {
    const out: GenResult[] = [];
    for (let i = 0; i < 3; i += 1) {
      const url = generateImage(p, i);
      if (url) out.push({ detail: 'Procedural artwork (1280×720 PNG) painted on this computer', id: `gen-image-${i}`, kind, label: `${p.slice(0, 40) || 'Untitled'} — variation ${i + 1}`, url });
    }
    return out;
  }
  const tracks = await generateMusic(p, 2);
  return tracks.map((t, i) => ({
    detail: `${t.style} · 15 s WAV, synthesised locally`,
    id: `gen-music-${i}`,
    kind,
    label: t.name,
    url: t.url,
  }));
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function SendButton({ disabled, onClick, dark }: { dark?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label="Generate"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition ${
        disabled ? 'cursor-not-allowed bg-gray-300 text-gray-500' : dark ? 'bg-[#00D9D9] text-[#062A2A] hover:brightness-110' : 'bg-[#00D9D9] text-[#062A2A] hover:brightness-110'
      }`}
    >
      ↑
    </button>
  );
}

function FloatingPromptBar({
  onGenerate,
  placeholder,
  busy,
}: {
  busy?: boolean;
  onGenerate: (prompt: string) => void;
  placeholder: string;
}) {
  const [value, setValue] = useState('');
  const submit = () => {
    if (!value.trim() || busy) return;
    onGenerate(value.trim());
    setValue('');
  };
  return (
    <div className="sticky bottom-4 z-20 mx-auto mt-10 flex w-full max-w-2xl items-center gap-3 rounded-full bg-white px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/5">
      <button type="button" aria-label="Add" className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-gray-800 hover:bg-gray-100">+</button>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
      />
      <SendButton disabled={!value.trim() || busy} onClick={submit} />
    </div>
  );
}

function ResultsGrid({ results, busy, note }: { busy?: boolean; note?: string; results: GenResult[] }) {
  if (busy) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white/70 px-5 py-8 text-center text-sm text-gray-600">
        Generating locally on this computer…
      </div>
    );
  }
  if (results.length === 0) return null;
  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-semibold text-gray-900">Your generations</p>
      {note && <p className="mb-3 text-xs text-gray-500">{note}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => (
          <figure key={r.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {r.kind === 'music' ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#0c4a6e] via-[#00D9D9] to-[#e0f2fe] px-4 text-center">
                <span className="text-3xl text-white">♪</span>
                <audio controls src={r.url} className="w-full" />
              </div>
            ) : r.kind === 'video' ? (
              <video src={r.url} controls loop muted playsInline className="h-40 w-full object-cover" />
            ) : (
              <img src={r.url} alt={r.label} className="h-40 w-full object-cover" />
            )}
            <figcaption className="px-3 py-2">
              <p className="truncate text-sm font-medium text-gray-900">{r.label}</p>
              <p className="text-xs text-gray-500">{r.detail}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function Chip({ active, children, onClick, dark }: { active?: boolean; children: ReactNode; dark?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm whitespace-nowrap transition ${
        active
          ? dark
            ? 'bg-white text-black'
            : 'bg-[#D6F4F8] text-gray-900'
          : dark
            ? 'bg-[#242424] text-gray-300 hover:bg-[#2E2E2E]'
            : 'bg-[#EDF0F2] text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

/** Light-page top bar: back/forward left, refresh/min/max/close right (decorative). */
function LightTopBar() {
  return (
    <div className="flex h-12 items-center justify-between border-b border-black/5 bg-[#F2F6F8] px-4">
      <div className="flex items-center gap-5 text-xl text-gray-700">
        <button type="button" aria-label="Back" className="hover:text-black">‹</button>
        <button type="button" aria-label="Forward" className="text-gray-300 hover:text-black">›</button>
      </div>
      <div className="flex items-center gap-5 text-lg text-gray-700">
        <button type="button" aria-label="Refresh" className="hover:text-black">↻</button>
        <span className="h-4 w-px bg-gray-300" />
        <button type="button" aria-label="Minimise" className="hover:text-black">–</button>
        <button type="button" aria-label="Maximise" className="hover:text-black">▢</button>
        <button type="button" aria-label="Close" className="hover:text-black">✕</button>
      </div>
    </div>
  );
}

/* Original showroom content (Vidora originals, not CapCut's). */
const SHOWROOM_SHORT = [
  { clips: 10, creator: 'Mara Ellison', title: 'The Lantern Keeper' },
  { clips: 8, creator: 'Dev Raman', title: 'Salt & Smoke' },
  { clips: 6, creator: 'June Park', title: 'The Long Rain' },
  { clips: 12, creator: 'Theo Lindqvist', title: 'Harbour Lights' },
];
const SHOWROOM_DRAMA = [
  { clips: 5, creator: 'Vidora Originals', title: 'Neon Hearts' },
  { clips: 4, creator: 'Vidora Originals', title: 'The Last Broadcast' },
  { clips: 4, creator: 'Vidora Originals', title: 'Paper Moon' },
  { clips: 7, creator: 'Vidora Originals', title: 'Second Chances' },
];

function ShowroomRow({ heading, items, posters }: { heading: string; items: typeof SHOWROOM_SHORT; posters: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <section className="mt-10">
      <h3 className="mb-4 text-lg font-medium text-gray-900">{heading}</h3>
      <div className="relative">
        <div ref={ref} className="flex gap-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((it, i) => (
            <article key={it.title} className="w-[430px] shrink-0">
              <div className="relative h-[242px] overflow-hidden rounded-2xl bg-gray-200">
                <img src={posters[i % posters.length]} alt={it.title} className="h-full w-full object-cover" loading="lazy" />
                <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
                  ▦ {it.clips}
                </span>
              </div>
              <p className="mt-3 text-[17px] font-medium text-gray-900">{it.title}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-[10px] font-bold text-gray-700">
                  {it.creator.charAt(0)}
                </span>
                {it.creator}
              </p>
            </article>
          ))}
        </div>
        <button
          type="button"
          aria-label={`Scroll ${heading}`}
          onClick={() => ref.current?.scrollBy({ behavior: 'smooth', left: 450 })}
          className="absolute top-[110px] -right-2 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl text-gray-700 shadow-lg ring-1 ring-black/5 hover:bg-gray-50"
        >
          ›
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 1. VIDEO STUDIO (light)                                             */
/* ------------------------------------------------------------------ */

function VideoStudioPage({ onOpenEditor }: { onOpenEditor?: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'Standard' | 'Director'>('Director');
  const [showTip, setShowTip] = useState(true);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<GenResult[]>([]);
  const [chip, setChip] = useState('Try Vidora Video 2.5');
  const scrollRef = useRef<HTMLDivElement>(null);
  const createProject = useProjectStore((s) => s.createProject);
  const posters = useMemo(() => AI_CLIPS.slice(0, 12).map((c) => withBase(c.poster)), []);
  const hero = posters.slice(0, 3);

  const generate = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      setResults(await runLocalGeneration(text, 'video'));
    } finally {
      setBusy(false);
    }
  };

  const newProject = () => {
    createProject('Untitled Project');
    onOpenEditor?.();
  };

  const chips = ['Try Vidora Video 2.5', 'AI drama', 'Knowledge', 'Marketing', 'Character design', 'TikTok trends'];

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto bg-[#F2F6F8] text-[#111111]">
      <LightTopBar />
      <div className="mx-auto max-w-5xl px-6 pt-10 pb-16">
        {/* Hero: 3 curved images + gray pill */}
        <div className="relative mx-auto flex max-w-2xl items-end justify-center">
          <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-[64px] font-bold tracking-wide whitespace-nowrap text-[#E3EAEE] select-none">
            VIDORA VIDEO 2.5
          </span>
          {hero.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className={`h-44 w-56 object-cover shadow-md ${i === 0 ? 'rounded-l-[28px] [transform:perspective(600px)_rotateY(18deg)]' : i === 2 ? 'rounded-r-[28px] [transform:perspective(600px)_rotateY(-18deg)]' : 'z-10 -mx-2 h-52 w-60 rounded-[24px]'}`}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-center">
          <button type="button" onClick={() => generate('A cinematic 4K-style opening shot')} className="rounded-full bg-[#9AA5AD] px-5 py-2 text-sm font-medium text-white shadow hover:bg-[#8A959D]">
            Try Vidora Video Flash ›
          </button>
        </div>

        <h1 className="mt-12 text-center text-[52px] leading-tight text-[#111111]" style={SERIF}>
          Make 4K videos with Vidora Video 2.5
        </h1>
        <p className="mt-3 text-center text-[17px] text-gray-700">
          Brainstorm with AI <span className="text-gray-500">⌄</span>
        </p>

        {/* Prompt box */}
        <div className="relative mx-auto mt-8 max-w-3xl rounded-[28px] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void generate(prompt); } }}
            rows={3}
            placeholder="Create with Vidora Video Mini with lower cost"
            className="w-full resize-none bg-transparent text-[17px] text-gray-900 outline-none placeholder:text-gray-400"
          />
          <div className="mt-4 flex items-center gap-6">
            <button type="button" aria-label="Attach" className="text-2xl text-gray-800 hover:text-black">+</button>
            <button type="button" className="flex items-center gap-1.5 text-[15px] text-gray-800 hover:text-black">✦ Auto ⌄</button>
            <button type="button" className="flex items-center gap-1.5 text-[15px] text-gray-800 hover:text-black">📖 Skills</button>
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMode(mode === 'Director' ? 'Standard' : 'Director')}
                className="flex items-center gap-1 rounded-full border border-gray-200 px-4 py-2 text-[15px] text-gray-800 hover:bg-gray-50"
              >
                {mode} ⌄
              </button>
              <SendButton disabled={!prompt.trim() || busy} onClick={() => void generate(prompt)} />
            </div>
          </div>
          {showTip && (
            <div className="absolute -top-2 right-0 z-10 w-[340px] rounded-2xl bg-[#FFE45E] p-4 text-left shadow-lg">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] font-bold text-gray-900">Agent mode</p>
                <button type="button" aria-label="Dismiss" onClick={() => setShowTip(false)} className="text-lg leading-none text-gray-700 hover:text-black">✕</button>
              </div>
              <p className="mt-1.5 text-sm leading-snug text-gray-800">
                Choose between Standard and Director modes to create videos of different purposes and genres.
              </p>
              <span className="absolute -bottom-2 right-24 h-4 w-4 rotate-45 bg-[#FFE45E]" />
            </div>
          )}
        </div>

        {/* Quick chips */}
        <div className="mx-auto mt-6 flex max-w-3xl items-center gap-3">
          <div className="flex min-w-0 items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setChip(c); void generate(`${c} — short video`); }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm whitespace-nowrap ${chip === c ? 'bg-white font-medium text-gray-900 shadow-sm' : 'bg-white/70 text-gray-700 hover:bg-white'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <button type="button" aria-label="More" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xl text-gray-700 shadow-sm">›</button>
        </div>

        <ResultsGrid
          results={results}
          busy={busy}
          note="Local generation: a 3-second procedural clip, rendered on this computer. Full AI video rendering is not in this build — the clip shows the motion, palette and framing of your prompt."
        />

        {/* My projects */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900">My projects</h2>
          <button
            type="button"
            onClick={newProject}
            className="mt-4 flex h-44 w-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-transparent transition hover:border-gray-400 hover:bg-white/60"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-2xl text-white">+</span>
            <span className="text-[15px] text-gray-800">Create new project</span>
          </button>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900">Showroom</h2>
          <ShowroomRow heading="Short films" items={SHOWROOM_SHORT} posters={posters} />
          <ShowroomRow heading="AI drama" items={SHOWROOM_DRAMA} posters={posters.slice(4)} />
        </section>

        <FloatingPromptBar placeholder="Create with Vidora Video Mini with lower cost" busy={busy} onGenerate={(p) => void generate(p)} />
      </div>
      <button
        type="button"
        aria-label="Scroll to bottom"
        onClick={() => scrollRef.current?.scrollTo({ behavior: 'smooth', top: scrollRef.current.scrollHeight })}
        className="fixed right-6 bottom-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl text-gray-800 shadow-lg ring-1 ring-black/5 hover:bg-gray-50"
      >
        ↓
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. INSPIRATION (light)                                              */
/* ------------------------------------------------------------------ */

function InspirationPage() {
  const [tab, setTab] = useState<'inspiration' | 'recent'>('inspiration');
  const [chip, setChip] = useState('Trending');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<GenResult[]>([]);
  const items = useMemo(() => {
    const clips = AI_CLIPS.slice(0, 16);
    const images = AI_IMAGES.filter((i) => i.kind === 'texture').slice(0, 8);
    return [...clips.map((c) => ({ dur: c.duration, src: withBase(c.poster), title: c.name })), ...images.map((i) => ({ dur: 0, src: withBase(i.file), title: i.name }))];
  }, []);

  const filtered = useMemo(() => {
    if (chip === 'Avatars') return items.filter((_, i) => i % 3 === 0);
    if (chip === 'Styles') return items.filter((_, i) => i % 3 === 1);
    if (chip === 'AI templates') return items.filter((_, i) => i % 3 === 2);
    return items;
  }, [chip, items]);

  const generate = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      setResults(await runLocalGeneration(text, 'video'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#F5F7F8] text-[#111111]">
      <LightTopBar />
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-16">
        <div className="flex items-baseline gap-8 border-b border-transparent">
          <button type="button" onClick={() => setTab('inspiration')} className={`pb-2 text-[22px] font-medium ${tab === 'inspiration' ? 'border-b-[3px] border-[#00D9D9] text-gray-900' : 'text-gray-400'}`}>
            Inspiration
          </button>
          <button type="button" onClick={() => setTab('recent')} className={`pb-2 text-[22px] ${tab === 'recent' ? 'border-b-[3px] border-[#00D9D9] font-medium text-gray-900' : 'text-gray-400'}`}>
            Recent Projects
          </button>
        </div>

        {tab === 'recent' ? (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-300 bg-white/60 px-6 py-14 text-center">
            <p className="text-lg font-medium text-gray-800">No recent projects yet</p>
            <p className="mt-1 text-sm text-gray-500">Projects you generate or open will appear here.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 flex gap-3">
              {['Trending', 'AI templates', 'Styles', 'Avatars'].map((c) => (
                <Chip key={c} active={chip === c} onClick={() => setChip(c)}>{c}</Chip>
              ))}
            </div>
            <div className="mt-6 columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
              {filtered.map((it, i) => (
                <button
                  key={`${it.title}-${i}`}
                  type="button"
                  onClick={() => void generate(`Make a video like “${it.title}”`)}
                  className="relative block w-full overflow-hidden rounded-xl text-left shadow-sm transition hover:opacity-95"
                >
                  <img src={it.src} alt={it.title} loading="lazy" className="w-full object-cover" style={{ aspectRatio: i % 3 === 0 ? '3/4' : i % 3 === 1 ? '3/4' : '4/5' }} />
                  {it.dur > 0 && (
                    <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">{fmtDur(it.dur)}</span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 pt-6 pb-2 text-sm font-medium text-white opacity-0 transition hover:opacity-100">
                    {it.title}
                  </span>
                </button>
              ))}
            </div>
            <ResultsGrid results={results} busy={busy} note="Local generation: 3-second procedural clips, rendered on this computer." />
          </>
        )}
        <FloatingPromptBar placeholder="Create with Vidora Video Mini with lower cost" busy={busy} onGenerate={(p) => void generate(p)} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. DESIGN STUDIO (light)                                            */
/* ------------------------------------------------------------------ */

function DesignStudioPage() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('Vidora Image 2.0 Pro');
  const [filter, setFilter] = useState('All');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<GenResult[]>([]);
  const hero = useMemo(() => AI_IMAGES.find((i) => i.kind === 'texture') ?? AI_IMAGES[0], []);
  const grid = useMemo(() => AI_IMAGES.filter((i) => i.kind === 'texture').slice(0, 24), []);
  const models = ['Vidora Image 2.0 Pro', 'Vidora Image 2', 'Presentation', 'Social media', 'Branding'];
  const filters = ['All', 'Vidora Image 2.0 Pro', 'Vidora Image 2', 'Social media', 'Posters', 'Recap', 'Brand', 'Pets', 'Business', 'Work', 'Photos', 'Graduation'];

  const generate = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      setResults(await runLocalGeneration(text, 'image'));
    } finally {
      setBusy(false);
    }
  };

  const shown = filter === 'All' ? grid : grid.filter((_, i) => (i + filter.length) % 3 !== 0);

  return (
    <div className="h-full overflow-y-auto bg-[#F5F7F8] text-[#111111]">
      <LightTopBar />
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-16">
        {/* Hero image */}
        <div className="mx-auto flex h-44 max-w-md items-center justify-center overflow-hidden rounded-2xl">
          {hero && <img src={withBase(hero.file)} alt={hero.name} className="h-full w-full object-cover" />}
        </div>
        <div className="mt-3 flex justify-center">
          <button type="button" onClick={() => generate('A bold poster design')} className="rounded-full bg-[#9AA5AD] px-5 py-2 text-sm font-medium text-white shadow hover:bg-[#8A959D]">
            Vidora Image 2.0 Pro. Draw your edit. Try now ›
          </button>
        </div>
        <h1 className="mt-10 text-center text-[52px] leading-tight text-[#111111]" style={SERIF}>
          Imagine it. Design it.
        </h1>

        {/* Prompt box */}
        <div className="mx-auto mt-8 max-w-3xl rounded-[28px] bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void generate(prompt); } }}
            rows={3}
            placeholder="Enter your ideas or upload images to get started"
            className="w-full resize-none bg-transparent text-[17px] text-gray-900 outline-none placeholder:text-gray-400"
          />
          <div className="mt-4 flex items-center gap-6">
            <button type="button" aria-label="Upload" className="text-2xl text-gray-800 hover:text-black">+</button>
            <button type="button" aria-label="3D" className="text-xl text-gray-800 hover:text-black">⬡</button>
            <button type="button" aria-label="Ideas" className="text-xl text-gray-800 hover:text-black">📖</button>
            <div className="ml-auto">
              <SendButton disabled={!prompt.trim() || busy} onClick={() => void generate(prompt)} />
            </div>
          </div>
        </div>

        {/* Model chips */}
        <div className="mx-auto mt-6 flex max-w-3xl items-center gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {models.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModel(m)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm whitespace-nowrap ${model === m ? 'bg-white font-medium text-gray-900 shadow-sm' : 'bg-white/70 text-gray-700 hover:bg-white'}`}
            >
              {m}
            </button>
          ))}
          <button type="button" aria-label="More models" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xl text-gray-700 shadow-sm">›</button>
        </div>

        <ResultsGrid
          results={results}
          busy={busy}
          note="Local generation: procedural artwork painted on this computer — it follows your prompt's palette and mood, not a cloud image model."
        />

        {/* Inspiration */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-gray-900">Inspiration</h2>
          <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filters.map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
            ))}
          </div>
          <div className="mt-5 columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-4">
            {shown.map((img, i) => (
              <button key={img.id} type="button" onClick={() => void generate(`Design in the style of “${img.name}”`)} className="block w-full overflow-hidden rounded-xl text-left shadow-sm transition hover:opacity-95">
                <img src={withBase(img.file)} alt={img.name} loading="lazy" className="w-full object-cover" style={{ aspectRatio: i % 4 === 0 ? '4/5' : i % 4 === 1 ? '1/1' : i % 4 === 2 ? '3/4' : '4/3' }} />
              </button>
            ))}
          </div>
        </section>

        <FloatingPromptBar placeholder="Enter your ideas or upload images to get started" busy={busy} onGenerate={(p) => void generate(p)} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DARK pages — Create / Explore / Canvas share the left nav           */
/* ------------------------------------------------------------------ */

interface DarkNavProps {
  active: string;
  onNavigate: (view: AIStudioView, tab?: string) => void;
}

function DarkLeftNav({ active, onNavigate }: DarkNavProps) {
  const items: { badge?: string; icon: string; id: string; label: string }[] = [
    { icon: '✦', id: 'create', label: 'Create' },
    { icon: '◎', id: 'explore', label: 'Explore' },
    { badge: 'New', icon: '🛒', id: 'marketing', label: 'Marketing Studio' },
    { badge: 'Beta', icon: '◉', id: 'influencer', label: 'Influencer Studio' },
    { badge: 'Beta', icon: '〰', id: 'motion', label: 'Motion Studio' },
    { icon: '🖼', id: 'ai-image', label: 'AI Image' },
    { icon: '▶', id: 'ai-video', label: 'AI Video' },
    { icon: '♪', id: 'ai-audio', label: 'AI Audio' },
    { badge: 'New', icon: '🖼', id: 'vidora-image', label: 'Vidora Image 2.0' },
    { badge: 'New', icon: '⧉', id: 'recreator', label: 'Video recreator' },
    { icon: '▦', id: 'canvas', label: 'Canvas' },
    { icon: '⊞', id: 'all-tools', label: 'All tools' },
    { icon: '▤', id: 'assets', label: 'Assets & Elements' },
    { icon: '◷', id: 'sessions', label: 'Generative sessions' },
  ];
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-[#2E2E2E] bg-[#141414] px-3 py-4">
      <p className="mb-3 px-2 text-xl font-bold tracking-tight text-[#F2F2F2]">
        <span className="text-[#00D9D9]">✦</span> Vidora Create
      </p>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => {
            if (it.id === 'create') onNavigate('create');
            else if (it.id === 'explore') onNavigate('explore');
            else if (it.id === 'marketing') onNavigate('marketing');
            else if (it.id === 'canvas') onNavigate('canvas');
            else if (it.id === 'ai-image') onNavigate('create', 'image');
            else if (it.id === 'ai-video') onNavigate('create', 'video');
            else if (it.id === 'ai-audio') onNavigate('create', 'audio');
            else if (it.id === 'vidora-image') onNavigate('create', 'image');
            else onNavigate('create', 'agent');
          }}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] transition ${
            active === it.id ? 'bg-[#242424] font-medium text-white' : 'text-[#C9C9C9] hover:bg-[#1E1E1E] hover:text-white'
          }`}
        >
          <span className="w-5 text-center text-base">{it.icon}</span>
          <span className="flex-1">{it.label}</span>
          {it.badge && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${it.badge === 'New' ? 'bg-[#00D9D9]/20 text-[#00D9D9]' : 'bg-[#2E2E2E] text-[#A8A8A8]'}`}>
              {it.badge}
            </span>
          )}
        </button>
      ))}
    </aside>
  );
}

function DarkTopRight() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 rounded-full border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-1.5 text-xs font-medium text-[#A8A8A8]" title="Local generation — no credits, nothing to buy">
        <span className="h-2 w-2 rounded-full bg-[#00D9D9]" /> Local · no credits
      </span>
      <button type="button" aria-label="Notifications" className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-gray-300 hover:bg-[#242424]">🔔</button>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-bold text-white">V</span>
    </div>
  );
}

function GenerateCanvasToggle({ mode, onChange }: { mode: 'generate' | 'canvas'; onChange: (m: 'generate' | 'canvas') => void }) {
  return (
    <div className="mx-auto flex w-fit rounded-full bg-[#242424] p-1">
      {(['generate', 'canvas'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-full px-10 py-2.5 text-[15px] capitalize transition ${mode === m ? 'bg-white font-medium text-black shadow' : 'text-gray-300 hover:text-white'}`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. CREATE PAGE (dark)                                               */
/* ------------------------------------------------------------------ */

type CreateTab = 'agent' | 'image' | 'video' | 'audio' | 'music';

function CreatePage({ onNavigate, initialTab }: { initialTab?: string; onNavigate: (view: AIStudioView, tab?: string) => void }) {
  const [tab, setTab] = useState<CreateTab>((initialTab as CreateTab) || 'agent');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('Vidora Create 1.0');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<GenResult[]>([]);
  const [note, setNote] = useState('');
  const recent = useMemo(() => AI_CLIPS.slice(0, 4), []);

  const kindForTab = (t: CreateTab): GenKind => (t === 'image' ? 'image' : t === 'audio' || t === 'music' ? 'music' : 'video');

  const generate = async (text: string, skill?: string) => {
    const full = skill ? `${skill}: ${text}` : text;
    if (!full.trim() || busy) return;
    setBusy(true);
    setNote('');
    try {
      const kind = kindForTab(tab);
      const out = await runLocalGeneration(full, kind);
      setResults(out);
      if (kind === 'video') setNote('Local video: a 3-second procedural clip. Full AI video rendering is not in this build.');
      if (kind === 'image') setNote('Local image: procedural artwork painted on this computer.');
      if (kind === 'music') setNote('Local audio: a synthesised track rendered in your browser.');
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: CreateTab; label: string }[] = [
    { id: 'agent', label: 'AI Agent' },
    { id: 'image', label: 'AI Image' },
    { id: 'video', label: 'AI video' },
    { id: 'audio', label: 'AI Audio' },
    { id: 'music', label: 'AI Music' },
  ];
  const skills = [
    { badge: 'New', label: '/ Cinematic film style' },
    { badge: 'New', label: '/ Cinematic long take' },
    { badge: 'Hot', label: '/ Film storyboard' },
  ];

  return (
    <div className="flex h-full bg-[#141414] text-[#F2F2F2]">
      <DarkLeftNav active="create" onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 overflow-y-auto px-8 pt-5 pb-16">
        <div className="flex justify-end"><DarkTopRight /></div>
        <h1 className="mt-10 text-center text-[40px] font-medium text-white">
          Create <span style={SERIF}>anything</span> you imagine
        </h1>
        <div className="mt-8">
          <GenerateCanvasToggle mode="generate" onChange={(m) => { if (m === 'canvas') onNavigate('canvas'); }} />
        </div>

        {/* Prompt card */}
        <div className="mx-auto mt-8 max-w-4xl rounded-[24px] bg-[#1E1E1E] ring-1 ring-[#2E2E2E]">
          <div className="flex gap-1 border-b border-[#2E2E2E] px-4 pt-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-t-xl px-4 py-2.5 text-[15px] ${tab === t.id ? 'bg-[#242424] font-medium text-white underline decoration-[#00D9D9] decoration-2 underline-offset-8' : 'text-[#A8A8A8] hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-4 p-5">
            <button type="button" aria-label="Add reference" className="flex h-20 w-16 shrink-0 rotate-[-4deg] items-center justify-center rounded-lg bg-[#2E2E2E] text-2xl text-gray-300 hover:bg-[#3A3A3A]">+</button>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void generate(prompt); } }}
              rows={3}
              placeholder="Start with an idea, a script, or upload references. Use @ to mention elements, or type / for skills."
              className="min-w-0 flex-1 resize-none bg-transparent text-[16px] leading-relaxed text-white outline-none placeholder:text-[#8A8A8A]"
            />
          </div>
          <div className="flex items-center gap-6 px-5 pb-5">
            <button type="button" className="flex items-center gap-1.5 text-[15px] text-gray-200 hover:text-white">⚙ Auto</button>
            <button type="button" className="flex items-center gap-1.5 text-[15px] text-gray-200 hover:text-white">✦ Skills</button>
            <button type="button" aria-label="Mention" className="text-[15px] text-gray-200 hover:text-white">@</button>
            <div className="ml-auto flex items-center gap-3">
              <button type="button" onClick={() => setModel(model === 'Vidora Create 1.0' ? 'Vidora Create 1.0 Lite' : 'Vidora Create 1.0')} className="text-[15px] text-gray-200 hover:text-white">
                {model} ⌄
              </button>
              <SendButton dark disabled={!prompt.trim() || busy} onClick={() => void generate(prompt)} />
            </div>
          </div>
        </div>

        {/* Skill chips */}
        <div className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center justify-center gap-3">
          {skills.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => void generate(prompt || 'A quiet morning in a mountain village', s.label)}
              className="flex items-center gap-2 rounded-full bg-[#1E1E1E] px-4 py-2.5 text-sm text-gray-200 ring-1 ring-[#2E2E2E] hover:bg-[#242424]"
            >
              {s.label}
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${s.badge === 'Hot' ? 'bg-orange-500/20 text-orange-400' : 'bg-[#00D9D9]/20 text-[#00D9D9]'}`}>{s.badge}</span>
            </button>
          ))}
          <button type="button" className="rounded-full bg-[#1E1E1E] px-4 py-2.5 text-sm text-gray-200 ring-1 ring-[#2E2E2E] hover:bg-[#242424]">
            More skills ›
          </button>
        </div>

        {note && <p className="mx-auto mt-4 max-w-4xl text-center text-xs text-[#A8A8A8]">{note}</p>}

        {/* Results (dark styling) */}
        {busy && <p className="mt-8 text-center text-sm text-[#A8A8A8]">Generating locally on this computer…</p>}
        {results.length > 0 && (
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            {results.map((r) => (
              <figure key={r.id} className="overflow-hidden rounded-2xl bg-[#1E1E1E] ring-1 ring-[#2E2E2E]">
                {r.kind === 'music' ? (
                  <div className="flex h-36 flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#0c4a6e] via-[#00D9D9] to-[#e0f2fe] px-4"><span className="text-3xl text-white">♪</span><audio controls src={r.url} className="w-full" /></div>
                ) : r.kind === 'video' ? (
                  <video src={r.url} controls loop muted playsInline className="h-40 w-full object-cover" />
                ) : (
                  <img src={r.url} alt={r.label} className="h-40 w-full object-cover" />
                )}
                <figcaption className="px-3 py-2">
                  <p className="truncate text-sm font-medium text-white">{r.label}</p>
                  <p className="text-xs text-[#A8A8A8]">{r.detail}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {/* Recent generations */}
        <div className="mx-auto mt-10 max-w-4xl">
          <p className="mb-3 text-sm font-medium text-[#A8A8A8]">Recent generations</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {recent.map((c) => (
              <button key={c.id} type="button" onClick={() => void generate(`A clip like “${c.name}”`)} className="overflow-hidden rounded-2xl text-left ring-1 ring-[#2E2E2E] transition hover:opacity-90">
                <img src={withBase(c.poster)} alt={c.name} loading="lazy" className="h-32 w-full object-cover" />
                <span className="block truncate bg-[#1E1E1E] px-3 py-2 text-sm text-gray-200">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. EXPLORE PAGE (dark)                                              */
/* ------------------------------------------------------------------ */

function ExplorePage({ onNavigate }: { onNavigate: (view: AIStudioView, tab?: string) => void }) {
  const templates = useMemo(() => AI_CLIPS.slice(0, 18), []);
  const names = [
    'City Lights Dance', 'Golden Hour Product', 'Morning Commute', 'Desert Bloom', 'Neon Portrait',
    'Ocean Drift', 'Street Stories', 'Winter Glow', 'Festival Night', 'Quiet Forest',
    'Skyline Rush', 'Cafe Moments', 'Mountain Air', 'Retro Vibes', 'Rainy Window',
    'Sunset Drive', 'Garden Party', 'Star Trails',
  ];
  return (
    <div className="flex h-full bg-[#141414] text-[#F2F2F2]">
      <DarkLeftNav active="explore" onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 overflow-y-auto px-8 pt-5 pb-16">
        <div className="flex justify-end"><DarkTopRight /></div>
        <h1 className="mt-8 text-[28px] font-medium text-white">Hot templates</h1>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {templates.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onNavigate('create', 'video')}
              className="group overflow-hidden rounded-2xl text-left ring-1 ring-[#2E2E2E] transition hover:opacity-90"
            >
              <div className="relative">
                <img src={withBase(c.poster)} alt={names[i]} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">{fmtDur(c.duration)}</span>
              </div>
              <span className="block truncate bg-[#1E1E1E] px-3 py-2.5 text-sm text-gray-200">{names[i]}</span>
            </button>
          ))}
        </div>
        <p className="mt-6 text-sm text-[#A8A8A8]">Templates use Vidora&apos;s own AI clips. Opening one starts a video generation from its prompt.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6. CANVAS PAGE (dark)                                               */
/* ------------------------------------------------------------------ */

function CanvasPage({ onNavigate, onOpenEditor }: { onNavigate: (view: AIStudioView, tab?: string) => void; onOpenEditor?: () => void }) {
  const [prompt, setPrompt] = useState('');
  const createProject = useProjectStore((s) => s.createProject);
  const posters = useMemo(() => AI_CLIPS.slice(0, 8).map((c) => withBase(c.poster)), []);

  const newCanvas = () => {
    createProject('Untitled Project');
    onOpenEditor?.();
  };
  const openTemplate = (name: string) => {
    createProject(name);
    onOpenEditor?.();
  };

  const challenges = [
    { desc: 'Design a spinning top that tells a story', name: 'Spinning Top Design Challenge', poster: posters[0] },
    { desc: 'Build a canvas around your favourite place', name: 'Hometown Canvas Challenge', poster: posters[1] },
    { desc: 'Make a poster for a local music night', name: 'Music Night Poster Challenge', poster: posters[2] },
    { desc: 'Turn a photo into a moving scene', name: 'Photo to Motion Challenge', poster: posters[3] },
  ];

  return (
    <div className="flex h-full bg-[#141414] text-[#F2F2F2]">
      <DarkLeftNav active="canvas" onNavigate={onNavigate} />
      <div className="min-w-0 flex-1 overflow-y-auto px-8 pt-5 pb-16">
        <div className="flex justify-end"><DarkTopRight /></div>
        <h1 className="mt-10 text-center text-[40px] font-medium text-white">Your creative work…</h1>
        <div className="mt-8">
          <GenerateCanvasToggle mode="canvas" onChange={(m) => { if (m === 'generate') onNavigate('create'); }} />
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
          <button
            type="button"
            onClick={newCanvas}
            className="flex h-44 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#3A3A3A] bg-[#1E1E1E] transition hover:border-[#00D9D9]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl text-black">+</span>
            <span className="text-[15px] font-medium text-white">New canvas</span>
          </button>
          {[
            { grad: 'from-sky-500 to-cyan-400', name: 'Video playground', poster: posters[4] },
            { grad: 'from-blue-600 to-sky-400', name: 'Image showcase', poster: posters[5] },
          ].map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => openTemplate(t.name)}
              className={`relative h-44 overflow-hidden rounded-2xl bg-gradient-to-br text-left ${t.grad}`}
            >
              <img src={t.poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
              <span className="absolute top-3 left-3 rounded-md bg-white/85 px-2 py-0.5 text-xs font-medium text-gray-800">Template</span>
              <span className="absolute bottom-3 left-3 text-lg font-semibold text-white drop-shadow">{t.name}</span>
            </button>
          ))}
        </div>

        {/* Prompt bar */}
        <div className="mx-auto mt-8 flex max-w-4xl items-center gap-3 rounded-full bg-[#1E1E1E] px-5 py-3 ring-1 ring-[#2E2E2E]">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && prompt.trim()) { onNavigate('create', 'agent'); } }}
            placeholder="Start with an idea or script. Use @ to mention elements, or type / for skills."
            className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-[#8A8A8A]"
          />
          <button type="button" aria-label="Send" onClick={() => { if (prompt.trim()) onNavigate('create', 'agent'); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3A3A3A] text-xl text-white hover:bg-[#00D9D9] hover:text-[#062A2A]">↑</button>
        </div>

        {/* Challenge cards */}
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
          {challenges.map((ch) => (
            <button key={ch.name} type="button" onClick={() => openTemplate(ch.name)} className="flex gap-4 overflow-hidden rounded-2xl bg-[#1E1E1E] p-3 text-left ring-1 ring-[#2E2E2E] transition hover:opacity-90">
              <img src={ch.poster} alt="" className="h-24 w-32 shrink-0 rounded-xl object-cover" />
              <span className="min-w-0 py-1">
                <span className="block text-[16px] font-medium text-white" style={SERIF}>{ch.name}</span>
                <span className="mt-1 block text-sm text-[#A8A8A8]">{ch.desc}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mx-auto mt-6 flex max-w-4xl gap-5">
          <button type="button" onClick={() => onNavigate('canvas')} className="flex flex-1 items-center gap-3 rounded-2xl bg-[#1E1E1E] p-4 text-left ring-1 ring-[#2E2E2E] hover:opacity-90">
            <img src={posters[6]} alt="" className="h-16 w-24 rounded-lg object-cover" />
            <span><span className="block font-medium text-white">Canvas</span><span className="text-sm text-[#A8A8A8]">Your creative work…</span></span>
          </button>
          <button type="button" onClick={() => onNavigate('marketing')} className="flex flex-1 items-center gap-3 rounded-2xl bg-[#1E1E1E] p-4 text-left ring-1 ring-[#2E2E2E] hover:opacity-90">
            <img src={posters[7]} alt="" className="h-16 w-24 rounded-lg object-cover" />
            <span><span className="block font-medium text-white">Marketing Studio</span><span className="text-sm text-[#A8A8A8]">Make a hit with Vidora Ads…</span></span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 7. MARKETING STUDIO (dark — "Vidora Ads")                           */
/* ------------------------------------------------------------------ */

function MarketingStudioPage({ onNavigate }: { onNavigate: (view: AIStudioView) => void }) {
  const ideas = useMemo(() => {
    const imgs = AI_IMAGES.filter((i) => i.kind === 'texture').slice(0, 5);
    return [
      { img: imgs[0], text: 'A product spotlight for a new lipstick shade' },
      { img: imgs[1], text: 'Summer sale teaser for a small clothing shop' },
      { img: imgs[2], text: 'A cosy coffee shop story in 15 seconds' },
      { img: imgs[3], text: 'Launch film for a fitness app' },
      { img: imgs[4], text: 'Travel reel for a weekend getaway' },
    ];
  }, []);
  const nav = ['Home', 'Solutions', 'Products', 'Templates', 'Pricing', 'Vidora Video 2.5'];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-black text-[#F2F2F2]">
      {/* Pill nav */}
      <div className="flex items-center gap-6 px-8 pt-5">
        <p className="text-2xl font-bold text-white"><span className="text-[#00D9D9]">✦</span> Vidora</p>
        <nav className="mx-auto flex items-center gap-1 rounded-full bg-[#1E1E1E] px-2 py-1.5 ring-1 ring-[#2E2E2E]">
          {nav.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => { if (n === 'Home') onNavigate('video'); if (n === 'Vidora Video 2.5') onNavigate('video'); }}
              className="rounded-full px-4 py-1.5 text-sm text-gray-300 hover:bg-[#2E2E2E] hover:text-white"
            >
              {n}{n === 'Solutions' || n === 'Products' ? ' ⌃' : ''}
            </button>
          ))}
        </nav>
        <button type="button" onClick={() => onNavigate('create')} className="rounded-full bg-[#242424] px-5 py-2.5 text-sm font-medium text-white ring-1 ring-[#2E2E2E] hover:bg-[#2E2E2E]">
          Start for free
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center px-8 pt-24 pb-10 text-center">
        <p className="flex items-center gap-2 text-[17px] text-gray-300">✦ The Simplest Video Agent</p>
        <h1 className="mt-6 text-[88px] leading-none text-white" style={SERIF}>Vidora Ads</h1>
        <p className="mt-4 max-w-xl text-[15px] text-[#A8A8A8]">
          Describe your product and Vidora Ads drafts a short marketing video for you — locally, with no credits and nothing to buy.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('create')}
          className="mt-10 flex items-center gap-2 rounded-full bg-[#A78BFA] px-8 py-4 text-lg font-medium text-black shadow-lg transition hover:brightness-110"
        >
          Start for Free ↗
        </button>
        <p className="mt-24 text-[15px] text-[#A8A8A8]">Try the following ideas</p>
        <div className="mt-6 flex items-end justify-center gap-4">
          {ideas.map((idea, i) => (
            <button
              key={idea.text}
              type="button"
              onClick={() => onNavigate('create')}
              className="w-44 overflow-hidden rounded-2xl bg-[#1E1E1E] text-left shadow-xl ring-1 ring-[#2E2E2E] transition hover:-translate-y-1"
              style={{ transform: `rotate(${[-8, -4, 0, 4, 8][i]}deg)` }}
            >
              <img src={withBase(idea.img.file)} alt={idea.text} loading="lazy" className="h-40 w-full object-cover" />
              <span className="block px-3 py-2.5 text-[13px] leading-snug text-gray-200">{idea.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 8. AI PROMO CAROUSEL (full-screen modal)                            */
/* ------------------------------------------------------------------ */

const PROMO_SLIDES = [
  { chips: ['Vidora Video 2.5', 'Vidora Image 2.0', 'Motion Studio', 'Drama Studio'], lines: ['Pro Quality', 'Lower cost'], sub: 'Faster generation, no credits' },
  { chips: ['Vidora Video 2.5', 'Vidora Image 2.0', 'Motion Studio', 'Drama Studio'], lines: ['Imagine it.', 'Design it.'], sub: 'Local image generation, no credits' },
  { chips: ['Vidora Video 2.5', 'Vidora Image 2.0', 'Motion Studio', 'Drama Studio'], lines: ['Create anything', 'you imagine'], sub: 'Agent, image, video, audio and music — on this computer' },
];

function PromoCarousel({ onClose, onTry }: { onClose: () => void; onTry: () => void }) {
  const [slide, setSlide] = useState(0);
  const [muted, setMuted] = useState(true);
  const posters = useMemo(() => AI_CLIPS.slice(0, 3).map((c) => withBase(c.poster)), []);
  const s = PROMO_SLIDES[slide];
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-black p-6 text-white">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px]">
        <img src={posters[slide]} alt="" className="h-[62vh] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        <div className="absolute top-4 right-4 flex gap-2">
          <button type="button" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(!muted)} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70">
            {muted ? '🔇' : '🔊'}
          </button>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-lg text-white hover:bg-black/70">✕</button>
        </div>
        <p className="absolute top-1/3 left-8 text-[56px] leading-tight font-bold italic" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>{s.lines[0]}</p>
        <p className="absolute top-1/3 right-8 text-[56px] leading-tight font-bold italic" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>{s.lines[1]}</p>
        <div className="absolute right-8 bottom-6 left-8 flex items-end justify-between gap-4">
          <p className="text-[26px] font-semibold">{s.sub}</p>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Previous" onClick={() => setSlide((slide + PROMO_SLIDES.length - 1) % PROMO_SLIDES.length)} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-2xl text-white hover:bg-black/70">‹</button>
            <button type="button" aria-label="Next" onClick={() => setSlide((slide + 1) % PROMO_SLIDES.length)} className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-2xl text-white hover:bg-black/70">›</button>
            <button type="button" onClick={onTry} className="rounded-full bg-white px-8 py-3.5 text-lg font-medium text-black hover:bg-gray-100">Try it now</button>
          </div>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        {s.chips.map((c) => (
          <button key={c} type="button" onClick={onTry} className="rounded-full bg-[#242424] px-5 py-2.5 text-sm text-gray-200 ring-1 ring-[#2E2E2E] hover:bg-[#2E2E2E]">{c}</button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        {PROMO_SLIDES.map((_, i) => (
          <button key={i} type="button" aria-label={`Slide ${i + 1}`} onClick={() => setSlide(i)} className={`h-2 rounded-full transition ${i === slide ? 'w-8 bg-white' : 'w-2 bg-gray-600'}`} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Wrapper                                                             */
/* ------------------------------------------------------------------ */

const NAV_ITEMS: { id: AIStudioView; label: string }[] = [
  { id: 'video', label: 'Video Studio' },
  { id: 'inspiration', label: 'Inspiration' },
  { id: 'design', label: 'Design Studio' },
  { id: 'create', label: 'Create' },
  { id: 'explore', label: 'Explore' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'marketing', label: 'Marketing Studio' },
  { id: 'promo', label: 'AI Promo' },
];

export default function AIStudios({ initialView = 'video', onOpenEditor }: AIStudiosProps) {
  const [view, setView] = useState<AIStudioView>(initialView);
  const [createTab, setCreateTab] = useState<string>('agent');
  const dark = view === 'create' || view === 'explore' || view === 'canvas' || view === 'marketing' || view === 'promo';

  const navigate = (v: AIStudioView, tab?: string) => {
    if (tab) setCreateTab(tab);
    setView(v);
  };

  return (
    <div className="flex h-full min-h-[600px] flex-col overflow-hidden bg-[#141414]">
      {/* Wrapper's own nav (so the pages render standalone, unwired). */}
      <div className={`flex h-11 shrink-0 items-center gap-1 overflow-x-auto px-3 ${dark ? 'border-b border-[#2E2E2E] bg-[#0A0A0A] text-gray-300' : 'border-b border-black/10 bg-white text-gray-700'}`}>
        <span className="mr-2 shrink-0 text-sm font-bold"><span className="text-[#00D9D9]">✦</span> Vidora <span className="font-normal opacity-60">AI Studios</span></span>
        {NAV_ITEMS.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setView(n.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-[13px] whitespace-nowrap transition ${
              view === n.id
                ? dark
                  ? 'bg-[#00D9D9] font-medium text-[#062A2A]'
                  : 'bg-[#111111] font-medium text-white'
                : dark
                  ? 'hover:bg-[#242424] hover:text-white'
                  : 'hover:bg-gray-100'
            }`}
          >
            {n.label}
          </button>
        ))}
        <span className="ml-auto hidden shrink-0 pl-3 text-xs opacity-60 lg:block">Local generation · no credits</span>
      </div>

      <div className="min-h-0 flex-1">
        {view === 'video' && <VideoStudioPage onOpenEditor={onOpenEditor} />}
        {view === 'inspiration' && <InspirationPage />}
        {view === 'design' && <DesignStudioPage />}
        {view === 'create' && <CreatePage initialTab={createTab} onNavigate={navigate} />}
        {view === 'explore' && <ExplorePage onNavigate={navigate} />}
        {view === 'canvas' && <CanvasPage onNavigate={navigate} onOpenEditor={onOpenEditor} />}
        {view === 'marketing' && <MarketingStudioPage onNavigate={navigate} />}
        {view === 'promo' && <PromoCarousel onClose={() => setView('video')} onTry={() => setView('create')} />}
      </div>
    </div>
  );
}
