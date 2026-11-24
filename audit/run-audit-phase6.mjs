#!/usr/bin/env node
/**
 * Vidora Phase 6 self-audit (Rule 12.4).
 * Serves the production build with `vite preview`, drives it with
 * Playwright (chromium headless shell), performs each Phase 6 behaviour
 * card's steps (O-AI-LIBRARY, O-AI-GENERATE, O-AI-MUSIC, O-AI-CLIPS,
 * O-AI-IMAGES, O-AI-VOICES), screenshots into audit/phase6/<ID>/, and
 * writes audit/phase6/AUDIT-REPORT.md.
 * Run: npm run audit:phase6   (builds first)
 *
 * Node-side checks: ai-manifest counts, quality-report.json, media
 * files on disk (100 MP3 tracks, 100 MP3 SFX, 100 MP4 clips + posters,
 * 110 PNG images). Fixtures are regenerated here because /tmp is wiped
 * on restarts (no fixture files needed for Phase 6 — the AI library
 * itself is the fixture).
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = path.join(ROOT, 'audit', 'phase6');
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
async function waitClipCount(page, expected, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await clipCount(page)) === expected) return true;
    await page.waitForTimeout(300);
  }
  return (await clipCount(page)) === expected;
}
const countFiles = async (dir, ext) =>
  (await fs.readdir(dir).catch(() => [])).filter((f) => f.endsWith(ext)).length;

async function main() {
  await fs.mkdir(AUDIT, { recursive: true });

  // ---- O-AI-LIBRARY (Node-side): manifest, quality report, files ----
  await fs.mkdir(path.join(AUDIT, 'O-AI-LIBRARY'), { recursive: true });
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'assets', 'ai-manifest.json'), 'utf8'));
    check('O-AI-LIBRARY', 'ai-manifest counts are 100/100/100/110',
      manifest.counts.music === 100 && manifest.counts.sfx === 100 && manifest.counts.clips === 100 && manifest.counts.images === 110,
      JSON.stringify(manifest.counts));
    check('O-AI-LIBRARY', 'ai-manifest version is 0.7.0', manifest.version === '0.7.0', `version: ${manifest.version}`);
  } catch (e) {
    check('O-AI-LIBRARY', 'assets/ai-manifest.json readable', false, String(e));
  }
  try {
    const qr = JSON.parse(await fs.readFile(path.join(ROOT, 'generation', 'quality-report.json'), 'utf8'));
    check('O-AI-LIBRARY', 'quality filter passed', qr.passed === true && qr.failed.length === 0, `failed: ${qr.failed.length}`);
  } catch (e) {
    check('O-AI-LIBRARY', 'generation/quality-report.json readable', false, String(e));
  }
  check('O-AI-LIBRARY', '100 AI track MP3s on disk',
    (await countFiles(path.join(ROOT, 'public', 'ai-library', 'music'), '.mp3')) === 100);
  check('O-AI-LIBRARY', '100 AI SFX MP3s on disk',
    (await countFiles(path.join(ROOT, 'public', 'ai-library', 'sfx'), '.mp3')) === 100);
  check('O-AI-LIBRARY', '100 AI clip MP4s + 100 posters on disk',
    (await countFiles(path.join(ROOT, 'public', 'ai-library', 'clips'), '.mp4')) === 100 &&
    (await countFiles(path.join(ROOT, 'public', 'ai-library', 'clips', 'posters'), '.jpg')) === 100);
  const tex = await countFiles(path.join(ROOT, 'public', 'ai-library', 'images', 'textures'), '.png');
  const frm = await countFiles(path.join(ROOT, 'public', 'ai-library', 'images', 'frames'), '.png');
  const stk = await countFiles(path.join(ROOT, 'public', 'ai-library', 'images', 'stickers'), '.png');
  check('O-AI-LIBRARY', '110 AI images on disk (40 textures, 20 frames, 50 stickers)',
    tex === 40 && frm === 20 && stk === 50, `textures ${tex}, frames ${frm}, stickers ${stk}`);

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
    // Phase 9 (M-ONBOARD): a first-run tour covers the dashboard on a
    // fresh profile — dismiss it before doing anything else.
    const tour = page.locator('[role="dialog"][aria-labelledby="tour-heading"]');
    if (await tour.isVisible().catch(() => false)) {
      await tour.getByRole('button', { name: 'Skip tour' }).click();
      await page.waitForTimeout(400);
    }

    await page.getByRole('button', { name: 'New Project' }).click();
    await page.waitForTimeout(600);

    const aiPanel = page.locator('aside[aria-label="AI Library"]');
    await page.locator('nav[aria-label="Editor tools"] button[title="AI Tools"]').click();
    await page.waitForTimeout(400);

    // ---- O-AI-LIBRARY: panel + sub-tabs + count line ----
    check('O-AI-LIBRARY', 'AI Library panel opens on the AI Tools tab', await aiPanel.isVisible());
    const countLine = (await aiPanel.locator('p').first().textContent()) ?? '';
    check('O-AI-LIBRARY', 'count line lists 100 tracks, 100 clips, 110 images, 16 voices',
      countLine.includes('100 tracks') && countLine.includes('100 clips') && countLine.includes('110 images') && countLine.includes('16 voices'),
      countLine.slice(0, 120));
    for (const tab of ['Generate', 'Music', 'Clips', 'Images', 'Voices']) {
      check('O-AI-LIBRARY', `sub-tab "${tab}" present`, (await aiPanel.getByRole('tab', { name: tab }).count()) === 1);
    }
    await shot(page, 'O-AI-LIBRARY', 'library-music.png');

    // ---- O-AI-MUSIC: catalog, search, add ----
    await fs.mkdir(path.join(AUDIT, 'O-AI-MUSIC'), { recursive: true });
    const musicHeading = await aiPanel.locator('h3', { hasText: 'AI tracks' }).textContent();
    check('O-AI-MUSIC', 'AI tracks heading lists 100', /\(100\)/.test(musicHeading ?? ''), musicHeading ?? '');
    await aiPanel.getByLabel('Search AI library').fill('calm');
    await page.waitForTimeout(300);
    const calmRows = await aiPanel.locator('ul li').count();
    check('O-AI-MUSIC', 'search "calm" narrows the track list', calmRows > 0 && calmRows < 100, `rows: ${calmRows}`);
    await aiPanel.getByLabel('Search AI library').fill('');
    await page.waitForTimeout(300);
    const beforeMusic = await clipCount(page);
    await aiPanel.getByRole('button', { name: '+ Add' }).first().click();
    const musicAdded = await waitClipCount(page, beforeMusic + 1);
    check('O-AI-MUSIC', 'adding an AI track places an audio clip on the timeline', musicAdded, `clips: ${beforeMusic} -> ${await clipCount(page)}`);
    await shot(page, 'O-AI-MUSIC', 'track-added.png');

    // ---- O-AI-CLIPS: catalog + add ----
    await fs.mkdir(path.join(AUDIT, 'O-AI-CLIPS'), { recursive: true });
    await aiPanel.getByRole('tab', { name: 'Clips' }).click();
    await page.waitForTimeout(400);
    const clipHeading = await aiPanel.locator('h3', { hasText: 'AI clips' }).textContent();
    check('O-AI-CLIPS', 'AI clips heading lists 100', /\(100\)/.test(clipHeading ?? ''), clipHeading ?? '');
    const clipCards = await aiPanel.locator('ul.grid li').count();
    check('O-AI-CLIPS', 'clips grid renders 100 cards', clipCards === 100, `cards: ${clipCards}`);
    const beforeClip = await clipCount(page);
    await aiPanel.getByRole('button', { name: '+ Add' }).first().click();
    const clipAdded = await waitClipCount(page, beforeClip + 1);
    check('O-AI-CLIPS', 'adding an AI clip places a video clip on the timeline', clipAdded, `clips: ${beforeClip} -> ${await clipCount(page)}`);
    await shot(page, 'O-AI-CLIPS', 'clip-added.png');

    // ---- O-AI-IMAGES: catalog + add ----
    await fs.mkdir(path.join(AUDIT, 'O-AI-IMAGES'), { recursive: true });
    await aiPanel.getByRole('tab', { name: 'Images' }).click();
    await page.waitForTimeout(400);
    const imgHeading = await aiPanel.locator('h3', { hasText: 'AI images' }).textContent();
    check('O-AI-IMAGES', 'AI images heading lists 110', /\(110\)/.test(imgHeading ?? ''), imgHeading ?? '');
    await aiPanel.getByRole('button', { name: 'Stickers' }).click();
    await page.waitForTimeout(300);
    const stickerHeading = await aiPanel.locator('h3', { hasText: 'AI images' }).textContent();
    check('O-AI-IMAGES', 'Stickers chip filters to 50', /\(50\)/.test(stickerHeading ?? ''), stickerHeading ?? '');
    await aiPanel.getByRole('button', { name: 'All' }).click();
    await page.waitForTimeout(300);
    const beforeImg = await clipCount(page);
    await aiPanel.getByRole('button', { name: '+ Add' }).first().click();
    const imgAdded = await waitClipCount(page, beforeImg + 1);
    check('O-AI-IMAGES', 'adding an AI image places an image clip on the timeline', imgAdded, `clips: ${beforeImg} -> ${await clipCount(page)}`);
    await shot(page, 'O-AI-IMAGES', 'image-added.png');

    // ---- O-AI-VOICES: languages, rows, narration ----
    await fs.mkdir(path.join(AUDIT, 'O-AI-VOICES'), { recursive: true });
    await aiPanel.getByRole('tab', { name: 'Voices' }).click();
    await page.waitForTimeout(400);
    for (const lang of ['English', 'Urdu', 'Hindi', 'Arabic']) {
      check('O-AI-VOICES', `language tab "${lang}" present`, (await aiPanel.getByRole('button', { name: lang, exact: true }).count()) === 1);
    }
    const voiceRows = await aiPanel.locator('ul li').count();
    check('O-AI-VOICES', 'English tab lists 4 voice rows', voiceRows === 4, `rows: ${voiceRows}`);
    const beforeVoice = await clipCount(page);
    await aiPanel.getByRole('button', { name: '+ Add narration' }).first().click();
    const voiceAdded = await waitClipCount(page, beforeVoice + 1);
    check('O-AI-VOICES', 'adding a narration creates a narration clip on the timeline', voiceAdded, `clips: ${beforeVoice} -> ${await clipCount(page)}`);
    await shot(page, 'O-AI-VOICES', 'voices.png');

    // ---- O-AI-GENERATE: prompt -> music + image ----
    await fs.mkdir(path.join(AUDIT, 'O-AI-GENERATE'), { recursive: true });
    await aiPanel.getByRole('tab', { name: 'Generate' }).click();
    await page.waitForTimeout(400);
    await aiPanel.getByLabel('Generation prompt').fill('calm ocean');
    await aiPanel.getByRole('button', { name: 'AI music', exact: true }).click();
    await page.waitForTimeout(200);
    await aiPanel.getByRole('button', { name: 'Generate', exact: true }).click();
    const genMusic = await aiPanel.locator('button', { hasText: '+ Add to timeline' }).first().waitFor({ timeout: 30000 }).then(() => true).catch(() => false);
    check('O-AI-GENERATE', 'AI music generation returns a result', genMusic);
    const beforeGen = await clipCount(page);
    await aiPanel.locator('button', { hasText: '+ Add to timeline' }).first().click();
    const genAdded = await waitClipCount(page, beforeGen + 1);
    check('O-AI-GENERATE', 'generated music adds to the timeline', genAdded, `clips: ${beforeGen} -> ${await clipCount(page)}`);
    await aiPanel.getByRole('button', { name: 'AI image', exact: true }).click();
    await page.waitForTimeout(200);
    const addsBeforeImage = await aiPanel.locator('button', { hasText: '+ Add to timeline' }).count();
    await aiPanel.getByRole('button', { name: 'Generate', exact: true }).click();
    let genImage = false;
    for (let i = 0; i < 50; i++) {
      if ((await aiPanel.locator('button', { hasText: '+ Add to timeline' }).count()) === addsBeforeImage + 1) {
        genImage = true;
        break;
      }
      await page.waitForTimeout(300);
    }
    check('O-AI-GENERATE', 'AI image generation returns a new result', genImage);
    await shot(page, 'O-AI-GENERATE', 'generate-results.png');
  } finally {
    await browser.close();
    preview.kill();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const report = [
    '# Vidora Phase 6 audit report',
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
  console.log(`\nPhase 6 audit: ${passed}/${results.length} passed`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('audit crashed:', e);
  process.exit(1);
});
