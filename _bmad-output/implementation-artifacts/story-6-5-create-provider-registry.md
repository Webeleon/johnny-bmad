# Story 6-5: Create Provider Registry

**As a** developer working on johnny-bmad multi-provider system,
**I want** a centralized registry for discovering, managing, and invoking all LLM providers,
**So that** the system can detect what's available, aggregate models from all providers, and route model invocation requests.

## Context

The provider registry is the central coordinator for the entire multi-provider system. It needs to:
- Register all built-in providers (Claude, Codex, Kimi, OpenAI, GLM, Custom)
- Detect which providers are available (CLI check or API connectivity)
- Aggregate all models from all available providers
- Resolve model IDs to appropriate provider instances
- Invoke providers with unified `invokeModel()` interface

## Requirements

- Create `src/providers/registry.ts` provider registry module
- Registry should instantiate all built-in providers in constructor
- Implement `register()` method to add new providers dynamically
- Implement `getProvider()` method to retrieve provider by ID
- Implement `getAllProviders()` method to get all registered providers
- Implement `getAvailableProviders()` method to filter only available providers
  - Load API keys from config for API providers
  - Call `checkAvailable()` on each provider
  - Return only providers where checkAvailable() returns true
- Implement `getAllModels()` method to aggregate models from all available providers
  - Use cached models if not expired (1-hour TTL)
  - Refresh models from providers if cache expired or forceRefresh requested
- Implement `invokeModel()` method to route model invocation to correct provider
  - Parse model ID (format: `provider:model` or just `model`)
  - Auto-detect provider if not explicitly specified
  - Call provider's `invoke()` method with appropriate options
- Implement `registerCustomProvider()` method for custom providers from config
- Handle errors gracefully and provide actionable messages

## Acceptance Criteria

**Given** I create `src/providers/registry.ts`:

**Then** it exports a `ProviderRegistry` class:

**And** the class has a private `providers` Map (Map<string, LLMProvider>):

**And** the class constructor calls `registerBuiltInProviders()`:

**And** the `registerBuiltInProviders()` method registers:
  - `ClaudeProvider` instance
  - `CodexProvider` instance
  - `KimiProvider` instance
  - `GLMProvider` instance
  - `OpenAIProvider` instance
  - `CustomProvider` instance

**Given** the registry has all providers registered:

**When** I call `registry.getAllProviders()`:

**Then** it returns an array of all 6 providers:

**And** when I call `registry.getProvider('claude')`:

**Then** it returns the `ClaudeProvider` instance:

**And** when I call `registry.getProvider('openai')`:

**Then** it returns the `OpenAIProvider` instance:

**And** when I call `registry.getProvider('custom')`:

**Then** it returns the `CustomProvider` instance:

**Given** available provider detection:

**When** I call `registry.getAvailableProviders(cwd)`:

**Then** it loads provider config from `loadProviderConfig()`:

**And** it calls `checkAvailable()` on each provider:

**And** it returns only providers where `checkAvailable()` resolved to true:

**And** it logs which CLI tools are detected (e.g., "✓ Detected CLI tools: • Claude (CLI)"):

**Given** model aggregation:

**When** I call `registry.getAllModels(cwd)`:

**Then** it checks cache via `isCacheExpired(cwd)`:

**And** if cache is valid (not expired):

**Then** it returns cached models from `loadCachedModels(cwd)`:

**And** if cache is expired or `forceRefresh` is true:

**Then** it calls `getAvailableProviders(cwd)`:

**Then** it calls `listModels()` on each available provider:

**Then** it aggregates all models into a single array:

**And** it saves aggregated models via `saveCachedModels(cwd, allModels)`:

**And** it logs discovery progress: "📦 Discovering available models...", "  ✓ Claude (CLI): 3 models":

**Given** model invocation:

**When** I call `registry.invokeModel('claude:opus', options)`:

**Then** it parses the model ID as `providerId='claude', modelName='opus'`:

**And** it gets the provider via `getProvider('claude')`:

**And** it calls the provider's `invoke()` method with `options.model='opus'`:

**Given** auto-detection (no provider prefix):

**When** I call `registry.invokeModel('opus', options)`:

**Then** it calls `getAllModels()` to find matching model:

**And** it finds model by id or name:

**And** it extracts the `providerId` from the matched model:

**And** it calls `getProvider(providerId)` to get the provider:

**And** it calls `provider.invoke()` with the full model ID:

**Given** custom provider registration:

**When** I call `registry.registerCustomProvider(config, cwd)`:

**Then** it gets the `CustomProvider` instance via `getProvider('custom')`:

**Then** it calls `customProvider.setConfig()` with providerId, name, baseUrl, models, and apiKey:

**When** I build the project:

**Then** there are no TypeScript compilation errors:

## Technical Notes

- Registry is a singleton (single instance exported as `export const registry = new ProviderRegistry()`)
- Model cache is per-project (`.johnny-bmad-models-cache.json`)
- API key config is per-user global (`~/.johnny-bmad/providers.json`)
- Registry coordinates both CLI and API provider discovery

## Dependencies

- Depends on: cache.ts, config.ts, all providers
- Exports `registry` singleton instance

## Out of Scope

- Model validation logic (deferred to individual providers)
- Provider lifecycle management (providers exist for duration of program)

## Integration Points

- Used by: Orchestrator for provider detection
- Used by: Onboarding for model aggregation
- Used by: All agents for model invocation
