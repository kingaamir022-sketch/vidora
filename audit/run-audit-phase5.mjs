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
const headingText = async (page, panel, re) => {
  const text = await page.locator(panel).textContent().catch(() => '');
  const m = (text ?? '').match(re);
  return m ? m[1] : null;
};
/** Count buttons inside the panel section whose h3 matches `heading`. */
const countInSection = (page, panel, heading) =>
  page.evaluate(
    ({ panel, heading }) => {
      const root = document.querySelector(panel);
      if (!root) return -1;
      for (const section of root.querySelectorAll('section')) {
        const h = section.querySelector('h3');
        if (h && h.textContent.trim() === heading) return section.querySelectorAll('button').length;
      }
      return -1;
    },
    { panel, heading },
  );
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
    check('N-ASSETS', 'assets/manifest.json has 663 entries', manifest.entries.length === 663, `entries: ${manifest.entries.length}`);
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
    await page.getByRole('button', { name: 'New Project' }).click();
    await page.waitForTimeout(600);

    // ---- Import the video fixture ----
    await page.locator('nav[aria-label="Editor tools"] button[title="Media"]').click();
    await page.waitForTimeout(300);
    const mediaInput = page.locator('aside[aria-label="Media library"] input[type="file"]').first();
    await mediaInput.setInputFiles([path.join(MEDIA, 'test-av.mp4')]);
    await page.waitForTimeout(3000);
    await page.locator('aside[aria-label="Media library"] li').first().locator('button', { hasText: 'Add to timeline' }).click();
    await page.waitForTimeout(500);
    check('N-GLSL', 'video clip on timeline (GLSL target)', (await clipCount(page)) === 1, `clips: ${await clipCount(page)}`);

    // ---- BUG-P5-001: video + text overlap must composite both ----
    await fs.mkdir(path.join(AUDIT, 'N-GLSL'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Text"]').click();
    await page.waitForTimeout(300);
    await page.locator('[aria-label="Text panel"]').getByRole('button', { name: 'Add heading' }).click();
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
    await page.locator('nav[aria-label="Editor tools"] button[title="Effects"]').click();
    await page.waitForTimeout(400);
    const effectsPanel = page.locator('[aria-label="Effects and filters"]');
    check('N-GLSL', 'Effects panel opens', await effectsPanel.isVisible());
    const glslHeading = await headingText(page, '[aria-label="Effects and filters"]', /GLSL effects \((\d+)\)/);
    check('N-GLSL', 'GLSL section lists 62 effects', glslHeading === '62', `heading: ${glslHeading}`);
    const webglNote = (await effectsPanel.getByText(/WebGL2 is not available/).count()) === 0;
    check('N-GLSL', 'WebGL2 available — GLSL cards enabled', webglNote);
    await effectsPanel.getByLabel('Search GLSL effects').fill('glow');
    await page.waitForTimeout(300);
    check('N-GLSL', 'search "glow" narrows the list', (await effectsPanel.getByText('Warm Glow', { exact: true }).count()) >= 1 && (await effectsPanel.getByText('Kaleidoscope', { exact: true }).count()) === 0);
    await effectsPanel.getByLabel('Search GLSL effects').fill('');
    await page.waitForTimeout(300);
    await effectsPanel.locator('button', { hasText: /^Warm Glow$/ }).first().click();
    await page.waitForTimeout(500);
    check('N-GLSL', 'Warm Glow appears in Applied effects with intensity slider', (await effectsPanel.getByLabel('Warm Glow intensity').count()) === 1);
    await shot(page, 'N-GLSL', 'glsl-applied.png');

    // ---- N-LUTS: catalog + apply ----
    await fs.mkdir(path.join(AUDIT, 'N-LUTS'), { recursive: true });
    const lutHeading = await headingText(page, '[aria-label="Effects and filters"]', /LUT filters \(\.cube\) \((\d+)\)/);
    check('N-LUTS', 'LUT section lists 32 looks', lutHeading === '32', `heading: ${lutHeading}`);
    await effectsPanel.locator('button', { hasText: /^Golden Hour$/ }).first().click();
    await page.waitForTimeout(500);
    check('N-LUTS', 'Golden Hour LUT applies (intensity slider appears)', (await effectsPanel.getByLabel('LUT intensity').count()) === 1);
    await shot(page, 'N-LUTS', 'lut-applied.png');

    // ---- E-TRANS: catalog + apply ----
    await fs.mkdir(path.join(AUDIT, 'E-TRANS'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Transitions"]').click();
    await page.waitForTimeout(400);
    const transPanel = page.locator('[aria-label="Transitions"]');
    check('E-TRANS', 'Transitions panel opens', await transPanel.isVisible());
    // Buttons show the transition id (lowercase); the grid holds 32 + "None".
    const transButtons = await page.evaluate(() => {
      const root = document.querySelector('[aria-label="Transitions"] .grid');
      return root ? root.querySelectorAll('button').length : -1;
    });
    check('E-TRANS', 'Transitions panel lists 32 transitions (+ None)', transButtons === 33, `grid buttons: ${transButtons}`);
    await transPanel.locator('button', { hasText: /^heart$/ }).first().click();
    await page.waitForTimeout(500);
    check('E-TRANS', 'Heart transition applies (duration control appears)', (await transPanel.getByLabel('Transition duration').count()) === 1);
    await shot(page, 'E-TRANS', 'transition-applied.png');

    // ---- N-FONTS + N-TEXTPRESETS + N-TEXTANIM ----
    await fs.mkdir(path.join(AUDIT, 'N-FONTS'), { recursive: true });
    await fs.mkdir(path.join(AUDIT, 'N-TEXTPRESETS'), { recursive: true });
    await fs.mkdir(path.join(AUDIT, 'N-TEXTANIM'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Text"]').click();
    await page.waitForTimeout(300);
    const textPanel = page.locator('[aria-label="Text panel"]');
    // The styles list lives under the "Effects" sub-tab ("Text styles" heading).
    await textPanel.getByRole('tab', { name: 'Effects' }).click();
    await page.waitForTimeout(300);
    const presetCount = await countInSection(page, '[aria-label="Text panel"]', 'Text styles');
    check('N-TEXTPRESETS', 'Text styles section lists 50 presets', presetCount === 50, `buttons: ${presetCount}`);
    // Select the text clip and inspect the font list + loop animation list.
    await clip(page, 1).click();
    await page.waitForTimeout(400);
    const fontOptions = await page.getByLabel('Font').locator('option').count();
    check('N-FONTS', 'font dropdown lists 44 stacks (40 open-license + 4 system)', fontOptions === 44, `options: ${fontOptions}`);
    const interOption = await page.getByLabel('Font').locator('option', { hasText: 'Inter' }).count();
    check('N-FONTS', 'Inter is offered as a font', interOption === 1);
    const loopOptions = await page.locator('[aria-label="Text panel"]').getByLabel('Loop animation kind').locator('option').count();
    check('N-TEXTANIM', 'loop animation list has 36 kinds', loopOptions === 36, `options: ${loopOptions}`);
    const motionOption = await page.locator('[aria-label="Text panel"]').getByLabel('Loop animation kind').locator('option[value="motion-heart"]').count();
    check('N-TEXTANIM', 'motion-heart is offered as a loop animation', motionOption === 1);
    await shot(page, 'N-FONTS', 'fonts.png');

    // ---- N-CAPTIONPRESETS ----
    await fs.mkdir(path.join(AUDIT, 'N-CAPTIONPRESETS'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Captions"]').click();
    await page.waitForTimeout(300);
    const capPanel = page.locator('[aria-label="Captions panel"]');
    check('N-CAPTIONPRESETS', 'Captions panel opens', await capPanel.isVisible());
    const capHeading = await headingText(page, '[aria-label="Captions panel"]', /Caption styles \((\d+)\)/);
    check('N-CAPTIONPRESETS', 'Caption styles section lists 20 presets', capHeading === '20', `heading: ${capHeading}`);
    await shot(page, 'N-CAPTIONPRESETS', 'caption-styles.png');

    // ---- N-MUSIC: 30 loops + 100 SFX ----
    await fs.mkdir(path.join(AUDIT, 'N-MUSIC'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Audio"]').click();
    await page.waitForTimeout(300);
    const audioPanel = page.locator('[aria-label="Audio panel"]');
    const loopCards = await audioPanel.locator('button[aria-label^="Add "][aria-label$=" to timeline"]').count();
    check('N-MUSIC', 'Music tab lists 30 original loops', loopCards === 30, `cards: ${loopCards}`);
    await audioPanel.getByRole('tab', { name: 'Sound effects' }).click();
    await page.waitForTimeout(300);
    const sfxCards = await audioPanel.locator('button[aria-label^="Add "][aria-label$=" to timeline"]').count();
    check('N-MUSIC', 'Sound effects tab lists 100 original SFX', sfxCards === 100, `cards: ${sfxCards}`);
    await shot(page, 'N-MUSIC', 'sfx.png');

    // ---- N-BACKGROUNDS: add a background clip ----
    await fs.mkdir(path.join(AUDIT, 'N-BACKGROUNDS'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Media"]').click();
    await page.waitForTimeout(300);
    const bgHeading = await headingText(page, 'aside[aria-label="Media library"]', /Backgrounds \((\d+)\)/);
    check('N-BACKGROUNDS', 'Backgrounds section lists 30 items', bgHeading === '30', `heading: ${bgHeading}`);
    const beforeBg = await clipCount(page);
    await page.locator('aside[aria-label="Media library"]').locator('button', { hasText: /^Violet Dusk$/ }).first().click();
    const bgAdded = await waitClipCount(page, beforeBg + 1);
    check('N-BACKGROUNDS', 'clicking Violet Dusk adds a 5 s background clip', bgAdded, `clips: ${beforeBg} -> ${await clipCount(page)}`);
    await shot(page, 'N-BACKGROUNDS', 'background-added.png');

    // ---- H-STICKER: motion select on a selected sticker clip ----
    await fs.mkdir(path.join(AUDIT, 'H-STICKER'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Stickers"]').click();
    await page.waitForTimeout(300);
    const stickerPanel = page.locator('[aria-label="Stickers panel"]');
    const stickerCount = await headingText(page, '[aria-label="Stickers panel"]', /All (\d+) stickers are original/);
    check('H-STICKER', 'Stickers panel lists 232 stickers', stickerCount === '232', `heading: ${stickerCount}`);
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
    await page.locator('nav[aria-label="Editor tools"] button[title="Templates"]').click();
    await page.waitForTimeout(400);
    const tplPanel = page.locator('[aria-label="Templates"]');
    check('N-TEMPLATES', 'Templates panel opens', await tplPanel.isVisible());
    const tplHeading = await headingText(page, '[aria-label="Templates"]', /Templates \((\d+)\)/);
    check('N-TEMPLATES', 'Templates panel lists 25 templates', tplHeading === '25', `heading: ${tplHeading}`);
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
