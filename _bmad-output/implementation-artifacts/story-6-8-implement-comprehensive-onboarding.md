# Story 6-8: Implement Comprehensive Onboarding

**As a** developer using johnny-bmad for the first time,
**I want** a smooth, well-designed onboarding experience that guides me through provider detection, model selection, and configuration,
**So that** I can quickly get started with my preferred LLM setup without being overwhelmed.

## Context

First-time users need to:
1. Detect which CLI tools are installed (Claude, Codex, Kimi)
2. Configure API providers if desired (OpenAI, GLM, Kimi)
3. See all available models from all providers
4. Select models for each agent (SM, Story Creator, Dev, Reviewer)
5. Understand recommendations for each agent
6. Save configuration persistently

The onboarding should be friendly, informative, and efficient.

## Requirements

- Create `src/onboarding.ts` module for onboarding flow
- Implement `runOnboarding(cwd: string)` function that orchestrates entire onboarding
- Detect CLI tools by calling `registry.getAvailableProviders(cwd)`
- Prompt for API provider configuration (OpenAI, GLM, Kimi)
- Prompt for custom provider addition (optional)
- Call `registry.getAllModels(cwd, true)` to force model refresh
- Display models grouped by provider and type (CLI Providers, API Providers)
- For each agent, show recommended model and allow selection
- Save model config via `saveModelConfig(cwd, config)`
- Use inquirer for all prompts (confirm, list, checkbox, input, password)
- Display ASCII art and color-coded sections
- Show clear progress indicators (Step 1, Step 2, etc.)
- Display configuration summary before saving
- Handle custom model ID input
- Allow re-configuration with `--reconfigure` flag

## Acceptance Criteria

**Given** I create `src/onboarding.ts`:

**Then** it implements `runOnboarding(cwd: string)` function:

**And** the function displays ASCII banner "JOHNNY BMAD - Model Configuration":

**And** the function displays context message about configuration files to be created:

**And** Step 1: "Detecting CLI Tools"
  - Calls `registry.getAvailableProviders(cwd)`
  - Displays "📋 Step 1: Detecting CLI Tools"
  - Shows detected CLI tools with "✓ Detected CLI tools:" and list
  - If no CLI tools detected, shows "⚠️  No CLI tools detected" message

**And** Step 2: "Configure API Providers"
  - Prompts: "Would you like to configure API-based providers?"
  - If yes, shows checkbox list: OpenAI, GLM, Kimi
  - For each selected API, prompts for API key (password type)
  - Calls `setApiKey(providerId, apiKey)` for each
  - Shows "✓ API key saved for [Provider]" after each

**And** Step 3: "Add Custom Providers"
  - Prompts: "Do you want to add a custom API provider?"
  - If yes, prompts for provider ID, name, base URL, models
  - Validates provider ID format (lowercase, numbers, hyphens)
  - Validates base URL format
  - Prompts for model definitions (ID, name, supportsTools)
  - Calls `addCustomProvider(providerId, config)` and `setApiKey(providerId, apiKey)` if provided

**And** Step 4: "Discovering Available Models"
  - Calls `registry.getAllModels(cwd, true)` with forceRefresh=true
  - Displays "📋 Step 3: Discovering Available Models"
  - Shows "📦 Discovering available models..." with provider discovery progress
  - Shows "✓ [Provider]: [N] models" for each provider
  - Shows "💾 Cached [N] models" after aggregating

**And** Step 5: "Configure Agents"
  - For each of 4 agents (SM, Story Creator, Dev, Reviewer):
    - Displays "🤖 Configure: [Agent Name]"
    - Shows agent description and purpose
    - Shows recommended model with reason
    - Displays grouped model choices:
      - "═══ CLI Providers ═══" separator
      - CLI models with "✓ Recommended" indicator
      - "═══ API Providers ═══" separator
      - API models
      - "═══ Custom ═══" separator
      - "Enter custom model ID..." option
    - Waits for user selection
    - If "Custom" selected, prompts for custom model ID
  - Displays "Configuration Summary" section after all 4 agents configured
  - Shows each agent's selected model with provider and model name
  - Prompts: "Save this configuration? [Y/n]"

