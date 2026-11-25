#!/usr/bin/env node
/** Probe the Export -> Download flow and dump any page error + DOM state. */
import { chromium } from 'playwright-core';

const EXE = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell';
const URL = 'http://127.0.0.1:5199/';

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 500)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERROR:', m.text().slice(0, 300)); });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const agree = page.getByRole('button', { name: 'Agree and continue' });
if (await agree.count()) { await agree.first().click(); await page.waitForTimeout(500); }
const updOk = page.getByRole('button', { name: 'OK', exact: true });
if (await updOk.count()) { await updOk.first().click(); await page.waitForTimeout(500); }
await page.getByRole('button', { name: 'Create project' }).first().click();
await page.waitForTimeout(900);
console.log('in editor, body text length:', (await page.evaluate(() => document.body.innerText.length)));
await page.getByRole('button', { name: 'Export', exact: true }).click();
await page.waitForTimeout(400);
console.log('menu visible:', await page.getByRole('menuitem', { name: 'Download' }).count());
await page.getByRole('menuitem', { name: 'Download' }).first().click();
await page.waitForTimeout(800);
const state = await page.evaluate(() => ({
  bodyText: document.body.innerText.slice(0, 300),
  bodyHtmlLen: document.body.innerHTML.length,
  dialog: document.querySelector('[role="dialog"]')?.getAttribute('aria-label') ?? null,
  rootChildren: document.getElementById('root')?.children.length ?? -1,
}));
console.log('after Download click:', JSON.stringify(state, null, 2));
await page.screenshot({ path: '/tmp/export-probe.png' });
await browser.close();
console.log('probe done');
