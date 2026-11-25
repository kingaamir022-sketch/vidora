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
 *
 * CapCut-fix port (2026-11-25, v1.0.1): entry is now Terms ("Agree and
 * continue") -> Updates ("OK") -> "Create project" (tour + "New Project"
 * are gone); the tab rail is div[role="tablist"][aria-label="Editor
 * tools"] with role="tab" buttons (see tabBtn).
 *
 * REMOVED BY DESIGN — the in-editor AI Library panel
 * (aside[aria-label="AI Library"] with Generate / Music / Clips /
 * Images / Voices sub-tabs) no longer exists: the CapCut-fix rail has
 * no "AI Tools" tab (LEFT_TABS is Media, Audio, Text, Stickers,
 * Effects, Transitions, Captions, Filters, Adjustment, Templates,
 * AI avatar) and no component renders that panel any more. The library
 * data still ships (verified node-side below) and is browsable on the
 * dashboard Library page.
 *
 * PORTED, not deleted (CapCut-fix correction 2026-11-25): the O3
 * redistribution moved the catalog into the editor tabs instead of
 * dropping it — O-AI-MUSIC is now Audio tab -> "AI music" section
 * (play + "+" adds an audio clip; renders in-browser when the MP3 is
 * absent), O-AI-CLIPS is Media tab -> Media section -> "AI clips"
 * (click a card to add), O-AI-IMAGES is the same section's "AI images".
 * O-AI-VOICES lives in the text inspector's TTS section (see phase 3 /
 * phase 4 coverage) and is not re-checked here. O-AI-GENERATE is
 * ported to its successor UI: Media tab -> Generate group -> AI image
 * (prompt -> generated image -> timeline). AI music generation has no
 * successor UI in the editor, so that half of O-AI-GENERATE is deleted.
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
/** Left tab rail button (labels truncate visually, textContent is full). */
const tabBtn = (page, name) => page.locator('div[role="tablist"][aria-label="Editor tools"] button[role="tab"]', { hasText: name }).first();
/** The left editor column (tab rail + active PanelShell panel). */
const leftCol = (page) => page.locator('div[class*="min(610px,32vw)"]');
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
    // CapCut-fix entry (v1.0.1): first-run Terms dialog, then the
    // Updates notice, then the dashboard "Create project" banner.
    const agree = page.getByRole('button', { name: 'Agree and continue' });
    if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
    const updOk = page.getByRole('button', { name: 'OK', exact: true });
    if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(500); }
    await page.getByRole('button', { name: 'Create project' }).first().click();
    await page.waitForTimeout(600);

    // ---- O-AI-GENERATE (ported): Media -> Generate -> AI image ----
    // Prompt -> locally generated image -> add to timeline. (AI music
    // generation has no successor UI in the editor — deleted, see header.)
    await fs.mkdir(path.join(AUDIT, 'O-AI-GENERATE'), { recursive: true });
    await tabBtn(page, 'Media').click();
    await page.waitForTimeout(300);
    await leftCol(page).getByRole('button', { name: 'Generate AI' }).click();
    await page.waitForTimeout(200);
    await leftCol(page).getByRole('button', { name: 'AI image', exact: true }).click();
    await page.waitForTimeout(300);
    const genPanel = leftCol(page);
    await genPanel.getByLabel('Generation prompt').fill('calm ocean');
    await genPanel.getByRole('button', { name: 'Generate', exact: true }).click();
    const genImage = await genPanel.locator('button[title="Click to add to the timeline"]').first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    check('O-AI-GENERATE', 'AI image generation returns a result', genImage);
    if (genImage) {
      const beforeGen = await clipCount(page);
      await genPanel.locator('button[title="Click to add to the timeline"]').first().click();
      const genAdded = await waitClipCount(page, beforeGen + 1);
      check('O-AI-GENERATE', 'generated image adds to the timeline', genAdded, `clips: ${beforeGen} -> ${await clipCount(page)}`);
    } else {
      check('O-AI-GENERATE', 'generated image adds to the timeline', false, 'no generation result to add');
    }
    await shot(page, 'O-AI-GENERATE', 'generate-results.png');

    // ---- O-AI-MUSIC (ported, CapCut-fix correction 2026-11-25): ----
    // Audio tab -> "AI music" section; a track's "+" adds an audio clip.
    await fs.mkdir(path.join(AUDIT, 'O-AI-MUSIC'), { recursive: true });
    await tabBtn(page, 'Audio').click();
    await page.waitForTimeout(400);
    const aiMusicSection = leftCol(page).locator('section:has(h3:text-is("AI music"))');
    const aiMusicShown = (await aiMusicSection.count()) > 0;
    check('O-AI-MUSIC', 'Audio tab shows the AI music section', aiMusicShown);
    if (aiMusicShown) {
      const beforeMusic = await clipCount(page);
      await aiMusicSection.locator('button[title="Add to timeline"]').first().click();
      const musicAdded = await waitClipCount(page, beforeMusic + 1);
      check('O-AI-MUSIC', 'AI track "+" adds an audio clip to the timeline', musicAdded, `clips: ${beforeMusic} -> ${await clipCount(page)}`);
    } else {
      check('O-AI-MUSIC', 'AI track "+" adds an audio clip to the timeline', false, 'no AI music section');
    }
    await shot(page, 'O-AI-MUSIC', 'ai-music.png');

    // ---- O-AI-CLIPS / O-AI-IMAGES (ported, CapCut-fix correction): ----
    // Media tab -> Media section -> "AI clips" / "AI images"; a card
    // click adds the clip/image to the timeline.
    await fs.mkdir(path.join(AUDIT, 'O-AI-CLIPS'), { recursive: true });
    await tabBtn(page, 'Media').click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Media', exact: true }).click();
    await page.waitForTimeout(400);
    const aiClipsSection = leftCol(page).locator('section:has(h3:text-is("AI clips"))');
    const aiClipsShown = (await aiClipsSection.count()) > 0;
    check('O-AI-CLIPS', 'Media tab shows the AI clips section', aiClipsShown);
    if (aiClipsShown) {
      const beforeClip = await clipCount(page);
      await aiClipsSection.locator('button[title$="click to add to timeline"]').first().click();
      const clipAdded = await waitClipCount(page, beforeClip + 1);
      check('O-AI-CLIPS', 'AI clip card adds a clip to the timeline', clipAdded, `clips: ${beforeClip} -> ${await clipCount(page)}`);
    } else {
      check('O-AI-CLIPS', 'AI clip card adds a clip to the timeline', false, 'no AI clips section');
    }
    const aiImagesSection = leftCol(page).locator('section:has(h3:text-is("AI images"))');
    const aiImagesShown = (await aiImagesSection.count()) > 0;
    check('O-AI-IMAGES', 'Media tab shows the AI images section', aiImagesShown);
    if (aiImagesShown) {
      const beforeImage = await clipCount(page);
      await aiImagesSection.locator('button[title$="click to add to timeline"]').first().click();
      const imageAdded = await waitClipCount(page, beforeImage + 1);
      check('O-AI-IMAGES', 'AI image card adds a clip to the timeline', imageAdded, `clips: ${beforeImage} -> ${await clipCount(page)}`);
    } else {
      check('O-AI-IMAGES', 'AI image card adds a clip to the timeline', false, 'no AI images section');
    }
    await shot(page, 'O-AI-CLIPS', 'ai-clips.png');
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
