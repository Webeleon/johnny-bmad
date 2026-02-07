import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import type { Model } from '../types.js';

export const CACHE_FILE = '.johnny-bmad-models-cache.json';
export const CACHE_TTL_MS = 60 * 60 * 1000;
export const CACHE_VERSION = 1;

export interface CachedModels {
  models: Model[];
  cachedAt: string;
  version: number;
}

export function loadCachedModels(cwd: string): CachedModels | null {
  const cachePath = join(cwd, CACHE_FILE);

  if (!existsSync(cachePath)) {
    return null;
  }

  try {
    const content = readFileSync(cachePath, 'utf-8');
    const cache = JSON.parse(content) as CachedModels;

    const timestamp = new Date(cache.cachedAt).getTime();
    if (isNaN(timestamp)) {
      return null;
    }

    const age = Date.now() - timestamp;
    if (age > CACHE_TTL_MS) {
      return null;
    }

    if (cache.version !== CACHE_VERSION) {
      return null;
    }

    return cache;
  } catch {
    return null;
  }
}

export function saveCachedModels(cwd: string, models: Model[]): void {
  const cachePath = join(cwd, CACHE_FILE);
  const cache: CachedModels = {
    models,
    cachedAt: new Date().toISOString(),
    version: CACHE_VERSION
  };
  writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

export function isCacheExpired(cwd: string): boolean {
  const cache = loadCachedModels(cwd);
  return cache === null;
}

export function clearCache(cwd: string): void {
  const cachePath = join(cwd, CACHE_FILE);
  if (existsSync(cachePath)) {
    try {
      unlinkSync(cachePath);
    } catch {
    }
  }
}
