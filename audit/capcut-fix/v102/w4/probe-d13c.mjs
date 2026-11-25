#!/usr/bin/env node
/**
 * W4 D13 re-test #2: mask + transform (aside selector) and Ratio via
 * real mouse coordinates + DOM click. Run: node audit/capcut-fix/v102/w4/probe-d13c.mjs
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'w4');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

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
      await page.screenshot({ path: path.join(OUT, `d13c-${name}-fail.png`) }).catch(() => undefined);
    }
  };

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await dismissDialogs(page);
  await page.getByText('Sunset Coast').first().click();
  await page.waitForTimeout(1000);
  await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
  await page.waitForTimeout(400);

  await check('inspector-mask', async () => {
    const maskBtn = page.locator('aside[aria-label="Properties"] button', { hasText: 'Mask' }).first();
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

  await check('inspector-blend-opacity-transform', async () => {
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
    const posX = page.locator('aside[aria-label="Properties"] label', { hasText: 'Position X' }).locator('input');
    await posX.fill('10');
    await page.waitForTimeout(300);
    const posXValue = await posX.inputValue();
    const rot = page.locator('aside[aria-label="Properties"] label', { hasText: 'Rotate' }).locator('input');
    await rot.fill('15');
    await page.waitForTimeout(300);
    const rotValue = await rot.inputValue();
    // Values must persist after reselecting the clip.
    await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
    await page.waitForTimeout(400);
    const opacityAgain = await page.locator('input[aria-label="Opacity percent"]').inputValue();
    const scaleAgain = await page.locator('input[aria-label="Scale percent"]').inputValue();
    return { blendValue, detail: `blend=${blendValue} opacity=${opacityValue} (reselect ${opacityAgain}) scale=${scaleValue} (reselect ${scaleAgain}) posX=${posXValue} rotate=${rotValue}`, opacityValue, posXValue, rotValue, scaleValue };
  });

  await check('inspector-ratio', async () => {
    // Where is the Ratio button, and does a real mouse click open the menu?
    const box = await page.locator('section[aria-label="Preview"] button', { hasText: 'Ratio' }).first().boundingBox();
    if (!box) return { detail: 'Ratio button not found in Preview section' };
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);
    const menuState = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('section[aria-label="Preview"] button')].map((b) => b.textContent?.trim());
      return { has916: btns.includes('9:16'), ratioButtons: btns.filter((t) => t && /Ratio|16:9|9:16/.test(t)) };
    });
    await page.screenshot({ path: path.join(OUT, 'd13c-ratio-menu.png') });
    if (!menuState.has916) return { detail: `menu did not open after real mouse click; preview buttons: ${JSON.stringify(menuState.ratioButtons)}` };
    // Click the 9:16 option via DOM click (bypasses hit-target checks).
    const clicked = await page.evaluate(() => {
      const b = [...document.querySelectorAll('section[aria-label="Preview"] button')].find((x) => x.textContent?.trim() === '9:16');
      if (!b) return false;
      b.click();
      return true;
    });
    await page.waitForTimeout(500);
    const aspect = await page.evaluate(() => {
      const c = document.querySelector('canvas[aria-label="Preview canvas"]');
      return c?.parentElement?.className ?? '';
    });
    return { detail: `menu opened: ${menuState.has916}, 9:16 clicked: ${clicked}, aspect now 9:16: ${aspect.includes('9/16')}` };
  });

  R.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'd13c.json'), JSON.stringify(R, null, 2));
  console.log(JSON.stringify(R, null, 2));
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
