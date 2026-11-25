// Vidora: extract the AI library media zips at build time (GitHub Pages).
// The media binaries live in the repo as .zip files under public/ai-library/;
// the Pages build extracts them into public/ai-library/<folder>/ before Vite
// copies public/ into dist/. Local dev already has the extracted files, so
// this is a no-op there. Never fails the build: any problem only warns.
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const lib = join(root, 'public', 'ai-library');

const bundles = [
  ['music-1.zip', 'music', 'ai-track-001.mp3'],
  ['music-2.zip', 'music', 'ai-track-026.mp3'],
  ['music-3.zip', 'music', 'ai-track-051.mp3'],
  ['music-4.zip', 'music', 'ai-track-076.mp3'],
  ['clips-1.zip', 'clips', 'ai-clip-001.mp4'],
  ['clips-2.zip', 'clips', 'ai-clip-051.mp4'],
  ['images.zip', 'images', 'frames/ai-frame-01.png'],
  ['sfx.zip', 'sfx', 'ai-sfx-001.mp3'],
];

for (const [zipName, dir, probe] of bundles) {
  const zipPath = join(lib, zipName);
  const probePath = join(lib, dir, probe);
  if (existsSync(probePath)) continue;
  if (!existsSync(zipPath)) {
    console.warn(`[vidora] ${zipName} not found, skipping ${dir}`);
    continue;
  }
  try {
    execSync(`unzip -o -q ${JSON.stringify(zipPath)} -d ${JSON.stringify(join(lib, dir))}`, { stdio: 'ignore' });
    rmSync(zipPath, { force: true });
    console.log(`[vidora] extracted ${zipName} -> ${dir}/`);
  } catch (err) {
    console.warn(`[vidora] could not extract ${zipName}: ${err.message}`);
  }
}
