# Story 6-1: Define Enhanced Provider Types

**As a** developer working on the johnny-bmad multi-provider system,
**I want** a well-defined TypeScript interface system for all LLM providers (CLI and API),
**So that** the system can support Claude CLI, OpenAI Codex CLI, Kimi CLI, and API providers (OpenAI, GLM, custom) with type safety.

## Context

The current `ClaudeOptions.model` type is restricted to `'opus' | 'sonnet'`, which blocks the addition of new models like haiku, OpenAI models, GLM models, Kimi models, and custom providers.

This story establishes the type foundation for the entire multi-provider system.

## Requirements

- Add new types: `ProviderType`, `Model`, `LLMProvider`, `InvokeOptions`, `LLMResult`, `ModelConfig`, `ProviderConfig`, `CustomProviderConfig`
- Update `ClaudeOptions` to accept any string model value (not restricted union)
- Add provider-specific types for both CLI and API providers
- Ensure backward compatibility with existing code

## Acceptance Criteria

**Given** the existing `src/types.ts` file with `ClaudeOptions` interface:

**When** I add enhanced provider types:

**Then** `ClaudeOptions.model` is changed from `'opus' | 'sonnet'` to `string`:

**And** new `ProviderType` type is defined as `'cli' | 'api'`:

**And** new `Model` interface is defined with fields:
  - `id: string`
  - `name: string`
  - `providerId: string`
  - `providerType: ProviderType`
  - `description?: string`
  - `contextWindow?: number`
  - `supportsTools?: boolean`
  - `pricePer1kTokens?: { input: number; output: number }`

**And** new `LLMProvider` interface is defined with methods:
  - `id: string`
  - `name: string`
  - `type: ProviderType`
  - `checkAvailable(): Promise<boolean>`
  - `listModels(): Promise<Model[]>`
  - `invoke(options: InvokeOptions): Promise<LLMResult>`
  - `needsApiKey(): boolean`
  - `supportsTools(model: string): boolean`
  - `configure?(apiKey: string, baseUrl?: string): Promise<void>`

**And** new `InvokeOptions` interface is defined:
  - `model: string`
  - `prompt: string`
  - `cwd?: string`
  - `allowedTools?: string[]`
  - `agentRole?: string`
  - `apiKey?: string`
  - `baseUrl?: string`
  - `maxRetries?: number`

**And** new `LLMResult` interface is defined:
  - `durationMs: number`
  - `output?: string`
  - `retries?: number`

**And** new `ModelConfig` interface is defined:
  - `sm: string`
  - `storyCreator: string`
  - `dev: string`
  - `reviewer: string`
  - `version: number`

**And** new `ProviderConfig` interface is defined:
  - `apiKeys: Record<string, string>`
  - `customProviders: Record<string, CustomProviderConfig>`
  - `version: number`

**And** new `CustomProviderConfig` interface is defined:
  - `name: string`
  - `baseUrl: string`
  - `models: Array<{ id: string; name: string; supportsTools?: boolean }>`

**And** TypeScript compilation passes with no errors:

**And** existing `ClaudeResult` interface is preserved:

**Given** TypeScript compiles successfully:

**When** I build the project:

**Then** there are no TypeScript compilation errors:

**And** the new types are exported for use by other modules:

## Out of Scope

- Migration of existing state (covered in Epic 1)
- Migration of existing model configuration (no prior model config exists)
