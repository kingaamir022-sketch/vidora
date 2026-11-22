import Dashboard from './components/Dashboard';
import LeftTabs from './components/LeftTabs';
import PreviewArea from './components/PreviewArea';
import PropertiesPanel from './components/PropertiesPanel';
import TimelineShell from './components/TimelineShell';
import TopBar from './components/TopBar';
import { useProjectStore } from './store/projectStore';

/** Vidora Phase 0 app shell: dashboard <-> editor layout (SPEC Section 3). */
export default function App() {
  const view = useProjectStore((s) => s.view);
  const theme = useProjectStore((s) => s.theme);

  if (view === 'dashboard') {
    return <Dashboard />;
  }

  return (
    <div data-theme={theme} className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftTabs />
        <PreviewArea />
        <PropertiesPanel />
      </div>
      <TimelineShell />
    </div>
  );
}
