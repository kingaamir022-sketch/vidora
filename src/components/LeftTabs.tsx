import { useEffect, useRef, useState } from 'react';
import { LEFT_TABS, type LeftTab } from '../store/projectStore';
import { IconChevronLeft, IconChevronRight, TAB_ICONS } from './icons';

/**
 * Tab rail (CapCut-fix 2026-11-25, C1–C6). HORIZONTAL row at the top
 * of the left column only (~610px wide at 1920), ~64px tall, icon ABOVE
 * label. It SCROLLS: ">" arrow at the right when tabs overflow, "<" at
 * the left when scrolled. Active tab: teal icon + teal text.
 * Full 11-tab order: Media, Audio, Text, Stickers, Effects,
 * Transitions, Captions, Filters, Adjustment, Templates, AI avatar.
 */
export default function LeftTabs({
  activeTab,
  onSelect,
}: {
  activeTab: LeftTab;
  onSelect: (tab: LeftTab) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ behavior: 'smooth', left: dir * 220 });
  };

  return (
    <div className="flex h-16 shrink-0 items-stretch border-b border-[#2E2E2E] bg-[#141414]" role="tablist" aria-label="Editor tools">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        disabled={!canLeft}
        aria-label="Scroll tabs left"
        className="w-6 shrink-0 text-[#A8A8A8] hover:text-[#F2F2F2] disabled:opacity-30"
      >
        <IconChevronLeft size={16} />
      </button>
      <div ref={scrollRef} onScroll={updateArrows} className="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {LEFT_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab];
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(tab)}
              className={`flex w-[62px] shrink-0 flex-col items-center justify-center gap-1 border-b-2 px-1 text-[11px] leading-none ${
                active ? 'border-[#00D9D9] text-[#00D9D9]' : 'border-transparent text-[#A8A8A8] hover:text-[#F2F2F2]'
              }`}
            >
              <Icon size={20} />
              <span className="max-w-full truncate">{tab}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(1)}
        disabled={!canRight}
        aria-label="Scroll tabs right"
        className="w-6 shrink-0 text-[#A8A8A8] hover:text-[#F2F2F2] disabled:opacity-30"
      >
        <IconChevronRight size={16} />
      </button>
    </div>
  );
}
