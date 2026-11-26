#!/usr/bin/env node
/**
 * v1.0.4 verification (coordinator): Playwright at 1920x1080/100% on the
 * dev server. Covers the round's four items:
 *  1. Preview tools: no floating pill (desktop has none); bottom bar
 *     Full (cover) / Fit / Ratio / Fullscreen all work; Crop reachable
 *     via inspector Basic + timeline right-click menu; Smart tools /
 *     Edit with AI / Auto reframe reachable via inspector Smart tools
 *     tab; clip "…" actions reachable via timeline right-click menu.
 *  2. Export: empty project shows the empty message + disabled Export;
 *     project with a real image clip exports to a real downloadable file.
 *  3. Ratio: every option changes the preview + persists across reload.
 *  4. Tiles: desktop 2-column ~130px photo tiles in Effects/Filters/
 *     Transitions, with names, + and download icons.
 * Run: node audit/capcut-fix/v104/verify.mjs (dev server :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v104');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';
const IMAGE = path.join(ROOT, 'public', 'ai-library', 'images', 'textures', 'ai-texture-01.png');
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

async function importImage(page) {
  const input = page.locator('input[accept="video/*,image/*,audio/*,.gif"]');
  await input.first().setInputFiles(IMAGE);
  await page.waitForTimeout(1500);
  const mediaNav = page.locator('nav[aria-label="Panel sections"] button', { hasText: 'Media' }).first();
  if (await mediaNav.count()) { await mediaNav.click(); await page.waitForTimeout(600); }
  const mediaItem = page.locator('button', { hasText: 'ai-texture-01' }).first();
  if ((await mediaItem.count()) === 0) return false;
  await mediaItem.click();
  await page.waitForTimeout(1200);
  return true;
}

async function canvasGeometry(page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    if (!c) return null;
    const wrap = c.parentElement;
    const cont = wrap?.parentElement;
    const r = c.getBoundingClientRect();
    return {
      canvas: { w: Math.round(r.width), h: Math.round(r.height) },
      avail: cont ? { w: cont.clientWidth - 32, h: cont.clientHeight - 32 } : null,
      untransformed: wrap ? { w: wrap.offsetWidth, h: wrap.offsetHeight } : null,
    };
  });
}

async function storedAspect(page) {
  return page.evaluate(() => {
    try {
      const projects = JSON.parse(localStorage.getItem('vidora.projects.v1') ?? '[]');
      return projects.map((p) => p.aspectRatio ?? null);
    } catch { return null; }
  });
}

/** Autosave runs every 3 s while dirty: poll storage until the ratio
 * lands (or 8 s pass) instead of reading once right after the click. */
