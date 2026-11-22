import tokens from '../../design/tokens.json';

export type DesignTokens = typeof tokens;
export const designTokens: DesignTokens = tokens;

export const BRAND_GRADIENT_CSS = tokens.brand.gradient.css;
export const BRAND_VIOLET = tokens.brand.violet;
export const BRAND_CYAN = tokens.brand.cyan;

/** Theme-aware colour lookup. Phase 0 ships dark (default) + light. */
export function themeColors(theme: 'dark' | 'light') {
  return tokens.color[theme];
}
