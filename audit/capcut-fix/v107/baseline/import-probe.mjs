import { chromium } from 'playwright-core';
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';
const SIZES = [
  { name: '1920x1080-dsf1', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  { name: '1920x1080-dsf1.5-css1280x720', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 },
  { name: '1366x768-dsf1', viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 },
  { name: '1280x720-dsf1', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
  { name: '1024x768-dsf1', viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 },
];
async function dismissDialogs(page) {
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
}
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const out = {};
for (const s of SIZES) {
  const ctx = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: s.deviceScaleFactor });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await dismissDialogs(page);
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
  await dismissDialogs(page);
  const mediaTab = page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: 'Media' }).first();
  if (await mediaTab.count()) { await mediaTab.click(); await page.waitForTimeout(900); }
  out[s.name] = await page.evaluate(() => {
    const rr = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), right: Math.round(b.right), bottom: Math.round(b.bottom) }; };
    // All leaf-ish elements whose own text mentions Import, smallest area first
    const cands = [...document.querySelectorAll('button, label, div, span, p')]
      .filter((e) => /import/i.test(e.textContent || '') && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0)
      .map((e) => ({ tag: e.tagName, text: (e.textContent || '').trim().slice(0, 80), rect: rr(e), area: Math.round(e.getBoundingClientRect().width * e.getBoundingClientRect().height) }))
      .sort((a, b) => a.area - b.area);
    return { smallest5: cands.slice(0, 5), count: cands.length };
  });
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
