import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

/**
 * v1.0.2 shell fixes (Worker 1: D1/D2/D7/D9) — source-level guards so
 * the CapCut-exact editor shell cannot regress silently. Geometry is
 * verified live by audit/capcut-fix/v102/measure-after (w1) at
 * 1920x1080 AND 1280x800; these tests pin the code that produces it.
 */
describe('v1.0.2 editor shell (D1/D2/D7/D9)', () => {
  const app = read('src/App.tsx');
  const topBar = read('src/components/TopBar.tsx');
  const preview = read('src/components/PreviewArea.tsx');
  const leftTabs = read('src/components/LeftTabs.tsx');

  it('D1: left column is min(610px,32vw) — 610px exact at 1920, capped narrower', () => {
    expect(app).toContain('w-[min(610px,32vw)]');
    expect(app).not.toContain('w-[610px]');
  });

  it('D1: tab buttons are CapCut-width (~80px at 1920) with horizontal scroll arrows — v1.0.7 (BUG-CF-038, auto-fit): fluid clamp(60px,5vw,80px) so more tabs fit on narrow screens', () => {
    expect(leftTabs).toContain('clamp(60px,5vw,80px)');
    expect(leftTabs).toContain('Scroll tabs left');
    expect(leftTabs).toContain('Scroll tabs right');
    expect(leftTabs).toContain('overflow-x-auto');
  });

  it('D2: preview header is always the constant "Player-Timeline 01"', () => {
    expect(preview).toContain('>Player-Timeline 01<');
    expect(preview).not.toContain("{project?.name ?? 'Player-Timeline 01'}");
  });

  it('D2: no "Click to upload" overlay button; hidden file input kept for drag-drop', () => {
    expect(preview).not.toContain('onClick={() => fileInputRef.current?.click()}');
    expect(preview).not.toContain('bg-[#00D9D9] px-5 py-2');
    expect(preview).toContain('type="file"');
    expect(preview).toContain('onDrop');
  });

  it('D2: play button is a plain gray icon button — no teal filled circle', () => {
    expect(preview).not.toContain('rounded-full bg-[#00D9D9] p-2.5');
    expect(preview).toMatch(/aria-label=\{playing \? 'Pause' : 'Play'\}/);
  });

  it('D2: preview bottom bar has overflow guards (min-w-0, overflow-hidden, whitespace-nowrap)', () => {
    expect(preview).toContain('min-w-0 shrink-0 items-center justify-between gap-2 overflow-hidden');
    expect(preview).toContain('whitespace-nowrap');
  });

  // v1.0.4: the floating clip toolbar (pill) was REMOVED — desktop
  // evidence (v09 frame_010, #04/#19/#25/#27) shows no floating pill
  // around the preview; its functions live in the inspector tabs and
  // the timeline right-click menu instead (verified in Playwright).
  it('D2 (v1.0.4): no floating clip toolbar above the preview', () => {
    // ('Edit with AI' survives only in the header comment recording
    // where the function moved to — the pill JSX itself is gone.)
    expect(preview).not.toContain('max-w-[calc(100%-16px)]');
    expect(preview).not.toContain('clipMenuOpen');
    expect(preview).not.toContain('clipMenuItem');
    expect(preview).toContain('Ratio menu');
  });

  it('D7: no teal cloud icon and no "…" more menu in the top bar', () => {
    expect(topBar).not.toContain('IconCloud');
    expect(topBar).not.toContain('More options');
    expect(topBar).not.toContain('moreOpen');
  });

  it('D7: "Feature usage" moved into the Menu dropdown', () => {
    expect(topBar).toContain("label: 'Feature usage'");
    expect(topBar).toContain('onShowFeatureUsage()');
  });

  it('D7: top bar order is logo, Menu, centered name, layout icons, Pro, Share, Export', () => {
    const order = ['Back to dashboard', 'Menu', 'Project name', 'Hide sidebar', 'Pro', 'Share', 'Export'];
    let last = -1;
    for (const marker of order) {
      // Search forward from the previous marker: the header comment
      // also mentions these words, so a plain indexOf would hit it.
      const i = topBar.indexOf(marker, last + 1);
      expect(i).toBeGreaterThan(last);
      last = i;
    }
  });

  it('D9: keyboard-icon button row is gone from the left column', () => {
    expect(app).not.toContain('IconKeyboard');
    expect(app).not.toContain('aria-label="Keyboard shortcuts"');
    // Shortcuts stay reachable: TopBar Menu still offers them.
    expect(topBar).toContain("label: 'Shortcuts'");
  });

  it('D9: audit scripts open Shortcuts/Settings via Menu, not the removed buttons', () => {
    const captureAfter = read('audit/capcut-fix/capture-after.mjs');
    expect(captureAfter).not.toContain('Keyboard shortcuts');
    expect(captureAfter).not.toContain('More options');
    expect(captureAfter).toContain("getByRole('menuitem', { name: 'Shortcuts' })");
    expect(captureAfter).toContain("getByRole('menuitem', { name: 'Settings' })");
  });
});
