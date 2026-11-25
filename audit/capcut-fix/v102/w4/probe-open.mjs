#!/usr/bin/env node
/**
 * W4 open items verify: (b) first-frame after template apply (paused t=0
 * renders the template immediately); (d) Media Import box fits the left
 * column at 1920 and 1280. Run: node audit/capcut-fix/v102/w4/probe-open.mjs
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
}

const tabBtn = (page, n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();

async function canvasNonBlackFraction(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    if (!c) return null;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    // Sample the displayed canvas at low res (readback of the 1920x1080
    // backing store is fine at this size, sampled every 16th pixel).
    const w = c.width;
    const h = c.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    let nonBlack = 0;
    let total = 0;
    for (let i = 0; i < data.length; i += 64) {
      total += 1;
      if (data[i] > 12 || data[i + 1] > 12 || data[i + 2] > 12) nonBlack += 1;
    }
    return { fraction: nonBlack / total, h, w };
  });
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const out = {};
  try {
    // --- (b) first frame, 1920.
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
    await openSample(page);
    await tabBtn(page, 'Templates').click();
    await page.waitForTimeout(700);
    const useBtn = page.getByRole('button', { name: 'Use template' }).first();
    out.useTemplateFound = (await useBtn.count()) > 0;
    if (out.useTemplateFound) {
      await useBtn.click();
      // Paused at t=0: measure immediately and again shortly after.
      await page.waitForTimeout(300);
      out.firstFrame300ms = await canvasNonBlackFraction(page);
      await page.waitForTimeout(1200);
      out.firstFrame1500ms = await canvasNonBlackFraction(page);
      await page.screenshot({ path: path.join(OUT, 'open-template-first-frame.png') });
      // Playback still works after the fix.
      const play = page.getByRole('button', { name: 'Play', exact: true }).first();
      if (await play.count()) {
        await play.click();
        await page.waitForTimeout(1200);
        out.timecodeAfterPlay = await page.locator('[aria-label="Timecode"]').first().textContent();
        await page.screenshot({ path: path.join(OUT, 'open-template-playing.png') });
      }
    }
    out.pageErrors1920 = errors;
    await page.close();

    // --- (d) Import box at 1920 and 1280.
    for (const vp of [{ height: 1080, width: 1920 }, { height: 800, width: 1280 }]) {
      const p2 = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
      await openSample(p2);
      await tabBtn(p2, 'Media').click();
      await p2.waitForTimeout(700);
      const key = `${vp.width}x${vp.height}`;
      out[`importBox${key}`] = await p2.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Import media"]');
        const col = document.querySelector('div.w-\\[min\\(610px\\,32vw\\)\\]');
        if (!btn) return { found: false };
        const r = btn.getBoundingClientRect();
        const cr = col ? col.getBoundingClientRect() : null;
        return {
          colRight: cr ? Math.round(cr.right) : null,
          colWidth: cr ? Math.round(cr.width) : null,
          fitsInsideColumn: cr ? r.right <= cr.right + 1 : null,
          found: true,
          rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) },
        };
      });
      await p2.screenshot({ path: path.join(OUT, `open-import-${key}.png`) });
      await p2.close();
    }
  } catch (e) {
    out.error = String(e).slice(0, 500);
  }
  await fs.writeFile(path.join(OUT, 'open.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
