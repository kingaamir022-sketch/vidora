/**
 * v1.0.7 responsive auto-fit tests (user: "har screen par thek nazer ay
 * auto" — no manual zoom). Pins the fluid-layout rules:
 * - 1920x1080/100% stays EXACTLY CapCut (left 610, Details 520, tabs
 *   80px, sub-nav 185px, content 400px, timeline 288px).
 * - Narrower viewports shrink fluidly via clamp()/vw, panel card grids
 *   collapse to one column when the content column is narrow, the
 *   active tab scrolls into view, and dialogs cap at viewport size.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (p: string) => readFileSync(path.join(process.cwd(), p), 'utf8');

describe('v1.0.7 auto-fit: 1920x1080 stays exactly CapCut', () => {
  it('left column is still min(610px,32vw) — 610px exact at 1920', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('w-[min(610px,32vw)]');
  });

  it('Details panel is still min(520px,28vw) — 520px exact at 1920', () => {
    const props = read('src/components/PropertiesPanel.tsx');
    expect(props).toContain('w-[min(520px,28vw)]');
  });

  it('timeline is 288px at 1080 height and shrinks on short screens', () => {
    const tl = read('src/components/TimelineShell.tsx');
    expect(tl).toContain('clamp(200px,26.7vh,288px)');
  });
});

describe('v1.0.7 auto-fit: tab rail fits more tabs on narrow screens', () => {
  it('tab buttons are fluid clamp(60px,5vw,80px) — 80px exact at 1920, 64px at 1280 CSS px so 6 tabs show', () => {
    const tabs = read('src/components/LeftTabs.tsx');
    expect(tabs).toContain('clamp(60px,5vw,80px)');
    expect(tabs).not.toContain('w-[80px]');
  });

  it('the active tab scrolls itself into view so it is never hidden off-screen', () => {
    const tabs = read('src/components/LeftTabs.tsx');
    // v1.0.8 (BUG-CF-043): the old nearest-scroll could land mid-tab
    // and clip the neighbour's label (the 1366 Templates case: it
    // stopped 21px short once the left chevron shrank the viewport),
    // so the active tab is now revealed with a tab-aligned scrollTo
    // (revealTargetRight) instead. The rule is unchanged — the active
    // tab must always be fully visible — only the mechanism changed.
    expect(tabs).toContain('activeTab');
    expect(tabs).toContain('revealTargetRight');
    expect(tabs).toContain('scrollTo');
    expect(tabs).not.toContain('scrollIntoView');
  });

  it('tab labels shrink below 1440px viewports so they fit the narrower buttons', () => {
    const tabs = read('src/components/LeftTabs.tsx');
    expect(tabs).toContain('min-[1440px]:text-[11px]');
  });
});

describe('v1.0.7 auto-fit: panel columns shrink fluidly', () => {
  it('sub-nav is fluid clamp(120px,10vw,185px) — 185px exact at 1920', () => {
    const shell = read('src/components/PanelShell.tsx');
    expect(shell).toContain('clamp(120px,10vw,185px)');
    expect(shell).not.toContain('w-[185px]');
  });

  it('panel content is a container so narrow grids can collapse', () => {
    const shell = read('src/components/PanelShell.tsx');
    expect(shell).toContain('panel-content');
    const css = read('src/index.css');
    expect(css).toContain('panel-content');
    expect(css).toContain('container-type: inline-size');
  });

  it('two-column card grids collapse to one column when the panel content is narrow', () => {
    const css = read('src/index.css');
    expect(css).toContain('@container');
    expect(css).toContain('max-width: 240px');
    expect(css).toContain('[class*="grid-cols-2"]');
    expect(css).toContain('[class*="grid-cols-[repeat(2"]');
    expect(css).toContain('grid-template-columns: repeat(1, minmax(0, 1fr))');
  });
});

describe('v1.0.7 auto-fit: floating panels and dialogs cap at viewport size', () => {
  it('AI tools overlay is fluid — never past the left edge on narrow screens', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('clamp(16px,28vw,540px)');
    expect(app).toContain('min(480px,calc(100vw-32px))');
  });

  it('Shortcuts and Feature-usage dialogs cap at 85vh with their own scroll (Export already scrolls in its overlay)', () => {
    expect(read('src/components/ShortcutsPanel.tsx')).toContain('max-h-[85vh]');
    expect(read('src/components/FeatureUsageDialog.tsx')).toContain('max-h-[85vh]');
    expect(read('src/components/ExportPanel.tsx')).toContain('overflow-y-auto');
  });

  it('dashboard sidebar is fluid clamp(232px,22vw,290px) — 290px exact at 1920', () => {
    const dash = read('src/components/Dashboard.tsx');
    expect(dash).toContain('clamp(232px,22vw,290px)');
    expect(dash).not.toContain('w-[290px]');
  });
});
