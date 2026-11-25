#!/usr/bin/env node
/**
 * Vidora Phase 5 self-audit (Rule 12.4).
 * Serves the production build with `vite preview`, drives it with
 * Playwright (chromium headless shell), performs each Phase 5 behaviour
 * card's steps (N-GLSL, E-TRANS, N-LUTS, N-FONTS, N-TEXTPRESETS,
 * N-TEXTANIM, N-CAPTIONPRESETS, N-TEMPLATES, N-MUSIC, N-BACKGROUNDS,
 * N-ASSETS, H-STICKER), screenshots into audit/phase5/<ID>/, and writes
 * audit/phase5/AUDIT-REPORT.md.
 * Run: npm run audit:phase5   (builds first)
 *
 * Fixtures are regenerated here because /tmp is wiped on restarts:
 *  - test-av.mp4: 4 s colourful video (testsrc) — compositing target for
 *    BUG-P5-001 (video + text overlap must show the video, not hide it).
 *
 * CapCut-fix port (2026-11-25, v1.0.1): entry is now Terms ("Agree and
 * continue") -> Updates ("OK") -> "Create project" (tour + "New Project"
 * are gone); the tab rail is div[role="tablist"][aria-label="Editor
 * tools"] with role="tab" buttons (see tabBtn); panels are PanelShell
 * divs with no aria-label, scoped here via the left column
 * (div.w-[610px]). Locator changes vs the old script:
 *  - N-GLSL: no "GLSL effects (62)" heading any more — the Trending
 *    view shows 12 cards; the 62 total is covered node-side by the
 *    manifest check. Search box is now aria-label "Search".
 *  - N-LUTS: LUTs moved to the Filters tab; applied LUT slider is now
 *    labelled "Filter intensity"; the 32 total is read off the
 *    "All 32 looks are original" note.
 *  - E-TRANS: no category shows all 32 — search " " returns all 32
 *    (searchTransitions trims to empty); card buttons now render the
 *    initial + id ("hheart"), so match "heart" by substring.
 *  - N-TEXTPRESETS: styles are grouped by category showing 4 each —
 *    expand every category's "View all" first, then count the 50
 *    preset buttons (button[title]).
 *  - N-CAPTIONPRESETS: caption styles are now 23 (Word category added
 *    3 word-by-word styles) across 5 template categories — summed.
 *  - N-BACKGROUNDS: the Media section shows only the first 8 of the
 *    30 backgrounds (Violet Dusk is first).
 *  - N-TEMPLATES: no "Templates (35)" heading — search " " lists all
 *    35 (counted via the per-card "… details" buttons).
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = path.join(ROOT, 'audit', 'phase5');
const MEDIA = '/tmp/audit-media';
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:4173/';

const results = [];
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
};
const shot = (page, id, name) =>
  page.screenshot({ path: path.join(AUDIT, id, name) }).catch((e) => {
    check(id, `screenshot ${name}`, false, String(e));
  });

async function waitUp(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(URL);
      if (r.ok) return true;
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('preview server did not come up');
}

const clipCount = (page) => page.locator('section[aria-label="Timeline"] [role="button"]').count();
const clip = (page, index) => page.locator('section[aria-label="Timeline"] [role="button"]').nth(index);
async function waitClipCount(page, expected, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await clipCount(page)) === expected) return true;
    await page.waitForTimeout(300);
  }
  return (await clipCount(page)) === expected;
}
/** Left tab rail button (labels truncate visually, textContent is full). */
const tabBtn = (page, name) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: name }).first();
/** The left editor column (tab rail + active PanelShell panel). */
const leftCol = (page) => page.locator('div[class*="min(610px,32vw)"]');
/** The right inspector. */
const inspector = (page) => page.locator('aside[aria-label="Properties"]');
/** Count the text-style preset buttons after expanding every category. */
const countTextPresets = (page) =>
  page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const findSection = () =>
      [...document.querySelectorAll('section')].find((s) =>
        [...s.querySelectorAll('h3')].some((h) => h.textContent.trim() === 'Text styles'),
      );
    if (!findSection()) return -1;
    for (let i = 0; i < 20; i++) {
      const sec = findSection();
      if (!sec) return -1;
      // Category "View all" buttons sit in a div with a <p> category
      // name; the Favorites "View all" does not, so it is skipped.
      const btn = [...sec.querySelectorAll('button')].find(
        (b) => b.textContent.trim() === 'View all' && b.parentElement?.querySelector('p'),
      );
      if (!btn) break;
      btn.click();
      await sleep(150);
    }
    const sec = findSection();
    if (!sec) return -1;
    await sleep(150);
    return sec.querySelectorAll('button[title]').length;
  });
