#!/usr/bin/env node
/**
 * W4 D13 re-test: the 5 items the first sweep could not settle (probe
 * gaps: update modal not dismissed, unscoped selectors, mask shape
 * never chosen). Run: node audit/capcut-fix/v102/w4/probe-d13b.mjs
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'w4');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

const tabBtn = (page, n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();

async function dismissDialogs(page) {
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(400); }
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
      R[name] = { detail: String(e).slice(0, 400), ok: false };
      await page.screenshot({ path: path.join(OUT, `d13b-${name}-fail.png`) }).catch(() => undefined);
    }
  };

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await dismissDialogs(page);

  await check('edit-more-opens-editor', async () => {
    await page.locator('button', { hasText: 'Templates' }).first().click();
    await page.waitForTimeout(1000);
    const card = page.locator('article').first();
    await card.hover();
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Edit more' }).first().click();
    await page.waitForTimeout(1200);
    const timeline = await page.locator('section[aria-label="Timeline"]').count();
    const projectTitle = await page.locator('header, div').first().textContent().catch(() => '');
    return { detail: `timeline: ${timeline > 0}; top bar: ${(projectTitle ?? '').slice(0, 80)}`, timeline: timeline > 0 };
  });

  // Back to the sample.
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await dismissDialogs(page);
  await page.getByText('Sunset Coast').first().click();
  await page.waitForTimeout(1000);
  await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
  await page.waitForTimeout(400);

  await check('import-opens-picker', async () => {
    await tabBtn(page, 'Media').click();
    await page.waitForTimeout(600);
    const chooserP = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
    await page.getByRole('button', { name: 'Import media' }).first().click();
    const chooser = await chooserP;
    return { detail: chooser ? 'file picker opened (filechooser event fired)' : 'no filechooser event' };
  });

  await check('transition-direction', async () => {
    await tabBtn(page, 'Transitions').click();
    await page.waitForTimeout(700);
    await page.locator('button', { hasText: 'fade' }).first().click();
    await page.waitForTimeout(600);
    const dur = page.locator('input[aria-label="Transition duration"]');
    await dur.fill('1.5');
    await page.waitForTimeout(300);
    const durValue = await dur.inputValue();
    const dir = page.locator('label', { hasText: 'Direction' }).locator('select');
    await dir.selectOption('left');
    await page.waitForTimeout(300);
    const dirValue = await dir.inputValue();
    // Re-select the clip: Duration/Direction must persist on the clip.
    await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
    await page.waitForTimeout(400);
    const durAgain = await page.locator('input[aria-label="Transition duration"]').inputValue().catch(() => null);
    return { detail: `duration=${durValue} (after reselect ${durAgain}), direction=${dirValue}` };
  });

  await check('inspector-mask', async () => {
    const maskBtn = page.locator('section[aria-label="Properties"] button', { hasText: 'Mask' }).first();
    await maskBtn.scrollIntoViewIfNeeded();
    await maskBtn.click();
    await page.waitForTimeout(500);
    const shape = page.locator('label', { hasText: 'Mask shape' }).locator('select');
    await shape.selectOption('circle');
    await page.waitForTimeout(400);
    const feather = page.locator('input[aria-label="Mask feather"]');
    await feather.fill('0.5');
    await page.waitForTimeout(300);
    const featherValue = await feather.inputValue();
    const btnText = (await maskBtn.textContent())?.replace(/\s+/g, ' ').trim();
    return { detail: `mask button now reads "${btnText}"; feather=${featherValue}` };
  });

  await check('inspector-ratio', async () => {
    await page.locator('button', { hasText: 'Ratio' }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, 'd13b-ratio-menu.png') });
    await page.getByRole('button', { name: '9:16', exact: true }).first().click({ timeout: 10000 });
    await page.waitForTimeout(500);
    const aspect = await page.evaluate(() => {
      const c = document.querySelector('canvas[aria-label="Preview canvas"]');
      return c?.parentElement?.className ?? '';
    });
    const is916 = aspect.includes('9/16');
    // Back to 16:9 for the remaining checks.
    await page.locator('button', { hasText: 'Ratio' }).first().click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: '16:9', exact: true }).first().click({ timeout: 10000 });
    await page.waitForTimeout(400);
    return { detail: `9:16 applied: ${is916} (aspect class: ${aspect.slice(0, 100)})` };
  });

  await check('inspector-blend-opacity-transform', async () => {
    const blend = page.locator('select[aria-label="Blend mode"]');
    await blend.scrollIntoViewIfNeeded();
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
    await posX.scrollIntoViewIfNeeded();
    await posX.fill('10');
    await page.waitForTimeout(300);
    const posXValue = await posX.inputValue();
    const rot = page.locator('section[aria-label="Properties"] label', { hasText: 'Rotate' }).locator('input');
    await rot.fill('15');
    await page.waitForTimeout(300);
    const rotValue = await rot.inputValue();
    return { blendValue, detail: `blend=${blendValue} opacity=${opacityValue} scale=${scaleValue} posX=${posXValue} rotate=${rotValue}`, opacityValue, posXValue, rotValue, scaleValue };
  });

  R.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'd13b.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
