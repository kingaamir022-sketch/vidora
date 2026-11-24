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
import { startAutosave, useProjectStore } from './store/projectStore';
import { actionForCombo, eventToCombo } from './lib/shortcuts';

/** Vidora Phase 1 app: dashboard <-> editor layout (SPEC Section 3) with real editing. */
export default function App() {
  const view = useProjectStore((s) => s.view);
  const theme = useProjectStore((s) => s.theme);
  const activeTab = useProjectStore((s) => s.activeTab);

  useEffect(() => startAutosave(), []);

  // Global keyboard shortcuts (Phase 1, SPEC B). Ignored while typing in a field.
  useEffect(() => {
    if (view !== 'editor') return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      const s = useProjectStore.getState();
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

  if (view === 'dashboard') {
    return (
      <div data-theme={theme}>
        <Dashboard />
      </div>
    );
  }

  return (
    <div data-theme={theme} className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftTabs />
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
    </div>
  );
}
