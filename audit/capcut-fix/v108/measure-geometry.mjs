#!/usr/bin/env node
/**
 * v1.0.8 paged-rail geometry probe: measure REAL numbers before
 * choosing the geometry fix — rail width, tab width, and every label's
 * full rendered text width (span scrollWidth) + font size, at all 5
 * sizes, at initial and scrolled positions.
 * Run: node audit/capcut-fix/v108/measure-geometry.mjs
 */
import { chromium } from 'playwright-core';

const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

const SIZES = [
  { name: '1920x1080', viewport: { width: 1920, height: 1080 }, dsf: 1 },
  { name: '1920x1080-dsf1.5', viewport: { width: 1280, height: 720 }, dsf: 1.5 },
  { name: '1366x768', viewport: { width: 1366, height: 768 }, dsf: 1 },
  { name: '1280x720', viewport: { width: 1280, height: 720 }, dsf: 1 },
  { name: '1024x768', viewport: { width: 1024, height: 768 }, dsf: 1 },
];

async function dismissDialogs(page) {
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(400); }
  const okBtn = page.getByRole('button', { name: 'OK', exact: true });
  if (await okBtn.count()) { await okBtn.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

async function measure(page) {
  return page.evaluate(() => {
    const r2 = (n) => Math.round(n * 100) / 100;
    const list = document.querySelector('div[role="tablist"][aria-label="Editor tools"]');
    const scroller = list?.querySelector('div[class*="overflow-x-auto"]');
    const sr = scroller.getBoundingClientRect();
    const cs = getComputedStyle(scroller);
    const tabs = [...list.querySelectorAll('button[role="tab"]')].map((b) => {
      const span = b.querySelector('span');
      const bb = b.getBoundingClientRect();
      const sb = span.getBoundingClientRect();
      const st = getComputedStyle(span);
      return {
        t: (b.textContent || '').trim(),
        btnW: r2(bb.width),
        labelRectW: r2(sb.width),
        labelScrollW: span.scrollWidth,
        labelClientW: span.clientWidth,
        labelFont: st.fontSize,
        labelLeftOffset: r2(sb.left - bb.left),
      };
    });
    return {
      railW: r2(list.getBoundingClientRect().width),
      scrollerClientW: r2(scroller.clientWidth),
      scrollerPadding: { left: cs.paddingLeft, right: cs.paddingRight },
      scrollWidth: r2(scroller.scrollWidth),
      scrollLeft: r2(scroller.scrollLeft),
      leftChevron: !!list.querySelector('button[aria-label="Scroll tabs left"]'),
      rightChevron: !!list.querySelector('button[aria-label="Scroll tabs right"]'),
      tabs,
    };
  });
}

async function main() {
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  for (const size of SIZES) {
    const ctx = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: size.dsf });
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await dismissDialogs(page);
    const create = page.getByRole('button', { name: 'Create project' });
    if (await create.count()) { await create.first().click(); await page.waitForTimeout(1200); }
    await dismissDialogs(page);
    const initial = await measure(page);
    // Scroll once with ">" to get the both-chevrons viewport.
    const btn = page.getByRole('button', { name: 'Scroll tabs right' });
    if (await btn.count()) { await btn.first().click(); await page.waitForTimeout(1100); }
    const scrolled = await measure(page);
    const longest = Math.max(...initial.tabs.map((t) => t.labelScrollW));
    const longestTab = initial.tabs.find((t) => t.labelScrollW === longest);
    console.log(`\n=== ${size.name} ===`);
    console.log(`railW=${initial.railW} initial: clientW=${initial.scrollerClientW} chevrons L=${initial.leftChevron} R=${initial.rightChevron}`);
    console.log(`scrolled: clientW=${scrolled.scrollerClientW} scrollLeft=${scrolled.scrollLeft} chevrons L=${scrolled.leftChevron} R=${scrolled.rightChevron}`);
    console.log(`tabW=${initial.tabs[0].btnW} longestLabel=${longest}px (${longestTab.t}) font=${initial.tabs[0].labelFont}`);
    console.log(`labels: ${initial.tabs.map((t) => `${t.t}=${t.labelScrollW}`).join(' ')}`);
    console.log(`labelLeftOffsets: ${initial.tabs.map((t) => t.labelLeftOffset).join(' ')}`);
    // Geometry candidates:
    const m = initial.tabs.filter((t) => t.btnW).length; // placeholder
    const fullInitial = initial.tabs.filter((t, i) => {
      // fully visible at initial: button rect inside scroller rect
      return true;
    }).length;
    const railW = initial.railW;
    const viewS = railW - 48;
    const counts = [7, 6, 6, 6, 5][SIZES.indexOf(size)];
    const tabWprime = (viewS / counts);
    console.log(`optionA: tabW'=(railW-48)/${counts}=${tabWprime.toFixed(2)} content(px-1)=${(tabWprime - 8).toFixed(2)} content(px-0.5)=${(tabWprime - 4).toFixed(2)} content(px-0)=${tabWprime.toFixed(2)} longest=${longest}`);
    const S = ((viewS % initial.tabs[0].btnW) + initial.tabs[0].btnW) % initial.tabs[0].btnW;
    console.log(`optionB: shave S=(railW-48)%tabW=${S.toFixed(2)} (initial peek would be exactly 24px)`);
    await ctx.close();
  }
  await browser.close();
}
main();
