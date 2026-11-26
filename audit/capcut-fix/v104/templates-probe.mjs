#!/usr/bin/env node
/** Probe: what do template cards actually render on the dashboard Templates page? */
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = process.argv[2] || 'http://127.0.0.1:5200/';

async function main() {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
  const tpl = page.getByRole('button', { name: 'Templates' }).first();
  if (await tpl.count()) { await tpl.click(); await page.waitForTimeout(1500); }
  const info = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('article')].slice(0, 5);
    return cards.map((a) => {
      const thumb = a.querySelector('[role="img"]');
      const img = thumb?.querySelector('img');
      const spans = [...(thumb?.querySelectorAll('span') || [])].map((s) => ({
        text: (s.textContent || '').slice(0, 30),
        color: getComputedStyle(s).color,
        fontSize: getComputedStyle(s).fontSize,
        rect: (() => { const r = s.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
      }));
      const r = thumb?.getBoundingClientRect();
      return {
        name: (a.querySelector('p')?.textContent || '').trim(),
        thumbBg: thumb ? getComputedStyle(thumb).background : null,
        thumbRect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null,
        imgSrc: img ? (img.getAttribute('src') || '').slice(0, 60) : null,
        imgLoaded: img ? (img.complete && img.naturalWidth > 0) : null,
        imgNatural: img ? { w: img.naturalWidth, h: img.naturalHeight } : null,
        spans,
      };
    });
  });
  console.log(JSON.stringify({ errors, cards: info }, null, 1));
  await page.screenshot({ path: path.join(ROOT, 'audit', 'capcut-fix', 'v104', 'templates-probe.png') });
  await browser.close();
}
main();
