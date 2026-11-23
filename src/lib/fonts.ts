/**
 * Open-license font catalog (Phase 5, SPEC N — N-FONTS).
 * 40 families, all SIL OFL 1.1 except JetBrains Mono (Apache-2.0).
 * `file` is the woff2 (latin subset, Regular 400) that `npm run build:assets`
 * downloads from the Google Fonts CSS API into `public/fonts/`.
 * The app loads them through `public/fonts/fonts.css` (@font-face rules)
 * and falls back to the system stack when a file is missing.
 * Family names are the fonts' own names; no third-party branding is used.
 */

export type FontCategory = 'Sans' | 'Serif' | 'Mono' | 'Display' | 'Handwriting';

export interface FontDef {
  category: FontCategory;
  family: string;
  fallback: string;
  file: string;
  id: string;
  license: string;
  source: string;
  /** CSS font-family stack used in the editor. */
  stack: string;
}

const G = 'https://fonts.googleapis.com/css2';

function font(id: string, family: string, category: FontCategory, fallback: string, license = 'SIL OFL 1.1'): FontDef {
  return {
    category,
    family,
    fallback,
    file: `${id}.woff2`,
    id,
    license,
    source: `${G}?family=${encodeURIComponent(family)}&display=swap`,
    stack: `'${family}', ${fallback}`,
  };
}

export const FONT_CATALOG: FontDef[] = [
  // ---- Sans (14) ----
  font('inter', 'Inter', 'Sans', 'system-ui, sans-serif'),
  font('roboto', 'Roboto', 'Sans', 'Arial, sans-serif'),
  font('open-sans', 'Open Sans', 'Sans', 'Arial, sans-serif'),
  font('lato', 'Lato', 'Sans', 'Arial, sans-serif'),
  font('montserrat', 'Montserrat', 'Sans', 'Arial, sans-serif'),
  font('poppins', 'Poppins', 'Sans', 'Arial, sans-serif'),
  font('raleway', 'Raleway', 'Sans', 'Arial, sans-serif'),
  font('nunito', 'Nunito', 'Sans', 'Arial, sans-serif'),
  font('quicksand', 'Quicksand', 'Sans', 'Arial, sans-serif'),
  font('work-sans', 'Work Sans', 'Sans', 'Arial, sans-serif'),
  font('dm-sans', 'DM Sans', 'Sans', 'Arial, sans-serif'),
  font('manrope', 'Manrope', 'Sans', 'Arial, sans-serif'),
  font('outfit', 'Outfit', 'Sans', 'Arial, sans-serif'),
  font('plus-jakarta-sans', 'Plus Jakarta Sans', 'Sans', 'Arial, sans-serif'),
  // ---- Serif (8) ----
  font('playfair-display', 'Playfair Display', 'Serif', 'Georgia, serif'),
  font('merriweather', 'Merriweather', 'Serif', 'Georgia, serif'),
  font('roboto-slab', 'Roboto Slab', 'Serif', 'Georgia, serif'),
  font('source-serif-4', 'Source Serif 4', 'Serif', 'Georgia, serif'),
  font('dm-serif-display', 'DM Serif Display', 'Serif', 'Georgia, serif'),
  font('lora', 'Lora', 'Serif', 'Georgia, serif'),
  font('bitter', 'Bitter', 'Serif', 'Georgia, serif'),
  font('noto-serif', 'Noto Serif', 'Serif', 'Georgia, serif'),
  // ---- Mono (6) ----
  font('roboto-mono', 'Roboto Mono', 'Mono', 'ui-monospace, Consolas, monospace'),
  font('jetbrains-mono', 'JetBrains Mono', 'Mono', 'ui-monospace, Consolas, monospace', 'Apache-2.0'),
  font('fira-code', 'Fira Code', 'Mono', 'ui-monospace, Consolas, monospace'),
  font('source-code-pro', 'Source Code Pro', 'Mono', 'ui-monospace, Consolas, monospace'),
  font('ibm-plex-mono', 'IBM Plex Mono', 'Mono', 'ui-monospace, Consolas, monospace'),
  font('space-mono', 'Space Mono', 'Mono', 'ui-monospace, Consolas, monospace'),
  // ---- Display (7) ----
  font('oswald', 'Oswald', 'Display', 'Arial Narrow, sans-serif'),
  font('bebas-neue', 'Bebas Neue', 'Display', 'Arial Narrow, sans-serif'),
  font('anton', 'Anton', 'Display', 'Arial Narrow, sans-serif'),
  font('archivo-black', 'Archivo Black', 'Display', 'Arial, sans-serif'),
  font('righteous', 'Righteous', 'Display', 'Arial, sans-serif'),
  font('russo-one', 'Russo One', 'Display', 'Arial, sans-serif'),
  font('orbitron', 'Orbitron', 'Display', 'Arial, sans-serif'),
  // ---- Handwriting (5) ----
  font('caveat', 'Caveat', 'Handwriting', 'cursive'),
  font('dancing-script', 'Dancing Script', 'Handwriting', 'cursive'),
  font('pacifico', 'Pacifico', 'Handwriting', 'cursive'),
  font('lobster', 'Lobster', 'Handwriting', 'cursive'),
  font('permanent-marker', 'Permanent Marker', 'Handwriting', 'cursive'),
];

export const FONT_CATEGORIES: FontCategory[] = ['Sans', 'Serif', 'Mono', 'Display', 'Handwriting'];

export function fontDef(id: string): FontDef | undefined {
  return FONT_CATALOG.find((f) => f.id === id);
}

export function fontsByCategory(category: FontCategory): FontDef[] {
  return FONT_CATALOG.filter((f) => f.category === category);
}

export function searchFonts(query: string): FontDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return FONT_CATALOG;
  return FONT_CATALOG.filter((f) => f.family.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
}

/** The Google Fonts CSS API URL for one family (latin subset, weight 400). */
export function fontCssUrl(def: FontDef): string {
  return def.source;
}
