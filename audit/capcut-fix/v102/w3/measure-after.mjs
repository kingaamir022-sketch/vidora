#!/usr/bin/env node
/**
 * v1.0.2 W3 AFTER measure (2026-11-25). Verifies D8/D9/D11/D12.2/D12.5/D12.1
 * on the live dev server at 1920x1080, deviceScaleFactor 1.
 * Run: node audit/capcut-fix/v102/w3/measure-after.mjs (dev server on :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'w3');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';

const out = {};
const log = (...a) => console.log(...a);

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => { errors.push(String(e).slice(0, 200)); });
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
  const shot = (n) => page.screenshot({ path: path.join(OUT, n) });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(500); }

  // Enter the editor with an empty project.
  await page.getByRole('button', { name: 'Create project' }).first().click();
  await page.waitForTimeout(1200);

  // ---- (d) empty timeline box + toolbar (D8/D9) ----
  out.emptyBox = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('section[aria-label="Timeline"] div')].filter((d) =>
      d.textContent?.trim() === 'Drag material here and start to create' && d.className.includes('border-dashed'));
    const el = boxes[0];
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const icon = el.querySelector('svg');
    const ir = icon?.getBoundingClientRect();
    return {
      textAlign: cs.textAlign, justifyContent: cs.justifyContent, hasIcon: !!icon,
      x: Math.round(r.x), w: Math.round(r.width),
      iconX: ir ? Math.round(ir.x) : null, textLeft: (() => {
        const span = el.querySelector('span');
        return span ? Math.round(span.getBoundingClientRect().x) : null;
      })(),
    };
  });
  out.toolbar = await page.evaluate(() => {
    const tb = document.querySelector('section[aria-label="Timeline"] > div');
    if (!tb) return null;
    const play = tb.querySelector('button[aria-label="Play"], button[aria-label="Pause"]');
    const tc = [...tb.querySelectorAll('span')].find((s) => /\d\d:\d\d:\d\d:\d\d \|/.test(s.textContent ?? ''));
    const labels = [...tb.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label'));
    return { playInToolbar: !!play, timecodeInToolbar: !!tc, buttons: labels };
  });
  out.previewBottomBar = await page.evaluate(() => {
    const tc = document.querySelector('[aria-label="Timecode"]');
    const play = [...document.querySelectorAll('button[aria-label="Play"], button[aria-label="Pause"]')].find(
      (b) => !b.closest('section[aria-label="Timeline"]'),
    );
    return { timecodePresent: !!tc, playOutsideToolbar: !!play };
  });
  await shot('after-editor-empty.png');

  // ---- (b) Transitions tab with NO clip selected (D12.2) ----
  const tabBtn = (n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();
  await tabBtn('Transitions').click();
  await page.waitForTimeout(700);
  out.transitionsEmpty = await page.evaluate(() => {
    const txt = document.body.innerText;
    const search = document.querySelector('input[placeholder="People are searching transitions"]');
    const grid = search?.closest('div')?.parentElement;
    const tiles = [...document.querySelectorAll('button[title]')].filter((b) => (b.getAttribute('title') ?? '').length > 3);
    return {
      searchVisible: !!search && search.getBoundingClientRect().width > 0,
      tilesVisible: tiles.length,
      hasHintBanner: txt.includes('Drag and drop a transition'),
      hasSelectClipText: txt.includes('Select a clip on the timeline'),
      hasDescription: txt.includes('The transition plays at the start of'),
    };
  });
  await shot('after-transitions-empty.png');

  // ---- Templates page: hover probe (D11) ----
  await page.getByRole('button', { name: 'Back to dashboard' }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Templates' }).first().click();
  await page.waitForTimeout(900);
  out.templates = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('[role="tablist"][aria-label="Template categories"] button')].map((b) => b.textContent?.trim());
    const cards = [...document.querySelectorAll('article')].map((a) => a.querySelector('p')?.textContent?.trim());
    const subLines = [...document.querySelectorAll('article p')].filter((p) => /· \d\d:\d\d/.test(p.textContent ?? '')).length;
    return { chips, cardCount: cards.length, firstCards: cards.slice(0, 3), durationSubLines: subLines };
  });
  await shot('after-templates.png');
  const firstCard = page.locator('article').first();
  await firstCard.hover();
  await page.waitForTimeout(700);
  out.templatesHover = await page.evaluate(() => {
    const useBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Use template');
    const editBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Edit more');
    const dialog = !!document.querySelector('[role="dialog"]');
    const card = document.querySelector('article div.aspect-\\[9\\/16\\]');
    const popup = useBtn?.closest('div.absolute');
    const cr = card?.getBoundingClientRect();
    const pr = popup?.getBoundingClientRect();
    return {
      useTemplateVisible: !!useBtn && useBtn.getBoundingClientRect().width > 0,
      editMoreVisible: !!editBtn && editBtn.getBoundingClientRect().width > 0,
      anyModal: dialog,
      cardW: cr ? Math.round(cr.width) : null,
      popupW: pr ? Math.round(pr.width) : null,
      popupX: pr ? Math.round(pr.x) : null,
      cardX: cr ? Math.round(cr.x) : null,
      popupLargerThanCard: !!(cr && pr && pr.width > cr.width),
      popupOverlapsCard: !!(cr && pr && pr.x < cr.right && pr.right > cr.x && pr.y < cr.bottom && pr.bottom > cr.y),
    };
  });
  await shot('after-templates-hover.png');
  // Click the card: no centered modal must appear (D11).
  await firstCard.click({ position: { x: 20, y: 20 } });
  await page.waitForTimeout(600);
  out.templatesClick = await page.evaluate(() => {
    const dialog = !!document.querySelector('[role="dialog"]');
    const dim = [...document.querySelectorAll('div.fixed.inset-0')].some((d) => {
      const cs = getComputedStyle(d);
      return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
    });
    return { modalOpen: dialog, dimOverlay: dim };
  });
  await shot('after-templates-click.png');

  // ---- (c) Apply Bold Opening via Edit more (D12.5) ----
  await firstCard.hover();
  await page.waitForTimeout(500);
  const editMore = page.getByRole('button', { name: 'Edit more' }).first();
  await editMore.click();
  await page.waitForTimeout(1200);
  out.templateApplied = await page.evaluate(() => {
    const tb = document.querySelector('section[aria-label="Timeline"]');
    if (!tb) return null;
    const clips = [...tb.querySelectorAll('[role="button"]')].map((c) => c.textContent?.trim().slice(0, 40));
    const trackNames = [...new Set([...tb.querySelectorAll('*')]
      .filter((e) => ['Video 1', 'Audio 1', 'Text 1', 'Stickers 1'].includes(e.textContent?.trim() ?? ''))
      .map((e) => e.textContent?.trim()))];
    return { clips, trackNames };
  });
  await shot('after-template-applied.png');

  // ---- (D12.1) template-applied screen, Transitions tab open: preview + bottom bar ----
  await tabBtn('Transitions').click();
  await page.waitForTimeout(700);
  out.appliedTransitions = await page.evaluate(() => {
    const tc = document.querySelector('[aria-label="Timecode"]');
    const bar = tc?.closest('div.flex');
    const r = bar?.getBoundingClientRect();
    const tcR = tc?.getBoundingClientRect();
    return {
      barH: r ? Math.round(r.height) : null,
      tcLines: tcR ? Math.round(tcR.height / 16) : null,
      tcH: tcR ? Math.round(tcR.height) : null,
    };
  });
  // Seek to ~2s on the ruler, then play briefly and pause: the first
  // draw after an overlay's image starts loading is blank (pre-existing
  // sticker-image-load race in the compositor — see report), so one more
  // redraw cycle is needed before the star is actually painted.
  await page.mouse.click(180, 852);
  await page.waitForTimeout(900);
  // Second seek to 3.5s: the sparkle loop is at full opacity there
  // (local 3.0s = phase 0.5), so the star paints in its exact fill
  // colour and the pixel scan below can see it.
  await page.mouse.click(228, 852);
  await page.waitForTimeout(900);
  out.appliedSeek = await page.evaluate(() => {
    const tc = document.querySelector('[aria-label="Timecode"]');
    const c = document.querySelector('section[aria-label="Preview"] canvas');
    if (!c) return { timecode: tc?.textContent ?? null, canvas: false };
    const ctx = c.getContext('2d');
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    const px = [[0.5, 0.5], [0.15, 0.15], [0.85, 0.5]].map(([x, y]) => {
      const d = ctx.getImageData(Math.floor(c.width * x), Math.floor(c.height * y), 1, 1).data;
      return [d[0], d[1], d[2]];
    });
    // Star fill #7C3AED in the star's region (right-of-centre, upper half),
    // away from the gradient's violet left edge.
    let starPx = 0;
    for (let y = 80; y < 650; y += 2) {
      for (let x = 1100; x < 1800; x += 2) {
        const j = (y * c.width + x) * 4;
        if (Math.abs(img[j] - 124) <= 8 && Math.abs(img[j + 1] - 58) <= 8 && Math.abs(img[j + 2] - 237) <= 8) starPx++;
      }
    }
    return { timecode: tc?.textContent ?? null, canvas: true, px, starPx, starVisible: starPx > 200, nonBlack: px.some((p) => p[0] + p[1] + p[2] > 30) };
  });
  await shot('after-template-applied-transitions.png');

  out.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'geometry-after.json'), JSON.stringify(out, null, 2));
  log(JSON.stringify(out, null, 2));
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
