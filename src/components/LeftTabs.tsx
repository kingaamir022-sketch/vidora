import { LEFT_TABS, useProjectStore } from '../store/projectStore';
import { TAB_ICONS } from './icons';

/** Left tab rail (SPEC Section 3). Clicking a tab switches the properties panel label. No Phase 1+ feature is faked here. */
export default function LeftTabs() {
  const activeTab = useProjectStore((s) => s.activeTab);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);

  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-zinc-800 bg-zinc-950 py-2" aria-label="Editor tools">
      {LEFT_TABS.map((tab) => {
        const Icon = TAB_ICONS[tab];
        const active = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={active}
            title={tab}
            className={`flex w-14 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] leading-tight ${
              active ? 'bg-violet-600/20 text-violet-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Icon size={20} />
            {tab}
          </button>
        );
      })}
    </nav>
  );
}
