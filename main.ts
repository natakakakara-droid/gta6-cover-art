// Vice Cover Studio — hand-in program for the gta6-cover-art-01 bounty.
// Node 22, standard library only. Copies app/ and screenshots/ from beside
// this file to the output directory (MAKEFUN_OUTPUT_DIR, or /output in the
// grader) and writes /output/dossier.json with buildDossier from the
// vendored make.fun library.
//
// My own checks, on top of what buildDossier enforces:
//   - every screenshot must exist and be at most 256 KiB (the gate cap);
//   - app/index.html must exist;
//   - the run is deterministic: the same inputs always write the same bytes
//     (buildDossier is a pure function of the copied files, and the copies
//     are plain recursive copies, so two runs agree byte for byte).
//
// Usage outside the grader:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SCREENSHOT_BYTES = 262144;

const indexPath = join(here, 'app', 'index.html');
if (!existsSync(indexPath)) {
  throw new Error('refusing to hand in: app/index.html is missing');
}

const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) {
  throw new Error('refusing to hand in: screenshots/ is missing');
}
for (const name of readdirSync(shotsDir).sort()) {
  if (name.startsWith('.')) continue;
  const file = join(shotsDir, name);
  const size = statSync(file).size;
  if (size > MAX_SCREENSHOT_BYTES) {
    throw new Error(`refusing to hand in: screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
