#!/usr/bin/env node
/**
 * v1.0.6 verification (BUG-CF-037 — withBase double-prefix).
 * Part A: Pages-faithful static server — dist/ mounted under /vidora/
 * (http://127.0.0.1:4174/vidora/), built with VITE_BASE=/vidora/.
 * Every AI studio view + the Library page: zero broken <img>, zero
 * "/vidora/vidora/" URLs.
 * Part B: dev server :5200 at 1920x1080/100% — Video Studio hero 3/3.
 * Run: node audit/capcut-fix/v106/verify.mjs
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const PAGES_URL = 'http://127.0.0.1:4174/vidora/';
const DEV_URL = 'http://127.0.0.1:5200/';
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

/** Scroll through the page so lazy images load, then count img states. */
async function imgAudit(page) {
  await page.evaluate(async () => {
    const scroller = document.querySelector('.overflow-y-auto') || document.scrollingElement;
    if (!scroller) return;
    for (let y = 0; y <= scroller.scrollHeight; y += 600) {
      scroller.scrollTop = y;
      await new Promise((r) => setTimeout(r, 120));
    }
    scroller.scrollTop = 0;
  });
  await page.waitForTimeout(1500);
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src'));
    const doubleBased = imgs.filter((i) => (i.getAttribute('src') || '').includes('/vidora/vidora/')).map((i) => i.getAttribute('src'));
    const pending = imgs.filter((i) => !i.complete).length;
    return { broken, doubleBased, pending, total: imgs.length };
  });
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

  // ================= Part A: Pages-faithful =================
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });

  await page.goto(PAGES_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  await dismissDialogs(page);

  // Dashboard sidebar -> Video Studio (wrapper nav defaults to it too).
  const vsNav = page.getByRole('button', { name: 'Video Studio' }).first();
  if (await vsNav.count()) { await vsNav.click(); await page.waitForTimeout(2000); }

  // Hero: the 3 images behind "VIDORA VIDEO 2.5".
  const hero = await page.evaluate(() => {
    const headline = [...document.querySelectorAll('span')].find((s) => s.textContent?.trim() === 'VIDORA VIDEO 2.5');
    const scope = headline?.closest('div')?.parentElement ?? document.body;
    return [...scope.querySelectorAll('img')].slice(0, 3).map((img) => ({
      complete: img.complete,
      naturalHeight: img.naturalHeight,
      naturalWidth: img.naturalWidth,
      src: img.getAttribute('src'),
    }));
  });
  check('Pages-base: hero 3/3 loaded (naturalWidth 1920)', hero.length === 3 && hero.every((i) => i.complete && i.naturalWidth === 1920), JSON.stringify(hero.map((i) => i.src)));
  check('Pages-base: hero srcs single-based', hero.every((i) => (i.src || '').startsWith('/vidora/ai-library/')), JSON.stringify(hero.map((i) => i.src)));
  await page.screenshot({ path: path.join(OUT, 'verify-hero.png') });

  // Every other studio view via the wrapper nav.
  for (const view of ['Inspiration', 'Design Studio', 'Create', 'Explore', 'Canvas', 'Marketing Studio']) {
    const btn = page.getByRole('button', { name: view, exact: true }).first();
    if (!(await btn.count())) { check(`Pages-base: ${view} nav exists`, false); continue; }
    await btn.click();
    await page.waitForTimeout(1800);
    const audit = await imgAudit(page);
    check(`Pages-base: ${view} — ${audit.total} imgs, 0 broken`, audit.broken.length === 0 && audit.doubleBased.length === 0, JSON.stringify({ broken: audit.broken.slice(0, 3), doubleBased: audit.doubleBased.slice(0, 3), total: audit.total }));
  }

  // Library page (Dashboard sidebar).
  const libNav = page.getByRole('button', { name: 'Library' }).first();
  if (await libNav.count()) {
    await libNav.click();
    await page.waitForTimeout(1800);
    const audit = await imgAudit(page);
    check(`Pages-base: Library — ${audit.total} imgs, 0 broken`, audit.broken.length === 0 && audit.doubleBased.length === 0, JSON.stringify({ broken: audit.broken.slice(0, 3), doubleBased: audit.doubleBased.slice(0, 3), total: audit.total }));
    await page.screenshot({ path: path.join(OUT, 'verify-library.png') });
  } else {
    check('Pages-base: Library nav exists', false);
  }
  check('Pages-base: 0 page/console errors across studio views', errors.length === 0, JSON.stringify(errors.slice(0, 5)));
  await page.close();

  // ================= Part B: dev server =================
  const p2 = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors2 = [];
  p2.on('pageerror', (e) => errors2.push(String(e).slice(0, 200)));
  p2.on('console', (m) => { if (m.type() === 'error') errors2.push('console: ' + m.text().slice(0, 200)); });
  await p2.goto(DEV_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await p2.waitForTimeout(1200);
  await dismissDialogs(p2);
  const vs2 = p2.getByRole('button', { name: 'Video Studio' }).first();
  if (await vs2.count()) { await vs2.click(); await p2.waitForTimeout(2000); }
  const hero2 = await p2.evaluate(() => {
    const headline = [...document.querySelectorAll('span')].find((s) => s.textContent?.trim() === 'VIDORA VIDEO 2.5');
    const scope = headline?.closest('div')?.parentElement ?? document.body;
    return [...scope.querySelectorAll('img')].slice(0, 3).map((img) => ({ complete: img.complete, naturalWidth: img.naturalWidth, src: img.getAttribute('src') }));
  });
  check('Dev server: hero 3/3 loaded at 1920x1080', hero2.length === 3 && hero2.every((i) => i.complete && i.naturalWidth > 0), JSON.stringify(hero2));
  check('Dev server: 0 page/console errors', errors2.length === 0, JSON.stringify(errors2.slice(0, 5)));
  await p2.screenshot({ path: path.join(OUT, 'verify-hero-dev.png') });
  await p2.close();
  await browser.close();

  await fs.writeFile(path.join(OUT, 'verify.json'), JSON.stringify({ checks, fail, ok: fail.length === 0 }, null, 2));
  console.log(JSON.stringify(checks, null, 2));
  console.log(fail.length === 0 ? 'VERIFY: ALL PASS' : `VERIFY: ${fail.length} FAIL — ${fail.join(', ')}`);
  process.exit(fail.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
