import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDossier } from './vendor/makefun-threejs.ts';

const ENTRY_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const ENTRY_DIRECTORIES = ['game', 'screenshots'] as const;

const DOSSIER_CAPS = {
  text_max_bytes: 163_840,
  screenshots: {
    max: 4,
    max_bytes: 262_144,
  },
  game_max_files: 993,
  game_max_bytes: 50_331_648,
} as const;

function assertDirectory(directoryPath: string, label: string): void {
  if (!existsSync(directoryPath) || !statSync(directoryPath).isDirectory()) {
    throw new Error(`Required ${label} directory is missing: ${directoryPath}`);
  }
}

function assertEntryFiles(): void {
  const gameRoot = join(ENTRY_ROOT, 'game');
  assertDirectory(gameRoot, 'game');
  assertDirectory(join(ENTRY_ROOT, 'screenshots'), 'screenshots');

  const requiredPaths = [
    join(gameRoot, 'index.html'),
    join(gameRoot, 'src', 'main.js'),
  ];
  const sourceDirectory = join(gameRoot, 'src');
  assertDirectory(sourceDirectory, 'game/src');
  for (const entryName of readdirSync(sourceDirectory, { withFileTypes: true })) {
    if (entryName.isFile()) requiredPaths.push(join(sourceDirectory, entryName.name));
  }

  for (const filePath of requiredPaths) {
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      throw new Error(`Required entry file is missing: ${filePath}`);
    }
  }
}

function buildEntry(): void {
  assertEntryFiles();
  mkdirSync(OUTPUT_ROOT, { recursive: true });

  for (const directoryName of ENTRY_DIRECTORIES) {
    cpSync(join(ENTRY_ROOT, directoryName), join(OUTPUT_ROOT, directoryName), {
      recursive: true,
    });
  }

  const dossier = buildDossier(OUTPUT_ROOT, DOSSIER_CAPS);
  writeFileSync(join(OUTPUT_ROOT, 'dossier.json'), dossier);
}

buildEntry();
