/**
 * Tab-rail alignment math (v1.0.8, BUG-CF-043).
 *
 * The rail's tabs are equal-width and scroll inside a viewport whose
 * width flips by 24px whenever a chevron appears or disappears.
 *
 * v1.0.8 first pass: every rest position tab-aligned (CSS scroll-snap,
 * 3-tab chevron steps, measured end spacer, tab-aligned active-tab
 * reveal). That fixed the reported 1920 defect, but a measured
 * residual stayed: after the FIRST ">" click at 150%/1366/1280/1024
 * one label still clipped ("Adjustment" 35–39/53px) — the viewport
 * remainder ((railWidth − 48) mod tabWidth = 40–47px) landed inside
 * a label. Stepping alone CANNOT fix that: at any tab-aligned
 * scrollLeft the right edge shows exactly that remainder of the next
 * tab, whatever the step size, so the remainder is a property of the
 * viewport, not the step. The completion (same version, BUG-CF-043):
 * the tab width itself is measured so it DIVIDES the viewport —
 * tabWidth = (railWidth − 48) / pageTabs — so the both-chevrons
 * viewport holds exactly pageTabs whole tabs (remainder 0), and the
 * chevrons step exactly one page (pageTabs tabs) per click. The
 * initial position then shows exactly pageTabs whole tabs plus a
 * 24px peek of the next tab (the one-chevron difference) — the
 * CapCut #04 "Fi" hint, kept. The clamp(60px,5vw,80px) width stays
 * as the pre-measure fallback and as the source of pageTabs (the
 * count of tabs that fit at the clamp width); the measured width is
 * applied by LeftTabs once measured (useLayoutEffect, before paint).
 *
 * These helpers are pure (unit-tested in src/test/v108-rail.test.ts);
 * LeftTabs.tsx wires them to the live DOM.
 */

/** Round to 2 decimals — tab widths like 5vw of 1366px are fractional. */
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Width (px) of one chevron button; each chevron takes this much of
 *  the rail row when it is showing. */
export const CHEVRON_W = 24;

export interface RailGeometry {
  /** Trailing spacer (px) appended after the last tab. */
  spacer: number;
  /** Farthest tab-aligned scroll position; the last tab is fully
   *  visible there and no label is clipped at either edge. */
  alignedMax: number;
}

/**
 * Given the tabs' total content width, the scroller's clientWidth at
 * max scroll (only the left chevron shows there, so railWidth - 24),
 * and one tab's width, compute the end spacer and the aligned max.
 * The spacer pads the scrollable area so the browser's raw max scroll
 * lands exactly on a tab boundary.
 */
export function railGeometry(args: {
  contentWidth: number;
  clientWidthAtMax: number;
  tabWidth: number;
}): RailGeometry {
  const { contentWidth, clientWidthAtMax, tabWidth } = args;
  if (tabWidth <= 0 || contentWidth <= clientWidthAtMax) {
    return { spacer: 0, alignedMax: 0 };
  }
  const rawMax = contentWidth - clientWidthAtMax;
  const alignedMax = r2(Math.ceil(rawMax / tabWidth) * tabWidth);
  const spacer = r2(Math.max(0, alignedMax + clientWidthAtMax - contentWidth));
  return { spacer, alignedMax };
}

/**
 * The clamp width the tabs use before measurement — mirrors the CSS
 * `w-[clamp(60px,5vw,80px)]` fallback class on the tab buttons, so
 * the JS and the stylesheet never disagree about the pre-measure
 * width. 5vw is of the viewport (CSS) width.
 */
export function clampTabWidth(viewportWidth: number): number {
  return Math.min(80, Math.max(60, viewportWidth * 0.05));
}

/**
 * How many tabs fit whole at scrollLeft = 0, where only the right
 * chevron shows (viewport = railWidth − 24). This is the page size:
 * the v1.0.7 counts — 7 at 1920, 6 at 1366/1280, 5 at 1024 — are
 * exactly this number, so the paged rail keeps them.
 */
