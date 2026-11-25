#!/usr/bin/env node
/** Live hover probe: does "Edit more" appear on template hover at 1920x1080/100%? */
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = process.argv[2] || 'https://kingaamir022-sketch.github.io/vidora/';

const out = {};
async function main() {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
  // Go to Templates page from the dashboard sidebar.
  const tpl = page.getByRole('button', { name: 'Templates' }).first();
  if (await tpl.count()) { await tpl.click(); await page.waitForTimeout(1200); }
  out.templatesVisible = await page.locator('article').count();
  // Hover the first template card.
  const first = page.locator('article').first();
  await first.hover({ force: true });
  await page.waitForTimeout(700);
  out.hoverProbe = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /Use template|Edit more|Choose media/i.test(b.textContent || ''));
    return btns.map((b) => {
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      return {
        text: (b.textContent || '').trim().slice(0, 40),
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        inViewport: r.bottom <= 1080 && r.right <= 1920 && r.top >= 0 && r.left >= 0,
        visible: cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 0,
      };
    });
  });
  out.pageErrors = errors;
  await page.screenshot({ path: path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'live-hover.png') });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
}
main();
