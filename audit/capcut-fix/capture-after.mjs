#!/usr/bin/env node
/**
 * CapCut-fix round — AFTER capture (2026-11-25, v1.0.1).
 * Screenshots the CORRECTED Vidora at 1920x1080 into
 * audit/capcut-fix/after/ so each screen can be compared with the
 * matching CapCut desktop screenshot in docs/reference/capcut/ and
 * the frames in docs/reference/capcut/videos-2026-11-25/.
 * Run: node audit/capcut-fix/capture-after.mjs   (dev server on :5199)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'after');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5199/';

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => { errors.push(String(e).slice(0, 200)); console.log('PAGEERROR:', String(e).slice(0, 200)); });
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text().slice(0, 200)); });
  const shot = (name) => page.screenshot({ path: path.join(OUT, name) });
  const tabBtn = (name) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: name }).first();

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  // First-run dialogs: Terms, then Updates notice.
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(500); }
  await shot('dashboard.png');

  // New empty project.
  await page.getByRole('button', { name: 'Create project' }).first().click();
  await page.waitForTimeout(900);
  await shot('editor-media.png');
  await shot('timeline-empty.png');

  // Every tab.
  const tabs = ['Audio', 'Text', 'Stickers', 'Effects', 'Transitions', 'Captions', 'Filters', 'Adjustment', 'Templates', 'AI avatar'];
  for (const tab of tabs) {
    await tabBtn(tab).click();
    await page.waitForTimeout(500);
    await shot('editor-' + tab.toLowerCase().replace(/ /g, '-') + '.png');
  }

  // Text clip inspector: Add heading, select it on the timeline.
  await tabBtn('Text').click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Add heading', exact: true }).click();
  await page.waitForTimeout(600);
  await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
  await page.waitForTimeout(500);
  await shot('editor-inspector-text.png');
  // Animation + Speed sub-panels (rail buttons: aria-label or visible text).
  const railBtn = (name) => page.locator(`aside[aria-label="Properties"] button[aria-label="${name}"], aside[aria-label="Properties"] button:has-text("${name}")`).first();
  await railBtn('Animation').click();
  await page.waitForTimeout(400);
  await shot('editor-inspector-animation.png');
  await railBtn('Speed').click();
  await page.waitForTimeout(400);
  await shot('editor-inspector-speed.png');

  // Back to dashboard, open the sample project (video clip on timeline).
  await page.getByRole('button', { name: 'Back to dashboard' }).click();
  await page.waitForTimeout(800);
  await page.getByText('Sunset Coast').first().click();
  await page.waitForTimeout(900);
  await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
  await page.waitForTimeout(500);
  await shot('editor-inspector-video.png');
  // Deselect via the rail X -> Details panel.
  const closeRail = page.locator('aside[aria-label="Properties"] button[aria-label="Close inspector"], aside[aria-label="Properties"] button[title="Close"]');
  if (await closeRail.count()) { await closeRail.first().click(); await page.waitForTimeout(400); }
  await shot('editor-details.png');

  // Export menu -> Download settings panel.
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByRole('menuitem', { name: 'Download' }).first().click();
  await page.waitForTimeout(500);
  await shot('export-download.png');
  // Esc closes the Export MENU first, then the panel (App.tsx handles
  // one layer per keypress) — press twice.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Shortcuts dialog (v1.0.2 D9: keyboard icon REMOVED — Menu → Shortcuts).
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('menuitem', { name: 'Shortcuts' }).click();
  await page.waitForTimeout(400);
  await shot('shortcuts-dialog.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Settings dialog (v1.0.2 D7: "…" menu REMOVED — Menu → Settings).
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await page.waitForTimeout(400);
  await shot('settings-dialog.png');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Geometry measurements.
  const geom = await page.evaluate(() => {
    const q = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    return {
      topbar: q('header'),
      tabRail: q('div[role="tablist"][aria-label="Editor tools"]'),
      // v1.0.2 D1: left column is min(610px,32vw) — measure it via the
      // tab rail's parent, not the old fixed-width class.
      leftColumn: (() => { const rail = document.querySelector('div[role="tablist"][aria-label="Editor tools"]'); const p = rail?.parentElement; if (!p) return null; const r = p.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
      properties: q('aside[aria-label="Properties"], aside[aria-label="Details"]'),
      timeline: q('section[aria-label="Timeline"]'),
      preview: q('section[aria-label="Preview"]'),
    };
  });
  await fs.writeFile(path.join(OUT, 'geometry.json'), JSON.stringify(geom, null, 2));
  await fs.writeFile(path.join(OUT, 'pageerrors.json'), JSON.stringify(errors, null, 2));
  console.log(JSON.stringify(geom, null, 2));
  console.log('page errors:', errors.length);
  await browser.close();
  console.log('AFTER capture done in', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
