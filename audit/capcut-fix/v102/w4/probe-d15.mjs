#!/usr/bin/env node
/**
 * W4 D15 verify: drag-and-drop + "+" apply; sticker redirect; pixel change.
 * Run: node audit/capcut-fix/v102/w4/probe-d15.mjs
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'w4');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

async function openSample(page) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(400); }
  await page.getByText('Sunset Coast').first().click();
  await page.waitForTimeout(1000);
}

const tabBtn = (page, n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();

async function appliedNames(page) {
  return page.evaluate(() => {
    const sec = document.querySelector('section[aria-label="Applied effects"]');
    if (!sec) return null;
    return sec.textContent?.replace(/\s+/g, ' ').trim().slice(0, 500);
  });
}

async function canvasHash(page) {
  const dataUrl = await page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    return c ? c.toDataURL('image/png') : null;
  });
  if (!dataUrl) return null;
  return createHash('sha256').update(Buffer.from(dataUrl.split(',')[1], 'base64')).digest('hex').slice(0, 16);
}

async function dropOnClip(page, payload, clipName) {
  return page.evaluate(async ({ payload, clipName }) => {
    const clips = [...document.querySelectorAll('section[aria-label="Timeline"] [role="button"]')];
    const el = clips.find((c) => (c.textContent ?? '').includes(clipName));
    if (!el) return { found: false };
    const dt = new DataTransfer();
    dt.setData('application/x-vidora-panel-drag', JSON.stringify(payload));
    dt.setData('text/plain', JSON.stringify(payload));
    el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    return { found: true };
  }, { clipName, payload });
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  const out = {};
  try {
    await openSample(page);
    // --- Pixel change: add a real AI image clip, apply Warm Glow, compare canvas.
    await tabBtn(page, 'Media').click();
    await page.waitForTimeout(600);
    // Switch the Media sub-nav from Import to the Media section (AI library).
    const mediaSub = page.locator('nav[aria-label="Panel sections"] button', { hasText: 'Media' }).first();
    if (await mediaSub.count()) { await mediaSub.click(); await page.waitForTimeout(800); }
    const aiSection = page.locator('section', { hasText: 'AI images' }).last();
    await aiSection.scrollIntoViewIfNeeded().catch(() => undefined);
    await page.waitForTimeout(400);
    const firstAiImg = page.locator('button[title*="click to add to timeline"]').first();
    out.aiImageFound = (await firstAiImg.count()) > 0;
    if (out.aiImageFound) {
      await firstAiImg.click();
      await page.waitForTimeout(1200);
      // The new clip lands AFTER the sample clip (start 10s) — seek the
      // playhead onto it by clicking the ruler above its position, so
      // the preview actually shows it.
      const seeked = await page.evaluate(() => {
        const clips = [...document.querySelectorAll('section[aria-label="Timeline"] [role="button"]')];
        const el = clips.find((c) => !(c.textContent ?? '').includes('Sunset Coast'));
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const ruler = document.querySelector('section[aria-label="Timeline"] div.relative.h-6');
        if (!ruler) return false;
        const rr = ruler.getBoundingClientRect();
        const x = Math.min(r.left + 20, rr.right - 5);
        const ev = new MouseEvent('click', { bubbles: true, clientX: x, clientY: rr.top + rr.height / 2 });
        ruler.dispatchEvent(ev);
        return true;
      });
      out.seekedOntoImageClip = seeked;
      await page.waitForTimeout(1200);
      out.webgl2 = await page.evaluate(() => {
        const c = document.createElement('canvas');
        return !!c.getContext('webgl2');
      });
      out.hashBeforeEffect = await canvasHash(page);
      await tabBtn(page, 'Effects').click();
      await page.waitForTimeout(600);
      const plus = page.getByRole('button', { name: 'Apply Warm Glow' }).first();
      out.warmGlowPlusFound = (await plus.count()) > 0;
      if (out.warmGlowPlusFound) {
        await plus.click();
        await page.waitForTimeout(900);
        out.hashAfterEffect = await canvasHash(page);
        out.pixelsChanged = out.hashBeforeEffect !== out.hashAfterEffect;
        out.appliedAfterPlus = await appliedNames(page);
        await page.screenshot({ path: path.join(OUT, 'd15-effect-on-image.png') });
      }
    }

    // --- Drag Cool Dusk onto the Video 1 clip (the sample title card).
    await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
    await page.waitForTimeout(400);
    await tabBtn(page, 'Effects').click();
    await page.waitForTimeout(500);
    out.dragVideo = await dropOnClip(page, { id: 'cool-dusk', kind: 'effect' }, 'Sunset Coast');
    await page.waitForTimeout(700);
    out.appliedAfterDrag = await appliedNames(page);
    out.dragAppliedCoolDusk = (out.appliedAfterDrag ?? '').includes('Cool Dusk');
    await page.screenshot({ path: path.join(OUT, 'd15-drag-applied.png') });

    // --- "+" on another tile (Mono Ink).
    const monoPlus = page.getByRole('button', { name: 'Apply Mono Ink' }).first();
    out.monoPlusFound = (await monoPlus.count()) > 0;
    if (out.monoPlusFound) {
      await monoPlus.click();
      await page.waitForTimeout(600);
      out.appliedAfterPlus2 = await appliedNames(page);
      out.plusAppliedMonoInk = (out.appliedAfterPlus2 ?? '').includes('Mono Ink');
    }

    // --- Sticker redirect: add a sticker, then click an effect tile.
    await tabBtn(page, 'Stickers').click();
    await page.waitForTimeout(700);
    const stickerTile = page.locator('button[aria-label^="Add sticker"]').first();
    out.stickerTileFound = (await stickerTile.count()) > 0;
    if (out.stickerTileFound) {
      await stickerTile.click();
      await page.waitForTimeout(800);
      out.stickerTrackName = await page.evaluate(() => {
        const heads = [...document.querySelectorAll('section[aria-label="Timeline"] span')].map((s) => s.textContent);
        return heads.find((t) => t?.startsWith('Stickers')) ?? null;
      });
      await tabBtn(page, 'Effects').click();
      await page.waitForTimeout(600);
      const hue = page.locator('button', { hasText: 'Hue Drift' }).first();
      out.hueFound = (await hue.count()) > 0;
      if (out.hueFound) {
        await hue.click();
        await page.waitForTimeout(700);
        out.redirectNote = await page.evaluate(() => {
          const el = document.querySelector('[role="status"]');
          return el?.textContent?.slice(0, 200) ?? null;
        });
        out.stickerApplied = await appliedNames(page);
        // Select the video clip again: its list must show Hue Drift.
        await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
        await page.waitForTimeout(500);
        out.videoAppliedAfterRedirect = await appliedNames(page);
        await page.screenshot({ path: path.join(OUT, 'd15-sticker-redirect.png') });
      }
      // --- Drop an effect ON the sticker clip in the timeline: hint, no stack.
      const stickerClipName = await page.evaluate(() => {
        const clips = [...document.querySelectorAll('section[aria-label="Timeline"] [role="button"]')];
        const el = clips.find((c) => !(c.textContent ?? '').includes('Sunset Coast'));
        return el?.textContent?.trim().slice(0, 40) ?? null;
      });
      out.stickerClipName = stickerClipName;
      if (stickerClipName) {
        out.dropOnSticker = await dropOnClip(page, { id: 'warm-glow', kind: 'effect' }, stickerClipName.slice(0, 12));
        await page.waitForTimeout(500);
        out.dropHint = await page.evaluate(() => {
          const bars = [...document.querySelectorAll('section[aria-label="Timeline"] [role="status"]')];
          return bars.map((b) => b.textContent?.slice(0, 200));
        });
        await page.screenshot({ path: path.join(OUT, 'd15-drop-on-sticker.png') });
      }
    }

    // --- Drag a sticker onto the preview adds it at the playhead.
    const tracksBefore = await page.evaluate(() => document.querySelectorAll('section[aria-label="Timeline"] [role="button"]').length);
    await tabBtn(page, 'Stickers').click();
    await page.waitForTimeout(500);
    out.previewDrop = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas[aria-label="Preview canvas"]');
      if (!canvas) return { found: false };
      const dt = new DataTransfer();
      dt.setData('application/x-vidora-panel-drag', JSON.stringify({ id: 'smile-violet', kind: 'sticker' }));
      canvas.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
      canvas.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
      return { found: true };
    });
    await page.waitForTimeout(800);
    const tracksAfter = await page.evaluate(() => document.querySelectorAll('section[aria-label="Timeline"] [role="button"]').length);
    out.stickerAddedViaPreviewDrop = tracksAfter > tracksBefore;
  } catch (e) {
    out.error = String(e).slice(0, 500);
  }
  out.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'd15.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
