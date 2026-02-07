# Story 6-3: Implement CLI Providers

**As a** developer working on johnny-bmad multi-provider system,
**I want** CLI provider implementations for Claude, OpenAI Codex, and Kimi,
**So that** the system can detect, list models, and invoke these CLI-based tools.

## Context

CLI providers require different detection methods and command-line flags compared to API providers. This story implements the three known CLI providers that users may have installed.

## Requirements

- Create `src/providers/providers/claude.ts` provider for Claude Code CLI
- Create `src/providers/providers/codex.ts` provider for OpenAI Codex CLI
- Create `src/providers/providers/kimi.ts` provider for Kimi CLI
- Each provider implements `CliProvider` base class
- Each provider defines its `cliCommand`, `modelFlag`, `promptFlag`, and `toolsFlag`
- Each provider implements `checkAvailable()` by spawning CLI with `--version` flag
- Each provider implements `listModels()` returning array of known models
- Models include metadata: id, name, description, contextWindow, supportsTools

## Acceptance Criteria

**Given** the provider system base classes are implemented:

**When** I create `src/providers/providers/claude.ts`:

**Then** it exports a `ClaudeProvider` class that extends `CliProvider`:

**And** the class has `id = 'claude'`:

**And** the class has `name = 'Claude (CLI)'`:

**And** the class has `cliCommand = 'claude'`:

**And** the class has `modelFlag = '--model'`:

**And** the class has `promptFlag = '-p'`:

**And** the class has `toolsFlag = '--allowedTools'`:

**And** the `checkAvailable()` method spawns `claude --version` and resolves to true if code 0:

**And** the `listModels()` method returns array of 3 models:
  - `{ id: 'opus', name: 'Claude Opus', providerId: 'claude', providerType: 'cli', description: 'Most capable, best for planning/review', contextWindow: 200000, supportsTools: true }`
  - `{ id: 'sonnet', name: 'Claude Sonnet', providerId: 'claude', providerType: 'cli', description: 'Balanced performance, good for coding', contextWindow: 200000, supportsTools: true }`
  - `{ id: 'haiku', name: 'Claude Haiku', providerId: 'claude', providerType: 'cli', description: 'Fastest, great for quick tasks', contextWindow: 200000, supportsTools: true }`

**Given** I create `src/providers/providers/codex.ts`:

**Then** it exports a `CodexProvider` class that extends `CliProvider`:

**And** the class has `id = 'codex'`:

**And** the class has `name = 'OpenAI Codex (CLI)'`:

**And** the class has `cliCommand = 'codex'`:

**And** the class has `modelFlag = '--model'` (verify actual Codex CLI flag):

**And** the class has `promptFlag = '-p'` (verify actual Codex CLI prompt flag):

**And** the `checkAvailable()` method spawns `codex --version` and resolves to true if code 0:

**And** the `listModels()` method returns array of available Codex CLI models (e.g., gpt-5.3-codex):

**And** models include metadata: id, name, description, contextWindow, supportsTools

**Given** I create `src/providers/providers/kimi.ts`:

**Then** it exports a `KimiProvider` class that extends `CliProvider`:

**And** the class has `id = 'kimi'`:

**And** the class has `name = 'Kimi (CLI)'`:

**And** the class has `cliCommand = 'kimi'` (verify actual Kimi CLI command):

**And** the class has `modelFlag = '--model'` (verify actual Kimi CLI flag):

**And** the class has `promptFlag = '-p'` (verify actual Kimi CLI prompt flag):

**And** the `checkAvailable()` method spawns `kimi --version` and resolves to true if code 0:

**And** the `listModels()` method returns array of 3 Kimi models:
  - `{ id: 'moonshot-v1-8k', name: 'Kimi 8K', providerId: 'kimi', providerType: 'cli', description: '8K context window', contextWindow: 8192, supportsTools: true }`
  - `{ id: 'moonshot-v1-32k', name: 'Kimi 32K', providerId: 'kimi', providerType: 'cli', description: '32K context window', contextWindow: 32768, supportsTools: true }`
  - `{ id: 'moonshot-v1-128k', name: 'Kimi 128K', providerId: 'kimi', providerType: 'cli', description: '128K context window', contextWindow: 128000, supportsTools: true }`

**Given** all CLI providers are implemented:

**When** I build the project:

**Then** there are no TypeScript compilation errors:

**And** each CLI provider properly extends `CliProvider`:

**And** each CLI provider can be detected by running its `--version` command:

**And** each CLI provider can list its available models:

## Technical Notes

- CLI flags for Codex and Kimi need to be verified - may differ from Claude Code CLI
- All CLI providers support tool calling (no need to check supportsTools flag)
- CLI providers have no `needsApiKey()` (they use installed binaries)

## Out of Scope

- GLM CLI (does not exist as official tool)
- Custom CLI providers (use custom API provider instead)

## Dependencies

- No new dependencies (uses Node.js child_process.spawn from existing)
