#!/usr/bin/env node
/**
 * v1.0.7 verification: auto-fit at every screen size, no manual zoom.
 * The user's screenshots were at 150% zoom (CSS 1280x720 on a 1920x1080
 * screen): cut-off tabs, small canvas, squeezed panels. v1.0.7 makes
 * the layout fluid — the app must look right at every size by itself.
 *
 * Sizes (fresh context each): 1920x1080 dsf1, 1920x1080 dsf1.5 (the
 * user's real 150% case = CSS 1280x720), 1366x768, 1280x720, 1024x768.
 *
 * Per size: dashboard (no overflow, template cards visible), empty
 * editor (column widths, canvas contain-fit, tab rail counts, Details
 * reachable, timeline toolbar + empty box, top bar not clipped, Media
 * Import box), one content panel (Effects tiles: 2 cols ~130px at
 * 1920, 1 col wide tiles when the panel content is narrow).
 * Plus a 1920-only regression block (v1.0.5 state: canvas 756x424,
 * 7 tabs + Filters peeking, hover shows BOTH buttons, no Pals/CC/pill)
 * and a Shortcuts-dialog fit check at 720px height.
 * Run: node audit/capcut-fix/v107/verify.mjs (dev server :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v107');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';
const checks = {};
const fail = [];
function check(name, ok, detail = '') {
  checks[name] = ok ? 'PASS' : 'FAIL' + (detail ? ' — ' + detail : '');
  if (!ok) fail.push(name);
}
const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), bottom: Math.round(b.bottom) }; };

async function dismissDialogs(page) {
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

const SIZES = [
  { name: '1920x1080', viewport: { width: 1920, height: 1080 }, dsf: 1 },
  { name: '1920x1080-dsf1.5', viewport: { width: 1280, height: 720 }, dsf: 1.5 },
  { name: '1366x768', viewport: { width: 1366, height: 768 }, dsf: 1 },
  { name: '1280x720', viewport: { width: 1280, height: 720 }, dsf: 1 },
  { name: '1024x768', viewport: { width: 1024, height: 768 }, dsf: 1 },
];
// Expected fluid geometry per size (CSS px): left column min(610,32vw),
// tab width clamp(60,5vw,80), sub-nav clamp(120,10vw,185).
const EXPECT = {
  '1920x1080': { left: 610, tabW: 80, fullTabs: 7, subNav: 185, content: 400, timelineH: 288 },
  '1920x1080-dsf1.5': { left: 410, tabW: 64, fullTabs: 6, subNav: 128, content: 282, timelineH: 200 },
  '1366x768': { left: 437, tabW: 68, fullTabs: 6, subNav: 137, content: 300, timelineH: 205 },
  '1280x720': { left: 410, tabW: 64, fullTabs: 6, subNav: 128, content: 282, timelineH: 200 },
  '1024x768': { left: 328, tabW: 60, fullTabs: 5, subNav: 120, content: 208, timelineH: 205 },
};

async function measureSize(browser, size) {
  const exp = EXPECT[size.name];
  const tag = `[${size.name}]`;
  const ctx = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: size.dsf });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await dismissDialogs(page);

  // ---- Dashboard: Templates page ----
  const tplNav = page.getByRole('button', { name: 'Templates' }).first();
  if (await tplNav.count()) { await tplNav.click(); await page.waitForTimeout(1500); }
  const dash = await page.evaluate(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right) }; };
    const cards = [...document.querySelectorAll('article')].slice(0, 5).map((a) => r(a));
    const grid = cards.length ? document.querySelector('article')?.parentElement : null;
    const cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : null;
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cards,
      cols,
      maxCardRight: cards.length ? Math.max(...cards.map((c) => c.right)) : null,
      vw: window.innerWidth,
    };
  });
  checks[`dash-${size.name}`] = dash;
  check(`${tag} dashboard: no horizontal overflow`, dash.overflow === 0, `overflow=${dash.overflow}`);
  check(`${tag} template cards visible, none cut off at right edge`, dash.cards.every((c) => c.h > 100) && (dash.maxCardRight ?? 0) <= dash.vw - 10, `cards=${JSON.stringify(dash.cards.map((c) => [c.w, c.h]))} maxRight=${dash.maxCardRight} vw=${dash.vw}`);
  await page.screenshot({ path: path.join(OUT, `verify-dashboard-${size.name}.png`) });

  // ---- Editor: empty project ----
  const homeNav = page.getByRole('button', { name: 'Home' }).first();
  if (await homeNav.count()) { await homeNav.click(); await page.waitForTimeout(800); }
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  await dismissDialogs(page);

  const ed = await page.evaluate(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right) }; };
    const list = document.querySelector('div[role="tablist"][aria-label="Editor tools"]');
    const scroller = list?.querySelector('div[class*="overflow-x-auto"]');
    const scRect = scroller ? scroller.getBoundingClientRect() : null;
    const tabs = [...(list?.querySelectorAll('button[role="tab"]') || [])].map((b) => {
      const bb = b.getBoundingClientRect();
      const visibleW = scRect ? Math.max(0, Math.min(bb.right, scRect.right) - Math.max(bb.left, scRect.left)) : 0;
      return { t: (b.textContent || '').trim(), w: Math.round(bb.width), visibleW: Math.round(visibleW) };
    });
    const leftCol = list?.closest('div[class*="min(610px,32vw)"]');
    const preview = document.querySelector('section[aria-label="Preview"]');
    const aside = [...document.querySelectorAll('aside')].find((a) => /Details/.test(a.textContent || ''));
    const tl = document.querySelector('section[aria-label="Timeline"]');
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    const cont = c?.parentElement?.parentElement;
    const cr = c ? c.getBoundingClientRect() : null;
    const headerBtns = [...document.querySelectorAll('header button')].filter((b) => b.getBoundingClientRect().top < 70);
    const maxBtnRight = headerBtns.length ? Math.max(...headerBtns.map((b) => b.getBoundingClientRect().right)) : null;
    const subNav = document.querySelector('nav[aria-label="Panel sections"]');
    const content = document.querySelector('.panel-content');
    const modify = aside ? [...aside.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Modify') : null;
    const emptyBox = tl ? [...tl.querySelectorAll('*')].find((e) => (e.textContent || '').includes('Drag material here and start to create')) : null;
    const importBtn = document.querySelector('button[aria-label="Import media"]');
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      leftW: leftCol ? Math.round(leftCol.getBoundingClientRect().width) : null,
      previewW: preview ? Math.round(preview.getBoundingClientRect().width) : null,
      detailsW: aside ? Math.round(aside.getBoundingClientRect().width) : null,
      subNavW: subNav ? Math.round(subNav.getBoundingClientRect().width) : null,
      contentW: content ? Math.round(content.getBoundingClientRect().width) : null,
      canvas: cr ? { w: Math.round(cr.width), h: Math.round(cr.height) } : null,
      avail: cont ? { w: cont.clientWidth - 32, h: cont.clientHeight - 32 } : null,
      tabs,
      leftChevron: !!list?.querySelector('button[aria-label="Scroll tabs left"]'),
      rightChevron: !!list?.querySelector('button[aria-label="Scroll tabs right"]'),
      topBarRight: maxBtnRight ? Math.round(maxBtnRight) : null,
      vw: window.innerWidth,
      detailsScroll: aside ? { sh: aside.scrollHeight, ch: aside.clientHeight } : null,
      modifyVisible: modify ? (() => { const b = modify.getBoundingClientRect(); const a = aside.getBoundingClientRect(); return b.bottom <= a.bottom && b.top >= a.top; })() : null,
      timelineH: tl ? Math.round(tl.getBoundingClientRect().height) : null,
      timelineToolbar: !!tl,
      emptyBoxVisible: !!emptyBox,
      importBtn: r(importBtn),
      detailsRows: aside ? [...aside.querySelectorAll('dt')].map((e) => (e.textContent || '').trim()) : [],
    };
  });
  checks[`editor-${size.name}`] = ed;
  check(`${tag} editor: no horizontal overflow`, ed.overflow === 0, `overflow=${ed.overflow}`);
  check(`${tag} left column ${exp.left}px`, ed.leftW !== null && Math.abs(ed.leftW - exp.left) <= 2, `leftW=${ed.leftW}`);
  check(`${tag} sub-nav ${exp.subNav}px, content ${exp.content}px`, ed.subNavW !== null && Math.abs(ed.subNavW - exp.subNav) <= 2 && ed.contentW !== null && Math.abs(ed.contentW - exp.content) <= 2, `subNav=${ed.subNavW} content=${ed.contentW}`);
  check(`${tag} canvas contain-fits preview area`, !!ed.canvas && !!ed.avail && (Math.abs(ed.canvas.w - ed.avail.w) <= 6 || Math.abs(ed.canvas.h - ed.avail.h) <= 6), JSON.stringify({ canvas: ed.canvas, avail: ed.avail }));
  const fullTabs = ed.tabs.filter((t) => t.visibleW >= t.w - 1).length;
  check(`${tag} ${exp.fullTabs} tabs fully visible (tab ${exp.tabW}px)`, fullTabs === exp.fullTabs && ed.tabs.every((t) => Math.abs(t.w - exp.tabW) <= 1), `full=${fullTabs} widths=${JSON.stringify(ed.tabs.map((t) => t.w))} visible=${JSON.stringify(ed.tabs.map((t) => t.visibleW))}`);
  check(`${tag} top bar not clipped`, ed.topBarRight !== null && ed.topBarRight <= ed.vw - 4, `right=${ed.topBarRight} vw=${ed.vw}`);
  check(`${tag} Details rows present, Modify reachable`, ed.detailsRows.length >= 7 && ed.modifyVisible === true, `rows=${JSON.stringify(ed.detailsRows)} modifyVisible=${ed.modifyVisible} scroll=${JSON.stringify(ed.detailsScroll)}`);
  check(`${tag} timeline ${exp.timelineH}px, toolbar + empty box visible`, ed.timelineH !== null && Math.abs(ed.timelineH - exp.timelineH) <= 3 && ed.timelineToolbar && ed.emptyBoxVisible, `h=${ed.timelineH}`);
  check(`${tag} Media Import box visible`, !!ed.importBtn && ed.importBtn.w > 50 && ed.importBtn.h > 20 && ed.importBtn.right <= ed.vw, JSON.stringify(ed.importBtn));
  await page.screenshot({ path: path.join(OUT, `verify-editor-${size.name}.png`) });

  // ---- Active tab auto-scrolls into view (BUG-CF-038) ----
  const avatarTab = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: 'AI avatar' }).first();
  if (await avatarTab.count()) { await avatarTab.click(); await page.waitForTimeout(1200); }
  const scrolled = await page.evaluate(() => {
    const list = document.querySelector('div[role="tablist"][aria-label="Editor tools"]');
    const scroller = list?.querySelector('div[class*="overflow-x-auto"]');
    const scRect = scroller ? scroller.getBoundingClientRect() : null;
    const active = list?.querySelector('button[role="tab"][aria-selected="true"]');
    if (!active || !scRect) return null;
    const bb = active.getBoundingClientRect();
    const visibleW = Math.max(0, Math.min(bb.right, scRect.right) - Math.max(bb.left, scRect.left));
    return { label: (active.textContent || '').trim(), visibleW: Math.round(visibleW), w: Math.round(bb.width), scrollLeft: Math.round(scroller.scrollLeft) };
  });
  checks[`activeTab-${size.name}`] = scrolled;
  check(`${tag} active tab (AI avatar) scrolls into view`, !!scrolled && scrolled.visibleW >= scrolled.w - 2 && scrolled.scrollLeft > 0, JSON.stringify(scrolled));
  // Back to Media for the tiles check.
  const mediaTab = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: 'Media' }).first();
  if (await mediaTab.count()) { await mediaTab.click(); await page.waitForTimeout(900); }

  // ---- Effects tiles: 2 cols ~130px at 1920, 1 col wide tiles when narrow ----
  const effTab = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: 'Effects' }).first();
  if (await effTab.count()) { await effTab.click(); await page.waitForTimeout(1000); }
  const tiles = await page.evaluate(() => {
    const grids = [...document.querySelectorAll('div[class*="grid"]')].filter((g) => g.querySelector('img'));
    const grid = grids[grids.length - 1];
    if (!grid) return null;
    const cs = getComputedStyle(grid);
    const tileW = [...grid.children].slice(0, 4).map((t) => Math.round(t.getBoundingClientRect().width));
    return { columns: cs.gridTemplateColumns.split(' ').length, tileW };
  });
  checks[`tiles-${size.name}`] = tiles;
  if (size.name === '1024x768') {
    check(`${tag} narrow panel: tiles collapse to 1 wide column`, !!tiles && tiles.columns === 1 && tiles.tileW.every((w) => w >= 150), JSON.stringify(tiles));
  } else {
    check(`${tag} tiles are 2 columns`, !!tiles && tiles.columns === 2, JSON.stringify(tiles));
    if (size.name === '1920x1080') {
      check(`${tag} 1920 tiles ~130px (CapCut parity)`, !!tiles && tiles.tileW.every((w) => w >= 120 && w <= 140), JSON.stringify(tiles?.tileW));
    }
  }
  await page.screenshot({ path: path.join(OUT, `verify-effects-${size.name}.png`) });

  // ---- Shortcuts dialog fits at short heights ----
  if (size.viewport.height <= 768) {
    const menuBtn = page.getByRole('button', { name: 'Menu', exact: true }).first();
    let opened = false;
    if (await menuBtn.count()) {
      await menuBtn.click(); await page.waitForTimeout(500);
      const item = page.getByRole('menuitem', { name: /shortcuts/i }).first();
      if (await item.count()) { await item.click(); await page.waitForTimeout(700); opened = true; }
      else { await page.keyboard.press('Escape'); }
    }
    const dlg = await page.evaluate(() => {
      const d = document.querySelector('div[role="dialog"][aria-label="Keyboard shortcuts"] > div');
      if (!d) return null;
      const b = d.getBoundingClientRect();
      return { h: Math.round(b.height), bottom: Math.round(b.bottom), vh: window.innerHeight, scrollable: d.scrollHeight > d.clientHeight + 4 };
    });
    checks[`shortcuts-${size.name}`] = { opened, dlg };
    check(`${tag} Shortcuts dialog opens and fits the viewport (scrolls inside if tall)`, opened && !!dlg && dlg.bottom <= dlg.vh, JSON.stringify(dlg));
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `verify-shortcuts-${size.name}.png`) });
  }

  checks[`errors-${size.name}`] = errors;
  check(`${tag} zero page errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
  return errors;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

  for (const size of SIZES) {
    await measureSize(browser, size);
  }

  // ---- 1920-only regression: v1.0.5 state must be unchanged ----
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await dismissDialogs(page);
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  await dismissDialogs(page);
  const reg = await page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    const cr = c ? c.getBoundingClientRect() : null;
    const list = document.querySelector('div[role="tablist"][aria-label="Editor tools"]');
    const scroller = list?.querySelector('div[class*="overflow-x-auto"]');
    const scRect = scroller ? scroller.getBoundingClientRect() : null;
    const tabs = [...(list?.querySelectorAll('button[role="tab"]') || [])].map((b) => {
      const bb = b.getBoundingClientRect();
      return { t: (b.textContent || '').trim(), visibleW: scRect ? Math.round(Math.max(0, Math.min(bb.right, scRect.right) - Math.max(bb.left, scRect.left))) : 0 };
    });
    const sec = document.querySelector('section[aria-label="Preview"]');
    return {
      canvas: cr ? { w: Math.round(cr.width), h: Math.round(cr.height) } : null,
      fullTabs: tabs.filter((t) => t.visibleW >= 78).map((t) => t.t),
      filtersPeek: tabs.find((t) => t.t === 'Filters')?.visibleW ?? 0,
      header: (sec?.textContent || '').includes('Player-Timeline 01'),
      noClickToUpload: !document.body.innerText.includes('Click to upload'),
      noPals: !document.body.innerText.includes('Pals'),
      noCC: sec ? ![...sec.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'CC') : false,
    };
  });
  checks.regression1920 = reg;
  check('1920 regression: canvas 756x424', !!reg.canvas && Math.abs(reg.canvas.w - 756) <= 6 && Math.abs(reg.canvas.h - 424) <= 6, JSON.stringify(reg.canvas));
  check('1920 regression: 7 tabs + Filters peeking', reg.fullTabs.length === 7 && reg.filtersPeek >= 10 && reg.filtersPeek < 78, `full=${reg.fullTabs.join(',')} peek=${reg.filtersPeek}`);
  check('1920 regression: Player-Timeline 01, no Click to upload, no Pals, no CC', reg.header && reg.noClickToUpload && reg.noPals && reg.noCC, JSON.stringify(reg));
  // Hover shows BOTH buttons at 1920. Back to the dashboard first:
  // in the editor there is no "Home" button — the TopBar back button
  // is aria-label "Back to dashboard".
  const backBtn = page.getByRole('button', { name: 'Back to dashboard' }).first();
  if (await backBtn.count()) { await backBtn.click(); await page.waitForTimeout(1000); }
  const tplNav = page.getByRole('button', { name: 'Templates' }).first();
  if (await tplNav.count()) { await tplNav.click(); await page.waitForTimeout(1500); }
  const firstCard = page.locator('article').first();
  await firstCard.hover({ force: true });
  await page.waitForTimeout(700);
  const hover = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /^(Use template|Edit more)$/.test((b.textContent || '').trim()));
    return btns.map((b) => { const bb = b.getBoundingClientRect(); return { text: (b.textContent || '').trim(), inViewport: bb.bottom <= 1080 && bb.right <= 1920 && bb.top >= 0 && bb.left >= 0 }; });
  });
  checks.hover1920 = hover;
  check('1920 regression: hover shows BOTH Use template and Edit more', hover.some((b) => b.text === 'Use template' && b.inViewport) && hover.some((b) => b.text === 'Edit more' && b.inViewport), JSON.stringify(hover));
  await page.screenshot({ path: path.join(OUT, 'verify-1920-regression.png') });
  checks.pageErrors1920 = errors;
  check('1920 regression: zero page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();

  checks.ok = fail.length === 0;
  await fs.writeFile(path.join(OUT, 'verify.json'), JSON.stringify(checks, null, 1));
  console.log(JSON.stringify(checks, null, 1));
  await browser.close();
  process.exit(checks.ok ? 0 : 1);
}
main();
