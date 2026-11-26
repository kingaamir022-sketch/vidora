import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LEFT_TABS, type LeftTab } from '../store/projectStore';
import { IconChevronLeft, IconChevronRight, TAB_ICONS } from './icons';
import {
  CHEVRON_W,
  clampTabWidth,
  dividingTabWidth,
  initialFullTabs,
  labelClipped,
  nextRailTarget,
  railGeometry,
  revealTargetRight,
} from '../lib/tabRail';

/**
 * Tab rail (CapCut-fix 2026-11-25, C1–C6; v1.0.2 D1). HORIZONTAL row
 * at the top of the left column only (~610px wide at 1920), ~64px
 * tall, icon ABOVE label. Tabs are CapCut-width (~80px each, so ~7
 * show through "Fi" + ">" at 1920, exactly as in CapCut #19).
 * It SCROLLS: ">" arrow at the right when tabs overflow, "<" at
 * the left when scrolled. Active tab: teal icon + teal text.
 * Full 11-tab order: Media, Audio, Text, Stickers, Effects,
 * Transitions, Captions, Filters, Adjustment, Templates, AI avatar.
 *
 * v1.0.8 (BUG-CF-043): every rest position is TAB-ALIGNED, so no tab
 * label is ever clipped mid-word. Three things used to conspire
 * against that: (1) the ">" step was a fixed 220px — not a multiple
 * of the 80px tab width — so one click landed at scrollLeft 220 and
 * "Template" lost its final "s" (48/54px of the label visible);
 * (2) the raw max scroll (scrollWidth-clientWidth = 295 at 1920)
 * is not tab-aligned either, so at full-right "Stickers" showed a
 * 6px clipped fragment; (3) the chevrons take 24px of layout space
 * when they appear, so clientWidth flips 585↔561 mid-scroll and the
 * max position itself moved. The fixes: CSS scroll-snap (mandatory,
 * align start — any scroll, chevron/wheel/drag, settles on a tab
 * boundary); chevron steps of exactly 3 tabs; a JS-measured end
 * spacer that pads the scrollable area so the max scroll IS a tab
 * boundary (25px at 1920, 4px at 1024); chevron visibility judged
 * against that aligned max; and the active tab is revealed with a
 * tab-aligned scrollTo instead of the old nearest-scroll, which
 * could stop 21px short once the left chevron shrank the viewport
 * (the 1366 Templates case). The initial "Fi" peek stays — CapCut
 * #04 shows exactly that, 2px of the next label as a scroll hint.
 *
 * v1.0.8 COMPLETION (same version, BUG-CF-043): the first pass left
 * a measured residual — after the FIRST ">" click at 150%/1366/1280/
 * 1024 one label still clipped ("Adjustment" 35–39/53px) because the
 * viewport remainder ((railWidth − 48) mod tabWidth = 40–47px)
 * landed inside a label. Stepping alone cannot fix that: at any
 * tab-aligned scrollLeft the right edge shows exactly that remainder
 * of the next tab, whatever the step. So the geometry changed: the
 * tab width is now MEASURED so it divides the viewport —
 * tabWidth = (railWidth − 48) / pageTabs, where pageTabs is the
 * count of tabs that fit at the clamp width (7/6/6/6/5, unchanged)
 * — and the chevrons step exactly one page (pageTabs tabs) per click.
 * The both-chevrons viewport then holds exactly pageTabs whole tabs
 * (remainder 0) at every rest position, and the initial viewport
 * holds the same pageTabs whole tabs plus exactly a 24px peek of
 * the next tab — the CapCut #04 hint, kept (at 1024 the peeking tab
 * is Adjustment, so the hint shows its start, "Adjustm" — a prefix,
 * never a fragment starting mid-word). The measured width is only
 * 0–7% narrower than the clamp width (80.14 / 64.69 / 60.10 / 55.73
 * at 1920/1366/1280/1024); the clamp class stays as the pre-measure
 * fallback. The longest label ("Adjustment", 53px at 10px / 62px at
 * 11px) still fits because the button padding is now responsive:
 * px-0 below 1100px, px-0.5 to 1440px, px-1 above — without it,
 * "Adjustment" was already truncated to "Adjustmen…" at 1024
 * (span scrollWidth 53 > clientWidth 52 in the old geometry).
 */
