#!/usr/bin/env node
/**
 * Vidora asset build script — Phase 5 scope (SPEC N, N-ASSETS).
 * Regenerates the whole procedural asset library from the TypeScript
 * catalogs (the single source of truth):
 *  - logo icon-size variants (16–512px) + favicon from public/logo.svg
 *  - assets/manifest.json — every catalog entry (id, name, category,
 *    tags, license) + counts
 *  - assets/luts/*.cube — the 30 built-in looks as Adobe .cube files
 *  - assets/stickers/animated/*.json — the 28 sticker motion specs
 *    (Lottie-style JSON: duration + keyframes)
 *  - public/fonts/*.woff2 — the 40 open-license fonts (latin subset,
 *    Regular 400) from the Google Fonts CSS API; files already on disk
 *    are skipped; offline runs skip downloads gracefully with a warning
 *  - public/fonts/fonts.css — @font-face rules for the downloaded fonts
 *  - assets/fonts/manifest.json — per-font license/source rows
 *  - LICENSES/OFL-1.1.txt + LICENSES/Apache-2.0.txt — fetched from the
 *    canonical URLs when reachable; a notice stub + warning otherwise
 *  - LICENSES/PROVENANCE.md — Phase 5 section (between the PHASE-5
 *    markers) regenerated on every run
 * Minimum counts are enforced; the script exits non-zero with a readable
 * error when any catalog drops below its Phase 5 floor.
 * Nothing here is a placeholder: every step runs.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GLSL_EFFECT_CATALOG } from '../src/lib/glslEffects.ts';
import { TRANSITION_TYPES } from '../src/lib/transitions.ts';
import { BUILTIN_LUTS, lutToCubeText } from '../src/lib/lut.ts';
import { STICKER_CATALOG, SHAPE_DEFS } from '../src/lib/stickers.ts';
import { FONT_CATALOG } from '../src/lib/fonts.ts';
import { TEXT_STYLE_PRESETS } from '../src/lib/text.ts';
import { CAPTION_STYLE_PRESETS } from '../src/lib/captions.ts';
import { TEMPLATE_CATALOG } from '../src/lib/templates.ts';
import { ORIGINAL_LOOPS, ORIGINAL_SFX } from '../src/lib/audio.ts';
import { BACKGROUND_CATALOG } from '../src/lib/backgrounds.ts';
import { STICKER_MOTION_SPECS } from '../src/lib/stickerAnim.ts';
import { assetLibraryCounts, assetManifestEntries, textAnimationCount } from '../src/lib/assetLibrary.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const counts = assetLibraryCounts();
const summary = [];

const fail = (msg) => {
  console.error(`build:assets FAILED: ${msg}`);
  process.exit(1);
};

/** Enforce the Phase 5 catalog floors. */
const MINIMUMS = {
  backgrounds: 30,
  captionPresets: 20,
  fonts: 40,
  glslEffects: 60,
  loops: 30,
  luts: 30,
  sfx: 100,
  stickers: 200,
  templates: 25,
  textAnimations: 37,
  textPresets: 50,
  transitions: 30,
};
for (const [key, min] of Object.entries(MINIMUMS)) {
  const actual = key === 'textAnimations' ? textAnimationCount() : counts[key];
  if (actual < min) fail(`${key} is ${actual}, below the Phase 5 floor of ${min}.`);
}

// ---- 1. Logo icon variants (Phase 0, kept) ----
const logo = readFileSync(join(root, 'public', 'logo.svg'), 'utf8');
mkdirSync(join(root, 'public', 'icons'), { recursive: true });
for (const size of [16, 32, 48, 192, 512]) {
  const sized = logo.replace('width="96" height="96"', `width="${size}" height="${size}"`);
  writeFileSync(join(root, 'public', 'icons', `icon-${size}.svg`), sized);
}
writeFileSync(join(root, 'public', 'favicon.svg'), logo.replace('width="96" height="96"', 'width="32" height="32"'));
summary.push(`logo icons: 5 variants + favicon`);

