#!/usr/bin/env node
/**
 * W4 self-audit #2: per-category tile counts via the tiles' own
 * aria-labels (Apply / Apply filter / Apply transition).
 * Run: node audit/capcut-fix/v102/w4/probe-subnav2.mjs
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'w4');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

const tabBtn = (page, n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();

async function dismissDialogs(page) {
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(400); }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  const R = {};
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await dismissDialogs(page);
  await page.getByText('Sunset Coast').first().click();
  await page.waitForTimeout(1000);

  const CATS = {
    Effects: ['Favorites', 'Trending', 'Sale', 'Classic', 'Cutout', 'NEW', 'Hits', 'Pro', 'Clone', 'Glowing lines', 'Stroke'],
    Filters: ['Favorites', 'Featured', 'NEW', 'Hits', 'Life', 'Landscape', 'Portrait', 'Mono', 'Enhance', '4K', 'HD Upscale', 'Quality Restoration', 'Night-view Color', 'HD Cam 2', 'HD Pet'],
    Transitions: ['Favorites', 'Trending', 'Classic', 'NEW', 'Hits', 'Pals', 'Overlay', 'Light'],
    Stickers: ['Favorites', 'Trending', 'Sale', 'Classic', 'NEW', 'Animal Meme', 'Squad', 'Shapes'],
  };
  for (const [tab, cats] of Object.entries(CATS)) {
    await tabBtn(page, tab).click();
    await page.waitForTimeout(700);
    R[tab] = {};
    for (const name of cats) {
      try {
        await page.locator('button', { hasText: name }).first().click({ timeout: 5000 });
        await page.waitForTimeout(450);
        const tiles = await page.evaluate(() => {
          const btns = [...document.querySelectorAll('button[aria-label^="Apply"]')].map((b) => b.getAttribute('aria-label'));
          const text = document.querySelector('div[role="tabpanel"], main')?.innerText ?? '';
          const empty = /No .* yet|No .* here|nothing here|No items/i.exec(text)?.[0] ?? null;
          return { count: btns.length, first: btns.slice(0, 3), empty };
        });
        R[tab][name] = tiles;
      } catch (e) {
        R[tab][name] = { error: String(e).slice(0, 120) };
      }
    }
  }
  R.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'subnav2.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
