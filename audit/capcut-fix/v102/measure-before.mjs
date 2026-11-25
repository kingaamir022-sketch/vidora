#!/usr/bin/env node
/**
 * v1.0.2 BASELINE measure (2026-11-25). Measures the CURRENT tree at
 * 1920x1080, deviceScaleFactor 1, 100% zoom (NOT the user's zoomed
 * screenshots) before the D1-D13 fixes, so each diff item can be
 * confirmed real-or-already-fixed against the live code.
 * Run: node audit/capcut-fix/v102/measure-before.mjs (dev server on :5200)
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'before');
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
  const rect = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  }, sel);
  const text = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? el.textContent?.trim().slice(0, 120) : null;
  }, sel);
  const visible = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom <= 1080 && r.top >= 0;
  }, sel);

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(500); }

  // ---- Editor: empty project, Media tab ----
  await page.getByRole('button', { name: 'Create project' }).first().click();
  await page.waitForTimeout(900);
  const geom = {};
  geom.topbar = await rect('header');
  geom.leftColumn = await rect('div.w-\\[610px\\]');
  geom.properties = await rect('aside[aria-label="Details"]');
  geom.preview = await rect('section[aria-label="Preview"]');
  geom.timeline = await rect('section[aria-label="Timeline"]');
  geom.tabRail = await rect('div[role="tablist"][aria-label="Editor tools"]');
  // visible tab labels in the rail
  geom.tabsVisible = await page.evaluate(() => {
    const rail = document.querySelector('div[role="tablist"][aria-label="Editor tools"]');
    if (!rail) return [];
    return [...rail.querySelectorAll('button[role="tab"]')].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.left < 1920;
    }).map((b) => b.textContent?.trim());
  });
  // D7: cloud icon present?
  out.cloudIcon = await page.evaluate(() => !!document.querySelector('header [aria-label="All changes saved"], header [aria-label="Saving"]'));
  // D2: upload button + header text
  out.uploadButton = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.trim() === 'Click to upload');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  });
  out.previewHeader = await text('section[aria-label="Preview"] span.truncate');
  out.previewBottomBar = await page.evaluate(() => {
    const bar = [...document.querySelectorAll('section[aria-label="Preview"] div')].find((d) => d.textContent?.includes('00:00:00:00'));
    if (!bar) return null;
    const r = bar.getBoundingClientRect();
    const tc = bar.querySelector('span[aria-label="Timecode"]');
    const tcr = tc ? tc.getBoundingClientRect() : null;
    return { barH: Math.round(r.height), tcLines: tcr ? Math.round(tcr.height / 14) : null, tcH: tcr ? Math.round(tcr.height) : null };
  });
  // D3/D4: import box + cards
  out.importBox = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Import media"]');
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    const parent = btn.parentElement;
    const pr = parent ? parent.getBoundingClientRect() : null;
    return { circle: { w: Math.round(r.width), h: Math.round(r.height) }, box: pr ? { x: Math.round(pr.x), y: Math.round(pr.y), w: Math.round(pr.width), h: Math.round(pr.height) } : null };
  });
  out.importLabelBelow = await page.evaluate(() => {
    const els = [...document.querySelectorAll('p')].filter((p) => p.textContent?.trim() === 'Import');
    return els.map((p) => { const r = p.getBoundingClientRect(); return { y: Math.round(r.y), visible: r.bottom <= 1080 }; });
  });
  out.mediaCardsVisible = await page.evaluate(() => {
    const t = [...document.querySelectorAll('*')].find((e) => e.textContent === '— No media? Create with these tools —');
    if (!t) return { divider: false };
    const r = t.getBoundingClientRect();
    const cards = ['Generate', 'AI avatars', 'Record'].map((label) => {
      const el = [...document.querySelectorAll('button, [role="button"]')].find((e) => e.textContent?.trim() === label);
      if (!el) return { label, found: false };
      const cr = el.getBoundingClientRect();
      return { label, found: true, inViewport: cr.bottom <= 1080 && cr.top >= 0, y: Math.round(cr.y) };
    });
    return { divider: true, dividerY: Math.round(r.y), dividerVisible: r.bottom <= 1080, cards };
  });
  out.subNavRows = await page.evaluate(() => {
    const rows = ['Import', 'Media', 'Timeline', 'Subprojects', 'Yours', 'Generate', 'Spaces', 'Library', 'Create'];
    return rows.map((label) => {
      const el = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(label));
      if (!el) return { label, found: false };
      const r = el.getBoundingClientRect();
      return { label, found: true, inViewport: r.bottom <= 1080 && r.top >= 0, y: Math.round(r.y) };
    });
  });
  // D5: Details rows
  out.details = await page.evaluate(() => {
    const aside = document.querySelector('aside[aria-label="Details"]');
    if (!aside) return { found: false };
    const txt = aside.textContent ?? '';
    const rows = {};
    const row = (label) => {
      const dt = [...aside.querySelectorAll('dt')].find((d) => d.textContent?.includes(label));
      if (!dt) return { found: false };
      const dd = dt.parentElement?.querySelector('dd');
      const r = dt.getBoundingClientRect();
      return { found: true, value: dd?.textContent?.trim().slice(0, 60) ?? null, y: Math.round(r.y), visible: r.bottom <= 1080 };
    };
    rows.name = row('Name');
    rows.path = row('Path');
    rows.colorSpace = row('Color space');
    rows.imported = row('Imported media');
    rows.arrange = row('Arrange layers');
    rows.proxy = row('Proxy');
    rows.aspect = row('Aspect ratio');
    rows.resolution = row('Resolution');
    rows.arrangeSwitch = !!aside.querySelector('button[role="switch"][aria-label="Arrange layers"]');
    rows.proxyNote = txt.includes('Proxy files are not created in this build.');
    const mod = [...aside.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Modify');
    if (mod) {
      const cs = getComputedStyle(mod);
      rows.modify = { bg: cs.backgroundColor, color: cs.color };
    }
    return rows;
  });
  // D6: any text overlapping? check Ratio button rect vs Details rect
  out.ratioOverlap = await page.evaluate(() => {
    const ratioBtn = [...document.querySelectorAll('section[aria-label="Preview"] button')].find((b) => b.textContent?.trim() === 'Ratio');
    const details = document.querySelector('aside[aria-label="Details"]');
    if (!ratioBtn || !details) return { ratioFound: !!ratioBtn, detailsFound: !!details };
    const rr = ratioBtn.getBoundingClientRect();
    const dr = details.getBoundingClientRect();
    return { ratioRect: { x: Math.round(rr.x), right: Math.round(rr.right) }, detailsLeft: Math.round(dr.left), overflowsIntoDetails: rr.right > dr.left };
  });
  // D8/D9: empty box + toolbar center
  out.emptyBox = await page.evaluate(() => {
    const el = [...document.querySelectorAll('section[aria-label="Timeline"] div')].find((d) => d.textContent?.trim() === 'Drag material here and start to create');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { textAlign: cs.textAlign, justifyContent: cs.justifyContent, hasIcon: !!el.querySelector('svg'), x: Math.round(r.x), w: Math.round(r.width) };
  });
  out.toolbarCenter = await page.evaluate(() => {
    const tb = document.querySelector('section[aria-label="Timeline"] > div');
    if (!tb) return null;
    const play = tb.querySelector('button[aria-label="Play"], button[aria-label="Pause"]');
    const tc = [...tb.querySelectorAll('span')].find((s) => /\d\d:\d\d:\d\d:\d\d \|/.test(s.textContent ?? ''));
    return { playInToolbar: !!play, timecodeInToolbar: !!tc };
  });
  out.keyboardButton = await page.evaluate(() => !!document.querySelector('button[aria-label="Keyboard shortcuts"]'));
  out.geometry = geom;
  await shot('before-editor.png');

  // ---- Templates page ----
  try {
    await page.getByRole('button', { name: 'Back to dashboard' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Templates' }).first().click();
    await page.waitForTimeout(900);
    out.templates = await page.evaluate(() => {
      const chips = [...document.querySelectorAll('[role="tablist"][aria-label="Template categories"] button')].map((b) => b.textContent?.trim());
      const cards = [...document.querySelectorAll('button[aria-label^="Preview template"]')].map((b) => b.getAttribute('aria-label'));
      return { chips, cardCount: cards.length, firstCards: cards.slice(0, 3) };
    });
    await shot('before-templates.png');
    // Hover probe (baseline): hover first card, see what appears WITHOUT click
    const firstCard = page.locator('button[aria-label^="Preview template"]').first();
    if (await firstCard.count()) {
      await firstCard.hover();
      await page.waitForTimeout(700);
      out.templatesHover = await page.evaluate(() => {
        const useBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Use template');
        const editBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Edit more');
        const modal = !!document.querySelector('[role="dialog"], .fixed.inset-0');
        return { useTemplateVisible: !!useBtn && useBtn.getBoundingClientRect().width > 0, editMoreVisible: !!editBtn && editBtn.getBoundingClientRect().width > 0, anyModal: modal };
      });
      await shot('before-templates-hover.png');
      // Click the first card (baseline click-modal behavior)
      await firstCard.click();
      await page.waitForTimeout(600);
      out.templatesClick = await page.evaluate(() => {
        const useBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Use template');
        return { modalOpen: !!useBtn, useBtnText: useBtn?.textContent?.trim() ?? null };
      });
      await shot('before-templates-click.png');
      // Edit more -> template-applied editor
      const editMore = page.getByRole('button', { name: 'Edit more' }).first();
      if (await editMore.count()) {
        await editMore.click();
        await page.waitForTimeout(1000);
        out.templateApplied = await page.evaluate(() => {
          const tb = document.querySelector('section[aria-label="Timeline"]');
          const clips = tb ? [...tb.querySelectorAll('[role="button"]')].map((c) => c.textContent?.trim().slice(0, 40)) : [];
          const trackNames = tb ? [...tb.querySelectorAll('*')].filter((e) => ['Video 1', 'Audio 1', 'Text 1', 'Stickers 1'].includes(e.textContent?.trim() ?? '')).map((e) => e.textContent?.trim()) : [];
          return { clips, trackNames: [...new Set(trackNames)] };
        });
        // Transitions tab
        const tabBtn = (n) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: n }).first();
        await tabBtn('Transitions').click();
        await page.waitForTimeout(600);
        out.transitionsPanel = await page.evaluate(() => {
          const txt = document.body.innerText;
          return {
            hasDescription: txt.includes('The transition plays at the start of'),
            searchFirst: (() => {
              const panel = document.querySelector('div[role="tablist"][aria-label="Editor tools"]')?.parentElement;
              return null;
            })(),
            tilesVisible: [...document.querySelectorAll('button[title]')].filter((b) => (b.getAttribute('title') ?? '').length > 3).length,
          };
        });
        await shot('before-template-applied.png');
      }
    }
  } catch (e) {
    out.templatesError = String(e).slice(0, 300);
    log('TEMPLATES SECTION ERROR:', String(e).slice(0, 300));
  }

  out.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'geometry.json'), JSON.stringify(out, null, 2));
  log(JSON.stringify(out, null, 2));
  log('page errors:', errors.length);
  await browser.close();
  log('BASELINE done in', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
