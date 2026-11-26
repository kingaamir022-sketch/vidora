#!/usr/bin/env node
/**
 * v1.0.6 hero-image probe: Video Studio page ("VIDORA VIDEO 2.5" hero)
 * against a Pages-faithful static server — dist/ mounted under /vidora/
 * (http://127.0.0.1:4174/vidora/), built with VITE_BASE=/vidora/.
 * Run: node audit/capcut-fix/v106/hero-probe.mjs
 * Prints the 3 hero img srcs + load state and saves a screenshot.
 */
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = process.env.V106_URL || 'http://127.0.0.1:4174/vidora/';
const SHOT = process.env.V106_SHOT || 'hero-repro.png';

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });

await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(1500);
// Dismiss the first-run terms dialog if it appears.
const terms = page.getByRole('button', { name: 'Agree and continue' });
if (await terms.count()) { await terms.first().click().catch(() => {}); await page.waitForTimeout(500); }
// Dismiss the "What's new" updates dialog if it appears.
const okBtn = page.getByRole('button', { name: 'OK', exact: true });
if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(500); }
// Sidebar nav: "Video Studio".
await page.locator('button:has-text("Video Studio")').first().click({ timeout: 15000 });
await page.waitForTimeout(2500);

const hero = await page.evaluate(() => {
  const headline = [...document.querySelectorAll('span')].find((s) => s.textContent?.trim() === 'VIDORA VIDEO 2.5');
  const scope = headline?.closest('div')?.parentElement ?? document.body;
  const imgs = [...scope.querySelectorAll('img')].slice(0, 3).map((img) => ({
    alt: img.getAttribute('alt'),
    complete: img.complete,
    naturalHeight: img.naturalHeight,
    naturalWidth: img.naturalWidth,
    rect: (() => { const r = img.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width), x: Math.round(r.x), y: Math.round(r.y) }; })(),
    src: img.getAttribute('src'),
  }));
  return { headlineFound: !!headline, imgs };
});
console.log(JSON.stringify({ hero, pageErrors }, null, 2));
await page.screenshot({ path: path.join(OUT, SHOT), fullPage: false });
await browser.close();
const loaded = hero.imgs.filter((i) => i.complete && i.naturalWidth > 0).length;
console.log(`HERO LOADED: ${loaded}/3`);
process.exit(loaded === 3 ? 0 : 1);
