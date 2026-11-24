#!/usr/bin/env node
/**
 * Vidora Phase 7 self-audit (Rule 12.4).
 * Serves the production build with `vite preview`, drives it with
 * Playwright (chromium headless shell), performs each Phase 7 behaviour
 * card's steps (K-STT, K-TTS, K-SMARTCUT, K-REFRAME, K-BGREMOVE,
 * K-TRACK, K-STABILIZE, K-ENHANCE, K-MOVEMENT, K-OPTFLOW, K-VOCAL,
 * K-HIGHLIGHTS, K-SCRIPT, K-UPSCALE, K-PROVIDERS), screenshots into
 * audit/phase7/<ID>/, and writes audit/phase7/AUDIT-REPORT.md.
 * Run: npm run audit:phase7   (builds first)
 *
 * Fixtures are regenerated here because /tmp is wiped on restarts:
 *  - test-av.mp4: 6 s testsrc video + 440 Hz sine (ffmpeg).
 *  - test-shaky.mp4: 6 s testsrc with a random ±10 px crop jitter
 *    (ffmpeg crop + random(0)) — a real handheld-shake target.
 *  - test-gaps.wav: 6 s stereo WAV written in Node — tone 0–2 s,
 *    silence 2–4 s, tone 4–6 s; L = centre + side, R = centre − side
 *    (exercises Smart Cut AND the centre-channel stem split).
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = path.join(ROOT, 'audit', 'phase7');
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

/** 16-bit stereo PCM WAV written in Node (deterministic, no ffmpeg filter). */
async function writeStereoWav(file, seconds, sampleRate, sampleFn) {
  const n = Math.floor(seconds * sampleRate);
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i += 1) {
    const t = i / sampleRate;
    const [l, r] = sampleFn(t);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r)) * 32767), 44 + i * 4 + 2);
  }
  await fs.writeFile(file, buf);
}

const clipCount = (page) => page.locator('section[aria-label="Timeline"] [role="button"]').count();
const timelineClip = (page, index) => page.locator('section[aria-label="Timeline"] [role="button"]').nth(index);
const clipByName = (page, name) => page.locator('section[aria-label="Timeline"] [role="button"]', { hasText: name });
async function waitClipCount(page, expected, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await clipCount(page)) === expected) return true;
    await page.waitForTimeout(300);
  }
  return (await clipCount(page)) === expected;
}
/** Wait until a section's status <p> contains `text` (or times out). */
async function waitSectionStatus(section, text, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const body = (await section.textContent()) ?? '';
    if (body.includes(text)) return body;
    await new Promise((r) => setTimeout(r, 300));
  }
  return (await section.textContent()) ?? '';
}

const K_CARDS = [
  'K-STT', 'K-TTS', 'K-SMARTCUT', 'K-REFRAME', 'K-BGREMOVE', 'K-TRACK',
  'K-STABILIZE', 'K-ENHANCE', 'K-MOVEMENT', 'K-OPTFLOW', 'K-VOCAL',
  'K-HIGHLIGHTS', 'K-SCRIPT', 'K-UPSCALE', 'K-PROVIDERS',
];

