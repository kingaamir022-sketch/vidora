#!/usr/bin/env node
/**
 * Vidora Phase 4 self-audit (Rule 12.4).
 * Serves the production build with `vite preview`, drives it with
 * Playwright (chromium headless shell), performs each Phase 4 behaviour
 * card's steps (J-AUDIO, J-INSPECTOR, J-MIXER, J-VOICE, J-DETACH,
 * J-PITCH, J-BEAT, J-VOICEOVER), screenshots into audit/phase4/<ID>/,
 * and writes audit/phase4/AUDIT-REPORT.md.
 * Run: npm run audit:phase4   (builds first)
 *
 * Fixtures are regenerated here because /tmp is wiped on restarts:
 *  - test-av.mp4: 4 s video + 440 Hz tone (detach target)
 *  - test-beats.wav: 6 s tone with loud/quiet pulses each second
 *    (beat detection target — written as PCM in Node, no ffmpeg filter
 *    needed)
 * Voiceover uses the fake media device flags, so no real microphone.
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = path.join(ROOT, 'audit', 'phase4');
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

/** 16-bit mono PCM WAV written in Node (deterministic, no ffmpeg filter). */
async function writeWav(file, seconds, sampleRate, sampleFn) {
  const n = Math.floor(seconds * sampleRate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) {
    const s = Math.max(-1, Math.min(1, sampleFn(i / sampleRate)));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  await fs.writeFile(file, buf);
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
const props = (page) => page.locator('aside[aria-label="Properties"]');
const markersText = async (page) => {
  const text = await props(page).textContent().catch(() => '');
  const m = (text ?? '').match(/Markers:\s*(\d+)/);
  return m ? Number(m[1]) : -1;
};
let markersBaseline = -1;

async function main() {
  await fs.mkdir(AUDIT, { recursive: true });
  await fs.mkdir(MEDIA, { recursive: true });
  // Video+audio fixture for the detach check.
  try {
    await fs.stat(path.join(MEDIA, 'test-av.mp4'));
  } catch {
    await new Promise((resolve) => {
      const ff = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'testsrc=duration=4:size=320x180:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-y', path.join(MEDIA, 'test-av.mp4')], { stdio: 'ignore' });
      ff.on('close', resolve);
      ff.on('error', resolve);
    });
  }
  // Beats fixture: loud half-second / quiet half-second, every second.
  await writeWav(path.join(MEDIA, 'test-beats.wav'), 6, 8000, (t) => {
    const amp = t % 1 < 0.5 ? 0.9 : 0.15;
    return amp * Math.sin(2 * Math.PI * 440 * t);
  });

  const preview = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort', '--host', '127.0.0.1'], {
    cwd: ROOT, stdio: 'ignore',
  });
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  });
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

    // ---- Import the video+audio fixture ----
    await page.locator('nav[aria-label="Editor tools"] button[title="Media"]').click();
    await page.waitForTimeout(300);
    const mediaInput = page.locator('aside[aria-label="Media library"] input[type="file"]').first();
    await mediaInput.setInputFiles([path.join(MEDIA, 'test-av.mp4')]);
    await page.waitForTimeout(3000);
    await page.locator('aside[aria-label="Media library"] li').first().locator('button', { hasText: 'Add to timeline' }).click();
    await page.waitForTimeout(500);
    check('J-DETACH', 'video clip on timeline (detach target)', (await clipCount(page)) === 1, `clips: ${await clipCount(page)}`);

    // ---- J-AUDIO: panel, sub-tabs, originals, add a loop ----
    await fs.mkdir(path.join(AUDIT, 'J-AUDIO'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Audio"]').click();
    await page.waitForTimeout(300);
    const audioPanel = page.locator('[aria-label="Audio panel"]');
    check('J-AUDIO', 'Audio panel opens', await audioPanel.isVisible());
    check('J-AUDIO', 'Music / Sound effects sub-tabs present', (await audioPanel.getByRole('tab', { name: 'Music' }).count()) === 1 && (await audioPanel.getByRole('tab', { name: 'Sound effects' }).count()) === 1);
    check('J-AUDIO', 'Vidora Originals list shows Calm Pad', (await audioPanel.getByText('Calm Pad', { exact: true }).count()) === 1);
    await audioPanel.getByRole('tab', { name: 'Sound effects' }).click();
    await page.waitForTimeout(200);
    check('J-AUDIO', 'Sound effects tab shows Soft Pop', (await audioPanel.getByText('Soft Pop', { exact: true }).count()) === 1);
    await audioPanel.getByRole('tab', { name: 'Music' }).click();
    await page.waitForTimeout(200);
    const beforeLoop = await clipCount(page);
    await audioPanel.locator('button[aria-label="Add Calm Pad to timeline"]').click();
    const loopAdded = await waitClipCount(page, beforeLoop + 1);
    check('J-AUDIO', 'adding Calm Pad renders the original and adds an audio clip', loopAdded, `clips: ${beforeLoop} -> ${await clipCount(page)}`);
    await shot(page, 'J-AUDIO', 'original-added.png');

    // ---- J-INSPECTOR: select the audio clip, fades, voice, normalize ----
    await fs.mkdir(path.join(AUDIT, 'J-INSPECTOR'), { recursive: true });
    await clip(page, 1).click(); // Calm Pad is the 2nd clip (video first)
    await page.waitForTimeout(400);
    check('J-INSPECTOR', 'Audio section appears in Properties', (await props(page).getByRole('heading', { name: 'Audio' }).count()) === 1);
    const fadeIn = page.getByLabel('Fade in (s)');
    await fadeIn.fill('1');
    await page.waitForTimeout(300);
    check('J-INSPECTOR', 'fade-in sets to 1 s', (await fadeIn.inputValue()) === '1');
    const voiceSelect = page.getByLabel('Voice changer preset');
    await voiceSelect.selectOption('deep');
    await page.waitForTimeout(300);
    check('J-INSPECTOR', 'voice select sets Deep Voice', (await voiceSelect.inputValue()) === 'deep');
    await page.getByRole('button', { name: 'Normalize volume' }).click();
    await page.waitForTimeout(500);
    check('J-INSPECTOR', 'Normalize reports the new volume', (await props(page).getByText(/Volume set to/).count()) === 1);
    await shot(page, 'J-INSPECTOR', 'audio-inspector.png');

    // ---- J-MIXER: open mixer with no clip selected ----
    await fs.mkdir(path.join(AUDIT, 'J-MIXER'), { recursive: true });
    await audioPanel.getByRole('button', { name: 'Open mixer' }).click();
    await page.waitForTimeout(400);
    check('J-MIXER', 'Mixer shows when no clip is selected', (await props(page).getByRole('heading', { name: 'Mixer' }).count()) === 1);
    check('J-MIXER', 'master volume slider present', await page.getByLabel('Master volume').isVisible());
    check('J-MIXER', 'track volume row present for Audio 1', await page.getByLabel('Volume for track Audio 1').isVisible());
    const duck = page.getByLabel('Duck music under speech');
    await duck.check();
    await page.waitForTimeout(300);
    check('J-MIXER', 'ducking switch turns on', await duck.isChecked());
    markersBaseline = await markersText(page);
    check('J-MIXER', 'project summary shows 0 markers in a new project', markersBaseline === 0, `markers: ${markersBaseline}`);
    await shot(page, 'J-MIXER', 'mixer.png');

    // ---- J-BEAT: import the pulses wav, detect beats, add markers ----
    await fs.mkdir(path.join(AUDIT, 'J-BEAT'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Media"]').click();
    await page.waitForTimeout(300);
    await mediaInput.setInputFiles([path.join(MEDIA, 'test-beats.wav')]);
    await page.waitForTimeout(3000);
    await page.locator('aside[aria-label="Media library"] li').nth(1).locator('button', { hasText: 'Add to timeline' }).click();
    await page.waitForTimeout(500);
    const beatsClips = await clipCount(page);
    check('J-BEAT', 'beats wav added to timeline', beatsClips === 3, `clips: ${beatsClips}`);
    await clip(page, 2).click(); // beats clip is 3rd (video, Calm Pad, beats)
    await page.waitForTimeout(400);
    await page.locator('nav[aria-label="Editor tools"] button[title="Audio"]').click();
    await page.waitForTimeout(300);
    const detectBtn = audioPanel.getByRole('button', { name: 'Detect beats' });
    check('J-BEAT', 'Detect beats is enabled for the audio clip', await detectBtn.isEnabled());
    await detectBtn.click();
    await page.waitForTimeout(600);
    check('J-BEAT', 'beat detection reports found beats', (await audioPanel.getByText(/beats found/).count()) === 1);
    await audioPanel.getByRole('button', { name: 'Add beat markers' }).click();
    await page.waitForTimeout(400);
    await audioPanel.getByRole('button', { name: 'Open mixer' }).click();
    await page.waitForTimeout(300);
    const markersAfter = await markersText(page);
    check('J-BEAT', 'Add beat markers adds markers to the project', markersAfter > markersBaseline, `markers: ${markersBaseline} -> ${markersAfter}`);
    await shot(page, 'J-BEAT', 'beats.png');

    // ---- J-DETACH: shortcut first, then the context menu ----
    await fs.mkdir(path.join(AUDIT, 'J-DETACH'), { recursive: true });
    await clip(page, 0).click(); // video clip
    await page.waitForTimeout(300);
    const beforeDetach = await clipCount(page);
    await page.keyboard.press('Control+Shift+S');
    const detachedByKey = await waitClipCount(page, beforeDetach + 1);
    check('J-DETACH', 'Ctrl+Shift+S separates audio onto its own track', detachedByKey, `clips: ${beforeDetach} -> ${await clipCount(page)}`);
    // Add the same video again (lands at the end of Video 1) and detach it via the menu.
    await page.locator('nav[aria-label="Editor tools"] button[title="Media"]').click();
    await page.waitForTimeout(300);
    await page.locator('aside[aria-label="Media library"] li').first().locator('button', { hasText: 'Add to timeline' }).click();
    await page.waitForTimeout(500);
    const secondVideo = await clipCount(page);
    check('J-DETACH', 'second video clip added for the menu check', secondVideo === beforeDetach + 2, `clips: ${secondVideo}`);
    await clip(page, 1).click(); // second video clip
    await page.waitForTimeout(300);
    check('J-DETACH', 'Separate audio button shows for a video clip', (await props(page).getByRole('button', { name: /Separate audio/ }).count()) === 1);
    await clip(page, 1).click({ button: 'right' });
    await page.waitForTimeout(300);
    const menuItem = page.getByRole('menuitem', { name: 'Separate audio (Ctrl+Shift+S)' });
    check('J-DETACH', 'context menu offers Separate audio (Ctrl+Shift+S)', await menuItem.isVisible());
    const beforeMenu = await clipCount(page);
    await menuItem.click();
    const detachedByMenu = await waitClipCount(page, beforeMenu + 1);
    check('J-DETACH', 'context menu separates the audio', detachedByMenu, `clips: ${beforeMenu} -> ${await clipCount(page)}`);
    await shot(page, 'J-DETACH', 'detached.png');

    // ---- J-PITCH: slow the video to 0.5x, pitch stays on ----
    await fs.mkdir(path.join(AUDIT, 'J-PITCH'), { recursive: true });
    await clip(page, 1).click(); // second video clip (now detached, still a video clip)
    await page.waitForTimeout(300);
    await props(page).locator('button', { hasText: '0.5×' }).first().click();
    await page.waitForTimeout(300);
    const pitchBox = props(page).locator('label', { hasText: 'Pitch' }).locator('input').first();
    check('J-PITCH', 'Pitch switch stays on at 0.5x', await pitchBox.isChecked());
    check('J-PITCH', 'speed note describes pitch-preserving playback', (await props(page).getByText(/Pitch is kept/).count()) === 1);
    await shot(page, 'J-PITCH', 'speed-half.png');

    // ---- J-VOICE: voice preset + apply to all ----
    await fs.mkdir(path.join(AUDIT, 'J-VOICE'), { recursive: true });
    await clip(page, 2).click(); // Calm Pad audio clip
    await page.waitForTimeout(300);
    const voiceSelect2 = page.getByLabel('Voice changer preset');
    await voiceSelect2.selectOption('robot');
    await page.waitForTimeout(300);
    check('J-VOICE', 'Robot voice preset selects', (await voiceSelect2.inputValue()) === 'robot');
    check('J-VOICE', 'Apply voice to all audio button present', (await page.getByRole('button', { name: 'Apply voice to all audio' }).count()) === 1);
    await page.getByRole('button', { name: 'Apply voice to all audio' }).click();
    await page.waitForTimeout(300);
    check('J-VOICE', 'voice stays Robot after Apply to all', (await page.getByLabel('Voice changer preset').inputValue()) === 'robot');
    await shot(page, 'J-VOICE', 'robot-voice.png');

    // ---- J-VOICEOVER: record with the fake mic, stop, clip appears ----
    await fs.mkdir(path.join(AUDIT, 'J-VOICEOVER'), { recursive: true });
    await page.locator('nav[aria-label="Editor tools"] button[title="Audio"]').click();
    await page.waitForTimeout(300);
    const beforeVo = await clipCount(page);
    await audioPanel.getByRole('button', { name: 'Record voiceover' }).click();
    await page.waitForTimeout(2500);
    check('J-VOICEOVER', 'recording state shows the timer', (await audioPanel.getByText(/Recording/).count()) === 1);
    await audioPanel.getByRole('button', { name: 'Stop and add to timeline' }).click();
    const voAdded = await waitClipCount(page, beforeVo + 1);
    check('J-VOICEOVER', 'stopping adds a voiceover clip to the timeline', voAdded, `clips: ${beforeVo} -> ${await clipCount(page)}`);
    await shot(page, 'J-VOICEOVER', 'voiceover-clip.png');

    // ---- Report ----
    const fails = results.filter((r) => !r.ok);
    const report = [
      '# Vidora Phase 4 — Self-Audit Report (Rule 12.4)',
      '',
      `- Run: ${new Date().toISOString()}`,
      '- App: production build served with `vite preview` on http://127.0.0.1:4173/',
      '- Browser: Chromium headless shell (playwright-core 1.65.1), viewport 1440x900, fake media device for voiceover',
      `- Checks: ${results.length - fails.length}/${results.length} passed, ${fails.length} failed`,
      '',
      '## Checks',
      '',
      ...results.map((r) => `- ${r.ok ? 'PASS' : 'FAIL'} [${r.id}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`),
      '',
      '## Screenshots',
      '',
      'Screenshots live in `audit/phase4/<behaviour-card-ID>/` (one folder per card).',
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
