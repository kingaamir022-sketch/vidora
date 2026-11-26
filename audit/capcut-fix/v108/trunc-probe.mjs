import { chromium } from 'playwright-core';
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
async function dismiss(page) {
  for (let i = 0; i < 4; i++) {
    const agree = page.getByRole('button', { name: 'Agree and continue' });
    if (await agree.count()) { await agree.first().click().catch(() => {}); await page.waitForTimeout(500); continue; }
    const dlg = page.locator('div[role="dialog"]');
    if (!(await dlg.count())) return;
    const okBtn = page.getByRole('button', { name: 'OK', exact: true });
    if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(500); continue; }
    return;
  }
}
for (const [name, vp, dsf] of [['1920', {width:1920,height:1080}, 1], ['1366', {width:1366,height:768}, 1], ['1280', {width:1280,height:720}, 1], ['1024', {width:1024,height:768}, 1]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:5200/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await dismiss(page);
  const create = page.getByRole('button', { name: 'Create project' });
  if (await create.count()) { await dismiss(page); await create.first().click(); await page.waitForTimeout(1200); }
  await dismiss(page);
  const res = await page.evaluate(() => [...document.querySelectorAll('div[role="tablist"] button[role="tab"]')].map(b => {
    const s = b.querySelector('span');
    return `${(b.textContent||'').trim()}: scrollW=${s.scrollWidth} clientW=${s.clientWidth} ${s.scrollWidth > s.clientWidth + 0.5 ? 'TRUNCATED' : 'ok'}`;
  }));
  console.log(`--- ${name} ---`); console.log(res.join('\n') || '(no tablist found)');
  await ctx.close();
}
await browser.close();
