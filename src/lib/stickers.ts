/**
 * Procedural sticker library (Phase 3, SPEC H — H-STICKER, H-SHAPE).
 * Every sticker is ORIGINAL inline SVG generated deterministically from
 * a base design × a palette — no third-party artwork, no copied sticker
 * art. 28 base designs × 8 palettes = 224 stickers.
 * Shapes (H-SHAPE) are separate entries whose fill colour is picked
 * when the shape is added.
 */

export type StickerCategory = 'Faces' | 'Arrows' | 'Shapes' | 'Badges' | 'Speech' | 'Nature' | 'Celebration' | 'Symbols';

export const STICKER_CATEGORIES: StickerCategory[] = ['Faces', 'Arrows', 'Shapes', 'Badges', 'Speech', 'Nature', 'Celebration', 'Symbols'];

export interface StickerDef {
  category: StickerCategory;
  id: string;
  name: string;
  svg: string;
}

type Palette = [string, string, string]; // main, accent, dark

export const STICKER_PALETTES: { colors: Palette; id: string; name: string }[] = [
  { colors: ['#7C3AED', '#06B6D4', '#4C1D95'], id: 'violet', name: 'Violet' },
  { colors: ['#F97316', '#FDBA74', '#7C2D12'], id: 'sunset', name: 'Sunset' },
  { colors: ['#22C55E', '#A7F3D0', '#14532D'], id: 'forest', name: 'Forest' },
  { colors: ['#F43F5E', '#FDA4AF', '#881337'], id: 'rose', name: 'Rose' },
  { colors: ['#0EA5E9', '#A5F3FC', '#0C4A6E'], id: 'ocean', name: 'Ocean' },
  { colors: ['#EAB308', '#FDE68A', '#713F12'], id: 'gold', name: 'Gold' },
  { colors: ['#FAFAFA', '#A1A1AA', '#27272A'], id: 'mono', name: 'Mono' },
  { colors: ['#EC4899', '#F9A8D4', '#831843'], id: 'candy', name: 'Candy' },
];

type DrawFn = (c1: string, c2: string, c3: string) => string;

interface BaseDesign {
  category: StickerCategory;
  draw: DrawFn;
  id: string;
  name: string;
}