/** Sample the preview canvas: colourful pixels prove video is composited
 * under overlays (BUG-P5-001), near-white pixels prove the text is drawn. */
const samplePreview = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas[aria-label="Preview canvas"]');
    if (!c) return { error: 'no canvas' };
    const ctx = c.getContext('2d');
    if (!ctx) return { error: 'no 2d context' };
    const { width, height } = c;
    const data = ctx.getImageData(0, 0, width, height).data;
    let colourful = 0;
    let nearWhite = 0;
    let sampled = 0;
    for (let y = 0; y < height; y += 8) {
      for (let x = 0; x < width; x += 8) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        sampled += 1;
        if (Math.max(r, g, b) - Math.min(r, g, b) > 40) colourful += 1;
        if (r > 230 && g > 230 && b > 230) nearWhite += 1;
      }
    }
    return { colourful, nearWhite, sampled };
  });

async function main() {
  await fs.mkdir(AUDIT, { recursive: true });
  await fs.mkdir(MEDIA, { recursive: true });

  // ---- N-ASSETS (Node-side): generated library files on disk ----
  await fs.mkdir(path.join(AUDIT, 'N-ASSETS'), { recursive: true });
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'assets', 'manifest.json'), 'utf8'));
    // v1.0.2: 1102 entries (676 Phase 5/8 + 426 Phase 6 AI rows) — was 1099
    // until caption presets grew 20 -> 23 in the v1.0.1 O3 pass; the
    // manifest is generated from the catalogs, the old number was stale.
    check('N-ASSETS', 'assets/manifest.json has 1102 entries (676 Phase 5/8 + 426 Phase 6 AI rows)', manifest.entries.length === 1102, `entries: ${manifest.entries.length}`);
    check('N-ASSETS', 'manifest counts meet every floor', manifest.counts.glslEffects >= 60 && manifest.counts.transitions >= 30 && manifest.counts.luts >= 30 && manifest.counts.stickers >= 200 && manifest.counts.fonts >= 40 && manifest.counts.textPresets >= 50 && manifest.counts.captionPresets >= 20 && manifest.counts.templates >= 25 && manifest.counts.loops >= 30 && manifest.counts.sfx >= 100 && manifest.counts.backgrounds >= 30, JSON.stringify(manifest.counts));
  } catch (e) {
    check('N-ASSETS', 'assets/manifest.json readable', false, String(e));
  }
  const lutFiles = await fs.readdir(path.join(ROOT, 'assets', 'luts')).catch(() => []);
  check('N-ASSETS', '32 .cube files generated', lutFiles.filter((f) => f.endsWith('.cube')).length === 32, `files: ${lutFiles.length}`);
  const animFiles = await fs.readdir(path.join(ROOT, 'assets', 'stickers', 'animated')).catch(() => []);
  check('N-ASSETS', '28 animated sticker JSON files generated', animFiles.filter((f) => f.endsWith('.json')).length === 28, `files: ${animFiles.length}`);
  const fontFiles = await fs.readdir(path.join(ROOT, 'public', 'fonts')).catch(() => []);
  check('N-ASSETS', '40 woff2 fonts downloaded', fontFiles.filter((f) => f.endsWith('.woff2')).length === 40, `files: ${fontFiles.length}`);
  const ofl = await fs.readFile(path.join(ROOT, 'LICENSES', 'OFL-1.1.txt'), 'utf8').catch(() => '');
  const apache = await fs.readFile(path.join(ROOT, 'LICENSES', 'Apache-2.0.txt'), 'utf8').catch(() => '');
  check('N-ASSETS', 'OFL-1.1 and Apache-2.0 license texts are real (not stubs)', ofl.includes('SIL OPEN FONT LICENSE') && apache.includes('Apache License'), `OFL ${ofl.length} chars, Apache ${apache.length} chars`);

  // Colourful video fixture for the compositing check.
  try {
    await fs.stat(path.join(MEDIA, 'test-av.mp4'));
  } catch {
    await new Promise((resolve) => {
      const ff = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'testsrc=duration=4:size=320x180:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-y', path.join(MEDIA, 'test-av.mp4')], { stdio: 'ignore' });
      ff.on('close', resolve);
      ff.on('error', resolve);
    });
  }

  const preview = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort', '--host', '127.0.0.1'], {
    cwd: ROOT, stdio: 'ignore',
  });
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  try {
    await waitUp();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', (e) => check('AUDIT', `pageerror: ${String(e).slice(0, 120)}`, false));
    page.on('console', (m) => {
      if (m.type() === 'error') check('AUDIT', `console error: ${m.text().slice(0, 120)}`, false);
    });

    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    // CapCut-fix entry (v1.0.1): first-run Terms dialog, then the
    // Updates notice, then the dashboard "Create project" banner.
    const agree = page.getByRole('button', { name: 'Agree and continue' });
    if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
    const updOk = page.getByRole('button', { name: 'OK', exact: true });
    if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(500); }
    await page.getByRole('button', { name: 'Create project' }).first().click();
    await page.waitForTimeout(600);

    // ---- Import the video fixture ----
    await tabBtn(page, 'Media').click();
    await page.waitForTimeout(300);
    const mediaInput = page.locator('input[type="file"]').first();
    await mediaInput.setInputFiles([path.join(MEDIA, 'test-av.mp4')]);
    await page.getByRole('button', { name: 'Media', exact: true }).click();
    await page.locator('button[title$="click to add to timeline"]').first().waitFor({ timeout: 15000 });
    await page.locator('button[title$="click to add to timeline"]').first().click();
    await page.waitForTimeout(500);
    check('N-GLSL', 'video clip on timeline (GLSL target)', (await clipCount(page)) === 1, `clips: ${await clipCount(page)}`);

    // ---- BUG-P5-001: video + text overlap must composite both ----
    await fs.mkdir(path.join(AUDIT, 'N-GLSL'), { recursive: true });
    await tabBtn(page, 'Text').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Add heading' }).click();
    const textAdded = await waitClipCount(page, 2);
    check('BUG-P5-001', 'text clip added over the video clip', textAdded, `clips: ${await clipCount(page)}`);
    await page.waitForTimeout(2500);
    let sample = await samplePreview(page);
    if (!sample.error && sample.colourful < 1000) {
      await page.waitForTimeout(2000);
      sample = await samplePreview(page);
    }
    check('BUG-P5-001', 'video pixels visible under the text overlay', !sample.error && sample.colourful >= 1000, sample.error ?? `colourful pixels: ${sample.colourful} of ${sample.sampled} sampled`);
    check('BUG-P5-001', 'text is drawn on top of the video', !sample.error && sample.nearWhite > 0, sample.error ?? `near-white pixels: ${sample.nearWhite}`);
    await shot(page, 'N-GLSL', 'video-plus-text.png');

    // ---- N-GLSL: catalog, search, apply ----
    await clip(page, 0).click();
    await page.waitForTimeout(400);
    await tabBtn(page, 'Effects').click();
    await page.waitForTimeout(400);
    const effectsPanel = leftCol(page);
    check('N-GLSL', 'Effects panel opens', (await effectsPanel.locator('h3', { hasText: 'Video effects — Trending' }).count()) === 1);
    const trendingCards = await effectsPanel.locator('div.grid > div').count();
    check('N-GLSL', 'Trending view lists 12 GLSL cards (full 62 in manifest)', trendingCards === 12, `cards: ${trendingCards}`);
    const glslOk = (await effectsPanel.getByText(/WebGL2 is not available/).count()) === 0;
    check('N-GLSL', 'WebGL2 available — GLSL cards enabled', glslOk);
    await effectsPanel.getByLabel('Search').fill('glow');
    await page.waitForTimeout(300);
    check('N-GLSL', 'search "glow" narrows the list', (await effectsPanel.getByText('Warm Glow', { exact: true }).count()) >= 1 && (await effectsPanel.getByText('Kaleidoscope', { exact: true }).count()) === 0);
    try {
      await effectsPanel.getByLabel('Search').fill('');
      await page.waitForTimeout(300);
      await effectsPanel.locator('button', { hasText: 'Warm Glow' }).first().click({ timeout: 5000 });
      await page.waitForTimeout(500);
      check('N-GLSL', 'Warm Glow appears in Applied effects with intensity slider', (await effectsPanel.getByLabel('Warm Glow intensity').count()) === 1);
    } catch (e) {
      check('N-GLSL', 'Warm Glow appears in Applied effects with intensity slider', false, `click failed: ${String(e).slice(0, 100)}`);
    }
    await shot(page, 'N-GLSL', 'glsl-applied.png');

    // ---- N-LUTS: catalog + apply (LUTs live on the Filters tab now) ----
    await fs.mkdir(path.join(AUDIT, 'N-LUTS'), { recursive: true });
    await tabBtn(page, 'Filters').click();
    await page.waitForTimeout(400);
    const filtersPanel = leftCol(page);
    check('N-LUTS', 'Filters panel lists 32 looks', (await filtersPanel.getByText(/All 32 looks are original/).count()) >= 1);
    await filtersPanel.getByLabel('Search').fill('Golden Hour');
    await page.waitForTimeout(300);
    await filtersPanel.locator('button[title="Golden Hour"]').first().click();
    await page.waitForTimeout(500);
    check('N-LUTS', 'Golden Hour LUT applies (intensity slider appears)', (await filtersPanel.getByLabel('Filter intensity').count()) === 1);
    await shot(page, 'N-LUTS', 'lut-applied.png');

    // ---- E-TRANS: catalog + apply ----
    await fs.mkdir(path.join(AUDIT, 'E-TRANS'), { recursive: true });
    await tabBtn(page, 'Transitions').click();
    await page.waitForTimeout(400);
    const transPanel = leftCol(page);
    check('E-TRANS', 'Transitions panel opens', (await transPanel.locator('h3', { hasText: 'Trending' }).count()) === 1);
    // Search " " returns the whole catalog (searchTransitions trims it
    // to empty); card buttons carry title=<description>, the star
    // buttons and "None" carry no title.
    await transPanel.getByLabel('Search').fill(' ');
    await page.waitForTimeout(300);
    // v1.0.2 (D15/D16): each tile now also carries a "+" apply button
    // (title "Apply transition …") and a download button (title
    // "Download preview …") — count only the tile buttons themselves.
    const transCards = await transPanel.locator('div.grid button[title]:not([title^="Apply transition"]):not([title^="Download preview"])').count();
    const noneBtn = await transPanel.getByRole('button', { name: 'None', exact: true }).count();
    check('E-TRANS', 'Transitions panel lists 32 transitions (+ None)', transCards === 32 && noneBtn === 1, `cards: ${transCards}, none: ${noneBtn}`);
    await transPanel.getByLabel('Search').fill('heart');
    await page.waitForTimeout(300);
    await transPanel.locator('button', { hasText: 'heart' }).first().click();
    await page.waitForTimeout(500);
    check('E-TRANS', 'Heart transition applies (duration control appears)', (await transPanel.getByLabel('Transition duration').count()) === 1);
    await shot(page, 'E-TRANS', 'transition-applied.png');

    // ---- N-FONTS + N-TEXTPRESETS + N-TEXTANIM ----
    await fs.mkdir(path.join(AUDIT, 'N-FONTS'), { recursive: true });
    await fs.mkdir(path.join(AUDIT, 'N-TEXTPRESETS'), { recursive: true });
    await fs.mkdir(path.join(AUDIT, 'N-TEXTANIM'), { recursive: true });
    await tabBtn(page, 'Text').click();
    await page.waitForTimeout(300);
    const textPanel = leftCol(page);
    // The styles list lives under the "Effects" sub-nav ("Text styles" heading).
    await textPanel.getByRole('button', { name: 'Effects', exact: true }).click();
    await page.waitForTimeout(300);
    const presetCount = await countTextPresets(page);
    check('N-TEXTPRESETS', 'Text styles section lists 50 presets', presetCount === 50, `buttons: ${presetCount}`);
    // Select the text clip and inspect the font list + loop animation list.
    await clip(page, 1).click();
    await page.waitForTimeout(400);
    const fontOptions = await inspector(page).getByLabel('Font family').locator('option').count();
    check('N-FONTS', 'font dropdown lists 44 stacks (40 open-license + 4 system)', fontOptions === 44, `options: ${fontOptions}`);
    const interOption = await inspector(page).getByLabel('Font family').locator('option', { hasText: 'Inter' }).count();
    check('N-FONTS', 'Inter is offered as a font', interOption === 1);
    const loopOptions = await textPanel.getByLabel('Loop animation kind').locator('option').count();
    check('N-TEXTANIM', 'loop animation list has 36 kinds', loopOptions === 36, `options: ${loopOptions}`);
    const motionOption = await textPanel.getByLabel('Loop animation kind').locator('option[value="motion-heart"]').count();
    check('N-TEXTANIM', 'motion-heart is offered as a loop animation', motionOption === 1);
    await shot(page, 'N-FONTS', 'fonts.png');

    // ---- N-CAPTIONPRESETS ----
    await fs.mkdir(path.join(AUDIT, 'N-CAPTIONPRESETS'), { recursive: true });
    await tabBtn(page, 'Captions').click();
    await page.waitForTimeout(300);
    const capPanel = leftCol(page);
    check('N-CAPTIONPRESETS', 'Captions panel opens', (await capPanel.getByRole('button', { name: 'Trending', exact: true }).count()) === 1);
    // Styles are split across 5 template categories (5/5/5/5/3 = 23).
    let totalStyles = 0;
    for (const cat of ['Trending', 'Classic', 'NEW', 'Hits', 'Word']) {
      await capPanel.getByRole('button', { name: cat, exact: true }).click();
      await page.waitForTimeout(200);
      totalStyles += await capPanel.locator('div.grid > div').count();
    }
    check('N-CAPTIONPRESETS', 'Caption styles total 23 across 5 categories', totalStyles === 23, `total: ${totalStyles}`);
    await shot(page, 'N-CAPTIONPRESETS', 'caption-styles.png');

    // ---- N-MUSIC: 30 loops + 100 SFX ----
    await fs.mkdir(path.join(AUDIT, 'N-MUSIC'), { recursive: true });
    await tabBtn(page, 'Audio').click();
    await page.waitForTimeout(300);
    const audioPanel = leftCol(page);
    // v1.0.2: the "Add … to timeline" row is shared by the originals and
    // the AI sections (100 AI tracks / 100 AI SFX) — scope the count to
    // the "Recommended" (Vidora Originals) section only.
    const recSection = audioPanel.locator('section:has(h3:text-is("Recommended"))');
    const loopCards = await recSection.locator('button[aria-label^="Add "][aria-label$=" to timeline"]').count();
    check('N-MUSIC', 'Music tab lists 30 original loops', loopCards === 30, `cards: ${loopCards}`);
    await audioPanel.getByRole('button', { name: 'Sound effects', exact: true }).click();
    await page.waitForTimeout(300);
    const sfxCards = await recSection.locator('button[aria-label^="Add "][aria-label$=" to timeline"]').count();
    check('N-MUSIC', 'Sound effects tab lists 100 original SFX', sfxCards === 100, `cards: ${sfxCards}`);
    await shot(page, 'N-MUSIC', 'sfx.png');

    // ---- N-BACKGROUNDS: add a background clip ----
    await fs.mkdir(path.join(AUDIT, 'N-BACKGROUNDS'), { recursive: true });
    await tabBtn(page, 'Media').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Media', exact: true }).click();
    await page.waitForTimeout(300);
    const mediaPanel = leftCol(page);
    check('N-BACKGROUNDS', 'Backgrounds section present', (await mediaPanel.locator('h3', { hasText: 'Backgrounds' }).count()) === 1);
    // Second grid in the Media section is the backgrounds grid (the
    // first is the imported-media grid); the panel shows 8 of 30.
    const bgButtons = await mediaPanel.locator('div.grid').nth(1).locator('button').count();
    check('N-BACKGROUNDS', 'Backgrounds section shows 8 backgrounds (catalog has 30)', bgButtons === 8, `buttons: ${bgButtons}`);
    const beforeBg = await clipCount(page);
    await mediaPanel.locator('button[title^="Violet Dusk"]').first().click();
    const bgAdded = await waitClipCount(page, beforeBg + 1);
    check('N-BACKGROUNDS', 'clicking Violet Dusk adds a 5 s background clip', bgAdded, `clips: ${beforeBg} -> ${await clipCount(page)}`);
    await shot(page, 'N-BACKGROUNDS', 'background-added.png');

    // ---- H-STICKER: motion select on a selected sticker clip ----
    await fs.mkdir(path.join(AUDIT, 'H-STICKER'), { recursive: true });
    await tabBtn(page, 'Stickers').click();
    await page.waitForTimeout(300);
    const stickerPanel = leftCol(page);
    const stickerNote = (await stickerPanel.getByText(/All \d+ stickers are original/).textContent().catch(() => '')) ?? '';
    const stickerMatch = stickerNote.match(/All (\d+) stickers/);
    check('H-STICKER', 'Stickers panel lists 232 stickers', stickerMatch?.[1] === '232', `note: ${stickerNote.slice(0, 80)}`);
    await stickerPanel.locator('button[aria-label^="Add sticker "]').first().click();
    const stickerAdded = await waitClipCount(page, beforeBg + 2);
    check('H-STICKER', 'sticker clip added to the timeline', stickerAdded, `clips: ${await clipCount(page)}`);
    await clip(page, (await clipCount(page)) - 1).click();
    await page.waitForTimeout(400);
    const motionOptions = await stickerPanel.getByLabel('Sticker motion').locator('option').count();
    check('H-STICKER', 'Motion select offers 28 motion presets + None', motionOptions === 29, `options: ${motionOptions}`);
    await stickerPanel.getByLabel('Sticker motion').selectOption('motion-heart');
    await page.waitForTimeout(300);
    check('H-STICKER', 'motion-heart applies to the sticker clip', (await stickerPanel.getByLabel('Sticker motion').inputValue()) === 'motion-heart');
    await shot(page, 'H-STICKER', 'sticker-motion.png');

    // ---- N-TEMPLATES: catalog + use one ----
    await fs.mkdir(path.join(AUDIT, 'N-TEMPLATES'), { recursive: true });
    await tabBtn(page, 'Templates').click();
    await page.waitForTimeout(400);
    const tplPanel = leftCol(page);
    check('N-TEMPLATES', 'Templates panel opens', (await tplPanel.getByRole('button', { name: 'For you', exact: true }).count()) === 1);
    // Search " " returns the whole catalog; each card has a "… details" button.
    await tplPanel.getByLabel('Search').fill(' ');
    await page.waitForTimeout(300);
    const tplCards = await tplPanel.locator('button[aria-label$=" details"]').count();
    check('N-TEMPLATES', 'Templates panel lists 35 templates', tplCards === 35, `cards: ${tplCards}`);
    await tplPanel.getByLabel('Search').fill('');
    await page.waitForTimeout(300);
    await tplPanel.locator('button', { hasText: /^Use template$/ }).first().click();
    const tplApplied = await waitClipCount(page, 3, 10000);
    check('N-TEMPLATES', 'Use template starts a new project with clips', tplApplied, `clips: ${await clipCount(page)}`);
    await shot(page, 'N-TEMPLATES', 'template-used.png');
  } finally {
    await browser.close();
    preview.kill();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const report = [
    '# Vidora Phase 5 audit report',
    '',
    `Run: ${new Date().toISOString()}`,
    `Result: ${passed}/${results.length} checks passed, ${failed.length} failed.`,
    '',
    ...results.map((r) => `- ${r.ok ? 'PASS' : 'FAIL'} [${r.id}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`),
    '',
    failed.length === 0 ? 'Zero open bugs.' : `## Open bugs (${failed.length})`,
    ...failed.map((r) => `- [${r.id}] ${r.name} — ${r.detail}`),
    '',
  ].join('\n');
  await fs.writeFile(path.join(AUDIT, 'AUDIT-REPORT.md'), report);
  console.log(`\nPhase 5 audit: ${passed}/${results.length} passed`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('audit crashed:', e);
  process.exit(1);
});
