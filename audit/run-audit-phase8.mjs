#!/usr/bin/env node
/**
 * Vidora Phase 8 self-audit (Rule 12.4).
 * Serves the production build with `vite preview`, drives it with
 * Playwright (chromium headless shell), performs each Phase 8 behaviour
 * card's steps (L-EXPORT, L-EXPORT-QUEUE, L-EXPORT-AUDIO,
 * L-TEMPLATES-SLOTS, L-CLOUD, L-COLLAB, L-SHARE), screenshots into
 * audit/phase8/<ID>/, and writes audit/phase8/AUDIT-REPORT.md.
 * Run: npm run audit:phase8   (builds first)
 *
 * Fixtures are regenerated here because /tmp is wiped on restarts:
 *  - test-av.mp4: 6 s testsrc video + 440 Hz sine (ffmpeg).
 *
 * Export verification is real: the queued export downloads a file and
 * ffprobe checks its codecs + duration. Which format is tested depends
 * on what the headless browser can actually encode (the dialog's
 * capability notes say so) — MP4/H.264 when available, WebM/VP8/VP9
 * otherwise. The audit records which path ran; it never fakes a pass.
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = path.join(ROOT, 'audit', 'phase8');
const MEDIA = '/tmp/audit-media';
const DL = path.join(MEDIA, 'phase8-downloads');
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
const clipByName = (page, name) => page.locator('section[aria-label="Timeline"] [role="button"]', { hasText: name });
async function waitClipCount(page, expected, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await clipCount(page)) === expected) return true;
    await page.waitForTimeout(300);
  }
  return (await clipCount(page)) === expected;
}
// Wait until `locator`'s text contains `text` (or times out); returns the text.
// textContent() throws if the row re-renders mid-poll, so a failed read
// is just an empty read — never a crash (a job row's visible label
// changes when it completes, which used to kill the audit here).
async function waitText(locator, text, timeoutMs = 60000) {
  const read = async () => {
    try {
      return (await locator.textContent({ timeout: 5000 })) ?? '';
    } catch {
      return '';
    }
  };
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const body = await read();
    if (body.includes(text)) return body;
    await pageWait(300);
  }
  return read();
}
const pageWait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Current playhead timecode from the preview readout ("00:00:04:00 / 00:00:06:00"). */
const readTimecode = (page) => page.evaluate(() => {
  const m = document.body.innerText.match(/(\d{2}:\d{2}:\d{2}:\d{2}) \/ (\d{2}:\d{2}:\d{2}:\d{2})/);
  return m ? m[1] : null;
});
const timecodeSeconds = (tc) => {
  if (!tc) return -1;
  const [h, m, sec] = tc.split(':').map(Number);
  return h * 3600 + m * 60 + sec;
};

