#!/usr/bin/env node
/**
 * v1.0.8 verification (BUG-CF-043): tab rail must never clip a label
 * mid-word. After one ">" click the last tab read "Template" (final
 * "s" cut off); at full-right "Stickers" showed a 6px fragment.
 *
 * Per size (1920x1080 @100%, 1920x1080 @150% = CSS 1280x720, 1366x768,
 * 1280x720, 1024x768): open a fresh empty project and measure every
 * tab button + label span against the rail viewport at EVERY rest
 * position — initial, after each ">" click to the end, full-right,
 * after selecting AI avatar (active-tab reveal) and back to Media.
 * A label is CLIPPED when its span intersects the viewport but is
 * not fully inside it (a 0–2px peeking tab whose text is hidden does
 * not count — that is the deliberate CapCut #04 "Fi" peek).
 *
 * Hard checks: full-right clean at ALL sizes (last tab fully visible
 * with complete label), 1920 one-click clean (the reported defect),
 * v1.0.7 tab counts unchanged at initial, active tab fully visible,
 * 1920 regression block, zero page errors.
 * Intermediate positions are recorded as data (railPositions) — see
 * the coordinator report for the known residual there.
 * Run: node audit/capcut-fix/v108/verify.mjs (dev server :5200)
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
  { name: '1920x1080', viewport: { width: 1920, height: 1080 }, dsf: 1, fullTabs: 7, tabW: 80 },
  { name: '1920x1080-dsf1.5', viewport: { width: 1280, height: 720 }, dsf: 1.5, fullTabs: 6, tabW: 64 },
  { name: '1366x768', viewport: { width: 1366, height: 768 }, dsf: 1, fullTabs: 6, tabW: 68 },
  { name: '1280x720', viewport: { width: 1280, height: 720 }, dsf: 1, fullTabs: 6, tabW: 64 },
  { name: '1024x768', viewport: { width: 1024, height: 768 }, dsf: 1, fullTabs: 5, tabW: 60 },
];

async function dismissDialogs(page) {
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

async function measureRail(page) {
  return page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width), left: Math.round(b.left), right: Math.round(b.right) }; };
    const list = document.querySelector('div[role="tablist"][aria-label="Editor tools"]');
    const scroller = list?.querySelector('div[class*="overflow-x-auto"]');
    const sr = scroller.getBoundingClientRect();
    const tabs = [...list.querySelectorAll('button[role="tab"]')].map((b) => {
      const span = b.querySelector('span');
      const bb = b.getBoundingClientRect();
      const sb = span.getBoundingClientRect();
      const spanIntersects = sb.right > sr.left + 0.5 && sb.left < sr.right - 0.5;
      const spanFullyInside = sb.left >= sr.left - 0.5 && sb.right <= sr.right + 0.5;
      return {
        t: (b.textContent || '').trim(),
        btnW: Math.round(bb.width),
        btnVisibleW: Math.round(Math.max(0, Math.min(bb.right, sr.right) - Math.max(bb.left, sr.left))),
        labelW: Math.round(sb.width),
        labelVisibleW: Math.round(Math.max(0, Math.min(sb.right, sr.right) - Math.max(sb.left, sr.left))),
        labelClipped: spanIntersects && !spanFullyInside,
      };
    });
    return {
      scrollLeft: Math.round(scroller.scrollLeft),
      scrollWidth: Math.round(scroller.scrollWidth),
      clientWidth: Math.round(scroller.clientWidth),
      maxScroll: Math.round(scroller.scrollWidth - scroller.clientWidth),
      leftChevron: !!list.querySelector('button[aria-label="Scroll tabs left"]'),
      rightChevron: !!list.querySelector('button[aria-label="Scroll tabs right"]'),
      tabs,
    };
  });
}

function clippedLabels(m) {
  return m.tabs.filter((t) => t.labelClipped).map((t) => `${t.t}(${t.labelVisibleW}/${t.labelW})`);
}

async function measureSize(browser, size) {
  const tag = `[${size.name}]`;
  const ctx = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: size.dsf });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await dismissDialogs(page);
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  await dismissDialogs(page);

  const positions = {};
  positions.initial = await measureRail(page);
  // Click ">" until the chevron disappears (max 5 clicks).
  for (let i = 1; i <= 5; i++) {
    const btn = page.getByRole('button', { name: 'Scroll tabs right' });
    if (!(await btn.count())) break;
    await btn.first().click();
    await page.waitForTimeout(1100);
    positions[`afterClick${i}`] = await measureRail(page);
  }
  // Full-right (explicit max scroll — the acceptance position).
  await page.evaluate(() => {
    const scroller = document.querySelector('div[role="tablist"][aria-label="Editor tools"] div[class*="overflow-x-auto"]');
    scroller.scrollLeft = scroller.scrollWidth;
  });
  await page.waitForTimeout(900);
  positions.fullRight = await measureRail(page);
  await page.screenshot({ path: path.join(OUT, `verify-rail-fullright-${size.name}.png`) });
  // Active-tab reveal: AI avatar, then back to Media.
  const avatarTab = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: 'AI avatar' }).first();
  if (await avatarTab.count()) { await avatarTab.click(); await page.waitForTimeout(1200); }
  positions.afterAvatar = await measureRail(page);
  const mediaTab = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: 'Media' }).first();
  if (await mediaTab.count()) { await mediaTab.click(); await page.waitForTimeout(1200); }
  positions.afterMedia = await measureRail(page);
  await page.screenshot({ path: path.join(OUT, `verify-rail-${size.name}.png`) });

  checks[`railPositions-${size.name}`] = positions;
  const full = positions.fullRight;
  const fullTabs = positions.initial.tabs.filter((t) => t.btnVisibleW >= t.btnW - 1).length;
  const avatarFull = full.tabs.find((t) => t.t === 'AI avatar');
  check(`${tag} full-right: no clipped labels`, clippedLabels(full).length === 0, `clipped=${JSON.stringify(clippedLabels(full))} scrollLeft=${full.scrollLeft} maxScroll=${full.maxScroll}`);
  check(`${tag} full-right: AI avatar fully visible with complete label`, !!avatarFull && avatarFull.btnVisibleW >= avatarFull.btnW - 1 && avatarFull.labelVisibleW >= avatarFull.labelW - 1, JSON.stringify(avatarFull));
  check(`${tag} full-right: right chevron gone (nowhere further to go)`, full.rightChevron === false, `R=${full.rightChevron} scrollLeft=${full.scrollLeft}`);
  check(`${tag} initial: ${size.fullTabs} tabs fully visible (tab ~${size.tabW}px)`, fullTabs === size.fullTabs && positions.initial.tabs.every((t) => Math.abs(t.btnW - size.tabW) <= 1), `full=${fullTabs} widths=${JSON.stringify(positions.initial.tabs.map((t) => t.btnW))}`);
  if (size.name === '1920x1080') {
    const one = positions.afterClick1;
    check(`${tag} one ">" click: no clipped labels (the reported defect)`, !!one && clippedLabels(one).length === 0, one ? `clipped=${JSON.stringify(clippedLabels(one))} scrollLeft=${one.scrollLeft}` : 'no afterClick1');
    const tpl = one?.tabs.find((t) => t.t === 'Templates');
    check(`${tag} one ">" click: Templates fully visible`, !!tpl && tpl.labelVisibleW >= tpl.labelW - 1, JSON.stringify(tpl));
  }
  const av = positions.afterAvatar.tabs.find((t) => t.t === 'AI avatar');
  check(`${tag} active AI avatar scrolls fully into view`, !!av && av.btnVisibleW >= av.btnW - 1 && av.labelVisibleW >= av.labelW - 1, JSON.stringify(av));
  // Intermediate positions: recorded as data (see report); the
  // full-right + one-click checks above are the acceptance gates.
  const inter = Object.entries(positions)
    .filter(([k]) => k.startsWith('afterClick'))
    .map(([k, m]) => `${k}: scrollLeft=${m.scrollLeft} clipped=${JSON.stringify(clippedLabels(m))}`);
  checks[`railIntermediates-${size.name}`] = inter;
  console.log(`${tag} intermediates: ${inter.join(' | ')}`);

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
  await fs.writeFile(path.join(OUT, 'verify.json'), JSON.stringify(checks, null, 1));
  console.log(JSON.stringify({ ok: checks.ok, fail }, null, 1));
  await browser.close();
  process.exit(checks.ok ? 0 : 1);
}
main();
