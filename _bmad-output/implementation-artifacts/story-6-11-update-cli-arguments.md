# Story 6-11: Update CLI Arguments

**As a** developer working on johnny-bmad multi-provider system,
**I want** new CLI arguments for model configuration (--sm-model, --story-model, --dev-model, --review-model, --reconfigure, --refresh-models),
**So that** users can override models from command line without running onboarding.

## Context

Users need to be able to:
- Override individual agent models via CLI flags
- Force re-run onboarding via `--reconfigure` flag
- Refresh model cache via `--refresh-models` flag
- Keep using existing CLI flags (--resume, --verbose, --max-iterations, --yolo, --help)

## Requirements

- Update `CliArgs` interface in `src/types.ts` to add new fields
- Add fields: `smModel?: string`, `storyModel?: string`, `devModel?: string`, `reviewModel?: string`, `reconfigure?: boolean`, `refreshModels?: boolean`
- Update `parseArgs(argv: string[])` function to parse new flags
- Add flag parsing for `--sm-model`, `--story-model`, `--dev-model`, `--review-model`, `--reconfigure`, `--refresh-models`
- Update `showHelp()` function to document new flags
- Update CLI examples with new flags
- Maintain backward compatibility with existing flags

## Acceptance Criteria

**Given** I update `src/types.ts`:

**Then** the `CliArgs` interface includes:
  - `smModel?: string`
  - `storyModel?: string`
  - `devModel?: string`
  - `reviewModel?: string`
  - `reconfigure?: boolean`
  - `refreshModels?: boolean`

**And** all existing fields are preserved:
  - `resume: boolean`
  - `help: boolean`
  - `verbose: boolean`
  - `maxIterations?: number`
  - `yolo: boolean`

**Given** I update `src/index.ts` `parseArgs()` function:

**Then** it handles flag `--sm-model`:
  - If `argv[i] === '--sm-model'`
  - Then `args.smModel = argv[++i]`

**Then** it handles flag `--story-model`:
  - If `argv[i] === '--story-model'`
  - Then `args.storyModel = argv[++i]`

**Then** it handles flag `--dev-model`:
  - If `argv[i] === '--dev-model'`
  - Then `args.devModel = argv[++i]`

**Then** it handles flag `--review-model`:
  - If `argv[i] === '--review-model'`
  - Then `args.reviewModel = argv[++i]`

**Then** it handles flag `--reconfigure`:
  - If `argv[i] === '--reconfigure'`
  - Then `args.reconfigure = true`

**Then** it handles flag `--refresh-models`:
  - If `argv[i] === '--refresh-models'`
  - Then `args.refreshModels = true`

**Then** it preserves existing flag parsing:
  - `--resume` and `-r`
  - `--help` and `-h`
  - `--verbose` and `-v`
  - `--max-iterations` and `-m`
  - `--yolo` and `-y`

**Given** I update `src/index.ts` `showHelp()` function:

**Then** it adds documentation for new flags in the CLI options table:

**Then** it adds examples for new flags:
  ```
  | --sm-model MODEL           Model for SM agent (default: opus)
  | --story-model MODEL         Model for Story Creator (default: opus)
  | --dev-model MODEL          Model for Dev agent (default: sonnet)
  | --review-model MODEL       Model for Reviewer (default: opus)
  | --reconfigure             Force run model configuration onboarding
  | --refresh-models           Refresh model cache (discover available models)
  ```

**And** it updates the usage examples section with new flags:
  ```bash
  # Override dev model with OpenAI
  johnny-bmad --dev-model openai:gpt-4
  
  # Reconfigure all models
  johnny-bmad --reconfigure
  ```

**Then** it adds model configuration explanation:
  ```
  Model Configuration:
    Run johnny-bmad without --resume to start onboarding if config doesn't exist.
    Use --reconfigure to change models at any time.
  
  Models can be specified as:
    - Short name: opus, sonnet, haiku, gpt-4, glm-4
    - Full ID: claude:opus, openai:gpt-4, glm:glm-4
  ```

**When** I build the project:

**Then** there are no TypeScript compilation errors:

**And** all new CLI flags are properly recognized:

## Technical Notes

- Short forms: `-s` for `--sm-model`, `-t` for `--story-model`, `-d` for `--dev-model`, `-r` for `--review-model`
- Model flags allow both short names and provider-prefixed IDs
- `--reconfigure` flag triggers onboarding regardless of config existence
- `--refresh-models` flag forces cache refresh (calls registry.getAllModels with forceRefresh=true)
- Help text includes all existing flags plus new model configuration flags

## Out of Scope

- Model validation flags (user must ensure model exists)
- Model discovery from CLI (deferred to onboarding)
- Interactive model selection via CLI

## Integration Points

- Updated CliArgs used by: Orchestrator to get model overrides
- Updated help text displayed when `--help` flag is set

## Example Commands

```bash
# Override specific agent models
johnny-bmad --sm-model opus --dev-model sonnet --review-model haiku

# Use OpenAI for Dev agent only
johnny-bmad --dev-model openai:gpt-4

# Reconfigure models
johnny-bmad --reconfigure

# Refresh model cache
johnny-bmad --refresh-models

# Combined with existing flags
johnny-bmad -v --dev-model openai:gpt-4 -m 5 --yolo
```
