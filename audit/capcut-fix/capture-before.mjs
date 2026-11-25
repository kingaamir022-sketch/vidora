#!/usr/bin/env node
/**
 * CapCut-fix round — BEFORE capture (2026-11-25).
 * Screenshots the CURRENT Vidora (v1.0.0) at 1920x1080 into
 * audit/capcut-fix/before/ so each screen can be compared with the
 * matching CapCut desktop screenshot in docs/reference/capcut/.
 * Run: node audit/capcut-fix/capture-before.mjs   (dev server on :5199)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'before');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5199/';

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
  const shot = (name) => page.screenshot({ path: path.join(OUT, name) });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await shot('dashboard.png');

  // Dismiss onboarding tour if it appears on the dashboard.
  const skip = page.getByRole('button', { name: /Skip tour/i });
  if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(400); }

  await page.getByRole('button', { name: 'New Project' }).click();
  await page.waitForTimeout(800);
  // Tour may appear in the editor instead.
  const skip2 = page.getByRole('button', { name: /Skip tour/i });
  if (await skip2.count()) { await skip2.first().click(); await page.waitForTimeout(400); }
  await shot('editor-media.png');

  const tabs = ['Audio', 'Text', 'Stickers', 'Effects', 'Transitions', 'Captions', 'Filters', 'Adjustment', 'Templates', 'AI Tools'];
  for (const tab of tabs) {
    await page.locator('nav[aria-label="Editor tools"] button[title="' + tab + '"]').click();
    await page.waitForTimeout(500);
    await shot('editor-' + tab.toLowerCase().replace(/ /g, '-') + '.png');
  }

  // Inspector: add a heading text clip, select it on the timeline.
  await page.locator('nav[aria-label="Editor tools"] button[title="Text"]').click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Add heading', exact: true }).click();
  await page.waitForTimeout(600);
  await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
  await page.waitForTimeout(500);
  await shot('editor-inspector-text.png');

  // Back to Media, then dialogs.
  await page.locator('nav[aria-label="Editor tools"] button[title="Media"]').click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Export' }).click();
  await page.waitForTimeout(500);
  await shot('export-dialog.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Shortcuts/i }).click();
  await page.waitForTimeout(400);
  await shot('shortcuts-dialog.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Geometry measurements.
  const geom = await page.evaluate(() => {
    const q = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    return {
      topbar: q('header'),
      tabRail: q('nav[aria-label="Editor tools"]'),
      leftPanel: q('aside[aria-label="Media library"], aside'),
      properties: q('aside[aria-label="Properties"]'),
      timeline: q('section[aria-label="Timeline"]'),
      preview: q('main, section[aria-label="Preview"]'),
    };
  });
  await fs.writeFile(path.join(OUT, 'geometry.json'), JSON.stringify(geom, null, 2));
  console.log(JSON.stringify(geom, null, 2));
  await browser.close();
  console.log('BEFORE capture done in', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
