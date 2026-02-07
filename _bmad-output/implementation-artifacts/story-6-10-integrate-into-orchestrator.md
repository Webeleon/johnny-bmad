# Story 6-10: Integrate into Orchestrator

**As a** developer working on johnny-bmad multi-provider system,
**I want** the orchestrator to load model configuration at startup and pass models to all agent calls,
**So that** the multi-provider system is fully integrated into the main workflow.

## Context

The orchestrator is the main controller that:
- Determines when to run onboarding (first run or --reconfigure flag)
- Loads model config from `.johnny-bmad/models.json`
- Merges CLI argument overrides into config
- Passes model parameters to SM, Story Creator, Dev, and Reviewer agents
- Handles model cache refresh when `--refresh-models` flag is set

## Requirements

- Import model config functions: `loadModelConfig()`, `saveModelConfig()`, `modelConfigExists()`
- Import onboarding: `runOnboarding()`
- Import provider registry: `registry` from `providers/registry.js`
- Add onboarding trigger logic after pre-flight checks
- Add model config loading after onboarding or resume
- Merge CLI overrides (--sm-model, --story-model, --dev-model, --review-model)
- Pass model config to all agent function calls
- Add --reconfigure flag support
- Add --refresh-models flag support
- Update CLI help text with new model configuration options

## Acceptance Criteria

**Given** I update `src/orchestrator.ts`:

**Then** after importing new modules:

**And** it imports `loadModelConfig` from './config/models.js':

**And** it imports `modelConfigExists` from './config/models.js':

**And** it imports `saveModelConfig` from './config/models.js':

**And** it imports `runOnboarding` from './onboarding.js':

**And** it imports `registry` from '../providers/registry.js':

**Then** after pre-flight checks (lines ~58):

**When** I add model configuration logic:

**Then** it calls `loadModelConfig(cwd)` to load existing config:

**And** it evaluates `needsOnboarding = !modelConfig && !args.resume && !args.yolo`:

**And** it checks `args.reconfigure` flag:

**And** if needsOnboarding OR args.reconfigure:

**Then** it calls `modelConfig = await runOnboarding(cwd)`:

**Then** if `args.refreshModels` is true:

**Then** it calls `registry.getAllModels(cwd, true)` to force cache refresh:

**Then** it merges CLI overrides into model config:
  ```typescript
  const finalConfig = {
    sm: args.smModel ?? modelConfig!.sm,
    storyCreator: args.storyModel ?? modelConfig!.storyCreator,
    dev: args.devModel ?? modelConfig!.dev,
    reviewer: args.reviewModel ?? modelConfig!.reviewer
  };
  ```

**Given** all agent calls are updated (existing calls):

**When** I update each agent call to pass model parameter:

**Then** `runSmAgent(cwd)` call becomes `runSmAgent(cwd, finalConfig.sm)`:

**And** `runStoryCreator(cwd, epicStory, selectedEpic.id)` call becomes `runStoryCreator(cwd, epicStory, selectedEpic.id, finalConfig.storyCreator)`:

**And** `runDevAgent(cwd, story.id, story.filePath)` call becomes `runDevAgent(cwd, story.id, story.filePath, finalConfig.dev)`:

**And** `runReviewAgent(cwd, story.id, story.filePath)` call becomes `runReviewAgent(cwd, story.id, story.filePath, finalConfig.reviewer)`:

**Then** the final dev pass call (line ~325) also passes model: `runDevAgent(cwd, story.id, story.filePath, finalConfig.dev)`:

**When** I build the project:

**Then** there are no TypeScript compilation errors:

**And** the orchestrator properly integrates multi-provider system:

## Technical Notes

- Model config loading happens after pre-flight checks (after git check)
- Onboarding triggers before main workflow (only when needed)
- CLI arguments override model config values (highest precedence)
- Model cache refresh is optional (only when `--refresh-models` flag)
- Onboarding only runs when config doesn't exist OR `--reconfigure` is set
- `--resume` mode skips onboarding even if config exists
- `--yolo` mode skips onboarding even if config exists

## Integration Points

- Orchestrator is the central integration point for:
  - Model configuration system
  - Provider registry
  - Onboarding
  - All agent functions

## Out of Scope

- State tracking of model configuration in state.json (can be added later)
- Model migration from old hardcoded strings (no legacy model config exists)

## Example Usage

```bash
# First run (triggers onboarding)
johnny-bmad

# Reconfigure models
johnny-bmad --reconfigure

# Override specific model
johnny-bmad --dev-model openai:gpt-4

# Refresh model cache
johnny-bmad --refresh-models
```
