#!/usr/bin/env node
/**
 * W4 D14 verify: Applied-effects card above the grid + visible without
 * scrolling; param-less GLSL note. Run: node audit/capcut-fix/v102/w4/probe-d14.mjs
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
  const sample = page.getByText('Sunset Coast').first();
  if (!(await sample.count())) throw new Error('sample not found');
  await sample.click();
  await page.waitForTimeout(1000);
  await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
  await page.waitForTimeout(500);
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
    const tabBtn = (n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();
    await tabBtn('Effects').click();
    await page.waitForTimeout(700);

    const appliedInfo = () => page.evaluate(() => {
      const sec = document.querySelector('section[aria-label="Applied effects"]');
      if (!sec) return { found: false };
      const r = sec.getBoundingClientRect();
      const grid = [...document.querySelectorAll('h3')].find((h) => /Video effects/.test(h.textContent ?? ''));
      const gridTop = grid ? grid.getBoundingClientRect().top : -1;
      return {
        found: true,
        aboveGrid: r.bottom <= gridTop,
        rect: { bottom: Math.round(r.bottom), top: Math.round(r.top) },
        text: sec.textContent?.replace(/\s+/g, ' ').trim().slice(0, 400),
        visibleWithoutScroll: r.bottom <= 792 && r.top >= 48,
      };
    });

    out.beforeApply = await appliedInfo();

    // 1. Classic effect via tile click (Classic category, first tile = Blur?).
    await page.locator('button', { hasText: 'Classic' }).first().click();
    await page.waitForTimeout(500);
    const firstTile = page.locator('div.grid button').first();
    out.classicTile = (await firstTile.textContent())?.trim();
    await firstTile.click();
    await page.waitForTimeout(700);
    out.afterClassic = await appliedInfo();
    await page.screenshot({ path: path.join(OUT, 'd14-applied-classic.png') });

    // 2. GLSL effect with params (Glow Halo, Hits).
    await page.locator('button', { hasText: 'Hits' }).first().click();
    await page.waitForTimeout(500);
    const glow = page.locator('button', { hasText: 'Glow Halo' }).first();
    out.glowFound = (await glow.count()) > 0;
    if (out.glowFound) {
      await glow.click();
      await page.waitForTimeout(700);
      out.afterGlow = await appliedInfo();
      await page.screenshot({ path: path.join(OUT, 'd14-applied-glow.png') });
    }

    // 3. Param-less GLSL effect (Sepia Deep via search).
    const search = page.locator('input[type="search"]').first();
    await search.fill('Sepia Deep');
    await page.waitForTimeout(600);
    const sepia = page.locator('button', { hasText: 'Sepia Deep' }).first();
    out.sepiaFound = (await sepia.count()) > 0;
    if (out.sepiaFound) {
      await sepia.click();
      await page.waitForTimeout(700);
      out.afterSepia = await appliedInfo();
      out.sepiaNote = await page.evaluate(() => {
        const sec = document.querySelector('section[aria-label="Applied effects"]');
        return sec?.textContent?.includes('No additional settings — Intensity only') ?? false;
      });
      await page.screenshot({ path: path.join(OUT, 'd14-applied-sepia.png') });
    }

    // 4. Filters panel: applied card above the grid too.
    await tabBtn('Filters').click();
    await page.waitForTimeout(700);
    const f = page.locator('button', { hasText: 'Vidora Warm' }).first();
    out.filterTileFound = (await f.count()) > 0;
    if (out.filterTileFound) {
      await f.click();
      await page.waitForTimeout(700);
      out.filterApplied = await page.evaluate(() => {
        const card = document.querySelector('div[aria-label="Applied filter"]');
        if (!card) return { found: false };
        const r = card.getBoundingClientRect();
        const gridHead = [...document.querySelectorAll('h3')].find((h) => /Featured/.test(h.textContent ?? ''));
        return {
          aboveGrid: gridHead ? r.bottom <= gridHead.getBoundingClientRect().top : null,
          found: true,
          rect: { bottom: Math.round(r.bottom), top: Math.round(r.top) },
          visibleWithoutScroll: r.bottom <= 792 && r.top >= 48,
        };
      });
      await page.screenshot({ path: path.join(OUT, 'd14-applied-filter.png') });
    }
  } catch (e) {
    out.error = String(e).slice(0, 500);
  }
  out.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'd14.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
