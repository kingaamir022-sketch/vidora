#!/usr/bin/env node
/** Confirm the Ratio-menu clickability question: is the menu clipped by
 * the bottom bar's overflow-hidden, with the canvas intercepting clicks? */
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

async function main() {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  const ok2 = page.getByRole('button', { name: 'OK', exact: true });
  if (await ok2.count()) { await ok2.first().click().catch(() => {}); await page.waitForTimeout(400); }

  await page.getByRole('button', { name: 'Ratio', exact: true }).first().click();
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent === '16:9');
    if (!btn) return { found: false };
    const r = btn.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const el = document.elementFromPoint(cx, cy);
    // walk up from the menu button to find the clipping ancestor
    let anc = btn.parentElement, clipper = null;
    while (anc) {
      const cs = getComputedStyle(anc);
      if (/(hidden|clip|scroll|auto)/.test(cs.overflowX) || /(hidden|clip|scroll|auto)/.test(cs.overflowY)) { clipper = { tag: anc.tagName, cls: anc.className.slice(0, 120), ox: cs.overflowX, oy: cs.overflowY }; break; }
      anc = anc.parentElement;
    }
    return {
      found: true,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      center: { x: Math.round(cx), y: Math.round(cy) },
      hitTest: el ? `${el.tagName}.${(el.className?.baseVal ?? el.className ?? '').toString().slice(0, 80)} aria=${el.getAttribute?.('aria-label') ?? ''}` : null,
      clipper,
      visiblePortion: (() => {
        const vw = window.innerWidth, vh = window.innerHeight;
        const ix = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
        const iy = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
        return { w: Math.round(ix), h: Math.round(iy) };
      })(),
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: path.join(ROOT, 'audit', 'capcut-fix', 'v104', 'ratio-menu-open.png') });
  await browser.close();
}
main();
