#!/usr/bin/env node
/**
 * CapCut-fix round — HOME capture (2026-11-25).
 * Screenshots the rebuilt Vidora dashboard/home at 1920x1080 into
 * audit/capcut-fix/home/ : dashboard, templates, template popup,
 * library, spaces (+ terms/updates dialogs, video studio wiring check).
 * Run: node audit/capcut-fix/home/capture-home.mjs   (preview build on :5198 — dev server is being churned by concurrent agents; see report)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'home');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5198/';

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLE-ERROR:', String(m.text()).slice(0, 300));
  });
  page.on('response', (r) => {
    if (r.status() >= 500) console.log('HTTP-500:', r.url().slice(0, 160));
  });
  const shot = (name) => page.screenshot({ path: path.join(OUT, name) });

  const clickNav = async (name) => {
    // Sidebar buttons carry a glyph icon before the label, so the accessible
    // name is e.g. "▦ Templates" — substring match, not exact.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await page.getByRole('button', { name }).first().click({ timeout: 8000 });
        await page.waitForTimeout(600);
        return;
      } catch (e) {
        console.log(`nav retry ${attempt + 1} for ${name}:`, String(e).split('\n')[0].slice(0, 120));
        await page.waitForTimeout(1500);
      }
    }
    throw new Error(`Could not click nav ${name}`);
  };

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // The old onboarding tour (App.tsx, removed by the parent later) renders
  // on top of everything — dismiss it FIRST, before the Terms dialog.
  const skip = page.getByRole('button', { name: /Skip tour/i });
  if (await skip.count()) {
    await skip.first().click();
    await page.waitForTimeout(400);
  }

  // Terms dialog (first run).
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) {
    await shot('terms.png');
    await agree.click();
    await page.waitForTimeout(500);
  }
  // Updates dialog.
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) {
    await shot('updates.png');
    await okBtn.click();
    await page.waitForTimeout(500);
  }
  // Tour may re-appear after the dialogs.
  const skip2 = page.getByRole('button', { name: /Skip tour/i });
  if (await skip2.count()) {
    await skip2.first().click();
    await page.waitForTimeout(400);
  }

  await shot('dashboard.png');

  // Templates page.
  await clickNav('Templates');
  await shot('templates.png');

  // Preview popup on the first template card.
  await page.locator('[aria-label^="Preview template"]').first().click();
  await page.waitForTimeout(500);
  await shot('template-popup.png');
  // Close via overlay click (top-left corner of the backdrop).
  await page.mouse.click(60, 500);
  await page.waitForTimeout(400);

  // Library page.
  await clickNav('Library');
  await shot('library.png');

  // Spaces page.
  await clickNav('Spaces');
  await page.waitForTimeout(400);
  await shot('spaces.png');

  // Video Studio wiring check (AIStudios).
  await clickNav('Video Studio');
  await page.waitForTimeout(400);
  await shot('video-studio.png');

  await browser.close();
  console.log('HOME capture done in', OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
