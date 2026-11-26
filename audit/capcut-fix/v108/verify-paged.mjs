#!/usr/bin/env node
/**
 * v1.0.8 COMPLETION verification (BUG-CF-043, paged rail + viewport-
 * dividing tab widths): the first pass left a measured residual — after
 * the FIRST ">" click at 150%/1366/1280/1024 one label still clipped
 * ("Adjustment" 35–39/53px). The fix measures the tab width so it
 * divides the viewport (tabW = (railW − 48) / pageTabs) and steps one
 * page (pageTabs tabs) per chevron click.
 *
 * Per size (1920x1080 @100%, 1920x1080 @150% = CSS 1280x720, 1366x768,
 * 1280x720, 1024x768): open a fresh empty project and measure every
 * tab button + label span against the rail viewport at EVERY rest
 * position — initial, after each ">" click to the end, after each "<"
 * click back to 0, after selecting AI avatar (active-tab reveal),
 * back to Media, and explicit full-right.
 *
 * Acceptance (hard checks, not data):
 * - ZERO clipped labels at every position — except the single allowed
 *   initial peek (see below); a label is clipped when its span
 *   intersects the viewport but is not fully inside it.
 * - ZERO truncated label text anywhere: for every tab, the span's
 *   scrollWidth must equal its clientWidth (no CSS ellipsis). This
 *   catches the pre-existing 1024 defect the v1.0.8 verify missed:
 *   "Adjustment" rendered as "Adjustmen…" (scrollWidth 53 >
 *   clientWidth 52) even when fully visible.
 * - NO partial tab at any non-initial position; at initial exactly
 *   ONE partial tab (the right-edge peek), which must show the START
 *   of its label (the label's left edge inside the viewport, visible
 *   label ≤ 24.5px — the CapCut #04 "Fi" hint, kept). Measured peek
 *   text: Filters 0.6px (1920), Captions 12–14px (1366/1280/150%),
 *   Transitions ~21px (1024) — each a prefix of its label.
 * - Every rest scrollLeft is a multiple of the tab width (±1.5px).
 * - Initial tab counts unchanged (7/6/6/6/5) and the tab width is the
 *   dividing width (railW − 48) / count (±1.5px).
 * - Full-right: AI avatar fully visible with complete label, right
 *   chevron gone, scrollLeft == max scroll.
 * - Active AI avatar fully visible; back to Media returns to 0.
 * - 1920 regression block unchanged + zero page errors.
 * Run: node audit/capcut-fix/v108/verify-paged.mjs (dev server :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v108');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';
const checks = {};
const fail = [];
function check(name, ok, detail = '') {
  checks[name] = ok ? 'PASS' : 'FAIL' + (detail ? ' — ' + detail : '');
  if (!ok) fail.push(name);
}

const SIZES = [
  { name: '1920x1080', viewport: { width: 1920, height: 1080 }, dsf: 1, fullTabs: 7 },
  { name: '1920x1080-dsf1.5', viewport: { width: 1280, height: 720 }, dsf: 1.5, fullTabs: 6 },
  { name: '1366x768', viewport: { width: 1366, height: 768 }, dsf: 1, fullTabs: 6 },
  { name: '1280x720', viewport: { width: 1280, height: 720 }, dsf: 1, fullTabs: 6 },
  { name: '1024x768', viewport: { width: 1024, height: 768 }, dsf: 1, fullTabs: 5 },
];

async function dismissDialogs(page) {
  for (let i = 0; i < 4; i++) {
    const agree = page.getByRole('button', { name: 'Agree and continue' });
    if (await agree.count()) { await agree.first().click().catch(() => {}); await page.waitForTimeout(500); continue; }
    const dlg = page.locator('div[role="dialog"]');
    if (!(await dlg.count())) return;
    const okBtn = page.getByRole('button', { name: 'OK', exact: true });
    if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(500); continue; }
    return;
  }
}

async function measureRail(page) {
  return page.evaluate(() => {
    const r2 = (n) => Math.round(n * 100) / 100;
    const list = document.querySelector('div[role="tablist"][aria-label="Editor tools"]');
    const scroller = list?.querySelector('div[class*="overflow-x-auto"]');
    const sr = scroller.getBoundingClientRect();
    const tabs = [...list.querySelectorAll('button[role="tab"]')].map((b) => {
      const span = b.querySelector('span');
      const bb = b.getBoundingClientRect();
      const sb = span.getBoundingClientRect();
      const spanIntersects = sb.right > sr.left + 1 && sb.left < sr.right - 1;
      const spanFullyInside = sb.left >= sr.left - 1 && sb.right <= sr.right + 1;
      const btnVisibleW = Math.max(0, Math.min(bb.right, sr.right) - Math.max(bb.left, sr.left));
      return {
        t: (b.textContent || '').trim(),
        btnW: r2(bb.width),
        btnVisibleW: r2(btnVisibleW),
        btnPartial: btnVisibleW > 1 && btnVisibleW < bb.width - 1,
        labelW: r2(sb.width),
        labelScrollW: span.scrollWidth,
        labelClientW: span.clientWidth,
        labelTruncated: span.scrollWidth > span.clientWidth + 0.5,
        labelVisibleW: r2(Math.max(0, Math.min(sb.right, sr.right) - Math.max(sb.left, sr.left))),
        labelLeft: r2(sb.left),
        labelRight: r2(sb.right),
        labelClipped: spanIntersects && !spanFullyInside,
      };
    });
    return {
      railW: r2(list.getBoundingClientRect().width),
      scrollLeft: r2(scroller.scrollLeft),
      scrollWidth: r2(scroller.scrollWidth),
      clientWidth: r2(scroller.clientWidth),
      maxScroll: r2(scroller.scrollWidth - scroller.clientWidth),
      viewLeft: r2(sr.left),
      viewRight: r2(sr.right),
      leftChevron: !!list.querySelector('button[aria-label="Scroll tabs left"]'),
      rightChevron: !!list.querySelector('button[aria-label="Scroll tabs right"]'),
      tabs,
    };
  });
}

function clippedLabels(m) {
  return m.tabs.filter((t) => t.labelClipped).map((t) => `${t.t}(${t.labelVisibleW}/${t.labelW})`);
}
/**
 * Clipped labels that are actually failures: at the initial position
 * (scrollLeft 0) the ONE allowed peek tab shows the start of its
 * label — that partial label is the CapCut #04 hint, not a defect —
 * so it is exempted here (it is asserted separately as exactly-one-
 * peek-showing-a-prefix). Everywhere else, any clipped label fails.
 */