const circle = (cx: number, cy: number, r: number, fill: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
const eye = (cx: number, cy: number) => `<circle cx="${cx}" cy="${cy}" r="5" fill="#18181B"/>`;
const smilePath = (d: string) => `<path d="${d}" fill="none" stroke="#18181B" stroke-width="5" stroke-linecap="round"/>`;

const BASE_DESIGNS: BaseDesign[] = [
  // Faces
  { category: 'Faces', draw: (c1) => `${circle(60, 60, 46, c1)}${eye(44, 50)}${eye(76, 50)}${smilePath('M42 72 Q60 88 78 72')}`, id: 'smile', name: 'Smile' },
  { category: 'Faces', draw: (c1) => `${circle(60, 60, 46, c1)}${eye(44, 50)}<path d="M70 48 Q78 42 86 48" fill="none" stroke="#18181B" stroke-width="5" stroke-linecap="round"/>${smilePath('M42 72 Q60 88 78 72')}`, id: 'wink', name: 'Wink' },
  { category: 'Faces', draw: (c1, c2) => `${circle(60, 60, 46, c1)}<path d="M36 52 L44 44 L52 52 L44 60 Z M68 52 L76 44 L84 52 L76 60 Z" fill="${c2}"/>${smilePath('M42 72 Q60 88 78 72')}`, id: 'heart-eyes', name: 'Heart Eyes' },
  { category: 'Faces', draw: (c1, _c2, c3) => `${circle(60, 60, 46, c1)}<rect x="26" y="44" width="30" height="16" rx="8" fill="${c3}"/><rect x="64" y="44" width="30" height="16" rx="8" fill="${c3}"/><rect x="52" y="50" width="16" height="4" fill="${c3}"/>${smilePath('M46 76 Q60 84 74 76')}`, id: 'cool', name: 'Cool Shades' },
  // Arrows
  { category: 'Arrows', draw: (c1) => `<path d="M14 54 H78 V38 L106 60 L78 82 V66 H14 Z" fill="${c1}"/>`, id: 'arrow-right', name: 'Arrow Right' },
  { category: 'Arrows', draw: (c1) => `<path d="M54 14 V78 H38 L60 106 L82 78 H66 V14 Z" fill="${c1}"/>`, id: 'arrow-down', name: 'Arrow Down' },
  { category: 'Arrows', draw: (c1) => `<path d="M54 106 V42 H38 L60 14 L82 42 H66 V106 Z" fill="${c1}"/>`, id: 'arrow-up', name: 'Arrow Up' },
  { category: 'Arrows', draw: (c1) => `<path d="M20 96 Q20 40 72 40 H78" fill="none" stroke="${c1}" stroke-width="12" stroke-linecap="round"/><path d="M60 24 L82 40 L60 56 Z" fill="${c1}"/>`, id: 'arrow-curve', name: 'Curved Arrow' },
  // Shapes
  { category: 'Shapes', draw: (c1) => `<path d="M60 14 L74 46 L108 48 L82 70 L90 104 L60 86 L30 104 L38 70 L12 48 L46 46 Z" fill="${c1}"/>`, id: 'star', name: 'Star' },
  { category: 'Shapes', draw: (c1) => `<path d="M60 100 C20 72 14 40 34 26 C46 18 58 26 60 36 C62 26 74 18 86 26 C106 40 100 72 60 100 Z" fill="${c1}"/>`, id: 'heart', name: 'Heart' },
  { category: 'Shapes', draw: (c1, c2) => `<path d="M66 12 L34 68 H56 L48 108 L86 52 H62 Z" fill="${c1}"/><path d="M66 12 L34 68 H56 L48 108 L86 52 H62 Z" fill="none" stroke="${c2}" stroke-width="3"/>`, id: 'bolt', name: 'Bolt' },
  { category: 'Shapes', draw: (c1) => `<path d="M60 14 L106 60 L60 106 L14 60 Z" fill="${c1}"/>`, id: 'diamond', name: 'Diamond' },
  // Badges
  { category: 'Badges', draw: (c1, c2) => `${circle(60, 48, 30, c1)}<path d="M42 70 L36 104 L60 90 L84 104 L78 70 Z" fill="${c2}"/>${circle(60, 48, 12, '#FFFFFF')}`, id: 'ribbon', name: 'Ribbon' },
  { category: 'Badges', draw: (c1, c2) => `${circle(60, 52, 32, c1)}${circle(60, 52, 22, c2)}<path d="M48 52 L57 61 L74 43" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`, id: 'check-badge', name: 'Check Badge' },
  { category: 'Badges', draw: (c1, c2) => `<path d="M60 12 L72 34 L96 36 L78 52 L84 76 L60 64 L36 76 L42 52 L24 36 L48 34 Z" fill="${c1}"/><path d="M52 44 L58 52 L70 38" fill="none" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>`, id: 'medal', name: 'Medal' },
  // Speech
  { category: 'Speech', draw: (c1) => `<path d="M18 22 H102 V74 H62 L40 98 V74 H18 Z" fill="${c1}"/>`, id: 'bubble', name: 'Speech Bubble' },
  { category: 'Speech', draw: (c1, _c2, c3) => `<path d="M18 22 H102 V74 H62 L40 98 V74 H18 Z" fill="${c1}"/><rect x="57" y="34" width="6" height="26" rx="3" fill="${c3}"/>${circle(60, 66, 3, c3)}`, id: 'bubble-exclaim', name: 'Shout Bubble' },
  { category: 'Speech', draw: (c1) => `<ellipse cx="62" cy="46" rx="42" ry="28" fill="${c1}"/>${circle(38, 82, 8, c1)}${circle(26, 96, 5, c1)}`, id: 'thought', name: 'Thought Bubble' },
  // Nature
  { category: 'Nature', draw: (c1, c2) => `${circle(60, 60, 26, c1)}${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180; const x1 = 60 + Math.cos(r) * 34; const y1 = 60 + Math.sin(r) * 34; const x2 = 60 + Math.cos(r) * 46; const y2 = 60 + Math.sin(r) * 46; return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c2}" stroke-width="7" stroke-linecap="round"/>`; }).join('')}`, id: 'sun', name: 'Sun' },
  { category: 'Nature', draw: (c1, c2) => `<path d="M60 100 C20 84 16 40 60 16 C104 40 100 84 60 100 Z" fill="${c1}"/><path d="M60 92 V28" stroke="${c2}" stroke-width="4" stroke-linecap="round"/>`, id: 'leaf', name: 'Leaf' },
  { category: 'Nature', draw: (c1, c2) => `${[0, 60, 120, 180, 240, 300].map((a) => { const r = (a * Math.PI) / 180; return `<ellipse cx="${(60 + Math.cos(r) * 22).toFixed(1)}" cy="${(60 + Math.sin(r) * 22).toFixed(1)}" rx="14" ry="20" fill="${c1}" transform="rotate(${a} ${(60 + Math.cos(r) * 22).toFixed(1)} ${(60 + Math.sin(r) * 22).toFixed(1)})"/>`; }).join('')}${circle(60, 60, 12, c2)}`, id: 'flower', name: 'Flower' },
  { category: 'Nature', draw: (c1, c2) => `<path d="M12 52 Q30 34 48 52 T84 52 T108 52" fill="none" stroke="${c1}" stroke-width="9" stroke-linecap="round"/><path d="M12 76 Q30 58 48 76 T84 76 T108 76" fill="none" stroke="${c2}" stroke-width="9" stroke-linecap="round"/>`, id: 'wave', name: 'Wave' },
  // Celebration
  { category: 'Celebration', draw: (c1, c2, c3) => `${circle(60, 60, 14, c1)}${[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => { const r = (a * Math.PI) / 180; const x = 60 + Math.cos(r) * 40; const y = 60 + Math.sin(r) * 40; const fill = [c1, c2, c3][i % 3]; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" fill="${fill}"/>`; }).join('')}`, id: 'burst', name: 'Confetti Burst' },
  { category: 'Celebration', draw: (c1, c2) => `<path d="M30 78 L84 30 L96 42 L42 90 Z" fill="${c1}"/><path d="M84 30 L96 42" stroke="${c2}" stroke-width="6" stroke-linecap="round"/><circle cx="34" cy="86" r="6" fill="${c2}"/><circle cx="46" cy="72" r="5" fill="${c2}"/><circle cx="58" cy="60" r="5" fill="${c2}"/>`, id: 'party-hat', name: 'Party Hat' },
  { category: 'Celebration', draw: (c1, c2) => `<ellipse cx="60" cy="48" rx="28" ry="34" fill="${c1}"/><path d="M60 82 L54 94 H66 Z" fill="${c2}"/><path d="M60 94 V108" stroke="${c2}" stroke-width="3"/>`, id: 'balloon', name: 'Balloon' },
  // Symbols
  { category: 'Symbols', draw: (c1) => `<path d="M26 62 L52 88 L96 34" fill="none" stroke="${c1}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`, id: 'check', name: 'Check Mark' },
  { category: 'Symbols', draw: (c1) => `<path d="M32 32 L88 88 M88 32 L32 88" stroke="${c1}" stroke-width="14" stroke-linecap="round"/>`, id: 'cross', name: 'Cross Mark' },
  { category: 'Symbols', draw: (c1) => `${circle(60, 60, 46, c1)}<path d="M48 38 L84 60 L48 82 Z" fill="#FFFFFF"/>`, id: 'play', name: 'Play Button' },
  { category: 'Symbols', draw: (c1, c2) => `${circle(60, 60, 46, c1)}<rect x="42" y="42" width="8" height="36" rx="4" fill="${c2}"/><rect x="70" y="42" width="8" height="36" rx="4" fill="${c2}"/>`, id: 'pause', name: 'Pause Button' },
];

function wrapSvg(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${inner}</svg>`;
}

/** Full procedural catalog: every base design in every palette. */
export const STICKER_CATALOG: StickerDef[] = BASE_DESIGNS.flatMap((base) =>
  STICKER_PALETTES.map((palette) => ({
    category: base.category,
    id: `${base.id}-${palette.id}`,
    name: `${base.name} · ${palette.name}`,
    svg: wrapSvg(base.draw(...palette.colors)),
  })),
);

export function stickerById(id: string): StickerDef | undefined {
  return STICKER_CATALOG.find((s) => s.id === id);
}

export function stickersByCategory(category: StickerCategory): StickerDef[] {
  return STICKER_CATALOG.filter((s) => s.category === category);
}

/** Case-insensitive search over sticker name + category. */
export function searchStickers(query: string): StickerDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return STICKER_CATALOG;
  return STICKER_CATALOG.filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
}

// ---- Shapes (H-SHAPE) ----

export interface ShapeDef {
  description: string;
  id: string;
  name: string;
}

export const SHAPE_DEFS: ShapeDef[] = [
  { description: 'Filled rectangle', id: 'rectangle', name: 'Rectangle' },
  { description: 'Filled circle', id: 'circle', name: 'Circle' },
  { description: 'Filled triangle', id: 'triangle', name: 'Triangle' },
  { description: 'Five-point star', id: 'star', name: 'Star' },
  { description: 'Heart', id: 'heart', name: 'Heart' },
  { description: 'Right-pointing arrow', id: 'arrow', name: 'Arrow' },
  { description: 'Horizontal line', id: 'line', name: 'Line' },
  { description: 'Speech bubble outline', id: 'speech-bubble', name: 'Speech Bubble' },
  { description: 'Round badge with a dot', id: 'badge', name: 'Badge' },
  { description: 'Rounded frame border', id: 'frame', name: 'Frame' },
];

const HEX_OK = /^#[0-9A-Fa-f]{6}$/;

/** Render a shape as inline SVG with the given fill colour. */
export function shapeSvg(shapeId: string, fill: string): string {
  const safe = HEX_OK.test(fill) ? fill : '#7C3AED';
  const inner =
    shapeId === 'rectangle'
      ? `<rect x="18" y="30" width="84" height="60" rx="6" fill="${safe}"/>`
      : shapeId === 'circle'
        ? `<circle cx="60" cy="60" r="42" fill="${safe}"/>`
        : shapeId === 'triangle'
          ? `<path d="M60 16 L104 100 H16 Z" fill="${safe}"/>`
          : shapeId === 'star'
            ? `<path d="M60 14 L74 46 L108 48 L82 70 L90 104 L60 86 L30 104 L38 70 L12 48 L46 46 Z" fill="${safe}"/>`
            : shapeId === 'heart'
              ? `<path d="M60 100 C20 72 14 40 34 26 C46 18 58 26 60 36 C62 26 74 18 86 26 C106 40 100 72 60 100 Z" fill="${safe}"/>`
              : shapeId === 'arrow'
                ? `<path d="M14 54 H78 V38 L106 60 L78 82 V66 H14 Z" fill="${safe}"/>`
                : shapeId === 'line'
                  ? `<rect x="14" y="54" width="92" height="12" rx="6" fill="${safe}"/>`
                : shapeId === 'speech-bubble'
                  ? `<path d="M18 22 H102 V74 H62 L40 98 V74 H18 Z" fill="${safe}"/>`
                  : shapeId === 'badge'
                    ? `<circle cx="60" cy="52" r="34" fill="${safe}"/><circle cx="60" cy="52" r="14" fill="#FFFFFF"/>`
                    : `<rect x="16" y="16" width="88" height="88" rx="12" fill="none" stroke="${safe}" stroke-width="10"/>`;
  return wrapSvg(inner);
}