// ---- 2. assets/manifest.json ----
mkdirSync(join(root, 'assets'), { recursive: true });
const entries = assetManifestEntries();
const manifest = {
  counts,
  entries,
  generated: new Date().toISOString(),
  generatedBy: 'npm run build:assets (Phase 5)',
  version: '0.6.0',
};
writeFileSync(join(root, 'assets', 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
summary.push(`manifest: ${entries.length} entries`);

// ---- 3. assets/luts/*.cube ----
const lutDir = join(root, 'assets', 'luts');
mkdirSync(lutDir, { recursive: true });
for (const lut of BUILTIN_LUTS) {
  writeFileSync(join(lutDir, `${lut.id}.cube`), lutToCubeText(lut.name, lut.size, lut.data));
}
summary.push(`luts: ${BUILTIN_LUTS.length} .cube files`);

// ---- 4. assets/stickers/animated/*.json ----
const animDir = join(root, 'assets', 'stickers', 'animated');
mkdirSync(animDir, { recursive: true });
for (const spec of STICKER_MOTION_SPECS) {
  writeFileSync(
    join(animDir, `${spec.id}.json`),
    `${JSON.stringify({ duration: spec.duration, id: spec.id, keyframes: spec.keyframes, name: spec.name, type: 'vidora-motion-v1' }, null, 2)}\n`,
  );
}
summary.push(`animated stickers: ${STICKER_MOTION_SPECS.length} JSON files`);

// ---- 5. Fonts: download latin woff2 + fonts.css + manifest ----
const fontsDir = join(root, 'public', 'fonts');
mkdirSync(fontsDir, { recursive: true });
const CHROME_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
let downloaded = 0;
let skipped = 0;
let failed = 0;
const cssRules = [];
for (const font of FONT_CATALOG) {
  const dest = join(fontsDir, font.file);
  if (existsSync(dest)) {
    skipped += 1;
  } else {
    try {
      const cssRes = await fetch(font.source, { headers: { 'User-Agent': CHROME_UA } });
      if (!cssRes.ok) throw new Error(`HTTP ${cssRes.status}`);
      const css = await cssRes.text();
      // The latin subset block is marked `/* latin */` in the response.
      const latinBlock = css.split('/* latin */')[1] ?? css;
      const urlMatch = latinBlock.match(/url\((https:[^)]+\.woff2)\)/);
      if (!urlMatch) throw new Error('no latin woff2 URL in CSS response');
      const fontRes = await fetch(urlMatch[1], { headers: { 'User-Agent': CHROME_UA } });
      if (!fontRes.ok) throw new Error(`HTTP ${fontRes.status}`);
      const buf = Buffer.from(await fontRes.arrayBuffer());
      if (buf.length < 1000) throw new Error('downloaded file suspiciously small');
      writeFileSync(dest, buf);
      downloaded += 1;
    } catch (err) {
      failed += 1;
      console.warn(`  font ${font.id}: download skipped (${err.message}) — app falls back to the system stack.`);
    }
  }
  cssRules.push(
    `@font-face {\n  font-family: '${font.family}';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url('/fonts/${font.file}') format('woff2');\n}`,
  );
}
writeFileSync(join(fontsDir, 'fonts.css'), `${cssRules.join('\n\n')}\n`);
const fontManifest = {
  fonts: FONT_CATALOG.map((f) => ({ category: f.category, family: f.family, file: f.file, id: f.id, license: f.license, source: f.source })),
  generated: new Date().toISOString(),
  note: 'All fonts are open-license (SIL OFL 1.1, except JetBrains Mono under Apache-2.0). Files are downloaded on first build; missing files fall back to the system stack.',
};
mkdirSync(join(root, 'assets', 'fonts'), { recursive: true });
writeFileSync(join(root, 'assets', 'fonts', 'manifest.json'), `${JSON.stringify(fontManifest, null, 2)}\n`);
summary.push(`fonts: ${FONT_CATALOG.length} families (${downloaded} downloaded, ${skipped} already on disk${failed > 0 ? `, ${failed} skipped offline` : ''})`);

// ---- 6. License texts (fetch canonical, stub + warn when offline) ----
const licenseDir = join(root, 'LICENSES');
async function fetchLicenseText(url, fallbackNotice) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': CHROME_UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.length < 500) throw new Error('response too short');
    return text;
  } catch (err) {
    console.warn(`  license fetch failed for ${url} (${err.message}) — writing a notice stub instead.`);
    return fallbackNotice;
  }
}
const oflText = await fetchLicenseText(
  'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt',
  'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007\n\nFull text: https://scripts.sil.org/OFL\nThis file is a notice stub: the OFL-1.1 text could not be downloaded on this run.\nAll fonts listed in assets/fonts/manifest.json are licensed under the SIL Open Font License 1.1 (except JetBrains Mono, Apache-2.0).\n',
);
writeFileSync(join(licenseDir, 'OFL-1.1.txt'), oflText.endsWith('\n') ? oflText : `${oflText}\n`);
const apacheText = await fetchLicenseText(
  'https://www.apache.org/licenses/LICENSE-2.0.txt',
  'Apache License Version 2.0, January 2004\n\nFull text: https://www.apache.org/licenses/LICENSE-2.0\nThis file is a notice stub: the Apache-2.0 text could not be downloaded on this run.\nJetBrains Mono (assets/fonts/manifest.json) is licensed under the Apache License 2.0.\n',
);
writeFileSync(join(licenseDir, 'Apache-2.0.txt'), apacheText.endsWith('\n') ? apacheText : `${apacheText}\n`);
summary.push('licenses: OFL-1.1.txt + Apache-2.0.txt');

