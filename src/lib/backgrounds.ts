/**
 * Procedural backgrounds (Phase 5, SPEC N — N-BACKGROUNDS).
 * 30 original full-frame SVG backgrounds: gradients, patterns, grain &
 * dust, and frames. Rendered as sticker clips (category 'Backgrounds')
 * that fill the canvas — see `src/lib/compositor.ts` background branch.
 * All artwork is generated here; no stock images or copied designs.
 */

export type BackgroundCategory = 'Gradients' | 'Patterns' | 'Grain & Dust' | 'Frames';

export const BACKGROUND_CATEGORIES: BackgroundCategory[] = ['Gradients', 'Patterns', 'Grain & Dust', 'Frames'];

export interface BackgroundDef {
  category: BackgroundCategory;
  description: string;
  id: string;
  name: string;
  /** Full-frame SVG (viewBox 320x180). */
  svg: string;
}

const W = 320;
const H = 180;

const svgWrap = (inner: string, defs = ''): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${inner}</svg>`;

const grad = (id: string, stops: [string, string][], vertical = false): string =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops
    .map(([offset, color], i) => `<stop offset="${offset}" stop-color="${color}"${i === 0 ? '' : ''}/>`).join('')}</linearGradient></defs>`;

const bg = (id: string, name: string, category: BackgroundCategory, description: string, svg: string): BackgroundDef => ({
  category,
  description,
  id,
  name,
  svg,
});