function badClips(m) {
  const isInitial = Math.abs(m.scrollLeft) <= 1.5;
  return m.tabs.filter((t) => {
    if (!t.labelClipped) return false;
    if (isInitial && t.btnPartial) {
      const showsStart = t.labelLeft >= m.viewLeft - 1 && t.labelVisibleW <= 24.5;
      return !showsStart;
    }
    return true;
  }).map((t) => `${t.t}(${t.labelVisibleW}/${t.labelW})`);
}
function truncatedLabels(m) {
  return m.tabs.filter((t) => t.labelTruncated).map((t) => `${t.t}(${t.labelScrollW}>${t.labelClientW})`);
}
function partialTabs(m) {
  return m.tabs.filter((t) => t.btnPartial).map((t) => `${t.t}(${t.btnVisibleW}/${t.btnW})`);
}
/** Partial tabs that are failures: at the initial position the single
 *  peek tab is allowed (asserted separately); everywhere else a
 *  partial tab means a rest position landed mid-tab. */
function badPartials(m) {
  if (Math.abs(m.scrollLeft) <= 1.5) return [];
  return partialTabs(m);
}
function tabAligned(m, tabW) {
  if (!tabW) return true;
  const rem = ((m.scrollLeft % tabW) + tabW) % tabW;
  return Math.min(rem, tabW - rem) <= 1.5;
}