// ---- 7. PROVENANCE.md Phase 5 section ----
const provPath = join(licenseDir, 'PROVENANCE.md');
const prov = readFileSync(provPath, 'utf8');
const section = [
  '<!-- PHASE-5-BEGIN -->',
  '',
  '## Phase 5 — Procedural asset library (v0.6.0)',
  '',
  'All Phase 5 assets are generated by `npm run build:assets` from the',
  'TypeScript catalogs in `src/lib/`. Counts are enforced by the script.',
  '',
  '| Asset | Count | Source / author | License |',
  '|---|---|---|---|',
  `| GLSL effects (\`src/lib/glslEffects.ts\`) | ${counts.glslEffects} | Original fragment shaders written for Vidora | CC0 (Vidora original) |`,
  `| Transitions (\`src/lib/transitions.ts\`) | ${counts.transitions} | Original canvas-2D transition code | CC0 (Vidora original) |`,
  `| LUT looks (\`src/lib/lut.ts\`, \`assets/luts/*.cube\`) | ${counts.luts} | Original procedural colour transforms | CC0 (Vidora original) |`,
  `| Stickers + shapes (\`src/lib/stickers.ts\`) | ${counts.stickers} stickers, ${counts.shapes} shapes | Original SVG artwork | CC0 (Vidora original) |`,
  `| Sticker motion specs (\`assets/stickers/animated/*.json\`) | ${STICKER_MOTION_SPECS.length} | Original keyframed motion data | CC0 (Vidora original) |`,
  `| Fonts (\`public/fonts/\`, \`assets/fonts/manifest.json\`) | ${counts.fonts} families | Google Fonts, downloaded as latin-subset woff2 by the script | SIL OFL 1.1 (JetBrains Mono: Apache-2.0) — see LICENSES/ |`,
  `| Text style presets (\`src/lib/text.ts\`) | ${counts.textPresets} | Original Vidora styles | CC0 (Vidora original) |`,
  `| Text animations | ${textAnimationCount()} | Original in/out + loop animation code | CC0 (Vidora original) |`,
  `| Caption style presets (\`src/lib/captions.ts\`) | ${counts.captionPresets} | Original Vidora styles | CC0 (Vidora original) |`,
  `| Templates (\`src/lib/templates.ts\`) | ${counts.templates} | Original layouts from Vidora assets only | CC0 (Vidora original) |`,
  `| Procedural music loops (\`src/lib/audio.ts\`) | ${counts.loops} | Original Web Audio compositions (no samples) | CC0 (Vidora original) |`,
  `| Procedural sound effects (\`src/lib/audio.ts\`) | ${counts.sfx} | Original Web Audio synthesis (no samples) | CC0 (Vidora original) |`,
  `| Backgrounds (\`src/lib/backgrounds.ts\`) | ${counts.backgrounds} | Original generated SVG artwork | CC0 (Vidora original) |`,
  `| Asset manifest (\`assets/manifest.json\`) | ${entries.length} entries | Generated from the catalogs on every run | — |`,
  '',
  'No third-party effect/transition/filter/sticker/template names or artwork',
  'are used. No stock photos, music, samples or copied source code.',
  '',
  '<!-- PHASE-5-END -->',
].join('\n');
const beginMarker = '<!-- PHASE-5-BEGIN -->';
const endMarker = '<!-- PHASE-5-END -->';
let nextProv;
const bi = prov.indexOf(beginMarker);
const ei = prov.indexOf(endMarker);
if (bi >= 0 && ei > bi) {
  nextProv = `${prov.slice(0, bi)}${section}${prov.slice(ei + endMarker.length)}`;
} else {
  nextProv = `${prov.replace(/\s+$/, '')}\n\n${section}\n`;
}
writeFileSync(provPath, nextProv);
summary.push('provenance: Phase 5 section regenerated');

console.log('build:assets complete (Phase 5 scope):');
for (const line of summary) console.log(`  - ${line}`);
console.log(`  counts: GLSL ${counts.glslEffects}, transitions ${counts.transitions}, LUTs ${counts.luts}, stickers ${counts.stickers}, fonts ${counts.fonts}, text presets ${counts.textPresets}, caption presets ${counts.captionPresets}, templates ${counts.templates}, loops ${counts.loops}, SFX ${counts.sfx}, backgrounds ${counts.backgrounds}`);
