#!/usr/bin/env node
/**
 * v1.0.3 verification (Web-check follow-up round): fresh Playwright pass
 * at 1920x1080, deviceScaleFactor 1, 100% zoom, against the dev server.
 * Run: node audit/capcut-fix/v103/verify.mjs (dev server :5200)
 * Checks: HelpCenter v1.0.2 entry, no Pals, Tools direct-apply with
 * Intensity-only card, square ~70px tiles, no CC button, all 11 tabs,
 * template hover shows BOTH Use template + Edit more in the viewport.
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v103');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';
const checks = {};
const fail = [];
function check(name, ok, detail = '') {
  checks[name] = ok ? 'PASS' : 'FAIL' + (detail ? ' — ' + detail : '');
  if (!ok) fail.push(name);
}
const tabBtn = (page, n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();
const timelineClip = (page) => page.locator('section[aria-label="Timeline"] [role="button"]');

async function dismissDialogs(page) {
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });

  // ---- Dashboard -> empty editor ----
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await dismissDialogs(page);
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  await dismissDialogs(page);
  await page.screenshot({ path: path.join(OUT, 'editor-empty.png') });

  // ---- Item 1: HelpCenter says v1.0.2 ----
  const menuBtn = page.getByRole('button', { name: 'Menu' }).first();
  if (await menuBtn.count()) {
    await menuBtn.click();
    await page.waitForTimeout(400);
    const helpItem = page.getByRole('menuitem', { name: 'Help' }).first();
    const helpBtn = page.locator('button', { hasText: /^Help$/ }).first();
    if (await helpItem.count()) await helpItem.click();
    else if (await helpBtn.count()) await helpBtn.click();
    await page.waitForTimeout(500);
    const newText = await page.locator('[role="dialog"]').getByText('What’s new in v1.0.2').count();
    const oldText = await page.locator('[role="dialog"]').getByText('What’s new in v1.0.1').count();
    check('HelpCenter shows v1.0.2', newText > 0 && oldText === 0, `new=${newText} old=${oldText}`);
    const closeBtn = page.locator('[role="dialog"] button[aria-label="Close Help Center"]');
    if (await closeBtn.count()) { await closeBtn.click(); await page.waitForTimeout(400); }
  } else {
    check('HelpCenter shows v1.0.2', false, 'no Menu button');
  }

  // ---- Item 6: all 11 tabs render ----
  const tabNames = ['Media', 'Audio', 'Text', 'Stickers', 'Effects', 'Transitions', 'Captions', 'Filters', 'Adjustment', 'Templates', 'AI avatar'];
  const tabResults = {};
  for (const name of tabNames) {
    const btn = tabBtn(page, name);
    if (!(await btn.count())) { tabResults[name] = 'missing button'; continue; }
    await btn.click();
    await page.waitForTimeout(500);
    const selected = await btn.getAttribute('aria-selected');
    const panelText = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Panel sections"]');
      return nav ? nav.textContent?.slice(0, 80) : '(no sub-nav)';
    });
    tabResults[name] = `selected=${selected} nav=${panelText}`;
  }
  check('all 11 tabs clickable', Object.values(tabResults).every((v) => !v.startsWith('missing')), JSON.stringify(tabResults));

  // ---- Item 2: no Pals in Transitions nav ----
  await tabBtn(page, 'Transitions').click();
  await page.waitForTimeout(600);
  const transNav = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Panel sections"]');
    return nav ? [...nav.querySelectorAll('button')].map((b) => b.textContent?.trim()) : [];
  });
  check('Transitions nav has no Pals', !transNav.includes('Pals'), JSON.stringify(transNav));

  // ---- Item 4: transition tiles are square ~70px ----
  const transThumb = await page.evaluate(() => {
    const img = document.querySelector('img[alt$="preview"]');
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  check('transition thumb ~70x70 square', !!transThumb && transThumb.w >= 60 && transThumb.w <= 80 && Math.abs(transThumb.w - transThumb.h) <= 2, JSON.stringify(transThumb));

  // ---- Item 4: filter tiles are square ~70px ----
  await tabBtn(page, 'Filters').click();
  await page.waitForTimeout(800);
  const filterThumb = await page.evaluate(() => {
    const img = document.querySelector('img[alt$="preview"]');
    if (!img) return null;
    const r = img.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  check('filter thumb ~70x70 square', !!filterThumb && filterThumb.w >= 60 && filterThumb.w <= 80 && Math.abs(filterThumb.w - filterThumb.h) <= 2, JSON.stringify(filterThumb));

  // ---- Item 4: effect tile containers are ~70px wide ----
  await tabBtn(page, 'Effects').click();
  await page.waitForTimeout(800);
  const effectTile = await page.evaluate(() => {
    const grid = [...document.querySelectorAll('div')].find((d) => d.className.includes('grid-cols-[repeat(auto-fill'));
    if (!grid || !grid.children.length) return null;
    const r = grid.children[0].getBoundingClientRect();
    return { w: Math.round(r.width), children: grid.children.length };
  });
  check('effect tile ~70px wide', !!effectTile && effectTile.w >= 60 && effectTile.w <= 80, JSON.stringify(effectTile));
  await page.screenshot({ path: path.join(OUT, 'effects-tiles.png') });

  // ---- Sample project: clip selected -> CC absent, Tools apply ----
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await dismissDialogs(page);
  await page.getByText('Sunset Coast').first().click();
  await page.waitForTimeout(1000);
  await timelineClip(page).first().click();
  await page.waitForTimeout(500);

  // ---- Item 5: no CC button in the floating preview toolbar ----
  const toolbarPresent = await page.getByRole('button', { name: 'Edit with AI' }).count();
  const ccCount = await page.getByRole('button', { name: 'CC', exact: true }).count();
  check('no CC button (toolbar present)', toolbarPresent > 0 && ccCount === 0, `toolbar=${toolbarPresent} cc=${ccCount}`);
  await page.screenshot({ path: path.join(OUT, 'preview-toolbar.png') });

  // ---- Item 3: Tools click applies directly, Intensity-only card ----
  // NOTE: no canvas-hash check here — the sample project's clip has no
  // media (procedural gradient background), so no CSS effect can change
  // its pixels. The preview-change check lives in
  // probe-tools-preview.mjs, which imports a real image and asserts the
  // hash changes after applying HD Cam 2.
  await tabBtn(page, 'Filters').click();
  await page.waitForTimeout(600);
  const toolBtn = page.locator('nav[aria-label="Panel sections"] button', { hasText: 'HD Cam 2' }).first();
  check('Tools HD Cam 2 in sub-nav', (await toolBtn.count()) > 0);
  if (await toolBtn.count()) {
    await toolBtn.click();
    await page.waitForTimeout(800);
    const card = page.locator('[aria-label="Applied tools"]');
    const cardText = (await card.count()) ? (await card.first().textContent()) ?? '' : '';
    const slider = page.locator('[aria-label="Applied tools"] input[type="range"]');
    const sliderCount = await slider.count();
    const sliderVal = sliderCount ? await slider.first().inputValue() : null;
    check('Tools click shows Applied tools card', (await card.count()) > 0 && cardText.includes('HD Cam 2'), cardText.slice(0, 120));
    check('Applied tools card has ONLY an Intensity slider at 100', sliderCount === 1 && sliderVal === '1', `sliders=${sliderCount} value=${sliderVal}`);
    // Intensity change persists.
    if (sliderCount) {
      await slider.first().fill('0.5');
      await page.waitForTimeout(400);
      const v = await slider.first().inputValue();
      check('Intensity slider changes to 50', v === '0.5', `value=${v}`);
    }
    await page.screenshot({ path: path.join(OUT, 'tools-applied.png') });
  }

  // ---- Item 6: template hover shows BOTH buttons in the viewport ----
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await dismissDialogs(page);
  const tplNav = page.getByRole('button', { name: 'Templates' }).first();
  if (await tplNav.count()) { await tplNav.click(); await page.waitForTimeout(1200); }
  const first = page.locator('article').first();
  check('template cards present', (await first.count()) > 0);
  if (await first.count()) {
    await first.hover({ force: true });
    await page.waitForTimeout(700);
    const hoverBtns = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter((b) => /^(Use template|Edit more)$/.test((b.textContent || '').trim()));
      return btns.map((b) => {
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        return {
          text: (b.textContent || '').trim(),
          inViewport: r.bottom <= 1080 && r.right <= 1920 && r.top >= 0 && r.left >= 0,
          visible: cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 0,
        };
      });
    });
    const useBtn = hoverBtns.find((b) => b.text === 'Use template');
    const editBtn = hoverBtns.find((b) => b.text === 'Edit more');
    check('hover shows Use template in viewport', !!useBtn && useBtn.inViewport && useBtn.visible, JSON.stringify(useBtn));
    check('hover shows Edit more in viewport', !!editBtn && editBtn.inViewport && editBtn.visible, JSON.stringify(editBtn));
    await page.screenshot({ path: path.join(OUT, 'template-hover.png') });
  }

  checks.pageErrors = errors;
  check('0 page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await fs.writeFile(path.join(OUT, 'verify.json'), JSON.stringify({ checks, fail }, null, 1));
  console.log(JSON.stringify({ checks, fail }, null, 1));
  console.log(fail.length === 0 ? 'ALL PASS' : `FAILURES: ${fail.join(', ')}`);
  await browser.close();
  process.exit(fail.length === 0 ? 0 : 1);
}
main();
