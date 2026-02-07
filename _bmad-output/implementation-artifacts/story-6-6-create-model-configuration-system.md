# Story 6-6: Create Model Configuration System

**As a** developer working on johnny-bmad multi-provider system,
**I want** a configuration system for storing and loading model selections per agent,
**So that** users can configure different models for SM, Story Creator, Dev, and Reviewer agents that persist across sessions.

## Context

Users need to configure which model to use for each agent phase. This configuration should be:
- Persistent across sessions (saved to disk)
- Per-project (stored in `.johnny-bmad/` directory)
- Flexible (support CLI overrides)
- Clear format (JSON)

## Requirements

- Create `src/config/models.ts` module for model configuration
- Implement `loadModelConfig()` function to read `.johnny-bmad/models.json`
- Implement `saveModelConfig()` function to write `.johnny-bmad/models.json`
- Implement `modelConfigExists()` function to check if config exists
- ModelConfig interface includes fields: sm, storyCreator, dev, reviewer, version
- Config file path: `.johnny-bmad/models.json`
- Config version tracking for future migrations

## Acceptance Criteria

**Given** I create `src/config/models.ts`:

**Then** it exports a `ModelConfig` interface with fields:
  - `sm: string`
  - `storyCreator: string`
  - `dev: string`
  - `reviewer: string`
  - `version: number`

**And** it implements `loadModelConfig(cwd: string)` function:

**And** the function constructs file path as `join(cwd, '.johnny-bmad/models.json')`:

**And** if file does not exist, it returns `null`:

**And** if file exists, it reads content with `readFileSync(path, 'utf-8')`:

**And** it parses JSON content with `JSON.parse(content)`:

**And** it returns the parsed config object:

**And** it catches parse errors and returns `null` on failure:

**Given** I create `src/config/models.ts`:

**Then** it implements `saveModelConfig(cwd: string, config: ModelConfig)` function:

**And** the function constructs file path as `join(cwd, '.johnny-bmad/models.json')`:

**And** it writes config to file with `writeFileSync(path, JSON.stringify(config, null, 2))`:

**And** it ensures the directory exists before writing (no need for explicit mkdir):

**Given** I create `src/config/models.ts`:

**Then** it implements `modelConfigExists(cwd: string)` function:

**And** the function constructs file path as `join(cwd, '.johnny-bmad/models.json')`:

**And** it uses `existsSync(path)` to check if file exists:

**And** it returns `true` if file exists, `false` otherwise:

**When** the config file is read successfully:

**Then** the `ModelConfig` object has all required fields populated:

**And** the `version` field is present:

**When** I build the project:

**Then** there are no TypeScript compilation errors:

**And** the model config functions are properly exported:

## Technical Notes

- Config is stored in `.johnny-bmad/` subdirectory (gitignored, per-project)
- Model IDs can be simple names (opus, sonnet) or fully qualified (claude:opus, openai:gpt-4)
- Version field enables future migrations (currently version 1)
- Directory structure: `.johnny-bmad/models.json`

## Out of Scope

- API key configuration (covered in provider config)
- Global configuration (separate from per-project model selection)
- Model selection UI (covered in onboarding story)
- Validation of configured models (deferred to provider registry)

## Integration Points

- Used by: Orchestrator to load model config at startup
- Used by: Onboarding to save model config after user selection
- Used by: CLI argument parsing to override config values

## Example Config

```json
{
  "sm": "claude:opus",
  "storyCreator": "claude:opus",
  "dev": "claude:sonnet",
  "reviewer": "claude:opus",
  "version": 1
}
```
