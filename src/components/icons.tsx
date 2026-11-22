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
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <path d="M7 4v16M17 4v16M2 9h5M2 15h5M17 9h5M17 15h5" />
  </Base>
);
export const IconAudio = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 18V5l10-2v13" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </Base>
);
export const IconText = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 5h14M12 5v14" />
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
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
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
    <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
  </Base>
);
export const IconAdjustment = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
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
    <path d="M6 21L21 6l-3-3L3 18l3 3zM14 7l3 3" />
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

export const TAB_ICONS: Record<string, (p: IconProps) => ReactElement> = {
  'AI Tools': IconAI,
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
