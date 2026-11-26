import { useMemo, useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { formatDate } from '../lib/i18n';
import type { VidoraProject } from '../schema/project';
import TemplatesPage from './home/TemplatesPage';
import LibraryPage from './home/LibraryPage';
import SpacesPage from './home/SpacesPage';
import AIStudios, { type AIStudioView } from './home/AIStudios';
import { InviteDialog, NoteDialog, ScriptDialog, TermsDialog, UpdatesDialog } from './home/HomeDialogs';

/**
 * Dashboard / home (CapCut desktop shots 02/03, diff S).
 * Left sidebar (~290px) + main content: Create project banner, 5 AI cards,
 * AI-powered creative suite, My projects cards. Templates / Library / Spaces
 * are sidebar views. First run shows the Terms dialog, then the Updates
 * notice. No auth, no tour, no theme toggle (removed — see diff Y).
 */

type DashboardView =
  | 'home'
  | 'templates'
  | 'library'
  | 'spaces'
  | 'video-studio'
  | 'design-studio'
  | 'marketing';

type ProjectFilter = 'All' | 'Video' | 'Image' | 'Effects';

const TEAL = '#00D9D9';

const AI_CARDS: { desc: string; icon: string; id: string; title: string }[] = [
  // CapCut-fix (2026-11-25): six tiles, per the video reference (v02) —
  // "AI video" first. (The screenshot-based diff listed five; the video
  // shows six, and the video wins.)
  { desc: 'Set ideas into motion', icon: '▶', id: 'ai-video', title: 'AI video' },
  { desc: 'Turn ideas into imagery', icon: '✦', id: 'ai-image', title: 'AI image' },
  { desc: 'Seamlessly extend any clip', icon: '⇥', id: 'extend', title: 'Extend video' },
  { desc: 'Edit clips by describing it', icon: '✎', id: 'ai-edit', title: 'AI edit' },
  { desc: 'Get sharper results instantly', icon: 'HD', id: 'enhance', title: 'Enhance quality' },
  { desc: 'Remove anything unwanted', icon: '◐', id: 'ai-remove', title: 'AI remove' },
];

const SUITE_CARDS: { desc: string; gradient: string; id: DashboardView | 'tts'; title: string }[] = [
  {
    desc: 'Make 30-second videos with Vidora Video 1.0',
    gradient: 'linear-gradient(135deg,#38BDF8 0%,#1D4ED8 60%,#0F172A 100%)',
    id: 'video-studio',
    title: 'Video Studio',
  },
  {
    desc: 'Bring your imagination to life in the easiest way.',
    gradient: 'linear-gradient(135deg,#7DD3FC 0%,#38BDF8 55%,#1E3A8A 100%)',
    id: 'design-studio',
    title: 'Design Studio',
  },
  {
    desc: 'Create winning ads, scale fast with variants.',
    gradient: 'linear-gradient(135deg,#818CF8 0%,#4F46E5 55%,#1E1B4B 100%)',
    id: 'marketing',
    title: 'AI ad maker',
  },
  {
    desc: 'Convert text to speech in various languages.',
    gradient: 'linear-gradient(135deg,#22D3EE 0%,#0E7490 60%,#083344 100%)',
    id: 'tts',
    title: 'Text to speech',
  },
];

const STUDIO_INITIAL: Record<Exclude<DashboardView, 'home' | 'templates' | 'library' | 'spaces'>, AIStudioView> = {
  'design-studio': 'design',
  marketing: 'marketing',
  'video-studio': 'video',
};

const CARD_GRADIENTS = [
  'linear-gradient(135deg,#7C3AED,#312E81)',
  'linear-gradient(135deg,#0E7490,#164E63)',
  'linear-gradient(135deg,#DB2777,#4C1D95)',
  'linear-gradient(135deg,#059669,#134E4A)',
  'linear-gradient(135deg,#EA580C,#7C2D12)',
  'linear-gradient(135deg,#2563EB,#1E3A8A)',
];

function gradientFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CARD_GRADIENTS[h % CARD_GRADIENTS.length];
}

