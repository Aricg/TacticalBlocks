#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_INPUT = path.resolve(
  process.cwd(),
  'b94a7e47-8778-43d3-a3fa-d26f831233f6.jpeg',
);
const DEFAULT_OUTPUT = path.resolve(
  process.cwd(),
  'b94a7e47-8778-43d3-a3fa-d26f831233f6-16c.png',
);
const DEFAULT_COLORS = 16;

function printUsage() {
  console.log(
    'Usage: node ./scripts/convert-map-16.mjs [inputPath] [outputPath] [colors]',
  );
  console.log(`Defaults: input=${DEFAULT_INPUT}`);
  console.log(`          output=${DEFAULT_OUTPUT}`);
  console.log(`          colors=${DEFAULT_COLORS}`);
}

const [, , inputArg, outputArg, colorsArg] = process.argv;

if (inputArg === '--help' || inputArg === '-h') {
  printUsage();
  process.exit(0);
}

const inputPath = path.resolve(process.cwd(), inputArg ?? DEFAULT_INPUT);
const outputPath = path.resolve(process.cwd(), outputArg ?? DEFAULT_OUTPUT);
const colors = Number.parseInt(colorsArg ?? `${DEFAULT_COLORS}`, 10);

if (!Number.isInteger(colors) || colors <= 1) {
  console.error(
    `Invalid color count "${colorsArg ?? DEFAULT_COLORS}". Use an integer >= 2.`,
  );
  process.exit(1);
}

try {
  accessSync(inputPath, constants.R_OK);
} catch {
  console.error(`Input file not found or unreadable: ${inputPath}`);
  process.exit(1);
}

const command = spawnSync(
  'magick',
  [
    inputPath,
    '-dither',
    'None',
    '-colors',
    `${colors}`,
    '-type',
    'Palette',
    outputPath,
  ],
  { stdio: 'pipe', encoding: 'utf8' },
);

if (command.error) {
  if (command.error.code === 'ENOENT') {
    console.error(
      'ImageMagick is required. Install it and ensure "magick" is in PATH.',
    );
  } else {
    console.error(`Failed to run ImageMagick: ${command.error.message}`);
  }
  process.exit(1);
}

if (command.status !== 0) {
  if (command.stderr) {
    process.stderr.write(command.stderr);
  }
  process.exit(command.status ?? 1);
}

const colorCountCheck = spawnSync(
  'magick',
  [outputPath, '-format', '%k', 'info:'],
  { stdio: 'pipe', encoding: 'utf8' },
);

if (colorCountCheck.status !== 0) {
  if (colorCountCheck.stderr) {
    process.stderr.write(colorCountCheck.stderr);
  }
  process.exit(colorCountCheck.status ?? 1);
}

const outputColorCount = colorCountCheck.stdout.trim();
console.log(`Created: ${outputPath}`);
console.log(`Unique colors: ${outputColorCount}`);
