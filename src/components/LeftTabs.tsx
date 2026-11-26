import { useEffect, useRef, useState } from 'react';
import { LEFT_TABS, type LeftTab } from '../store/projectStore';
import { IconChevronLeft, IconChevronRight, TAB_ICONS } from './icons';

/**
 * Tab rail (CapCut-fix 2026-11-25, C1–C6; v1.0.2 D1). HORIZONTAL row
 * at the top of the left column only (~610px wide at 1920), ~64px
 * tall, icon ABOVE label. Tabs are CapCut-width (~80px each, so ~7
 * show through "Fi" + ">" at 1920, exactly as in CapCut #19).
 * It SCROLLS: ">" arrow at the right when tabs overflow, "<" at
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

  // v1.0.7 (BUG-CF-038): keep the active tab visible — when the user
  // picks a tab that sits past the scroll edge (Captions, Templates,
  // AI avatar on a narrow screen), scroll it into view so the teal
  // highlight is always on screen, like CapCut.
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }, [activeTab]);

  const scrollBy = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ behavior: 'smooth', left: dir * 220 });
  };

  return (
    <div className="flex h-16 shrink-0 items-stretch border-b border-[#2E2E2E] bg-[#141414]" role="tablist" aria-label="Editor tools">
      {/* v1.0.5 (BUG-CF-035): the chevrons render ONLY when they can
          scroll. The always-rendered (disabled) left chevron wasted
          24px, so only ~6.5 tabs showed and Filters was invisible;
          CapCut #04 shows 7 tabs + "Fi" + ">" with no left chevron
          until scrolled. With it hidden, Filters peeks ~26px ("Fi").
          v1.0.7 (BUG-CF-038, auto-fit): tab buttons are fluid —
          clamp(60px,5vw,80px) — exactly 80px at 1920 but 64px at
          1280 CSS px (6 tabs fully visible instead of 4 + a cut-off
          "Effe") and 60px at 1024 (5 tabs). Labels are 10px below
          1440px viewports so they still fit the narrower buttons. */}
      {canLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll tabs left"
          className="w-6 shrink-0 text-[#A8A8A8] hover:text-[#F2F2F2]"
        >
          <IconChevronLeft size={16} />
        </button>
      )}
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
              title={tab}
              ref={active ? activeTabRef : undefined}
              onClick={() => onSelect(tab)}
              className={`flex w-[clamp(60px,5vw,80px)] shrink-0 flex-col items-center justify-center gap-1 border-b-2 px-1 text-[10px] leading-none min-[1440px]:text-[11px] ${
                active ? 'border-[#00D9D9] text-[#00D9D9]' : 'border-transparent text-[#A8A8A8] hover:text-[#F2F2F2]'
              }`}
            >
              <Icon size={20} />
              <span className="max-w-full truncate">{tab}</span>
            </button>
          );
        })}
      </div>
      {canRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll tabs right"
          className="w-6 shrink-0 text-[#A8A8A8] hover:text-[#F2F2F2]"
        >
          <IconChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
