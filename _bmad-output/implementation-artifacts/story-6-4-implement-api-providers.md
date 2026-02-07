# Story 6-4: Implement API Providers

**As a** developer working on johnny-bmad multi-provider system,
**I want** API provider implementations for OpenAI, GLM, and custom providers,
**So that** the system can make HTTP requests to LLM endpoints with proper authentication and error handling.

## Context

API providers need HTTP communication, API key management, and retry logic. GLM and OpenAI are API-only (no official CLI), while custom providers allow users to add any OpenAI-compatible endpoint.

## Requirements

- Create `src/providers/providers/openai.ts` provider for OpenAI API
- Create `src/providers/providers/glm.ts` provider for GLM API (Zhipu AI)
- Create `src/providers/providers/custom.ts` provider for generic/custom API endpoints
- Each provider implements `ApiProvider` base class
- Each provider defines its `baseUrl` and `models` array
- Each provider implements `checkAvailable()` via HTTP GET to models endpoint
- Each provider implements `listModels()` returning models with providerId set
- Each provider implements `configure()` for API key injection
- Models include metadata: id, name, description, contextWindow, supportsTools

## Acceptance Criteria

**Given** the API provider base class is implemented:

**When** I create `src/providers/api-provider.ts`:

**Then** it defines an `ApiProvider` abstract class that implements `LLMProvider`:

**And** the class has `type = 'api'`:

**And** the class has an abstract `baseUrl` property:

**And** the class has an `apiKey` property that defaults to `null`:

**And** the class has an abstract `models` property of type `Model[]`:

**And** the class has a `checkAvailable()` method that makes HTTP GET to `${baseUrl}/models`:

**And** the `checkAvailable()` method returns false if apiKey is null:

**And** the `checkAvailable()` method uses 5s timeout and returns false on fetch errors:

**And** the `listModels()` method returns models with `providerId` set to provider ID:

**And** the `listModels()` method sets `supportsTools: true` by default:

**Given** I create `src/providers/providers/openai.ts`:

**Then** it exports an `OpenAIProvider` class that extends `ApiProvider`:

**And** the class has `id = 'openai'`:

**And** the class has `name = 'OpenAI (API)'`:

**And** the class has `baseUrl = 'https://api.openai.com/v1'`:

**And** the `models` property includes 3 models:
  - `{ id: 'gpt-4', name: 'GPT-4', providerId: 'openai', providerType: 'api', description: 'Most capable GPT model', contextWindow: 128000, supportsTools: true }`
  - `{ id: 'gpt-4-turbo', name: 'GPT-4 Turbo', providerId: 'openai', providerType: 'api', description: 'Faster and cheaper GPT-4', contextWindow: 128000, supportsTools: true }`
  - `{ id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', providerId: 'openai', providerType: 'api', description: 'Fast and cost-effective', contextWindow: 16385, supportsTools: true }`

**And** the `supportsTools()` method returns `true`:

**Given** I create `src/providers/providers/glm.ts`:

**Then** it exports a `GLMProvider` class that extends `ApiProvider`:

**And** the class has `id = 'glm'`:

**And** the class has `name = 'GLM (Zhipu AI - API)'`:

**And** the class has `baseUrl = 'https://api.z.ai/api/paas/v4'`:

**And** the `models` property includes 3 models:
  - `{ id: 'glm-4', name: 'GLM-4', providerId: 'glm', providerType: 'api', description: 'Latest GLM model', contextWindow: 128000, supportsTools: true }`
  - `{ id: 'glm-4-plus', name: 'GLM-4 Plus', providerId: 'glm', providerType: 'api', description: 'Enhanced GLM-4', contextWindow: 128000, supportsTools: true }`
  - `{ id: 'glm-4v', name: 'GLM-4V (Vision)', providerId: 'glm', providerType: 'api', description: 'GLM with vision capabilities', contextWindow: 128000, supportsTools: true }`

**Given** I create `src/providers/providers/custom.ts`:

**Then** it exports a `CustomProvider` class that extends `ApiProvider`:

**And** the class has `id = 'custom'`:

**And** the class has `name = 'Custom API'`:

**And** the class has `baseUrl = ''`:

**And** the class has an empty `models: Model[]` array:

**And** the class has a `setConfig()` method that accepts `providerId`, `name`, `baseUrl`, `models`, and `apiKey`:

**And** the `setConfig()` method sets the `configId`, `configName`, `baseUrl`, `models`, and `apiKey` properties:

**And** the `listModels()` method returns models from the configured `models` array:

**Given** all API providers are implemented:

**When** I build the project:

**Then** there are no TypeScript compilation errors:

**And** each API provider properly extends `ApiProvider`:

**And** each API provider can make HTTP requests to its models endpoint:

**And** each API provider has a `configure()` method for API key injection:

## Technical Notes

- OpenAI API uses standard `/chat/completions` endpoint
- GLM API uses `/paas/v4/` endpoint prefix (Chinese/international)
- Custom provider uses OpenAI-compatible API format
- API key storage in global config file (`~/.johnny-bmad/providers.json`)
- All API providers need `node-fetch` library (will be added to package.json)

## Out of Scope

- Provider-specific CLI tools (Codex, Kimi already implemented as CLI providers)

## Dependencies

- Need to add `node-fetch: ^3.3.2` to package.json dependencies
