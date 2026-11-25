#!/usr/bin/env node
/**
 * v1.0.2 FINAL comparison (coordinator): fresh Playwright pass at
 * 1920x1080, deviceScaleFactor 1, 100% zoom, against the dev server.
 * Checks every D-item geometrically + screenshots the key screens.
 * Run: node audit/capcut-fix/v102/final-compare.mjs (dev server :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'final');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';
const checks = {};
const fail = [];
function check(name, ok, detail = '') {
  checks[name] = ok ? 'PASS' : 'FAIL' + (detail ? ' — ' + detail : '');
  if (!ok) fail.push(name);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  const shot = (n) => page.screenshot({ path: path.join(OUT, n) });
  const tabBtn = (n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();
  const rect = (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) }; });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(500); }
  // Dismiss "Manage software updates" modal if it appears.
  const updModalOk = page.getByRole('button', { name: 'OK' });
  if (await updModalOk.count()) { await updModalOk.first().click().catch(() => {}); await page.waitForTimeout(400); }

  // ---- Dashboard -> Create project (empty editor) ----
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  const dismiss2 = page.getByRole('button', { name: 'OK' });
  if (await dismiss2.count()) { await dismiss2.first().click().catch(() => {}); await page.waitForTimeout(400); }

  // ---- D1 geometry at 100% ----
  const geo = await page.evaluate(() => {
    const left = document.querySelector('div[class*="min(610px"]');
    const details = document.querySelector('aside[class*="min(520px"]');
    const preview = document.querySelector('section[aria-label="Preview"]') || document.querySelector('main');
    const r = (el) => el ? { x: Math.round(el.getBoundingClientRect().x), w: Math.round(el.getBoundingClientRect().width) } : null;
    return { left: r(left), details: r(details), preview: r(preview) };
  });
  checks.geometry = geo;
  check('D1 left=610', geo.left?.w === 610, JSON.stringify(geo.left));
  check('D1 details=520', geo.details?.w === 520, JSON.stringify(geo.details));
  check('D1 preview~790', !!geo.preview && geo.preview.w >= 780 && geo.preview.w <= 800, JSON.stringify(geo.preview));

  // Tab rail: CapCut shows through ~Filters + ">"
  const tabs = await page.evaluate(() => [...document.querySelectorAll('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]')].map((b) => ({ t: b.textContent?.trim(), vis: b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().left < 610 })));
  checks.tabs = tabs;
  check('D1/D10 rail ~7 visible + scroll', tabs.filter((t) => t.vis).length >= 6 && tabs.filter((t) => t.vis).length <= 8, JSON.stringify(tabs.map((t) => t.t + ':' + (t.vis ? 'v' : 'h'))));

  // ---- D2 preview header + no upload button + play style ----
  const headerCount = await page.locator('section[aria-label="Preview"]').getByText('Player-Timeline 01').count();
  check('D2 header Player-Timeline 01', headerCount >= 1, `matches=${headerCount}`);
  check('D2 no Click-to-upload', (await page.getByText('Click to upload').count()) === 0);
  const playBtn = page.locator('section[aria-label="Preview"] button[aria-label="Play"], section[aria-label="Preview"] button[aria-label="Pause"]').first();
  if (await playBtn.count()) {
    const cls = await playBtn.evaluate((el) => getComputedStyle(el).backgroundColor + '|' + getComputedStyle(el).borderRadius);
    check('D2 play plain (not teal circle)', !cls.includes('0, 217, 217') && !cls.includes('0,217,217'), cls);
  } else check('D2 play button present', false);

  // ---- D3 Import box ----
  const importBox = page.locator('button', { hasText: 'Drag and drop videos, photos, and audio files here' }).first();
  if (await importBox.count()) {
    const r = await rect(importBox);
    const plus = importBox.locator('span').first();
    const pr = await rect(plus);
    check('D3 import box small + inline', r.h <= 120 && Math.abs(pr.y + pr.h / 2 - (r.y + 30)) < 40, `box=${r.w}x${r.h} plus=${pr.w}x${pr.h}`);
    check('D3 no Browse files button', (await page.getByRole('button', { name: 'Browse files' }).count()) === 0);
  } else check('D3 import box present', false);

  // ---- D5 Details rows (empty project) ----
  const detailsText = await page.locator('aside').last().textContent();
  check('D5 no Color space in empty state', !(detailsText ?? '').includes('Color space'));
  check('D5 Arrange layers text', (detailsText ?? '').includes('Turned on'));
  check('D5 no Proxy note', !(detailsText ?? '').includes('Proxy files are not created'));
  check('D5 Aspect Original', (detailsText ?? '').includes('Original'));
  check('D5 Resolution Adapted only', (detailsText ?? '').includes('Adapted') && !(detailsText ?? '').includes('Adapted ('));
  const modify = page.getByRole('button', { name: 'Modify' }).first();
  if (await modify.count()) {
    const bg = await modify.evaluate((el) => getComputedStyle(el).backgroundColor);
    check('D5 Modify gray', bg === 'rgb(61, 61, 61)', bg);
  } else check('D5 Modify present', false);

  // ---- D7 top bar ----
  check('D7 no cloud icon', (await page.locator('header span[title="All changes saved"], header [title="All changes saved"]').count()) === 0);
  check('D7 no … menu', (await page.getByRole('button', { name: '…' }).count()) === 0);

  // ---- D8/D9 timeline ----
  const emptyBox = await page.locator('section[aria-label="Timeline"]').textContent();
  check('D8 empty box text + left', (emptyBox ?? '').includes('Drag material here and start to create'));
  const toolbarTime = await page.locator('section[aria-label="Timeline"]').locator('text=00:00:00:00').count();
  check('D9 no timecode in toolbar', toolbarTime === 0, `matches=${toolbarTime}`);
  check('D9 no keyboard icon', (await page.locator('button[aria-label="Keyboard shortcuts"]').count()) === 0);
  await shot('final-editor-empty.png');

  // ---- D4 cards visible ----
  for (const c of ['Generate', 'AI avatars', 'Record']) {
    check('D4 card visible: ' + c, await page.locator('button', { hasText: c }).first().isVisible().catch(() => false));
  }

  // ---- 1280 viewport: no overflow of import box / preview ----
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(700);
  const g1280 = await page.evaluate(() => {
    const col = document.querySelector('div[class*="min(610px"]');
    const importBtn = [...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes('Drag and drop videos'));
    const r = (el) => el ? { right: Math.round(el.getBoundingClientRect().right), w: Math.round(el.getBoundingClientRect().width) } : null;
    return { col: r(col), importBtn: r(importBtn) };
  });
  checks.g1280 = g1280;
  check('D1 1280 left~410', !!g1280.col && g1280.col.w >= 400 && g1280.col.w <= 420, JSON.stringify(g1280.col));
  check('D1 1280 import inside column', !!g1280.importBtn && !!g1280.col && g1280.importBtn.right <= g1280.col.right + 2, JSON.stringify(g1280));
  await shot('final-editor-1280.png');
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(600);

  // ---- All 11 tabs open without errors (D10) ----
  const tabShots = [];
  for (const t of ['Media', 'Audio', 'Text', 'Stickers', 'Effects', 'Transitions', 'Captions', 'Filters', 'Adjustment', 'Templates', 'AI avatar']) {
    try {
      await tabBtn(t).click();
      await page.waitForTimeout(500);
      tabShots.push(t);
    } catch (e) { check('D10 tab opens: ' + t, false, String(e).slice(0, 100)); }
  }
  check('D10 all 11 tabs open', tabShots.length === 11, tabShots.join(','));
  await shot('final-tab-ai-avatar.png');

  // ---- Editor Templates panel thumbnails (W4 follow-up #1) ----
  await tabBtn('Templates').click();
  await page.waitForTimeout(800);
  const tplPanel = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter((i) => { const r = i.getBoundingClientRect(); return r.left < 620 && r.top > 120 && r.width > 50; });
    return { imgs: imgs.length, srcs: imgs.slice(0, 6).map((i) => (i.getAttribute('src') ?? '').slice(0, 60)) };
  });
  checks.templatesPanel = tplPanel;
  await shot('final-templates-panel.png');

  // ---- Sample project: Effects apply + D16 tiles + transitions ----
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const ag2 = page.getByRole('button', { name: 'Agree and continue' });
  if (await ag2.count()) { await ag2.first().click(); await page.waitForTimeout(400); }
  const sample = page.getByText('Sunset Coast').first();
  if (await sample.count()) {
    await sample.click();
    await page.waitForTimeout(1000);
    await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
    await page.waitForTimeout(600);
    // Effects: applied card above grid?
    await tabBtn('Effects').click();
    await page.waitForTimeout(600);
    const blur = page.locator('button', { hasText: 'Blur' }).first();
    if (await blur.count()) { await blur.click(); await page.waitForTimeout(700); }
    const applied = await page.evaluate(() => {
      const h = [...document.querySelectorAll('h3')].find((x) => x.textContent?.includes('Applied effects'));
      if (!h) return null;
      const sec = h.closest('section');
      const r = sec?.getBoundingClientRect();
      return { text: sec?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120), top: Math.round(r?.top ?? -1), bottom: Math.round(r?.bottom ?? -1) };
    });
    checks.appliedCard = applied;
    check('D14 applied card visible w/o scroll', !!applied && applied.bottom <= 792, JSON.stringify(applied));
    // D16 filters photo thumbs
    await tabBtn('Filters').click();
    await page.waitForTimeout(700);
    const filterThumbs = await page.evaluate(() => {
      const col = document.querySelector('div[class*="min(610px"]') ?? document;
      return [...col.querySelectorAll('img')].filter((i) => { const r = i.getBoundingClientRect(); return r.width > 40 && r.height > 30 && r.left < 620 && r.top > 120; }).length;
    });
    checks.filterThumbs = filterThumbs;
    check('D16 filter tiles are photos', filterThumbs >= 10, `imgs=${filterThumbs}`);
    await shot('final-filters.png');
    // D16 transitions photo thumbs
    await tabBtn('Transitions').click();
    await page.waitForTimeout(700);
    const transThumbs = await page.evaluate(() => {
      const col = document.querySelector('div[class*="min(610px"]') ?? document;
      return [...col.querySelectorAll('img, canvas')].filter((i) => { const r = i.getBoundingClientRect(); return r.width > 40 && r.height > 30 && r.left < 620 && r.top > 120; }).length;
    });
    checks.transThumbs = transThumbs;
    check('D16 transition tiles are photos', transThumbs >= 5, `imgs=${transThumbs}`);
    await shot('final-transitions.png');
    // Template applied (D12.5/D12.1): go to dashboard templates via Templates tab "Use template"
    await tabBtn('Templates').click();
    await page.waitForTimeout(800);
    await shot('final-templates-tab.png');
  } else {
    check('sample project present', false);
  }

  checks.pageErrors = errors;
  check('zero page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await fs.writeFile(path.join(OUT, 'final-compare.json'), JSON.stringify(checks, null, 2));
  console.log(JSON.stringify(checks, null, 2));
  console.log('FAILURES:', fail.length ? fail.join(' | ') : 'none');
  await browser.close();
  console.log('FINAL COMPARE done in', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