export default function LeftTabs({
  activeTab,
  onSelect,
}: {
  activeTab: LeftTab;
  onSelect: (tab: LeftTab) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [spacer, setSpacer] = useState(0);
  // Measured tab width (px) that divides the viewport — null until
  // the first measure runs, while the clamp class sizes the tabs.
  const [measuredTabW, setMeasuredTabW] = useState<number | null>(null);
  // Measured geometry (refs — read inside scroll handlers without
  // stale closures; the spacer state mirrors spacerRef for render).
  const spacerRef = useRef(0);
  const alignedMaxRef = useRef(0);
  const tabWidthRef = useRef(0);
  const pageTabsRef = useRef(0);

  const measure = () => {
    const rail = railRef.current;
    const el = scrollRef.current;
    if (!rail || !el) return;
    // Page size from the clamp width (the pre-measure width): the
    // count of tabs that fit whole at scrollLeft = 0. The dividing
    // width then makes the both-chevrons viewport hold exactly that
    // many whole tabs. The clamp width is computed in JS from the
    // viewport (mirroring the CSS class) — the buttons' live width
    // cannot be read here, because it IS the measured width once
    // applied. Absurdly narrow rails (<48px per tab) keep the clamp
    // width instead of squeezing the tabs unreadably thin.
    const clampW = clampTabWidth(window.innerWidth);
    const pageTabs = initialFullTabs({ railWidth: rail.clientWidth, tabWidth: clampW });
    let tabW = dividingTabWidth({ railWidth: rail.clientWidth, pageTabs });
    if (tabW < 48) tabW = clampW;
    // At max scroll only the left chevron shows, so that is the
    // viewport the aligned max must be computed against.
    const clientWidthAtMax = rail.clientWidth - CHEVRON_W;
    const contentWidth = tabW * LEFT_TABS.length;
    const geo = railGeometry({ contentWidth, clientWidthAtMax, tabWidth: tabW });
    spacerRef.current = geo.spacer;
    alignedMaxRef.current = geo.alignedMax;
    tabWidthRef.current = tabW;
    pageTabsRef.current = pageTabs;
    setSpacer(geo.spacer);
    setMeasuredTabW(tabW);
    updateArrows();
  };

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    // v1.0.8 (BUG-CF-043): judge against the ALIGNED max, not the raw
    // scrollWidth — the raw max moves when a chevron appears, so the
    // old formula kept ">" visible at a position with nowhere to go.
    const max = alignedMaxRef.current;
    if (max > 0) setCanRight(el.scrollLeft < max - 2);
    else setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useLayoutEffect(() => {
    measure();
    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(rail);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, []);

  // v1.0.8 (BUG-CF-043): keep the active tab visible with a
  // tab-aligned scroll — the old nearest-scroll could land mid-tab
  // and clip the neighbour's label. No-op when already fully visible.
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    const btn = activeTabRef.current;
    if (!el || !btn) return;
    const scRect = el.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    const fullyVisible =
      !labelClipped({ labelLeft: bRect.left, labelRight: bRect.right, viewLeft: scRect.left, viewRight: scRect.right }) &&
      bRect.left >= scRect.left - 0.5 &&
      bRect.right <= scRect.right + 0.5;
    if (fullyVisible) return;
    const tabW = tabWidthRef.current || btn.getBoundingClientRect().width || 80;
    const tabLeft = bRect.left - scRect.left + el.scrollLeft;
    let target: number;
    if (tabLeft < el.scrollLeft) {
      // Tab sits past the left edge: align its left edge.
      target = tabLeft;
    } else {
      // Tab sits past the right edge: smallest tab boundary that
      // fully reveals it, judged against the viewport AFTER the left
      // chevron appears (railWidth - 48), then clamped to the max.
      target = revealTargetRight({
        tabRight: bRect.right - scRect.left + el.scrollLeft,
        clientWidthAfterScroll: (railRef.current?.clientWidth ?? el.clientWidth + CHEVRON_W) - 2 * CHEVRON_W,
        tabWidth: tabW,
        alignedMax: alignedMaxRef.current,
      });
    }
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [activeTab]);

  // v1.0.8 COMPLETION (BUG-CF-043): paged rail — each chevron click
  // advances exactly one page (pageTabs whole tabs), so every rest
  // position shows whole tabs only. The step is clamped to the
  // aligned max, so the last page is a partial page where the rail
  // ends (1920: one click reaches full-right; 1024: two clicks).
  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const tabW = tabWidthRef.current || 80;
    const target = nextRailTarget({
      scrollLeft: el.scrollLeft,
      dir,
      tabWidth: tabW,
      stepTabs: pageTabsRef.current || 3,
      alignedMax: alignedMaxRef.current || el.scrollWidth,
    });
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  return (
    <div ref={railRef} className="flex h-16 shrink-0 items-stretch border-b border-[#2E2E2E] bg-[#141414]" role="tablist" aria-label="Editor tools">
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
      <div ref={scrollRef} onScroll={updateArrows} className="flex min-w-0 flex-1 snap-x snap-mandatory items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              // The clamp class sizes the tabs before the first
              // measure; the measured dividing width (inline style)
              // wins after that. Padding is responsive so the longest
              // label ("Adjustment", 53px at 10px) still fits the
              // narrower dividing width at small sizes — px-0 below
              // 1100px (1024: 55.73px tab, 0px padding), px-0.5 to
              // 1440px (1280: 60.10px tab, 4px padding), px-1 above.
              style={measuredTabW ? { width: measuredTabW } : undefined}
              className={`flex w-[clamp(60px,5vw,80px)] shrink-0 snap-start flex-col items-center justify-center gap-1 border-b-2 px-0 text-[10px] leading-none min-[1100px]:px-0.5 min-[1440px]:px-1 min-[1440px]:text-[11px] ${
                active ? 'border-[#00D9D9] text-[#00D9D9]' : 'border-transparent text-[#A8A8A8] hover:text-[#F2F2F2]'
              }`}
            >
              <Icon size={20} />
              <span className="max-w-full truncate">{tab}</span>
            </button>
          );
        })}
        {/* v1.0.8 (BUG-CF-043): end spacer — pads the scrollable area
            so the max scroll lands on a tab boundary (25px at 1920,
            4px at 1024) instead of mid-label. Width is measured live
            (see measure()); 0 when already aligned. */}
        <div aria-hidden="true" className="shrink-0" style={{ width: spacer }} />
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
