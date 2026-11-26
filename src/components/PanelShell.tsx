import type { ReactNode } from 'react';
import { IconFilter, IconPro, IconSearch } from './icons';

/**
 * CapCut-fix (2026-11-25, D1–D4): every editor tab is TWO columns —
 * a sub-nav (~185px) + a content column (~400px). The left column
 * total is ~580–610px at 1920px wide.
 *
 * - D2: search box at the top of the content with placeholder
 *   "People are searching <term>" + a filter icon at its right.
 * - D3: 2-column card grid; name BELOW the thumbnail; purple ◆ Pro
 *   badge top-left; download icon bottom-right.
 * - D4: a section heading above the grid ("Trending", "Featured",
 *   "For you").
 * - v1.0.7 (BUG-CF-039, auto-fit): the sub-nav is fluid —
 *   clamp(120px,10vw,185px) — exactly 185px at 1920, 128px at 1280
 *   CSS px and 120px at 1024, so the content column keeps room
 *   (at 1024 the content was 143px; now 208px). The content column
 *   is a CSS container (class "panel-content", see index.css): when
 *   it gets narrow, its two-column card grids collapse to one
 *   column so tiles stay big and usable instead of ~55px slivers.
 */

export function SubNavItem({
  active,
  children,
  onClick,
  suffix,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  suffix?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? true : undefined}
      className={`flex w-full items-center justify-between gap-1 rounded-md px-2.5 py-1.5 text-left text-xs ${
        active ? 'bg-[#2E2E2E] font-semibold text-[#F2F2F2]' : 'text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]'
      }`}
    >
      <span className="truncate">{children}</span>
      {suffix}
    </button>
  );
}

export function SubNavGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="mt-1">
      <p className="px-2.5 pb-0.5 pt-2 text-[11px] font-semibold text-[#6E6E6E]">{title}</p>
      {children}
    </div>
  );
}

export function PanelSearch({
  onChange,
  placeholder,
  value,
}: {
  onChange: (v: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <label className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-[#2E2E2E] bg-[#242424] px-2 py-1.5">
        <span className="shrink-0 text-[#A8A8A8]">
          <IconSearch size={14} />
        </span>
        <span className="sr-only">Search</span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Search"
          className="min-w-0 flex-1 bg-transparent text-xs text-[#F2F2F2] outline-none placeholder:text-[#6E6E6E]"
        />
      </label>
      <button type="button" aria-label="Filter" title="Filter" className="shrink-0 rounded-md border border-[#2E2E2E] bg-[#242424] p-1.5 text-[#A8A8A8] hover:text-[#F2F2F2]">
        <IconFilter size={14} />
      </button>
    </div>
  );
}

export function SectionHeading({ action, children }: { action?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <h3 className="text-xs font-semibold text-[#F2F2F2]">{children}</h3>
      {action}
    </div>
  );
}

/** 2-col card grid (D3). */
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="mt-2 grid grid-cols-2 gap-2">{children}</div>;
}

/** One card in the 2-col grid: thumbnail on top, name below, ◆ Pro
 * badge top-left and a download icon bottom-right (D3). */
export function PanelCard({
  badge,
  children,
  name,
  onClick,
  pro,
  selected,
  title,
}: {
  badge?: ReactNode;
  children: ReactNode;
  name?: string;
  onClick?: () => void;
  pro?: boolean;
  selected?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? name}
      aria-pressed={selected}
      className={`group relative overflow-hidden rounded-lg border text-left ${
        selected ? 'border-[#00D9D9]' : 'border-[#2E2E2E] hover:border-[#3D3D3D]'
      } bg-[#242424]`}
    >
      <span className="relative block">
        {children}
        {pro && (
          <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-[#7C3AED] px-1 py-0.5 text-[10px] leading-none text-white" title="Included in this build — nothing is charged.">
            <IconPro size={10} /> Pro
          </span>
        )}
        {badge}
      </span>
      {name && <span className="block truncate px-2 py-1 text-[11px] text-[#F2F2F2]">{name}</span>}
    </button>
  );
}

export default function PanelShell({
  children,
  subNav,
}: {
  children: ReactNode;
  subNav?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 shrink-0 bg-[#1E1E1E]">
      {subNav && (
        <nav aria-label="Panel sections" className="w-[clamp(120px,10vw,185px)] shrink-0 overflow-y-auto border-r border-[#2E2E2E] px-1.5 py-2">
          {subNav}
        </nav>
      )}
      <div className="panel-content h-full min-w-0 w-full flex-1 max-w-[400px] overflow-y-auto p-3 text-[#F2F2F2]">{children}</div>
    </div>
  );
}
