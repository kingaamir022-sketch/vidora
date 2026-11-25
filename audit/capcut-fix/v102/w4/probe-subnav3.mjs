#!/usr/bin/env node
/**
 * W4 self-audit #3: Effects tile count mystery + Filters Tools overlay.
 * Run: node audit/capcut-fix/v102/w4/probe-subnav3.mjs
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
  await page.waitForTimeout(1200);

  await tabBtn(page, 'Effects').click();
  await page.waitForTimeout(800);
  R.effects = await page.evaluate(() => {
    const apply = [...document.querySelectorAll('button[aria-label^="Apply"]')].map((b) => b.getAttribute('aria-label'));
    const tab = document.querySelector('div[role="tablist"][aria-label="Editor tools"] button[aria-selected="true"]')?.textContent;
    return { activeTab: tab, applyCount: apply.length, first: apply.slice(0, 4) };
  });
  await page.locator('button', { hasText: 'Trending' }).first().click();
  await page.waitForTimeout(500);
  R.effectsTrending = await page.evaluate(() => {
    const apply = [...document.querySelectorAll('button[aria-label^="Apply"]')].map((b) => b.getAttribute('aria-label'));
    return { applyCount: apply.length, first: apply.slice(0, 4) };
  });
  // Stickers: count the "+" buttons (different aria-label).
  await tabBtn(page, 'Stickers').click();
  await page.waitForTimeout(800);
  R.stickers = await page.evaluate(() => {
    const plus = [...document.querySelectorAll('button')].filter((b) => b.textContent?.trim() === '+').length;
    const fav = [...document.querySelectorAll('button')].filter((b) => /Add sticker/i.test(b.getAttribute('aria-label') ?? '')).map((b) => b.getAttribute('aria-label'));
    return { plusButtons: plus, addLabels: fav.slice(0, 3) };
  });

  // Filters Tools overlay.
  await tabBtn(page, 'Filters').click();
  await page.waitForTimeout(700);
  await page.locator('button', { hasText: 'HD Upscale' }).first().click();
  await page.waitForTimeout(700);
  R.hdUpscale = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    return { dialog: !!dlg, dialogText: dlg ? dlg.textContent?.slice(0, 200) : null };
  });
  await page.screenshot({ path: path.join(OUT, 'subnav3-hd-upscale.png') });
  // Close the overlay if present.
  const close = page.locator('[role="dialog"] button', { hasText: 'Close' }).first();
  if (await close.count()) { await close.click(); await page.waitForTimeout(400); }
  await page.locator('button', { hasText: 'Enhance' }).first().click();
  await page.waitForTimeout(700);
  R.enhance = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    return { dialog: !!dlg, dialogText: dlg ? dlg.textContent?.slice(0, 200) : null };
  });

  R.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'subnav3.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
