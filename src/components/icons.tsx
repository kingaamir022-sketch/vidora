import type { ReactElement, ReactNode } from 'react';

/**
 * Vidora original icon set — hand-drawn SVG paths (Phase 0).
 * No third-party icon font or copied artwork. 24x24, stroke-based,
 * inherits currentColor. Add new icons here only, never inline elsewhere.
 */

interface IconProps {
  size?: number;
}

function Base({ children, size = 20 }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconMedia = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M10 9.5v5l4.5-2.5L10 9.5z" fill="currentColor" stroke="none" />
  </Base>
);
export const IconAudio = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="0.5" fill="currentColor" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </Base>
);
export const IconText = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5h9M8.5 5v11" />
    <path d="M16 9v8M13.5 9H19M13.5 17H19" />
  </Base>
);
export const IconStickers = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 9.5h.01M15 9.5h.01" />
  </Base>
);
export const IconEffects = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3L12 3zM19 15l.9 2.3 2.3.9-2.3.9L19 21.5l-.9-2.4-2.3-.9 2.3-.9L19 15z" />
  </Base>
);
export const IconTransitions = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 7l6 5-6 5V7zM21 7l-6 5 6 5V7z" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </Base>
);
export const IconCaptions = (p: IconProps) => (
  <Base {...p}>
    <rect x="2" y="5" width="20" height="14" rx="3" />
    <path d="M10.5 10.5c-.8-.8-2.5-.8-3.2.5-.6 1.2-.6 2.8 0 4 .7 1.3 2.4 1.3 3.2.5M17.5 10.5c-.8-.8-2.5-.8-3.2.5-.6 1.2-.6 2.8 0 4 .7 1.3 2.4 1.3 3.2.5" />
  </Base>
);
export const IconFilters = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 18a4 4 0 01-.5-7.97A5.5 5.5 0 0117.3 9 3.5 3.5 0 0117.5 18H7z" />
  </Base>
);
export const IconAdjustment = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="17" r="2" />
  </Base>
);
export const IconTemplates = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M3 9h18M9 9v12" />
  </Base>
);
export const IconAI = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20c1-3.5 4-5 7.5-5s6.5 1.5 7.5 5" />
  </Base>
);
export const IconPlay = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 4.5v15l13-7.5-13-7.5z" fill="currentColor" stroke="none" />
  </Base>
);
export const IconPause = (p: IconProps) => (
  <Base {...p}>
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
  </Base>
);
export const IconUndo = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 5L3 10l5 5M3 10h11a6 6 0 016 6v1" />
  </Base>
);
export const IconRedo = (p: IconProps) => (
  <Base {...p}>
    <path d="M16 5l5 5-5 5M21 10H10a6 6 0 00-6 6v1" />
  </Base>
);
export const IconExport = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 15V3M7 8l5-5 5 5M4 17v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
  </Base>
);
export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);
export const IconFolder = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </Base>
);
export const IconClock = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Base>
);

