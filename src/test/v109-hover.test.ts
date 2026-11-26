import { describe, expect, it } from 'vitest';
import {
  HOVER_BUTTONS_ROW,
  HOVER_POPUP_MARGIN,
  HOVER_POPUP_RATIO,
  hoverPopupGeometry,
  type RectLike,
} from '../lib/templateHover';

const article = (x: number, y: number, w: number, h: number): RectLike => ({ x, y, width: w, height: h });
const card = (x: number, y: number, w: number, h: number): RectLike => ({ x, y, width: w, height: h });

describe('v1.0.9 template hover popup geometry (BUG-CF-044)', () => {
  it('ratio is 1.25x (CapCut #06 measures ~1.27x)', () => {
    expect(HOVER_POPUP_RATIO).toBe(1.25);
  });

  it('1920x1080 row-1 card: popup 375 wide, centred on the card, buttons in view', () => {
    // Baseline: card 300x534 at (322,192); popup unit 375x667+44 = 711.
    const g = hoverPopupGeometry(article(322, 192, 300, 564), card(322, 192, 300, 534), 1920, 1080);
    expect(g.width).toBe(375);
    expect(g.imageHeight).toBeCloseTo(375 * (16 / 9), 0);
    expect(g.unitHeight).toBe(g.imageHeight + HOVER_BUTTONS_ROW);
    // Centred horizontally on the article: left = (300-375)/2 = -37.5.
    expect(g.left).toBeCloseTo(-37.5, 1);
    // Unit centred on card centre (192+267=459): top(vp) = 459-711/2 = 103.5,
    // relative to article top 192 -> -88.5.
    expect(g.top).toBeCloseTo(103.5 - 192, 0);
    // Whole unit inside the viewport.
    expect(192 + g.top).toBeGreaterThanOrEqual(HOVER_POPUP_MARGIN);
    expect(192 + g.top + g.unitHeight).toBeLessThanOrEqual(1080 - HOVER_POPUP_MARGIN);
  });

  it('150% zoom (CSS 1280x720, card 174 wide): popup 217.5 wide, ratio 1.25, buttons in view', () => {
    // Baseline: card 174x309 at (314,234); old fixed 360px popup was 2.07x
    // and its bottom (918) ran 198px past the viewport.
    const g = hoverPopupGeometry(article(314, 234, 174, 339), card(314, 234, 174, 309), 1280, 720);
    expect(g.width).toBeCloseTo(174 * 1.25, 1);
    expect(g.width / 174).toBeCloseTo(1.25, 2);
    expect(234 + g.top).toBeGreaterThanOrEqual(HOVER_POPUP_MARGIN);
    expect(234 + g.top + g.unitHeight).toBeLessThanOrEqual(720 - HOVER_POPUP_MARGIN);
  });

  it('row-2 card at 1280x720: centred position would run off the bottom, so it clamps up', () => {
    // Row-2 card image centre ~693; unit 430.5 tall centred -> bottom 908 > 712.
    const g = hoverPopupGeometry(article(314, 560, 174, 339), card(314, 560, 174, 309), 1280, 720);
    expect(560 + g.top + g.unitHeight).toBeLessThanOrEqual(720 - HOVER_POPUP_MARGIN);
    expect(560 + g.top).toBeGreaterThanOrEqual(HOVER_POPUP_MARGIN);
  });

  it('last-column card at 1920: popup is clamped to the right viewport edge', () => {
    // Sunset card at (1588,192) w 300 -> centred popup would end at 1925.5.
    const g = hoverPopupGeometry(article(1588, 192, 300, 564), card(1588, 192, 300, 534), 1920, 1080);
    expect(1588 + g.left + g.width).toBeLessThanOrEqual(1920 - HOVER_POPUP_MARGIN);
    expect(1588 + g.left).toBeGreaterThanOrEqual(HOVER_POPUP_MARGIN);
  });

  it('first-column card at 1024: popup stays inside the left edge', () => {
    const g = hoverPopupGeometry(article(264, 230, 170, 332), card(264, 230, 170, 302), 1024, 768);
    expect(264 + g.left).toBeGreaterThanOrEqual(HOVER_POPUP_MARGIN);
    expect(264 + g.left + g.width).toBeLessThanOrEqual(1024 - HOVER_POPUP_MARGIN);
  });

  it('measured unit height drives the clamp (1024 row-2: real unit 460, not 440)', () => {
    // Buttons wrap to two lines at narrow widths, so the real unit is
    // 460px tall; the arithmetic 440px left the buttons 12px below the
    // viewport. With the measured height the clamp holds.
    const g = hoverPopupGeometry(article(226, 320, 178, 346), card(226, 320, 178, 316), 1024, 768, 460);
    expect(g.unitHeight).toBe(460);
    expect(320 + g.top + g.unitHeight).toBeLessThanOrEqual(768 - HOVER_POPUP_MARGIN);
    expect(320 + g.top).toBeGreaterThanOrEqual(HOVER_POPUP_MARGIN);
  });

  it('viewport shorter than the popup unit: top clamps to the margin (unit cannot shrink)', () => {
    const g = hoverPopupGeometry(article(100, 100, 300, 564), card(100, 100, 300, 534), 500, 400);
    expect(g.top).toBe(8 - 100); // top(vp) = margin, relative to article top 100
    expect(g.left).toBeGreaterThanOrEqual(8 - 100);
  });
});
