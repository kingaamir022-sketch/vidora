#!/usr/bin/env node
/** One-off interaction checks for the rebuilt home (preview build :5198). */
import { chromium } from 'playwright-core';

const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5198/';

async function main() {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  const skip = page.getByRole('button', { name: /Skip tour/i });
  if (await skip.count()) await skip.first().click();
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) await agree.click();
  await page.waitForTimeout(400);
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) await okBtn.click();
  await page.waitForTimeout(400);
  const skip2 = page.getByRole('button', { name: /Skip tour/i });
  if (await skip2.count()) await skip2.first().click();

  // 1. Create project banner opens the editor with a new project.
  await page.getByRole('button', { name: /Create project/ }).click();
  await page.waitForTimeout(900);
  const editorVisible = await page.locator('text=Player-Timeline').count().catch(() => 0);
  console.log('1. banner -> editor, Player-Timeline visible:', editorVisible > 0);
  // Back to dashboard via the top bar menu/dashboard control if present.
  const dashBtn = page.getByRole('button', { name: /Dashboard|Vidora/i }).first();
  console.log('   dashboard-return control present:', (await dashBtn.count()) > 0);

  // 2. Use template opens the editor with the template applied.
  // Reload fresh (dashboard state), go to Templates, use the first template.
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  // Terms already agreed in this context (same browser context, localStorage kept).
  const skip3 = page.getByRole('button', { name: /Skip tour/i });
  if (await skip3.count()) await skip3.first().click();
  await page.getByRole('button', { name: 'Templates' }).first().click();
  await page.waitForTimeout(600);
  await page.locator('[aria-label^="Preview template"]').first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Use template', exact: true }).click();
  await page.waitForTimeout(1000);
  const timelineClips = await page.evaluate(() => document.body.innerText.includes('Bold Opening'));
  console.log('2. Use template -> editor shows template project name:', timelineClips);

  // 3. Project card "…" menu (back on dashboard).
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const skip4 = page.getByRole('button', { name: /Skip tour/i });
  if (await skip4.count()) await skip4.first().click();
  await page.getByRole('button', { name: /More options for/ }).first().click();
  await page.waitForTimeout(400);
  const menuItems = await page.getByRole('menuitem').allTextContents();
  console.log('3. card menu items:', JSON.stringify(menuItems));
  await page.mouse.click(1400, 500); // click the menu's close overlay
  await page.waitForTimeout(300);

  // 4. Sign-in + Pro honest notes.
  await page.getByRole('button', { name: 'Sign in' }).first().click();
  await page.waitForTimeout(400);
  console.log('4. sign-in note visible:', (await page.getByText(/Sign-in isn’t available/).count()) > 0);
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Join Pro' }).click();
  await page.waitForTimeout(400);
  console.log('   pro note visible:', (await page.getByText(/Pro features are included/).count()) > 0);

  console.log('page errors:', errors.length === 0 ? 'none' : errors);
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
