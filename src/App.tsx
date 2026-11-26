import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import AudioPanel from './components/AudioPanel';
import AIAvatarPanel from './components/AIAvatarPanel';
import AIToolsPanel from './components/AIToolsPanel';
import CaptionsPanel from './components/CaptionsPanel';
import EffectsPanel from './components/EffectsPanel';
import ExportPanel from './components/ExportPanel';
import ExportMenu from './components/ExportMenu';
import FeatureUsageDialog from './components/FeatureUsageDialog';
import FiltersPanel from './components/FiltersPanel';
import AdjustmentPanel from './components/AdjustmentPanel';
import HelpCenter from './components/HelpCenter';
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
import { startAutosave, useProjectStore } from './store/projectStore';
import { projectDuration } from './lib/timeline';
import { actionForCombo, eventToCombo } from './lib/shortcuts';
import { isRtl } from './lib/i18n';

/**
 * Vidora editor shell (CapCut-fix 2026-11-25, v1.0.1).
 * Layout: 48px TopBar, then a row — left column (horizontal 64px tab
 * rail on top + active panel; NO keyboard icon at the bottom — CapCut
 * has none, shortcuts open from Menu → Shortcuts), preview,
 * Details inspector — then the timeline. The 11th tab is "AI avatar".
 * v1.0.2 (D1): left column is min(610px, 32vw) so the 610/520 widths
 * measured at 1920 stay exact there but the layout survives narrower
 * viewports (at 1280 CSS px: 410px left, preview ~512px).
 * The onboarding tour and the 10-step user guide are REMOVED (Y1/Y2);
 * Help Center replaces the guide. Local auth is REMOVED (Y3) — no
 * account chip and no read-only gate anywhere in this shell.
 */
