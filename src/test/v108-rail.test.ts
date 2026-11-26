/**
 * v1.0.8 tab-rail alignment tests (BUG-CF-043): after one ">" click
 * the last tab read "Template" — its final "s" clipped — because the
 * chevron step (220px) and the raw max scroll (295px at 1920) are not
 * multiples of the 80px tab width, so the rail rested mid-tab. The
 * fix makes every rest position tab-aligned: CSS scroll-snap, 3-tab
 * chevron steps, a measured end spacer so max scroll is a boundary,
 * and tab-aligned active-tab scrolling. The pure math is unit-tested
 * here; the live behaviour is verified by audit/capcut-fix/v108/
 * verify.mjs (Playwright, 5 sizes, 0 page errors).
 *
 * v1.0.8 COMPLETION (same version): the first pass left a measured
 * residual — after the first ">" click at 150%/1366/1280/1024 one
 * label still clipped ("Adjustment" 35–39/53px), because the viewport
 * remainder ((railWidth − 48) mod tabWidth = 40–47px) lands inside a
 * label whatever the step is. The completion measures the tab width
 * so it DIVIDES the viewport (tabWidth = (railWidth − 48) /
 * pageTabs) and steps one page (pageTabs tabs) per chevron click.
 * The new helpers (clampTabWidth, initialFullTabs, dividingTabWidth)
 * and the paged steps are unit-tested below; the live behaviour is
 * verified by audit/capcut-fix/v108/verify-paged.mjs (183/183 PASS,
 * 0 page errors). The completion also fixed a pre-existing truncation
 * the first-pass verify missed: at 1024 "Adjustment" rendered as
 * "Adjustmen…" (span scrollWidth 53 > clientWidth 52) even when
 * fully visible — the responsive button padding (px-0 < 1100px,
 * px-0.5 < 1440px, px-1 above) gives the longest label room.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  clampTabWidth,
  dividingTabWidth,
  initialFullTabs,
  labelClipped,
  nextRailTarget,
  railGeometry,
  revealTargetRight,
} from '../lib/tabRail';

const read = (p: string) => readFileSync(path.join(process.cwd(), p), 'utf8');

describe('v1.0.8 rail geometry (BUG-CF-043)', () => {
  it('1920: content 880, viewport-at-max 585, tab 80 → spacer 25, aligned max 320', () => {
    const g = railGeometry({ contentWidth: 880, clientWidthAtMax: 585, tabWidth: 80 });
    expect(g.spacer).toBeCloseTo(25, 1);
    expect(g.alignedMax).toBeCloseTo(320, 1);
  });

  it('1024: content 660, viewport-at-max 304, tab 60 → spacer 4, aligned max 360', () => {
    const g = railGeometry({ contentWidth: 660, clientWidthAtMax: 304, tabWidth: 60 });
    expect(g.spacer).toBeCloseTo(4, 1);
    expect(g.alignedMax).toBeCloseTo(360, 1);
  });

  it('1366: content 751.3, viewport-at-max 413, tab 68.3 → aligned max 341.5 (5 tabs)', () => {
    const g = railGeometry({ contentWidth: 751.3, clientWidthAtMax: 413, tabWidth: 68.3 });
    expect(g.alignedMax).toBeCloseTo(341.5, 1);
    expect(g.spacer).toBeCloseTo(3.2, 1);
  });

  it('already-aligned max needs no spacer', () => {
    const g = railGeometry({ contentWidth: 880, clientWidthAtMax: 560, tabWidth: 80 });
    expect(g.spacer).toBe(0);
    expect(g.alignedMax).toBe(320);
  });

  it('no overflow needs no spacer and no max', () => {
    expect(railGeometry({ contentWidth: 500, clientWidthAtMax: 585, tabWidth: 80 })).toEqual({ spacer: 0, alignedMax: 0 });
  });
});

describe('v1.0.8 chevron steps land on tab boundaries', () => {
  it('1920: 0 → 240 → 320 (aligned max), never 220', () => {
    const opts = { tabWidth: 80, stepTabs: 3 as const, alignedMax: 320 };
    expect(nextRailTarget({ scrollLeft: 0, dir: 1, ...opts })).toBe(240);
    expect(nextRailTarget({ scrollLeft: 240, dir: 1, ...opts })).toBe(320);
    expect(nextRailTarget({ scrollLeft: 320, dir: 1, ...opts })).toBe(320);
  });

  it('1920: back down 320 → 80 → 0', () => {
    const opts = { tabWidth: 80, stepTabs: 3 as const, alignedMax: 320 };
    expect(nextRailTarget({ scrollLeft: 320, dir: -1, ...opts })).toBe(80);
    expect(nextRailTarget({ scrollLeft: 80, dir: -1, ...opts })).toBe(0);
  });

  it('a mid-tab start is snapped to the nearest boundary before stepping', () => {
    const opts = { tabWidth: 80, stepTabs: 3 as const, alignedMax: 320 };
    // Legacy 220px rest position: base rounds to 240, then +240 clamps to 320.
    expect(nextRailTarget({ scrollLeft: 220, dir: 1, ...opts })).toBe(320);
    expect(nextRailTarget({ scrollLeft: 220, dir: -1, ...opts })).toBe(0);
  });
});

describe('v1.0.8 active-tab reveal is tab-aligned', () => {
  it('1920 Templates (right edge 800, viewport-after-scroll 561) → 240, not 215', () => {
    expect(revealTargetRight({ tabRight: 800, clientWidthAfterScroll: 561, tabWidth: 80, alignedMax: 320 })).toBe(240);
  });

  it('1920 AI avatar (right edge 880) → aligned max 320', () => {
    expect(revealTargetRight({ tabRight: 880, clientWidthAfterScroll: 561, tabWidth: 80, alignedMax: 320 })).toBe(320);
  });

  it('1366 Templates (right edge 683, viewport-after-scroll 389) → 341.5, not 270', () => {
    // The old nearest-scroll stopped at 270 and the tab stayed
    // 21px short once the left chevron shrank the viewport.
    expect(revealTargetRight({ tabRight: 683, clientWidthAfterScroll: 389, tabWidth: 68.3, alignedMax: 341.5 })).toBeCloseTo(341.5, 1);
  });
});

describe('v1.0.8 label-clip detection', () => {
  it('a label straddling the right edge is clipped (the "Template" case: 48/54px visible)', () => {
    expect(labelClipped({ labelLeft: 733, labelRight: 787, viewLeft: 24, viewRight: 781 })).toBe(true);
  });

  it('a fully visible label is not clipped', () => {
    expect(labelClipped({ labelLeft: 100, labelRight: 150, viewLeft: 24, viewRight: 609 })).toBe(false);
  });

  it('a label fully outside the viewport (0–2px peeking tab, text hidden) is not clipped', () => {
    expect(labelClipped({ labelLeft: 572, labelRight: 605, viewLeft: 0, viewRight: 562 })).toBe(false);
  });

  it('the 6px "Stickers" fragment at old max scroll is clipped', () => {
    expect(labelClipped({ labelLeft: 259, labelRight: 301, viewLeft: 295, viewRight: 880 })).toBe(true);
  });
});

describe('v1.0.8 COMPLETION: viewport-dividing tab widths (BUG-CF-043)', () => {
  it('clampTabWidth mirrors the CSS clamp(60px,5vw,80px) fallback', () => {
    expect(clampTabWidth(1920)).toBe(80);
    expect(clampTabWidth(1366)).toBeCloseTo(68.3, 1);
    expect(clampTabWidth(1280)).toBe(64);
    expect(clampTabWidth(1024)).toBe(60);
    expect(clampTabWidth(800)).toBe(60);
  });

  it('initialFullTabs keeps the v1.0.7 counts: 7/6/6/5', () => {
    expect(initialFullTabs({ railWidth: 609, tabWidth: 80 })).toBe(7);
    expect(initialFullTabs({ railWidth: 436, tabWidth: 68.3 })).toBe(6);
    expect(initialFullTabs({ railWidth: 409, tabWidth: 64 })).toBe(6);
    expect(initialFullTabs({ railWidth: 327, tabWidth: 60 })).toBe(5);
  });

  it('dividingTabWidth: (railWidth − 48) / pageTabs per size', () => {
    expect(dividingTabWidth({ railWidth: 609, pageTabs: 7 })).toBeCloseTo(80.14, 1);
    expect(dividingTabWidth({ railWidth: 436, pageTabs: 6 })).toBeCloseTo(64.67, 1);
    expect(dividingTabWidth({ railWidth: 409, pageTabs: 6 })).toBeCloseTo(60.17, 1);
    expect(dividingTabWidth({ railWidth: 327, pageTabs: 5 })).toBeCloseTo(55.8, 1);
  });

  it('the dividing width makes the both-chevrons viewport hold exactly pageTabs whole tabs', () => {
    // tabW is rounded to 2 decimals, so m × tabW is within a few
    // hundredths of railW − 48 — not exactly 0 remainder by %.
    const cases = [
      { railW: 609, m: 7 },
      { railW: 436, m: 6 },
      { railW: 409, m: 6 },
      { railW: 327, m: 5 },
    ];
    for (const { railW, m } of cases) {
      const tabW = dividingTabWidth({ railWidth: railW, pageTabs: m });
      expect(m * tabW).toBeCloseTo(railW - 48, 0);
      // And the initial viewport holds the same page plus a 24px peek.
      expect(railW - 24 - m * tabW).toBeCloseTo(24, 0);
    }
  });

  it('the longest label still fits inside the dividing width (responsive padding)', () => {
    // "Adjustment" is the longest label: 62px at 11px (1920, px-1),
    // 53px at 10px (all smaller sizes).
    expect(dividingTabWidth({ railWidth: 609, pageTabs: 7 }) - 8).toBeGreaterThanOrEqual(62);
    expect(dividingTabWidth({ railWidth: 436, pageTabs: 6 }) - 4).toBeGreaterThanOrEqual(53);
    expect(dividingTabWidth({ railWidth: 409, pageTabs: 6 }) - 4).toBeGreaterThanOrEqual(53);
    expect(dividingTabWidth({ railWidth: 327, pageTabs: 5 }) - 0).toBeGreaterThanOrEqual(53);
  });

  it('with dividing widths the end spacer is ~24px at every size (the initial peek)', () => {
    const g1920 = railGeometry({ contentWidth: 11 * 80.14, clientWidthAtMax: 585, tabWidth: 80.14 });
    expect(g1920.spacer).toBeCloseTo(24, 0);
    expect(g1920.alignedMax).toBeCloseTo(320.6, 0);
    const g1024 = railGeometry({ contentWidth: 11 * 55.8, clientWidthAtMax: 303, tabWidth: 55.8 });
    expect(g1024.spacer).toBeCloseTo(24, 0);
    expect(g1024.alignedMax).toBeCloseTo(334.8, 0);
  });
});

describe('v1.0.8 COMPLETION: paged chevron steps (BUG-CF-043)', () => {
  it('1920: one page (7 tabs) reaches full-right, back returns to 0', () => {
    const opts = { tabWidth: 80.14, stepTabs: 7 as const, alignedMax: 320.56 };
    expect(nextRailTarget({ scrollLeft: 0, dir: 1, ...opts })).toBeCloseTo(320.56, 1);
    expect(nextRailTarget({ scrollLeft: 320.56, dir: -1, ...opts })).toBe(0);
  });

  it('1366: one page (6 tabs) reaches full-right, back returns to 0', () => {
    const opts = { tabWidth: 64.67, stepTabs: 6 as const, alignedMax: 323.35 };
    expect(nextRailTarget({ scrollLeft: 0, dir: 1, ...opts })).toBeCloseTo(323.35, 1);
    expect(nextRailTarget({ scrollLeft: 323.35, dir: -1, ...opts })).toBe(0);
  });

  it('1024: two pages to the end (0 → 279 → 334.8); back visits the whole-tab 55.8, then 0', () => {
    const opts = { tabWidth: 55.8, stepTabs: 5 as const, alignedMax: 334.8 };
    expect(nextRailTarget({ scrollLeft: 0, dir: 1, ...opts })).toBeCloseTo(279, 1);
    expect(nextRailTarget({ scrollLeft: 279, dir: 1, ...opts })).toBeCloseTo(334.8, 1);
    expect(nextRailTarget({ scrollLeft: 334.8, dir: -1, ...opts })).toBeCloseTo(55.8, 1);
    expect(nextRailTarget({ scrollLeft: 55.8, dir: -1, ...opts })).toBe(0);
  });

  it('active-tab reveal still lands on tab boundaries with dividing widths', () => {
    // 1024 Templates (right edge 10 × 55.8, viewport-after-scroll 279) → 279.
    expect(revealTargetRight({ tabRight: 558, clientWidthAfterScroll: 279, tabWidth: 55.8, alignedMax: 334.8 })).toBeCloseTo(279, 1);
    // 1024 AI avatar (right edge 11 × 55.8) → aligned max 334.8.
    expect(revealTargetRight({ tabRight: 613.8, clientWidthAfterScroll: 279, tabWidth: 55.8, alignedMax: 334.8 })).toBeCloseTo(334.8, 1);
  });
});

describe('v1.0.8 COMPLETION LeftTabs code shape', () => {
  it('BUG-CF-043 completion: measured dividing width + paged steps + responsive padding', () => {
    const tabs = read('src/components/LeftTabs.tsx');
    expect(tabs).toContain('BUG-CF-043');
    expect(tabs).toContain('dividingTabWidth');
    expect(tabs).toContain('initialFullTabs');
    expect(tabs).toContain('clampTabWidth');
    expect(tabs).toContain('pageTabsRef');
    expect(tabs).toContain('measuredTabW');
    expect(tabs).toContain('min-[1100px]:px-0.5');
    expect(tabs).toContain('min-[1440px]:px-1');
    expect(tabs).not.toContain('STEP_TABS');
  });

  it('BUG-CF-043 completion: the clamp class stays as the pre-measure fallback', () => {
    const tabs = read('src/components/LeftTabs.tsx');
    expect(tabs).toContain('clamp(60px,5vw,80px)');
    expect(tabs).toContain('snap-x snap-mandatory');
    expect(tabs).toContain('snap-start');
  });
});

describe('v1.0.8 LeftTabs code shape', () => {
  it('BUG-CF-043: snap classes pin every rest position to a tab boundary', () => {
    const tabs = read('src/components/LeftTabs.tsx');
    expect(tabs).toContain('BUG-CF-043');
    expect(tabs).toContain('snap-x snap-mandatory');
    expect(tabs).toContain('snap-start');
  });

  it('BUG-CF-043: the fixed 220px step and the old nearest-scroll are gone', () => {
    const tabs = read('src/components/LeftTabs.tsx');
    // The comment documents the old 220px step; the scroll code itself
    // must not use it anymore.
    expect(tabs).not.toContain('dir * 220');
    expect(tabs).not.toContain('scrollIntoView');
    expect(tabs).toContain('nextRailTarget');
    expect(tabs).toContain('railGeometry');
    expect(tabs).toContain('revealTargetRight');
  });

  it('BUG-CF-043: chevron visibility is judged against the aligned max', () => {
    const tabs = read('src/components/LeftTabs.tsx');
    expect(tabs).toContain('alignedMaxRef');
    expect(tabs).toContain('scrollLeft < max - 2');
  });
});