async function measureSize(browser, size) {
  const tag = `[${size.name}]`;
  const ctx = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: size.dsf });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await dismissDialogs(page);
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await dismissDialogs(page); await create.first().click(); await page.waitForTimeout(1200); }
  await dismissDialogs(page);

  const positions = {};
  const walk = [];
  positions.initial = await measureRail(page);
  walk.push(['initial', positions.initial]);
  await page.screenshot({ path: path.join(OUT, `verify-paged-rail-${size.name}-initial.png`) });
  // ">" clicks to the end.
  for (let i = 1; i <= 5; i++) {
    const btn = page.getByRole('button', { name: 'Scroll tabs right' });
    if (!(await btn.count())) break;
    await btn.first().click();
    await page.waitForTimeout(1100);
    positions[`afterRight${i}`] = await measureRail(page);
    walk.push([`afterRight${i}`, positions[`afterRight${i}`]]);
    if (i === 1) await page.screenshot({ path: path.join(OUT, `verify-paged-rail-${size.name}-afterRight1.png`) });
  }
  // "<" clicks back to 0.
  for (let i = 1; i <= 5; i++) {
    const btn = page.getByRole('button', { name: 'Scroll tabs left' });
    if (!(await btn.count())) break;
    await btn.first().click();
    await page.waitForTimeout(1100);
    positions[`afterLeft${i}`] = await measureRail(page);
    walk.push([`afterLeft${i}`, positions[`afterLeft${i}`]]);
  }
  // Active-tab reveal: AI avatar, then back to Media.
  const avatarTab = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: 'AI avatar' }).first();
  if (await avatarTab.count()) { await avatarTab.click(); await page.waitForTimeout(1200); }
  positions.afterAvatar = await measureRail(page);
  walk.push(['afterAvatar', positions.afterAvatar]);
  const mediaTab = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: 'Media' }).first();
  if (await mediaTab.count()) { await mediaTab.click(); await page.waitForTimeout(1200); }
  positions.afterMedia = await measureRail(page);
  walk.push(['afterMedia', positions.afterMedia]);
  // Explicit full-right.
  await page.evaluate(() => {
    const scroller = document.querySelector('div[role="tablist"][aria-label="Editor tools"] div[class*="overflow-x-auto"]');
    scroller.scrollLeft = scroller.scrollWidth;
  });
  await page.waitForTimeout(900);
  positions.fullRight = await measureRail(page);
  walk.push(['fullRight', positions.fullRight]);
  await page.screenshot({ path: path.join(OUT, `verify-paged-rail-${size.name}-fullright.png`) });

  const initial = positions.initial;
  const tabW = initial.tabs[0]?.btnW || 0;
  const m = size.fullTabs;
  const expectedTabW = (initial.railW - 48) / m;
  const fullInitial = initial.tabs.filter((t) => t.btnVisibleW >= t.btnW - 1).length;
  const peekTabs = initial.tabs.filter((t) => t.btnPartial);
  const peek = peekTabs[0];
  const peekLabelOk = !peek || (peek.labelLeft >= initial.viewLeft - 1 && peek.labelVisibleW <= 24.5);

  check(`${tag} tab width divides the viewport: tabW ${tabW} ≈ (railW ${initial.railW} − 48)/${m} = ${expectedTabW.toFixed(2)}`, Math.abs(tabW - expectedTabW) <= 1.5, `tabW=${tabW} expected=${expectedTabW.toFixed(2)}`);
  check(`${tag} initial: ${m} tabs fully visible`, fullInitial === m, `full=${fullInitial} widths=${JSON.stringify(initial.tabs.map((t) => t.btnW))}`);
  check(`${tag} initial: exactly one peek tab showing the START of its label`, peekTabs.length === 1 && peekLabelOk, `peek=${JSON.stringify(peekTabs.map((t) => `${t.t} btn ${t.btnVisibleW}/${t.btnW} label ${t.labelVisibleW}/${t.labelW} left ${t.labelLeft} viewLeft ${initial.viewLeft}`))}`);
  check(`${tag} initial: no clipped labels`, badClips(initial).length === 0, JSON.stringify(badClips(initial)));
  check(`${tag} initial: no truncated label text`, truncatedLabels(initial).length === 0, JSON.stringify(truncatedLabels(initial)));

  // Every walked position: zero clipped, zero truncated, tab-aligned.
  for (const [name, pos] of walk) {
    check(`${tag} ${name}: zero clipped labels`, badClips(pos).length === 0, `clipped=${JSON.stringify(badClips(pos))} scrollLeft=${pos.scrollLeft}`);
    check(`${tag} ${name}: zero truncated label text`, truncatedLabels(pos).length === 0, `truncated=${JSON.stringify(truncatedLabels(pos))}`);
    check(`${tag} ${name}: rest position tab-aligned (scrollLeft ${pos.scrollLeft} multiple of ${tabW})`, tabAligned(pos, tabW), `scrollLeft=${pos.scrollLeft} tabW=${tabW}`);
    if (name !== 'initial') {
      check(`${tag} ${name}: no partial tab`, badPartials(pos).length === 0, `partial=${JSON.stringify(badPartials(pos))}`);
    }
  }

  const full = positions.fullRight;
  const avatarFull = full.tabs.find((t) => t.t === 'AI avatar');
  check(`${tag} full-right: AI avatar fully visible with complete label`, !!avatarFull && avatarFull.btnVisibleW >= avatarFull.btnW - 1 && !avatarFull.labelTruncated, JSON.stringify(avatarFull));
  check(`${tag} full-right: right chevron gone`, full.rightChevron === false, `R=${full.rightChevron} scrollLeft=${full.scrollLeft}`);
  check(`${tag} full-right: scrollLeft == max scroll`, Math.abs(full.scrollLeft - full.maxScroll) <= 1.5, `scrollLeft=${full.scrollLeft} maxScroll=${full.maxScroll}`);
  const av = positions.afterAvatar.tabs.find((t) => t.t === 'AI avatar');
  check(`${tag} active AI avatar scrolls fully into view`, !!av && av.btnVisibleW >= av.btnW - 1 && !av.labelTruncated, JSON.stringify(av));
  const med = positions.afterMedia.tabs.find((t) => t.t === 'Media');
  check(`${tag} back to Media: Media fully visible, scrollLeft back to 0`, !!med && med.btnVisibleW >= med.btnW - 1 && Math.abs(positions.afterMedia.scrollLeft) <= 1.5, `scrollLeft=${positions.afterMedia.scrollLeft}`);

  checks[`railWalk-${size.name}`] = walk.map(([n, p]) => `${n}: scrollLeft=${p.scrollLeft} clipped=${JSON.stringify(badClips(p))} truncated=${JSON.stringify(truncatedLabels(p))} partial=${JSON.stringify(badPartials(p))}`);
  console.log(`${tag} walk: ${checks[`railWalk-${size.name}`].join(' | ')}`);
  console.log(`${tag} tabW=${tabW} railW=${initial.railW} peek=${peek ? `${peek.t} labelVisible=${peek.labelVisibleW}/${peek.labelW}` : 'none'}`);

  checks[`errors-${size.name}`] = errors;
  check(`${tag} zero page errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  for (const size of SIZES) await measureSize(browser, size);

  // ---- 1920-only regression: v1.0.5/v1.0.7 state unchanged ----
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await dismissDialogs(page);
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await dismissDialogs(page); await create.first().click(); await page.waitForTimeout(1200); }
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
  checks.pageErrors1920 = errors;
  check('1920 regression: zero page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();

  checks.ok = fail.length === 0;
  await fs.writeFile(path.join(OUT, 'verify-paged.json'), JSON.stringify(checks, null, 1));
  console.log(JSON.stringify({ ok: checks.ok, fail }, null, 1));
  await browser.close();
  process.exit(checks.ok ? 0 : 1);
}
main();
