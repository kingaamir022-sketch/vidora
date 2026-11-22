import { useMemo, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { formatBytes, formatDuration } from '../lib/media';

/** Media panel (SPEC A, Phase 1): import, folders, search, thumbnails, metadata. */
export default function MediaBrowser() {
  const project = useProjectStore((s) => s.project);
  const addMediaFiles = useProjectStore((s) => s.addMediaFiles);
  const addMediaToTimeline = useProjectStore((s) => s.addMediaToTimeline);
  const addFolder = useProjectStore((s) => s.addFolder);
  const [search, setSearch] = useState('');
  const [folderId, setFolderId] = useState('folder-all');
  const [folderName, setFolderName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const media = project?.media ?? [];
  const folders = project?.folders ?? [{ id: 'folder-all', name: 'All media' }];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return media.filter((m) => (folderId === 'folder-all' || m.folderId === folderId) && (!q || m.name.toLowerCase().includes(q)));
  }, [media, folderId, search]);

  const handleFiles = async (files: FileList | File[]) => {
    setImporting(true);
    try {
      await addMediaFiles(files, folderId);
    } finally {
      setImporting(false);
    }
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-zinc-800 bg-zinc-950 text-zinc-100" aria-label="Media library">
      <div className="border-b border-zinc-800 p-3">
        <h2 className="text-sm font-semibold">Media</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search media…"
          aria-label="Search media"
          className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100"
        />
        <div className="mt-2 flex gap-1">
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            aria-label="Media folder"
            className="min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
          >
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && folderName.trim()) {
                addFolder(folderName);
                setFolderName('');
              }
            }}
            placeholder="+ Folder"
            aria-label="New folder name"
            className="w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
          />
        </div>
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
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="mt-2 w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Import video / image / audio / GIF'}
        </button>
      </div>

      <div
        className={`flex-1 overflow-y-auto p-3 ${dragOver ? 'bg-violet-600/10' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
        }}
      >
        {filtered.length === 0 ? (
          <p className="text-xs leading-relaxed text-zinc-500">
            {media.length === 0
              ? 'No media yet. Import files or drag them here — thumbnails and metadata appear for each file.'
              : 'No media matches this search / folder.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((m) => (
              <li key={m.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-2">
                {m.thumbnail ? (
                  <img src={m.thumbnail} alt={m.name} className="h-20 w-full rounded object-cover" />
                ) : (
                  <div className="flex h-12 items-center justify-center rounded bg-zinc-800 text-xs text-zinc-400 uppercase">{m.kind}</div>
                )}
                <p className="mt-1.5 truncate text-xs font-medium" title={m.name}>
                  {m.name}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {m.kind} · {formatBytes(m.size)}
                  {m.duration !== undefined ? ` · ${formatDuration(m.duration)}` : ''}
                  {m.width ? ` · ${m.width}×${m.height}` : ''} · {m.mime}
                </p>
                <button
                  type="button"
                  onClick={() => addMediaToTimeline(m.id)}
                  className="mt-1.5 w-full rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800"
                >
                  Add to timeline
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-zinc-800 p-3 text-[11px] leading-relaxed text-zinc-500">
        <p className="font-semibold text-zinc-300">Built-in assets</p>
        <p>Procedural effects, transitions, LUTs, stickers and templates arrive in Phase 5; AI music / clips / voices in Phase 6. Nothing here is a stock download yet.</p>
        <p className="mt-1">Cloud sync and version history arrive in Phase 8.</p>
      </div>
    </aside>
  );
}
