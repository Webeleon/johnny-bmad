# Story 6-14: Update Documentation

**As a** developer discovering or using johnny-bmad with multi-provider support,
**I want** clear documentation explaining the new provider system, configuration options, and usage examples,
**So that** users understand how to use the new features without confusion.

## Context

The multi-provider system introduces significant new functionality that needs to be documented:
- Supported providers (CLI and API)
- Onboarding workflow
- Configuration files and locations
- New CLI flags
- Model selection syntax (provider:model vs just model)

## Requirements

- Update README.md with multi-provider section
- Document supported providers table (Claude, Codex, Kimi, OpenAI, GLM, Custom)
- Add onboarding flow description with ASCII art example
- Add configuration files explanation
- Update CLI options table with new model flags
- Add usage examples for model overrides
- Document model ID format (short vs provider-prefixed)

## Acceptance Criteria

**Given** I update `README.md`:

**Then** it has a "Multi-Provider Support" section after "How It Works":

**And** the section includes a table:

```markdown
| Provider | Type | Detection | Models |
|----------|-------|-----------|---------|
| **Claude** | CLI | `claude --version` | opus, sonnet, haiku |
| **OpenAI Codex** | CLI | `codex --version` | gpt-5.3-codex, ... |
| **Kimi** | CLI | `kimi --version` | moonshot-v1-8k, 32k, 128k |
| **OpenAI** | API | API key | gpt-4, gpt-4-turbo, gpt-3.5-turbo |
| **GLM** | API | API key | glm-4, glm-4-plus, glm-4v |
```

**And** the section includes "First-Time Setup" subsection:

**And** it explains onboarding workflow:
  ```markdown
  ## First-Time Setup
  
  Run `johnny-bmad` in a new project to start onboarding:
  
  1. Detect CLI Tools
  2. Configure API Providers
  3. Add Custom Providers
  4. Discover Available Models
  5. Configure Models for Each Agent
  6. Save Configuration
  ```

**And** it explains configuration files:
  ```markdown
  ### Configuration Files
  
  - **~/.johnny-bmad/providers.json** - Global API keys (shared across all projects)
  - **.johnny-bmad/models.json** - Per-project model selection
  - **.johnny-bmad-models-cache.json** - Model cache (1-hour TTL)
  ```

**And** it updates CLI Options table:

```markdown
| Option | Short | Description |
|--------|-------|-------------|
| `--sm-model MODEL` | `-s` | Model for SM agent (default: opus) |
| `--story-model MODEL` | `-t` | Model for Story Creator (default: opus) |
| `--dev-model MODEL` | `-d` | Model for Dev agent (default: sonnet) |
| `--review-model MODEL` | `-r` | Model for Reviewer (default: opus) |
| `--reconfigure` | | Force run model configuration onboarding |
| `--refresh-models` | | Refresh model cache (discover available models) |
```

**And** it updates CLI Examples section:

```markdown
```bash
# First run (triggers onboarding)
johnny-bmad

# Reconfigure models
johnny-bmad --reconfigure

# Override specific models
johnny-bmad --sm-model opus --dev-model sonnet --review-model haiku

# Use OpenAI for Dev agent only
johnny-bmad --dev-model openai:gpt-4

# Refresh model cache
johnny-bmad --refresh-models

# Combined with existing flags
johnny-bmad -v --dev-model openai:gpt-4 -m 5 --yolo
```

**And** it adds "Model ID Format" explanation:
  ```markdown
  ### Model ID Format
  
  Models can be specified in two ways:
  
  - **Short name**: `opus`, `sonnet`, `haiku`, `gpt-4`, `glm-4`
    - Auto-detects provider from model registry
    - Example: `--dev-model sonnet` (uses Claude)
  
  - **Full ID (provider-prefixed)**: `claude:opus`, `openai:gpt-4`, `glm:glm-4`
    - Explicitly specifies provider
    - Example: `--dev-model openai:gpt-4` (uses OpenAI)
  ```

**And** it updates Requirements section:

**Then** it lists supported providers as a requirement (not just Claude CLI):

```markdown
### Requirements

- **BMAD Project** with `_bmad/` folder
- **At least one LLM provider** (CLI tool or API key configured)
- **Git repository** (optional, for auto-commits)
```

**When** I build the project:

**Then** there are no broken links or formatting errors in README.md:

## Technical Notes

- ASCII art example in documentation should use monospace font
- Tables use standard markdown pipe table format
- Short flag forms shown in parentheses
- Provider documentation explains both CLI and API options
- Examples demonstrate practical use cases
- Onboarding flow clearly labeled with numbered steps

## Out of Scope

- Provider-specific CLI documentation (links to official docs)
- Advanced configuration (tool disabling, advanced retry settings)
- Migration guide (no legacy model config exists yet)

## Integration Points

- README.md is the main user-facing documentation
- Updated content reflects all new CLI flags and features
- Examples help users get started quickly

## Documentation Sections to Update

1. After "How It Works" diagram: Add multi-provider support table
2. New "First-Time Setup" section: Full onboarding walkthrough
3. Before "CLI Options" table: Add new model configuration flags
4. In "CLI Options" table: Add --reconfigure and --refresh-models
5. In "Examples" section: Add model override and onboarding examples
6. Update "Requirements" section: Add provider flexibility
