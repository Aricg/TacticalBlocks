import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { HILL_GRADE_NONE } from '../../terrain-semantics.mjs';
import { SHARED_DIR } from '../cli-options.mjs';

function colorIntToRgb(color) {
  return {
    red: (color >> 16) & 0xff,
    green: (color >> 8) & 0xff,
    blue: color & 0xff,
  };
}

function toPpm(width, height, pixels) {
  const lines = [`P3`, `${width} ${height}`, `255`];
  for (let i = 0; i < pixels.length; i += 1) {
    const rgb = colorIntToRgb(pixels[i]);
    lines.push(`${rgb.red} ${rgb.green} ${rgb.blue}`);
  }
  return `${lines.join('\n')}\n`;
}

function runMagick(args) {
  const result = spawnSync('magick', args, { stdio: 'pipe', encoding: 'utf8' });
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error('ImageMagick is required. Install it and ensure "magick" is in PATH.');
    } else {
      console.error(`Failed to run ImageMagick: ${result.error.message}`);
    }
    process.exit(1);
  }
  if (result.status !== 0) {
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }
}

export function runSyncMaps(outputDir) {
  const result = spawnSync(process.execPath, ['./scripts/sync-maps.mjs', outputDir], {
    cwd: SHARED_DIR,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function buildAtomicTempPath(targetPath) {
  const randomSuffix = Math.floor(Math.random() * 1e9).toString(36);
  const directory = path.dirname(targetPath);
  const extension = path.extname(targetPath);
  const fileStem = path.basename(targetPath, extension);
  return path.join(
    directory,
    `${fileStem}.tmp-${process.pid}-${Date.now()}-${randomSuffix}${extension}`,
  );
}

function assertNonEmptyFile(filePath, label) {
  let stats;
  try {
    stats = statSync(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to validate ${label}: ${message}`);
    process.exit(1);
  }
  if (!stats.isFile() || stats.size <= 0) {
    console.error(`Invalid ${label}: expected non-empty file (${filePath}).`);
    process.exit(1);
  }
}

function assertPngSignature(filePath, label) {
  let fileBytes;
  try {
    fileBytes = readFileSync(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to validate ${label} PNG signature: ${message}`);
    process.exit(1);
  }

  if (fileBytes.length < 8) {
    console.error(`Invalid ${label}: file is too short to be a PNG (${filePath}).`);
    process.exit(1);
  }

  // PNG signature bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    fileBytes[0] === 0x89 &&
    fileBytes[1] === 0x50 &&
    fileBytes[2] === 0x4e &&
    fileBytes[3] === 0x47 &&
    fileBytes[4] === 0x0d &&
    fileBytes[5] === 0x0a &&
    fileBytes[6] === 0x1a &&
    fileBytes[7] === 0x0a;
  if (!isPng) {
    console.error(`Invalid ${label}: expected PNG signature (${filePath}).`);
    process.exit(1);
  }
}

function validateElevationGridSidecar(
  sidecarPath,
  {
    mapId,
    gridWidth,
    gridHeight,
  },
) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(sidecarPath, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Invalid elevation sidecar JSON at ${sidecarPath}: ${message}`);
    process.exit(1);
  }

  const expectedCellCount = gridWidth * gridHeight;
  if (parsed.mapId !== mapId) {
    console.error(
      `Invalid elevation sidecar mapId at ${sidecarPath}: expected ${mapId}, received ${parsed.mapId}.`,
    );
    process.exit(1);
  }
  if (parsed.gridWidth !== gridWidth || parsed.gridHeight !== gridHeight) {
    console.error(
      `Invalid elevation sidecar dimensions at ${sidecarPath}: expected ${gridWidth}x${gridHeight}.`,
    );
    process.exit(1);
  }
  if (
    !Array.isArray(parsed.hillGradeGrid) ||
    parsed.hillGradeGrid.length !== expectedCellCount
  ) {
    console.error(
      `Invalid elevation sidecar hill grade grid length at ${sidecarPath}.`,
    );
    process.exit(1);
  }
  if (
    typeof parsed.terrainCodeGrid !== 'string' ||
    parsed.terrainCodeGrid.length !== expectedCellCount
  ) {
    console.error(
      `Invalid elevation sidecar terrain code grid length at ${sidecarPath}.`,
    );
    process.exit(1);
  }

  for (let index = 0; index < expectedCellCount; index += 1) {
    const terrainCode = parsed.terrainCodeGrid.charAt(index);
    const hillGrade = parsed.hillGradeGrid[index];
    if (terrainCode === 'h') {
      if (
        typeof hillGrade !== 'number' ||
        !Number.isFinite(hillGrade) ||
        Math.round(hillGrade) < 0
      ) {
        console.error(
          `Invalid elevation sidecar hill grade at index ${index} in ${sidecarPath}.`,
        );
        process.exit(1);
      }
      continue;
    }

    if (
      typeof hillGrade !== 'number' ||
      !Number.isFinite(hillGrade) ||
      Math.round(hillGrade) !== HILL_GRADE_NONE
    ) {
      console.error(
        `Invalid elevation sidecar non-hill grade marker at index ${index} in ${sidecarPath}.`,
      );
      process.exit(1);
    }
  }
}

export function writeGeneratedMapArtifacts(args) {
  const sourcePath = path.join(args.outputDir, `${args.mapId}.png`);
  const quantizedPath = path.join(args.outputDir, `${args.mapId}-16c.png`);
  const elevationGridPath = path.join(
    args.outputDir,
    `${args.mapId}${args.elevationGridSuffix}`,
  );

  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'tb-random-map-'));
  const ppmPath = path.join(tempDir, `${args.mapId}.ppm`);
  const sourceTempPath = buildAtomicTempPath(sourcePath);
  const quantizedTempPath = buildAtomicTempPath(quantizedPath);
  const elevationGridTempPath = buildAtomicTempPath(elevationGridPath);

  try {
    writeFileSync(
      ppmPath,
      toPpm(args.gridWidth, args.gridHeight, args.pixels),
      'utf8',
    );
    runMagick([
      ppmPath,
      '-filter',
      'point',
      '-resize',
      `${args.outputWidth}x${args.outputHeight}!`,
      `png:${sourceTempPath}`,
    ]);
    runMagick([
      sourceTempPath,
      '-dither',
      'None',
      '-colors',
      '16',
      '-type',
      'Palette',
      `png:${quantizedTempPath}`,
    ]);
    writeFileSync(
      elevationGridTempPath,
      `${JSON.stringify(args.elevationSidecar)}\n`,
      'utf8',
    );
    assertNonEmptyFile(sourceTempPath, 'source map image');
    assertNonEmptyFile(quantizedTempPath, 'quantized map image');
    assertPngSignature(sourceTempPath, 'source map image');
    assertPngSignature(quantizedTempPath, 'quantized map image');
    validateElevationGridSidecar(elevationGridTempPath, {
      mapId: args.mapId,
      gridWidth: args.gridWidth,
      gridHeight: args.gridHeight,
    });

    renameSync(sourceTempPath, sourcePath);
    renameSync(quantizedTempPath, quantizedPath);
    renameSync(elevationGridTempPath, elevationGridPath);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
    rmSync(sourceTempPath, { force: true });
    rmSync(quantizedTempPath, { force: true });
    rmSync(elevationGridTempPath, { force: true });
  }

  return {
    sourcePath,
    quantizedPath,
    elevationGridPath,
  };
}
