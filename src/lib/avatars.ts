/**
 * Original avatar portraits for the AI avatar tab (CapCut-fix 2026-11-25).
 * CapCut's avatar library shows portrait photos; Vidora ships no photos,
 * so these are original stylised portrait tiles — a gradient backdrop plus
 * a simple person silhouette — generated as inline SVG data URIs (no files
 * to download, nothing copied). 24 tiles: Trending takes the first 12,
 * Marketing the last 12, Fashion model the middle 12.
 */
export interface AvatarTile {
  id: string;
  name: string;
  src: string;
}

const NAMES = [
  'Ava', 'Kai', 'Mira', 'Leo', 'Nora', 'Zain', 'Lila', 'Omar',
  'Ivy', 'Ravi', 'Sara', 'Eli', 'Maya', 'Finn', 'Zoe', 'Adam',
  'Ruby', 'Noah', 'Lena', 'Hugo', 'Aria', 'Milo', 'Eden', 'Jade',
];

/** Gradient pairs — one per avatar, all distinct. */
const PALETTES: [string, string][] = [
  ['#0EA5E9', '#7C3AED'], ['#F59E0B', '#EF4444'], ['#10B981', '#0EA5E9'],
  ['#EC4899', '#8B5CF6'], ['#F97316', '#F59E0B'], ['#06B6D4', '#3B82F6'],
  ['#84CC16', '#10B981'], ['#EF4444', '#EC4899'], ['#8B5CF6', '#EC4899'],
  ['#14B8A6', '#84CC16'], ['#F43F5E', '#F97316'], ['#6366F1', '#0EA5E9'],
  ['#22C55E', '#14B8A6'], ['#EAB308', '#22C55E'], ['#A855F7', '#6366F1'],
  ['#0D9488', '#0EA5E9'], ['#DB2777', '#F59E0B'], ['#4F46E5', '#06B6D4'],
  ['#65A30D', '#EAB308'], ['#BE185D', '#8B5CF6'], ['#0891B2', '#10B981'],
  ['#C2410C', '#DB2777'], ['#7C2D12', '#F97316'], ['#1D4ED8', '#A855F7'],
];

function avatarTileSvg(c1: string, c2: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="520" fill="url(#g)"/>` +
    `<circle cx="330" cy="70" r="90" fill="#ffffff" opacity="0.08"/>` +
    `<circle cx="55" cy="445" r="110" fill="#ffffff" opacity="0.06"/>` +
    `<circle cx="200" cy="200" r="70" fill="rgba(255,255,255,0.92)"/>` +
    `<rect x="180" y="252" width="40" height="52" rx="16" fill="rgba(255,255,255,0.92)"/>` +
    `<path d="M200 292c-85 0-145 60-145 145v83h290v-83c0-85-60-145-145-145z" fill="rgba(255,255,255,0.92)"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const AVATAR_TILES: AvatarTile[] = NAMES.map((name, i) => ({
  id: `avatar-tile-${i + 1}`,
  name,
  src: avatarTileSvg(PALETTES[i][0], PALETTES[i][1]),
}));
