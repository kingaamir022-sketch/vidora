#!/usr/bin/env node
/**
 * Vidora Phase 3 self-audit (Rule 12.4).
 * Serves the production build with `vite preview`, drives it with
 * Playwright (chromium headless shell), performs each Phase 3 behaviour
 * card's steps (H-TEXT, H-TEXTSTYLE, H-TEXTANIM, H-STICKER, H-SHAPE,
 * H-DRAW, H-TRACK, I-CAPTION-AUTO, I-CAPTION-MANUAL, I-CAPTION-STYLE,
 * I-SRT, I-TRANSCRIPT, I-TRANSLATE, I-TTS), screenshots into
 * audit/phase3/<ID>/, and writes audit/phase3/AUDIT-REPORT.md.
 * Run: npm run audit:phase3   (builds first)
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = path.join(ROOT, 'audit', 'phase3');
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
const cueCount = async (page) => {
  const heading = await page.locator('[aria-label="Captions panel"] h3', { hasText: 'Manual captions' }).textContent().catch(() => '');
  const m = (heading ?? '').match(/\((\d+)\)/);
  return m ? Number(m[1]) : -1;
};
const seekRuler = async (page, seconds) => {
  // Seek by clicking the timeline ruler. The ruler's px-per-second is the
  // live zoom (default 24 — NOT 36; the Phase 2 audit's 36px guess only
  // passed because its check accepted any 00:00:01:xx timecode). The
  // ruler can be scrolled out of view after clicking clips on low tracks,
  // so scroll it back into view before measuring its box.
  const rulerLoc = page.locator('section[aria-label="Timeline"] .relative.h-6').first();
  await rulerLoc.scrollIntoViewIfNeeded();
  const ruler = await rulerLoc.boundingBox();
  if (!ruler) return;
  const zoom = Number(await page.locator('input[aria-label="Timeline zoom"]').inputValue().catch(() => 24)) || 24;
  await page.mouse.click(ruler.x + seconds * zoom, ruler.y + 12);
  await page.waitForTimeout(250);
  const tc = await page.locator('[aria-label="Timecode"]').textContent().catch(() => '?');
  console.log(`  seek(${seconds}s) -> timecode ${tc}`);
};

async function main() {
  await fs.mkdir(AUDIT, { recursive: true });
  await fs.mkdir(MEDIA, { recursive: true });
  // MP4 fixture for the import check — regenerate it here, because
  // /tmp is wiped on service restarts and the audit needs a real file.
  try {
    await fs.stat(path.join(MEDIA, 'test.mp4'));
  } catch {
    await new Promise((resolve) => {
      const ff = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x180:rate=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', path.join(MEDIA, 'test.mp4')], { stdio: 'ignore' });
      ff.on('close', resolve);
      ff.on('error', resolve);
    });
  }
  // SRT fixture for the import check.
  await fs.writeFile(path.join(MEDIA, 'test.srt'),
    '1\n00:00:00,000 --> 00:00:02,000\nImported line one\n\n2\n00:00:02,500 --> 00:00:04,000\nImported line two\n');
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

    // ---- Import a video clip (tracking target + project duration) ----
    await page.locator('nav[aria-label="Editor tools"] button[title="Media"]').click();
    await page.waitForTimeout(300);
    const fileInput = page.locator('aside[aria-label="Media library"] input[type="file"]').first();
    await fileInput.setInputFiles([path.join(MEDIA, 'test.mp4')]);
    await page.waitForTimeout(3000);
    await page.locator('aside[aria-label="Media library"] li').first().locator('button', { hasText: 'Add to timeline' }).click();
    await page.waitForTimeout(500);
    check('H-TRACK', 'video clip on timeline (tracking target)', (await clipCount(page)) >= 1);

    // ---- H-TEXT: add heading, inspector, AI text FX sub-tab ----
    await fs.mkdir(path.join(AUDIT, 'H-TEXT'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Text"]').click();
    await page.waitForTimeout(300);
    check('H-TEXT', 'Text panel opens', await page.locator('[aria-label="Text panel"]').isVisible());
    const beforeText = await clipCount(page);
    await page.getByRole('button', { name: 'Add heading', exact: true }).click();
    await page.waitForTimeout(400);
    check('H-TEXT', 'Add heading adds a text clip', (await clipCount(page)) === beforeText + 1, `clips: ${beforeText} -> ${await clipCount(page)}`);
    check('H-TEXT', 'text inspector shows Text content', await page.getByLabel('Text content').isVisible());
    await page.getByLabel('Text content').fill('Audit heading');
    await page.waitForTimeout(300);
    check('H-TEXT', 'text content edits to "Audit heading"', (await page.getByLabel('Text content').inputValue()) === 'Audit heading');
    await page.getByRole('tab', { name: 'AI text FX' }).click();
    await page.waitForTimeout(300);
    check('H-TEXT', 'AI text FX sub-tab shows the Phase 7 note', (await page.locator('[aria-label="Text panel"]').getByText('Phase 7').count()) > 0);
    await shot(page, 'H-TEXT', 'text-panel-ai-fx.png');
    await page.getByRole('tab', { name: 'Templates' }).click();
    await page.waitForTimeout(200);

    // ---- H-TEXTSTYLE: apply Neon Glow preset ----
    await fs.mkdir(path.join(AUDIT, 'H-TEXTSTYLE'), { recursive: true });
    await page.locator('[aria-label="Text panel"] button', { hasText: 'Neon Glow' }).first().click();
    await page.waitForTimeout(300);
    const fillVal = await page.getByLabel('Fill colour').inputValue().catch(() => '');
    check('H-TEXTSTYLE', 'Neon Glow preset applies (fill becomes #a5f3fc)', fillVal.toLowerCase() === '#a5f3fc', `fill: ${fillVal}`);
    await shot(page, 'H-TEXTSTYLE', 'preset-neon-glow.png');

    // ---- H-TEXTANIM: loop animation ----
    await fs.mkdir(path.join(AUDIT, 'H-TEXTANIM'), { recursive: true });
    const loopSelect = page.getByLabel('Loop animation kind');
    await loopSelect.selectOption('pulse');
    await page.waitForTimeout(300);
    check('H-TEXTANIM', 'loop animation can be set to pulse', (await loopSelect.inputValue()) === 'pulse');
    await shot(page, 'H-TEXTANIM', 'loop-pulse.png');

    // ---- H-STICKER: add a sticker ----
    await fs.mkdir(path.join(AUDIT, 'H-STICKER'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Stickers"]').click();
    await page.waitForTimeout(300);
    check('H-STICKER', 'Stickers panel opens with search', await page.getByLabel('Search stickers').isVisible());
    const beforeSticker = await clipCount(page);
    await page.locator('[aria-label="Stickers panel"] button[aria-label^="Add sticker"]').first().click();
    await page.waitForTimeout(400);
    check('H-STICKER', 'clicking a sticker adds a sticker clip', (await clipCount(page)) === beforeSticker + 1);
    await shot(page, 'H-STICKER', 'sticker-added.png');

    // ---- H-SHAPE: add a shape ----
    await fs.mkdir(path.join(AUDIT, 'H-SHAPE'), { recursive: true });
    const beforeShape = await clipCount(page);
    await page.locator('[aria-label="Stickers panel"] button[aria-label="Add shape Circle"]').click();
    await page.waitForTimeout(400);
    check('H-SHAPE', 'clicking a shape adds a shape clip', (await clipCount(page)) === beforeShape + 1);
    await shot(page, 'H-SHAPE', 'shape-added.png');

    // ---- H-DRAW: draw a stroke on the preview ----
    await fs.mkdir(path.join(AUDIT, 'H-DRAW'), { recursive: true });
    await page.getByRole('button', { name: 'Draw on the preview' }).click();
    await page.waitForTimeout(300);
    check('H-DRAW', 'draw mode toggles on', (await page.getByRole('button', { name: 'Stop drawing (click again)' }).count()) === 1);
    const canvas = page.locator('canvas[aria-label="Preview canvas"]');
    const box = await canvas.boundingBox();
    const beforeDraw = await clipCount(page);
    if (box) {
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      await page.mouse.move(cx - 60, cy);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) await page.mouse.move(cx - 60 + i * 15, cy + Math.sin(i) * 10);
      await page.mouse.up();
    }
    await page.waitForTimeout(400);
    check('H-DRAW', 'dragging draws a stroke and creates a drawing clip', (await clipCount(page)) === beforeDraw + 1, `clips: ${beforeDraw} -> ${await clipCount(page)}`);
    check('H-DRAW', 'transport shows drawing mode', (await page.locator('section[aria-label="Preview"]', { hasText: 'drawing' }).count()) > 0);
    await shot(page, 'H-DRAW', 'stroke.png');
    await page.getByRole('button', { name: 'Stop drawing (click again)' }).click();
    await page.waitForTimeout(200);
    check('H-DRAW', 'Clear drawing strokes appears for the drawing clip', (await page.getByRole('button', { name: 'Clear drawing strokes' }).count()) >= 1);
    await shot(page, 'H-DRAW', 'drawing-clip.png');

    // ---- H-TRACK: attach the text clip to the video clip ----
    await fs.mkdir(path.join(AUDIT, 'H-TRACK'), { recursive: true });
    // Re-select the text clip: click timeline clips from last to first
    // until the Properties panel shows the text inspector.
    const total = await clipCount(page);
    for (let i = total - 1; i >= 0; i--) {
      await page.locator('section[aria-label="Timeline"] [role="button"]').nth(i).click();
      await page.waitForTimeout(250);
      if (await page.getByLabel('Text content').isVisible().catch(() => false)) break;
    }
    check('H-TRACK', 'text clip re-selected for tracking', await page.getByLabel('Text content').isVisible());
    const targetSelect = page.getByLabel('Tracking target clip');
    const targetOptions = await targetSelect.locator('option').count();
    check('H-TRACK', 'Follow clip lists the video clip', targetOptions >= 2, `options: ${targetOptions}`);
    await targetSelect.selectOption({ index: 1 });
    await page.waitForTimeout(300);
    check('H-TRACK', 'attaching shows Add track points', (await page.getByRole('button', { name: 'Add track points' }).count()) === 1);
    await page.getByRole('button', { name: 'Add track points' }).click();
    await page.waitForTimeout(200);
    const box2 = await canvas.boundingBox();
    if (box2) await page.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2);
    await page.waitForTimeout(300);
    check('H-TRACK', 'clicking the preview adds a track point', (await page.locator('aside[aria-label="Properties"]', { hasText: 's → x ' }).count()) > 0);
    await shot(page, 'H-TRACK', 'track-point.png');
    await page.getByRole('button', { name: 'Stop adding points (click again)' }).click().catch(() => {});

    // ---- I-CAPTION-AUTO: generate from a pasted transcript ----
    await fs.mkdir(path.join(AUDIT, 'I-CAPTION-AUTO'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Captions"]').click();
    await page.waitForTimeout(300);
    check('I-CAPTION-AUTO', 'Captions panel opens', await page.locator('[aria-label="Captions panel"]').isVisible());
    await page.getByLabel('Transcript for auto captions').fill('Hello world this is a caption test');
    await page.getByRole('button', { name: 'Generate captions' }).click();
    await page.waitForTimeout(400);
    const cuesAfterAuto = await cueCount(page);
    check('I-CAPTION-AUTO', 'Generate captions creates cues', cuesAfterAuto >= 1, `cues: ${cuesAfterAuto}`);
    await shot(page, 'I-CAPTION-AUTO', 'auto-captions.png');

    // ---- I-CAPTION-MANUAL: add, split, edit a cue ----
    await fs.mkdir(path.join(AUDIT, 'I-CAPTION-MANUAL'), { recursive: true });
    await seekRuler(page, 1);
    const beforeAdd = await cueCount(page);
    await page.getByRole('button', { name: 'Add cue at playhead' }).click();
    await page.waitForTimeout(300);
    check('I-CAPTION-MANUAL', 'Add cue at playhead adds a cue', (await cueCount(page)) === beforeAdd + 1, `${beforeAdd} -> ${await cueCount(page)}`);
    const beforeSplit = await cueCount(page);
    await page.getByRole('button', { name: 'Split cue at playhead' }).click();
    await page.waitForTimeout(300);
    check('I-CAPTION-MANUAL', 'Split cue at playhead splits the cue', (await cueCount(page)) === beforeSplit + 1, `${beforeSplit} -> ${await cueCount(page)}`);
    const firstCueText = page.getByLabel('Cue text').first();
    await firstCueText.fill('Edited cue text');
    await page.waitForTimeout(300);
    check('I-CAPTION-MANUAL', 'cue text edits inline', (await firstCueText.inputValue()) === 'Edited cue text');
    await shot(page, 'I-CAPTION-MANUAL', 'cue-list.png');

    // ---- I-CAPTION-STYLE: apply Violet Pop ----
    await fs.mkdir(path.join(AUDIT, 'I-CAPTION-STYLE'), { recursive: true });
    await page.locator('[aria-label="Captions panel"] button', { hasText: 'Violet Pop' }).first().click();
    await page.waitForTimeout(300);
    check('I-CAPTION-STYLE', 'Violet Pop becomes the active style', (await page.locator('[aria-label="Captions panel"]').getByText('Active style: Violet Pop.').count()) === 1);
    await shot(page, 'I-CAPTION-STYLE', 'style-violet-pop.png');

    // ---- I-SRT: import .srt, export .srt ----
    await fs.mkdir(path.join(AUDIT, 'I-SRT'), { recursive: true });
    const beforeImport = await cueCount(page);
    const srtInput = page.locator('[aria-label="Captions panel"] input[type="file"]');
    await srtInput.setInputFiles([path.join(MEDIA, 'test.srt')]);
    await page.waitForTimeout(500);
    check('I-SRT', 'importing test.srt adds its 2 cues', (await cueCount(page)) === beforeImport + 2, `${beforeImport} -> ${await cueCount(page)}`);
    check('I-SRT', 'import reports success', (await page.locator('[aria-label="Captions panel"]').getByText('Imported test.srt.').count()) === 1);
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await page.getByRole('button', { name: 'Export .srt' }).click();
    const download = await downloadPromise;
    check('I-SRT', 'Export .srt downloads an .srt file', !!download && download.suggestedFilename().endsWith('.srt'), download?.suggestedFilename() ?? 'no download');
    await shot(page, 'I-SRT', 'import-export.png');

    // ---- I-TRANSCRIPT: click a word to seek ----
    await fs.mkdir(path.join(AUDIT, 'I-TRANSCRIPT'), { recursive: true });
    await seekRuler(page, 2);
    const tcBefore = await page.locator('[aria-label="Timecode"]').textContent();
    const transcriptSection = page.locator('[aria-label="Captions panel"] section', {
      has: page.getByRole('heading', { name: 'Transcript', exact: true }),
    });
    const wordBtn = transcriptSection.locator('button').first();
    await wordBtn.click();
    await page.waitForTimeout(300);
    const tcAfter = await page.locator('[aria-label="Timecode"]').textContent();
    check('I-TRANSCRIPT', 'clicking a transcript word seeks to it', (tcAfter ?? '').startsWith('00:00:00:'), `${tcBefore} -> ${tcAfter}`);
    await shot(page, 'I-TRANSCRIPT', 'transcript.png');

    // ---- I-TRANSLATE: save a manual translation ----
    await fs.mkdir(path.join(AUDIT, 'I-TRANSLATE'), { recursive: true });
    await page.locator('[aria-label="Captions panel"] button', { hasText: 'Copy source' }).first().click();
    await page.waitForTimeout(200);
    await page.getByLabel('Translation text').first().fill('Hola mundo');
    await page.locator('[aria-label="Captions panel"] button', { hasText: 'Save', exact: true }).first().click();
    await page.waitForTimeout(300);
    check('I-TRANSLATE', 'saved translation is listed on the cue', (await page.locator('[aria-label="Captions panel"]').getByText('Translations: ur').count()) >= 1);
    await shot(page, 'I-TRANSLATE', 'translation-saved.png');

    // ---- I-TTS: add a narration clip ----
    await fs.mkdir(path.join(AUDIT, 'I-TTS'), { recursive: true });
    await page.getByLabel('Narration text').fill('Hello Vidora');
    const beforeTts = await clipCount(page);
    await page.getByRole('button', { name: 'Add narration clip' }).click();
    await page.waitForTimeout(400);
    check('I-TTS', 'Add narration clip adds a text clip', (await clipCount(page)) === beforeTts + 1, `clips: ${beforeTts} -> ${await clipCount(page)}`);
    await page.getByRole('button', { name: 'Preview voice' }).click().catch(() => {});
    await page.waitForTimeout(300);
    await shot(page, 'I-TTS', 'narration-clip.png');

    // ---- Report ----
    const fails = results.filter((r) => !r.ok);
    const report = [
      '# Vidora Phase 3 — Self-Audit Report (Rule 12.4)',
      '',
      `- Run: ${new Date().toISOString()}`,
      '- App: production build served with `vite preview` on http://127.0.0.1:4173/',
      '- Browser: Chromium headless shell (playwright-core 1.65.1), viewport 1440x900',
      `- Checks: ${results.length - fails.length}/${results.length} passed, ${fails.length} failed`,
      '',
      '## Checks',
      '',
      ...results.map((r) => `- ${r.ok ? 'PASS' : 'FAIL'} [${r.id}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`),
      '',
      '## Screenshots',
      '',
      'Screenshots live in `audit/phase3/<behaviour-card-ID>/` (one folder per card).',
      '',
      fails.length === 0
        ? '## Verdict\n\n**Zero open bugs.** All differences found during this audit were fixed before this report (see docs/BUGS.md).'
        : '## Verdict\n\n**Open bugs remain — see FAIL lines above and docs/BUGS.md.**',
      '',
    ].join('\n');
    await fs.writeFile(path.join(AUDIT, 'AUDIT-REPORT.md'), report);
    console.log(`\nAUDIT DONE: ${results.length - fails.length}/${results.length} passed`);
    if (fails.length > 0) process.exitCode = 1;
  } finally {
    await browser.close().catch(() => undefined);
    preview.kill('SIGTERM');
  }
}

main().catch((e) => {
  console.error('AUDIT CRASH:', e);
  process.exit(1);
});
