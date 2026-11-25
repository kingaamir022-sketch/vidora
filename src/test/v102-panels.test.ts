import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { detailsAspectLabel, projectHasClips } from '../components/PropertiesPanel';
import type { VidoraProject } from '../schema/project';

const readSrc = (name: string) =>
  readFileSync(new URL(`../components/${name}`, import.meta.url), 'utf8');

const projectWith = (clipCount: number): VidoraProject =>
  ({
    tracks: [
      { clips: Array.from({ length: clipCount }, (_, i) => ({ id: `clip-${i}` })) },
    ],
  }) as unknown as VidoraProject;

describe('v1.0.2 D5 — Details panel rules (CapCut v05/v06, #19/#04)', () => {
  it('shows the Color space row only when the project has >= 1 clip', () => {
    expect(projectHasClips(null)).toBe(false);
    expect(projectHasClips(undefined)).toBe(false);
    expect(projectHasClips({ tracks: [] } as unknown as VidoraProject)).toBe(false);
    expect(projectHasClips(projectWith(0))).toBe(false);
    expect(projectHasClips(projectWith(1))).toBe(true);
    expect(projectHasClips(projectWith(3))).toBe(true);
    // The row itself must be conditional in the source, not always rendered.
    const src = readSrc('PropertiesPanel.tsx');
    expect(src).toContain('{hasClips && (');
    expect(src).toContain('Color space');
  });

  it('shows "Original" for the default 16:9 ratio, raw value otherwise', () => {
    expect(detailsAspectLabel('16:9')).toBe('Original');
    expect(detailsAspectLabel('9:16')).toBe('9:16');
    expect(detailsAspectLabel('1:1')).toBe('1:1');
    expect(detailsAspectLabel('custom')).toBe('Custom');
  });

  it('Arrange layers is plain text, not a toggle switch', () => {
    const src = readSrc('PropertiesPanel.tsx');
    expect(src).toContain("arrangeLayers ? 'Turned on' : 'Turned off'");
    expect(src).not.toContain('aria-label="Arrange layers"');
    expect(src).not.toContain('setArrangeLayers');
  });

  it('has no Proxy note line', () => {
    expect(readSrc('PropertiesPanel.tsx')).not.toContain('Proxy files are not created in this build.');
  });

  it('Resolution shows just "Adapted"', () => {
    const src = readSrc('PropertiesPanel.tsx');
    expect(src).toContain('<dd>Adapted</dd>');
    expect(src).not.toContain('Adapted ({project');
  });

  it('Modify button is gray, not teal', () => {
    const src = readSrc('PropertiesPanel.tsx');
    // The Details Modify button (onClick={openModify}) carries the gray class…
    const idx = src.indexOf('onClick={openModify}');
    expect(idx).toBeGreaterThan(-1);
    expect(src.slice(Math.max(0, idx - 120), idx + 120)).toContain('bg-[#3D3D3D]');
    // …and no teal inline style in that button.
    expect(src.slice(Math.max(0, idx - 120), idx + 120)).not.toContain('backgroundColor: TEAL');
  });
});

describe('v1.0.2 D1 — Details / inspector width cap', () => {
  it('both asides shrink below 520px on narrow viewports', () => {
    const src = readSrc('PropertiesPanel.tsx');
    const caps = src.match(/w-\[min\(520px,28vw\)\]/g) ?? [];
    expect(caps.length).toBe(2); // Details aside + clip inspector aside
    expect(src).not.toContain('w-[520px]');
  });
});

describe('v1.0.2 D3 — Import box (CapCut exact form)', () => {
  it('is one clickable box: small teal + circle with Import inline, no Browse files button', () => {
    const src = readSrc('MediaBrowser.tsx');
    expect(src).toContain('h-7 w-7');
    expect(src).toContain('rounded-full bg-[#00D9D9]');
    expect(src).toContain('Drag and drop videos, photos, and audio files here');
    expect(src).not.toContain('Browse files');
  });
});

describe('v1.0.2 D12.4 — inspector rows never overflow their column', () => {
  it('Blend section and its rows are min-w-0 / truncated', () => {
    const src = readSrc('PropertiesPanel.tsx');
    expect(src).toContain('min-w-0 space-y-2 border-t pt-3');
    expect(src).toContain('flex min-w-0 items-center justify-between gap-2 text-xs');
    expect(src).toContain('flex min-w-0 items-center gap-2 text-xs');
    expect(src).toContain('mt-0.5 truncate text-[11px]');
  });
});
