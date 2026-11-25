#!/usr/bin/env node
/**
 * W4 self-audit: screenshot every editor tab + dashboard + export at 1920.
 * Run: node audit/capcut-fix/v102/w4/probe-audit.mjs
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'w4', 'audit');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  const out = { errors, tabs: {} };
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(400); }
  await page.screenshot({ path: path.join(OUT, 'audit-dashboard.png') });
  await page.getByText('Sunset Coast').first().click();
  await page.waitForTimeout(1000);
  await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
  await page.waitForTimeout(400);

  const tabs = ['Media', 'Audio', 'Text', 'Stickers', 'Effects', 'Transitions', 'Captions', 'Filters', 'Adjustment', 'Templates', 'AI avatar'];
  for (const t of tabs) {
    const btn = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: t }).first();
    if (!(await btn.count())) { out.tabs[t] = 'tab not found'; continue; }
    await btn.click();
    await page.waitForTimeout(900);
    const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await page.screenshot({ path: path.join(OUT, `audit-${slug}.png`) });
    out.tabs[t] = 'shot';
  }
  // Export panel.
  const exp = page.getByRole('button', { name: 'Export' }).first();
  if (await exp.count()) {
    await exp.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, 'audit-export.png') });
    out.tabs.Export = 'shot';
  } else {
    out.tabs.Export = 'button not found';
  }
  await fs.writeFile(path.join(OUT, 'audit.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
