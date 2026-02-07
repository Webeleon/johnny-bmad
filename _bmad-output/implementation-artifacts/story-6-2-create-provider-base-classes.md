# Story 6-2: Create Provider Base Classes

**As a** developer working on johnny-bmad multi-provider system,
**I want** a clean abstraction for CLI-based and API-based LLM providers,
**So that** all providers share common invoke/retry logic while allowing provider-specific implementations.

## Context

Currently, each agent (SM, Story Creator, Dev, Reviewer) has its own implementation for invoking models:
- CLI providers use `spawn()` directly
- API providers need HTTP fetch calls
- Each has different retry logic (inconsistent)
- No unified interface for model discovery
- No abstraction for adding custom providers

This creates technical debt and makes adding new providers difficult.

## Requirements

- Create `src/providers/` directory for provider system
- Define `CliProvider` abstract base class for CLI-based providers
- Define `ApiProvider` abstract base class for API-based providers
- Both classes share common retry logic (MAX_RETRIES=3, exponential backoff: 2s, 4s, 8s)
- CLI provider uses `spawn()` with proper error handling
- API provider uses `fetch()` with timeout and error handling
- Implement provider-specific methods: `checkAvailable()`, `listModels()`, `invoke()`
- API providers support `configure()` for API key injection

## Acceptance Criteria

**Given** the `src/providers/cli-provider.ts` file is created:

**When** I define the `CliProvider` abstract class:

**Then** it has an abstract `cliCommand` property (string):

**And** it has an abstract `modelFlag` property (string):

**And** it has an abstract `promptFlag` property (string):

**And** it has an optional abstract `toolsFlag` property (string):

**And** it implements the `LLMProvider` interface:

**And** the `type` property is set to `'cli'`:

**And** it has a `checkAvailable()` method that spawns the CLI with `--version` flag:

**And** it has a `listModels()` method that returns an array of `Model` objects:

**And** it has an `invoke()` method that:
  - Accepts `InvokeOptions` with model, prompt, cwd, allowedTools, agentRole
  - Implements retry logic with MAX_RETRIES=3 and delays [2000ms, 4000ms, 8000ms]
  - Spawns CLI process using `spawn()` from child_process
  - Streams stdout/stderr to terminal
  - Captures output for reviewer agent
  - Returns `LLMResult` with durationMs and optional output
  - Re-throws errors from spawn failures

**And** it has a `supportsTools()` method that returns `true`:

**And** it has a `needsApiKey()` method that returns `false`:

**Given** the `src/providers/api-provider.ts` file is created:

**When** I define the `ApiProvider` abstract class:

**Then** it has an abstract `baseUrl` property (string):

**And** it has a `apiKey` property that defaults to `null`:

**And** it has an abstract `models` property (Model[]):

**And** it implements the `LLMProvider` interface:

**And** the `type` property is set to `'api'`:

**And** it has a `checkAvailable()` method that makes HTTP GET to `${baseUrl}/models`:

**And** it has a `listModels()` method that returns models with providerId set:

**And** it has an `invoke()` method that:
  - Accepts `InvokeOptions` with model, prompt, cwd, allowedTools, agentRole, apiKey, baseUrl
  - Implements retry logic with MAX_RETRIES=3 and delays [1000ms, 2000ms, 4000ms]
  - Makes HTTP POST to `${baseUrl}/chat/completions` with Authorization header
  - Constructs request body with model, messages, and optional tools array
  - Handles tool formatting via `formatTools()` method
  - Sets 30s timeout via AbortSignal
  - Returns `LLMResult` with durationMs and output

**And** it has a `supportsTools()` method that checks model supportsTools flag:

**And** it has a `formatTools()` method that maps tool names to OpenAI-compatible format:

**And** it has a `needsApiKey()` method that returns `true`:

**And** it has a `configure()` method that accepts `apiKey` and optional `baseUrl`:

**Given** both base classes are implemented:

**When** I build the project:

**Then** there are no TypeScript compilation errors:

**And** the retry logic is consistent across both providers:

**And** CLI and API providers have a unified interface:

## Out of Scope

- Implementation of specific providers (Claude, Codex, Kimi, OpenAI, GLM, Custom)
- Registry system implementation
- Model caching implementation
- Provider configuration implementation

## Technical Notes

- CLI providers use Node.js child_process.spawn() for cross-platform compatibility
- API providers use node-fetch library (need to add to package.json)
- Retry delays: CLI=2s/4s/8s, API=1s/2s/4s (shorter for faster UX)
- Error messages include retry attempt numbers for transparency
- Both base classes support optional `maxRetries` override in InvokeOptions
