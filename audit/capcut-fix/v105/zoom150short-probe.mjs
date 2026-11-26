#!/usr/bin/env node
/** v1.0.5 baseline probe: measure the empty editor + templates page at 1920x1080/100%. */
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

const out = {};
async function main() {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 573 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }

  // ---- Dashboard -> Templates page: TemplateThumb geometry + pixels ----
  const tplNav = page.getByRole('button', { name: 'Templates' }).first();
  if (await tplNav.count()) { await tplNav.click(); await page.waitForTimeout(1500); }
  out.templates = await page.evaluate(() => {
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    const cards = [...document.querySelectorAll('article')].slice(0, 5);
    return cards.map((a) => {
      const thumb = a.querySelector('[role="img"]');
      return {
        name: (a.querySelector('p')?.textContent || '').trim(),
        thumbRect: rect(thumb),
        thumbPosition: thumb ? getComputedStyle(thumb).position : null,
        thumbOverflow: thumb ? getComputedStyle(thumb).overflow : null,
      };
    });
  });
  // Pixel sampling: screenshot the templates page and check the first card's center pixels.
  const tplShot = await page.screenshot({ path: path.join(ROOT, 'audit', 'capcut-fix', 'v105', 'zoom150short-templates.png') });

  // ---- Editor: back Home, then create empty project ----
  const homeNav = page.getByRole('button', { name: 'Home' }).first();
  if (await homeNav.count()) { await homeNav.click(); await page.waitForTimeout(800); }
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  const dismiss = page.getByRole('button', { name: 'OK' });
  if (await dismiss.count()) { await dismiss.first().click().catch(() => {}); await page.waitForTimeout(400); }

  out.editor = await page.evaluate(() => {
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
    const tabs = [...document.querySelectorAll('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]')].map((b) => ({ t: b.textContent?.trim(), r: rect(b), vis: b.getBoundingClientRect().right <= 1920 && b.getBoundingClientRect().left >= 0 }));
    const canvas = document.querySelector('#vidora-export-canvas');
    const wrapper = canvas?.parentElement;
    const section = document.querySelector('section[aria-label="Preview"]') || canvas?.closest('section');
    const asides = [...document.querySelectorAll('aside')];
    const details = asides.find((a) => /Details/.test(a.textContent || '')) || null;
    const proBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Pro' && b.getBoundingClientRect().y < 100);
    return {
      tabs,
      canvasRect: rect(canvas),
      wrapperRect: rect(wrapper),
      previewSectionRect: rect(section),
      detailsRect: rect(details),
      proBtnRect: rect(proBtn),
      proBtnHTML: proBtn?.outerHTML?.slice(0, 300),
      detailsRows: details ? [...details.querySelectorAll('*')].filter((e) => /^(Name|Path|Imported media|Arrange layers|Proxy|Aspect ratio|Resolution)$/.test(e.textContent?.trim() || '')).map((e) => e.textContent?.trim()) : [],
    };
  });
  // Pixel check: sample the canvas center + template card via screenshot analysis in node below.
  await page.screenshot({ path: path.join(ROOT, 'audit', 'capcut-fix', 'v105', 'zoom150short-editor-empty.png') });
  out.pageErrors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
}
main();
