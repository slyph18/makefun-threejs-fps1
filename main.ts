// Build the make.fun entry: copy the playable game and screenshots to the output
// directory, then write the dossier required by the grader.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDossier } from './vendor/makefun-threejs.ts';

const entryDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163_840,
  screenshots: {
    max: 4,
    max_bytes: 262_144,
  },
  game_max_files: 993,
  game_max_bytes: 50_331_648,
} as const;

function copyEntryDirectory(name: string): void {
  const source = join(entryDirectory, name);

  if (!existsSync(source)) {
    throw new Error(`Required entry directory is missing: ${name}`);
  }

  cpSync(source, join(outputDirectory, name), { recursive: true });
}

function buildEntry(): void {
  mkdirSync(outputDirectory, { recursive: true });
  copyEntryDirectory('game');
  copyEntryDirectory('screenshots');

  const dossier = buildDossier(outputDirectory, DOSSIER_CAPS);
  writeFileSync(join(outputDirectory, 'dossier.json'), dossier);
}

buildEntry();
