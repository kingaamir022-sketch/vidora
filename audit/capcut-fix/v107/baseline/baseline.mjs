#!/usr/bin/env node
/**
 * Vidora v1.0.7 BASELINE probe — measurement only, no source changes.
 * 5 viewports, each a fresh browser context. Per size:
 *  A. horizontal overflow (dashboard + editor)
 *  B. dashboard Templates page: first 5 card rects, grid columns, right-edge cutoff
 *  C. empty editor: column widths, canvas contain-fit, tab rail, top bar,
 *     Details scrollability, timeline toolbar/empty box, Media Import box
 *  D. page/console errors
 * Run: node audit/capcut-fix/v107/baseline/baseline.mjs (dev server :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v107', 'baseline');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

const SIZES = [
  { name: '1920x1080-dsf1', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  // User's real 150%-zoom case: physical 1920x1080 screen -> CSS viewport 1280x720
  { name: '1920x1080-dsf1.5-css1280x720', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 },
  { name: '1366x768-dsf1', viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 },
  { name: '1280x720-dsf1', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
  { name: '1024x768-dsf1', viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 },
];

const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), bottom: Math.round(b.bottom) }; };

async function dismissDialogs(page) {
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

function overflow() {
  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    bodyScrollWidth: document.body ? document.body.scrollWidth : null,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const results = {};

  for (const size of SIZES) {
    const ctx = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: size.deviceScaleFactor });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 300)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
    const res = { size: size.name, viewport: size.viewport, deviceScaleFactor: size.deviceScaleFactor };

    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await dismissDialogs(page);
    res.innerSize = await page.evaluate(() => ({ innerWidth: window.innerWidth, innerHeight: window.innerHeight, devicePixelRatio: window.devicePixelRatio }));

    // ---- A (dashboard) + B: Templates page ----
    res.dashboardOverflow = await page.evaluate(overflow);
    const tplNav = page.getByRole('button', { name: 'Templates' }).first();
    if (await tplNav.count()) { await tplNav.click(); await page.waitForTimeout(1500); }
    res.templates = await page.evaluate((vw) => {
      const rr = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), bottom: Math.round(b.bottom) }; };
      const cards = [...document.querySelectorAll('article')].slice(0, 5);
      const grid = cards[0]?.parentElement;
      const cs = grid ? getComputedStyle(grid) : null;
      const allCards = [...document.querySelectorAll('article')];
      const xs = [...new Set(allCards.map((a) => Math.round(a.getBoundingClientRect().x)))];
      return {
        cardCount: allCards.length,
        first5: cards.map((a) => ({ name: (a.querySelector('p')?.textContent || '').trim(), rect: rr(a) })),
        gridColumnsComputed: cs ? cs.gridTemplateColumns.split(' ').length : null,
        gridColumnsByX: xs.length,
        gridDisplay: cs ? cs.display : null,
        anyCardCutRight: allCards.some((a) => a.getBoundingClientRect().right > vw + 0.5),
        maxCardRight: allCards.length ? Math.round(Math.max(...allCards.map((a) => a.getBoundingClientRect().right))) : null,
        viewportWidth: vw,
      };
    }, size.viewport.width);
    res.dashboardOverflowAfterTemplates = await page.evaluate(overflow);
    await page.screenshot({ path: path.join(OUT, `dashboard-${size.name}.png`) });

    // ---- Editor: Create project ----
    const homeNav = page.getByRole('button', { name: 'Home' }).first();
    if (await homeNav.count()) { await homeNav.click(); await page.waitForTimeout(800); }
    const create = page.getByRole('button', { name: 'Create project' });
    if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
    await dismissDialogs(page);
    res.editorOverflow = await page.evaluate(overflow);

    // ---- C: editor geometry ----
    res.editor = await page.evaluate(({ vw, vh }) => {
      const rr = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), bottom: Math.round(b.bottom) }; };
      const tablist = document.querySelector('div[role="tablist"][aria-label="Editor tools"]');
      const scroller = tablist?.querySelector('div[class*="overflow-x-auto"]');
      const scrollerRect = scroller ? scroller.getBoundingClientRect() : null;
      // Left column: the panel container holding the tab rail (walk up to the
      // flex child of the editor main row). Use tablist's closest ancestor
      // whose parent is a flex row: approximate with tablist parent chain.
      let leftCol = tablist;
      while (leftCol && leftCol.parentElement && getComputedStyle(leftCol.parentElement).display !== 'flex') leftCol = leftCol.parentElement;
      const leftPanel = tablist?.closest('section, div[class*="flex-col"]');
      const preview = document.querySelector('section[aria-label="Preview"]');
      const timeline = document.querySelector('section[aria-label="Timeline"]');
      const aside = [...document.querySelectorAll('aside')].find((a) => /Details/.test(a.textContent || ''));
      const canvas = document.querySelector('canvas[aria-label="Preview canvas"]');
      const cont = canvas?.parentElement?.parentElement;
      const cr = canvas ? canvas.getBoundingClientRect() : null;
      const tabs = [...(tablist?.querySelectorAll('button[role="tab"]') || [])].map((b) => {
        const bb = b.getBoundingClientRect();
        const visibleW = scrollerRect ? Math.max(0, Math.min(bb.right, scrollerRect.right) - Math.max(bb.left, scrollerRect.left)) : Math.round(bb.width);
        const status = visibleW >= Math.round(bb.width) - 1 ? 'fully visible' : visibleW <= 0 ? 'hidden' : 'peeking';
        return { t: (b.textContent || '').trim(), x: Math.round(bb.x), w: Math.round(bb.width), visibleW: Math.round(visibleW), status };
      });
      // Top bar: rightmost visible button in the header (y < 70)
      const headerBtns = [...document.querySelectorAll('header button, div button')].filter((b) => { const bb = b.getBoundingClientRect(); return bb.top >= 0 && bb.top < 70 && bb.width > 0 && bb.height > 0; });
      const topBar = headerBtns.map((b) => ({ text: (b.textContent || '').trim().slice(0, 30) || b.getAttribute('aria-label') || b.getAttribute('title') || '?', right: Math.round(b.getBoundingClientRect().right) }));
      const rightmost = topBar.length ? topBar.reduce((a, b) => (b.right > a.right ? b : a)) : null;
      // Details scrollability
      let details = null;
      if (aside) {
        const modify = [...aside.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Modify');
        const resRow = [...aside.querySelectorAll('dt')].find((e) => (e.textContent || '').trim().startsWith('Resolution'));
        const before = { scrollHeight: aside.scrollHeight, clientHeight: aside.clientHeight, scrollTop: aside.scrollTop, modifyRect: rr(modify), resolutionRect: rr(resRow) };
        aside.scrollTop = aside.scrollHeight;
        const after = { scrollTop: aside.scrollTop, modifyRect: rr(modify), resolutionRect: rr(resRow) };
        const asideRect = aside.getBoundingClientRect();
        const modifyReachable = !!modify && (() => { const mb = modify.getBoundingClientRect(); return mb.top >= asideRect.top && mb.bottom <= asideRect.bottom; })();
        details = { ...before, afterScrollTop: after.scrollTop, modifyRectAfterScroll: after.modifyRect, modifyReachableByScrollingAside: modifyReachable, asideRect: rr(aside), rows: [...aside.querySelectorAll('dt')].map((e) => (e.textContent || '').trim()) };
        aside.scrollTop = 0;
      }
      // Timeline
      const emptyBox = timeline ? [...timeline.querySelectorAll('*')].find((e) => (e.textContent || '').includes('Drag material here and start to create')) : null;
      const toolbarBtns = timeline ? [...timeline.querySelectorAll('button')].map((b) => (b.textContent || '').trim() || b.getAttribute('aria-label') || b.getAttribute('title') || '?').filter(Boolean) : [];
      return {
        leftColumnRect: rr(leftCol),
        leftPanelRect: rr(leftPanel),
        tablistRect: rr(tablist),
        previewSectionRect: rr(preview),
        timelineSectionRect: rr(timeline),
        detailsAsideRect: rr(aside),
        canvasRect: cr ? { x: Math.round(cr.x), y: Math.round(cr.y), w: Math.round(cr.width), h: Math.round(cr.height) } : null,
        canvasAvail: cont ? { w: cont.clientWidth - 32, h: cont.clientHeight - 32, containerClientW: cont.clientWidth, containerClientH: cont.clientHeight } : null,
        canvasTouchesAvailW: cr && cont ? Math.abs(Math.round(cr.width) - (cont.clientWidth - 32)) <= 6 : null,
        canvasTouchesAvailH: cr && cont ? Math.abs(Math.round(cr.height) - (cont.clientHeight - 32)) <= 6 : null,
        tabs,
        leftChevron: !!tablist?.querySelector('button[aria-label="Scroll tabs left"]'),
        rightChevron: !!tablist?.querySelector('button[aria-label="Scroll tabs right"]'),
        topBarRightmost: rightmost,
        topBarClipped: rightmost ? rightmost.right > vw : null,
        topBarButtons: topBar,
        details,
        timelineToolbarVisible: !!timeline,
        timelineToolbarButtons: toolbarBtns.slice(0, 20),
        emptyTimelineBoxVisible: !!emptyBox,
        emptyTimelineBoxRect: rr(emptyBox),
        viewport: { w: vw, h: vh },
      };
    }, { vw: size.viewport.width, vh: size.viewport.height });

    // ---- C: Media tab Import box ----
    const mediaTab = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: 'Media' }).first();
    if (await mediaTab.count()) { await mediaTab.click(); await page.waitForTimeout(900); }
    res.mediaImport = await page.evaluate(() => {
      const rr = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), bottom: Math.round(b.bottom) }; };
      const els = [...document.querySelectorAll('button, div, label')].filter((e) => /import/i.test(e.textContent || '') && e.children.length <= 3);
      const box = els.find((e) => /import/i.test(e.textContent || '')) || null;
      const clickUpload = [...document.querySelectorAll('*')].find((e) => (e.textContent || '').includes('Click to upload'));
      return {
        importBoxVisible: !!box,
        importBoxRect: rr(box),
        importBoxText: box ? (box.textContent || '').trim().slice(0, 120) : null,
        hasClickToUpload: !!clickUpload,
      };
    });
    await page.screenshot({ path: path.join(OUT, `editor-${size.name}.png`) });

    res.errors = errors;
    results[size.name] = res;
    await ctx.close();
  }

  await fs.writeFile(path.join(OUT, 'baseline.json'), JSON.stringify(results, null, 1));

  // ---- Per-size summary table ----
  const line = (s) => console.log(s);
  line('\n=== Vidora v1.0.7 BASELINE (measurement only) ===');
  for (const size of SIZES) {
    const r0 = results[size.name];
    const e = r0.editor;
    const t = r0.templates;
    line(`\n--- ${size.name} (inner ${r0.innerSize.innerWidth}x${r0.innerSize.innerHeight}, dpr ${r0.innerSize.devicePixelRatio}) ---`);
    line(`A  overflow dashboard: scrollW ${r0.dashboardOverflow.scrollWidth} vs clientW ${r0.dashboardOverflow.clientWidth} -> ${r0.dashboardOverflow.overflowX ? 'FAIL overflow' : 'ok'}`);
    line(`A  overflow dashboard(Templates): scrollW ${r0.dashboardOverflowAfterTemplates.scrollWidth} vs clientW ${r0.dashboardOverflowAfterTemplates.clientWidth} -> ${r0.dashboardOverflowAfterTemplates.overflowX ? 'FAIL overflow' : 'ok'}`);
    line(`A  overflow editor:    scrollW ${r0.editorOverflow.scrollWidth} vs clientW ${r0.editorOverflow.clientWidth} -> ${r0.editorOverflow.overflowX ? 'FAIL overflow' : 'ok'}`);
    line(`B  templates: ${t.cardCount} cards, gridCols(computed)=${t.gridColumnsComputed} byX=${t.gridColumnsByX}, first5 w/h = ${t.first5.map((c) => `${c.rect?.w}x${c.rect?.h}`).join(', ')}`);
    line(`B  maxCardRight=${t.maxCardRight} vs viewport ${t.viewportWidth} -> ${t.anyCardCutRight ? 'FAIL card cut off at right' : 'ok'}`);
    line(`C  columns: left=${e.leftColumnRect?.w} leftPanel=${e.leftPanelRect?.w} preview=${e.previewSectionRect?.w} details=${e.detailsAsideRect?.w} timelineH=${e.timelineSectionRect?.h}`);
    line(`C  canvas: ${e.canvasRect ? `${e.canvasRect.w}x${e.canvasRect.h} @(${e.canvasRect.x},${e.canvasRect.y})` : 'MISSING'} avail ${e.canvasAvail ? `${e.canvasAvail.w}x${e.canvasAvail.h}` : 'n/a'} touchesW=${e.canvasTouchesAvailW} touchesH=${e.canvasTouchesAvailH}`);
    line(`C  tabs: ${e.tabs.map((x) => `${x.t}:${x.visibleW}/${x.w}(${x.status})`).join(' | ')}`);
    line(`C  chevrons: left=${e.leftChevron} right=${e.rightChevron}`);
    line(`C  topbar rightmost: ${e.topBarRightmost ? `${e.topBarRightmost.text} right=${e.topBarRightmost.right}` : 'none'} vs viewport ${size.viewport.width} -> ${e.topBarClipped ? 'FAIL clipped' : 'ok'}`);
    line(`C  details: scrollH=${e.details?.scrollHeight} clientH=${e.details?.clientHeight} modifyReachableByScroll=${e.details?.modifyReachableByScrollingAside} rows=${JSON.stringify(e.details?.rows)}`);
    line(`C  timeline: toolbarVisible=${e.timelineToolbarVisible} emptyBoxVisible=${e.emptyTimelineBoxVisible} emptyBoxRect=${JSON.stringify(e.emptyTimelineBoxRect)}`);
    line(`C  media Import: visible=${r0.mediaImport.importBoxVisible} rect=${JSON.stringify(r0.mediaImport.importBoxRect)} text=${JSON.stringify(r0.mediaImport.importBoxText)} clickToUpload=${r0.mediaImport.hasClickToUpload}`);
    line(`D  errors: ${r0.errors.length} ${r0.errors.length ? JSON.stringify(r0.errors.slice(0, 5)) : '(none)'}`);
  }
  line('\nFull data: audit/capcut-fix/v107/baseline/baseline.json');
  await browser.close();
}
main();
