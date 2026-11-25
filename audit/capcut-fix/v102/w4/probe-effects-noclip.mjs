#!/usr/bin/env node
/**
 * W4 self-audit fix verify: Effects grid browsable with NO clip selected
 * (tiles present but disabled), enabled once a clip is selected, and
 * applying still works (D14/D15 regression).
 * Run: node audit/capcut-fix/v102/w4/probe-effects-noclip.mjs
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
  // No clip click here — the bug state.
  await tabBtn(page, 'Effects').click();
  await page.waitForTimeout(800);
  R.noClip = await page.evaluate(() => {
    const apply = [...document.querySelectorAll('button[aria-label^="Apply"]')];
    return {
      count: apply.length,
      disabled: apply.filter((b) => b.disabled).length,
      first: apply.slice(0, 3).map((b) => b.getAttribute('aria-label')),
      hint: document.body.innerText.includes('Select a clip on the timeline to add effects.'),
    };
  });
  await page.screenshot({ path: path.join(OUT, 'effects-noclip.png') });
  // Now select the clip: tiles must enable and apply must work.
  await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
  await page.waitForTimeout(600);
  R.withClip = await page.evaluate(() => {
    const apply = [...document.querySelectorAll('button[aria-label^="Apply"]')];
    return { count: apply.length, disabled: apply.filter((b) => b.disabled).length };
  });
  await page.locator('button[aria-label="Apply Warm Glow"]').first().click();
  await page.waitForTimeout(600);
  R.applied = await page.evaluate(() => {
    const card = document.querySelector('[aria-label="Applied effects"]');
    return { cardVisible: !!card, text: card?.textContent?.slice(0, 120) ?? null };
  });
  await page.screenshot({ path: path.join(OUT, 'effects-noclip-applied.png') });
  R.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'effects-noclip.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
