import { useState } from 'react';
import { useProjectStore } from '../store/projectStore';
import { SOCIAL_TARGETS } from '../lib/share';
import { IconChevronRight } from './icons';

/**
 * Export menu (CapCut-fix 2026-11-25, V1/V2). The Export button (and
 * the top-bar Share button) opens this MENU — not a dialog. Order:
 * Share for review / Share as presentation / Share on social (TikTok,
 * TikTok Ads Manager, YouTube, YouTube Shorts, Facebook Page,
 * Instagram Reels, Free Schedule) / Download. "Download" opens the
 * Download settings panel; the share entries open the same panel at
 * their section. "Free Schedule" stays disabled with its reason (V3).
 * Social targets open the platform's own upload page — Vidora has no
 * connected social accounts, so it cannot post for you.
 */
const SOCIAL_ORDER = ['tiktok', 'tiktok-ads', 'youtube', 'youtube-shorts', 'facebook', 'instagram'];

export default function ExportMenu({
  onClose,
  section,
}: {
  onClose: () => void;
  section: 'main' | 'share';
}) {
  const setExportOpen = useProjectStore((s) => s.setExportOpen);
  const setExportTab = useProjectStore((s) => s.setExportTab);
  const [socialOpen, setSocialOpen] = useState(section === 'share');

  const openTab = (tab: 'download' | 'review' | 'present' | 'social') => {
    setExportTab(tab);
    setExportOpen(true);
    onClose();
  };

  const orderedSocial = SOCIAL_ORDER.map((id) => SOCIAL_TARGETS.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div role="menu" aria-label="Export menu" className="absolute right-3 top-12 z-50 w-72 rounded-lg border border-[#3D3D3D] bg-[#1E1E1E] py-1 text-sm shadow-xl">
      <button type="button" role="menuitem" onClick={() => openTab('review')} className="block w-full px-3 py-2 text-left hover:bg-[#242424]">
        Share for review
      </button>
      <button type="button" role="menuitem" onClick={() => openTab('present')} className="block w-full px-3 py-2 text-left hover:bg-[#242424]">
        Share as presentation
      </button>
      <button
        type="button"
        role="menuitem"
        aria-expanded={socialOpen}
        onClick={() => setSocialOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[#242424]"
      >
        Share on social
        <IconChevronRight size={14} />
      </button>
      {socialOpen && (
        <div className="border-t border-[#2E2E2E] py-1 pl-4">
          {orderedSocial.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitem"
              onClick={() => {
                openTab('social');
                if (t.url) window.open(t.url, '_blank', 'noopener');
              }}
              title={t.note}
              className="block w-full px-3 py-1.5 text-left text-[13px] text-[#A8A8A8] hover:bg-[#242424] hover:text-[#F2F2F2]"
            >
              {t.name}
            </button>
          ))}
          <button type="button" disabled title="Scheduling needs a connected account — not available yet." className="block w-full cursor-not-allowed px-3 py-1.5 text-left text-[13px] text-[#6E6E6E] opacity-60">
            Free Schedule
          </button>
        </div>
      )}
      <div className="border-t border-[#2E2E2E]" />
      <button type="button" role="menuitem" onClick={() => openTab('download')} className="block w-full px-3 py-2 text-left font-semibold hover:bg-[#242424]">
        Download
      </button>
    </div>
  );
}
