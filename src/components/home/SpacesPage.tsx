import { useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { BUILTIN_LUTS } from '../../lib/lut';
import { TEXT_STYLE_PRESETS } from '../../lib/text';
import { AI_MUSIC_STYLES } from '../../lib/aiLibrary';
import { buildBundle, bundleFileName, bundleToText } from '../../lib/cloudBackup';
import { downloadBlob, formatBytesShort } from '../../lib/exportEngine';
import { GrayButton, NoteDialog, TealButton } from './HomeDialogs';
import type { MediaItem } from '../../schema/project';

/**
 * Spaces page (CapCut desktop shot 18).
 * Storage meter = real browser-storage estimate (local only, 5.0 GB shown
 * as the local cap label). Media = imported media across saved projects.
 * Brand kit = Vidora's real text presets, looks and music styles.
 * The .vidora bundle backup lives here (Y11).
 */

const FOLDERS_KEY = 'vidora.spaceFolders.v1';

function formatBytes(n: number): string {
  if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}
function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  return h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : formatDuration(totalSeconds);
}

function Donut({ used, total }: { total: number; used: number }) {
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#2E2E2E" strokeWidth="9" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="#00D9D9"
        strokeWidth="9"
        strokeDasharray={`${c * pct} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
    </svg>
  );
}

interface SpaceMedia extends MediaItem {
  projectName: string;
}

export default function SpacesPage({ onProNote }: { onProNote: () => void }) {
  const projects = useProjectStore((s) => s.projects);
  const openProject = useProjectStore((s) => s.openProject);
  const addMediaFiles = useProjectStore((s) => s.addMediaFiles);
  const importBundle = useProjectStore((s) => s.importBundle);
  const [tab, setTab] = useState<'space' | 'brandkit'>('space');
  const [folders, setFolders] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FOLDERS_KEY);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      return parsed.length > 0 ? parsed : ['Auto upload'];
    } catch {
      return ['Auto upload'];
    }
  });
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);
  const [filterKind, setFilterKind] = useState<'All' | 'Video' | 'Image' | 'Audio'>('All');
  const [search, setSearch] = useState('');
  const [usage, setUsage] = useState<{ quota?: number; usage?: number } | null>(null);
  const [trashNote, setTrashNote] = useState(false);
  const [backupProjectId, setBackupProjectId] = useState('');
  const [backupNotice, setBackupNotice] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (navigator.storage?.estimate) {
      navigator.storage
        .estimate()
        .then((est) => {
          if (!cancelled) setUsage({ quota: est.quota, usage: est.usage });
        })
        .catch(() => {
          if (!cancelled) setUsage({});
        });
    } else {
      setUsage({});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const media = useMemo<SpaceMedia[]>(() => {
    const all: SpaceMedia[] = [];
    for (const p of projects) {
      for (const m of p.media) all.push({ ...m, projectName: p.name });
    }
    return all;
  }, [projects]);

  const shownMedia = useMemo(() => {
    let list = [...media];
    if (filterKind !== 'All') list = list.filter((m) => m.kind === filterKind.toLowerCase());
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
    return showAll ? list : list.slice(0, 8);
  }, [media, filterKind, search, sortAsc, showAll]);

  const usedBytes = usage?.usage ?? 0;
  const quotaBytes = 5 * 1024 * 1024 * 1024; // 5.0 GB local label, as in CapCut
  const usedLabel = usage && usage.usage !== undefined ? formatBytes(usedBytes) : '—';

  const saveFolders = (next: string[]) => {
    setFolders(next);
    try {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
    } catch {
      /* session-only */
    }
  };

  const handleUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const target = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    if (!target) {
      useProjectStore.getState().createProject('Untitled Project');
      void useProjectStore.getState().addMediaFiles(files);
      return;
    }
    openProject(target);
    void addMediaFiles(files);
  };

  const lutGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const l of BUILTIN_LUTS) {
      const arr = map.get(l.category) ?? [];
      arr.push(l.name);
      map.set(l.category, arr);
    }
    return [...map.entries()];
  }, []);

  return (
    <div>
      {/* Space header card */}
      <div className="flex items-center gap-5 rounded-xl bg-[#242424] px-6 py-5">
        <Donut used={usedBytes} total={quotaBytes} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-[#F2F2F2]">
            My space{' '}
            <button type="button" onClick={onProNote} className="ml-1 text-sm font-medium text-[#00D9D9] hover:underline">
              Upgrade ↗
            </button>
          </p>
          <p className="mt-1 text-sm text-[#A8A8A8]">
            {usedLabel} / 5.0GB <span className="text-[#6E6E6E]">· local storage on this computer</span>
          </p>
        </div>
        <span className="hidden text-xs text-[#6E6E6E] sm:block">
          {usage?.usage === undefined ? 'Storage estimate unavailable in this browser.' : 'Browser storage estimate'}
        </span>
      </div>

      <div className="mt-6 flex gap-6 border-b border-[#2E2E2E]" role="tablist" aria-label="Spaces tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'space'}
          onClick={() => setTab('space')}
          className={`pb-2 text-sm font-medium ${tab === 'space' ? 'border-b-2 border-[#00D9D9] text-[#F2F2F2]' : 'text-[#A8A8A8] hover:text-[#F2F2F2]'}`}
        >
          Space
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'brandkit'}
          onClick={() => setTab('brandkit')}
          className={`flex items-center gap-1 pb-2 text-sm font-medium ${tab === 'brandkit' ? 'border-b-2 border-[#00D9D9] text-[#F2F2F2]' : 'text-[#A8A8A8] hover:text-[#F2F2F2]'}`}
        >
          Brand kit
          <span className="text-xs" style={{ color: '#A78BFA' }} title="Included in this build — nothing is charged.">
            ◆
          </span>
        </button>
      </div>

      {tab === 'space' ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold"
              style={{ background: '#00D9D9', color: '#062A2A' }}
            >
              <span className="text-base leading-none">⊕</span> Upload
            </button>
            <input
              ref={uploadRef}
              type="file"
              multiple
              accept="video/*,image/*,audio/*"
              className="hidden"
              onChange={(e) => {
                handleUpload(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => setShowNewFolder((v) => !v)}
              aria-label="New folder"
              title="New folder"
              className="rounded-lg bg-[#242424] p-2 text-[#F2F2F2] hover:bg-[#2E2E2E]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                <path d="M12 11v6M9 14h6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setSortAsc((v) => !v)}
              aria-label="Sort by name"
              title="Sort by name"
              className="rounded-lg bg-[#242424] p-2 text-[#F2F2F2] hover:bg-[#2E2E2E]"
            >
              ⇅
            </button>
            <button
              type="button"
              onClick={() => setTrashNote(true)}
              className="flex items-center gap-1 rounded-lg bg-[#242424] px-3 py-1.5 text-sm text-[#F2F2F2] hover:bg-[#2E2E2E]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
              </svg>
              Trash
            </button>
            <span className="ml-auto flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search media"
                aria-label="Search media"
                className="w-40 rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-1.5 text-sm text-[#F2F2F2] placeholder:text-[#6E6E6E] focus:border-[#00D9D9] focus:outline-none"
              />
              <label className="flex items-center gap-1 rounded-lg bg-[#242424] px-2 py-1.5 text-sm text-[#F2F2F2]">
                <select
                  value={filterKind}
                  onChange={(e) => setFilterKind(e.target.value as 'All' | 'Video' | 'Image' | 'Audio')}
                  aria-label="Filter media by kind"
                  className="bg-transparent focus:outline-none"
                >
                  {(['All', 'Video', 'Image', 'Audio'] as const).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="rounded-lg bg-[#242424] px-2 py-1.5 text-sm text-[#F2F2F2] hover:bg-[#2E2E2E]"
              >
                ↻
              </button>
            </span>
          </div>

          {showNewFolder && (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    saveFolders([...folders, newFolderName.trim().slice(0, 40)]);
                    setNewFolderName('');
                    setShowNewFolder(false);
                  }
                }}
                placeholder="Folder name"
                aria-label="New folder name"
                autoFocus
                className="w-56 rounded-lg border border-[#2E2E2E] bg-[#1E1E1E] px-3 py-1.5 text-sm text-[#F2F2F2] placeholder:text-[#6E6E6E] focus:border-[#00D9D9] focus:outline-none"
              />
              <TealButton
                onClick={() => {
                  if (!newFolderName.trim()) return;
                  saveFolders([...folders, newFolderName.trim().slice(0, 40)]);
                  setNewFolderName('');
                  setShowNewFolder(false);
                }}
              >
                Create
              </TealButton>
              <GrayButton onClick={() => setShowNewFolder(false)}>Cancel</GrayButton>
            </div>
          )}

          <div className="mt-6">
            <h2 className="flex items-center gap-3 text-sm text-[#A8A8A8]">
              Folder <span className="h-px flex-1 bg-[#2E2E2E]" />
            </h2>
            <div className="mt-3 flex flex-wrap gap-4">
              {folders.map((f) => (
                <div key={f} className="w-28">
                  <div className="flex h-24 items-center justify-center rounded-xl bg-[#242424]">
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="#FACC15" aria-hidden="true">
                      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    </svg>
                  </div>
                  <p className="mt-2 truncate text-center text-sm text-[#F2F2F2]">{f}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="flex items-center gap-3 text-sm text-[#A8A8A8]">
              Media
              <span className="h-px flex-1 bg-[#2E2E2E]" />
              {media.length > 8 && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm text-[#F2F2F2] hover:text-[#00D9D9]">
                  {showAll ? 'Show less' : `Show all (${media.length})`}
                </button>
              )}
            </h2>
            {media.length === 0 ? (
              <p className="mt-6 text-sm text-[#6E6E6E]">
                No media yet — import media in a project and it will appear here. Use Upload above to add files to your
                latest project.
              </p>
            ) : shownMedia.length === 0 ? (
              <p className="mt-6 text-sm text-[#6E6E6E]">Nothing matches this filter.</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {shownMedia.map((m) => (
                  <article key={`${m.projectName}-${m.id}`}>
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-[#242424]">
                      {m.thumbnail ? (
                        <img src={m.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#3A3A3A] to-[#1E1E1E] text-3xl text-[#6E6E6E]">
                          {m.kind === 'audio' ? '♪' : m.kind === 'image' ? '▦' : '▶'}
                        </span>
                      )}
                      {m.duration !== undefined && m.duration > 0 && (
                        <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                          {formatClock(m.duration)}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate text-sm text-[#F2F2F2]" title={m.name}>
                      {m.name}
                    </p>
                    <p className="truncate text-xs text-[#6E6E6E]">
                      {formatBytesShort(m.size)}
                      {m.duration !== undefined && m.duration > 0 ? ` | ${formatClock(m.duration)}` : ''}
                    </p>
                    <p className="truncate text-xs text-[#6E6E6E]">in {m.projectName}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <section className="mt-10 rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] p-4" aria-label="Backup">
            <h2 className="text-base font-semibold text-[#F2F2F2]">Backup</h2>
            <p className="mt-1 text-sm text-[#A8A8A8]">
              Save a project as a .vidora file and keep it anywhere — Google Drive, a USB stick, a message to yourself.
              The file holds the project and the names of its media; when you restore it, Vidora asks you to point at
              the media again.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={backupProjectId}
                onChange={(e) => setBackupProjectId(e.target.value)}
                aria-label="Project to back up"
                className="rounded-lg border border-[#2E2E2E] bg-[#141414] px-3 py-2 text-sm text-[#F2F2F2]"
              >
                <option value="">— Choose a project —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <TealButton
                onClick={() => {
                  const target = projects.find((p) => p.id === backupProjectId);
                  if (!target) return;
                  const bundle = buildBundle(target);
                  downloadBlob(new Blob([bundleToText(bundle)], { type: 'application/json' }), bundleFileName(target));
                  setBackupNotice(`Backed up ${target.name} → ${bundleFileName(target)}. Keep the file somewhere safe.`);
                }}
              >
                Download .vidora backup
              </TealButton>
              <GrayButton onClick={() => restoreRef.current?.click()}>Restore backup…</GrayButton>
              <input
                ref={restoreRef}
                type="file"
                accept=".vidora,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void file
                    .text()
                    .then((text) => {
                      const ok = importBundle(text);
                      setBackupNotice(
                        ok.error
                          ? 'That file is not a valid Vidora backup.'
                          : `Restored “${file.name}”. If any media was missing, re-import the files and re-attach them.`,
                      );
                    })
                    .catch(() => setBackupNotice('Could not read that file.'));
                  e.target.value = '';
                }}
              />
            </div>
            {backupNotice && <p className="mt-2 text-sm text-[#A8A8A8]">{backupNotice}</p>}
          </section>
        </>
      ) : (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="text-base font-semibold text-[#F2F2F2]">Text presets</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {TEXT_STYLE_PRESETS.map((p) => (
                <span key={p.id} className="rounded-lg bg-[#242424] px-3 py-1.5 text-sm text-[#F2F2F2]">
                  {p.name}
                </span>
              ))}
            </div>
          </section>
          {lutGroups.map(([category, names]) => (
            <section key={category}>
              <h2 className="text-base font-semibold text-[#F2F2F2]">Looks — {category}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {names.map((n) => (
                  <span key={n} className="rounded-lg bg-[#242424] px-3 py-1.5 text-sm text-[#F2F2F2]">
                    {n}
                  </span>
                ))}
              </div>
            </section>
          ))}
          <section>
            <h2 className="text-base font-semibold text-[#F2F2F2]">Music styles</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {AI_MUSIC_STYLES.map((s) => (
                <span key={s} className="rounded-lg bg-[#242424] px-3 py-1.5 text-sm text-[#F2F2F2]">
                  {s}
                </span>
              ))}
            </div>
          </section>
          <p className="text-xs text-[#6E6E6E]">
            Brand kit items are saved with your projects on this computer. Text presets, looks and music styles apply
            from the editor.
          </p>
        </div>
      )}

      {trashNote && (
        <NoteDialog
          title="Trash"
          body="Trash is empty. Deleted projects are removed permanently — there is nothing to restore."
          onClose={() => setTrashNote(false)}
        />
      )}
    </div>
  );
}
