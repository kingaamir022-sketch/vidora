import { chromium } from 'playwright-core';
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://127.0.0.1:5199/', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const agree = page.getByRole('button', { name: 'Agree and continue' });
if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
const updOk = page.getByRole('button', { name: 'OK', exact: true });
if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(500); }
// Open the sample project from the dashboard card.
await page.getByText('Sunset Coast — Sample Project').first().click();
await page.waitForTimeout(1200);
// Select the clip on the timeline first (Crop needs a selection).
await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
await page.waitForTimeout(600);
// Floating Crop button in the preview toolbar (PreviewArea) — must open
// the inspector Basic sub-panel (PropertiesPanel listens for
// 'vidora:open-inspector-basic').
const cropBtn = page.locator('button[title="Crop"]').first();
console.log('crop button count:', await cropBtn.count());
await cropBtn.click();
await page.waitForTimeout(800);
const inspector = await page.locator('aside[aria-label="Properties"]').textContent().catch(() => '');
console.log('inspector shows Basic:', inspector.includes('Basic'));
console.log('inspector shows Transform:', inspector.includes('Transform'));
console.log('inspector shows Color adjustment:', inspector.includes('Color adjustment'));
console.log('page errors:', errors.length, errors.slice(0, 2));
await browser.close();