export function initialFullTabs(args: { railWidth: number; tabWidth: number }): number {
  const { railWidth, tabWidth } = args;
  if (tabWidth <= 0) return 1;
  return Math.max(1, Math.floor((railWidth - CHEVRON_W) / tabWidth));
}

/**
 * The viewport-dividing tab width: (railWidth − 48) / pageTabs, so
 * the both-chevrons viewport holds exactly pageTabs whole tabs and
 * the right-edge remainder is 0 at every scrolled rest position.
 * The initial viewport (railWidth − 24) then holds the same pageTabs
 * whole tabs plus exactly a 24px peek of the next tab — the CapCut
 * #04 hint. Measured per size (railWidth from the live DOM):
 * 1920 → 80.14 (7 tabs), 1366 → 64.69 (6), 1280 → 60.10 (6),
 * 1024 → 55.73 (5). Only ~0–7% narrower than the clamp width, and
 * the longest label ("Adjustment", 53px at 10px / 62px at 11px)
 * still fits inside every tab once the button padding goes
 * responsive (px-0 below 1100px, px-0.5 to 1440px, px-1 above).
 */
export function dividingTabWidth(args: { railWidth: number; pageTabs: number }): number {
  const { railWidth, pageTabs } = args;
  if (pageTabs <= 0) return 0;
  return r2((railWidth - 2 * CHEVRON_W) / pageTabs);
}

/**
 * Next chevron target: step a whole number of tabs from the nearest
 * tab boundary, clamped to [0, alignedMax]. Snapping the start first
 * matters — a mid-tab scrollLeft (wheel, legacy 220px step) must not
 * carry its misalignment into the next step.
 */
export function nextRailTarget(args: {
  scrollLeft: number;
  dir: 1 | -1;
  tabWidth: number;
  stepTabs?: number;
  alignedMax: number;
}): number {
  const { scrollLeft, dir, tabWidth, stepTabs = 3, alignedMax } = args;
  if (tabWidth <= 0) return Math.max(0, scrollLeft + dir * 220);
  const base = Math.round(scrollLeft / tabWidth) * tabWidth;
  const target = base + dir * stepTabs * tabWidth;
  return r2(Math.min(Math.max(target, 0), Math.max(0, alignedMax)));
}

/**
 * Tab-aligned target that fully reveals a tab sitting past the right
 * edge: the smallest tab boundary L with the tab's right edge inside
 * [L, L + clientWidthAfterScroll]. clientWidthAfterScroll is the width
 * once the left chevron is showing (railWidth - 48) — using the
 * current width would under-scroll, because the left chevron appears
 * mid-scroll and shrinks the viewport by 24px (the 1366 Templates
 * case: scrollIntoView('nearest') stopped 21px short).
 */
export function revealTargetRight(args: {
  tabRight: number;
  clientWidthAfterScroll: number;
  tabWidth: number;
  alignedMax: number;
}): number {
  const { tabRight, clientWidthAfterScroll, tabWidth, alignedMax } = args;
  if (tabWidth <= 0) return Math.max(0, tabRight - clientWidthAfterScroll);
  const need = tabRight - clientWidthAfterScroll;
  const target = Math.ceil(need / tabWidth) * tabWidth;
  return r2(Math.min(Math.max(target, 0), Math.max(0, alignedMax)));
}

/**
 * True iff a label is clipped mid-word: its span intersects the
 * viewport but is not fully inside it. A label fully outside the
 * viewport (a tab peeking by 0–2px with its text hidden) is NOT
 * clipped — it simply is not visible.
 */
export function labelClipped(args: {
  labelLeft: number;
  labelRight: number;
  viewLeft: number;
  viewRight: number;
  epsilon?: number;
}): boolean {
  const { labelLeft, labelRight, viewLeft, viewRight, epsilon = 0.5 } = args;
  const intersects = labelRight > viewLeft + epsilon && labelLeft < viewRight - epsilon;
  const fullyInside = labelLeft >= viewLeft - epsilon && labelRight <= viewRight + epsilon;
  return intersects && !fullyInside;
}
