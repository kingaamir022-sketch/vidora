#!/usr/bin/env node
/**
 * v1.0.9 verification: template hover popup matches CapCut #06.
 * CapCut truth (measured): popup image ~321px vs card ~253px (ratio ~1.27x),
 * popup vertically CENTRED on the card, buttons directly beneath the image
 * and fully inside the viewport, neighbours only slightly overlapped.
 * Vidora target: ratio 1.25x, popup bottom <= vh, both buttons fully in
 * viewport, popup left >= 0 and right <= vw, at every size.
 * Checks at 5 sizes: hover each of the 5 first-row templates + one row-2
 * template (clamp case), measure card/popup/buttons/neighbour titles.
 * Plus the 1920 regression block.
 * Run: node audit/capcut-fix/v109/verify.mjs (dev server :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v109');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';
const checks = {};
const fail = [];
function check(name, ok, detail = '') {
  checks[name] = ok ? 'PASS' : 'FAIL' + (detail ? ' — ' + detail : '');
  if (!ok) fail.push(name);
}

async function dismissDialogs(page) {
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

async function hoverMeasure(page, article) {
  // Scroll the card into view first: below-the-fold cards cannot be hovered
  // by a raw mouse move (the 1024 Sunset case in the first pass).
  await article.evaluate((el) => el.scrollIntoView({ block: 'nearest' }));
  await page.waitForTimeout(400);
  const box = await article.boundingBox();
  if (!box) return null;
  // First move the pointer to neutral space: the previously hovered card's
  // popup (viewport-clamped) can physically cover this card, and a move
  // that starts and ends inside that popup never fires this card's
  // mouseenter. Real users move out of the popup first; mirror that.
  await page.mouse.move(20, 20, { steps: 8 });
  await page.waitForTimeout(250);
  // Move in steps (like a real mouse): a teleport can land on another
  // card's open popup, which then keeps the hover instead of this card.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
  await page.waitForTimeout(500);
  return article.evaluate((el) => {
    const rr = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const cardImg = el.querySelector(':scope > div.relative');
    const popup = [...el.querySelectorAll(':scope > div')].find((d) => d.className.includes('z-30') && d.querySelector('button'));
    const popupImg = popup?.querySelector(':scope > div.relative');
    const useBtn = [...el.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Use template');
    const editBtn = [...el.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Edit more');
    const title = el.querySelector(':scope > p');
    const vh = window.innerHeight, vw = window.innerWidth;
    // Neighbour titles: previous/next article's <p>, visible fraction after popup overlap.
    const arts = [...document.querySelectorAll('article')];
    const idx = arts.indexOf(el);
    const visFrac = (a) => {
      if (!a) return null;
      const p = a.querySelector(':scope > p');
      if (!p) return null;
      const b = p.getBoundingClientRect();
      const pr = popup?.getBoundingClientRect();
      if (!pr) return 1;
      const overlapX = Math.max(0, Math.min(b.right, pr.right) - Math.max(b.left, pr.left));
      const overlapY = Math.max(0, Math.min(b.bottom, pr.bottom) - Math.max(b.top, pr.top));
      const covered = b.width > 0 && b.height > 0 ? (overlapX * overlapY) / (b.width * b.height) : 0;
      return +(1 - covered).toFixed(2);
    };
    return {
      name: (title?.textContent || '').trim(),
      cardRect: rr(cardImg),
      popupRect: rr(popup),
      popupImgRect: rr(popupImg),
      useRect: rr(useBtn),
      editRect: rr(editBtn),
      vh, vw,
      prevTitleVisible: visFrac(arts[idx - 1]),
      nextTitleVisible: visFrac(arts[idx + 1]),
    };
  });
}

async function checkSize(browser, label, viewport, dsf) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: dsf });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await dismissDialogs(page);
  const tplNav = page.getByRole('button', { name: 'Templates' }).first();
  if (await tplNav.count()) { await tplNav.click(); await page.waitForTimeout(1500); }

  const rows = [];
  const articles = await page.$$('article');
  for (let i = 0; i < Math.min(5, articles.length); i++) {
    const m = await hoverMeasure(page, articles[i]);
    if (!m) continue;
    rows.push(m);
    const ratio = m.popupRect ? +(m.popupRect.w / m.cardRect.w).toFixed(2) : null;
    const imgRatio = m.popupImgRect ? +(m.popupImgRect.w / m.cardRect.w).toFixed(2) : null;
    const btnsIn = m.useRect && m.editRect
      ? m.useRect.y >= 0 && m.useRect.y + m.useRect.h <= m.vh && m.editRect.y >= 0 && m.editRect.y + m.editRect.h <= m.vh
      : false;
    const popupIn = m.popupRect ? m.popupRect.y >= 0 && m.popupRect.y + m.popupRect.h <= m.vh && m.popupRect.x >= 0 && m.popupRect.x + m.popupRect.w <= m.vw : false;
    check(`${label} ${m.name}: ratio ${ratio} (img ${imgRatio})`, ratio !== null && ratio >= 1.2 && ratio <= 1.3, `ratio=${ratio}`);
    check(`${label} ${m.name}: popup fully in viewport`, popupIn, `popup=${JSON.stringify(m.popupRect)} vh=${m.vh} vw=${m.vw}`);
    check(`${label} ${m.name}: both buttons fully in viewport`, btnsIn, `use=${JSON.stringify(m.useRect)} edit=${JSON.stringify(m.editRect)}`);
    check(`${label} ${m.name}: buttons single-line (h<=40)`, m.useRect && m.editRect ? m.useRect.h <= 40 && m.editRect.h <= 40 : false, `useH=${m.useRect?.h} editH=${m.editRect?.h}`);
    check(`${label} ${m.name}: neighbour titles >=70% visible`, (m.prevTitleVisible ?? 1) >= 0.7 && (m.nextTitleVisible ?? 1) >= 0.7, `prev=${m.prevTitleVisible} next=${m.nextTitleVisible}`);
    if (m.name === 'Retro Intro') await page.screenshot({ path: path.join(OUT, `verify-${label}-retro.png`) });
  }
  // Row-2 clamp case: first article of the second row (different card y).
  // Resolve it by INDEX inside the page (rects change after scrolling).
  const row2Idx = await page.evaluate(() => {
    const arts = [...document.querySelectorAll('article')];
    const first = arts[0]?.querySelector(':scope > div.relative')?.getBoundingClientRect().y;
    const idx = arts.findIndex((a) => (a.querySelector(':scope > div.relative')?.getBoundingClientRect().y ?? 0) > (first ?? 0) + 50);
    if (idx < 0) return -1;
    arts[idx].scrollIntoView({ block: 'center' });
    return idx;
  });
  if (row2Idx >= 0) {
    await page.waitForTimeout(600);
    const arts2 = await page.$$('article');
    const m = await hoverMeasure(page, arts2[row2Idx]);
    if (m?.popupRect) {
      const ratio = +(m.popupRect.w / m.cardRect.w).toFixed(2);
      const btnsIn = m.useRect.y >= 0 && m.useRect.y + m.useRect.h <= m.vh && m.editRect.y >= 0 && m.editRect.y + m.editRect.h <= m.vh;
      const popupIn = m.popupRect.y >= 0 && m.popupRect.y + m.popupRect.h <= m.vh && m.popupRect.x >= 0 && m.popupRect.x + m.popupRect.w <= m.vw;
      check(`${label} row2 ${m.name}: ratio ${ratio}`, ratio >= 1.2 && ratio <= 1.3, `ratio=${ratio}`);
      check(`${label} row2 ${m.name}: popup fully in viewport (clamped)`, popupIn, `popup=${JSON.stringify(m.popupRect)} vh=${m.vh}`);
      check(`${label} row2 ${m.name}: both buttons fully in viewport`, btnsIn, `use=${JSON.stringify(m.useRect)}`);
      check(`${label} row2 ${m.name}: buttons single-line (h<=40)`, m.useRect.h <= 40 && m.editRect.h <= 40, `useH=${m.useRect.h} editH=${m.editRect.h}`);
      await page.screenshot({ path: path.join(OUT, `verify-${label}-row2.png`) });
    } else {
      check(`${label} row2: popup measured`, false, 'popupRect null');
    }
  }
  check(`${label}: 0 page errors`, errors.length === 0, errors.join(' | '));
  console.log(`--- ${label}: ${rows.length} row-1 hovers measured, errors=${errors.length}`);
  for (const m of rows) console.log(JSON.stringify(m));
  await page.close();
  return rows;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  await checkSize(browser, '1920', { width: 1920, height: 1080 }, 1);
  await checkSize(browser, '150pct', { width: 1280, height: 720 }, 1.5);
  await checkSize(browser, '1366', { width: 1366, height: 768 }, 1);
  await checkSize(browser, '1280', { width: 1280, height: 720 }, 1);
  await checkSize(browser, '1024', { width: 1024, height: 768 }, 1);

  // ---- 1920 regression block ----
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await dismissDialogs(page);
  const bodyText = await page.evaluate(() => document.body.innerText);
  check('regression: no Pals', !bodyText.includes('Pals'));
  check('regression: no floating pill text', !bodyText.includes('Edit with AI'));
  const createBtn = page.getByRole('button', { name: /Create project/i }).first();
  if (await createBtn.count()) {
    await createBtn.click();
    await page.waitForTimeout(1500);
    const canvas = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return null;
      const b = c.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height) };
    });
    check('regression: canvas 756x424 at 1920', canvas && canvas.w === 756 && canvas.h === 424, JSON.stringify(canvas));
    const rail = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('button')].map((b) => (b.textContent || '').trim());
      return { hasMedia: tabs.includes('Media'), hasAIAvatar: tabs.includes('AI avatar') };
    });
    check('regression: tab rail has Media + AI avatar', rail.hasMedia && rail.hasAIAvatar);
    const editorText = await page.evaluate(() => document.body.innerText);
    check('regression: no "Click to upload"', !editorText.includes('Click to upload'));
    check('regression: no "CC" button', !/\bCC\b/.test(editorText));
    await page.screenshot({ path: path.join(OUT, 'verify-1920-regression.png') });
  } else {
    check('regression: create project button found', false);
  }
  check('regression: 0 page errors', errors.length === 0, errors.join(' | '));
  await page.close();
  await browser.close();

  await fs.writeFile(path.join(OUT, 'verify.json'), JSON.stringify({ checks, fail, ok: fail.length === 0 }, null, 2));
  const pass = Object.values(checks).filter((v) => String(v).startsWith('PASS')).length;
  console.log(`\n${pass} PASS, ${fail.length} FAIL`);
  if (fail.length) { console.log('FAILURES:'); fail.forEach((f) => console.log(' - ' + f)); process.exit(1); }
  console.log('ok: true');
}
main().catch((e) => { console.error(e); process.exit(1); });
