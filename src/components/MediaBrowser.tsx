import { useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore, type LeftTab } from '../store/projectStore';
import { formatBytes, formatDuration } from '../lib/media';
import { dialogueSceneFor, generateClip, generateImage } from '../lib/aiGenerate';
import {
  AI_CLIPS,
  AI_IMAGES,
  aiClipToMediaItem,
  aiImageToMediaItem,
  aiLibraryInstalled,
  aiMatches,
} from '../lib/aiLibrary';
import { BACKGROUND_CATALOG, backgroundThumbnail } from '../lib/backgrounds';
import { newId, type MediaItem } from '../schema/project';
import PanelShell, { PanelSearch, SectionHeading, SubNavItem } from './PanelShell';
import { IconChevronDown, IconChevronRight, IconPlus, IconStar } from './icons';

type MediaSection =
  | 'import'
  | 'media'
  | 'timeline'
  | 'subprojects'
  | 'yours-favorites'
  | 'yours-presets'
  | 'yours-brand'
  | 'generate-image'
  | 'generate-video'
  | 'generate-dialogue';

const FAVORITES_KEY = 'vidora.favorites.v1';

function loadFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/**
 * Media tab (CapCut-fix 2026-11-25, E1–E6). Sub-nav: Import, Media,
 * Timeline, Subprojects, Yours ⌄ (Favorites / My presets / Brand
 * assets), Generate ⌄ (AI image / AI video / AI dialogue scene),
 * Spaces ⌄, Library ⌄, Create ⌄ (Dreamina-equivalent, Vidora's own
 * name). Import is a dashed drop zone + three tool cards. Media grid
 * shows an "Added" badge once a clip is on the timeline. Generate
 * runs Vidora's local models (Vidora Image 1.0 / Vidora Motion 1.0 —
 * CapCut's "Seedream" name is never used).
 *
 * Spaces / Library / Create open the home pages (the sidebar there
 * holds the pages); the Media sub-nav entries land on the dashboard.
 *
 * The Media section also lists the AI library catalog (CapCut-fix
 * 2026-11-25, O3 redistribution): 100 AI clips and 110 AI images,
 * searchable with the same box as imported media, click to add to the
 * timeline. When the library files are not in this install the
 * sections say so honestly instead of showing dead cards.
 */
