/**
 * Template hover-popup geometry (BUG-CF-044, v1.0.9).
 *
 * CapCut desktop #06, measured (1920x1080, visual grounding on the
 * screenshot): grid card image ~253px wide, hover popup image ~321px wide
 * (ratio ~1.27x), popup vertically CENTRED on the card (popup image centre
 * y 559 vs card image centre y 562), buttons directly beneath the image
 * (~12px gap) and fully inside the viewport. The popup overhangs the card
 * by ~35px on each side, so neighbours are only slightly covered.
 *
 * Vidora before the fix used a FIXED 360px popup aligned to the card top:
 * at 1920x1080 that was ratio 1.20x and the buttons were visible, but at
 * the user's 150% zoom (CSS 1280x720, card 174px) the ratio was 2.07x and
 * the popup bottom (918) ran 198px past the viewport (720) — the
 * "Use template" / "Edit more" buttons were invisible below the fold.
 *
 * The fix: popup width = 125% of the card width (CapCut's ~1.27x, rounded),
 * centred horizontally on the card, and the whole popup unit (image +
 * buttons row) vertically centred on the card image — clamped so it always
 * stays inside the viewport with an 8px margin. All geometry is pure math
 * here so it can be unit-tested; the component only measures rects.
 */

export const HOVER_POPUP_RATIO = 1.25;
export const HOVER_POPUP_MARGIN = 8;
/** Buttons row height under the popup image: mt-2 (8px) + 36px buttons. */
export const HOVER_BUTTONS_ROW = 44;

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HoverPopupGeometry {
  /** Popup width in px (125% of the card width). */
  width: number;
  /** Popup image height in px (9:16 of the width). */
  imageHeight: number;
  /** Whole popup unit height (image + buttons row). */
  unitHeight: number;
  /** Left offset relative to the article (viewport-clamped). */
  left: number;
  /** Top offset relative to the article (centred on the card, clamped). */
  top: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/**
 * Compute the popup geometry for a hovered template card.
 * @param articleRect bounding rect of the <article> (== card width)
 * @param cardRect bounding rect of the card image (aspect 9/16 div)
 * @param vw viewport width, @param vh viewport height
 * @param measuredUnitHeight real popup height in px when the caller measured
 *   it (buttons can wrap to two lines at narrow widths, making the unit
 *   taller than imageHeight + HOVER_BUTTONS_ROW — e.g. 460px not 440px at
 *   1024, which left the buttons 12px below the viewport before v1.0.9's
 *   second pass). When given, it drives the vertical clamp.
 */
export function hoverPopupGeometry(
  articleRect: RectLike,
  cardRect: RectLike,
  vw: number,
  vh: number,
  measuredUnitHeight?: number,
): HoverPopupGeometry {
  const width = articleRect.width * HOVER_POPUP_RATIO;
  const imageHeight = width * (16 / 9);
  const unitHeight = measuredUnitHeight ?? imageHeight + HOVER_BUTTONS_ROW;
  // Centre horizontally on the article, clamped inside the viewport.
  const leftVp = clamp(
    articleRect.x + (articleRect.width - width) / 2,
    HOVER_POPUP_MARGIN,
    Math.max(HOVER_POPUP_MARGIN, vw - width - HOVER_POPUP_MARGIN),
  );
  // Centre the whole unit on the card image, clamped inside the viewport.
  const cardCenterVp = cardRect.y + cardRect.height / 2;
  const topVp = clamp(
    cardCenterVp - unitHeight / 2,
    HOVER_POPUP_MARGIN,
    Math.max(HOVER_POPUP_MARGIN, vh - unitHeight - HOVER_POPUP_MARGIN),
  );
  return {
    width,
    imageHeight,
    unitHeight,
    left: leftVp - articleRect.x,
    top: topVp - articleRect.y,
  };
}
