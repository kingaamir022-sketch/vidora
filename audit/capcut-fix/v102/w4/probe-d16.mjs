#!/usr/bin/env node
/**
 * W4 D16 verify: filter + transition tiles show real photo thumbnails.
 * Run: node audit/capcut-fix/v102/w4/probe-d16.mjs
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'w4');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

async function openSample(page) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(400); }
  await page.getByText('Sunset Coast').first().click();
  await page.waitForTimeout(1000);
  await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
  await page.waitForTimeout(400);
}

const tabBtn = (page, n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();

/** Per-tile audit of the 2-col grid in the current panel. */
async function auditGrid(page) {
  return page.evaluate(async () => {
    // Wait for any in-flight thumbnail to finish (data URLs appear).
    await new Promise((r) => setTimeout(r, 1200));
    const grid = document.querySelector('div.grid.grid-cols-2');
    if (!grid) return { found: false };
    const tiles = [...grid.children].filter((el) => el.tagName === 'DIV');
    const rows = tiles.map((tile) => {
      const img = tile.querySelector('img');
      const text = (tile.textContent ?? '').replace(/\s+/g, ' ').trim();
      return {
        hasImg: !!img,
        imgComplete: img ? img.complete && img.naturalWidth > 0 : false,
        imgIsPhoto: img ? img.src.startsWith('data:image/png') || img.src.includes('ai-library') : false,
        letterOnly: !img && /^[A-Z]$/.test(text.replace(/[^A-Za-z]/g, '').slice(0, 1)) && text.length < 3,
        text: text.slice(0, 40),
      };
    });
    return { found: true, tileCount: tiles.length, rows };
  });
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  const out = {};
  try {
    await openSample(page);

    await tabBtn(page, 'Filters').click();
    await page.waitForTimeout(1500);
    out.filters = await auditGrid(page);
    out.filters.allPhoto = out.filters.rows?.every((r) => r.hasImg && r.imgComplete && r.imgIsPhoto);
    out.filters.anyLetterOnly = out.filters.rows?.some((r) => r.letterOnly);
    out.filters.downloadButtons = await page.locator('button[aria-label*="Download"][aria-label*=".cube"]').count();
    await page.screenshot({ path: path.join(OUT, 'd16-filters.png') });

    await tabBtn(page, 'Transitions').click();
    await page.waitForTimeout(1800);
    out.transitions = await auditGrid(page);
    out.transitions.allPhoto = out.transitions.rows?.every((r) => r.hasImg && r.imgComplete && r.imgIsPhoto);
    out.transitions.anyLetterOnly = out.transitions.rows?.some((r) => r.letterOnly);
    out.transitions.downloadButtons = await page.locator('button[aria-label*="Download"][aria-label*="PNG"]').count();
    await page.screenshot({ path: path.join(OUT, 'd16-transitions.png') });

    // Distinctness: two filter thumbnails must differ (different LUTs).
    out.filters.distinct = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll('div.grid.grid-cols-2 img')].map((i) => i.src);
      return new Set(imgs).size;
    });
  } catch (e) {
    out.error = String(e).slice(0, 500);
  }
  out.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'd16.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