export default function MediaBrowser({ onSelectTab }: { onSelectTab: (tab: LeftTab) => void }) {
  const project = useProjectStore((s) => s.project);
  const openDashboard = useProjectStore((s) => s.openDashboard);
  const addMediaFiles = useProjectStore((s) => s.addMediaFiles);
  const addMediaToTimeline = useProjectStore((s) => s.addMediaToTimeline);
  const addMediaItem = useProjectStore((s) => s.addMediaItem);
  const addAiMediaClip = useProjectStore((s) => s.addAiMediaClip);
  const addRenderedMedia = useProjectStore((s) => s.addRenderedMedia);
  const addTtsNarration = useProjectStore((s) => s.addTtsNarration);
  const addFolder = useProjectStore((s) => s.addFolder);
  const addBackgroundClip = useProjectStore((s) => s.addBackgroundClip);
  const [section, setSection] = useState<MediaSection>('import');
  const [yoursOpen, setYoursOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [folderId, setFolderId] = useState('folder-all');
  const [folderName, setFolderName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ id: string; src: string; kind: 'image' | 'video'; blob?: Blob }[]>([]);
  const [genNote, setGenNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const media = project?.media ?? [];
  const folders = project?.folders ?? [{ id: 'folder-all', name: 'All media' }];
  const usedMediaIds = useMemo(() => {
    const ids = new Set<string>();
    for (const track of project?.tracks ?? []) for (const clip of track.clips) if (clip.mediaId) ids.add(clip.mediaId);
    return ids;
  }, [project]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return media.filter((m) => (folderId === 'folder-all' || m.folderId === folderId) && (!q || m.name.toLowerCase().includes(q)));
  }, [media, folderId, search]);
  const usedMedia = media.filter((m) => usedMediaIds.has(m.id));
  const favoriteMedia = media.filter((m) => favorites.includes(m.id));

  // AI library catalog (O3 redistribution): searchable with the same
  // box as imported media above. Availability is probed once — a
  // text-only checkout has the catalog but not the files.
  const [aiInstalled, setAiInstalled] = useState<{ clips: boolean; images: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    void aiLibraryInstalled().then((r) => {
      if (live) setAiInstalled({ clips: r.clips, images: r.images });
    });
    return () => {
      live = false;
    };
  }, []);
  const filteredAiClips = useMemo(
    () => AI_CLIPS.filter((c) => aiMatches([c.name, c.scene, c.motion, ...c.tags], search)),
    [search],
  );
  const filteredAiImages = useMemo(
    () => AI_IMAGES.filter((i) => aiMatches([i.name, i.design, i.kind, ...i.tags], search)),
    [search],
  );
  const addAiClip = (entryId: string) => {
    const entry = AI_CLIPS.find((c) => c.id === entryId);
    if (!entry) return;
    const item = aiClipToMediaItem(entry, newId('media'));
    addMediaItem(item);
    addMediaToTimeline(item.id);
  };
  const addAiImage = (entryId: string) => {
    const entry = AI_IMAGES.find((i) => i.id === entryId);
    if (!entry) return;
    const item = aiImageToMediaItem(entry, newId('media'));
    addMediaItem(item);
    addAiMediaClip(item.id);
  };

  const handleFiles = async (files: FileList | File[]) => {
    setImporting(true);
    try {
      await addMediaFiles(files, folderId);
    } finally {
      setImporting(false);
    }
  };

  const toggleFavorite = (id: string) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const modelName = section === 'generate-video' ? 'Vidora Motion 1.0' : section === 'generate-dialogue' ? 'Vidora Dialogue 1.0' : 'Vidora Image 1.0';

  const runGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenNote('');
    try {
      const out: { id: string; src: string; kind: 'image' | 'video'; blob?: Blob }[] = [];
      if (section === 'generate-video') {
        for (let i = 0; i < count; i += 1) {
          const clip = await generateClip(prompt, i);
          if (clip) out.push({ blob: clip.blob, id: newId('gen'), kind: 'video', src: URL.createObjectURL(clip.blob) });
        }
      } else if (section === 'generate-dialogue') {
        const scene = dialogueSceneFor(prompt);
        if (scene.image) out.push({ id: newId('gen'), kind: 'image', src: scene.image });
        else setGenNote('Could not paint a dialogue scene from this prompt — try different words.');
      } else {
        for (let i = 0; i < count; i += 1) {
          const src = generateImage(prompt, i);
          if (src) out.push({ id: newId('gen'), kind: 'image', src });
        }
      }
      setGenerated(out);
      if (out.length === 0 && !genNote) setGenNote('Nothing was generated — try a different prompt.');
    } finally {
      setGenerating(false);
    }
  };

  const addGenerated = async (g: { id: string; src: string; kind: 'image' | 'video'; blob?: Blob }) => {
    if (g.kind === 'video' && g.blob) {
      await addRenderedMedia(g.blob, `Vidora video — ${prompt.slice(0, 40) || 'untitled'}`);
      return;
    }
    if (section === 'generate-dialogue') {
      const scene = dialogueSceneFor(prompt);
      const item: MediaItem = {
        createdAt: new Date().toISOString(),
        duration: 5,
        folderId: 'folder-all',
        height: 720,
        id: newId('media'),
        kind: 'image',
        mime: 'image/png',
        name: `Dialogue scene — ${prompt.slice(0, 40) || 'untitled'}`,
        size: 0,
        src: g.src,
        thumbnail: g.src,
        width: 1280,
      };
      addMediaItem(item);
      addAiMediaClip(item.id);
      addTtsNarration(scene.lines.join(' '), scene.voice.id, 1, 1);
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
      name: `Vidora image — ${prompt.slice(0, 40) || 'untitled'}`,
      size: 0,
      src: g.src,
      thumbnail: g.src,
      width: 1280,
    };
    addMediaItem(item);
    addAiMediaClip(item.id);
  };

  const mediaCard = (m: (typeof media)[number]) => (
    <div key={m.id} className="relative overflow-hidden rounded-lg border border-[#2E2E2E] bg-[#242424]">
      <button type="button" onClick={() => addMediaToTimeline(m.id)} title={`${m.name} — click to add to timeline`} className="block w-full text-left">
        {m.thumbnail ? (
          <img src={m.thumbnail} alt={m.name} className="h-20 w-full object-cover" />
        ) : (
          <span className="flex h-20 w-full items-center justify-center bg-[#2E2E2E] text-xs uppercase text-[#A8A8A8]">{m.kind}</span>
        )}
        {m.duration !== undefined && (
          <span className="absolute right-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[10px] text-white">{formatDuration(m.duration)}</span>
        )}
        {usedMediaIds.has(m.id) && (
          <span className="absolute left-1 top-1 rounded bg-[#00D9D9] px-1 py-0.5 text-[10px] font-semibold text-[#062A2A]">Added</span>
        )}
        <span className="block truncate px-2 pt-1 text-[11px] text-[#F2F2F2]">{m.name}</span>
        <span className="block px-2 pb-1.5 text-[10px] text-[#6E6E6E]">
          {m.kind} · {formatBytes(m.size)}
          {m.width ? ` · ${m.width}×${m.height}` : ''}
        </span>
      </button>
      <button
        type="button"
        onClick={() => toggleFavorite(m.id)}
        aria-pressed={favorites.includes(m.id)}
        aria-label={favorites.includes(m.id) ? `Remove ${m.name} from favorites` : `Add ${m.name} to favorites`}
        className={`absolute bottom-1 right-1 rounded p-1 ${favorites.includes(m.id) ? 'text-[#FFD34D]' : 'text-[#A8A8A8] hover:text-[#F2F2F2]'}`}
      >
        <IconStar size={14} />
      </button>
    </div>
  );

  return (
    <PanelShell
      subNav={
        <>
          <SubNavItem active={section === 'import'} onClick={() => setSection('import')}>Import</SubNavItem>
          <SubNavItem active={section === 'media'} onClick={() => setSection('media')}>Media</SubNavItem>
          <SubNavItem active={section === 'timeline'} onClick={() => setSection('timeline')}>Timeline</SubNavItem>
          <SubNavItem active={section === 'subprojects'} onClick={() => setSection('subprojects')}>Subprojects</SubNavItem>
          <button type="button" onClick={() => setYoursOpen((v) => !v)} className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]">
            Yours {yoursOpen ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
          </button>
          {yoursOpen && (
            <div className="pl-3">
              <SubNavItem active={section === 'yours-favorites'} onClick={() => setSection('yours-favorites')}>Favorites</SubNavItem>
              <SubNavItem active={section === 'yours-presets'} onClick={() => setSection('yours-presets')}>My presets</SubNavItem>
              <SubNavItem active={section === 'yours-brand'} onClick={() => setSection('yours-brand')}>Brand assets</SubNavItem>
            </div>
          )}
          <button type="button" onClick={() => setGenerateOpen((v) => !v)} className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]">
            <span>Generate <span className="ml-1 rounded bg-[#7C3AED] px-1 py-0.5 text-[9px] font-semibold text-white">AI</span></span>
            {generateOpen ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
          </button>
          {generateOpen && (
            <div className="pl-3">
              <SubNavItem active={section === 'generate-image'} onClick={() => setSection('generate-image')}>AI image</SubNavItem>
              <SubNavItem active={section === 'generate-video'} onClick={() => setSection('generate-video')}>AI video</SubNavItem>
              <SubNavItem active={section === 'generate-dialogue'} onClick={() => setSection('generate-dialogue')}>AI dialogue scene</SubNavItem>
            </div>
          )}
          <SubNavItem onClick={openDashboard}>Spaces ⌄</SubNavItem>
          <SubNavItem onClick={openDashboard}>Library ⌄</SubNavItem>
          <SubNavItem onClick={openDashboard}>Create ⌄</SubNavItem>
        </>
      }
    >
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*,.gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {section === 'import' && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          aria-label="Import media"
          className={`w-full rounded-lg border-2 border-dashed p-3 text-center ${dragOver ? 'border-[#00D9D9] bg-[#00D9D9]/10' : 'border-[#3D3D3D]'}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files); }}
        >
          <span className="flex items-center justify-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00D9D9] text-[#062A2A]">
              <IconPlus size={14} />
            </span>
            <span className="text-sm font-semibold">{importing ? 'Importing…' : 'Import'}</span>
          </span>
          <span className="mt-1.5 block text-[11px] leading-relaxed text-[#A8A8A8]">Drag and drop videos, photos, and audio files here</span>
        </button>
      )}

      {section === 'import' && (
        <>
          <p className="mt-4 text-center text-[11px] text-[#6E6E6E]">— No media? Create with these tools —</p>
          <div className="mt-2 space-y-2">
            {[
              { desc: 'Make an image, video or dialogue scene from a prompt', label: 'Generate', run: () => { setGenerateOpen(true); setSection('generate-image'); } },
              { desc: 'Pick an avatar and give it a voice', label: 'AI avatars', run: () => onSelectTab('AI avatar') },
              { desc: 'Record a voiceover for this project', label: 'Record', run: () => onSelectTab('Audio') },
            ].map((tool) => (
              <button key={tool.label} type="button" onClick={tool.run} className="block w-full rounded-lg border border-[#2E2E2E] bg-[#242424] p-3 text-left hover:border-[#3D3D3D]">
                <span className="block text-xs font-semibold">{tool.label}</span>
                <span className="mt-0.5 block text-[11px] text-[#A8A8A8]">{tool.desc}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {section === 'media' && (
        <>
          <PanelSearch value={search} onChange={setSearch} placeholder="People are searching videos" />
          <div className="mt-2 flex gap-1">
            <select value={folderId} onChange={(e) => setFolderId(e.target.value)} aria-label="Media folder" className="min-w-0 flex-1 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1.5 text-xs">
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && folderName.trim()) { addFolder(folderName); setFolderName(''); } }}
              placeholder="+ Folder"
              aria-label="New folder name"
              className="w-20 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1.5 text-xs"
            />
          </div>
          {filtered.length === 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-[#6E6E6E]">
              {media.length === 0 ? 'No media yet. Import files or drag them here — thumbnails and metadata appear for each file.' : 'No media matches this search / folder.'}
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">{filtered.map(mediaCard)}</div>
          )}
          <SectionHeading>Backgrounds</SectionHeading>
          <p className="mt-1 text-[11px] text-[#6E6E6E]">Procedural full-frame backgrounds. Click one to add it as a 5-second clip.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {BACKGROUND_CATALOG.slice(0, 8).map((b) => (
              <button key={b.id} type="button" onClick={() => addBackgroundClip(b.id)} title={`${b.name} — ${b.description}`} className="overflow-hidden rounded-lg border border-[#2E2E2E] bg-[#242424] text-left hover:border-[#3D3D3D]">
                <img src={backgroundThumbnail(b)} alt={b.name} className="h-14 w-full object-cover" />
                <span className="block truncate px-2 py-1 text-[11px]">{b.name}</span>
              </button>
            ))}
          </div>
          <section className="mt-3">
            <SectionHeading>AI clips</SectionHeading>
            {aiInstalled?.clips === false ? (
              <p className="mt-1 text-[11px] text-[#6E6E6E]">AI clips need the library files — they are not in this install.</p>
            ) : (
              <>
                <p className="mt-1 text-[11px] text-[#6E6E6E]">100 original AI clips. Click one to add it to the timeline.</p>
                {filteredAiClips.length === 0 ? (
                  <p className="mt-2 text-xs text-[#6E6E6E]">No AI clips match this search.</p>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {filteredAiClips.map((c) => (
                      <button key={c.id} type="button" onClick={() => addAiClip(c.id)} title={`${c.name} — click to add to timeline`} className="relative overflow-hidden rounded-lg border border-[#2E2E2E] bg-[#242424] text-left hover:border-[#3D3D3D]">
                        <img src={c.poster} alt={c.name} loading="lazy" className="h-14 w-full object-cover" />
                        <span className="absolute right-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[10px] text-white">{formatDuration(c.duration)}</span>
                        <span className="block truncate px-2 py-1 text-[11px]">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
          <section className="mt-3">
            <SectionHeading>AI images</SectionHeading>
            {aiInstalled?.images === false ? (
              <p className="mt-1 text-[11px] text-[#6E6E6E]">AI images need the library files — they are not in this install.</p>
            ) : (
              <>
                <p className="mt-1 text-[11px] text-[#6E6E6E]">110 original AI images. Click one to add it to the timeline.</p>
                {filteredAiImages.length === 0 ? (
                  <p className="mt-2 text-xs text-[#6E6E6E]">No AI images match this search.</p>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {filteredAiImages.map((i) => (
                      <button key={i.id} type="button" onClick={() => addAiImage(i.id)} title={`${i.name} — click to add to timeline`} className="overflow-hidden rounded-lg border border-[#2E2E2E] bg-[#242424] text-left hover:border-[#3D3D3D]">
                        <img src={i.file} alt={i.name} loading="lazy" className="h-14 w-full object-cover" />
                        <span className="block truncate px-2 py-1 text-[11px]">{i.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

      {section === 'timeline' && (
        <>
          <SectionHeading>Timeline</SectionHeading>
          <p className="mt-1 text-[11px] text-[#6E6E6E]">Media used on the timeline.</p>
          {usedMedia.length === 0 ? (
            <p className="mt-3 text-xs text-[#6E6E6E]">Nothing on the timeline yet. Add media from the Media section.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">{usedMedia.map(mediaCard)}</div>
          )}
        </>
      )}

      {section === 'subprojects' && (
        <div className="mt-6 text-center">
          <p className="text-sm font-semibold">Subprojects</p>
          <p className="mt-2 text-xs leading-relaxed text-[#A8A8A8]">Subprojects are not supported in this build. Each project stands on its own.</p>
        </div>
      )}

      {section === 'yours-favorites' && (
        <>
          <SectionHeading>Favorites</SectionHeading>
          {favoriteMedia.length === 0 ? (
            <div className="mt-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-[#3D3D3D] text-[#A8A8A8]"><IconStar size={22} /></span>
              <p className="mt-3 text-xs leading-relaxed text-[#A8A8A8]">Your favorite items will appear here.</p>
              <button type="button" onClick={openDashboard} className="mt-2 text-xs font-semibold text-[#00D9D9]">Go to Library</button>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">{favoriteMedia.map(mediaCard)}</div>
          )}
        </>
      )}

      {section === 'yours-presets' && (
        <>
          <SectionHeading>My presets</SectionHeading>
          <p className="mt-3 text-xs leading-relaxed text-[#6E6E6E]">No presets yet. Save a text or adjustment preset from the editor and it will appear here.</p>
        </>
      )}

      {section === 'yours-brand' && (
        <>
          <SectionHeading>Brand assets</SectionHeading>
          <p className="mt-3 text-xs leading-relaxed text-[#6E6E6E]">Brand assets live in the Spaces page, under the Brand kit tab.</p>
          <button type="button" onClick={openDashboard} className="mt-2 rounded-md bg-[#00D9D9] px-3 py-1.5 text-xs font-semibold text-[#062A2A]">Open Spaces</button>
        </>
      )}

      {(section === 'generate-image' || section === 'generate-video' || section === 'generate-dialogue') && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Prompt <span className="text-[#6E6E6E]" title="Describe what to generate, and how many results (1–10). Generation runs on this computer — nothing is uploaded.">ⓘ</span>
            </h3>
            <button type="button" onClick={() => setSection('generate-image')} className="text-xs text-[#00D9D9]">Showcase &gt;</button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Describe your image and how many results to generate (1–10)"
            aria-label="Generation prompt"
            className="mt-2 w-full rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1.5 text-xs outline-none placeholder:text-[#6E6E6E] focus:border-[#00D9D9]"
          />
          <div className="mt-2 flex items-center gap-2">
            <select value={modelName} onChange={() => { /* one model per type in this build */ }} aria-label="Model" className="min-w-0 flex-1 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1.5 text-xs">
              <option>{modelName}</option>
            </select>
            <label className="flex items-center gap-1 text-[11px] text-[#A8A8A8]">
              Results
              <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))} aria-label="Number of results" className="w-12 rounded-md border border-[#2E2E2E] bg-[#242424] px-1.5 py-1 text-xs" />
            </label>
            <button type="button" onClick={() => void runGenerate()} disabled={!prompt.trim() || generating} className="shrink-0 rounded-md bg-[#00D9D9] px-3 py-1.5 text-xs font-semibold text-[#062A2A] disabled:opacity-40">
              {generating ? 'Generating…' : 'Generate'}
            </button>
          </div>
          {genNote && <p className="mt-2 text-[11px] text-[#A8A8A8]">{genNote}</p>}
          {generated.length > 0 && (
            <>
              <SectionHeading>Results</SectionHeading>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {generated.map((g) => (
                  <button key={g.id} type="button" onClick={() => void addGenerated(g)} title="Click to add to the timeline" className="overflow-hidden rounded-lg border border-[#2E2E2E] bg-[#242424] text-left hover:border-[#00D9D9]">
                    {g.kind === 'video' ? (
                      <video src={g.src} className="h-20 w-full object-cover" muted loop playsInline />
                    ) : (
                      <img src={g.src} alt="Generated result" className="h-20 w-full object-cover" />
                    )}
                    <span className="block px-2 py-1 text-[11px]">Add to timeline</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </PanelShell>
  );
}
