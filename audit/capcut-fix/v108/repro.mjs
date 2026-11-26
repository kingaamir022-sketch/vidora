#!/usr/bin/env node
/**
 * v1.0.8 repro: tab rail clipping after one ">" click (BUG-CF-043).
 * Opens a fresh empty project at 1920x1080/100%, measures every tab
 * button + label span against the rail scroller viewport: initial state,
 * after ONE ">" click, after a second ">" click, and at max scroll.
 * A label is CLIPPED when its span intersects the viewport but is not
 * fully inside it. Run: node audit/capcut-fix/v108/repro.mjs
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v108');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

async function dismissDialogs(page) {
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

async function measureRail(page, label) {
  const info = await page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), left: Math.round(b.left), right: Math.round(b.right) }; };
    const list = document.querySelector('div[role="tablist"][aria-label="Editor tools"]');
    const scroller = list?.querySelector('div[class*="overflow-x-auto"]');
    const sr = scroller.getBoundingClientRect();
    const tabs = [...list.querySelectorAll('button[role="tab"]')].map((b) => {
      const span = b.querySelector('span');
      const bb = b.getBoundingClientRect();
      const sb = span.getBoundingClientRect();
      const visL = Math.max(bb.left, sr.left), visR = Math.min(bb.right, sr.right);
      const spanVisL = Math.max(sb.left, sr.left), spanVisR = Math.min(sb.right, sr.right);
      // Label clipped iff its span intersects the viewport but is not fully inside it.
      const spanIntersects = sb.right > sr.left + 0.5 && sb.left < sr.right - 0.5;
      const spanFullyInside = sb.left >= sr.left - 0.5 && sb.right <= sr.right + 0.5;
      return {
        t: (b.textContent || '').trim(),
        btn: { x: Math.round(bb.x), w: Math.round(bb.width), visibleW: Math.round(Math.max(0, visR - visL)) },
        label: { x: Math.round(sb.x), w: Math.round(sb.width), visibleW: Math.round(Math.max(0, spanVisR - spanVisL)) },
        labelClipped: spanIntersects && !spanFullyInside,
      };
    });
    return {
      scroller: { x: Math.round(sr.x), w: Math.round(sr.width), left: Math.round(sr.left), right: Math.round(sr.right) },
      scrollLeft: Math.round(scroller.scrollLeft),
      scrollWidth: Math.round(scroller.scrollWidth),
      clientWidth: Math.round(scroller.clientWidth),
      maxScroll: Math.round(scroller.scrollWidth - scroller.clientWidth),
      leftChevron: !!list.querySelector('button[aria-label="Scroll tabs left"]'),
      rightChevron: !!list.querySelector('button[aria-label="Scroll tabs right"]'),
      tabs,
    };
  });
  console.log(`\n=== ${label} ===`);
  console.log(`scroller x=${info.scroller.x} w=${info.scroller.w} scrollLeft=${info.scrollLeft} maxScroll=${info.maxScroll} chevrons L=${info.leftChevron} R=${info.rightChevron}`);
  for (const t of info.tabs) {
    console.log(`  ${t.t.padEnd(11)} btnW=${t.btn.w} btnVisible=${t.btn.visibleW} labelW=${t.label.w} labelVisible=${t.label.visibleW}${t.labelClipped ? '  *** LABEL CLIPPED ***' : ''}`);
  }
  return info;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await dismissDialogs(page);
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  await dismissDialogs(page);

  await measureRail(page, 'INITIAL');
  const rightBtn = page.getByRole('button', { name: 'Scroll tabs right' });
  if (await rightBtn.count()) { await rightBtn.first().click(); await page.waitForTimeout(1200); }
  await measureRail(page, 'AFTER 1x ">" CLICK');
  await page.screenshot({ path: path.join(OUT, 'repro-after-1-click.png') });
  if (await rightBtn.count()) { await rightBtn.first().click(); await page.waitForTimeout(1200); }
  await measureRail(page, 'AFTER 2x ">" CLICK');
  // Max scroll via evaluate (instant).
  await page.evaluate(() => {
    const scroller = document.querySelector('div[role="tablist"][aria-label="Editor tools"] div[class*="overflow-x-auto"]');
    scroller.scrollLeft = scroller.scrollWidth;
  });
  await page.waitForTimeout(600);
  await measureRail(page, 'MAX SCROLL');
  await page.screenshot({ path: path.join(OUT, 'repro-max-scroll.png') });
  console.log('\npageErrors:', JSON.stringify(errors));
  await browser.close();
}
main();
