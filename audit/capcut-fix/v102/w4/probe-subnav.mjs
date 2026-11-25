#!/usr/bin/env node
/**
 * W4 self-audit: every sub-nav category in the panel tabs — does it show
 * real content, an honest empty state, or a misleading repeat?
 * Run: node audit/capcut-fix/v102/w4/probe-subnav.mjs
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

  for (const tab of ['Effects', 'Filters', 'Transitions', 'Stickers', 'Audio', 'Captions', 'Text']) {
    await tabBtn(page, tab).click();
    await page.waitForTimeout(700);
    const subs = await page.evaluate(() => {
      const aside = document.querySelector('aside[aria-label="Editor panel"], div[aria-label="Editor panel"]');
      const nav = document.querySelectorAll('button');
      // Sub-nav lives in the left column of the panel: buttons inside the
      // panel container that are not the top tabs.
      const panel = document.querySelector('div[role="tabpanel"], section[aria-label="Left panel"]');
      return null;
    });
    // Collect sub-nav buttons from the panel's left column (first 200px of
    // the panel area, x < 190).
    const items = await page.evaluate(() => {
      const out = [];
      for (const b of document.querySelectorAll('button')) {
        const r = b.getBoundingClientRect();
        if (r.x >= 0 && r.x < 190 && r.y > 100 && r.y < 800 && b.offsetParent !== null) {
          const t = (b.textContent ?? '').trim();
          if (t && !['Media', 'Audio', 'Text', 'Stickers', 'Effects', 'Transitions', 'Captions', 'Filters', 'Adjustment', 'Templates', 'AI avatar'].includes(t)) out.push(t);
        }
      }
      return [...new Set(out)];
    });
    R[tab] = {};
    for (const name of items) {
      try {
        const btn = page.locator('button', { hasText: name }).first();
        await btn.click({ timeout: 5000 });
        await page.waitForTimeout(400);
        const state = await page.evaluate(() => {
          const col = document.querySelector('section[aria-label="Preview"]')?.previousElementSibling;
          const panelText = document.body.innerText;
          // Count visible tile-ish buttons in the content column (x 190..590).
          let tiles = 0;
          for (const b of document.querySelectorAll('button')) {
            const r = b.getBoundingClientRect();
            if (r.x > 190 && r.x < 600 && r.y > 120 && r.y < 800 && b.offsetParent !== null) tiles++;
          }
          const emptyHints = ['No ', 'not yet', 'No media', 'No presets', 'No captions', 'No favorites', 'nothing', 'No results', 'No audio', 'No templates'];
          const hint = emptyHints.find((h) => panelText.includes(h)) ?? null;
          return { tiles, hint };
        });
        R[tab][name] = state;
      } catch (e) {
        R[tab][name] = { error: String(e).slice(0, 120) };
      }
    }
  }
  R.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'subnav.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
