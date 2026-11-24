#!/usr/bin/env node
/**
 * Vidora Phase 9 self-audit (Rule 12.4).
 * Serves the production build with `vite preview`, drives it with
 * Playwright (chromium headless shell), performs each Phase 9 behaviour
 * card's steps (M-ONBOARD, M-LOCALE, M-SETTINGS, M-AUTH, M-SUBS,
 * M-ACCESS, M-PERF, M-LENS, M-ASS, M-TELEMETRY, M-CI, M-DOCKER),
 * screenshots into audit/phase9/<ID>/, and writes
 * audit/phase9/AUDIT-REPORT.md.
 * Run: npm run audit:phase9   (builds first)
 *
 * Fixtures are regenerated here because /tmp is wiped on restarts:
 *  - test-av.mp4: 6 s testsrc video + 440 Hz sine (ffmpeg).
 *  - test.ass: two dialogue lines (written fresh every run).
 *
 * Docker is NOT installed on this VM, so the Dockerfile is checked by
 * inspection only (node-side) and the report says so honestly — the
 * first real image build needs a machine with Docker.
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = path.join(ROOT, 'audit', 'phase9');
const MEDIA = '/tmp/audit-media';
const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:4173/';

const ASS_TEXT = `[Script Info]
Title: Audit
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,Hello world
Dialogue: 0,0:00:05.00,0:00:08.00,Default,,0,0,0,,Second line
`;

const results = [];
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${id}] ${name}${detail ? ' — ' + detail : ''}`);
};
const shot = (page, id, name) =>
  page.screenshot({ path: path.join(AUDIT, id, name) }).catch((e) => {
    check(id, `screenshot ${name}`, false, String(e));
  });
const pageWait = (ms) => new Promise((r) => setTimeout(r, ms));

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

const M_CARDS = ['M-ONBOARD', 'M-LOCALE', 'M-SETTINGS', 'M-AUTH', 'M-SUBS', 'M-ACCESS', 'M-PERF', 'M-LENS', 'M-ASS', 'M-TELEMETRY', 'M-CI', 'M-DOCKER'];
const clipCount = (page) => page.locator('section[aria-label="Timeline"] [role="button"]').count();

async function main() {
  await fs.mkdir(AUDIT, { recursive: true });
  for (const id of M_CARDS) await fs.mkdir(path.join(AUDIT, id), { recursive: true });

  // ---- Node-side: behaviour cards + Phase 9 deliverables exist ----
  for (const id of M_CARDS) {
    try {
      await fs.stat(path.join(ROOT, 'docs', 'behavior', `${id}.md`));
      check(id, `behaviour card docs/behavior/${id}.md exists`, true);
    } catch {
      check(id, `behaviour card docs/behavior/${id}.md exists`, false, 'missing');
    }
  }
  const pkg = JSON.parse(await fs.readFile(path.join(ROOT, 'package.json'), 'utf8'));
  check('M-CI', 'package.json version is 1.0.0', pkg.version === '1.0.0', `version=${pkg.version}`);
  check('M-CI', 'audit:phase9 script exists', typeof pkg.scripts?.['audit:phase9'] === 'string');
  try {
    const ci = await fs.readFile(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');
    check('M-CI', 'CI workflow runs build + test on Node 20', ci.includes('node-version: 20') && ci.includes('npm run build') && ci.includes('npm test'));
    check('M-CI', 'CI workflow notes Playwright audits are NOT in CI', ci.toLowerCase().includes('playwright') && ci.toLowerCase().includes('not'));
  } catch {
    check('M-CI', 'CI workflow .github/workflows/ci.yml exists', false, 'missing');
  }
  try {
    const dockerfile = await fs.readFile(path.join(ROOT, 'Dockerfile'), 'utf8');
    check('M-DOCKER', 'Dockerfile uses a two-stage build (node → nginx)', dockerfile.includes('FROM node:20-alpine') && dockerfile.includes('FROM nginx:alpine'));
    check('M-DOCKER', 'Dockerfile copies the built dist folder', dockerfile.includes('COPY --from=build') && dockerfile.includes('dist'));
  } catch {
    check('M-DOCKER', 'Dockerfile exists', false, 'missing');
  }
  try {
    const compose = await fs.readFile(path.join(ROOT, 'docker-compose.yml'), 'utf8');
    check('M-DOCKER', 'docker-compose.yml maps port 4173', compose.includes('4173:80'));
  } catch {
    check('M-DOCKER', 'docker-compose.yml exists', false, 'missing');
  }
  try {
    const ignore = await fs.readFile(path.join(ROOT, '.dockerignore'), 'utf8');
    check('M-DOCKER', '.dockerignore excludes node_modules and dist', ignore.includes('node_modules') && ignore.includes('dist'));
  } catch {
    check('M-DOCKER', '.dockerignore exists', false, 'missing');
  }
  const { execSync } = await import('node:child_process');
  let dockerHere = false;
  try { execSync('which docker', { stdio: 'ignore' }); dockerHere = true; } catch { /* not installed */ }
  check('M-DOCKER', 'Docker image build is NOT claimed on this VM (docker not installed — first real build needs Docker)', !dockerHere, dockerHere ? 'docker is installed here' : 'docker is not installed on this VM');

  // ---- Fixtures (regenerated every run) ----
  await fs.mkdir(MEDIA, { recursive: true });
  await fs.writeFile(path.join(MEDIA, 'test.ass'), ASS_TEXT);
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
  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
  try {
    await waitUp();
    const context = await browser.newContext({ viewport: { height: 900, width: 1440 } });
    const page = await context.newPage();
    page.on('pageerror', (e) => check('AUDIT', `pageerror: ${String(e).slice(0, 120)}`, false));
    page.on('console', (m) => {
      if (m.type() === 'error') check('AUDIT', `console error: ${m.text().slice(0, 120)}`, false);
    });

    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // ================= M-ONBOARD (fresh profile → tour shows) =================
    const tour = page.locator('[role="dialog"][aria-labelledby="tour-heading"]');
    check('M-ONBOARD', 'onboarding tour appears on first launch', await tour.isVisible());
    check('M-ONBOARD', 'first step is "Welcome to Vidora"', (await tour.textContent())?.includes('Welcome to Vidora') ?? false);
    await shot(page, 'M-ONBOARD', 'tour-step-1.png');
    await tour.getByRole('button', { name: 'Next' }).click();
    await pageWait(300);
    check('M-ONBOARD', 'Next advances to step 2 ("Import your media")', (await tour.textContent())?.includes('Import your media') ?? false);
    await tour.getByRole('button', { name: 'Skip tour' }).click();
    await pageWait(400);
    check('M-ONBOARD', 'Skip tour hides the tour', !(await tour.isVisible()));
    const onboardingFlag = await page.evaluate(() => localStorage.getItem('vidora.onboarding.v1'));
    check('M-ONBOARD', 'dismissal is remembered (vidora.onboarding.v1 = 1)', onboardingFlag === '1', `flag=${onboardingFlag}`);
    await page.reload({ waitUntil: 'networkidle' });
    await pageWait(800);
    check('M-ONBOARD', 'tour does not reappear on reload', !(await tour.isVisible()));

    // ================= M-LOCALE + M-SETTINGS (Settings dialog, dashboard) =================
    const settings = page.locator('[role="dialog"][aria-labelledby="settings-heading"]');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await pageWait(500);
    check('M-SETTINGS', 'Settings dialog opens from the dashboard', await settings.isVisible());
    // Language: Urdu (selects are positional — their aria-labels localise
    // with the locale, so a text selector stops matching after a switch).
    await settings.locator('select').nth(0).selectOption('ur');
    await pageWait(500);
    const dashboardTitle = await page.locator('h1').first().textContent();
    check('M-LOCALE', 'switching to Urdu translates the dashboard title', dashboardTitle === 'آپ کے پروجیکٹس', `h1=${dashboardTitle}`);
    await shot(page, 'M-LOCALE', 'dashboard-urdu.png');
    // Language: Arabic → RTL
    await settings.locator('select').nth(0).selectOption('ar');
    await pageWait(500);
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'));
    check('M-LOCALE', 'switching to Arabic sets dir=rtl', dir === 'rtl', `dir=${dir}`);
    await shot(page, 'M-LOCALE', 'dashboard-arabic-rtl.png');
    await settings.locator('select').nth(0).selectOption('en');
    await pageWait(400);
    // Theme: Light
    await settings.locator('select').nth(1).selectOption('light');
    await pageWait(400);
    const theme = await page.evaluate(() => document.querySelector('[data-theme]')?.getAttribute('data-theme'));
    check('M-SETTINGS', 'Light theme sets data-theme="light" on the app root', theme === 'light', `theme=${theme}`);
    const rootBg = await page.evaluate(() => {
      const el = document.querySelector('[data-theme]');
      // The zinc-950 token drives the main surfaces; in light theme it
      // flips to near-white (#fafafa), in dark it is near-black.
      return el ? getComputedStyle(el).getPropertyValue('--color-zinc-950').trim() : '';
    });
    check('M-SETTINGS', 'light theme flips the zinc-950 surface token to near-white', rootBg === '#fafafa', `--color-zinc-950=${rootBg}`);
    await shot(page, 'M-SETTINGS', 'dashboard-light-theme.png');
    await settings.locator('select').nth(1).selectOption('dark');
    await pageWait(300);
    // Task bar + sidebar toggles (persisted to vidora.settings.v1)
    await settings.locator('input[aria-label="Show task bar"]').uncheck();
    await pageWait(300);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('vidora.settings.v1') ?? '{}'));
    check('M-SETTINGS', 'task-bar preference is saved', saved.showTaskBar === false, JSON.stringify(saved));
    await settings.locator('input[aria-label="Show task bar"]').check();
    await settings.locator('input[aria-label="Show sidebar"]').uncheck();
    await pageWait(300);
    const saved2 = await page.evaluate(() => JSON.parse(localStorage.getItem('vidora.settings.v1') ?? '{}'));
    check('M-SETTINGS', 'sidebar preference is saved', saved2.showSidebar === false, JSON.stringify(saved2));
    await settings.locator('input[aria-label="Show sidebar"]').check();
    // Input preference (options: Default / Left-handed mouse)
    await settings.locator('select').nth(2).selectOption('left-handed');
    await pageWait(300);
    const saved3 = await page.evaluate(() => JSON.parse(localStorage.getItem('vidora.settings.v1') ?? '{}'));
    check('M-SETTINGS', 'input preference is saved', saved3.inputPreference === 'left-handed', JSON.stringify(saved3));
    await settings.locator('select').nth(2).selectOption('default');
    // Show the tour again from Settings
    await settings.getByRole('button', { name: 'Show the tour again' }).click();
    await pageWait(400);
    check('M-SETTINGS', 'Show the tour again re-opens the onboarding tour', await tour.isVisible());
    await tour.getByRole('button', { name: 'Skip tour' }).click();
    await pageWait(300);

    // ================= M-TELEMETRY (Diagnostics section) =================
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await pageWait(400);
    const diag = settings.locator('section[aria-label="Diagnostics"]');
    check('M-TELEMETRY', 'Diagnostics section renders', await diag.isVisible());
    check('M-TELEMETRY', 'no errors recorded yet on a fresh profile', (await diag.textContent())?.includes('No errors recorded.') ?? false);
    await diag.locator('input[type="checkbox"]').check();
    await pageWait(400);
    check('M-TELEMETRY', 'opt-in is saved (vidora.telemetry.optin.v1 = 1)', (await page.evaluate(() => localStorage.getItem('vidora.telemetry.optin.v1'))) === '1');
    check('M-TELEMETRY', 'feature usage counts the opt-in itself (analytics-opt-in)', (await diag.textContent())?.includes('analytics-opt-in') ?? false);
    await shot(page, 'M-TELEMETRY', 'diagnostics.png');
    await settings.getByRole('button', { name: 'Close', exact: true }).click();
    await pageWait(300);

    // ================= M-AUTH + M-SUBS (first account = OWNER) =================
    const accountSection = page.locator('section[aria-label="Account"]');
    check('M-AUTH', 'Account section renders on the dashboard', await accountSection.isVisible());
    await accountSection.locator('input[aria-label="Your name"]').fill('Aamir');
    await accountSection.locator('input[aria-label="Email"]').fill('aamir@example.com');
    await accountSection.locator('input[aria-label="Password"]').fill('password123');
    await accountSection.getByRole('button', { name: 'Create account' }).click();
    await pageWait(1200);
    const signedIn = (await accountSection.textContent()) ?? '';
    check('M-AUTH', 'first account signs in as OWNER', signedIn.includes('role: OWNER'));
    check('M-SUBS', 'signed-in account shows plan: Free', signedIn.includes('plan: Free'));
    check('M-SUBS', 'Plans list shows Pro as not available', signedIn.includes('Pro — Not available in this build'));
    await shot(page, 'M-AUTH', 'owner-signed-in.png');
    // Second account = CUSTOMER, read-only
    await accountSection.getByRole('button', { name: 'Sign out' }).click();
    await pageWait(400);
    await accountSection.locator('input[aria-label="Your name"]').fill('Kashif');
    await accountSection.locator('input[aria-label="Email"]').fill('kashif@example.com');
    await accountSection.locator('input[aria-label="Password"]').fill('password123');
    await accountSection.getByRole('button', { name: 'Create account' }).click();
    await pageWait(1200);
    const signedIn2 = (await accountSection.textContent()) ?? '';
    check('M-AUTH', 'second account signs in as CUSTOMER', signedIn2.includes('role: CUSTOMER'));
    check('M-AUTH', 'customer sees the read-only warning', signedIn2.includes('read-only'));
    const newProjectBtn = page.getByRole('button', { name: 'New Project' });
    check('M-AUTH', 'New Project is disabled for a CUSTOMER', await newProjectBtn.isDisabled());
    await shot(page, 'M-AUTH', 'customer-dashboard.png');
    // Open the sample project as a CUSTOMER → read-only banner in the editor.
    await page.locator('button[aria-label^="Open "]').first().click();
    await pageWait(900);
    const readOnlyBanner = page.locator('text=You are signed in as Customer — read-only');
    check('M-AUTH', 'editor shows a read-only banner for a CUSTOMER', await readOnlyBanner.isVisible());
    check('M-AUTH', 'Export is disabled for a CUSTOMER', await page.getByRole('button', { name: 'Export', exact: true }).isDisabled());
    await shot(page, 'M-AUTH', 'customer-editor-readonly.png');
    await page.getByRole('button', { name: 'Back to dashboard' }).click();
    await pageWait(500);
    await accountSection.getByRole('button', { name: 'Sign out' }).click();
    await pageWait(400);
    check('M-AUTH', 'signing out restores full access (New Project enabled)', !(await page.getByRole('button', { name: 'New Project' }).isDisabled()));

    // ================= Editor: test project (M-PERF, M-LENS, M-ASS, M-ACCESS) =================
    await page.getByRole('button', { name: 'New Project' }).click();
    await pageWait(600);
    await page.locator('nav[aria-label="Editor tools"] button[title="Media"]').click();
    await pageWait(300);
    const mediaInput = page.locator('aside[aria-label="Media library"] input[type="file"]').first();
    await mediaInput.setInputFiles([path.join(MEDIA, 'test-av.mp4')]);
    await pageWait(4000);
    await page.locator('aside[aria-label="Media library"]').locator('li', { hasText: 'test-av.mp4' }).first().locator('button', { hasText: 'Add to timeline' }).click();
    await pageWait(1000);
    check('M-PERF', 'test video is on the timeline (1 clip)', (await clipCount(page)) === 1, `clips: ${await clipCount(page)}`);
    // Import the same file again — the cache reuses the probe result.
    await mediaInput.setInputFiles([path.join(MEDIA, 'test-av.mp4')]);
    await pageWait(4000);
    const mediaItems = await page.locator('aside[aria-label="Media library"] li', { hasText: 'test-av.mp4' }).count();
    check('M-PERF', 're-importing the same file works (2 items, thumbnails both present)', mediaItems === 2, `items: ${mediaItems}`);
    const thumbs = await page.locator('aside[aria-label="Media library"] img').count();
    check('M-PERF', 'thumbnails render for imported media', thumbs >= 2, `imgs: ${thumbs}`);
    await shot(page, 'M-PERF', 'media-imported-twice.png');
    // M-TELEMETRY: creating the project counted a 'projects' event
    // (opt-in was enabled earlier on the dashboard).
    await page.locator('button[title="More options"]').click();
    await pageWait(300);
    await page.getByRole('menuitem', { name: 'Settings' }).click();
    await pageWait(500);
    const usageText = (await settings.locator('section[aria-label="Diagnostics"]').textContent()) ?? '';
    check('M-TELEMETRY', 'feature usage counts the created project ("projects")', usageText.includes('projects'), usageText.slice(0, 200));
    await settings.getByRole('button', { name: 'Close', exact: true }).click();
    await pageWait(300);

    // M-LENS: Adjustment tab → Lens correction slider
    await page.locator('section[aria-label="Timeline"] [role="button"]').first().click();
    await pageWait(400);
    await page.locator('nav[aria-label="Editor tools"] button[title="Adjustment"]').click();
    await pageWait(400);
    const adjPanel = page.locator('[aria-label="Colour and adjustment"]');
    check('M-LENS', 'Adjustment panel opens for the clip', await adjPanel.isVisible());
    const lensLabel = adjPanel.locator('label', { hasText: 'Lens correction' }).first();
    await lensLabel.locator('input[type="checkbox"]').check();
    await pageWait(400);
    const slider = adjPanel.locator('input[aria-label="Lens correction strength"]');
    check('M-LENS', 'enabling Lens correction reveals the Strength slider', await slider.isVisible());
    await slider.fill('0.5');
    await pageWait(500);
    const sliderValue = await slider.inputValue();
    check('M-LENS', 'strength slider sets 0.50', sliderValue === '0.5', `value=${sliderValue}`);
    // Autosave runs every 3 s — wait for it before reading localStorage.
    await pageWait(4000);
    const savedLens = await page.evaluate(() => {
      const projects = JSON.parse(localStorage.getItem('vidora.projects.v1') ?? '[]');
      const p = projects.find((x) => x.name?.includes('Untitled')) ?? projects[projects.length - 1];
      return p?.tracks?.flatMap((t) => t.clips)[0]?.adjustment ?? null;
    });
    check('M-LENS', 'lensStrength 0.5 is stored in the project', savedLens?.lensStrength === 0.5 && savedLens?.lensCorrection === true, JSON.stringify(savedLens));
    await shot(page, 'M-LENS', 'lens-correction-on.png');
    await lensLabel.locator('input[type="checkbox"]').uncheck();
    await pageWait(300);

    // M-ASS: Captions tab → import .ass
    await page.locator('nav[aria-label="Editor tools"] button[title="Captions"]').click();
    await pageWait(400);
    const captionsPanel = page.locator('[aria-label="Captions panel"]');
    check('M-ASS', 'Captions panel opens', await captionsPanel.isVisible());
    const assInput = captionsPanel.locator('input[type="file"]').first();
    await assInput.setInputFiles([path.join(MEDIA, 'test.ass')]);
    await pageWait(1200);
    const captionsText = (await captionsPanel.textContent()) ?? '';
    check('M-ASS', 'import confirms the file ("Imported test.ass.")', captionsText.includes('Imported test.ass.'));
    check('M-ASS', 'import creates 2 cues ("Manual captions (2)")', captionsText.includes('Manual captions (2)'));
    // Cue text lives in input values, not in textContent — read the values.
    const cueTexts = await captionsPanel.locator('input[aria-label="Cue text"]').evaluateAll((els) => els.map((e) => e.value));
    check('M-ASS', 'importing .ass creates the "Hello world" cue', cueTexts.includes('Hello world'), `cues=${JSON.stringify(cueTexts)}`);
    check('M-ASS', 'second .ass cue is "Second line"', cueTexts.includes('Second line'), `cues=${JSON.stringify(cueTexts)}`);
    await shot(page, 'M-ASS', 'ass-imported.png');

    // M-ACCESS: focus ring + dialog semantics
    await page.keyboard.press('Tab');
    await pageWait(200);
    const focusStyle = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return 'none';
      const cs = getComputedStyle(el);
      return `${el.tagName} outline=${cs.outlineStyle} ${cs.outlineWidth}`;
    });
    check('M-ACCESS', 'keyboard focus shows a visible outline', focusStyle.includes('solid') && !focusStyle.includes('0px'), focusStyle);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await pageWait(600);
    const exportDialog = page.locator('[role="dialog"][aria-label="Export and share"]');
    check('M-ACCESS', 'Export dialog has aria-modal="true"', (await exportDialog.getAttribute('aria-modal')) === 'true');
    await exportDialog.getByRole('button', { name: 'Close export' }).click();
    await pageWait(400);
    const shortcuts = page.locator('[role="dialog"][aria-label="Keyboard shortcuts"]');
    await page.locator('button[title="Keyboard shortcuts"]').click();
    await pageWait(500);
    const shortcutsVisible = await shortcuts.isVisible().catch(() => false);
    if (shortcutsVisible) {
      check('M-ACCESS', 'Shortcuts dialog has aria-modal="true"', (await shortcuts.getAttribute('aria-modal')) === 'true');
      await page.keyboard.press('Escape');
      await pageWait(400);
    } else {
      check('M-ACCESS', 'Shortcuts dialog opens from the top bar', false, 'dialog did not open — check the button');
    }
    await shot(page, 'M-ACCESS', 'after-shortcuts.png');
  } catch (e) {
    check('AUDIT', `audit crashed mid-run: ${String(e).slice(0, 200)}`, false);
  } finally {
    await browser.close();
    preview.kill();
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const report = [
    '# Vidora Phase 9 audit report',
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
  console.log(`\nPhase 9 audit: ${passed}/${results.length} passed`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error('audit crashed:', e);
  process.exit(1);
});
