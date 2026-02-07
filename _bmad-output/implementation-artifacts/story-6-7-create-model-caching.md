# Story 6-7: Create Model Caching

**As a** developer working on johnny-bmad multi-provider system,
**I want** a caching layer for discovered models to speed up startup time,
**So that** the system doesn't need to query every provider on every run.

## Context

Provider discovery and model listing can be slow operations (HTTP requests to API endpoints, spawning CLIs). Caching these results improves UX significantly. Cache should have TTL for automatic refresh.

## Requirements

- Create `src/providers/cache.ts` module for model caching
- Implement `loadCachedModels(cwd: string)` function to read cache file
- Implement `saveCachedModels(cwd: string, models: any[])` function to write cache
- Implement `isCacheExpired(cwd: string)` function to check cache age
- Implement `clearCache(cwd: string)` function for manual cache clearing
- Cache TTL set to 1 hour (60 * 60 * 1000ms)
- Cache version tracking for format changes
- Cache file path: `.johnny-bmad-models-cache.json`

## Acceptance Criteria

**Given** I create `src/providers/cache.ts`:

**Then** it exports a `CachedModels` interface with fields:
  - `models: Model[]`
  - `cachedAt: string` (ISO 8601 timestamp)
  - `version: number`

**And** it implements `loadCachedModels(cwd: string)` function:

**And** the function constructs cache file path as `join(cwd, '.johnny-bmad-models-cache.json')`:

**And** if file does not exist, it returns `null`:

**And** if file exists, it reads content with `readFileSync(path, 'utf-8')`:

**And** it parses JSON as `JSON.parse(content)`:

**And** it checks if cache is expired:
  - Calculates age as `Date.now() - new Date(cache.cachedAt).getTime()`
  - Returns `null` if age > CACHE_TTL_MS (1 hour)

**And** it checks cache version:
  - Returns `null` if `cache.version !== CACHE_VERSION`

**And** it returns `null` if file doesn't exist, is expired, or version mismatch:

**And** it returns cached models object if valid:

**Given** I create `src/providers/cache.ts`:

**Then** it implements `saveCachedModels(cwd: string, models: any[])` function:

**And** the function constructs cache file path:

**And** it writes cache with `writeFileSync(path, JSON.stringify(cache, null, 2))`:

**And** the cache object includes:
  - `models` array from parameter
  - `cachedAt: new Date().toISOString()`
  - `version: CACHE_VERSION`

**Given** I create `src/providers/cache.ts`:

**Then** it implements `isCacheExpired(cwd: string)` function:

**And** the function calls `loadCachedModels(cwd)`:

**And** it returns `true` if `loadCachedModels()` returns `null`:

**And** it returns `false` if `loadCachedModels()` returns a valid cache object:

**Given** I create `src/providers/cache.ts`:

**Then** it implements `clearCache(cwd: string)` function:

**And** the function constructs cache file path:

**And** if cache file exists, it deletes it with `unlinkSync(path)`:

**When** I build the project:

**Then** there are no TypeScript compilation errors:

**And** the cache constants are defined:
  - `CACHE_FILE = '.johnny-bmad-models-cache.json'`
  - `CACHE_TTL_MS = 60 * 60 * 1000`
  - `CACHE_VERSION = 1`

## Technical Notes

- Cache is per-project (stored alongside `.johnny-bmad/models.json`)
- Cache format is JSON for easy parsing
- Timestamp uses ISO 8601 format
- Age calculation uses Date.now() for accuracy
- One-hour TTL provides good balance between speed and freshness
- Cache is automatically refreshed by provider registry when expired

## Integration Points

- Used by: ProviderRegistry.getAllModels() to get cached models
- Used by: ProviderRegistry.getAllModels() to save cached models
- Used by: Orchestrator `--refresh-models` flag to force cache clear

## Out of Scope

- Cache invalidation on provider configuration changes (deferred)
- Distributed caching (local, shared cache server)
