import { useMemo, useRef, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { IconClock, IconFolder, IconPlus } from './icons';
import { buildBundle, bundleFileName, bundleToText, deleteBackupRecord, loadBackupRecords, saveBackupRecords, type BackupRecord } from '../lib/cloudBackup';
import { downloadBlob, formatBytesShort } from '../lib/exportEngine';
import { formatDate, t } from '../lib/i18n';
import AccountPanel from './AccountPanel';

/** Dashboard (SPEC A, Phase 1): new / recent / drafts with rename, duplicate, delete.
 * Phase 8 (L-CLOUD): project backups — a .vidora file you keep anywhere
 * (Drive, a USB stick, a chat message). The file holds the project + the
 * names of its media; when you restore, Vidora asks you to point at the
 * media files again. Media is never inside the bundle (too large). */
export default function Dashboard() {
  const [tab, setTab] = useState<'recent' | 'drafts'>('recent');
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [backupProjectId, setBackupProjectId] = useState('');
  const [backupRecords, setBackupRecords] = useState<BackupRecord[]>(() => loadBackupRecords());
  const [backupNotice, setBackupNotice] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);
  const projects = useProjectStore((s) => s.projects);
  const openProject = useProjectStore((s) => s.openProject);
  const createProject = useProjectStore((s) => s.createProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const importBundle = useProjectStore((s) => s.importBundle);
  const recoveredNotice = useProjectStore((s) => s.recoveredNotice);
  const dismissRecovery = useProjectStore((s) => s.dismissRecovery);
  const theme = useProjectStore((s) => s.theme);
  const setTheme = useProjectStore((s) => s.setTheme);
  const locale = useProjectStore((s) => s.locale);
  const account = useProjectStore((s) => s.account);
  const readOnly = account?.role === 'customer';

  const sorted = useMemo(() => [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [projects]);
  const drafts = useMemo(() => sorted.filter((p) => p.isDraft || p.tracks.every((t) => t.clips.length === 0)), [sorted]);
  const shown = tab === 'recent' ? sorted : drafts;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex h-14 items-center gap-3 border-b border-zinc-800 px-5">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Vidora logo" className="h-8 w-8" />
        <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-xl font-bold text-transparent">Vidora</span>
        <span className="hidden text-xs tracking-widest text-zinc-500 uppercase sm:block">Create. Cut. Shine.</span>
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="ml-auto rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          title="Theme toggle"
        >
          Theme: {theme}
        </button>
        <button
          type="button"
          onClick={() => useProjectStore.getState().setSettingsOpen(true)}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          title="Settings"
        >
          {t(locale, 'settings.title')}
        </button>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-10">
        {recoveredNotice && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-3 text-sm" role="status">
            <span>{recoveredNotice}</span>
            <button type="button" onClick={dismissRecovery} className="rounded-md border border-zinc-700 px-2 py-1 text-xs">
              Dismiss
            </button>
          </div>
        )}
        <h1 className="text-3xl font-bold">{t(locale, 'dashboard.title')}</h1>
        <p className="mt-2 text-sm text-zinc-400">Start a new edit or pick up where you left off. Projects autosave every few seconds.</p>
        {readOnly && (
          <p className="mt-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" role="status">
            {t(locale, 'auth.readOnly')}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !readOnly) {
                createProject(newName || undefined);
                setNewName('');
              }
            }}
            placeholder="New project name (optional)"
            aria-label="New project name"
            disabled={readOnly}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm disabled:opacity-40"
          />
          <button
            type="button"
            disabled={readOnly}
            title={readOnly ? t(locale, 'auth.readOnly') : undefined}
            onClick={() => {
              createProject(newName || undefined);
              setNewName('');
            }}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            <IconPlus size={18} />
            {t(locale, 'dashboard.newProject')}
          </button>
        </div>
        <div className="mt-10 flex gap-2 border-b border-zinc-800" role="tablist" aria-label="Project lists">
          {(['recent', 'drafts'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm capitalize ${tab === t ? 'border-b-2 border-violet-500 text-white' : 'text-zinc-400 hover:text-zinc-100'}`}
            >
              {t} ({t === 'recent' ? sorted.length : drafts.length})
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
            <IconFolder size={16} />
            {tab === 'drafts' ? 'No drafts yet. A new project is a draft until it has clips on the timeline.' : 'No projects yet.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {shown.map((p) => {
              const clipCount = p.tracks.reduce((n, t) => n + t.clips.length, 0);
              return (
                <li key={p.id} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <button type="button" onClick={() => openProject(p)} className="flex min-w-0 flex-1 items-center gap-4 text-left" aria-label={`Open ${p.name}`}>
                    <span className="rounded-lg bg-violet-600/20 p-3 text-violet-300">
                      <IconFolder size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      {renamingId === p.id ? (
                        <input
                          value={renameValue}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameProject(p.id, renameValue);
                              setRenamingId(null);
                            }
                            if (e.key === 'Escape') setRenamingId(null);
                          }}
                          onBlur={() => {
                            renameProject(p.id, renameValue);
                            setRenamingId(null);
                          }}
                          aria-label="Rename project"
                          className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="block truncate font-medium">{p.name}</span>
                      )}
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400">
                        <IconClock size={12} />
                        {p.aspectRatio} · {p.fps} fps · {p.tracks.length} tracks · {clipCount} clips · {p.media.length} media · updated{' '}
                        {formatDate(locale, new Date(p.updatedAt))}
                      </span>
                    </span>
                  </button>
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      disabled={readOnly}
                      title={readOnly ? t(locale, 'auth.readOnly') : undefined}
                      onClick={() => {
                        setRenamingId(p.id);
                        setRenameValue(p.name);
                      }}
                      className="rounded-md border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800 disabled:opacity-40"
                    >
                      Rename
                    </button>
                    <button type="button" disabled={readOnly} title={readOnly ? t(locale, 'auth.readOnly') : undefined} onClick={() => duplicateProject(p.id)} className="rounded-md border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800 disabled:opacity-40">
                      Duplicate
                    </button>
                    {confirmDeleteId === p.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          deleteProject(p.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded-md border border-red-500 bg-red-500/20 px-2 py-1 text-xs text-red-300"
                      >
                        Confirm delete
                      </button>
                    ) : (
                      <button type="button" disabled={readOnly} title={readOnly ? t(locale, 'auth.readOnly') : undefined} onClick={() => setConfirmDeleteId(p.id)} className="rounded-md border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800 disabled:opacity-40">
                        Delete
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <AccountPanel />
        <section className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900 p-4" aria-label="Backups">
          <h2 className="text-lg font-semibold">{t(locale, 'dashboard.backups')}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Back up a project to a .vidora file and keep it anywhere — Google Drive, a USB stick, a message to yourself. The file holds the project and the
            names of its media files; when you restore it, Vidora asks you to point at the media again. Media is never inside the backup file (too large).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={backupProjectId}
              onChange={(e) => setBackupProjectId(e.target.value)}
              aria-label="Project to back up"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            >
              <option value="">— Choose a project —</option>
              {sorted.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!backupProjectId}
              onClick={() => {
                const target = projects.find((p) => p.id === backupProjectId);
                if (!target) return;
                const bundle = buildBundle(target);
                downloadBlob(new Blob([bundleToText(bundle)], { type: 'application/json' }), bundleFileName(target));
                const record: BackupRecord = {
                  createdAt: new Date().toISOString(),
                  id: `bk-${Date.now().toString(36)}`,
                  projectId: target.id,
                  projectName: target.name,
                  size: bundleToText(bundle).length,
                };
                const next = [record, ...loadBackupRecords()];
                saveBackupRecords(next);
                setBackupRecords(next);
                setBackupNotice(`Backed up ${target.name} → ${bundleFileName(target)}. Keep the file somewhere safe.`);
              }}
              className="rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Back up this project
            </button>
            <button type="button" onClick={() => importFileRef.current?.click()} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm">
              Import backup…
            </button>
            <input
              ref={importFileRef}
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
                    setBackupNotice(ok ? `Restored “${file.name}”. If any media was missing, re-import the files and re-attach them.` : 'That file is not a valid Vidora backup.');
                  })
                  .catch(() => setBackupNotice('Could not read that file.'));
                e.target.value = '';
              }}
            />
          </div>
          {backupNotice && <p className="mt-2 text-sm text-zinc-300">{backupNotice}</p>}
          {backupRecords.length > 0 && (
            <ul className="mt-3 space-y-2">
              {backupRecords.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.projectName}</span>
                    <span className="text-xs text-zinc-400">
                      {new Date(r.createdAt).toLocaleString()} · {formatBytesShort(r.size)} · backup file not stored here — keep the .vidora file you downloaded
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = deleteBackupRecord(r.id);
                      setBackupRecords(next);
                    }}
                    className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-xs"
                  >
                    Remove record
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