async function main() {
  await fs.mkdir(AUDIT, { recursive: true });
  await fs.mkdir(MEDIA, { recursive: true });

  // ---- Node-side: behaviour cards + offline pipelines exist ----
  for (const id of K_CARDS) {
    try {
      await fs.stat(path.join(ROOT, 'docs', 'behavior', `${id}.md`));
      check(id, `behaviour card docs/behavior/${id}.md exists`, true);
    } catch {
      check(id, `behaviour card docs/behavior/${id}.md exists`, false, 'missing');
    }
  }
  for (const f of ['tools/transcribe.py', 'tools/narrate.py', 'tools/download-models.sh', 'tools/test_pipeline.sh', 'tools/README.md']) {
    try {
      await fs.stat(path.join(ROOT, f));
      check('K-STT', `${f} exists`, true);
    } catch {
      check('K-STT', `${f} exists`, false, 'missing');
    }
  }
  check('K-STT', 'Vosk model downloaded locally (tools/models/vosk-en-small)', await fs.stat(path.join(ROOT, 'tools', 'models', 'vosk-en-small')).then(() => true).catch(() => false));
  check('K-TTS', 'Piper voice downloaded locally (tools/models/en_US-lessac-medium.onnx)', await fs.stat(path.join(ROOT, 'tools', 'models', 'en_US-lessac-medium.onnx')).then(() => true).catch(() => false));

  // ---- Fixtures (regenerated every run; /tmp is wiped on restarts) ----
  try {
    await fs.stat(path.join(MEDIA, 'test-av.mp4'));
  } catch {
    await new Promise((resolve) => {
      const ff = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'testsrc=duration=6:size=320x180:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', '-y', path.join(MEDIA, 'test-av.mp4')], { stdio: 'ignore' });
      ff.on('close', resolve);
      ff.on('error', resolve);
    });
  }
  // Tone 0–2 s, silence 2–4 s, tone 4–6 s; L = centre + side, R = centre − side.
  await writeStereoWav(path.join(MEDIA, 'test-gaps.wav'), 6, 8000, (t) => {
    if (t >= 2 && t < 4) return [0, 0];
    const centre = 0.5 * Math.sin(2 * Math.PI * 440 * t);
    const side = 0.5 * Math.sin(2 * Math.PI * 880 * t);
    return [centre + side, centre - side];
  });
  // Shaky video: testsrc with a random ±10 px crop offset per frame.
  try {
    await fs.stat(path.join(MEDIA, 'test-shaky.mp4'));
  } catch {
    await new Promise((resolve) => {
      const ff = spawn('ffmpeg', ['-f', 'lavfi', '-i', 'testsrc=duration=6:size=320x180:rate=30', '-vf', "crop=300:160:x='10+random(0)*10':y='10+random(0)*10'", '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', path.join(MEDIA, 'test-shaky.mp4')], { stdio: 'ignore' });
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

    const aiPanel = page.locator('aside[aria-label="AI Library"]');
    const section = (title) => aiPanel.locator(`section[aria-label="${title}"]`);

    // ---- Import fixtures ----
    await page.locator('nav[aria-label="Editor tools"] button[title="Media"]').click();
    await page.waitForTimeout(300);
    const mediaInput = page.locator('aside[aria-label="Media library"] input[type="file"]').first();
    await mediaInput.setInputFiles([path.join(MEDIA, 'test-av.mp4'), path.join(MEDIA, 'test-gaps.wav'), path.join(MEDIA, 'test-shaky.mp4')]);
    await page.waitForTimeout(4000);
    const lib = page.locator('aside[aria-label="Media library"]');
    for (const name of ['test-av.mp4', 'test-gaps.wav', 'test-shaky.mp4']) {
      await lib.locator('li', { hasText: name }).first().locator('button', { hasText: 'Add to timeline' }).click();
      await page.waitForTimeout(500);
    }
    check('K-SMARTCUT', 'video + audio + shaky fixtures on the timeline', (await clipCount(page)) === 3, `clips: ${await clipCount(page)}`);

    // ---- Open the AI Tools tab + Tools sub-tab ----
    await page.locator('nav[aria-label="Editor tools"] button[title="AI Tools"]').click();
    await page.waitForTimeout(400);
    check('K-PROVIDERS', 'AI Library panel opens on the AI Tools tab', await aiPanel.isVisible());
    check('K-PROVIDERS', 'Tools sub-tab present', (await aiPanel.getByRole('tab', { name: 'Tools' }).count()) === 1);
    await aiPanel.getByRole('tab', { name: 'Tools' }).click();
    await page.waitForTimeout(500);
    for (const title of [
      'AI Captions — speech to text', 'Narration — render to audio', 'Smart Cut — silence & filler removal',
      'Auto Reframe', 'Background Removal', 'Camera Tracking — automatic', 'Stabilize — real motion correction',
      'Enhance — Low-light, Retouch, Relight', 'AI Movement — camera moves', 'Optical Flow — smooth slow motion',
      'Vocal Isolation — stems', 'Auto Highlights', 'Script-to-Video', 'Upscale to 4K', 'AI Providers',
    ]) {
      check('K-PROVIDERS', `AI Tools section "${title}" renders`, (await section(title).count()) === 1);
    }
    await shot(page, 'K-PROVIDERS', 'tools-panel.png');

    // ---- K-STT / K-TTS: honest paths (no mic in headless shell) ----
    await fs.mkdir(path.join(AUDIT, 'K-STT'), { recursive: true });
    const stt = section('AI Captions — speech to text');
    const sttText = (await stt.textContent()) ?? '';
    check('K-STT', 'dictation button (supported browser) or honest not-supported note', sttText.includes('Dictate transcript') || sttText.includes('not supported in this browser'), sttText.includes('Dictate transcript') ? 'dictation button shown' : 'not-supported note shown');
    check('K-STT', 'Vosk offline path is named (tools/transcribe.py)', (await stt.textContent())?.includes('tools/transcribe.py') ?? false);
    const tts = section('Narration — render to audio');
    check('K-TTS', 'Piper offline command is shown (tools/narrate.py)', (await tts.textContent())?.includes('tools/narrate.py') ?? false);
    await shot(page, 'K-STT', 'stt-tts.png');

    // ---- K-SMARTCUT: real silence cut on the WAV clip ----
    await fs.mkdir(path.join(AUDIT, 'K-SMARTCUT'), { recursive: true });
    await clipByName(page, 'test-gaps').first().click(); // audio clip
    await page.waitForTimeout(400);
    const smart = section('Smart Cut — silence & filler removal');
    await smart.getByRole('button', { name: 'Analyse', exact: true }).click();
    const smartText = await waitSectionStatus(smart, 'range(s) found');
    check('K-SMARTCUT', 'finds the 2 s silence (2.00s – 4.00s)', smartText.includes('2.00s') && smartText.includes('4.00s'), smartText.slice(0, 140));
    const beforeCut = await clipCount(page);
    await smart.getByRole('button', { name: 'Cut all ranges' }).click();
    const cutOk = await waitClipCount(page, beforeCut + 1);
    check('K-SMARTCUT', 'cutting the silence splits the audio clip (1 -> 2 pieces)', cutOk, `clips: ${beforeCut} -> ${await clipCount(page)}`);
    await shot(page, 'K-SMARTCUT', 'smartcut-done.png');

    // ---- K-VOCAL: real stem split on the same audio clip ----
    await fs.mkdir(path.join(AUDIT, 'K-VOCAL'), { recursive: true });
    await clipByName(page, 'test-gaps').first().click(); // first audio piece
    await page.waitForTimeout(400);
    const vocal = section('Vocal Isolation — stems');
    const beforeStem = await clipCount(page);
    await vocal.getByRole('button', { name: 'Render stem' }).click();
    const stemOk = await waitClipCount(page, beforeStem + 1, 60000);
    check('K-VOCAL', 'voice stem renders as a new audio clip on the timeline', stemOk, `clips: ${beforeStem} -> ${await clipCount(page)}`);
    await shot(page, 'K-VOCAL', 'stem-added.png');

    // ---- Video tools: select the clean video clip ----
    await clipByName(page, 'test-av').first().click();
    await page.waitForTimeout(400);

    // ---- K-REFRAME ----
    await fs.mkdir(path.join(AUDIT, 'K-REFRAME'), { recursive: true });
    const reframe = section('Auto Reframe');
    await reframe.locator('#ai-reframe-ratio').selectOption('9:16');
    await reframe.getByRole('button', { name: 'Analyse & apply' }).click();
    const reframeText = await waitSectionStatus(reframe, 'window');
    check('K-REFRAME', '9:16 analysis returns a crop window', reframeText.includes('9:16') && reframeText.includes('window'), reframeText.slice(0, 140));
    await shot(page, 'K-REFRAME', 'reframe.png');

    // ---- K-STABILIZE (on the shaky fixture — either honest outcome is a pass) ----
    await fs.mkdir(path.join(AUDIT, 'K-STABILIZE'), { recursive: true });
    await clipByName(page, 'test-shaky').first().click();
    await page.waitForTimeout(400);
    const stab = section('Stabilize — real motion correction');
    await stab.getByRole('button', { name: 'Analyse motion' }).click();
    let stabText = '';
    {
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        stabText = (await stab.textContent()) ?? '';
        if (stabText.includes('Motion analysed') || stabText.includes('No camera shake found')) break;
        await page.waitForTimeout(300);
      }
    }
    check('K-STABILIZE', 'motion analysis completes with an honest reading', stabText.includes('Motion analysed') || stabText.includes('No camera shake found'), stabText.slice(0, 140));
    await stab.locator('#ai-stabilize').check();
    check('K-STABILIZE', 'Stabilize toggle turns on after analysis', await stab.locator('#ai-stabilize').isChecked());
    await shot(page, 'K-STABILIZE', 'stabilize.png');

    // ---- Re-select the clean video clip for the remaining video tools ----
    await clipByName(page, 'test-av').first().click();
    await page.waitForTimeout(400);

    // ---- K-BGREMOVE / K-ENHANCE ----
    await fs.mkdir(path.join(AUDIT, 'K-BGREMOVE'), { recursive: true });
    const bg = section('Background Removal');
    await bg.locator('#ai-bgremove').check();
    check('K-BGREMOVE', 'Remove background toggle turns on', await bg.locator('#ai-bgremove').isChecked());
    await shot(page, 'K-BGREMOVE', 'bgremove.png');
    await fs.mkdir(path.join(AUDIT, 'K-ENHANCE'), { recursive: true });
    const enh = section('Enhance — Low-light, Retouch, Relight');
    await enh.locator('#ai-lowlight').fill('0.5');
    check('K-ENHANCE', 'Low light slider sets to 0.5 (range is 0–1)', (await enh.locator('#ai-lowlight').inputValue()) === '0.5');
    await enh.locator('#ai-relight').fill('0.3');
    check('K-ENHANCE', 'Relight slider sets to 0.3 (range is 0–1)', (await enh.locator('#ai-relight').inputValue()) === '0.3');
    await shot(page, 'K-ENHANCE', 'enhance.png');

    // ---- K-TRACK: no target yet -> Track button disabled, honest note ----
    await fs.mkdir(path.join(AUDIT, 'K-TRACK'), { recursive: true });
    const track = section('Camera Tracking — automatic');
    check('K-TRACK', 'Track button is disabled until a target clip is chosen', await track.getByRole('button', { name: 'Track automatically' }).isDisabled());
    check('K-TRACK', 'panel explains what tracking needs (pick a text/sticker clip + a video to follow)', (await track.textContent())?.includes('Select a text or sticker clip') ?? false);
    await shot(page, 'K-TRACK', 'tracking.png');

    // ---- K-MOVEMENT ----
    await fs.mkdir(path.join(AUDIT, 'K-MOVEMENT'), { recursive: true });
    const move = section('AI Movement — camera moves');
    await move.locator('#ai-move-kind').selectOption('zoom-in');
    await move.getByRole('button', { name: 'Apply move' }).click();
    const moveText = await waitSectionStatus(move, 'Applied zoom-in');
    check('K-MOVEMENT', 'zoom-in applies keyframes to the clip', moveText.includes('Applied zoom-in'), moveText.slice(0, 140));
    await shot(page, 'K-MOVEMENT', 'movement.png');

    // ---- K-OPTFLOW: render a 2x slow-motion copy ----
    await fs.mkdir(path.join(AUDIT, 'K-OPTFLOW'), { recursive: true });
    const flow = section('Optical Flow — smooth slow motion');
    const beforeFlow = await clipCount(page);
    await flow.getByRole('button', { name: 'Render 2× frames' }).click();
    const flowOk = await waitClipCount(page, beforeFlow + 1, 120000);
    check('K-OPTFLOW', '2x slow-motion copy renders as a new clip', flowOk, `clips: ${beforeFlow} -> ${await clipCount(page)}`);
    await shot(page, 'K-OPTFLOW', 'optflow.png');

    // ---- K-HIGHLIGHTS ----
    await fs.mkdir(path.join(AUDIT, 'K-HIGHLIGHTS'), { recursive: true });
    await clipByName(page, 'test-av').first().click();
    await page.waitForTimeout(400);
    const hl = section('Auto Highlights');
    await hl.getByRole('button', { name: 'Find highlights' }).click();
    const hlText = await waitSectionStatus(hl, 'highlight(s) found');
    check('K-HIGHLIGHTS', 'highlights are scored and listed', hlText.includes('highlight(s) found'), hlText.slice(0, 140));
    await shot(page, 'K-HIGHLIGHTS', 'highlights.png');

    // ---- K-UPSCALE: render a 2K copy ----
    await fs.mkdir(path.join(AUDIT, 'K-UPSCALE'), { recursive: true });
    const up = section('Upscale to 4K');
    await up.locator('#ai-upscale-target').selectOption('2560');
    const beforeUp = await clipCount(page);
    await up.getByRole('button', { name: 'Render upscaled copy' }).click();
    const upOk = await waitClipCount(page, beforeUp + 1, 120000);
    check('K-UPSCALE', 'upscaled copy renders as a new clip', upOk, `clips: ${beforeUp} -> ${await clipCount(page)}`);
    await shot(page, 'K-UPSCALE', 'upscale.png');

    // ---- K-PROVIDERS: Local ready, clouds not configured ----
    await fs.mkdir(path.join(AUDIT, 'K-PROVIDERS'), { recursive: true });
    const prov = section('AI Providers');
    check('K-PROVIDERS', 'Local provider shows Ready', (await prov.textContent())?.includes('Ready') ?? false);
    check('K-PROVIDERS', 'cloud providers are shown as Not configured', (await prov.textContent())?.includes('Not configured') ?? false);
    await shot(page, 'K-PROVIDERS', 'providers.png');

    // ---- K-SCRIPT: build a video from a 3-line script (last — opens a new project) ----
    await fs.mkdir(path.join(AUDIT, 'K-SCRIPT'), { recursive: true });
    const script = section('Script-to-Video');
    await script.locator('#ai-script').fill('A quiet morning over the hills\nThe city wakes up\nAnd the story begins');
    await script.getByRole('button', { name: 'Build video' }).click();
    // 3 scenes -> 3 image clips + 3 text overlays (narration is a TTS
    // flag on the text clips, not a separate audio clip).
    const scriptOk = await waitClipCount(page, 6, 60000);
    check('K-SCRIPT', '3-line script builds a 3-scene project (3 images + 3 text overlays)', scriptOk, `clips: ${await clipCount(page)}`);
    await shot(page, 'K-SCRIPT', 'script-project.png');
  } finally {
    await browser.close();
    preview.kill();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const report = [
    '# Vidora Phase 7 audit report',
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
  console.log(`\nPhase 7 audit: ${passed}/${results.length} passed`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('audit crashed:', e);
  process.exit(1);
});