function projectClips(p: VidoraProject): number {
  return p.tracks.reduce((n, t) => n + t.clips.length, 0);
}
function projectDuration(p: VidoraProject): number {
  return Math.max(0, ...p.tracks.flatMap((t) => t.clips.map((c) => c.start + c.duration)));
}
function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Dashboard() {
  const [view, setView] = useState<DashboardView>('home');
  const [moreToolsOpen, setMoreToolsOpen] = useState(true);
  const [termsState, setTermsState] = useState<'pending' | 'declined' | 'done'>(() => {
    try {
      return localStorage.getItem('vidora.terms.v1') === '1' ? 'done' : 'pending';
    } catch {
      return 'pending';
    }
  });
  const [showUpdates, setShowUpdates] = useState(false);
  const [note, setNote] = useState<{ body: string; title: string } | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('All');
  const [gridView, setGridView] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<VidoraProject | null>(null);

  const projects = useProjectStore((s) => s.projects);
  const openProject = useProjectStore((s) => s.openProject);
  const createProject = useProjectStore((s) => s.createProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const duplicateProject = useProjectStore((s) => s.duplicateProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const setSettingsOpen = useProjectStore((s) => s.setSettingsOpen);
  const buildScriptProject = useProjectStore((s) => s.buildScriptProject);
  const recoveredNotice = useProjectStore((s) => s.recoveredNotice);
  const dismissRecovery = useProjectStore((s) => s.dismissRecovery);

  const sorted = useMemo(
    () => [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [projects],
  );
  const shownProjects = useMemo(() => {
    if (projectFilter === 'All') return sorted;
    if (projectFilter === 'Video') return sorted.filter((p) => p.tracks.some((t) => t.clips.some((c) => c.type === 'video')));
    if (projectFilter === 'Image') return sorted.filter((p) => p.tracks.some((t) => t.clips.some((c) => c.type === 'image')));
    return sorted.filter((p) => p.tracks.some((t) => t.clips.some((c) => c.effects.length > 0)));
  }, [sorted, projectFilter]);

  const agreeTerms = () => {
    try {
      localStorage.setItem('vidora.terms.v1', '1');
    } catch {
      /* session-only */
    }
    setTermsState('done');
    try {
      if (localStorage.getItem('vidora.updates.v1') !== '1') setShowUpdates(true);
    } catch {
      setShowUpdates(true);
    }
  };
  const dismissUpdates = () => {
    try {
      localStorage.setItem('vidora.updates.v1', '1');
    } catch {
      /* session-only */
    }
    setShowUpdates(false);
  };

  const openEditorWithTab = (tab: 'Media' | 'Filters' | 'Captions') => {
    createProject();
    setActiveTab(tab);
  };

  const handleAiCard = (id: string) => {
    if (id === 'ai-video') setView('video-studio');
    else if (id === 'ai-image') openEditorWithTab('Media');
    else if (id === 'extend')
      setNote({
        body: 'Video extension isn’t available in this build. You can still trim, split and speed up any clip in the editor.',
        title: 'Extend video',
      });
    else if (id === 'ai-edit') setShowScript(true);
    else if (id === 'enhance') openEditorWithTab('Filters');
    else if (id === 'ai-remove')
      setNote({
        body: 'Import a clip in the editor, select it, then open Smart tools → Remove background. The background is removed on the selected clip.',
        title: 'AI remove',
      });
  };

  const navItem = (id: DashboardView, label: string, icon: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setView(id)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] ${
        view === id ? 'bg-[#242424] font-medium text-[#F2F2F2]' : 'text-[#A8A8A8] hover:bg-[#1E1E1E] hover:text-[#F2F2F2]'
      }`}
    >
      <span className="w-5 text-center text-base">{icon}</span>
      {label}
    </button>
  );

  const isStudioView = view === 'video-studio' || view === 'design-studio' || view === 'marketing';

  if (termsState === 'declined') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-6 text-center text-[#F2F2F2]">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Vidora logo" className="h-12 w-12" />
        <h1 className="mt-4 text-2xl font-bold">Vidora is closed</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[#A8A8A8]">
          You chose not to agree to the Terms of Service and Privacy Policy, so Vidora can&rsquo;t open. Your projects
          stay on this computer — nothing was deleted.
        </p>
        <button
          type="button"
          onClick={() => setTermsState('pending')}
          className="mt-6 rounded-lg px-6 py-2.5 text-sm font-semibold"
          style={{ background: TEAL, color: '#062A2A' }}
        >
          Go back
        </button>
      </div>
    );
  }

  const studio =
    view === 'video-studio' || view === 'design-studio' || view === 'marketing' ? STUDIO_INITIAL[view] : null;

  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-[#F2F2F2]">
      {/* ---- Left sidebar: v1.0.7 (BUG-CF-042, auto-fit) fluid —
          clamp(232px,22vw,290px): exactly 290px at 1920, 232px at 1024. ---- */}
      <aside className="flex w-[clamp(232px,22vw,290px)] shrink-0 flex-col gap-1 overflow-y-auto border-r border-[#2E2E2E] bg-[#141414] px-3 py-4">
        <div className="mb-2 flex items-center gap-2 px-2">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="Vidora logo" className="h-8 w-8" />
          <span className="bg-gradient-to-r from-violet-500 to-cyan-400 bg-clip-text text-xl font-bold text-transparent">
            Vidora
          </span>
        </div>

        <div className="rounded-xl bg-[#1E1E1E] p-3">
          <button
            type="button"
            onClick={() =>
              setNote({
                body: 'Sign-in isn’t available in this build. Your projects stay on this computer.',
                title: 'Sign in',
              })
            }
            className="flex w-full items-center gap-3 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2E2E2E] text-lg text-[#A8A8A8]">
              ○
            </span>
            <span className="text-[15px]">Sign in</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setNote({
                body: 'Pro features are included in this build. Nothing is charged.',
                title: 'Vidora Pro',
              })
            }
            className="mt-3 w-full rounded-lg py-2 text-sm font-semibold text-[#062A2A]"
            style={{ background: 'linear-gradient(90deg,#F9A8D4 0%,#67E8F9 100%)' }}
          >
            Join Pro
          </button>
        </div>

        <div className="mt-3">
          {navItem('home', 'Home', '⌂')}
          {navItem('templates', 'Templates', '▦')}
        </div>

        <div className="mx-2 my-3 h-px bg-[#2E2E2E]" />
        <p className="px-3 pb-1 text-xs text-[#6E6E6E]">Create with AI</p>
        {navItem('video-studio', 'Video Studio', '▶')}
        {navItem('design-studio', 'Design Studio', '✦')}
        <button
          type="button"
          onClick={() => setMoreToolsOpen((v) => !v)}
          aria-expanded={moreToolsOpen}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] text-[#A8A8A8] hover:bg-[#1E1E1E] hover:text-[#F2F2F2]"
        >
          <span className="w-5 text-center text-base">⊞</span>
          More tools
          <span className="ml-auto text-xs">{moreToolsOpen ? '▴' : '▾'}</span>
        </button>
        {moreToolsOpen && (
          <div className="ml-5 border-l border-[#2E2E2E] pl-2">
            {navItem('video-studio', 'Create with AI', '✦')}
            {navItem('marketing', 'Marketing tools', '◈')}
          </div>
        )}

        <div className="mx-2 my-3 h-px bg-[#2E2E2E]" />
        <p className="px-3 pb-1 text-xs text-[#6E6E6E]">Management</p>
        {navItem('library', 'Library', '▤')}
        {navItem('spaces', 'Spaces', '☁')}

        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className="mt-3 flex w-full items-center gap-3 rounded-lg border border-[#2E2E2E] px-3 py-2.5 text-left text-[15px] text-[#F2F2F2] hover:bg-[#1E1E1E]"
        >
          <span className="w-5 text-center text-base">➤</span>
          Invite friends
          <span className="ml-auto rounded bg-[#FACC15] px-1.5 py-0.5 text-[10px] font-bold text-[#422006]">New</span>
        </button>

        <button
          type="button"
          onClick={() => setView('video-studio')}
          className="mt-auto block rounded-xl p-4 text-left"
          style={{ background: 'linear-gradient(160deg,#0E7490 0%,#083344 100%)' }}
        >
          <span className="block text-base font-bold" style={{ color: '#00D9D9' }}>
            Try Video Studio
          </span>
          <span className="mt-0.5 block text-sm" style={{ color: '#00D9D9' }}>
            Generate 4K videos
          </span>
        </button>
      </aside>

      {/* ---- Main content: v1.0.7 (BUG-CF-042) padding is px-4 below xl, px-8 at 1280+ (exactly as before at 1920). ---- */}
      <main className={isStudioView ? 'min-w-0 flex-1 overflow-hidden' : 'min-w-0 flex-1 overflow-y-auto px-4 py-6 xl:px-8'}>
        {recoveredNotice && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#00D9D9]/50 bg-[#00D9D9]/10 px-4 py-3 text-sm" role="status">
            <span>{recoveredNotice}</span>
            <button type="button" onClick={dismissRecovery} className="rounded-md border border-[#2E2E2E] px-2 py-1 text-xs">
              Dismiss
            </button>
          </div>
        )}

        {view === 'home' && (
          <>
            <button
              type="button"
              onClick={() => createProject()}
              className="flex h-[210px] w-full items-center justify-center gap-3 rounded-2xl text-3xl font-bold"
              style={{ background: 'linear-gradient(120deg,#7FE7F0 0%,#00C8D8 100%)', color: '#062A2A' }}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#062A2A] text-2xl text-[#00D9D9]">+</span>
              Create project
            </button>

            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {AI_CARDS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleAiCard(c.id)}
                  className={`rounded-xl bg-[#1E1E1E] p-4 text-left hover:bg-[#242424] ${
                    c.id === 'enhance' ? 'border border-[#00D9D9]' : ''
                  }`}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#242424] text-xl text-[#F2F2F2]">
                    {c.icon}
                  </span>
                  <span className="mt-4 block text-[15px] font-medium">{c.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-[#A8A8A8]">{c.desc}</span>
                </button>
              ))}
            </div>

            <h2 className="mt-10 text-xl font-bold">AI-powered creative suite</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {SUITE_CARDS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => (c.id === 'tts' ? openEditorWithTab('Captions') : setView(c.id))}
                  className="overflow-hidden rounded-xl text-left"
                >                  <span className="flex h-40 items-end p-4" style={{ background: c.gradient }}>
                    <span className="text-2xl font-bold text-white drop-shadow">{c.title}</span>
                  </span>
                  <span className="block bg-[#1E1E1E] px-4 py-3">
                    <span className="block text-[15px] font-medium">{c.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[#A8A8A8]">{c.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-2">
              <h2 className="mr-2 text-xl font-bold">My projects</h2>
              {(['All', 'Video', 'Image', 'Effects'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setProjectFilter(f)}
                  className={`rounded-full px-3.5 py-1.5 text-sm ${
                    projectFilter === f
                      ? 'border border-[#00D9D9] text-[#F2F2F2]'
                      : 'bg-[#242424] text-[#A8A8A8] hover:text-[#F2F2F2]'
                  }`}
                >
                  {f}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setGridView((v) => !v)}
                className="ml-auto rounded-lg bg-[#242424] px-3 py-1.5 text-sm text-[#A8A8A8] hover:text-[#F2F2F2]"
                aria-label={gridView ? 'Switch to list view' : 'Switch to grid view'}
              >
                {gridView ? '▦ Grid' : '☰ List'}
              </button>
            </div>

            {pendingDelete && (
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm" role="alert">
                <span>
                  Delete &ldquo;{pendingDelete.name}&rdquo;? This can&rsquo;t be undone.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    deleteProject(pendingDelete.id);
                    setPendingDelete(null);
                  }}
                  className="ml-auto rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  className="rounded-lg border border-[#2E2E2E] px-3 py-1.5 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}

            {shownProjects.length === 0 ? (
              <p className="mt-6 text-sm text-[#6E6E6E]">
                {projectFilter === 'All'
                  ? 'No projects yet — create your first project above.'
                  : `No ${projectFilter.toLowerCase()} projects yet.`}
              </p>
            ) : gridView ? (
              <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {shownProjects.map((p) => (
                  <article key={p.id} className="relative">
                    <button
                      type="button"
                      onClick={() => openProject(p)}
                      aria-label={`Open ${p.name}`}
                      className="relative block aspect-video w-full overflow-hidden rounded-xl text-left"
                      style={{ background: gradientFor(p.id) }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white/80">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                        {formatClock(projectDuration(p))}
                      </span>
                    </button>
                    <div className="mt-2 flex items-start gap-2">
                      <span className="min-w-0 flex-1">
                        {renamingId === p.id ? (
                          <input
                            value={renameValue}
                            autoFocus
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
                            className="w-full rounded border border-[#2E2E2E] bg-[#1E1E1E] px-2 py-1 text-sm"
                          />
                        ) : (
                          <button type="button" onClick={() => openProject(p)} className="block w-full truncate text-left text-sm font-medium">
                            {p.name}
                          </button>
                        )}
                        <span className="mt-0.5 block text-xs text-[#6E6E6E]">
                          {p.aspectRatio} · {p.fps} fps · {projectClips(p)} clips · updated {formatDate('en', new Date(p.updatedAt))}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                        aria-label={`More options for ${p.name}`}
                        aria-haspopup="menu"
                        className="shrink-0 rounded-lg px-2 py-0.5 text-lg leading-none text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]"
                      >
                        …
                      </button>
                    </div>
                    {openMenuId === p.id && (
                      <>
                        <button
                          type="button"
                          aria-label="Close menu"
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div role="menu" className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-[#2E2E2E] bg-[#242424] py-1 shadow-2xl">
                          <button type="button" role="menuitem" onClick={() => { setOpenMenuId(null); openProject(p); }} className="block w-full px-4 py-2 text-left text-sm hover:bg-[#2E2E2E]">
                            Open
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setOpenMenuId(null); setRenamingId(p.id); setRenameValue(p.name); }}
                            className="block w-full px-4 py-2 text-left text-sm hover:bg-[#2E2E2E]"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setOpenMenuId(null); duplicateProject(p.id); }}
                            className="block w-full px-4 py-2 text-left text-sm hover:bg-[#2E2E2E]"
                          >
                            Duplicate
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { setOpenMenuId(null); setPendingDelete(p); }}
                            className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-[#2E2E2E]"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {shownProjects.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl border border-[#2E2E2E] bg-[#1E1E1E] p-3">
                    <button type="button" onClick={() => openProject(p)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span
                        className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white/80"
                        style={{ background: gradientFor(p.id) }}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block text-xs text-[#6E6E6E]">
                          {p.aspectRatio} · {p.fps} fps · {projectClips(p)} clips · updated {formatDate('en', new Date(p.updatedAt))}
                        </span>
                      </span>
                    </button>
                    <span className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => { setRenamingId(p.id); setRenameValue(p.name); }} className="rounded-md border border-[#2E2E2E] px-2 py-1 text-xs hover:bg-[#242424]">
                        Rename
                      </button>
                      <button type="button" onClick={() => duplicateProject(p.id)} className="rounded-md border border-[#2E2E2E] px-2 py-1 text-xs hover:bg-[#242424]">
                        Duplicate
                      </button>
                      <button type="button" onClick={() => setPendingDelete(p)} className="rounded-md border border-[#2E2E2E] px-2 py-1 text-xs text-red-400 hover:bg-[#242424]">
                        Delete
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {view === 'templates' && <TemplatesPage />}
        {view === 'library' && <LibraryPage onStartCreating={() => setView('video-studio')} />}
        {view === 'spaces' && (
          <SpacesPage
            onProNote={() =>
              setNote({
                body: 'Pro features are included in this build. Nothing is charged.',
                title: 'Vidora Pro',
              })
            }
          />
        )}
        {studio && (
          <div className="h-screen">
            <AIStudios key={view} initialView={studio} />
          </div>
        )}
      </main>

      {/* ---- First-run dialogs ---- */}
      {termsState === 'pending' && <TermsDialog onAgree={agreeTerms} onDisagree={() => setTermsState('declined')} />}
      {termsState === 'done' && showUpdates && (
        <UpdatesDialog
          onOk={dismissUpdates}
          onGoToSettings={() => {
            dismissUpdates();
            setSettingsOpen(true);
          }}
        />
      )}
      {note && <NoteDialog title={note.title} body={note.body} onClose={() => setNote(null)} />}
      {showInvite && <InviteDialog onClose={() => setShowInvite(false)} />}
      {showScript && (
        <ScriptDialog
          onClose={() => setShowScript(false)}
          onCreate={(lines) => {
            setShowScript(false);
            buildScriptProject('Untitled Project', lines.map((line) => ({ duration: 3, imageDataUrl: null, line })), false);
          }}
        />
      )}
    </div>
  );
}
