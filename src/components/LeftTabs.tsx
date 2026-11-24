import { LEFT_TABS, useProjectStore } from '../store/projectStore';
import { TAB_ICONS } from './icons';
import { t, type StringKey } from '../lib/i18n';

const TAB_LABELS: Record<string, StringKey> = {
  Media: 'tab.media',
  Text: 'tab.text',
  Stickers: 'tab.stickers',
  Captions: 'tab.captions',
  Effects: 'tab.effects',
  Filters: 'tab.filters',
  Transitions: 'tab.transitions',
  Audio: 'tab.audio',
  Adjustment: 'tab.adjustment',
  Templates: 'tab.templates',
  'AI Tools': 'tab.aiTools',
};

/** Left tab rail (SPEC Section 3). Clicking a tab switches the properties panel label. Labels follow the active locale (M-LOCALE). */
export default function LeftTabs() {
  const activeTab = useProjectStore((s) => s.activeTab);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const locale = useProjectStore((s) => s.locale);

  return (
    <nav className="flex w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-zinc-800 bg-zinc-950 py-2" aria-label="Editor tools">
      {LEFT_TABS.map((tab) => {
        const Icon = TAB_ICONS[tab];
        const active = tab === activeTab;
        const label = t(locale, TAB_LABELS[tab] ?? 'tab.media');
        return (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={active}
            title={label}
            className={`flex w-14 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] leading-tight ${
              active ? 'bg-violet-600/20 text-violet-300' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