async function waitForStored(page, ratio, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const stored = await storedAspect(page);
    if (stored && stored.includes(ratio)) return stored;
    await page.waitForTimeout(500);
  }
  return storedAspect(page);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await dismissDialogs(page);
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  await dismissDialogs(page);

  // ================= Item 2a: Export on the EMPTY project =================
  const exportBtn = page.getByRole('button', { name: 'Export', exact: true }).first();
  check('Export button present', (await exportBtn.count()) > 0);
  await exportBtn.click();
  await page.waitForTimeout(500);
  await page.getByRole('menuitem', { name: 'Download' }).first().click();
  await page.waitForTimeout(800);
  const emptyMsg = await page.evaluate(() => document.body.innerText.includes('Project is empty'));
  check('empty project: Export dialog shows empty message', emptyMsg);
  const exportDisabled = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes('Project is empty'));
    return b ? b.disabled : null;
  });
  check('empty project: Export button disabled', exportDisabled === true, `disabled=${exportDisabled}`);
  await page.screenshot({ path: path.join(OUT, 'verify-export-empty.png') });
  const closeExp = page.getByRole('button', { name: 'Close export' });
  if (await closeExp.count()) { await closeExp.first().click(); await page.waitForTimeout(400); }

  // ================= Import a real image clip =================
  check('import real image', await importImage(page));
  const clip = page.locator('section[aria-label="Timeline"] [role="button"]').first();
  check('timeline clip present', (await clip.count()) > 0);
  await clip.click();
  await page.waitForTimeout(700);

  // ================= Item 1: preview tools =================
  const pillBtns = await page.evaluate(() => {
    const sec = document.querySelector('section[aria-label="Preview"]');
    if (!sec) return null;
    return ['Edit with AI', 'Auto reframe', 'Smart tools'].map((t) => ({
      t, n: [...sec.querySelectorAll('button')].filter((b) => b.textContent?.trim() === t || b.getAttribute('title') === t).length,
    }));
  });
  check('no floating pill above preview (desktop has none)', !!pillBtns && pillBtns.every((x) => x.n === 0), JSON.stringify(pillBtns));
  // Bottom bar buttons present (Full's title is "Fill the preview
  // area", Ratio's title is "Aspect ratio" — match by visible text).
  for (const n of ['Full', 'Fit preview', 'Ratio', 'Fullscreen preview']) {
    const c = await page.evaluate((label) => {
      const sec = document.querySelector('section[aria-label="Preview"]');
      if (!sec) return 0;
      return [...sec.querySelectorAll('button')].filter((b) => (b.textContent || '').trim() === label || b.getAttribute('title') === label || b.getAttribute('aria-label') === label).length;
    }, n);
    check(`bottom bar has ${n}`, c > 0);
  }
  // Full fills the preview area (cover), Fit restores.
  const geoFit = await canvasGeometry(page);
  await page.getByRole('button', { name: 'Full', exact: true }).first().click();
  await page.waitForTimeout(500);
  const geoFull = await canvasGeometry(page);
  const covers = geoFull && geoFull.avail && geoFull.canvas.w >= geoFull.avail.w - 2 && geoFull.canvas.h >= geoFull.avail.h - 2;
  check('Full fills preview area (cover)', !!covers, `fit=${JSON.stringify(geoFit?.canvas)} full=${JSON.stringify(geoFull?.canvas)} avail=${JSON.stringify(geoFull?.avail)}`);
  await page.getByRole('button', { name: 'Fit preview' }).first().click();
  await page.waitForTimeout(500);
  const geoFit2 = await canvasGeometry(page);
  check('Fit restores fit geometry', JSON.stringify(geoFit?.canvas) === JSON.stringify(geoFit2?.canvas), `fit2=${JSON.stringify(geoFit2?.canvas)}`);
  // Crop reachable via inspector Basic tab.
  const basicTab = page.locator('nav[aria-label="Inspector panels"] button[title="Basic"]').first();
  await basicTab.click();
  await page.waitForTimeout(600);
  check('inspector Basic has Crop section', await page.evaluate(() => document.body.innerText.includes('Crop (0–1)')));
  // Smart tools reachable via inspector; Retouch + Auto reframe open the overlay.
  const smartTab = page.locator('nav[aria-label="Inspector panels"] button[title="Smart tools"]').first();
  await smartTab.click();
  await page.waitForTimeout(600);
  const smartRows = await page.evaluate(() => ['Auto reframe', 'Retouch', 'Remove background', 'Camera tracking', 'Relight', 'AI movement', 'Optical flow'].map((t) => ({ t, n: [...document.querySelectorAll('button')].filter((b) => b.textContent?.includes(t)).length })));
  check('inspector Smart tools has all 7 rows', smartRows.every((x) => x.n > 0), JSON.stringify(smartRows));
  await page.locator('button', { hasText: 'Retouch' }).first().click();
  await page.waitForTimeout(700);
  check('Smart tools Retouch opens AI tools overlay', (await page.locator('[role="dialog"][aria-label="AI tools"]').count()) === 1);
  await page.screenshot({ path: path.join(OUT, 'verify-ai-overlay.png') });
  const closeAi = page.getByRole('button', { name: 'Close AI tools' });
  if (await closeAi.count()) { await closeAi.first().click(); await page.waitForTimeout(400); }
  await smartTab.click();
  await page.waitForTimeout(500);
  await page.locator('button', { hasText: 'Auto reframe' }).first().click();
  await page.waitForTimeout(700);
  check('Smart tools Auto reframe opens overlay', (await page.locator('[role="dialog"][aria-label="AI tools"]').count()) === 1);
  const closeAi2 = page.getByRole('button', { name: 'Close AI tools' });
  if (await closeAi2.count()) { await closeAi2.first().click(); await page.waitForTimeout(400); }
  // Clip "…" actions reachable via timeline right-click menu.
  await clip.click({ button: 'right' });
  await page.waitForTimeout(600);
  const menuText = await page.evaluate(() => document.querySelector('[role="menu"][aria-label="Clip context menu"]')?.textContent ?? '');
  for (const item of ['Split', 'Copy', 'Duplicate', 'Delete', 'Download clip', 'Flip', 'Crop']) {
    check(`context menu has ${item}`, menuText.includes(item), menuText.slice(0, 200));
  }
  await page.screenshot({ path: path.join(OUT, 'verify-context-menu.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.mouse.click(10, 10);
  await page.waitForTimeout(300);

  // ================= Item 3: Ratio options + persistence =================
  const ratioBtn = page.getByRole('button', { name: 'Ratio', exact: true }).first();
  const expected = { '16:9': 16 / 9, '4:3': 4 / 3, '2:1': 2, '9:16': 9 / 16, '1:1': 1, '3:4': 3 / 4 };
  for (const [r, exp] of Object.entries(expected)) {
    await ratioBtn.click();
    await page.waitForTimeout(400);
    // The menu must be clickable: elementFromPoint at the item centre is the item.
    const hit = await page.evaluate((label) => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent === label);
      if (!btn) return 'missing';
      const rc = btn.getBoundingClientRect();
      const el = document.elementFromPoint(rc.x + rc.width / 2, rc.y + rc.height / 2);
      return el === btn || btn.contains(el) ? 'ok' : `hit:${el?.tagName}.${(el?.className?.baseVal ?? el?.className ?? '').toString().slice(0, 40)}`;
    }, r);
    check(`Ratio menu item ${r} clickable`, hit === 'ok', hit);
    const menuBtn = page.getByRole('button', { name: r, exact: true }).first();
    await menuBtn.click();
    await page.waitForTimeout(600);
    const geo = await canvasGeometry(page);
    const ratio = geo ? geo.canvas.w / Math.max(1, geo.canvas.h) : 0;
    check(`Ratio ${r} changes preview`, Math.abs(ratio - exp) < 0.06, `measured ${ratio.toFixed(3)} vs ${exp.toFixed(3)} box=${JSON.stringify(geo?.canvas)}`);
    const stored = await waitForStored(page, r);
    check(`Ratio ${r} stored`, !!stored && stored.some((a) => a === r), JSON.stringify(stored));
  }
  // Original: snaps to the project's own ratio.
  await ratioBtn.click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Original', exact: true }).first().click();
  await page.waitForTimeout(600);
  check('Ratio Original applies', (await storedAspect(page)).some((a) => a !== null));
  // Persistence: set 9:16, reload, reopen, canvas still 9:16.
  await ratioBtn.click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '9:16', exact: true }).first().click();
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await dismissDialogs(page);
  const reopen = page.getByRole('button', { name: 'Untitled Project' }).first();
  if (await page.locator('canvas[aria-label="Preview canvas"]').count() === 0 && (await reopen.count()) > 0) {
    await reopen.click();
    await page.waitForTimeout(1200);
  }
  const geoReload = await canvasGeometry(page);
  const ratioReload = geoReload ? geoReload.canvas.w / Math.max(1, geoReload.canvas.h) : 0;
  check('Ratio 9:16 persists across reload', Math.abs(ratioReload - 9 / 16) < 0.06, `measured ${ratioReload.toFixed(3)} box=${JSON.stringify(geoReload?.canvas)} stored=${JSON.stringify(await storedAspect(page))}`);
  // Back to 16:9 for the remaining checks.
  await page.getByRole('button', { name: 'Ratio', exact: true }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '16:9', exact: true }).first().click();
  await page.waitForTimeout(600);

  // ================= Item 2b: Export with a real clip =================
  const exportBtn2 = page.getByRole('button', { name: 'Export', exact: true }).first();
  await exportBtn2.click();
  await page.waitForTimeout(500);
  await page.getByRole('menuitem', { name: 'Download' }).first().click();
  await page.waitForTimeout(900);
  check('export dialog opens', (await page.locator('[role="dialog"][aria-label="Export and share"]').count()) === 1);
  // Fast render: 360p, 24 fps.
  await page.locator('label:has-text("Resolution") select').selectOption('360');
  await page.locator('label:has-text("Frame rate") select').selectOption('24');
  await page.waitForTimeout(300);
  const dlPromise = page.waitForEvent('download', { timeout: 240000 }).catch(() => null);
  const expGo = page.locator('[role="dialog"][aria-label="Export and share"] button', { hasText: 'Export', exact: true }).first();
  await expGo.click();
  await page.waitForTimeout(2000);
  const jobMid = await page.evaluate(() => [...document.querySelectorAll('[data-job-id]')].map((el) => el.textContent?.slice(0, 120)));
  checks.exportJobAfterStart = jobMid;
  const download = await dlPromise;
  if (download) {
    const fname = download.suggestedFilename();
    const p = path.join(OUT, `verify-export-${fname}`);
    await download.saveAs(p);
    const st = await fs.stat(p);
    const head = (await fs.readFile(p)).subarray(0, 16);
    const magic = head.toString('latin1');
    const isMp4 = magic.slice(4, 8) === 'ftyp';
    const isWebm = head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
    checks.exportDownload = { file: fname, bytes: st.size, isMp4, isWebm };
    check('export produced a real video file', st.size > 1000 && (isMp4 || isWebm), `${fname} ${st.size} bytes mp4=${isMp4} webm=${isWebm}`);
  } else {
    check('export produced a download', false, 'no download event within 240s');
    checks.exportJobAtTimeout = await page.evaluate(() => [...document.querySelectorAll('[data-job-id]')].map((el) => el.textContent?.slice(0, 200)));
  }
  await page.screenshot({ path: path.join(OUT, 'verify-export-done.png') });
  const closeExp2 = page.getByRole('button', { name: 'Close export' });
  if (await closeExp2.count()) { await closeExp2.first().click(); await page.waitForTimeout(400); }

  // ================= Item 4: tiles =================
  const tabBtn = (n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();
  for (const tab of ['Effects', 'Filters', 'Transitions']) {
    await tabBtn(tab).click();
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => {
      const grid = document.querySelector('.grid');
      if (!grid) return null;
      const cs = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean);
      const tiles = [...grid.children].filter((el) => el.tagName === 'DIV').slice(0, 6);
      return {
        columns: cs.length,
        colWidths: cs.map((c) => Math.round(parseFloat(c))),
        tileWidths: tiles.map((el) => Math.round(el.getBoundingClientRect().width)),
        tileHeights: tiles.map((el) => Math.round(el.getBoundingClientRect().height)),
        imgs: tiles.filter((el) => el.querySelector('img')).length,
        gradients: tiles.filter((el) => el.querySelector('.bg-gradient-to-br')).length,
        names: tiles.map((el) => el.querySelector('span.truncate')?.textContent?.trim() ?? ''),
        plus: tiles.filter((el) => el.querySelector('button[aria-label^="Apply"]')).length,
        download: tiles.filter((el) => el.querySelector('button[aria-label^="Download"]')).length,
      };
    });
    checks[`tiles ${tab}`] = info;
    check(`${tab} tiles are 2 columns`, info?.columns === 2, `columns=${info?.columns}`);
    check(`${tab} tile width ~130px`, !!info && info.tileWidths.every((w) => w >= 125 && w <= 135), `widths=${JSON.stringify(info?.tileWidths)}`);
    check(`${tab} tiles show photo thumbnails`, !!info && info.imgs >= 1 && info.gradients === 0, `imgs=${info?.imgs} gradients=${info?.gradients}`);
    check(`${tab} tiles have + buttons`, !!info && info.plus >= 1, `plus=${info?.plus}`);
    check(`${tab} tiles have download icons`, !!info && info.download >= 1, `download=${info?.download}`);
    await page.screenshot({ path: path.join(OUT, `verify-tiles-${tab.toLowerCase()}.png`) });
  }

  // ================= Regression: template hover =================
  const tplTab = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: 'Templates' }).first();
  if (await tplTab.count()) { await tplTab.click(); await page.waitForTimeout(900); }
  // Templates live on the dashboard Templates page; the editor tab opens the panel.
  const hoverProbe = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')].filter((b) => /Use template|Edit more/i.test(b.textContent || ''));
    return btns.map((b) => ({ text: (b.textContent || '').trim().slice(0, 20) }));
  });
  checks.templateHoverProbe = hoverProbe;

  checks.pageErrors = errors;
  check('zero page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  checks.ok = fail.length === 0;
  await fs.writeFile(path.join(OUT, 'verify.json'), JSON.stringify(checks, null, 1));
  console.log(JSON.stringify(checks, null, 1));
  await browser.close();
  process.exit(checks.ok ? 0 : 1);
}
main();