export const IconHand = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 12V5.5a1.5 1.5 0 013 0V11m0-5.5v-1a1.5 1.5 0 013 0V11m0-4.5a1.5 1.5 0 013 0V12m0-3a1.5 1.5 0 013 0v5a7 7 0 01-7 7h-1a7 7 0 01-6-3.3L4.6 14a1.6 1.6 0 012.6-1.8L8 13.5" />
  </Base>
);
export const IconMove = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2v20M2 12h20M12 2l-2.5 2.5M12 2l2.5 2.5M12 22l-2.5-2.5M12 22l2.5-2.5M2 12l2.5-2.5M2 12l2.5 2.5M22 12l-2.5-2.5M22 12l-2.5 2.5" />
  </Base>
);
export const IconMagnet = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 3v7a6 6 0 0012 0V3M6 3h4v5H6zM14 3h4v5h-4z" />
  </Base>
);
export const IconAxis = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v18" />
    <path d="M8 7h8M8 17h8" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Base>
);
export const IconScissors = (p: IconProps) => (
  <Base {...p}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="6" cy="18" r="2.5" />
    <path d="M8.2 7.8L20 19M8.2 16.2L20 5" />
  </Base>
);
export const IconTrash = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </Base>
);
export const IconMic = (p: IconProps) => (
  <Base {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0014 0M12 18v3" />
  </Base>
);
export const IconTranscript = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 9h6M7 13h10M7 17h4" />
  </Base>
);
export const IconSplitScene = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M12 5v14" />
    <path d="M7.5 9.5v5l3-2.5-3-2.5zM16.5 9.5v5l-3-2.5 3-2.5z" fill="currentColor" stroke="none" />
  </Base>
);
export const IconReference = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M4 18l5-5 3 3 3-3 5 5" />
  </Base>
);
export const IconDownload = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M4 19h16" />
  </Base>
);
export const IconCrop = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 2v17M2 7h17M17 5v17M5 17h17" />
  </Base>
);
export const IconFlip = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="6" width="7" height="12" rx="1" />
    <rect x="14" y="6" width="7" height="12" rx="1" />
    <path d="M12 3v18" strokeDasharray="2 2" />
  </Base>
);
export const IconFreeze = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 2v20M4 6l16 12M20 6L4 18M12 2l-2 3M12 2l2 3M12 22l-2-3M12 22l2-3" />
  </Base>
);
export const IconReverse = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12a9 9 0 109-9 9.5 9.5 0 00-6.5 2.7L3 8" />
    <path d="M3 3v5h5" />
  </Base>
);
export const IconMenu = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Base>
);
export const IconShare = (p: IconProps) => (
  <Base {...p}>
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="M8.2 10.8l7.6-4.3M8.2 13.2l7.6 4.3" />
  </Base>
);
export const IconPro = (p: IconProps) => (
  <Base {...p}>
    {/* v1.0.5 (BUG-CF-036): a DIAMOND, not a star — CapCut's Pro mark
        is ◆ (sampled #04: lavender #997BFF on a #4F4F4F button). */}
    <path d="M12 2 L22 12 L12 22 L2 12 Z" fill="currentColor" stroke="none" />
  </Base>
);
export const IconKeyboard = (p: IconProps) => (
  <Base {...p}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" />
  </Base>
);
export const IconFullscreen = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </Base>
);
export const IconFit = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeDasharray="3 2" />
    <rect x="8" y="8" width="8" height="8" rx="1" />
  </Base>
);
export const IconChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M14.5 5.5L8 12l6.5 6.5" />
  </Base>
);
export const IconChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M9.5 5.5L16 12l-6.5 6.5" />
  </Base>
);
export const IconChevronDown = (p: IconProps) => (
  <Base {...p}>
    <path d="M5.5 9.5L12 16l6.5-6.5" />
  </Base>
);
export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);
export const IconSearch = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Base>
);
export const IconFilter = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5h16M7 12h10M10 19h4" />
  </Base>
);
export const IconStar = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />
  </Base>
);
export const IconVolume = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z" />
    <path d="M15.5 9a4.5 4.5 0 010 6M18 6.5a8 8 0 010 11" />
  </Base>
);
export const IconVolumeOff = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </Base>
);
export const IconLink = (p: IconProps) => (
  <Base {...p}>
    <path d="M10 14a4 4 0 005.7.4l2.8-2.8a4 4 0 10-5.7-5.7L11.5 7.2M14 10a4 4 0 00-5.7-.4l-2.8 2.8a4 4 0 105.7 5.7l1.3-1.3" />
  </Base>
);
export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 12.5l5 5L19.5 7" />
  </Base>
);
export const IconDots = (p: IconProps) => (
  <Base {...p}>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </Base>
);
export const IconCloud = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 18a4 4 0 01-.5-7.97A5.5 5.5 0 0117.3 9 3.5 3.5 0 0117.5 18H7z" />
    <path d="M12 11v5M9.8 13.8L12 11.5l2.2 2.3" />
  </Base>
);
export const IconLayout = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M9.5 10v10" />
  </Base>
);
export const IconSparkles = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3L12 3zM19 15l.9 2.3 2.3.9-2.3.9L19 21.5l-.9-2.4-2.3-.9 2.3-.9L19 15z" />
  </Base>
);

export const TAB_ICONS: Record<string, (p: IconProps) => ReactElement> = {
  'AI avatar': IconAI,
  Adjustment: IconAdjustment,
  Audio: IconAudio,
  Captions: IconCaptions,
  Effects: IconEffects,
  Filters: IconFilters,
  Media: IconMedia,
  Stickers: IconStickers,
  Templates: IconTemplates,
  Text: IconText,
  Transitions: IconTransitions,
};
