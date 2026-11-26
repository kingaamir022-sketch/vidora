#!/usr/bin/env node
/**
 * v1.0.4 BASELINE probe: drives the v1.0.3 state at 1920x1080/100% before
 * the round's fixes — preview pill buttons, Full/Fit, Ratio options +
 * persistence, Export (empty + with image clip), tile sizes.
 * Run: node audit/capcut-fix/v104/baseline.mjs (dev server :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

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

async function canvasHash(page) {
  const dataUrl = await page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    return c ? c.toDataURL('image/png') : null;
  });
  return dataUrl ? createHash('sha256').update(Buffer.from(dataUrl.split(',')[1], 'base64')).digest('hex').slice(0, 12) : null;
}

async function dismissDialogs(page) {
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
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
  await page.waitForTimeout(900);
  await dismissDialogs(page);
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  await dismissDialogs(page);

  // ---- 1. Pill (baseline: present when a clip is selected) ----
  // Empty project has no clip; import a real image first.
  const input = page.locator('input[accept="video/*,image/*,audio/*,.gif"]');
  checks.fileInputFound = (await input.count()) > 0;
  await input.first().setInputFiles(IMAGE);
  await page.waitForTimeout(1500);
  const mediaNav = page.locator('nav[aria-label="Panel sections"] button', { hasText: 'Media' }).first();
  if (await mediaNav.count()) { await mediaNav.click(); await page.waitForTimeout(600); }
  const mediaItem = page.locator('button', { hasText: 'ai-texture-01' }).first();
  checks.mediaImported = (await mediaItem.count()) > 0;
  await mediaItem.click();
  await page.waitForTimeout(1200);
  const clip = page.locator('section[aria-label="Timeline"] [role="button"]').first();
  checks.timelineClipFound = (await clip.count()) > 0;
  await clip.click();
  await page.waitForTimeout(600);

  // Pill buttons present?
  for (const name of ['Edit with AI', 'Crop', 'Auto reframe', 'Smart tools']) {
    const c = await page.locator(`button[title="${name}"]`).count();
    checks[`pill has "${name}"`] = c > 0 ? 'PASS' : 'FAIL';
    if (c === 0) fail.push(`pill has "${name}"`);
  }
  // Edit with AI opens the AI tools overlay.
  await page.locator('button[title="Edit with AI"]').first().click();
  await page.waitForTimeout(700);
  const overlayOpen = await page.evaluate(() => !!document.querySelector('[aria-label="AI tools"]') || document.body.innerText.includes('AI tools'));
  check('pill Edit with AI opens overlay', overlayOpen);
  await page.screenshot({ path: path.join(OUT, 'baseline-ai-overlay.png') });
  const closeAi = page.getByRole('button', { name: 'Close AI tools' });
  if (await closeAi.count()) { await closeAi.first().click(); await page.waitForTimeout(400); }
  // Crop opens inspector Basic with Crop section.
  await page.locator('button[title="Crop"]').first().click();
  await page.waitForTimeout(700);
  const cropVisible = await page.evaluate(() => document.body.innerText.includes('Crop (0–1)'));
  check('pill Crop opens inspector Basic w/ Crop section', cropVisible);
  // Auto reframe opens overlay.
  await page.locator('button[title="Auto reframe"]').first().click();
  await page.waitForTimeout(700);
  const arOpen = await page.evaluate(() => document.body.innerText.includes('Auto reframe'));
  check('pill Auto reframe opens overlay', arOpen);
  const closeAi2 = page.getByRole('button', { name: 'Close AI tools' });
  if (await closeAi2.count()) { await closeAi2.first().click(); await page.waitForTimeout(400); }

  // ---- 2. Full / Fit geometry ----
  const canvasBox = async () => page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  const boxFit = await canvasBox();
  await page.getByRole('button', { name: 'Full', exact: true }).first().click();
  await page.waitForTimeout(500);
  const boxFull = await canvasBox();
  check('Full changes canvas box', JSON.stringify(boxFit) !== JSON.stringify(boxFull), `fit=${JSON.stringify(boxFit)} full=${JSON.stringify(boxFull)}`);
  checks.fullBox = boxFull;
  await page.getByRole('button', { name: 'Fit preview' }).first().click();
  await page.waitForTimeout(500);
  const boxFit2 = await canvasBox();
  check('Fit restores canvas box', JSON.stringify(boxFit) === JSON.stringify(boxFit2), `fit2=${JSON.stringify(boxFit2)}`);

  // ---- 3. Ratio options ----
  const ratioBtn = page.getByRole('button', { name: 'Ratio', exact: true }).first();
  const ratioResults = {};
  for (const r of ['16:9', '9:16', '1:1', '4:3', 'Original']) {
    await ratioBtn.click();
    await page.waitForTimeout(400);
    const opt = page.locator('div', { hasText: r }).locator('button', { hasText: r }).first();
    const menuBtn = page.getByRole('button', { name: r, exact: true }).first();
    if (await menuBtn.count()) { await menuBtn.click(); } else { await page.keyboard.press('Escape'); ratioResults[r] = 'menu item missing'; continue; }
    await page.waitForTimeout(600);
    const box = await canvasBox();
    const stored = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        try {
          const v = JSON.parse(localStorage.getItem(k));
          const s = JSON.stringify(v);
          if (s && s.includes('aspectRatio')) return s.slice(0, 400);
        } catch { /* ignore */ }
      }
      return null;
    });
    ratioResults[r] = { box, storedRatio: stored ? (stored.match(/"aspectRatio":"[^"]+"/g) || []) : null };
  }
  checks.ratioResults = ratioResults;
  // Persistence: reload, check canvas box is still 16:9-ish (last set = Original → 16:9 for the image? Original = source ratio).
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await dismissDialogs(page);
  const boxAfterReload = await canvasBox();
  checks.boxAfterReload = boxAfterReload;
  check('canvas exists after reload', !!boxAfterReload);

  // ---- 4. Export: empty project ----
  // Start a fresh empty project via dashboard.
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim() === 'Dashboard' || x.textContent?.trim() === 'Home'); b?.click(); });
  await page.waitForTimeout(800);
  // Fallback: reload and create a new empty project is complex; instead use
  // the current project but remove the clip? Simpler: check Export button
  // state on a fresh empty project by creating one via the dashboard button.
  const newProj = page.getByRole('button', { name: /New project|Create project/ }).first();
  if (await newProj.count()) { await newProj.click(); await page.waitForTimeout(1200); await dismissDialogs(page); }
  const exportBtn = page.getByRole('button', { name: 'Export', exact: true }).first();
  checks.exportBtnPresent = (await exportBtn.count()) > 0;
  if (checks.exportBtnPresent) {
    await exportBtn.click();
    await page.waitForTimeout(500);
    const dl = page.getByRole('menuitem', { name: 'Download' }).first();
    checks.exportMenuDownload = (await dl.count()) > 0;
    await dl.click();
    await page.waitForTimeout(800);
    const emptyMsg = await page.evaluate(() => document.body.innerText.includes('Project is empty'));
    check('empty project Export shows empty message', emptyMsg);
    await page.screenshot({ path: path.join(OUT, 'baseline-export-empty.png') });
    const closeExp = page.getByRole('button', { name: 'Close export' });
    if (await closeExp.count()) { await closeExp.first().click(); await page.waitForTimeout(400); }
  }

  // ---- 5. Export: with image clip ----
  const input2 = page.locator('input[accept="video/*,image/*,audio/*,.gif"]');
  await input2.first().setInputFiles(IMAGE);
  await page.waitForTimeout(1500);
  const mediaNav2 = page.locator('nav[aria-label="Panel sections"] button', { hasText: 'Media' }).first();
  if (await mediaNav2.count()) { await mediaNav2.click(); await page.waitForTimeout(600); }
  const mediaItem2 = page.locator('button', { hasText: 'ai-texture-01' }).first();
  await mediaItem2.click();
  await page.waitForTimeout(1200);
  const exportBtn2 = page.getByRole('button', { name: 'Export', exact: true }).first();
  await exportBtn2.click();
  await page.waitForTimeout(500);
  await page.getByRole('menuitem', { name: 'Download' }).first().click();
  await page.waitForTimeout(800);
  // Choose 360p + 24 fps for a fast render.
  const resSel = page.locator('select').first();
  checks.exportDialogOpen = (await page.locator('[role="dialog"][aria-label="Export and share"]').count()) > 0;
  // Set resolution 360 and fps 24 via the labeled selects.
  const labels = await page.evaluate(() => [...document.querySelectorAll('label')].map((l) => l.textContent?.trim()).filter(Boolean));
  checks.exportLabels = labels;
  await page.screenshot({ path: path.join(OUT, 'baseline-export-dialog.png') });
  // Click the main Export button in the dialog.
  const dlPromise = page.waitForEvent('download', { timeout: 180000 }).catch(() => null);
  const expGo = page.getByRole('button', { name: 'Export', exact: true }).last();
  await expGo.click();
  await page.waitForTimeout(2000);
  const jobState = await page.evaluate(() => {
    const items = [...document.querySelectorAll('[data-job-id]')].map((el) => el.textContent?.slice(0, 160));
    return items;
  });
  checks.jobStateAfterStart = jobState;
  const download = await dlPromise;
  if (download) {
    const p = path.join(OUT, `baseline-export.${download.suggestedFilename().split('.').pop()}`);
    await download.saveAs(p);
    const st = await fs.stat(p);
    checks.exportDownload = { file: download.suggestedFilename(), bytes: st.size };
    check('export produced a download', st.size > 1000, `${st.size} bytes`);
  } else {
    check('export produced a download', false, 'no download event within 180s');
    const jobNow = await page.evaluate(() => [...document.querySelectorAll('[data-job-id]')].map((el) => el.textContent?.slice(0, 200)));
    checks.jobStateAtTimeout = jobNow;
  }
  await page.screenshot({ path: path.join(OUT, 'baseline-export-done.png') });

  // ---- 6. Tile sizes (current 68px) ----
  const tileWidths = {};
  const tabBtn = (n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();
  for (const tab of ['Effects', 'Filters', 'Transitions']) {
    await tabBtn(tab).click();
    await page.waitForTimeout(900);
    const w = await page.evaluate(() => {
      const grid = document.querySelector('.grid');
      const tiles = [...document.querySelectorAll('.grid > div')].slice(0, 4).map((el) => Math.round(el.getBoundingClientRect().width));
      const cs = grid ? getComputedStyle(grid).gridTemplateColumns : '';
      return { tiles, columns: cs };
    });
    tileWidths[tab] = w;
  }
  checks.tileWidths = tileWidths;

  checks.pageErrors = errors;
  check('zero page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  checks.ok = fail.length === 0;
  await fs.writeFile(path.join(OUT, 'baseline.json'), JSON.stringify(checks, null, 1));
  console.log(JSON.stringify(checks, null, 1));
  await browser.close();
  process.exit(checks.ok ? 0 : 1);
}
main();
