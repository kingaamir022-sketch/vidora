#!/usr/bin/env node
/**
 * v1.0.9 BASELINE (measurement only — run before the fix): measure the
 * dashboard Templates hover popup vs its grid card at 1920x1080/100% and at
 * CSS 1280x720 (the user's 150% zoom case, viewport 1280x720 + dsf 1.5).
 * CapCut #06 truth: popup image ~321px vs card image ~253px (ratio ~1.27x),
 * popup vertically CENTRED on the card, buttons directly beneath the image
 * and fully inside the viewport.
 * Run: node audit/capcut-fix/v109/baseline.mjs (dev server :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v109');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';
const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };

async function dismissDialogs(page) {
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

async function measure(browser, label, viewport, dsf) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: dsf });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await dismissDialogs(page);
  const tplNav = page.getByRole('button', { name: 'Templates' }).first();
  if (await tplNav.count()) { await tplNav.click(); await page.waitForTimeout(1500); }

  const results = [];
  const articles = await page.$$('article');
  for (let i = 0; i < Math.min(5, articles.length); i++) {
    const a = articles[i];
    const box = await a.boundingBox();
    if (!box) continue;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(600);
    const m = await a.evaluate((el) => {
      const rr = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
      const cardImg = el.querySelector(':scope > div.relative');
      const popup = [...el.querySelectorAll(':scope > div')].find((d) => d.className.includes('left-1/2'));
      const popupImg = popup?.querySelector(':scope > div.relative');
      const useBtn = [...el.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Use template');
      const editBtn = [...el.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Edit more');
      return {
        name: (el.querySelector(':scope > p')?.textContent || '').trim(),
        cardRect: rr(cardImg),
        popupRect: rr(popup),
        popupImgRect: rr(popupImg),
        useRect: rr(useBtn),
        editRect: rr(editBtn),
        vh: window.innerHeight,
        vw: window.innerWidth,
      };
    });
    if (m.popupRect) {
      m.ratioW = +(m.popupRect.w / m.cardRect.w).toFixed(2);
      m.ratioImgW = m.popupImgRect ? +(m.popupImgRect.w / m.cardRect.w).toFixed(2) : null;
      m.popupBottom = m.popupRect.y + m.popupRect.h;
      m.buttonsInView = m.useRect && m.editRect ? (m.useRect.y + m.useRect.h <= m.vh && m.editRect.y + m.editRect.h <= m.vh) : false;
      m.popupInView = m.popupBottom <= m.vh;
      m.popupTop = m.popupRect.y;
      m.cardCenterY = m.cardRect.y + Math.round(m.cardRect.h / 2);
      m.popupCenterY = m.popupRect.y + Math.round(m.popupRect.h / 2);
    }
    results.push(m);
    if (m.name === 'Retro Intro') await page.screenshot({ path: path.join(OUT, `baseline-${label}-retro.png`) });
  }
  console.log(`\n=== ${label} (${viewport.width}x${viewport.height} dsf ${dsf}) pageErrors=${errors.length} ===`);
  for (const m of results) {
    console.log(JSON.stringify(m));
  }
  await page.close();
  return results;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const all = {};
  all['1920x1080'] = await measure(browser, '1920', { width: 1920, height: 1080 }, 1);
  all['1280x720-css'] = await measure(browser, '1280css', { width: 1280, height: 720 }, 1.5);
  await fs.writeFile(path.join(OUT, 'baseline.json'), JSON.stringify(all, null, 2));
  await browser.close();
  console.log('\nbaseline.json written');
}
main().catch((e) => { console.error(e); process.exit(1); });