**And** Step 6: "Save Configuration"
  - If user confirms, calls `saveModelConfig(cwd, config)`
  - Displays success message: "✓ Configuration saved!"
  - Shows files created:
    - "~/.johnny-bmad/providers.json - Global API keys"
    - ".johnny-bmad/models.json - Per-project model selection"
    - ".johnny-bmad-models-cache.json - Model cache (1-hour TTL)"
  - Shows reconfigure command: "You can reconfigure at any time with: johnny-bmad --reconfigure"
  - Shows refresh command: "Refresh model cache with: johnny-bmad --refresh-models"

**When** user declines saving:

**Then** it displays "Configuration cancelled. Run johnny-bmad --reconfigure to try again.":

**And** it exits with code 0:

**Given** custom provider addition:

**When** "Add Custom Provider" is selected:

**Then** it prompts for:
  - Provider ID (validated with regex: `/^[a-z0-9-]+$/`)
  - Provider name (required)
  - API base URL (validated with URL constructor)
  - Define models now? (confirm)
  - For each model: ID (required), name (defaults to ID), supportsTools (default true)
  - API key (optional, password type)
  - Another model? (confirm loop until no)

**And** after custom provider configuration:

**Then** it calls `addCustomProvider(providerId, config)`:

**And** if API key provided, it calls `setApiKey(providerId, apiKey)`:

**And** it displays success: "✓ Custom provider "[name]" added with [N] models":

**When** I build the project:

**Then** there are no TypeScript compilation errors:

**And** onboarding flow is clear and easy to follow:

## Technical Notes

- Onboarding is run only when `modelConfigExists(cwd)` is false AND not in `--resume` mode AND not in `--yolo` mode
- Agent descriptions and recommendations stored in code for clarity
- Model selection allows both provider-prefixed (claude:opus) and bare names (opus)
- Custom model IDs validated before use
- All prompts use inquirer for consistent UX
- Inquirer password type masks API keys in terminal

## Out of Scope

- Model validation (checking if model exists before use)
- Provider capability detection (e.g., checking if API supports tools)
- Migration from old model config (none exists yet)

## Integration Points

- Used by: Orchestrator to run onboarding when config doesn't exist
- Used by: Orchestrator to run onboarding when `--reconfigure` flag is set
- Uses: ProviderRegistry for detection and model discovery
- Uses: ModelConfig functions for saving configuration

## Example Onboarding Flow

```
1. Detecting CLI Tools...
   ✓ Detected CLI tools:
      • Claude (CLI)

2. Configure API Providers...
   Would you like to configure API-based providers? [y/N]: y
   
   Which API providers do you want to configure?
   [✓] OpenAI (GPT models)
   [✓] GLM (Zhipu AI)
   
   Enter API key for OpenAI: [masked]
   ✓ API key saved for OpenAI
   Enter API key for GLM: [masked]
   ✓ API key saved for GLM

3. Add Custom Providers...
   Do you want to add a custom API provider? [y/N]: N

4. Discovering Available Models...
   📦 Discovering available models...
      ✓ Claude (CLI): 3 models
      ✓ OpenAI (API): 3 models
      ✓ GLM (API): 3 models
   💾 Cached 9 models

5. Configure Agents...
   🤖 Configure: SM Agent (Sprint Master)
      Checks project status and sprint planning
      Recommended: opus (Excellent at planning and organization)
      
   Choose model:
      ═══ CLI Providers ═══
         [✓ Recommended] claude:opus - Claude Opus
         claude:sonnet - Claude Sonnet
         claude:haiku - Claude Haiku
      ═══ API Providers ═══
         openai:gpt-4 - GPT-4
         openai:gpt-3.5-turbo - GPT-3.5 Turbo
         glm:glm-4 - GLM-4
      
   [Repeated for Story Creator, Dev, Reviewer agents...]

6. Configuration Summary...
   SM Agent (Sprint Master):
      Provider: CLAUDE
      Model: claude:opus (Claude Opus)
   
   Story Creator Agent:
      Provider: CLAUDE
      Model: claude:opus (Claude Opus)
   
   Dev Agent:
      Provider: CLAUDE
      Model: claude:sonnet (Claude Sonnet)
   
   Reviewer Agent:
      Provider: CLAUDE
      Model: claude:opus (Claude Opus)
   
   Save this configuration? [Y/n]: Y
   
   ✓ Configuration saved!
   Files created:
      ~/.johnny-bmad/providers.json  - Global API keys
      .johnny-bmad/models.json        - Per-project model selection
      .johnny-bmad-models-cache.json - Model cache (1-hour TTL)
   
   You can reconfigure at any time with: johnny-bmad --reconfigure
   Refresh model cache with: johnny-bmad --refresh-models
```
