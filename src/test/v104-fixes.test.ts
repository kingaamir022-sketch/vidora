/**
 * v1.0.4 regression tests — preview tools, export, ratio, desktop tiles.
 * Behaviour is verified end-to-end by audit/capcut-fix/v104/verify.mjs
 * (Playwright, 1920x1080/100%, 0 page errors); these tests pin the
 * code shapes the fixes depend on so a later edit cannot silently
 * re-introduce them.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('v1.0.4 preview / ratio fixes', () => {
  it('BUG-CF-029: Ratio menu is a direct child of the preview section, not inside the overflow-hidden bottom-bar group', () => {
    const preview = read('src/components/PreviewArea.tsx');
    expect(preview).toContain('absolute right-3 bottom-14 z-40');
    expect(preview).toContain('BUG-CF-029');
  });

  it('BUG-CF-030: fitted preview box is computed from container size + ratio (keeps 1:1 square)', () => {
    const preview = read('src/components/PreviewArea.tsx');
    expect(preview).toContain('fitSize');
    expect(preview).toContain('ResizeObserver');
    expect(preview).toContain('ratioValue');
    expect(preview).toContain('BUG-CF-030');
  });

  it('BUG-CF-031: autosave flushes on beforeunload/pagehide so a change is not lost on a quick reload', () => {
    const store = read('src/store/projectStore.ts');
    expect(store).toContain("addEventListener('beforeunload', flush)");
    expect(store).toContain("addEventListener('pagehide', flush)");
    expect(store).toContain('BUG-CF-031');
  });

  it('BUG-CF-032: Full (cover) measures the canvas, not the bordered wrapper', () => {
    const preview = read('src/components/PreviewArea.tsx');
    expect(preview).toContain('BUG-CF-032');
    expect(preview).toContain('canvasRef.current');
    expect(preview).toContain('availW / baseW');
  });

  it('desktop tiles: Effects / Filters / Transitions grids are 2 columns of 130px photo thumbs', () => {
    for (const panel of ['src/components/EffectsPanel.tsx', 'src/components/FiltersPanel.tsx', 'src/components/TransitionsPanel.tsx']) {
      const src = read(panel);
      expect(src).toContain('repeat(2,minmax(0,130px))');
    }
  });

  it('desktop evidence: no floating pill, no CC button in the preview', () => {
    const preview = read('src/components/PreviewArea.tsx');
    // ('Edit with AI' survives only in the header comment that records
    // where the function moved to — the pill JSX itself is gone.)
    expect(preview).not.toContain('clipMenuOpen');
    expect(preview).not.toContain('clipMenuItem');
    expect(preview).not.toContain('IconCC');
  });
});
