#!/usr/bin/env node
/**
 * v1.0.5 verification (coordinator): Playwright at 1920x1080/100% on the
 * dev server, plus a 150%-zoom short-window context for the canvas fit.
 * Covers the round's items:
 *  1. Template cards: every dashboard card's TemplateThumb has non-zero
 *     height, position absolute, bg img loaded, title span visible; the
 *     hover popup thumb too; the editor Templates panel thumb too.
 *     (Pixel proof — non-black % per card — comes from pixel-check.py
 *     reading verify-templates.png + verify.json.)
 *  2. Preview canvas: empty project canvas fills the preview container
 *     (contain fit) at 100% AND at 150% zoom with a short window.
 *  3. Tab rail: 7 tabs fully visible + Filters peeking ("Fi") like #04;
 *     no left chevron until scrolled.
 *  4. Pro button: gray #4F4F4F fill, white text, lavender ◆ diamond
 *     (IconPro path starts "M12 2"); "◆ Pro" badge on Edit more.
 *  5. Captions: sub-nav has all 9 items; Auto view has Language +
 *     Transcript; Templates view has search + style tiles + bottom bar.
 *  6. Empty editor vs #04: Details rows + Modify, bottom bar, timeline
 *     toolbar, empty timeline box left-aligned, values not truncated.
 *  7. Regression: template hover shows BOTH buttons; tiles 2-col ~130px
 *     photo thumbnails; no "Pals", no "CC", no floating pill.
 * Run: node audit/capcut-fix/v105/verify.mjs (dev server :5200)
 * Then: python3 audit/capcut-fix/v105/pixel-check.py
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v105');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';
const checks = {};
const fail = [];
function check(name, ok, detail = '') {
  checks[name] = ok ? 'PASS' : 'FAIL' + (detail ? ' — ' + detail : '');
  if (!ok) fail.push(name);
}
const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };

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

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await dismissDialogs(page);

  // ================= Item 1: dashboard template cards =================
  const tplNav = page.getByRole('button', { name: 'Templates' }).first();
  if (await tplNav.count()) { await tplNav.click(); await page.waitForTimeout(1500); }
  const cardInfo = await page.evaluate(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    return [...document.querySelectorAll('article')].slice(0, 5).map((a) => {
      const thumb = a.querySelector('[role="img"]');
      const img = thumb?.querySelector('img');
      const title = [...(thumb?.querySelectorAll('span') || [])].find((s) => (s.textContent || '').trim().length > 0);
      return {
        name: (a.querySelector('p')?.textContent || '').trim(),
        thumbRect: r(thumb),
        thumbPosition: thumb ? getComputedStyle(thumb).position : null,
        imgLoaded: img ? (img.complete && img.naturalWidth > 0) : null,
        titleText: title ? (title.textContent || '').trim() : null,
        titleRect: r(title),
      };
    });
  });
  checks.templateCards = cardInfo;
  check('template thumbs have non-zero height', cardInfo.every((c) => c.thumbRect && c.thumbRect.h > 100), JSON.stringify(cardInfo.map((c) => c.thumbRect)));
  check('template thumbs are position:absolute', cardInfo.every((c) => c.thumbPosition === 'absolute'), JSON.stringify(cardInfo.map((c) => c.thumbPosition)));
  check('template bg imgs loaded', cardInfo.filter((c) => c.imgLoaded !== null).every((c) => c.imgLoaded === true), JSON.stringify(cardInfo.map((c) => c.imgLoaded)));
  check('template title spans visible', cardInfo.every((c) => c.titleRect && c.titleRect.h > 0 && (c.titleText || '').length > 0), JSON.stringify(cardInfo.map((c) => [c.titleText, c.titleRect?.h])));

  // Hover popup thumb + both buttons.
  const firstCard = page.locator('article').first();
  await firstCard.hover({ force: true });
  await page.waitForTimeout(700);
  const hoverInfo = await page.evaluate(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const popup = document.querySelector('article [class*="z-30"] [role="img"]');
    const btns = [...document.querySelectorAll('button')].filter((b) => /^(Use template|Edit more)$/.test((b.textContent || '').trim()));
    return {
      popupThumbRect: r(popup),
      popupThumbPosition: popup ? getComputedStyle(popup).position : null,
      buttons: btns.map((b) => ({ text: (b.textContent || '').trim(), rect: r(b), inViewport: (() => { const bb = b.getBoundingClientRect(); return bb.bottom <= 1080 && bb.right <= 1920 && bb.top >= 0 && bb.left >= 0; })() })),
      proBadge: document.body.innerText.includes('◆ Pro'),
    };
  });
  checks.templateHover = hoverInfo;
  check('hover popup thumb has non-zero height', !!hoverInfo.popupThumbRect && hoverInfo.popupThumbRect.h > 100, JSON.stringify(hoverInfo.popupThumbRect));
  check('hover shows BOTH Use template and Edit more', hoverInfo.buttons.some((b) => b.text === 'Use template' && b.inViewport) && hoverInfo.buttons.some((b) => b.text === 'Edit more' && b.inViewport), JSON.stringify(hoverInfo.buttons));
  check('Edit more carries ◆ Pro badge', hoverInfo.proBadge === true);
  await page.screenshot({ path: path.join(OUT, 'verify-templates.png') });
  await page.screenshot({ path: path.join(OUT, 'verify-templates-hover.png') });

  // ================= Editor: create empty project =================
  const homeNav = page.getByRole('button', { name: 'Home' }).first();
  if (await homeNav.count()) { await homeNav.click(); await page.waitForTimeout(800); }
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  await dismissDialogs(page);

  // ================= Item 2: preview canvas fill (100%) =================
  const geo = await page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    if (!c) return null;
    const wrap = c.parentElement;
    const cont = wrap?.parentElement;
    const r = c.getBoundingClientRect();
    return {
      canvas: { w: Math.round(r.width), h: Math.round(r.height) },
      avail: cont ? { w: cont.clientWidth - 32, h: cont.clientHeight - 32 } : null,
      wrapOffset: wrap ? { w: wrap.offsetWidth, h: wrap.offsetHeight } : null,
    };
  });
  checks.canvasGeometry100 = geo;
  const fillsW = geo && Math.abs(geo.canvas.w - (geo.avail?.w ?? 0)) <= 6;
  const fillsH = geo && Math.abs(geo.canvas.h - (geo.avail?.h ?? 0)) <= 6;
  check('empty canvas fills preview area (contain fit)', !!(fillsW || fillsH), JSON.stringify(geo));

  // ================= Item 3: tab rail =================
  const rail = await page.evaluate(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const list = document.querySelector('div[role="tablist"][aria-label="Editor tools"]');
    const scroller = list?.querySelector('div[class*="overflow-x-auto"]');
    const scrollerRect = scroller ? scroller.getBoundingClientRect() : null;
    const tabs = [...(list?.querySelectorAll('button[role="tab"]') || [])].map((b) => {
      const bb = b.getBoundingClientRect();
      const visibleW = scrollerRect ? Math.max(0, Math.min(bb.right, scrollerRect.right) - Math.max(bb.left, scrollerRect.left)) : 0;
      return { t: (b.textContent || '').trim(), x: Math.round(bb.x), w: Math.round(bb.width), visibleW: Math.round(visibleW) };
    });
    return {
      scrollerRect: scrollerRect ? { x: Math.round(scrollerRect.x), w: Math.round(scrollerRect.width) } : null,
      leftChevron: !!list?.querySelector('button[aria-label="Scroll tabs left"]'),
      rightChevron: !!list?.querySelector('button[aria-label="Scroll tabs right"]'),
      tabs,
    };
  });
  checks.tabRail = rail;
  const fullTabs = rail.tabs.filter((t) => t.visibleW >= 78).map((t) => t.t);
  const filtersPeek = rail.tabs.find((t) => t.t === 'Filters')?.visibleW ?? 0;
  check('7 tabs fully visible + Filters peeking like #04', fullTabs.length === 7 && filtersPeek >= 10 && filtersPeek < 78, `full=${fullTabs.join(',')} filtersPeek=${filtersPeek}`);
  check('no left chevron until scrolled', rail.leftChevron === false, `leftChevron=${rail.leftChevron}`);
  check('right chevron present', rail.rightChevron === true);

  // ================= Item 4: Pro button =================
  const pro = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('header button, div button')].find((b) => (b.textContent || '').trim() === 'Pro' && b.getBoundingClientRect().y < 60);
    if (!btn) return null;
    const cs = getComputedStyle(btn);
    const path = btn.querySelector('svg path');
    return { bg: cs.backgroundColor, color: cs.color, pathD: path?.getAttribute('d')?.slice(0, 20) ?? null };
  });
  checks.proButton = pro;
  check('Pro button is gray-filled like #04', !!pro && pro.bg === 'rgb(79, 79, 79)', JSON.stringify(pro));
  check('Pro button text is white', !!pro && pro.color === 'rgb(255, 255, 255)', JSON.stringify(pro));
  check('Pro glyph is a diamond (M12 2...)', !!pro && (pro.pathD || '').startsWith('M12 2'), JSON.stringify(pro?.pathD));

  // ================= Item 6: empty editor vs #04 =================
  const emptyEd = await page.evaluate(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right) }; };
    const aside = [...document.querySelectorAll('aside')].find((a) => /Details/.test(a.textContent || ''));
    const rows = aside ? [...aside.querySelectorAll('dt')].map((e) => (e.textContent || '').trim()) : [];
    const dds = aside ? [...aside.querySelectorAll('dd')].map((e) => ({ text: (e.textContent || '').trim().slice(0, 30), right: Math.round(e.getBoundingClientRect().right) })) : [];
    const asideRight = aside ? Math.round(aside.getBoundingClientRect().right) : null;
    const modify = aside ? [...aside.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Modify') : null;
    const sec = document.querySelector('section[aria-label="Preview"]');
    const bottomBtns = sec ? [...sec.querySelectorAll('button')].map((b) => (b.textContent || '').trim()).filter(Boolean) : [];
    const timecode = sec ? (sec.textContent || '').includes('00:00:00:00') : false;
    const tl = document.querySelector('section[aria-label="Timeline"]');
    const emptyBox = tl ? [...tl.querySelectorAll('*')].find((e) => (e.textContent || '').includes('Drag material here and start to create')) : null;
    return {
      detailsRows: rows,
      detailsValuesTruncated: asideRight !== null && dds.some((d) => d.right > asideRight - 4),
      detailsAsideRight: asideRight,
      ddRights: dds.map((d) => d.right),
      modifyPresent: !!modify,
      modifyBg: modify ? getComputedStyle(modify).backgroundColor : null,
      bottomBarHas: { timecode, Full: bottomBtns.includes('Full'), Ratio: bottomBtns.includes('Ratio') },
      previewHeader: (sec?.textContent || '').includes('Player-Timeline 01'),
      noClickToUpload: !(document.body.innerText.includes('Click to upload')),
      emptyBoxX: emptyBox ? Math.round(emptyBox.getBoundingClientRect().x) : null,
      emptyBoxText: !!emptyBox,
      timelineToolbar: !!tl,
      noFloatingPill: sec ? ['Edit with AI', 'Auto reframe', 'Smart tools'].every((t) => ![...sec.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === t || b.getAttribute('title') === t)) : false,
      noCC: sec ? ![...sec.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'CC') : false,
    };
  });
  checks.emptyEditor = emptyEd;
  check('Details rows match #04', ['Name', 'Path', 'Imported media', 'Arrange layers', 'Proxy', 'Aspect ratio', 'Resolution'].every((x) => emptyEd.detailsRows.some((r) => r.startsWith(x))), JSON.stringify(emptyEd.detailsRows));
  check('Details values not truncated', emptyEd.detailsValuesTruncated === false, `asideRight=${emptyEd.detailsAsideRight} ddRights=${JSON.stringify(emptyEd.ddRights)}`);
  check('Modify button present and gray', emptyEd.modifyPresent === true && emptyEd.modifyBg !== 'rgb(0, 217, 217)', `bg=${emptyEd.modifyBg}`);
  check('bottom bar: timecode + Full + Ratio', emptyEd.bottomBarHas.timecode && emptyEd.bottomBarHas.Full && emptyEd.bottomBarHas.Ratio, JSON.stringify(emptyEd.bottomBarHas));
  check('preview header Player-Timeline 01, no Click to upload', emptyEd.previewHeader && emptyEd.noClickToUpload);
  check('empty timeline box left-aligned', emptyEd.emptyBoxText && (emptyEd.emptyBoxX ?? 9999) < 150, `x=${emptyEd.emptyBoxX}`);
  check('no floating pill', emptyEd.noFloatingPill === true);
  check('no CC button', emptyEd.noCC === true);
  await page.screenshot({ path: path.join(OUT, 'verify-editor-empty.png') });

  // ================= Item 5: Captions =================
  const capTab = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: 'Captions' }).first();
  if (await capTab.count()) { await capTab.click(); await page.waitForTimeout(900); }
  const capAuto = await page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Panel sections"]');
    // Sub-nav items are buttons; the "Templates" group title is a <p>.
    const items = nav ? [...nav.querySelectorAll('button, p')].map((b) => (b.textContent || '').trim()) : [];
    return {
      subNavItems: items,
      hasLanguage: !!document.querySelector('select[aria-label="Caption language"]'),
      hasTranscript: !!document.querySelector('textarea[aria-label="Transcript for auto captions"]'),
    };
  });
  checks.captionsAuto = capAuto;
  check('Captions sub-nav has all 9 items', ['Auto captions', 'Templates', 'Favorites', 'Trending', 'Classic', 'NEW', 'Hits', 'Word', 'Auto lyrics'].every((x) => capAuto.subNavItems.includes(x)), JSON.stringify(capAuto.subNavItems));
  check('Auto captions has Language + Transcript', capAuto.hasLanguage && capAuto.hasTranscript);
  const trendingNav = page.locator('nav[aria-label="Panel sections"] button', { hasText: 'Trending' }).first();
  if (await trendingNav.count()) { await trendingNav.click(); await page.waitForTimeout(900); }
  const capTpl = await page.evaluate(() => ({
    searchPh: document.querySelector('input[aria-label="Search"]')?.getAttribute('placeholder') ?? null,
    tiles: document.querySelectorAll('nav[aria-label="Panel sections"] ~ div [class*="grid"] > div').length,
    hasDelete: document.body.innerText.includes('Delete current captions'),
    hasGenerate: [...document.querySelectorAll('button')].some((b) => (b.textContent || '').trim() === 'Generate captions'),
    hasStar: [...document.querySelectorAll('button')].some((b) => b.getAttribute('aria-label')?.startsWith('Favorite')),
    hasDownload: [...document.querySelectorAll('button')].some((b) => (b.getAttribute('aria-label') || '').startsWith('Download')),
  }));
  checks.captionsTemplates = capTpl;
  check('Captions Templates view: search + tiles + bottom bar', (capTpl.searchPh || '').includes('People are searching') && capTpl.tiles >= 1 && capTpl.hasDelete && capTpl.hasGenerate, JSON.stringify(capTpl));
  check('caption tiles have star + download', capTpl.hasStar && capTpl.hasDownload);
  await page.screenshot({ path: path.join(OUT, 'verify-captions-templates.png') });

  // Ratio 1:1 must render SQUARE — the CSS fallback (width 100% +
  // max-height) broke near-square ratios (BUG-CF-030: 1:1 was 756x622);
  // the explicit fitSize is what makes it square.
  const ratioBtn = page.locator('section[aria-label="Preview"] button', { hasText: 'Ratio' }).first();
  if (await ratioBtn.count()) { await ratioBtn.click(); await page.waitForTimeout(500); }
  const ratio11 = page.getByRole('button', { name: '1:1', exact: true }).first();
  if (await ratio11.count()) { await ratio11.click(); await page.waitForTimeout(800); }
  const square = await page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  checks.ratio1to1 = square;
  check('Ratio 1:1 renders square (BUG-CF-030)', !!square && Math.abs(square.w - square.h) <= 4, JSON.stringify(square));
  // Back to Original for the rest of the run.
  if (await ratioBtn.count()) { await ratioBtn.click(); await page.waitForTimeout(500); }
  const ratioOrig = page.getByRole('button', { name: 'Original', exact: true }).first();
  if (await ratioOrig.count()) { await ratioOrig.click(); await page.waitForTimeout(800); }

  // ================= Item 7: tiles regression =================
  for (const tab of ['Effects', 'Filters', 'Transitions']) {
    const tabBtn = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: tab }).first();
    if (await tabBtn.count()) { await tabBtn.click(); await page.waitForTimeout(1000); }
    const info = await page.evaluate(() => {
      const grids = [...document.querySelectorAll('div[class*="grid"]')].filter((g) => g.querySelector('img'));
      const grid = grids[grids.length - 1];
      if (!grid) return null;
      const cs = getComputedStyle(grid);
      const tiles = [...grid.children].slice(0, 6).map((t) => { const r = t.getBoundingClientRect(); return Math.round(r.width); });
      return { columns: cs.gridTemplateColumns.split(' ').length, tileWidths: tiles, imgs: grid.querySelectorAll('img').length };
    });
    check(`${tab} tiles are 2 columns`, !!info && info.columns === 2, JSON.stringify(info));
    check(`${tab} tile width ~130px`, !!info && info.tileWidths.every((w) => w >= 125 && w <= 135), `widths=${JSON.stringify(info?.tileWidths)}`);
    await page.screenshot({ path: path.join(OUT, `verify-tiles-${tab.toLowerCase()}.png`) });
  }
  const noPals = await page.evaluate(() => !document.body.innerText.includes('Pals'));
  check('no "Pals" anywhere', noPals);

  // ================= Editor Templates panel thumb =================
  const tplTabBtn = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: 'Templates' }).first();
  if (await tplTabBtn.count()) { await tplTabBtn.click(); await page.waitForTimeout(1000); }
  const panelThumb = await page.evaluate(() => {
    const thumbs = [...document.querySelectorAll('[role="img"]')].map((t) => { const r = t.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), pos: getComputedStyle(t).position }; });
    return thumbs.slice(0, 3);
  });
  checks.editorPanelThumbs = panelThumb;
  check('editor Templates panel thumbs have non-zero height', panelThumb.length > 0 && panelThumb.every((t) => t.h > 50), JSON.stringify(panelThumb));

  // ================= Item 2b: canvas fit at 150% short window =================
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 573 }, deviceScaleFactor: 1.5 });
  const p2 = await ctx2.newPage();
  const errors2 = [];
  p2.on('pageerror', (e) => errors2.push(String(e).slice(0, 200)));
  await p2.goto(URL, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(1200);
  await dismissDialogs(p2);
  const create2 = p2.getByRole('button', { name: 'Create project' });
  if (await create2.count()) { await create2.first().click(); await p2.waitForTimeout(1200); }
  await dismissDialogs(p2);
  const geo150 = await p2.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    if (!c) return null;
    const cont = c.parentElement?.parentElement;
    const r = c.getBoundingClientRect();
    return { canvas: { w: Math.round(r.width), h: Math.round(r.height) }, avail: cont ? { w: cont.clientWidth - 32, h: cont.clientHeight - 32 } : null };
  });
  checks.canvasGeometry150 = geo150;
  const fillsW150 = geo150 && Math.abs(geo150.canvas.w - (geo150.avail?.w ?? 0)) <= 6;
  const fillsH150 = geo150 && Math.abs(geo150.canvas.h - (geo150.avail?.h ?? 0)) <= 6;
  check('canvas fills preview area at 150% short window (was 206x115)', !!(fillsW150 || fillsH150), JSON.stringify(geo150));
  await p2.screenshot({ path: path.join(OUT, 'verify-zoom150-canvas.png') });
  await ctx2.close();

  checks.pageErrors = errors;
  check('zero page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  checks.ok = fail.length === 0;
  await fs.writeFile(path.join(OUT, 'verify.json'), JSON.stringify(checks, null, 1));
  console.log(JSON.stringify(checks, null, 1));
  await browser.close();
  process.exit(checks.ok ? 0 : 1);
}
main();
