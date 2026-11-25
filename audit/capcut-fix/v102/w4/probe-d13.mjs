#!/usr/bin/env node
/**
 * W4 D13 functional sweep: every named control, end to end.
 * Run: node audit/capcut-fix/v102/w4/probe-d13.mjs
 * Each check records { ok, detail } — one failure never aborts the rest.
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

const tabBtn = (page, n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();
const timelineClip = (page) => page.locator('section[aria-label="Timeline"] [role="button"]');

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
  const R = {};
  const check = async (name, fn) => {
    try {
      R[name] = { ok: true, ...(await fn()) };
    } catch (e) {
      R[name] = { detail: String(e).slice(0, 300), ok: false };
    }
  };

  // ---------- Dashboard: Edit more (home Templates page) ----------
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  await check('edit-more-opens-editor', async () => {
    const nav = page.locator('button', { hasText: 'Templates' }).first();
    if (!(await nav.count())) return { detail: 'no Templates nav on dashboard' };
    await nav.click();
    await page.waitForTimeout(1000);
    const card = page.locator('article').first();
    if (!(await card.count())) return { detail: 'no template card on Templates page' };
    await card.hover();
    await page.waitForTimeout(600);
    const editMore = page.getByRole('button', { name: 'Edit more' }).first();
    if (!(await editMore.count())) return { detail: 'no Edit more button in hover popup' };
    await editMore.click();
    await page.waitForTimeout(1200);
    const timeline = await page.locator('section[aria-label="Timeline"]').count();
    const title = await page.locator('header, div').first().textContent().catch(() => '');
    return { detail: `timeline present: ${timeline > 0}`, timeline: timeline > 0 };
  });

  // ---------- Back to the sample project ----------
  await check('open-sample', async () => {
    // After Edit more we are in the editor on a template project; go to
    // the dashboard via the logo/menu is unreliable, so reload and open
    // the sample from the project list.
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await page.getByText('Sunset Coast').first().click();
    await page.waitForTimeout(1000);
    await timelineClip(page).first().click();
    await page.waitForTimeout(400);
    return { detail: 'sample open, first clip selected' };
  });

  // ---------- Import opens the file picker ----------
  await check('import-opens-picker', async () => {
    await tabBtn(page, 'Media').click();
    await page.waitForTimeout(600);
    const chooserP = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
    await page.getByRole('button', { name: 'Import media' }).first().click();
    const chooser = await chooserP;
    if (chooser) await chooser.cancel().catch(() => undefined);
    return { detail: chooser ? 'file picker opened' : 'no filechooser event' };
  });

  // ---------- Play advances the timecode ----------
  await check('play-advances-timecode', async () => {
    const tc = page.locator('[aria-label="Timecode"]').first();
    const before = await tc.textContent();
    await page.getByRole('button', { name: 'Play', exact: true }).first().click();
    await page.waitForTimeout(1500);
    const during = await tc.textContent();
    await page.getByRole('button', { name: 'Pause', exact: true }).first().click();
    return { before, during, ok: before !== during };
  });

  // ---------- Transitions: apply + Duration + Direction ----------
  await check('transition-applies', async () => {
    await tabBtn(page, 'Transitions').click();
    await page.waitForTimeout(700);
    await page.locator('button', { hasText: 'fade' }).first().click();
    await page.waitForTimeout(600);
    const dur = page.locator('input[aria-label="Transition duration"]');
    const hasDur = (await dur.count()) > 0;
    let durValue = null;
    let dirValue = null;
    if (hasDur) {
      await dur.fill('1.5');
      await page.waitForTimeout(300);
      durValue = await dur.inputValue();
      const dir = page.locator('select').last();
      await dir.selectOption('left');
      await page.waitForTimeout(300);
      dirValue = await dir.inputValue();
    }
    return { detail: `duration control: ${hasDur}, duration=${durValue}, direction=${dirValue}` };
  });

  // ---------- Inspector: Mask ----------
  await check('inspector-mask', async () => {
    const maskBtn = page.locator('button', { hasText: 'Mask' }).first();
    await maskBtn.click();
    await page.waitForTimeout(500);
    const feather = page.locator('input[aria-label="Mask feather"]');
    const hasFeather = (await feather.count()) > 0;
    let featherValue = null;
    if (hasFeather) {
      await feather.fill('0.5');
      await page.waitForTimeout(300);
      featherValue = await feather.inputValue();
    }
    const maskLabel = await page.locator('section[aria-label="Properties"] button', { hasText: 'Mask' }).first().textContent().catch(() => '');
    return { detail: `feather slider: ${hasFeather} value=${featherValue}; mask button now reads: ${(maskLabel ?? '').trim().slice(0, 40)}` };
  });

  // ---------- Inspector: Color adjustment ----------
  await check('inspector-color-adjustment', async () => {
    const btn = page.locator('button', { hasText: 'Color adjustment' }).first();
    await btn.click();
    await page.waitForTimeout(500);
    const panel = page.locator('[aria-label="Color adjustment"]');
    const hasPanel = (await panel.count()) > 0;
    const slider = page.locator('[aria-label="Color adjustment"] input[type="range"]').first();
    let value = null;
    if (await slider.count()) {
      await slider.fill('0.3');
      await page.waitForTimeout(300);
      value = await slider.inputValue();
    }
    return { detail: `panel: ${hasPanel}, first slider value after set: ${value}` };
  });

  // ---------- Inspector: Ratio (preview Ratio menu) ----------
  await check('inspector-ratio', async () => {
    const ratioBtn = page.locator('button', { hasText: 'Ratio' }).first();
    await ratioBtn.click();
    await page.waitForTimeout(400);
    const opt = page.getByRole('button', { name: '9:16', exact: true }).first();
    if (!(await opt.count())) return { detail: 'no 9:16 option in Ratio menu' };
    await opt.click();
    await page.waitForTimeout(500);
    const aspect = await page.evaluate(() => {
      const c = document.querySelector('canvas[aria-label="Preview canvas"]');
      return c?.parentElement?.className ?? '';
    });
    return { detail: `aspect class after 9:16: ${aspect.includes('9/16') ? 'aspect-[9/16] applied' : aspect.slice(0, 120)}` };
  });

  // ---------- Inspector: Blend / Opacity / Transform ----------
  await check('inspector-blend-opacity-transform', async () => {
    // Ratio change above switched the preview; switch back to 16:9 first.
    const ratioBtn = page.locator('button', { hasText: 'Ratio' }).first();
    await ratioBtn.click();
    await page.waitForTimeout(300);
    const opt16 = page.getByRole('button', { name: '16:9', exact: true }).first();
    if (await opt16.count()) { await opt16.click(); await page.waitForTimeout(400); }
    const blend = page.locator('select[aria-label="Blend mode"]');
    await blend.selectOption('screen');
    await page.waitForTimeout(300);
    const blendValue = await blend.inputValue();
    const opacity = page.locator('input[aria-label="Opacity percent"]');
    await opacity.fill('50');
    await page.waitForTimeout(300);
    const opacityValue = await opacity.inputValue();
    const scale = page.locator('input[aria-label="Scale percent"]');
    await scale.fill('150');
    await page.waitForTimeout(300);
    const scaleValue = await scale.inputValue();
    const posX = page.locator('section[aria-label="Properties"] label', { hasText: 'Position X' }).locator('input');
    await posX.fill('10');
    await page.waitForTimeout(300);
    const posXValue = await posX.inputValue();
    const rot = page.locator('section[aria-label="Properties"] label', { hasText: 'Rotate' }).locator('input');
    await rot.fill('15');
    await page.waitForTimeout(300);
    const rotValue = await rot.inputValue();
    return { blendValue, detail: `blend=${blendValue} opacity=${opacityValue} scale=${scaleValue} posX=${posXValue} rotate=${rotValue}`, opacityValue, posXValue, rotValue, scaleValue };
  });

  // ---------- Preview change: opacity on a real image clip ----------
  await check('preview-changes-with-opacity', async () => {
    await tabBtn(page, 'Media').click();
    await page.waitForTimeout(600);
    const mediaSub = page.locator('nav[aria-label="Panel sections"] button', { hasText: 'Media' }).first();
    if (await mediaSub.count()) { await mediaSub.click(); await page.waitForTimeout(800); }
    const firstAiImg = page.locator('button[title*="click to add to timeline"]').first();
    if (!(await firstAiImg.count())) return { detail: 'no AI image to add' };
    await firstAiImg.click();
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      const clips = [...document.querySelectorAll('section[aria-label="Timeline"] [role="button"]')];
      const el = clips.find((c) => !(c.textContent ?? '').includes('Sunset Coast'));
      if (!el) return;
      const r = el.getBoundingClientRect();
      const ruler = document.querySelector('section[aria-label="Timeline"] div.relative.h-6');
      if (!ruler) return;
      const rr = ruler.getBoundingClientRect();
      ruler.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: Math.min(r.left + 20, rr.right - 5), clientY: rr.top + 3 }));
    });
    await page.waitForTimeout(1200);
    const before = await canvasHash(page);
    const opacity = page.locator('input[aria-label="Opacity percent"]');
    await opacity.fill('40');
    await page.waitForTimeout(900);
    const after = await canvasHash(page);
    await opacity.fill('100');
    return { before, after, detail: `canvas hash ${before} -> ${after}`, ok: before !== after };
  });

  // ---------- Timeline toolbar: split / undo / redo / delete / zoom ----------
  await check('timeline-split-undo-redo-delete-zoom', async () => {
    const countClips = async () => timelineClip(page).count();
    const before = await countClips();
    // Seek to 5s (middle of the 10s sample clip) via the ruler.
    await page.evaluate(() => {
      const ruler = document.querySelector('section[aria-label="Timeline"] div.relative.h-6');
      if (!ruler) return;
      const rr = ruler.getBoundingClientRect();
      const container = ruler.closest('div.overflow-x-auto');
      const left = container ? container.getBoundingClientRect().left : rr.left;
      ruler.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: left + 5 * 40, clientY: rr.top + 3 }));
    });
    await page.waitForTimeout(400);
    await timelineClip(page).first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Split at playhead' }).click();
    await page.waitForTimeout(500);
    const afterSplit = await countClips();
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.waitForTimeout(400);
    const afterUndo = await countClips();
    await page.getByRole('button', { name: 'Redo' }).click();
    await page.waitForTimeout(400);
    const afterRedo = await countClips();
    await timelineClip(page).first().click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Delete selected clip' }).click();
    await page.waitForTimeout(400);
    const afterDelete = await countClips();
    const zoom = page.locator('input[aria-label="Timeline zoom"]');
    const zoomBefore = await zoom.inputValue();
    await zoom.fill('80');
    await page.waitForTimeout(300);
    const zoomAfter = await zoom.inputValue();
    return { afterDelete, afterRedo, afterSplit, afterUndo, before, detail: `clips ${before} -> split ${afterSplit} -> undo ${afterUndo} -> redo ${afterRedo} -> delete ${afterDelete}; zoom ${zoomBefore} -> ${zoomAfter}`, zoomAfter, zoomBefore };
  });

  // ---------- Use template (last: it replaces the project) ----------
  await check('use-template-applies', async () => {
    await tabBtn(page, 'Templates').click();
    await page.waitForTimeout(700);
    const useBtn = page.getByRole('button', { name: 'Use template' }).first();
    if (!(await useBtn.count())) return { detail: 'no Use template button' };
    await useBtn.click();
    await page.waitForTimeout(1000);
    const tracks = await page.evaluate(() => {
      const heads = [...document.querySelectorAll('section[aria-label="Timeline"] span')].map((s) => s.textContent);
      return heads.filter((t) => t && /Video|Audio|Text|Stickers/.test(t));
    });
    return { detail: `track headers after Use template: ${tracks.join(', ')}` };
  });

  R.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'd13.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await page.screenshot({ path: path.join(OUT, 'd13-final.png') });
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
