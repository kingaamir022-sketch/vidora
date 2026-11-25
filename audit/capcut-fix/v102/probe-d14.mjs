#!/usr/bin/env node
/**
 * D14 REPRO (v1.0.2): are the feature panels actually populated?
 * User report: applying an effect shows options with NOTHING inside.
 * Opens the sample project (has a real clip), then for EVERY panel
 * counts visible content items per sub-category, and applies one
 * effect to check its params panel. Baseline BEFORE any fix.
 * Run: node audit/capcut-fix/v102/probe-d14.mjs (dev server :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'd14-before');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';
const result = {};

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
  const tabBtn = (n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(500); }

  // Sample project (has a real video clip on the timeline).
  const sample = page.getByText('Sunset Coast').first();
  if (await sample.count()) {
    await sample.click();
    await page.waitForTimeout(1000);
    // Select the first timeline clip.
    await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
    await page.waitForTimeout(600);
    result.sampleOpened = true;
    result.selectedClip = await page.evaluate(() => {
      const tb = document.querySelector('section[aria-label="Timeline"]');
      return tb ? [...tb.querySelectorAll('[role="button"]')].map((c) => c.textContent?.trim().slice(0, 50)) : [];
    });
  } else {
    result.sampleOpened = false;
  }
  await shot('d14-sample.png');

  // ---- Effects tab: every category ----
  const effects = {};
  try {
    await tabBtn('Effects').click();
    await page.waitForTimeout(700);
    const subNav = await page.evaluate(() => {
      // left sub-nav buttons inside the panel column (first 610px)
      const col = document.querySelector('div.w-\\[610px\\], div[class*="w-[min(610px"]');
      const scope = col ?? document;
      return [...scope.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter((t) => t && t.length < 30);
    });
    effects.subNavButtons = subNav;
    // Click each likely category button and count grid tiles.
    for (const cat of ['Trending', 'Sale', 'Classic', 'Cutout', 'NEW', 'Hits', 'Body effects', 'Video effects']) {
      const btn = page.locator('button', { hasText: cat }).first();
      if (await btn.count()) {
        await btn.click().catch(() => {});
        await page.waitForTimeout(500);
        const count = await page.evaluate(() => {
          const col = document.querySelector('div.w-\\[610px\\], div[class*="w-[min(610px"]');
          const scope = col ?? document;
          // tiles: buttons inside the grid area with a visible label
          return [...scope.querySelectorAll('button')].filter((b) => {
            const r = b.getBoundingClientRect();
            return r.width > 40 && r.height > 40 && r.top > 120 && r.top < 780;
          }).length;
        });
        effects[cat] = count;
        await shot('d14-effects-' + cat.toLowerCase().replace(/ /g, '-') + '.png');
      } else {
        effects[cat] = 'NO BUTTON';
      }
    }
    // Apply the first effect tile and inspect its params.
    const firstTile = page.locator('button[title]').first();
    effects.applyAttempt = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button[title]')].filter((b) => {
        const r = b.getBoundingClientRect();
        return r.width > 40 && r.height > 40 && r.left < 620 && r.top > 120 && r.top < 780;
      });
      return btns.length;
    });
    await shot('d14-effects-after-apply.png');
    effects.paramsPanel = await page.evaluate(() => {
      const sliders = [...document.querySelectorAll('input[type="range"]')].filter((s) => {
        const r = s.getBoundingClientRect();
        return r.width > 0 && r.left < 620;
      }).length;
      const panelText = document.querySelector('div.w-\\[610px\\], div[class*="w-[min(610px"]')?.textContent ?? '';
      return { slidersInLeftColumn: sliders, panelTextLength: panelText.length, panelSnippet: panelText.slice(0, 300) };
    });
  } catch (e) {
    effects.error = String(e).slice(0, 300);
  }
  result.effects = effects;

  // ---- Every other panel: count visible content items ----
  const panels = {};
  for (const tab of ['Filters', 'Stickers', 'Text', 'Captions', 'Adjustment', 'Audio', 'Templates', 'AI avatar']) {
    try {
      await tabBtn(tab).click();
      await page.waitForTimeout(600);
      panels[tab] = await page.evaluate(() => {
        const col = document.querySelector('div.w-\\[610px\\], div[class*="w-[min(610px"]');
        const scope = col ?? document;
        const btns = [...scope.querySelectorAll('button')].filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width > 20 && r.height > 20 && r.top >= 48 && r.top < 790;
        }).length;
        const text = (scope.textContent ?? '').replace(/\s+/g, ' ').trim();
        return { buttons: btns, textLength: text.length, snippet: text.slice(0, 200) };
      });
      await shot('d14-panel-' + tab.toLowerCase().replace(/ /g, '-') + '.png');
    } catch (e) {
      panels[tab] = { error: String(e).slice(0, 200) };
    }
  }
  result.panels = panels;
  result.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'd14.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  console.log('page errors:', errors.length);
  await browser.close();
  console.log('D14 PROBE done in', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
