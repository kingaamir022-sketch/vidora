#!/usr/bin/env node
/**
 * v1.0.2 Worker 1 AFTER measure (2026-11-25). Verifies D1/D2/D7/D9 at
 * 1920x1080 AND 1280x800: geometry (left/preview/details widths),
 * tab rail visible tabs, preview header constant, no upload overlay,
 * no cloud icon, no "…" menu, no keyboard button, plain play button,
 * bottom bar + floating toolbar inside the preview at both widths,
 * Menu → Shortcuts / Feature usage / Settings still work.
 * Run: node audit/capcut-fix/v102/w1/measure-w1.mjs (dev server :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'w1');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

async function measureAt(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  const out = { viewport: `${width}x${height}` };
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  // First-run dialogs: Terms, then Updates notice (the latter can
  // appear a beat after Agree, so poll until no dialog remains).
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(1200); }
  for (let i = 0; i < 5; i++) {
    const ok = page.getByRole('button', { name: 'OK', exact: true });
    if (await ok.count()) { await ok.first().click(); await page.waitForTimeout(600); continue; }
    if (await page.locator('[role="dialog"]').count() === 0) break;
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: 'Create project' }).first().click();
  await page.waitForTimeout(900);

  out.geometry = await page.evaluate(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const rail = document.querySelector('div[role="tablist"][aria-label="Editor tools"]');
    return {
      topbar: r(document.querySelector('header')),
      leftColumn: r(rail?.parentElement),
      preview: r(document.querySelector('section[aria-label="Preview"]')),
      details: r(document.querySelector('aside[aria-label="Details"], aside[aria-label="Properties"]')),
      timeline: r(document.querySelector('section[aria-label="Timeline"]')),
      tabRail: r(rail),
    };
  });
  out.tabs = await page.evaluate(() => {
    const rail = document.querySelector('div[role="tablist"][aria-label="Editor tools"]');
    if (!rail) return null;
    const rr = rail.getBoundingClientRect();
    const tabs = [...rail.querySelectorAll('button[role="tab"]')];
    const fullyVisible = tabs.filter((b) => { const bR = b.getBoundingClientRect(); return bR.left >= rr.left && bR.right <= rr.right; }).map((b) => b.textContent?.trim());
    const widths = tabs.slice(0, 3).map((b) => Math.round(b.getBoundingClientRect().width));
    const scrollRight = rail.querySelector('button[aria-label="Scroll tabs right"]');
    return { fullyVisible, tabWidths: widths, canScrollRight: scrollRight ? !scrollRight.disabled : null };
  });
  out.previewHeader = await page.evaluate(() => document.querySelector('section[aria-label="Preview"] span.truncate')?.textContent?.trim() ?? null);
  out.uploadOverlayGone = await page.evaluate(() => ![...document.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Click to upload'));
  out.hiddenFileInputKept = await page.evaluate(() => !!document.querySelector('section[aria-label="Preview"] input[type="file"]'));
  out.cloudIconGone = await page.evaluate(() => !document.querySelector('header [aria-label="All changes saved"], header [aria-label="Saving"]'));
  out.moreMenuGone = await page.evaluate(() => ![...document.querySelectorAll('header button')].some((b) => b.getAttribute('title') === 'More options'));
  out.keyboardButtonGone = await page.evaluate(() => !document.querySelector('button[aria-label="Keyboard shortcuts"]'));
  out.playButton = await page.evaluate(() => {
    const b = document.querySelector('section[aria-label="Preview"] button[aria-label="Play"], section[aria-label="Preview"] button[aria-label="Pause"]');
    if (!b) return null;
    const cs = getComputedStyle(b);
    return { bg: cs.backgroundColor, borderRadius: cs.borderRadius, color: cs.color };
  });
  out.bottomBar = await page.evaluate(() => {
    const preview = document.querySelector('section[aria-label="Preview"]');
    const pr = preview.getBoundingClientRect();
    const btn = (label) => [...preview.querySelectorAll('button')].find((b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label);
    const tc = preview.querySelector('span[aria-label="Timecode"]');
    const order = ['Timecode', 'Play', 'Full', 'Ratio'].map((l) => {
      const el = l === 'Timecode' ? tc : btn(l);
      return el ? Math.round(el.getBoundingClientRect().x) : null;
    });
    const ratio = btn('Ratio');
    const fs = btn('Fullscreen preview');
    const rr = ratio?.getBoundingClientRect();
    const fr = fs?.getBoundingClientRect();
    return {
      previewRight: Math.round(pr.right),
      ratioRight: rr ? Math.round(rr.right) : null,
      ratioInsidePreview: rr ? rr.right <= pr.right + 1 : null,
      fullscreenRight: fr ? Math.round(fr.right) : null,
      fullscreenInsidePreview: fr ? fr.right <= pr.right + 1 : null,
      orderX: order,
      orderOk: order.every((x, i, a) => i === 0 || (x !== null && a[i - 1] !== null && x > a[i - 1])),
      timecodeSingleLine: tc ? tc.getBoundingClientRect().height <= 20 : null,
    };
  });
  out.topBarOrder = await page.evaluate(() => {
    const h = document.querySelector('header');
    const xs = [...h.querySelectorAll('button, span')].map((el) => ({ t: (el.textContent ?? '').trim().slice(0, 20), x: Math.round(el.getBoundingClientRect().x) }));
    return xs.filter((e) => e.t).slice(0, 12);
  });
  await page.screenshot({ path: path.join(OUT, `w1-editor-${width}x${height}.png`) });

  // Floating clip toolbar: add a text clip, select it on the timeline.
  try {
    const tabBtn = (n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();
    await tabBtn('Text').click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Add heading', exact: true }).click();
    await page.waitForTimeout(600);
    await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
    await page.waitForTimeout(500);
    out.floatingToolbar = await page.evaluate(() => {
      const preview = document.querySelector('section[aria-label="Preview"]');
      const pr = preview.getBoundingClientRect();
      // The toolbar itself is the absolutely-positioned pill (top-2,
      // left-1/2); match it directly, not an ancestor that merely
      // contains its text.
      const bar = [...preview.querySelectorAll('div.absolute.top-2')].find((d) => d.textContent?.includes('Auto reframe'));
      if (!bar) return { found: false };
      const r = bar.getBoundingClientRect();
      return { found: true, left: Math.round(r.left), right: Math.round(r.right), previewLeft: Math.round(pr.left), previewRight: Math.round(pr.right), insidePreview: r.left >= pr.left - 1 && r.right <= pr.right + 1, height: Math.round(r.height) };
    });
    await page.screenshot({ path: path.join(OUT, `w1-toolbar-${width}x${height}.png`) });
  } catch (e) {
    out.floatingToolbar = { error: String(e).slice(0, 200) };
  }

  // Menu → Shortcuts / Feature usage / Settings still reachable.
  const menuCheck = async (item, dialogSel) => {
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.waitForTimeout(300);
    await page.getByRole('menuitem', { name: item }).click();
    await page.waitForTimeout(400);
    const visible = await page.locator(dialogSel).isVisible().catch(() => false);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    return visible;
  };
  out.menuShortcutsOpens = await menuCheck('Shortcuts', '[role="dialog"][aria-label="Keyboard shortcuts"]');
  out.menuFeatureUsageOpens = await menuCheck('Feature usage', '[role="dialog"][aria-label="Feature usage"]');
  out.menuSettingsOpens = await menuCheck('Settings', '[role="dialog"][aria-labelledby="settings-heading"]');
  out.pageErrors = errors;
  await page.close();
  return out;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const results = [];
  for (const [w, h] of [[1920, 1080], [1280, 800]]) {
    try {
      const r = await measureAt(browser, w, h);
      results.push(r);
      console.log(JSON.stringify(r, null, 2));
    } catch (e) {
      // Another worker may save a mid-edit file while this pass runs
      // (Vite HMR reload / broken compile) — record and retry once.
      console.log(`PASS ${w}x${h} FAILED, retrying once:`, String(e).slice(0, 200));
      try {
        const r = await measureAt(browser, w, h);
        results.push(r);
        console.log(JSON.stringify(r, null, 2));
      } catch (e2) {
        results.push({ viewport: `${w}x${h}`, error: String(e2).slice(0, 300) });
        console.log('RETRY FAILED:', String(e2).slice(0, 300));
      }
    }
  }
  await fs.writeFile(path.join(OUT, 'geometry-after.json'), JSON.stringify(results, null, 2));
  await browser.close();
  console.log('W1 measure done in', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
