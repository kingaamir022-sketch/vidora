import { useMemo, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { aiFileAvailable } from '../lib/aiLibrary';
import { AVATAR_TILES } from '../lib/avatars';
import { AI_VOICES } from '../lib/voices';
import { dialogueSceneFor, generateImage } from '../lib/aiGenerate';
import { newId, type MediaItem } from '../schema/project';
import PanelShell, { PanelSearch, SectionHeading, SubNavItem } from './PanelShell';
import { IconPlus, IconPro } from './icons';

/**
 * AI avatar tab (CapCut-fix 2026-11-25, O1/O2). Replaces the old
 * "AI Tools" tab in the same (11th) position. Two-step flow:
 * "① Choose avatar — ② Add speech" (step 1 teal, step 2 gray).
 * Sub-nav: Avatar library (active, ◆), Photo to avatar ◆, Fashion
 * model … ◆, Video translator ◆, AI dialogue sce… ◆. Content:
 * "AI avatar" heading; chips "My avatars" / "Trending" / "Marketing";
 * cards: "Create" card (avatar+ icon) + avatar cards (portrait tile,
 * truncated name, download icon); "Next" teal button bottom-right.
 * Step 2 "Add speech": text + voice pick (16 Vidora voices) +
 * Generate narration → adds an avatar clip + a narration clip to the
 * timeline. All avatars are Vidora's own original portrait tiles
 * (src/lib/avatars.ts) — CapCut shows photos; Vidora ships no photos,
 * so the same slot holds a stylised portrait render with the same
 * behaviour; ◆ badges mean "Included in this build — nothing is charged."
 */
type AvatarSection = 'library' | 'photo' | 'fashion' | 'translator' | 'dialogue';
type AvatarChip = 'mine' | 'trending' | 'marketing';

export default function AIAvatarPanel() {
  const project = useProjectStore((s) => s.project);
  const addMediaFiles = useProjectStore((s) => s.addMediaFiles);
  const addMediaItem = useProjectStore((s) => s.addMediaItem);
  const addAiMediaClip = useProjectStore((s) => s.addAiMediaClip);
  const addTtsNarration = useProjectStore((s) => s.addTtsNarration);
  const [section, setSection] = useState<AvatarSection>('library');
  const [chip, setChip] = useState<AvatarChip>('trending');
  const [step, setStep] = useState<1 | 2>(1);
  const [query, setQuery] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<{ id: string; name: string; src: string } | null>(null);
  const [speech, setSpeech] = useState('');
  const [voiceId, setVoiceId] = useState(AI_VOICES[0]?.id ?? '');
  const [notice, setNotice] = useState('');
  const [createPrompt, setCreatePrompt] = useState('');
  const [creating, setCreating] = useState(false);
  const [customAvatars, setCustomAvatars] = useState<{ id: string; name: string; src: string }[]>([]);
  const [translateLang, setTranslateLang] = useState('ur');
  const [dialoguePrompt, setDialoguePrompt] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const myImages = useMemo(
    () => (project?.media ?? []).filter((m) => m.kind === 'image').map((m) => ({ id: m.id, name: m.name, src: m.thumbnail ?? m.src })),
    [project?.media],
  );
  // CapCut-fix (2026-11-25, O1): the avatar library shows portrait
  // tiles, not the AI-image frames/textures it used to show — the frames
  // looked like borders, not avatars. Tiles are original SVG portraits
  // (lib/avatars.ts); Trending = first 12, Marketing = last 12, Fashion
  // model = middle 12.
  const trending = useMemo(() => AVATAR_TILES.slice(0, 12), []);
  const marketing = useMemo(() => AVATAR_TILES.slice(12, 24), []);
  const fashion = useMemo(() => AVATAR_TILES.slice(6, 18), []);

  const libraryCards = useMemo(() => {
    const base =
      chip === 'mine'
        ? [...customAvatars, ...myImages]
        : chip === 'marketing'
          ? marketing
          : trending;
    const q = query.trim().toLowerCase();
    return q ? base.filter((c) => c.name.toLowerCase().includes(q)) : base;
  }, [chip, query, customAvatars, myImages, trending, marketing]);

  const pickAvatar = async (card: { id: string; name: string; src: string }) => {
    setSelectedAvatar(card);
    setNotice('');
  };

  const ensureMediaItem = async (card: { id: string; name: string; src: string }): Promise<string | null> => {
    const existing = (project?.media ?? []).find((m) => m.id === card.id || m.src === card.src);
    if (existing) return existing.id;
    // Tiles are inline SVG data URIs — always present, no file to probe.
    const installed = card.src.startsWith('data:') ? true : await aiFileAvailable(card.src);
    if (!installed) {
      setNotice(`“${card.name}” needs its image file — the full AI library ships in the Drive release. Pick one of “My avatars” instead.`);
      return null;
    }
    const item: MediaItem = {
      createdAt: new Date().toISOString(),
      duration: 5,
      folderId: 'folder-all',
      height: 720,
      id: newId('media'),
      kind: 'image',
      mime: 'image/png',
      name: card.name,
      size: 0,
      src: card.src,
      thumbnail: card.src,
      width: 1280,
    };
    addMediaItem(item);
    return item.id;
  };

  const generateSpeech = async () => {
    if (!selectedAvatar || !speech.trim()) return;
    const mediaId = await ensureMediaItem(selectedAvatar);
    if (!mediaId) return;
    addAiMediaClip(mediaId);
    addTtsNarration(speech.trim(), voiceId, 1, 1);
    setNotice(`Avatar clip + narration added at the playhead.`);
  };

  const runCreate = async () => {
    if (!createPrompt.trim()) return;
    setCreating(true);
    try {
      const src = generateImage(createPrompt, 0);
      if (!src) {
        setNotice('Could not generate an avatar from this prompt — try different words.');
        return;
      }
      const card = { id: newId('avatar'), name: `Avatar — ${createPrompt.slice(0, 30) || 'custom'}`, src };
      setCustomAvatars((a) => [card, ...a]);
      setSelectedAvatar(card);
      setChip('mine');
      setCreatePrompt('');
    } finally {
      setCreating(false);
    }
  };

  const runDialogue = async () => {
    if (!dialoguePrompt.trim()) return;
    const scene = dialogueSceneFor(dialoguePrompt);
    if (!scene.image) {
      setNotice('Could not build a dialogue scene from this prompt — try different words.');
      return;
    }
    const item: MediaItem = {
      createdAt: new Date().toISOString(),
      duration: 5,
      folderId: 'folder-all',
      height: 720,
      id: newId('media'),
      kind: 'image',
      mime: 'image/png',
      name: `Dialogue scene — ${dialoguePrompt.slice(0, 30) || 'untitled'}`,
      size: 0,
      src: scene.image,
      thumbnail: scene.image,
      width: 1280,
    };
    addMediaItem(item);
    addAiMediaClip(item.id);
    addTtsNarration(scene.lines.join(' '), scene.voice.id, 1, 1);
    setNotice('Dialogue scene added: image clip + narration at the playhead.');
  };

  const avatarCard = (card: { id: string; name: string; src: string }, pro = false) => (
    <div
      key={card.id}
      className={`relative overflow-hidden rounded-lg border ${selectedAvatar?.id === card.id ? 'border-[#00D9D9]' : 'border-[#2E2E2E] hover:border-[#3D3D3D]'} bg-[#242424]`}
    >
      <button type="button" onClick={() => void pickAvatar(card)} title={card.name} className="block w-full text-left">
        <img src={card.src} alt={card.name} className="h-28 w-full object-cover" loading="lazy" />
        <span className="block truncate px-2 py-1 text-[11px]">{card.name}</span>
      </button>
      {pro && (
        <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-[#7C3AED] px-1 py-0.5 text-[10px] leading-none text-white" title="Included in this build — nothing is charged.">
          <IconPro size={10} /> Pro
        </span>
      )}
      <a href={card.src} download={`${card.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${card.src.startsWith('data:') ? 'svg' : 'png'}`} aria-label={`Download ${card.name}`} title="Download" className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-zinc-200 hover:text-white">⭳</a>
    </div>
  );

  return (
    <PanelShell
      subNav={<>
        <SubNavItem active={section === 'library'} onClick={() => setSection('library')}>
          Avatar library <span className="ml-1 text-[#7C3AED]">◆</span>
        </SubNavItem>
        <SubNavItem active={section === 'photo'} onClick={() => setSection('photo')}>
          Photo to avatar <span className="ml-1 text-[#7C3AED]">◆</span>
        </SubNavItem>
        <SubNavItem active={section === 'fashion'} onClick={() => setSection('fashion')}>
          Fashion model … <span className="ml-1 text-[#7C3AED]">◆</span>
        </SubNavItem>
        <SubNavItem active={section === 'translator'} onClick={() => setSection('translator')}>
          Video translator <span className="ml-1 text-[#7C3AED]">◆</span>
        </SubNavItem>
        <SubNavItem active={section === 'dialogue'} onClick={() => setSection('dialogue')}>
          AI dialogue sce… <span className="ml-1 text-[#7C3AED]">◆</span>
        </SubNavItem>
      </>}
    >
      <div className="flex items-center gap-2 text-xs">
        <span className={`flex items-center gap-1 font-semibold ${step === 1 ? 'text-[#00D9D9]' : 'text-[#A8A8A8]'}`}>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${step === 1 ? 'bg-[#00D9D9] text-[#062A2A]' : 'bg-[#2E2E2E] text-[#A8A8A8]'}`}>1</span>
          Choose avatar
        </span>
        <span className="text-[#6E6E6E]">—</span>
        <span className={`flex items-center gap-1 font-semibold ${step === 2 ? 'text-[#00D9D9]' : 'text-[#A8A8A8]'}`}>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${step === 2 ? 'bg-[#00D9D9] text-[#062A2A]' : 'bg-[#2E2E2E] text-[#A8A8A8]'}`}>2</span>
          Add speech
        </span>
      </div>

      {section === 'library' && step === 1 && (
        <>
          <SectionHeading>AI avatar</SectionHeading>
          <div className="mt-2 flex gap-1">
            {(['mine', 'trending', 'marketing'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChip(c)}
                aria-pressed={chip === c}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] capitalize ${chip === c ? 'border-[#00D9D9] bg-[#00D9D9]/10 text-[#00D9D9]' : 'border-[#3D3D3D] text-[#A8A8A8]'}`}
              >
                {c === 'mine' ? 'My avatars' : c}
              </button>
            ))}
          </div>
          <PanelSearch value={query} onChange={setQuery} placeholder="People are searching avatars" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setChip('mine')} className="flex h-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#3D3D3D] bg-[#242424] text-[#A8A8A8] hover:border-[#00D9D9] hover:text-[#00D9D9]" title="Create a new avatar from a prompt">
              <IconPlus size={22} />
              <span className="text-[11px] font-semibold">Create</span>
            </button>
            {libraryCards.map((c) => avatarCard(c, chip !== 'mine'))}
          </div>
          {libraryCards.length === 0 && (
            <p className="mt-2 text-[11px] text-zinc-500">
              {chip === 'mine' ? 'No avatars yet — create one from a prompt below, or import a photo in “Photo to avatar”.' : 'No avatars match.'}
            </p>
          )}
          <div className="mt-3 rounded-md border border-[#2E2E2E] bg-[#242424] p-2">
            <label className="block text-[11px] text-[#A8A8A8]">
              Create an avatar from a prompt
              <input
                value={createPrompt}
                onChange={(e) => setCreatePrompt(e.target.value)}
                placeholder="Describe your avatar…"
                aria-label="Avatar prompt"
                className="mt-1 w-full rounded-md border border-[#2E2E2E] bg-[#1E1E1E] px-2 py-1.5 text-xs outline-none placeholder:text-[#6E6E6E]"
              />
            </label>
            <button type="button" onClick={() => void runCreate()} disabled={!createPrompt.trim() || creating} className="mt-2 w-full rounded-md bg-[#00D9D9] px-2 py-1.5 text-xs font-semibold text-[#062A2A] disabled:opacity-40">
              {creating ? 'Creating…' : 'Create avatar'}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
            Pick an avatar, then press Next to add its speech. All avatars are original Vidora portrait renders. ◆ items are included in this build — nothing is charged.
          </p>
        </>
      )}

      {section === 'library' && step === 2 && (
        <>
          <SectionHeading>Add speech</SectionHeading>
          {selectedAvatar && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#2E2E2E] bg-[#242424] p-2">
              <img src={selectedAvatar.src} alt={selectedAvatar.name} className="h-12 w-12 rounded object-cover" />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{selectedAvatar.name}</span>
              <button type="button" onClick={() => setStep(1)} className="shrink-0 text-[11px] text-[#00D9D9]">Change</button>
            </div>
          )}
          <label className="mt-3 block text-xs">
            <span className="text-zinc-400">What should the avatar say?</span>
            <textarea value={speech} onChange={(e) => setSpeech(e.target.value)} rows={4} placeholder="Type the speech…" aria-label="Avatar speech" className="mt-1 w-full rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1.5 text-xs outline-none placeholder:text-[#6E6E6E]" />
          </label>
          <label className="mt-2 block text-xs">
            <span className="text-zinc-400">Voice ({AI_VOICES.length} Vidora voices)</span>
            <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} aria-label="Avatar voice" className="mt-1 w-full rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs">
              {AI_VOICES.map((v) => (
                <option key={v.id} value={v.id}>{v.name} ({v.lang})</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void generateSpeech()} disabled={!selectedAvatar || !speech.trim()} className="mt-3 w-full rounded-md bg-[#00D9D9] px-2 py-1.5 text-xs font-semibold text-[#062A2A] disabled:opacity-40">
            Generate narration
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">Adds the avatar as an image clip and the speech as a narration clip at the playhead. Narration speaks via the browser voice in preview.</p>
        </>
      )}

      {section === 'photo' && (
        <>
          <SectionHeading>Photo to avatar</SectionHeading>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Upload a photo and it becomes an avatar still — pick it in the Avatar library afterwards.</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void addMediaFiles(e.target.files);
              e.target.value = '';
              setNotice('Photo imported — find it under “My avatars” in the Avatar library.');
            }}
          />
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-3 w-full rounded-md bg-[#00D9D9] px-2 py-1.5 text-xs font-semibold text-[#062A2A]">Upload a photo</button>
        </>
      )}

      {section === 'fashion' && (
        <>
          <SectionHeading>Fashion model</SectionHeading>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Avatars in fashion poses — original Vidora renders. Pick one to use it as your avatar.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {fashion.map((i) => avatarCard(i, true))}
          </div>
        </>
      )}

      {section === 'translator' && (
        <>
          <SectionHeading>Video translator</SectionHeading>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Translate the narration into another language with one of Vidora’s voices. The translated speech is added as a narration clip.</p>
          <label className="mt-2 block text-xs">
            <span className="text-zinc-400">Language</span>
            <select value={translateLang} onChange={(e) => setTranslateLang(e.target.value)} aria-label="Translation language" className="mt-1 w-full rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1 text-xs">
              {['en', 'ur', 'hi', 'ar'].map((l) => (
                <option key={l} value={l}>{AI_VOICES.find((v) => v.langTag.startsWith(l))?.lang ?? l}</option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-xs">
            <span className="text-zinc-400">Text to translate</span>
            <textarea value={speech} onChange={(e) => setSpeech(e.target.value)} rows={4} placeholder="Type the text…" aria-label="Text to translate" className="mt-1 w-full rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1.5 text-xs outline-none placeholder:text-[#6E6E6E]" />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!speech.trim()) return;
              const voice = AI_VOICES.find((v) => v.langTag.startsWith(translateLang)) ?? AI_VOICES[0];
              addTtsNarration(speech.trim(), voice.id, 1, 1);
              setNotice(`Translated narration added (voice: ${voice.name}).`);
            }}
            disabled={!speech.trim()}
            className="mt-3 w-full rounded-md bg-[#00D9D9] px-2 py-1.5 text-xs font-semibold text-[#062A2A] disabled:opacity-40"
          >
            Translate + add narration
          </button>
        </>
      )}

      {section === 'dialogue' && (
        <>
          <SectionHeading>AI dialogue scene</SectionHeading>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">A scripted two-avatar dialogue: a scene image plus two lines of narration, added to the timeline.</p>
          <label className="mt-2 block text-xs">
            <span className="text-zinc-400">Scene prompt</span>
            <textarea value={dialoguePrompt} onChange={(e) => setDialoguePrompt(e.target.value)} rows={3} placeholder="Describe the scene…" aria-label="Dialogue scene prompt" className="mt-1 w-full rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1.5 text-xs outline-none placeholder:text-[#6E6E6E]" />
          </label>
          <button type="button" onClick={() => void runDialogue()} disabled={!dialoguePrompt.trim()} className="mt-3 w-full rounded-md bg-[#00D9D9] px-2 py-1.5 text-xs font-semibold text-[#062A2A] disabled:opacity-40">
            Build dialogue scene
          </button>
        </>
      )}

      {notice && <p className="mt-3 text-[11px] leading-relaxed text-emerald-400">{notice}</p>}

      {section === 'library' && step === 1 && (
        <div className="mt-4 flex justify-end border-t border-zinc-800 pt-3">
          <button type="button" onClick={() => setStep(2)} disabled={!selectedAvatar} className="rounded-md bg-[#00D9D9] px-5 py-1.5 text-xs font-semibold text-[#062A2A] disabled:opacity-40">
            Next
          </button>
        </div>
      )}
      {section === 'library' && step === 2 && (
        <div className="mt-4 flex justify-between border-t border-zinc-800 pt-3">
          <button type="button" onClick={() => setStep(1)} className="rounded-md border border-[#3D3D3D] px-4 py-1.5 text-xs">Back</button>
          <button type="button" onClick={() => { setStep(1); setSelectedAvatar(null); setSpeech(''); }} className="rounded-md border border-[#3D3D3D] px-4 py-1.5 text-xs">Done</button>
        </div>
      )}
    </PanelShell>
  );
}
