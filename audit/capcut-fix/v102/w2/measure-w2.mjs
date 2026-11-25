#!/usr/bin/env node
/**
 * v1.0.2 WORKER 2 verify (2026-11-25). D1/D3/D4/D5/D12.3/D12.4 against the
 * live dev server on :5200 at 1920x1080 and 1280x800, 100% zoom.
 * Run: node audit/capcut-fix/v102/w2/measure-w2.mjs
 */
import { chromium } from 'playwright-core';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const OUT = path.join(ROOT, 'audit', 'capcut-fix', 'v102', 'w2');
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5200/';
const out = {};
const log = (...a) => console.log(...a);

async function enterEditor(page) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const agree = page.getByRole('button', { name: 'Agree and continue' });
  if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
  const updOk = page.getByRole('button', { name: 'OK', exact: true });
  if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(500); }
  await page.getByRole('button', { name: 'Create project' }).first().click();
  await page.waitForTimeout(900);
}

const inVp = (r, h) => r && r.bottom <= h && r.top >= 0;

async function measureEmpty(page, vw, vh, tag) {
  const m = {};
  m.detailsWidth = await page.evaluate(() => {
    const a = document.querySelector('aside[aria-label="Details"]');
    return a ? Math.round(a.getBoundingClientRect().width) : null;
  });
  m.details = await page.evaluate((vh2) => {
    const aside = document.querySelector('aside[aria-label="Details"]');
    if (!aside) return { found: false };
    const txt = aside.textContent ?? '';
    const row = (label) => {
      const dt = [...aside.querySelectorAll('dt')].find((d) => d.textContent?.includes(label));
      if (!dt) return { found: false };
      const dd = dt.parentElement?.querySelector('dd');
      const r = dt.getBoundingClientRect();
      return { found: true, value: dd?.textContent?.trim().slice(0, 60) ?? null, y: Math.round(r.y), visible: r.bottom <= vh2 };
    };
    const mod = [...aside.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Modify');
    const cs = mod ? getComputedStyle(mod) : null;
    return {
      name: row('Name'), path: row('Path'), colorSpace: row('Color space'),
      imported: row('Imported media'), arrange: row('Arrange layers'), proxy: row('Proxy'),
      aspect: row('Aspect ratio'), resolution: row('Resolution'),
      arrangeSwitch: !!aside.querySelector('button[role="switch"]'),
      proxyNote: txt.includes('Proxy files are not created in this build.'),
      modify: cs ? { bg: cs.backgroundColor, color: cs.color } : null,
      allRowsVisible: [...aside.querySelectorAll('dt')].every((d) => d.getBoundingClientRect().bottom <= vh2),
      asideScrollH: aside.scrollHeight, asideClientH: aside.clientHeight,
    };
  }, vh);
  m.importBox = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Import media"]');
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    const circle = btn.querySelector('span > span, span span');
    const spans = [...btn.querySelectorAll('span')];
    const circleEl = spans.find((s) => s.className.includes('rounded-full'));
    const cr = circleEl ? circleEl.getBoundingClientRect() : null;
    const labelEl = spans.find((s) => s.textContent?.trim() === 'Import');
    const lr = labelEl ? labelEl.getBoundingClientRect() : null;
    return {
      box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      circle: cr ? { w: Math.round(cr.width), h: Math.round(cr.height) } : null,
      labelInline: lr && cr ? Math.abs((lr.y + lr.height / 2) - (cr.y + cr.height / 2)) < 4 : false,
      labelY: lr ? Math.round(lr.y) : null, circleY: cr ? Math.round(cr.y) : null,
      hasBrowseFiles: [...btn.querySelectorAll('button')].some((b) => b.textContent?.includes('Browse files')),
      pageHasBrowseFiles: document.body.textContent?.includes('Browse files') ?? false,
    };
  });
  // Whole-box click opens the file picker.
  m.importClickOpensPicker = await (async () => {
    try {
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 3000 }),
        page.locator('button[aria-label="Import media"]').click(),
      ]);
      await chooser.setFiles([]);
      return true;
    } catch { return false; }
  })();
  m.fit = await page.evaluate((vh2) => {
    const rows = ['Import', 'Media', 'Timeline', 'Subprojects', 'Yours', 'Generate', 'Spaces', 'Library', 'Create'];
    const subNav = rows.map((label) => {
      const el = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim().startsWith(label));
      if (!el) return { label, found: false };
      const r = el.getBoundingClientRect();
      return { label, found: true, inViewport: r.bottom <= vh2 && r.top >= 0, y: Math.round(r.y) };
    });
    const div = [...document.querySelectorAll('*')].find((e) => e.textContent === '— No media? Create with these tools —');
    const dr = div ? div.getBoundingClientRect() : null;
    const cards = ['Generate', 'AI avatars', 'Record'].map((label) => {
      const el = [...document.querySelectorAll('button')].find((e) => e.textContent?.trim().startsWith(label));
      if (!el) return { label, found: false };
      const r = el.getBoundingClientRect();
      return { label, found: true, inViewport: r.bottom <= vh2 && r.top >= 0, y: Math.round(r.y), bottom: Math.round(r.bottom) };
    });
    return { subNav, divider: dr ? { y: Math.round(dr.y), visible: dr.bottom <= vh2 } : null, cards };
  }, vh);
  await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
  return m;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

  // ---- 1920x1080 empty project ----
  let page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await enterEditor(page);
  out.empty1920 = await measureEmpty(page, 1920, 1080, 'w2-editor-1920');

  // ---- Template applied: inspector rail + sticker + video clip ----
  try {
    await page.getByRole('button', { name: 'Back to dashboard' }).click();
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Templates' }).first().click();
    await page.waitForTimeout(900);
    // Cards are <article>s; hover reveals the popup with Use template / Edit more.
    const firstArticle = page.locator('article').first();
    await firstArticle.hover();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, 'w2-templates-hover.png') });
    const editMore = page.getByRole('button', { name: 'Edit more' }).first();
    if (await editMore.count()) {
      await editMore.click();
      await page.waitForTimeout(1200);
      const tl = page.locator('section[aria-label="Timeline"]');
      out.templateApplied = await page.evaluate(() => {
        const tb = document.querySelector('section[aria-label="Timeline"]');
        return tb ? [...tb.querySelectorAll('[role="button"]')].map((c) => c.textContent?.trim().slice(0, 40)).filter(Boolean).slice(0, 12) : [];
      });

      const clickClip = async (re) => {
        const btn = tl.locator('[role="button"]', { hasText: re }).first();
        if (await btn.count()) { await btn.click(); await page.waitForTimeout(900); return true; }
        return false;
      };

      // Sticker clip first (Star · Violet).
      if (await clickClip(/Star/)) {
        out.inspectorSticker = await page.evaluate((vh2) => {
          const aside = document.querySelector('aside[aria-label="Properties"]');
          if (!aside) return { found: false };
          const rail = [...aside.querySelectorAll('nav button')].map((b) => {
            const r = b.getBoundingClientRect();
            return { label: b.textContent?.trim(), inViewport: r.bottom <= vh2 && r.top >= 0, y: Math.round(r.y), bottom: Math.round(r.bottom) };
          });
          const txt = aside.textContent ?? '';
          const sub = aside.querySelector('p');
          const maskBtn = [...aside.querySelectorAll('button')].find((b) => b.textContent?.includes('Mask'));
          const colorBtn = [...aside.querySelectorAll('button')].find((b) => b.textContent?.includes('Color adjustment'));
          const mr = maskBtn?.getBoundingClientRect(); const cr = colorBtn?.getBoundingClientRect();
          const content = aside.querySelector('div.min-w-0.flex-1, div[class*="flex-1 overflow"]');
          return {
            found: true, rail, title: aside.querySelector('h2')?.textContent?.trim() ?? null,
            subtitle: sub?.textContent?.trim() ?? null,
            mask: maskBtn ? { text: maskBtn.textContent?.trim(), visible: mr.bottom <= vh2, y: Math.round(mr.y) } : null,
            colorAdj: colorBtn ? { text: colorBtn.textContent?.trim(), visible: cr.bottom <= vh2, y: Math.round(cr.y) } : null,
            hScroll: content ? content.scrollWidth > content.clientWidth : null,
            contentScrollW: content?.scrollWidth, contentClientW: content?.clientWidth,
          };
        }, 1080);
        await page.screenshot({ path: path.join(OUT, 'w2-inspector-sticker-1920.png') });
      } else {
        out.inspectorSticker = { found: false, error: 'sticker clip not clickable' };
      }

      // Video clip (Violet Dusk) — Blend section overflow check.
      if (await clickClip(/Violet Dusk/)) {
        out.inspectorVideo = await page.evaluate((vh2) => {
          const aside = document.querySelector('aside[aria-label="Properties"]');
          if (!aside) return { found: false };
          const rail = [...aside.querySelectorAll('nav button')].map((b) => {
            const r = b.getBoundingClientRect();
            return { label: b.textContent?.trim(), inViewport: r.bottom <= vh2 && r.top >= 0, y: Math.round(r.y), bottom: Math.round(r.bottom) };
          });
          const content = aside.querySelector('div.min-w-0.flex-1, div[class*="flex-1 overflow"]');
          const blend = [...aside.querySelectorAll('h3')].find((h) => h.textContent?.trim() === 'Blend');
          const blendSec = blend?.closest('section');
          const br = blendSec?.getBoundingClientRect();
          const cr = content?.getBoundingClientRect();
          const overflowers = [...aside.querySelectorAll('*')].filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && cr && (r.right > cr.right + 1 || r.left < cr.left - 1);
          }).map((el) => el.tagName + '.' + String(el.className).slice(0, 60)).slice(0, 8);
          return {
            found: true, rail,
            title: aside.querySelector('h2')?.textContent?.trim() ?? null,
            subtitle: aside.querySelector('p')?.textContent?.trim() ?? null,
            blend: br ? { y: Math.round(br.y), bottom: Math.round(br.bottom), right: Math.round(br.right), visible: br.bottom <= vh2 } : null,
            contentRight: cr ? Math.round(cr.right) : null,
            hScroll: content ? content.scrollWidth > content.clientWidth : null,
            overflowers,
          };
        }, 1080);
        await page.screenshot({ path: path.join(OUT, 'w2-inspector-video-1920.png') });
      } else {
        out.inspectorVideo = { found: false, error: 'video clip not clickable' };
      }

      // Deselect (Close) -> Details with clips present: Color space must appear.
      const closeBtn = page.locator('aside[aria-label="Properties"] nav button[aria-label="Close inspector"]');
      if (await closeBtn.count()) {
        await closeBtn.click();
        await page.waitForTimeout(700);
        out.detailsWithClips = await page.evaluate(() => {
          const aside = document.querySelector('aside[aria-label="Details"]');
          if (!aside) return { found: false };
          const dt = [...aside.querySelectorAll('dt')].find((d) => d.textContent?.includes('Color space'));
          const dd = dt?.parentElement?.querySelector('dd');
          const order = [...aside.querySelectorAll('dt')].map((d) => d.textContent?.trim());
          return { found: true, colorSpace: dt ? { value: dd?.textContent?.trim() ?? null } : null, rowOrder: order };
        });
        await page.screenshot({ path: path.join(OUT, 'w2-details-with-clips-1920.png') });
      }
    } else {
      out.templateAppliedError = 'Edit more button not found';
    }
  } catch (e) {
    out.templateError = String(e).slice(0, 400);
    log('TEMPLATE SECTION ERROR:', String(e).slice(0, 400));
  }
  await page.close();

  // ---- 1280x800 empty project ----
  page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await enterEditor(page);
  out.empty1280 = await measureEmpty(page, 1280, 800, 'w2-editor-1280');
  await page.close();

  out.pageErrors = errors;
  await fs.writeFile(path.join(OUT, 'geometry-after.json'), JSON.stringify(out, null, 2));
  log(JSON.stringify(out, null, 2));
  log('page errors:', errors.length);
  await browser.close();
  log('W2 VERIFY done in', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