export default function App() {
  const view = useProjectStore((s) => s.view);
  const theme = useProjectStore((s) => s.theme);
  const locale = useProjectStore((s) => s.locale);
  const activeTab = useProjectStore((s) => s.activeTab);
  const presentMode = useProjectStore((s) => s.presentMode);
  const setPresentMode = useProjectStore((s) => s.setPresentMode);
  const setPlaying = useProjectStore((s) => s.setPlaying);
  const showSidebar = useProjectStore((s) => s.showSidebar);
  const setShowSidebar = useProjectStore((s) => s.setShowSidebar);
  const aiToolsOverlay = useProjectStore((s) => s.aiToolsOverlay);
  const setAiToolsOverlay = useProjectStore((s) => s.setAiToolsOverlay);
  const setShortcutsOpen = useProjectStore((s) => s.setShortcutsOpen);
  const setSettingsOpen = useProjectStore((s) => s.setSettingsOpen);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);

  const [helpOpen, setHelpOpen] = useState(false);
  const [featureUsageOpen, setFeatureUsageOpen] = useState(false);
  const [exportMenu, setExportMenu] = useState<'main' | 'share' | null>(null);
  const [timelineVisible, setTimelineVisible] = useState(true);

  useEffect(() => startAutosave(), []);

  // Global keyboard shortcuts (CapCut defaults, W1). Ignored while
  // typing in a field. Esc closes dialogs first, then presentation mode.
  useEffect(() => {
    if (view !== 'editor') return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      const s = useProjectStore.getState();
      if (e.key === 'Escape') {
        if (exportMenu) {
          setExportMenu(null);
          return;
        }
        if (s.aiToolsOverlay) {
          s.setAiToolsOverlay(null);
          return;
        }
        if (s.shortcutsOpen) {
          s.setShortcutsOpen(false);
          return;
        }
        if (s.settingsOpen) {
          s.setSettingsOpen(false);
          return;
        }
        if (s.exportOpen) {
          s.setExportOpen(false);
          return;
        }
        if (helpOpen) {
          setHelpOpen(false);
          return;
        }
        if (featureUsageOpen) {
          setFeatureUsageOpen(false);
          return;
        }
        if (s.presentMode) {
          s.setPresentMode(false);
          return;
        }
        return;
      }
      const action = actionForCombo(s.shortcuts, eventToCombo(e));
      if (!action) return;
      e.preventDefault();
      const fps = s.project?.fps ?? 30;
      if (action === 'togglePlay') s.setPlaying(!s.playing);
      else if (action === 'split') s.splitAtPlayhead();
      else if (action === 'delete') s.deleteSelected();
      else if (action === 'copy') s.copySelected();
      else if (action === 'paste') s.pasteClipboard();
      else if (action === 'cut') {
        s.copySelected();
        s.deleteSelected();
      } else if (action === 'undo') s.undo();
      else if (action === 'redo') s.redo();
      else if (action === 'selectAll') s.selectAllClips();
      else if (action === 'separateAudio') s.detachAudio();
      else if (action === 'zoomIn') s.setZoom(Math.min(200, (s.zoom ?? 100) + 10));
      else if (action === 'zoomOut') s.setZoom(Math.max(10, (s.zoom ?? 100) - 10));
      else if (action === 'frameStepPrev') s.setPlayhead(Math.max(0, s.playhead - 1 / fps));
      else if (action === 'frameStepNext') s.setPlayhead(Math.min(s.project ? projectDuration(s.project) : 0, s.playhead + 1 / fps));
      else if (action === 'previewAxis') s.setPreviewAxis(!s.previewAxis);
      else if (action === 'attachToggle') s.setMagnetic(!s.magnetic);
      else if (action === 'handTool') s.setPreviewTool('hand');
      else if (action === 'moveTool') s.setPreviewTool('move');
      else if (action === 'zoomToFit') window.dispatchEvent(new CustomEvent('vidora:zoom-to-fit'));
      else if (action === 'fullscreen') window.dispatchEvent(new CustomEvent('vidora:preview-fullscreen'));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, exportMenu, helpOpen, featureUsageOpen]);

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
    <div data-theme={theme} dir={dir} lang={locale} className="relative flex h-screen flex-col overflow-hidden bg-[#141414] text-[#F2F2F2]">
      <TopBar
        onExport={() => setExportMenu(exportMenu === 'main' ? null : 'main')}
        onShare={() => setExportMenu(exportMenu === 'share' ? null : 'share')}
        onNewProject={() => useProjectStore.getState().createProject('Untitled Project')}
        onShowFeatureUsage={() => setFeatureUsageOpen(true)}
        onShowHelp={() => setHelpOpen(true)}
        onShowSettings={() => setSettingsOpen(true)}
        onShowShortcuts={() => setShortcutsOpen(true)}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onToggleTimeline={() => setTimelineVisible((v) => !v)}
        sidebarVisible={showSidebar}
        timelineVisible={timelineVisible}
      />
      {exportMenu && <ExportMenu section={exportMenu} onClose={() => setExportMenu(null)} />}
      <div className="flex min-h-0 flex-1">
        {showSidebar && (
          <div className="flex w-[min(610px,32vw)] shrink-0 flex-col border-r border-[#2E2E2E] bg-[#141414]">
            <LeftTabs activeTab={activeTab} onSelect={setActiveTab} />
            <div className="min-h-0 flex-1">
              {activeTab === 'Media' && <MediaBrowser onSelectTab={setActiveTab} />}
              {activeTab === 'Audio' && <AudioPanel />}
              {activeTab === 'Text' && <TextPanel />}
              {activeTab === 'Stickers' && <StickersPanel />}
              {activeTab === 'Effects' && <EffectsPanel />}
              {activeTab === 'Transitions' && <TransitionsPanel />}
              {activeTab === 'Captions' && <CaptionsPanel />}
              {activeTab === 'Filters' && <FiltersPanel />}
              {activeTab === 'Adjustment' && <AdjustmentPanel />}
              {activeTab === 'Templates' && <TemplatesPanel />}
              {activeTab === 'AI avatar' && <AIAvatarPanel />}
            </div>
          </div>
        )}
        <PreviewArea />
        <PropertiesPanel />
      </div>
      {timelineVisible && <TimelineShell />}
      <ExportPanel />
      <ShortcutsPanel />
      <SettingsDialog />
      {helpOpen && <HelpCenter onClose={() => setHelpOpen(false)} />}
      {featureUsageOpen && <FeatureUsageDialog onClose={() => setFeatureUsageOpen(false)} />}
      {/* v1.0.7 (BUG-CF-041, auto-fit): the AI tools overlay is fluid —
          right edge clamp(16px,28vw,540px) (540px at 1920, hugging the
          Details panel) and width capped at the viewport, so it can
          never run past the left edge on narrow screens. */}
      {aiToolsOverlay && (
        <div role="dialog" aria-modal="false" aria-label="AI tools" className="absolute bottom-[300px] right-[clamp(16px,28vw,540px)] z-40 max-h-[calc(100vh-420px)] w-[min(480px,calc(100vw-32px))] overflow-y-auto rounded-lg border border-[#3D3D3D] bg-[#1E1E1E] shadow-2xl">
          <div className="sticky top-0 flex items-center justify-between border-b border-[#2E2E2E] bg-[#1E1E1E] px-4 py-2">
            <span className="text-sm font-semibold">AI tools</span>
            <button type="button" onClick={() => setAiToolsOverlay(null)} aria-label="Close AI tools" className="rounded-md border border-[#3D3D3D] px-2 py-0.5 text-[#A8A8A8] hover:text-[#F2F2F2]">×</button>
          </div>
          <AIToolsPanel focusTool={aiToolsOverlay} />
        </div>
      )}
    </div>
  );
}
