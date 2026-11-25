#!/usr/bin/env node
/**
 * W4 self-audit #4: Effects category tile counts WITH a clip selected
 * (closes the loop after the no-clip gating fix).
 * Run: node audit/capcut-fix/v102/w4/probe-effects-cats.mjs
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
  await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
  await page.waitForTimeout(400);
  await tabBtn(page, 'Effects').click();
  await page.waitForTimeout(800);
  for (const name of ['Favorites', 'Trending', 'Sale', 'Classic', 'Cutout', 'NEW', 'Hits', 'Pro', 'Clone', 'Glowing lines', 'Stroke']) {
    await page.locator('button', { hasText: name }).first().click();
    await page.waitForTimeout(450);
    R[name] = await page.evaluate(() => {
      const apply = [...document.querySelectorAll('button[aria-label^="Apply"]')].map((b) => b.getAttribute('aria-label'));
      const empty = document.body.innerText.includes('No effects match');
      return { count: apply.length, first: apply.slice(0, 3), empty };
    });
  }
  R.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'effects-cats.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
