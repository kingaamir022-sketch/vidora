import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell', viewport: { width: 1920, height: 1080 } });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
await page.goto('http://127.0.0.1:5200/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const agree = page.getByRole('button', { name: 'Agree and continue' });
if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
const okBtn = page.getByRole('button', { name: 'OK', exact: true });
if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
await page.getByRole('button', { name: 'Create project' }).first().click();
await page.waitForTimeout(1500);
const IMAGE = 'public/ai-library/images/textures/ai-texture-01.png';
const input = page.locator('input[accept="video/*,image/*,audio/*,.gif"]');
await input.first().setInputFiles(IMAGE);
await page.waitForTimeout(2500);
const mediaNav = page.locator('nav[aria-label="Panel sections"] button', { hasText: 'Media' }).first();
await mediaNav.click();
await page.waitForTimeout(600);
await page.locator('button', { hasText: 'ai-texture-01' }).first().click();
await page.waitForTimeout(1200);
await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
// Sample container + wrapper sizes over 2.5s after the clip click.
for (let i = 0; i < 10; i++) {
  const g = await page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    const wrap = c?.parentElement;
    const cont = wrap?.parentElement;
    return cont ? { contW: cont.clientWidth, contH: cont.clientHeight, wrapW: wrap.offsetWidth, wrapH: wrap.offsetHeight } : null;
  });
  console.log(i * 250 + 'ms', JSON.stringify(g));
  await page.waitForTimeout(250);
}
// Now click Full and sample the canvas box over 1s.
await page.getByRole('button', { name: 'Full', exact: true }).first().click();
for (let i = 0; i < 5; i++) {
  const g = await page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
  });
  console.log('full+' + i * 200 + 'ms', JSON.stringify(g));
  await page.waitForTimeout(200);
}
await browser.close();
