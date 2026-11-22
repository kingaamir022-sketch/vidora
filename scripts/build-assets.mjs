#!/usr/bin/env node
/**
 * Vidora asset build script — Phase 0 scope.
 * Regenerates the logo icon-size variants (16–512px) and favicon from
 * public/logo.svg, the single source of truth for the mark.
 * Phase 5 extends this script to regenerate the full procedural asset
 * library (effects, transitions, LUTs, stickers, fonts, templates) and
 * the license report. Nothing here is a placeholder: every step runs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logo = readFileSync(join(root, 'public', 'logo.svg'), 'utf8');

for (const size of [16, 32, 48, 192, 512]) {
  const sized = logo.replace('width="96" height="96"', `width="${size}" height="${size}"`);
  writeFileSync(join(root, 'public', 'icons', `icon-${size}.svg`), sized);
  console.log(`icon-${size}.svg written`);
}
writeFileSync(join(root, 'public', 'favicon.svg'), logo.replace('width="96" height="96"', 'width="32" height="32"'));
console.log('favicon.svg written');
console.log('build:assets complete (Phase 0 scope: logo icon variants).');
