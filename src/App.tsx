import { useEffect } from 'react';
import Dashboard from './components/Dashboard';
import AudioPanel from './components/AudioPanel';
import AILibraryPanel from './components/AILibraryPanel';
import CaptionsPanel from './components/CaptionsPanel';
import ColorPanel from './components/ColorPanel';
import EffectsPanel from './components/EffectsPanel';
import ExportPanel from './components/ExportPanel';
import StickersPanel from './components/StickersPanel';
import TextPanel from './components/TextPanel';
import TemplatesPanel from './components/TemplatesPanel';
import TransitionsPanel from './components/TransitionsPanel';
import LeftTabs from './components/LeftTabs';
import MediaBrowser from './components/MediaBrowser';
import PreviewArea from './components/PreviewArea';
import PropertiesPanel from './components/PropertiesPanel';
import ShortcutsPanel from './components/ShortcutsPanel';
import TimelineShell from './components/TimelineShell';
import TopBar from './components/TopBar';
import SettingsDialog from './components/SettingsDialog';
import UserGuideDialog from './components/UserGuideDialog';
import OnboardingTour from './components/OnboardingTour';
import { startAutosave, useProjectStore } from './store/projectStore';
import { actionForCombo, eventToCombo } from './lib/shortcuts';
import { isRtl } from './lib/i18n';

/** Vidora Phase 1 app: dashboard <-> editor layout (SPEC Section 3) with real editing. Phase 9: locale/RTL, dialogs, sidebar visibility. */
export default function App() {
  const view = useProjectStore((s) => s.view);
  const theme = useProjectStore((s) => s.theme);
  const locale = useProjectStore((s) => s.locale);
  const activeTab = useProjectStore((s) => s.activeTab);
  const presentMode = useProjectStore((s) => s.presentMode);
  const setPresentMode = useProjectStore((s) => s.setPresentMode);
  const setPlaying = useProjectStore((s) => s.setPlaying);
  const showSidebar = useProjectStore((s) => s.showSidebar);

  useEffect(() => startAutosave(), []);

  // Global keyboard shortcuts (Phase 1, SPEC B). Ignored while typing in a field.
  useEffect(() => {
    if (view !== 'editor') return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      // Phase 8 (L-SHARE): Esc exits presentation mode.
      if (e.key === 'Escape' && useProjectStore.getState().presentMode) {
        useProjectStore.getState().setPresentMode(false);
        return;
      }
      const s = useProjectStore.getState();
      // Phase 9 (M-AUTH): a signed-in CUSTOMER is read-only — editing
      // shortcuts do nothing (the store also blocks the mutations).
      if (s.account?.role === 'customer') {
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          s.setPlaying(!s.playing);
        }
        return;
      }
      const action = actionForCombo(s.shortcuts, eventToCombo(e));
      if (!action) return;
      e.preventDefault();
      if (action === 'togglePlay') s.setPlaying(!s.playing);
      else if (action === 'split') s.splitAtPlayhead();
      else if (action === 'delete') s.deleteSelected();
      else if (action === 'duplicate') s.duplicateSelected();
      else if (action === 'copy') s.copySelected();
      else if (action === 'paste') s.pasteClipboard();
      else if (action === 'undo') s.undo();
      else if (action === 'redo') s.redo();
      else if (action === 'addMarker') s.addMarker();
      else if (action === 'rippleDelete') s.rippleDeleteSelected();
      else if (action === 'selectAll') s.selectAllClips();
      else if (action === 'separateAudio') s.detachAudio();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view]);

  const dir = isRtl(locale) ? 'rtl' : 'ltr';

  // Phase 9 (M-LOCALE): dir/lang belong on <html> so the browser lays
  // out scrollbars, form controls and text natively in RTL languages.
  // The app root div carries the same attributes as a fallback.
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  if (view === 'dashboard') {
    return (
      <div data-theme={theme} dir={dir} lang={locale}>
        <Dashboard />
        <SettingsDialog />
        <UserGuideDialog />
        <OnboardingTour />
      </div>
    );
  }

  // Phase 8 (L-SHARE): presentation mode — fullscreen playback only,
  // no editing UI. Esc or the button exits.
  if (presentMode) {
    return (
      <div data-theme={theme} dir={dir} lang={locale} className="flex h-screen flex-col overflow-hidden bg-black text-zinc-100">
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          <PreviewArea />
        </div>
        <div className="flex h-12 shrink-0 items-center justify-center gap-3 border-t border-zinc-800 bg-zinc-950 px-2">
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setPresentMode(false);
            }}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm"
          >
            Exit presentation (Esc)
          </button>
          <span className="text-xs text-zinc-500">Presentation — watch only, no editing.</span>
        </div>
      </div>
    );
  }

  return (
    <div data-theme={theme} dir={dir} lang={locale} className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        {showSidebar && <LeftTabs />}
        {activeTab === 'Media' && <MediaBrowser />}
        {activeTab === 'Text' && <TextPanel />}
        {activeTab === 'Stickers' && <StickersPanel />}
        {activeTab === 'Captions' && <CaptionsPanel />}
        {activeTab === 'Effects' && <EffectsPanel />}
        {activeTab === 'Filters' && <EffectsPanel lutFocus />}
        {activeTab === 'Transitions' && <TransitionsPanel />}
        {activeTab === 'Audio' && <AudioPanel />}
        {activeTab === 'Adjustment' && <ColorPanel />}
        {activeTab === 'Templates' && <TemplatesPanel />}
        {activeTab === 'AI Tools' && <AILibraryPanel />}
        <PreviewArea />
        <PropertiesPanel />
      </div>
      <TimelineShell />
      <ExportPanel />
      <ShortcutsPanel />
      <SettingsDialog />
      <UserGuideDialog />
      <OnboardingTour />
    </div>
  );
}