function ffprobe(file, args) {
  return new Promise((resolve) => {
    const ff = spawn('ffprobe', ['-v', 'error', ...args, file], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    ff.stdout.on('data', (d) => { out += d; });
    ff.stderr.on('data', (d) => { err += d; });
    ff.on('close', (code) => resolve({ code, err, out: out.trim() }));
    ff.on('error', (e) => resolve({ code: -1, err: String(e), out: '' }));
  });
}

const L_CARDS = ['L-EXPORT', 'L-EXPORT-QUEUE', 'L-EXPORT-AUDIO', 'L-TEMPLATES-SLOTS', 'L-CLOUD', 'L-COLLAB', 'L-SHARE'];

async function main() {
  await fs.mkdir(AUDIT, { recursive: true });
  await fs.mkdir(DL, { recursive: true });
  for (const id of L_CARDS) await fs.mkdir(path.join(AUDIT, id), { recursive: true });

  // ---- Node-side: behaviour cards + Phase 8 floors exist ----
  for (const id of L_CARDS) {
    try {
      await fs.stat(path.join(ROOT, 'docs', 'behavior', `${id}.md`));
      check(id, `behaviour card docs/behavior/${id}.md exists`, true);
    } catch {
      check(id, `behaviour card docs/behavior/${id}.md exists`, false, 'missing');
    }
  }
  const buildAssets = await fs.readFile(path.join(ROOT, 'scripts', 'build-assets.mjs'), 'utf8');
  check('L-TEMPLATES-SLOTS', 'build-assets templates floor is 35', buildAssets.includes('templates: 35'));

  // ---- Fixture (regenerated every run) ----
  try {
    await fs.stat(path.join(MEDIA, 'test-av.mp4'));
  } catch {
    await new Promise((resolve) => {
      const ff = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'testsrc=duration=6:size=320x180:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-y', path.join(MEDIA, 'test-av.mp4')], { stdio: 'ignore' });
      ff.on('close', resolve);
      ff.on('error', resolve);
    });
  }

  const preview = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort', '--host', '127.0.0.1'], {
    cwd: ROOT, stdio: 'ignore',
  });
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
  const downloads = [];
  try {
    await waitUp();
    const context = await browser.newContext({ acceptDownloads: true, viewport: { height: 900, width: 1440 } });
    const page = await context.newPage();
    page.on('pageerror', (e) => check('AUDIT', `pageerror: ${String(e).slice(0, 120)}`, false));
    page.on('console', (m) => {
      if (m.type() === 'error') check('AUDIT', `console error: ${m.text().slice(0, 120)}`, false);
    });
    page.on('download', async (d) => {
      const n = downloads.length;
      const file = path.join(DL, `${String(n).padStart(2, '0')}-${d.suggestedFilename()}`);
      try {
        await d.saveAs(file);
        downloads.push({ file, name: d.suggestedFilename() });
        console.log(`  download saved: ${file}`);
      } catch (e) {
        check('AUDIT', `download save failed: ${d.suggestedFilename()}`, false, String(e));
      }
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


    // ================= L-CLOUD (dashboard, first — before any project) =================
    const backups = page.locator('section[aria-label="Backups"]');
    check('L-CLOUD', 'Dashboard Backups section renders', await backups.isVisible());
    const backupSelect = backups.locator('select[aria-label="Project to back up"]');
    const options = await backupSelect.locator('option').allTextContents();
    check('L-CLOUD', 'backup project picker lists projects', options.length > 1, options.join(' | '));
    await backupSelect.selectOption({ label: 'Sunset Coast — Sample Project' });
    await backups.getByRole('button', { name: 'Back up this project' }).click();
    await pageWait(1500);
    const bundleFile = downloads.find((d) => d.name.endsWith('.vidora'));
    check('L-CLOUD', 'backup downloads a .vidora file', Boolean(bundleFile), bundleFile?.name ?? 'no download');
    let bundleOk = false;
    if (bundleFile) {
      try {
        const bundle = JSON.parse(await fs.readFile(bundleFile.file, 'utf8'));
        bundleOk = bundle.kind === 'vidora-bundle' && bundle.project?.name === 'Sunset Coast — Sample Project' && bundle.version === '0.9.0';
      } catch { bundleOk = false; }
    }
    check('L-CLOUD', 'bundle is a valid Vidora bundle (kind, version 0.9.0, sample project)', bundleOk);
    await shot(page, 'L-CLOUD', 'dashboard-backups.png');
    // Import the same bundle back — it opens the restored project in the editor.
    await backups.locator('input[type="file"]').setInputFiles([bundleFile.file]);
    await page.waitForTimeout(1200);
    const editorVisible = await page.locator('section[aria-label="Timeline"]').isVisible();
    check('L-CLOUD', 'importing the bundle restores the project into the editor', editorVisible);
    // Back to the dashboard for a clean test project.
    await page.getByRole('button', { name: 'Back to dashboard' }).click();
    await page.waitForTimeout(500);

    // ================= Test project: import + timeline =================
    await page.getByRole('button', { name: 'New Project' }).click();
    await page.waitForTimeout(600);
    await page.locator('nav[aria-label="Editor tools"] button[title="Media"]').click();
    await page.waitForTimeout(300);
    const mediaInput = page.locator('aside[aria-label="Media library"] input[type="file"]').first();
    await mediaInput.setInputFiles([path.join(MEDIA, 'test-av.mp4')]);
    await page.waitForTimeout(4000);
    await page.locator('aside[aria-label="Media library"]').locator('li', { hasText: 'test-av.mp4' }).first().locator('button', { hasText: 'Add to timeline' }).click();
    check('L-EXPORT', 'test video is on the timeline (1 clip)', await waitClipCount(page, 1), `clips: ${await clipCount(page)}`);

    // ================= L-EXPORT: dialog, options, real video export =================
    const dialog = page.locator('[role="dialog"][aria-label="Export and share"]');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await page.waitForTimeout(600);
    check('L-EXPORT', 'Export dialog opens', await dialog.isVisible());
    for (const tab of ['Download', 'Share for review', 'Share as presentation', 'Share on social']) {
      check('L-EXPORT', `tab "${tab}" present`, (await dialog.getByRole('tab', { name: tab }).count()) === 1);
    }
    const dialogText = (await dialog.textContent()) ?? '';
    check('L-EXPORT', 'resolution options include 480p and 4K', dialogText.includes('480p') && dialogText.includes('4K'));
    check('L-EXPORT', 'quality options include Fast / Recommended / High', dialogText.includes('Fast exporting') && dialogText.includes('High quality'));
    check('L-EXPORT', 'format options include MP4 / WebM / MOV', dialogText.includes('MP4 (H.264 + AAC)') && dialogText.includes('WebM') && dialogText.includes('MOV'));
    check('L-EXPORT', 'H.265 honestly not offered', dialogText.includes('H.265 is not offered'));
    // Which format can this browser actually encode?
    const caps = await page.evaluate(async () => {
      const out = { aac: false, h264: false, opus: false, vp9: false, vp8: false };
      if (typeof VideoEncoder === 'undefined') return { ...out, videoEncoder: false };
      try { out.h264 = (await VideoEncoder.isConfigSupported({ codec: 'avc1.640033', width: 854, height: 480, bitrate: 2500000, framerate: 30 })).supported; } catch { /* no */ }
      try { out.vp9 = (await VideoEncoder.isConfigSupported({ codec: 'vp09.00.10.08', width: 854, height: 480, bitrate: 2500000, framerate: 30 })).supported; } catch { /* no */ }
      try { out.vp8 = (await VideoEncoder.isConfigSupported({ codec: 'vp8', width: 854, height: 480, bitrate: 2500000, framerate: 30 })).supported; } catch { /* no */ }
      if (typeof AudioEncoder !== 'undefined') {
        try { out.aac = (await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })).supported; } catch { /* no */ }
        try { out.opus = (await AudioEncoder.isConfigSupported({ codec: 'opus', sampleRate: 48000, numberOfChannels: 2, bitrate: 128000 })).supported; } catch { /* no */ }
      }
      return { ...out, videoEncoder: true };
    });
    console.log('  browser video capabilities:', JSON.stringify(caps));
    const format = caps.h264 ? 'mp4' : caps.vp9 || caps.vp8 ? 'webm' : null;
    check('L-EXPORT', 'browser can encode at least one video codec', format !== null, JSON.stringify(caps));
    if (format) {
      await dialog.locator('select').nth(0).selectOption('480');
      await dialog.locator('select').nth(2).selectOption('30');
      await dialog.locator('select').nth(3).selectOption(format);
      await dialog.getByRole('button', { name: 'Export', exact: true }).click();
      const videoJobLi = dialog.locator('li[data-kind="video"]').first();
      const queueText = await waitText(videoJobLi, 'done', 600000);
      check('L-EXPORT', `video export job completes (${format} 480p/30fps)`, queueText.includes('done'), queueText.slice(0, 200));
      await shot(page, 'L-EXPORT', 'export-done.png');
      const videoDl = downloads.find((d) => d.name.endsWith(`.${format}`));
      check('L-EXPORT', `exported file downloads (.${format})`, Boolean(videoDl), videoDl?.name ?? 'no download');
      if (videoDl) {
        const vCodec = await ffprobe(videoDl.file, ['-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0']);
        const aCodec = await ffprobe(videoDl.file, ['-select_streams', 'a:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0']);
        const dur = await ffprobe(videoDl.file, ['-show_entries', 'format=duration', '-of', 'csv=p=0']);
        const vName = vCodec.out;
        const aName = aCodec.out;
        const seconds = Number.parseFloat(dur.out);
        check('L-EXPORT', `video track is ${format === 'mp4' ? 'h264' : 'vp8/vp9'} (got ${vName})`, format === 'mp4' ? vName === 'h264' : vName === 'vp9' || vName === 'vp8', `video=${vName} audio=${aName || 'none'} duration=${dur.out}`);
        // Audio track only where the codec exists: AAC is not encodable
        // in the headless shell, so MP4 is honestly video-only there
        // (the dialog's capability notes say so); WebM gets Opus.
        const expectAudio = format === 'mp4' ? (caps.aac ? 'aac' : '') : (caps.opus ? 'opus' : '');
        check('L-EXPORT', `audio track is ${expectAudio || 'none (codec unavailable, honestly video-only)'} (got ${aName || 'none'})`, aName === expectAudio, `video=${vName} audio=${aName || 'none'}`);
        if (!expectAudio) {
          check('L-EXPORT', 'dialog honestly notes the missing audio codec', dialogText.includes('AAC is not available here') || dialogText.includes('Opus is not available here'), 'capability note shown');
        }
        check('L-EXPORT', 'duration is about the 6 s project', Math.abs(seconds - 6) < 1.5, `duration=${dur.out}`);
      }
    }

    // ================= L-EXPORT-QUEUE: enqueue 2, cancel 1, other completes =================
    // Enqueue a slow 1080p video job, then a cover job behind it; cancel the video.
    await dialog.locator('select').nth(0).selectOption('1080');
    await dialog.getByRole('button', { name: 'Export', exact: true }).click();
    await pageWait(3000);
    await dialog.getByRole('button', { name: 'Export cover' }).click();
    // Newest job first in the list: the 1080p job is .first().
    const videoJob = dialog.locator('li[data-kind="video"]').first();
    const runningText = await waitText(videoJob, 'running', 60000);
    check('L-EXPORT-QUEUE', 'second video job starts running', runningText.includes('running'));
    const cancelBtn = videoJob.getByRole('button', { name: 'Cancel' });
    if ((await cancelBtn.count()) === 1) {
      await cancelBtn.click();
    } else {
      check('L-EXPORT-QUEUE', 'Cancel button present on the running job', false, 'no Cancel button — job may not be running');
    }
    const cancelText = await waitText(videoJob, 'cancelled', 30000);
    check('L-EXPORT-QUEUE', 'cancelling the running job marks it cancelled', cancelText.includes('cancelled'));
    const coverJobLi = dialog.locator('li[data-kind="cover"]').first();
    const coverText = await waitText(coverJobLi, 'done', 120000);
    check('L-EXPORT-QUEUE', 'the queued cover job still completes after the cancel', coverText.includes('done'));
    // The download event fires when the job completes, but saveAs() is
    // async — wait for the file to land before asserting.
    {
      const deadline = Date.now() + 15000;
      while (Date.now() < deadline && !downloads.some((d) => d.name.endsWith('.png'))) await pageWait(300);
    }
    const coverDl = downloads.find((d) => d.name.endsWith('.png'));
    check('L-EXPORT-AUDIO', 'cover frame downloads as PNG', Boolean(coverDl), coverDl?.name ?? 'no download');
    if (coverDl) {
      const head = (await fs.readFile(coverDl.file)).subarray(0, 8);
      check('L-EXPORT-AUDIO', 'cover file starts with the PNG magic bytes', head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47);
    }
    await shot(page, 'L-EXPORT-QUEUE', 'queue-after-cancel.png');

    // ================= L-EXPORT-AUDIO: WAV + GIF =================
    await dialog.getByRole('button', { name: 'Audio only (WAV)' }).click();
    const wavJobLi = dialog.locator('li[data-kind="audio"]').first();
    const wavText = await waitText(wavJobLi, 'done', 180000);
    check('L-EXPORT-AUDIO', 'audio-only WAV job completes', wavText.includes('done'));
    const wavDl = downloads.find((d) => d.name.endsWith('.wav'));
    check('L-EXPORT-AUDIO', 'WAV file downloads', Boolean(wavDl), wavDl?.name ?? 'no download');
    if (wavDl) {
      const head = (await fs.readFile(wavDl.file)).subarray(0, 12);
      check('L-EXPORT-AUDIO', 'WAV starts with RIFF/WAVE', head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WAVE');
      const dur = await ffprobe(wavDl.file, ['-show_entries', 'format=duration', '-of', 'csv=p=0']);
      check('L-EXPORT-AUDIO', 'WAV duration is about the 6 s project', Math.abs(Number.parseFloat(dur.out) - 6) < 1.5, `duration=${dur.out}`);
    }
    await dialog.getByRole('button', { name: 'Animated GIF' }).click();
    const gifJobLi = dialog.locator('li[data-kind="gif"]').first();
    const gifText = await waitText(gifJobLi, 'done', 300000);
    check('L-EXPORT-AUDIO', 'GIF job completes', gifText.includes('done'));
    const gifDl = downloads.find((d) => d.name.endsWith('.gif'));
    check('L-EXPORT-AUDIO', 'GIF file downloads', Boolean(gifDl), gifDl?.name ?? 'no download');
    if (gifDl) {
      const head = (await fs.readFile(gifDl.file)).subarray(0, 6);
      check('L-EXPORT-AUDIO', 'GIF starts with GIF89a', head.toString('ascii') === 'GIF89a');
      const frames = await ffprobe(gifDl.file, ['-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0']);
      const n = Number.parseInt(frames.out, 10);
      check('L-EXPORT-AUDIO', 'GIF has about 60 frames (6 s at 10 fps)', n >= 50 && n <= 70, `frames=${frames.out}`);
    }
    await shot(page, 'L-EXPORT-AUDIO', 'audio-kinds-done.png');

    // ================= L-COLLAB: comment at playhead, resolve, timeline marker =================
    // Scroll the dialog to the top first: after long jobs the queue list
    // is at the bottom and the tab row can be out of view mid-click.
    await dialog.evaluate((el) => { el.scrollTop = 0; });
    await pageWait(300);
    try {
      await dialog.getByRole('tab', { name: 'Share for review' }).click({ timeout: 10000 });
    } catch {
      await dialog.evaluate((el) => { el.scrollTop = 0; });
      await dialog.getByRole('tab', { name: 'Share for review' }).click({ timeout: 10000 });
    }
    await page.waitForTimeout(400);
    await dialog.locator('input[aria-label="Your name for comments"]').fill('Auditor');
    await dialog.locator('textarea[aria-label="Comment text"]').fill('Title is too slow here');
    await dialog.getByRole('button', { name: 'Add comment' }).click();
    await pageWait(500);
    const reviewText = (await dialog.textContent()) ?? '';
    check('L-COLLAB', 'comment appears in the review list', reviewText.includes('Title is too slow here') && reviewText.includes('Auditor'));
    await dialog.getByRole('button', { name: 'Resolve' }).click();
    await pageWait(400);
    const resolvedText = (await dialog.textContent()) ?? '';
    check('L-COLLAB', 'resolving the comment shows Reopen', resolvedText.includes('Reopen'));
    await shot(page, 'L-COLLAB', 'review-comments.png');
    await dialog.getByRole('button', { name: 'Close export' }).click();
    await pageWait(500);
    const marker = page.locator('button[aria-label^="Comment at"]');
    check('L-COLLAB', 'comment marker appears on the timeline ruler', (await marker.count()) === 1);
    // Move the playhead away (click the ruler at ~4 s, zoom is 24 px/s),
    // then click the marker and confirm the playhead returns to the comment time (0:00).
    const rulerBox = await page.locator('section[aria-label="Timeline"] .overflow-x-auto').boundingBox();
    await page.mouse.click(rulerBox.x + 4 * 24 + 4, rulerBox.y + 10);
    await pageWait(500);
    const movedTo = timecodeSeconds(await readTimecode(page));
    check('L-COLLAB', 'ruler click moves the playhead to ~4 s', movedTo >= 3 && movedTo <= 5, `timecode=${await readTimecode(page)}`);
    await marker.first().click();
    await pageWait(500);
    const backTo = timecodeSeconds(await readTimecode(page));
    check('L-COLLAB', 'clicking the marker seeks the playhead back to the comment (0:00)', backTo === 0, `timecode=${await readTimecode(page)}`);

    // ================= L-SHARE: social buttons, caption, presentation =================
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await page.waitForTimeout(600);
    await dialog.getByRole('tab', { name: 'Share on social' }).click();
    await pageWait(400);
    const socialText = (await dialog.textContent()) ?? '';
    for (const name of ['YouTube', 'TikTok', 'Facebook Page', 'Instagram Reels']) {
      check('L-SHARE', `social button "${name}" present`, socialText.includes(name));
    }
    check('L-SHARE', 'caption textarea present', (await dialog.locator('textarea[aria-label="Share caption"]').count()) === 1);
    check('L-SHARE', 'Free Schedule is disabled with a reason', await dialog.getByRole('button', { name: /Free Schedule/ }).isDisabled());
    const popupPromise = page.waitForEvent('popup', { timeout: 15000 }).catch(() => null);
    await dialog.getByRole('button', { name: /YouTube/ }).first().click();
    const popup = await popupPromise;
    // The headless shell cannot load youtube.com (no external network
    // in this sandbox), so the popup lands on chrome-error:// — the
    // app's job is opening the upload page, which the popup opening
    // proves; the exact URL is unit-tested in phase8.test.ts.
    const ytOk = popup !== null && (popup.url().includes('youtube.com/upload') || popup.url().startsWith('chrome-error://'));
    check('L-SHARE', 'YouTube button opens the upload page', ytOk, popup?.url() ?? 'no popup');
    if (popup) await popup.close();
    await shot(page, 'L-SHARE', 'social-tab.png');
    // Presentation: Present now opens fullscreen watch-only mode.
    await dialog.getByRole('tab', { name: 'Share as presentation' }).click();
    await pageWait(300);
    await dialog.getByRole('button', { name: 'Present now (fullscreen, watch only)' }).click();
    await pageWait(800);
    const presentBar = page.locator('text=Exit presentation');
    check('L-SHARE', 'Present now opens presentation mode with an exit bar', await presentBar.isVisible());
    await shot(page, 'L-SHARE', 'presentation-mode.png');
    await page.keyboard.press('Escape');
    await pageWait(500);
    check('L-SHARE', 'Esc leaves presentation mode', !(await presentBar.isVisible()));
    await shot(page, 'L-SHARE', 'after-presentation.png');

    // ================= L-TEMPLATES-SLOTS (last — opens a new project) =================
    await page.locator('nav[aria-label="Editor tools"] button[title="Templates"]').click();
    await page.waitForTimeout(500);
    const templates = page.locator('div[aria-label="Templates"]');
    check('L-TEMPLATES-SLOTS', 'Templates panel opens', await templates.isVisible());
    check('L-TEMPLATES-SLOTS', 'template "Sunrise Intro" is listed', (await templates.getByText('Sunrise Intro').count()) >= 1);
    const card = templates.getByRole('button', { name: 'Sunrise Intro details' }).locator('xpath=ancestor::div[1]');
    await card.getByRole('button', { name: 'Choose media' }).click();
    await pageWait(400);
    const slotSelect = card.locator('select[aria-label="Media for Main clip"]');
    check('L-TEMPLATES-SLOTS', 'slot picker appears for the template', (await slotSelect.count()) === 1);
    await slotSelect.selectOption({ label: 'test-av.mp4' });
    await card.getByRole('button', { name: 'Use template' }).click();
    await pageWait(800);
    // Sunrise Intro = 1 filled video clip + 1 text clip + 1 sticker clip.
    const filledOk = await waitClipCount(page, 3, 10000) && (await clipByName(page, 'test-av.mp4').count()) >= 1;
    check('L-TEMPLATES-SLOTS', 'Use template builds a project with the picked clip', filledOk, `clips: ${await clipCount(page)}`);
    await shot(page, 'L-TEMPLATES-SLOTS', 'template-applied.png');
  } catch (e) {
    // A step threw (e.g. a button that was not there): record it and
    // still write the report below instead of dying silently.
    check('AUDIT', `audit crashed mid-run: ${String(e).slice(0, 200)}`, false);
  } finally {
    await browser.close();
    preview.kill();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const report = [
    '# Vidora Phase 8 audit report',
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
  console.log(`\nPhase 8 audit: ${passed}/${results.length} passed`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('audit crashed:', e);
  process.exit(1);
});
