#!/usr/bin/env node
/** v1.0.2 final verify #2 (coordinator): (a) empty canvas is plain dark
 * after the renderFrame slate-text removal; (b) applied-effect card is
 * visible without scrolling after a REAL apply (Classic -> Blur). */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'final');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(500); }
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  const dismiss2 = page.getByRole('button', { name: 'OK' });
  if (await dismiss2.count()) { await dismiss2.first().click().catch(() => {}); await page.waitForTimeout(400); }

  // (a) empty canvas: sample the centre pixels of the preview canvas.
  const canvas = await page.evaluate(() => {
    const c = document.querySelector('section[aria-label="Preview"] canvas') || document.querySelector('canvas');
    if (!c) return null;
    const ctx = c.getContext('2d');
    const r = c.getBoundingClientRect();
    const cx = Math.floor(c.width / 2), cy = Math.floor(c.height / 2);
    const d = ctx.getImageData(cx - 100, cy - 20, 200, 40).data;
    let nonBlack = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 90) nonBlack++;
    return { rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, nonBlackPixels: nonBlack, total: d.length / 4 };
  });
  console.log('EMPTY CANVAS:', JSON.stringify(canvas));
  await shot('final-empty-canvas.png');

  // (b) sample project -> select clip -> Effects -> Classic -> Blur.
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const ag2 = page.getByRole('button', { name: 'Agree and continue' });
  if (await ag2.count()) { await ag2.first().click(); await page.waitForTimeout(400); }
  const sample = page.getByText('Sunset Coast').first();
  await sample.click();
  await page.waitForTimeout(1000);
  await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
  await page.waitForTimeout(600);
  const tabBtn = (n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();
  await tabBtn('Effects').click();
  await page.waitForTimeout(600);
  await page.locator('button', { hasText: 'Classic' }).first().click();
  await page.waitForTimeout(500);
  const blur = page.locator('button', { hasText: 'Blur' }).first();
  console.log('Blur tile count:', await blur.count());
  if (await blur.count()) { await blur.click(); await page.waitForTimeout(800); }
  const applied = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((x) => x.textContent?.includes('Applied effects'));
    if (!h) return null;
    const sec = h.closest('section');
    const r = sec?.getBoundingClientRect();
    return { text: sec?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 160), top: Math.round(r?.top ?? -1), bottom: Math.round(r?.bottom ?? -1) };
  });
  console.log('APPLIED AFTER BLUR:', JSON.stringify(applied));
  await shot('final-applied-blur.png');
  console.log('page errors:', errors);
  await browser.close();
  console.log('VERIFY2 done');
}
main().catch((e) => { console.error(e); process.exit(1); });
