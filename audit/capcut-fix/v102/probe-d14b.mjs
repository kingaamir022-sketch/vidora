#!/usr/bin/env node
/**
 * D14 REPRO part 2: actually APPLY an effect and dump its options panel.
 * Run: node audit/capcut-fix/v102/probe-d14b.mjs (dev server :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'd14-before');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
  const tabBtn = (n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(500); }
  const sample = page.getByText('Sunset Coast').first();
  if (!(await sample.count())) { console.log('SAMPLE NOT FOUND'); await browser.close(); return; }
  await sample.click();
  await page.waitForTimeout(1000);
  await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
  await page.waitForTimeout(600);

  const appliedSection = () => page.evaluate(() => {
    const heads = [...document.querySelectorAll('h3')].filter((h) => h.textContent?.includes('Applied effects'));
    if (!heads.length) return { found: false };
    const sec = heads[0].closest('section');
    if (!sec) return { found: false, noSection: true };
    const r = sec.getBoundingClientRect();
    return {
      found: true,
      text: sec.textContent?.replace(/\s+/g, ' ').trim().slice(0, 500),
      sliders: [...sec.querySelectorAll('input[type="range"]')].map((s) => s.getAttribute('aria-label')),
      rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) },
      visible: r.bottom <= 792 && r.top >= 48,
    };
  });

  await tabBtn('Effects').click();
  await page.waitForTimeout(700);
  console.log('BEFORE APPLY:', JSON.stringify(await appliedSection(), null, 2));

  // Apply a GLSL effect (Glow Halo, in Hits).
  const glow = page.locator('button', { hasText: 'Glow Halo' }).first();
  console.log('Glow Halo button count:', await glow.count());
  if (await glow.count()) {
    await glow.click();
    await page.waitForTimeout(800);
    console.log('AFTER GLOW HALO:', JSON.stringify(await appliedSection(), null, 2));
    await shot('d14b-after-glow-halo.png');
  }

  // Apply a classic effect: Classic category, first tile.
  const classic = page.locator('button', { hasText: 'Classic' }).first();
  if (await classic.count()) { await classic.click(); await page.waitForTimeout(600); }
  const firstTile = page.locator('div.grid button').first();
  const tileName = (await firstTile.textContent())?.trim();
  console.log('Classic first tile:', tileName);
  await firstTile.click();
  await page.waitForTimeout(800);
  console.log('AFTER CLASSIC TILE:', JSON.stringify(await appliedSection(), null, 2));
  await shot('d14b-after-classic.png');

  // Where does the Applied section sit — below the fold? Scroll position of panel.
  console.log('PANEL SCROLL:', JSON.stringify(await page.evaluate(() => {
    const col = document.querySelector('div.w-\\[610px\\], div[class*="w-[min(610px"]');
    const scrollables = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 10 && d.clientHeight > 300 && d.getBoundingClientRect().left < 620).map((d) => ({
      cls: d.className.slice(0, 80), scrollHeight: d.scrollHeight, clientHeight: d.clientHeight, scrollTop: d.scrollTop,
    }));
    return scrollables.slice(0, 5);
  }), null, 2));
  console.log('page errors:', errors);
  await browser.close();
  console.log('D14B done');
}
main().catch((e) => { console.error(e); process.exit(1); });