export const BACKGROUND_CATALOG: BackgroundDef[] = [
  // ---- Gradients (12) ----
  bg('violet-dusk', 'Violet Dusk', 'Gradients', 'Deep violet melting into cyan.', svgWrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [['0', '#7C3AED'], ['1', '#06B6D4']]))),
  bg('sunset-fade', 'Sunset Fade', 'Gradients', 'Warm orange fading to rose.', svgWrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [['0', '#F97316'], ['1', '#F43F5E']]))),
  bg('ocean-depth', 'Ocean Depth', 'Gradients', 'Deep blue into teal.', svgWrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [['0', '#1E3A8A'], ['1', '#0D9488']]))),
  bg('forest-mist', 'Forest Mist', 'Gradients', 'Dark green into soft lime.', svgWrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [['0', '#14532D'], ['1', '#84CC16']]))),
  bg('rose-dawn', 'Rose Dawn', 'Gradients', 'Soft pink into pale gold.', svgWrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [['0', '#F9A8D4'], ['1', '#FDE68A']]))),
  bg('midnight-sky', 'Midnight Sky', 'Gradients', 'Near-black into indigo.', svgWrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [['0', '#020617'], ['1', '#312E81']]))),
  bg('ember-glow', 'Ember Glow', 'Gradients', 'Charcoal into burning amber.', svgWrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [['0', '#1C1917'], ['1', '#EA580C']]))),
  bg('mint-breeze', 'Mint Breeze', 'Gradients', 'Pale mint into sky blue.', svgWrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [['0', '#A7F3D0'], ['1', '#7DD3FC']]))),
  bg('lavender-soft', 'Lavender Soft', 'Gradients', 'Lilac into soft white.', svgWrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [['0', '#C4B5FD'], ['1', '#F5F3FF']]))),
  bg('golden-sand', 'Golden Sand', 'Gradients', 'Sand gold into warm cream.', svgWrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [['0', '#D97706'], ['1', '#FEF3C7']]))),
  bg('slate-rain', 'Slate Rain', 'Gradients', 'Slate grey into cool silver.', svgWrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [['0', '#334155'], ['1', '#CBD5E1']]))),
  bg('berry-blush', 'Berry Blush', 'Gradients', 'Berry purple into coral.', svgWrap(`<rect width="${W}" height="${H}" fill="url(#g)"/>`, grad('g', [['0', '#7E22CE'], ['1', '#FB7185']]))),
  // ---- Patterns (8) ----
  bg('dot-grid', 'Dot Grid', 'Patterns', 'Dark field with a dotted grid.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#18181B"/>${Array.from({ length: 20 }, (_, i) => Array.from({ length: 11 }, (_, j) => `<circle cx="${8 + i * 16}" cy="${8 + j * 16}" r="1.5" fill="#3F3F46"/>`).join('')).join('')}`,
  )),
  bg('diagonal-lines', 'Diagonal Lines', 'Patterns', 'Thin diagonal stripes on ink.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#0F172A"/>${Array.from({ length: 24 }, (_, i) => `<line x1="${i * 20 - 60}" y1="0" x2="${i * 20 + 120}" y2="${H}" stroke="#1E293B" stroke-width="3"/>`).join('')}`,
  )),
  bg('checker-soft', 'Checker Soft', 'Patterns', 'Soft two-tone checkerboard.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#F4F4F5"/>${Array.from({ length: 10 }, (_, i) => Array.from({ length: 6 }, (_, j) => ((i + j) % 2 === 0 ? `<rect x="${i * 32}" y="${j * 30}" width="32" height="30" fill="#E4E4E7"/>` : '')).join('')).join('')}`,
  )),
  bg('hex-tiles', 'Hex Tiles', 'Patterns', 'Honeycomb hex pattern.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#FEF9C3"/>${Array.from({ length: 12 }, (_, i) => Array.from({ length: 6 }, (_, j) => {
      const cx = 16 + i * 28 + (j % 2 === 0 ? 0 : 14);
      const cy = 16 + j * 24;
      return `<polygon points="${[0, 60, 120, 180, 240, 300].map((a) => `${(cx + 12 * Math.cos((a * Math.PI) / 180)).toFixed(1)},${(cy + 12 * Math.sin((a * Math.PI) / 180)).toFixed(1)}`).join(' ')}" fill="none" stroke="#FDE68A" stroke-width="2"/>`;
    }).join('')).join('')}`,
  )),
  bg('wave-lines', 'Wave Lines', 'Patterns', 'Flowing wave lines on deep blue.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#1E3A8A"/>${Array.from({ length: 6 }, (_, i) => `<path d="M0 ${30 + i * 24} Q 80 ${14 + i * 24} 160 ${30 + i * 24} T 320 ${30 + i * 24}" fill="none" stroke="#3B82F6" stroke-width="2" opacity="0.7"/>`).join('')}`,
  )),
  bg('circle-rings', 'Circle Rings', 'Patterns', 'Concentric rings on violet.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#4C1D95"/>${Array.from({ length: 7 }, (_, i) => `<circle cx="160" cy="90" r="${12 + i * 14}" fill="none" stroke="#A78BFA" stroke-width="2" opacity="${(0.7 - i * 0.08).toFixed(2)}"/>`).join('')}`,
  )),
  bg('plus-signs', 'Plus Signs', 'Patterns', 'Scattered plus marks on cream.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#FFFBEB"/>${Array.from({ length: 10 }, (_, i) => Array.from({ length: 5 }, (_, j) => `<path d="M${16 + i * 32} ${10 + j * 32} v12 M${10 + i * 32} ${16 + j * 32} h12" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>`).join('')).join('')}`,
  )),
  bg('triangles', 'Triangles', 'Patterns', 'Playful triangle field.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#ECFDF5"/>${Array.from({ length: 8 }, (_, i) => Array.from({ length: 4 }, (_, j) => `<polygon points="${16 + i * 40},${12 + j * 44} ${30 + i * 40},${36 + j * 44} ${2 + i * 40},${36 + j * 44}" fill="#6EE7B7" opacity="0.7"/>`).join('')).join('')}`,
  )),
  // ---- Grain & Dust (4) ----
  bg('film-dust', 'Film Dust', 'Grain & Dust', 'Warm dark field with dust specks.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#292524"/>${Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 47) % W}" cy="${(i * 89) % H}" r="${1 + (i % 2)}" fill="#FFFFFF" opacity="${(0.1 + ((i * 13) % 10) / 40).toFixed(2)}"/>`).join('')}`,
  )),
  bg('paper-grain', 'Paper Grain', 'Grain & Dust', 'Cream paper with fine grain.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#FAF7F2"/>${Array.from({ length: 80 }, (_, i) => `<circle cx="${(i * 53) % W}" cy="${(i * 97) % H}" r="1" fill="#78716C" opacity="0.15"/>`).join('')}`,
  )),
  bg('night-static', 'Night Static', 'Grain & Dust', 'Near-black with faint static.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#09090B"/>${Array.from({ length: 90 }, (_, i) => `<circle cx="${(i * 41) % W}" cy="${(i * 83) % H}" r="1" fill="#FFFFFF" opacity="${(0.05 + ((i * 7) % 10) / 50).toFixed(2)}"/>`).join('')}`,
  )),
  bg('chalkboard', 'Chalkboard', 'Grain & Dust', 'Dark green board with chalk dust.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#14532D"/>${Array.from({ length: 50 }, (_, i) => `<circle cx="${(i * 59) % W}" cy="${(i * 71) % H}" r="1" fill="#FFFFFF" opacity="0.12"/>`).join('')}`,
  )),
  // ---- Frames (6) ----
  bg('thin-frame', 'Thin Frame', 'Frames', 'Dark field, thin white border.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#18181B"/><rect x="10" y="10" width="300" height="160" fill="none" stroke="#FFFFFF" stroke-width="2"/>`,
  )),
  bg('double-frame', 'Double Frame', 'Frames', 'Violet field, double border.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#7C3AED"/><rect x="12" y="12" width="296" height="156" fill="none" stroke="#FFFFFF" stroke-width="2"/><rect x="20" y="20" width="280" height="140" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.7"/>`,
  )),
  bg('gold-frame', 'Gold Frame', 'Frames', 'Warm field, gold border.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#78350F"/><rect x="14" y="14" width="292" height="152" fill="none" stroke="#FBBF24" stroke-width="3"/>`,
  )),
  bg('rounded-frame', 'Rounded Frame', 'Frames', 'Teal field, rounded corners.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#0F766E"/><rect x="14" y="14" width="292" height="152" rx="18" fill="none" stroke="#CCFBF1" stroke-width="2"/>`,
  )),
  bg('corner-marks', 'Corner Marks', 'Frames', 'Dark field with corner ticks.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#111827"/>` +
    `<path d="M12 32 V12 H32 M288 12 H308 V32 M308 148 V168 H288 M32 168 H12 V148" fill="none" stroke="#F9FAFB" stroke-width="3" stroke-linecap="round"/>`,
  )),
  bg('polaroid-frame', 'Polaroid Frame', 'Frames', 'White polaroid-style frame.', svgWrap(
    `<rect width="${W}" height="${H}" fill="#F8FAFC"/><rect x="24" y="16" width="272" height="128" fill="#18181B"/><rect x="24" y="144" width="272" height="20" fill="#FFFFFF"/>`,
  )),
];

export function backgroundDef(id: string): BackgroundDef | undefined {
  return BACKGROUND_CATALOG.find((b) => b.id === id);
}

export function backgroundsByCategory(category: BackgroundCategory): BackgroundDef[] {
  return BACKGROUND_CATALOG.filter((b) => b.category === category);
}

export function searchBackgrounds(query: string): BackgroundDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return BACKGROUND_CATALOG;
  return BACKGROUND_CATALOG.filter((b) => b.name.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
}

/** Small preview thumbnail (data URL) for a background. */
export function backgroundThumbnail(def: BackgroundDef): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(def.svg)}`;
}
