import assert from 'node:assert/strict';
import {
  GRID_SIZE_PROFILE_PRESETS,
  createGridGeometry,
  resolveGridSizeProfileName,
} from './gridGeometry.js';

function runDefaultsToLargeProfileTest(): void {
  assert.equal(resolveGridSizeProfileName(), 'large');
  assert.equal(
    resolveGridSizeProfileName({
      defaultProfile: 'small',
    }),
    'small',
  );
}

function runResolvesConfiguredProfileTest(): void {
  assert.equal(
    resolveGridSizeProfileName({
      importMetaEnv: {
        VITE_GRID_SIZE_PROFILE: ' LARGE ',
      },
    }),
    'large',
  );
  assert.equal(
    resolveGridSizeProfileName({
      processEnv: {
        GRID_SIZE_PROFILE: 'small',
      },
    }),
    'small',
  );
}

function runImportMetaPrecedenceTest(): void {
  assert.equal(
    resolveGridSizeProfileName({
      importMetaEnv: {
        GRID_SIZE_PROFILE: 'large',
      },
      processEnv: {
        VITE_GRID_SIZE_PROFILE: 'small',
      },
    }),
    'large',
  );
}

function runRejectsInvalidProfileTest(): void {
  assert.throws(
    () =>
      resolveGridSizeProfileName({
        processEnv: {
          GRID_SIZE_PROFILE: 'tiny',
        },
      }),
    /Invalid GRID_SIZE_PROFILE "tiny"/,
  );
}

function runBuildsGridGeometryTest(): void {
  const geometry = createGridGeometry('small', 1920, 1080);
  assert.equal(geometry.profile, 'small');
  assert.equal(geometry.gridWidth, GRID_SIZE_PROFILE_PRESETS.small.gridWidth);
  assert.equal(geometry.gridHeight, GRID_SIZE_PROFILE_PRESETS.small.gridHeight);
  assert.equal(geometry.cellWidth, 1920 / GRID_SIZE_PROFILE_PRESETS.small.gridWidth);
  assert.equal(geometry.cellHeight, 1080 / GRID_SIZE_PROFILE_PRESETS.small.gridHeight);

  const xlGeometry = createGridGeometry('xl', 1920, 1080);
  assert.equal(xlGeometry.gridWidth, 128);
  assert.equal(xlGeometry.gridHeight, 72);
  assert.equal(xlGeometry.cellWidth, 15);
  assert.equal(xlGeometry.cellHeight, 15);
}

runDefaultsToLargeProfileTest();
runResolvesConfiguredProfileTest();
runImportMetaPrecedenceTest();
runRejectsInvalidProfileTest();
runBuildsGridGeometryTest();
