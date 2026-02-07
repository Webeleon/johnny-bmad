# Story 6-9: Update All Agents

**As a** developer working on johnny-bmad multi-provider system,
**I want** all agent functions to accept a model parameter and use the provider registry instead of hardcoded model strings,
**So that** models can be configured dynamically via onboarding or CLI overrides.

## Context

Currently, all agents have hardcoded models:
- SM Agent: `model: 'opus'`
- Story Creator: `model: 'opus'`
- Dev Agent: `model: 'sonnet'`
- Reviewer: `model: 'opus'`

These need to accept a `model` parameter and use the provider registry's `invokeModel()` method.

## Requirements

- Update `src/agents/sm.ts` to accept optional `model?: string` parameter
- Update `src/agents/story-creator.ts` to accept optional `model?: string` parameter
- Update `src/agents/dev.ts` to accept optional `model?: string` parameter
- Update `src/agents/reviewer.ts` to accept optional `model?: string` parameter
- Update `src/agents/reviewer.ts` to use provider registry instead of direct spawn()
- Update all agents to pass model to `spawnClaude()` calls or provider registry
- Update all agents to preserve existing allowedTools arrays
- Maintain backward compatibility if model parameter not provided (use hardcoded defaults)

## Acceptance Criteria

**Given** I update `src/agents/sm.ts`:

**Then** the `runSmAgent(cwd: string, model?: string)` function signature includes `model` parameter:

**And** the function calls `spawnClaude()` with options:
  - `model: model || 'opus'` (fallback to default)
  - `prompt: getSmAgentPrompt()`
  - `cwd: cwd`
  - `allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep']`
  - `agentRole: 'SM'`

**And** the function logs "SM Agent - Sprint Status Check" header:

**Given** I update `src/agents/story-creator.ts`:

**Then** the `runStoryCreator(cwd: string, story: EpicStory, epicId: string, model?: string)` function signature includes `model` parameter:

**And** the function calls `spawnClaude()` with options:
  - `model: model || 'opus'` (fallback to default)
  - `prompt: getCreateStoryPrompt(story.id, story.title, epicId)`
  - `cwd: cwd`
  - `allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep']` (no Bash)
  - `agentRole: 'Story Creator'`

**And** the function logs "Creating Story: [story.id]" sub-header:

**Given** I update `src/agents/dev.ts`:

**Then** the `runDevAgent(cwd: string, storyId: string, storyFilePath: string, model?: string)` function signature includes `model` parameter:

**And** the function calls `spawnClaude()` with options:
  - `model: model || 'sonnet'` (fallback to default)
  - `prompt: getDevStoryPrompt(storyId, storyFilePath)`
  - `cwd: cwd`
  - `allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep']`
  - `agentRole: 'Dev'`

**And** the function logs "Dev Agent: [storyId]" sub-header:

**Given** I update `src/agents/reviewer.ts`:

**Then** the `runReviewAgent(cwd: string, storyId: string, storyFilePath: string, model?: string)` function signature includes `model` parameter:

**And** the function imports `registry` from `../providers/registry.js`:

**And** the function creates `InvokeOptions` object:
  - `model: model || 'opus'` (fallback to default)
  - `prompt: getReviewStoryPrompt(storyId, storyFilePath)`
  - `cwd: cwd`
  - `allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep']`
  - `agentRole: 'Review'`

**And** the function calls `registry.invokeModel(model, options)` instead of spawning `claude` directly:

**And** the function checks sprint-status.yaml for review status after provider completes:

**And** the function preserves existing error handling structure (retry logic, YAML parsing):

**When** all agents are updated:

**Then** they accept model parameter gracefully:

**And** they use model parameter from config or CLI override:

**And** if model parameter is undefined:

**Then** they fall back to hardcoded defaults (preserving backward compatibility):

## Technical Notes

- Reviewer agent currently has special implementation using direct spawn() instead of spawnClaude()
- Reviewer agent captures stdout for REVIEW_PASSED/REVIEW_FAILED detection
- Reviewer agent checks sprint-status.yaml as preferred review status detection method
- The update to use provider registry maintains both patterns:
  - Provider registry approach works for all model types
  - Sprint status checking (YAML) still works correctly
  - Stdout capturing still happens in provider's invoke() method

## Integration Points

- Updated agents called by: Orchestrator with model config values
- Agents work with: ProviderRegistry for model invocation
- Model config provides: SM model, Story Creator model, Dev model, Reviewer model

## Backward Compatibility

- All existing agent behavior is preserved when model parameter is not provided:
  - SM Agent defaults to 'opus'
  - Story Creator defaults to 'opus'
  - Dev Agent defaults to 'sonnet'
  - Reviewer defaults to 'opus'

- All agent calls in existing code continue to work without model parameter
- The `spawnClaude()` function in `src/claude/cli.ts` is NOT modified (it becomes a wrapper)
