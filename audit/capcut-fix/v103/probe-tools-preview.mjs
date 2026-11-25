#!/usr/bin/env node
/**
 * v1.0.3 Tools preview-change probe: the sample project has NO media
 * (its clip is a procedural background), so a CSS tool effect cannot
 * change its preview pixels. This probe imports a REAL image, adds it
 * to the timeline, applies HD Cam 2, and asserts the preview canvas
 * actually changes.
 * Run: node audit/capcut-fix/v103/probe-tools-preview.mjs (dev server :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v103');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';
const IMAGE = path.join(ROOT, 'public', 'ai-library', 'images', 'textures', 'ai-texture-01.png');

async function canvasHash(page) {
  const dataUrl = await page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    return c ? c.toDataURL('image/png') : null;
  });
  return dataUrl ? createHash('sha256').update(Buffer.from(dataUrl.split(',')[1], 'base64')).digest('hex').slice(0, 12) : null;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  const out = {};

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
  // The "Manage software updates" modal appears right after the Terms
  // dialog — dismiss it BEFORE Create project is clickable.
  const okFirst = page.getByRole('button', { name: 'OK', exact: true });
  if (await okFirst.count()) { await okFirst.first().click().catch(() => {}); await page.waitForTimeout(400); }
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }

  // Import a real image via the Media import file input.
  const input = page.locator('input[accept="video/*,image/*,audio/*,.gif"]');
  out.fileInputFound = (await input.count()) > 0;
  if (!out.fileInputFound) { console.log(JSON.stringify({ ...out, ok: false }, null, 1)); await browser.close(); process.exit(1); }
  await input.first().setInputFiles(IMAGE);
  await page.waitForTimeout(1500);
  // Imported items list under the "Media" section, not "Import".
  const mediaNav = page.locator('nav[aria-label="Panel sections"] button', { hasText: 'Media' }).first();
  if (await mediaNav.count()) { await mediaNav.click(); await page.waitForTimeout(600); }
  const mediaItem = page.locator('button', { hasText: 'ai-texture-01' }).first();
  out.mediaImported = (await mediaItem.count()) > 0;
  if (!out.mediaImported) { console.log(JSON.stringify({ ...out, ok: false }, null, 1)); await browser.close(); process.exit(1); }
  await mediaItem.click();
  await page.waitForTimeout(1200);

  // Select the clip on the timeline.
  const clip = page.locator('section[aria-label="Timeline"] [role="button"]').first();
  out.timelineClipFound = (await clip.count()) > 0;
  if (out.timelineClipFound) { await clip.click(); await page.waitForTimeout(600); }

  const hashBefore = await canvasHash(page);
  out.hashBefore = hashBefore;

  // Filters tab -> Tools -> HD Cam 2.
  const tabBtn = (n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();
  await tabBtn('Filters').click();
  await page.waitForTimeout(600);
  const toolBtn = page.locator('nav[aria-label="Panel sections"] button', { hasText: 'HD Cam 2' }).first();
  out.toolButtonFound = (await toolBtn.count()) > 0;
  await toolBtn.click();
  await page.waitForTimeout(1200);
  const hashAfter = await canvasHash(page);
  out.hashAfter = hashAfter;
  out.previewChanged = !!hashBefore && !!hashAfter && hashBefore !== hashAfter;
  out.appliedCard = (await page.locator('[aria-label="Applied tools"]').count()) > 0;
  out.pageErrors = errors;
  out.ok = out.previewChanged && out.appliedCard && errors.length === 0;
  await page.screenshot({ path: path.join(OUT, 'tools-preview.png') });
  await fs.writeFile(path.join(OUT, 'probe-tools-preview.json'), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
  process.exit(out.ok ? 0 : 1);
}
main();
