import Phaser from 'phaser';
import {
  getTextureKeyForMapId,
  resolveRuntimeMapGridSidecarCandidatesById,
  resolveRuntimeMapImageCandidatesById,
} from './MapAssetResolver';
import {
  parseRuntimeMapGridSidecarPayload,
  type RuntimeMapGridSidecar,
} from './RuntimeMapSidecar';

export async function loadRuntimeMapGridSidecar(options: {
  mapId: string;
  revision: number;
  gridWidth: number;
  gridHeight: number;
}): Promise<RuntimeMapGridSidecar | null> {
  const { mapId, revision, gridWidth, gridHeight } = options;
  const normalizedMapId = mapId.trim();
  if (normalizedMapId.length === 0) {
    return null;
  }

  const candidateUrls = resolveRuntimeMapGridSidecarCandidatesById(normalizedMapId);
  if (candidateUrls.length === 0) {
    return null;
  }

  const cacheBustSuffix = `rev=${encodeURIComponent(String(revision))}&t=${Date.now()}`;
  for (const candidateUrl of candidateUrls) {
    const requestUrl = `${candidateUrl}${candidateUrl.includes('?') ? '&' : '?'}${cacheBustSuffix}`;
    try {
      const response = await fetch(requestUrl, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as unknown;
      const sidecar = parseRuntimeMapGridSidecarPayload(payload, {
        gridWidth,
        gridHeight,
      });
      if (!sidecar) {
        continue;
      }
      return sidecar;
    } catch {
      continue;
    }
  }

  return null;
}

export function reloadMapTextureFromCandidates(options: {
  scene: Phaser.Scene;
  mapId: string;
  revision: number;
  onTextureReady: (textureKey: string) => void;
}): void {
  const { scene, mapId, revision, onTextureReady } = options;
  const imagePathCandidates = resolveRuntimeMapImageCandidatesById(mapId);
  if (imagePathCandidates.length === 0) {
    return;
  }

  const textureKey = getTextureKeyForMapId(mapId);
  const attemptedPaths: string[] = [];

  const tryLoadFromCandidate = (candidateIndex: number): void => {
    if (candidateIndex >= imagePathCandidates.length) {
      console.error(
        `Failed to load map texture "${mapId}" from all candidates: ${attemptedPaths.join(', ')}`,
      );
      return;
    }

    const imagePath = imagePathCandidates[candidateIndex];
    const pendingTextureKey = `${textureKey}--pending-${revision}-${candidateIndex}`;
    const cacheBustedPath = `${imagePath}${imagePath.includes('?') ? '&' : '?'}rev=${revision}&t=${Date.now()}`;
    attemptedPaths.push(cacheBustedPath);
    if (scene.textures.exists(pendingTextureKey)) {
      scene.textures.remove(pendingTextureKey);
    }

    const onLoadError = (file: Phaser.Loader.File): void => {
      if (file.key !== pendingTextureKey) {
        return;
      }
      scene.load.off('loaderror', onLoadError);
      if (scene.textures.exists(pendingTextureKey)) {
        scene.textures.remove(pendingTextureKey);
      }
      if (candidateIndex + 1 < imagePathCandidates.length) {
        console.warn(
          `Failed map texture candidate for "${mapId}": ${cacheBustedPath}. Retrying...`,
        );
        tryLoadFromCandidate(candidateIndex + 1);
        return;
      }
      console.error(`Failed to load map texture "${mapId}" from ${cacheBustedPath}.`);
    };
    scene.load.on('loaderror', onLoadError);

    scene.load.once(`filecomplete-image-${pendingTextureKey}`, () => {
      scene.load.off('loaderror', onLoadError);
      if (!scene.textures.exists(pendingTextureKey)) {
        return;
      }
      if (scene.textures.exists(textureKey)) {
        scene.textures.remove(textureKey);
      }
      const renamed = scene.textures.renameTexture(pendingTextureKey, textureKey);
      onTextureReady(renamed ? textureKey : pendingTextureKey);
    });
    scene.load.image(pendingTextureKey, cacheBustedPath);
    if (!scene.load.isLoading()) {
      scene.load.start();
    }
  };

  tryLoadFromCandidate(0);
}
