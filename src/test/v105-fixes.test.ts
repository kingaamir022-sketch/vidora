/**
 * v1.0.5 regression tests — user screenshots S1 (black template cards)
 * and S2 (empty editor) checked side by side against CapCut desktop #04.
 * Behaviour is verified end-to-end by audit/capcut-fix/v105/verify.mjs
 * (Playwright, 1920x1080/100%, 0 page errors) + pixel-check.py; these
 * tests pin the code shapes the fixes depend on so a later edit cannot
 * silently re-introduce them.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('v1.0.5 template-thumb fix (S1)', () => {
  it('BUG-CF-033: TemplateThumb root must not hard-code `relative` — callers supply positioning (dashboard passes absolute inset-0, editor passes relative)', () => {
    const thumb = read('src/components/TemplateThumb.tsx');
    expect(thumb).toContain('BUG-CF-033');
    // The root div's own className must not contain `relative`; the
    // dashboard caller passes `absolute inset-0` and Tailwind's
    // `relative` would win the cascade, zero-heighting the thumb.
    expect(thumb).not.toMatch(/className=\{`relative overflow-hidden/);
    const panel = read('src/components/TemplatesPanel.tsx');
    expect(panel).toMatch(/TemplateThumb[\s\S]{0,200}?relative w-full rounded/);
    const page = read('src/components/home/TemplatesPage.tsx');
    expect(page).toContain('className="absolute inset-0"');
  });
});

describe('v1.0.5 preview fit fix (S2)', () => {
  it('BUG-CF-030 (completed): the fit size is actually computed by a ResizeObserver that calls setFitSize', () => {
    const preview = read('src/components/PreviewArea.tsx');
    expect(preview).toContain('BUG-CF-030');
    expect(preview).toContain('ResizeObserver');
    expect(preview).toContain('setFitSize');
    expect(preview).toContain('ratioNumber');
  });
});

describe('v1.0.5 tab-rail fix (S2)', () => {
  it('BUG-CF-035: chevrons render only when they can scroll (no always-rendered disabled left chevron wasting 24px)', () => {
    const tabs = read('src/components/LeftTabs.tsx');
    expect(tabs).toContain('BUG-CF-035');
    expect(tabs).toContain('canLeft &&');
    expect(tabs).toContain('canRight &&');
    expect(tabs).not.toContain('disabled={!canLeft}');
  });
});

describe('v1.0.5 Pro button + badges (S2, CapCut #04)', () => {
  it('BUG-CF-036: IconPro is the CapCut ◆ diamond, not a star', () => {
    const icons = read('src/components/icons.tsx');
    expect(icons).toContain('BUG-CF-036');
    expect(icons).toContain('M12 2 L22 12 L12 22 L2 12 Z');
    expect(icons).not.toContain('M12 3l2.5 5.5L20 9.5l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-1L12 3z');
  });

  it('BUG-CF-036: top-bar Pro button is gray-filled #4F4F4F with white text and a lavender diamond, like #04', () => {
    const topBar = read('src/components/TopBar.tsx');
    expect(topBar).toContain('BUG-CF-036');
    expect(topBar).toContain('bg-[#4F4F4F]');
    expect(topBar).toContain('text-[#A78BFA]');
  });

  it('BUG-CF-036: Pro badges on tiles read "◆ Pro" (diamond + text), like CapCut #25/#27', () => {
    const shell = read('src/components/PanelShell.tsx');
    expect(shell).toMatch(/IconPro size=\{10\} \/> Pro/);
    const avatar = read('src/components/AIAvatarPanel.tsx');
    expect(avatar).toMatch(/IconPro size=\{10\} \/> Pro/);
  });
});
