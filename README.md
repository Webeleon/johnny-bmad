# johnny-bmad

> **TL;DR:** Automates the BMAD implementation phase, one epic at a time.

Inspired by Ralph - because every BMAD project deserves an assistant who never sleeps.

Johnny BMAD orchestrates multiple Claude Code sessions to implement your stories from sprint planning through code review and commit. Just point it at your BMAD project, pick an epic, and watch it work.

## Usage

### Install

```bash
npm install -g @webeleon/johnny-bmad
```

### Run

```bash
cd your-bmad-project
johnny-bmad
```

That's it. Johnny will:
1. Check your sprint status
2. Let you pick an epic
3. For each story: create it, implement it, review it, commit it
4. Repeat until the epic is done

### CLI Options

| Option | Short | Description |
|--------|-------|-------------|
| `--resume` | `-r` | Auto-resume from saved state without prompting |
| `--verbose` | `-v` | Enable debug output for troubleshooting |
| `--max-iterations N` | `-m N` | Max dev-review cycles per story (default: 10) |
| `--yolo` | `-y` | Auto-complete stories when max iterations reached (no prompt) |
| `--batch` | `-b` | Create all stories first, review each one, then exit (no implementation) |
| `--dev-only` | `-d` | Skip story creation, implement existing stories only |
| `--sm-model MODEL` | `-s` | Model for SM agent (default: opus) |
| `--story-model MODEL` | `-t` | Model for Story Creator (default: opus) |
| `--dev-model MODEL` | | Model for Dev agent (default: sonnet) |
| `--review-model MODEL` | `-R` | Model for Reviewer (default: opus) |
| `--reconfigure` | | Force run model configuration onboarding |
| `--refresh-models` | | Refresh model cache (discover available models) |
| `--help` | `-h` | Show help message |

```bash
# Examples
johnny-bmad                 # Start sequential workflow (default)
johnny-bmad --resume        # Auto-resume from last session
johnny-bmad -v              # Verbose output for debugging
johnny-bmad -m 5            # Limit to 5 dev-review cycles per story
johnny-bmad --yolo          # YOLO mode: auto-mark stories done at max iterations
johnny-bmad -m 3 -y         # 3 iterations max, auto-complete if stuck
johnny-bmad --batch         # Create and review stories before implementing
johnny-bmad --dev-only      # Implement pre-created stories
johnny-bmad --batch --yolo  # Create stories without review prompts

# Model configuration
johnny-bmad                 # First run (triggers onboarding)
johnny-bmad --reconfigure   # Reconfigure models

# Override specific models
johnny-bmad --sm-model opus --dev-model sonnet --review-model haiku
johnny-bmad --dev-model openai:gpt-4  # Use OpenAI for Dev agent

# Refresh model cache
johnny-bmad --refresh-models

# Combined with existing flags
johnny-bmad -v --dev-model openai:gpt-4 -m 5 --yolo
```

### Requirements

- **BMAD Project** with `_bmad/` folder
- **At least one LLM provider** (CLI tool or API key configured)
- **Node.js 18+**
- **Git** (optional, for auto-commits)

### BMAD Framework Setup

This project uses the BMAD methodology. To install the required framework:

```bash
# TODO: User to provide installation commands
```

The `_bmad/` framework files are gitignored - each developer installs their own copy.

## How It Works

```
SM Agent (opus)           → Check sprint status
        ↓
User selects epic
        ↓
┌─────────────────────────────────────────┐
│  For each story:                        │
│                                         │
│  Story Creator (opus)  → Create story   │
│          ↓                              │
│  Dev Agent (sonnet)    → Implement      │
│          ↓                              │
│  Reviewer (opus)       → Code review    │
│          ↓                              │
│  Git commit (if passed)                 │
└─────────────────────────────────────────┘
```

 Stories loop through dev → review until the reviewer marks them done. Default max is 10 iterations per story, then you're prompted to continue, skip, or abort. Use `--yolo` to auto-complete stuck stories instead of prompting.

### Multi-Provider Support

Johnny BMAD supports multiple LLM providers via CLI tools and API keys:

| Provider | Type | Detection | Models |
|----------|-------|-----------|---------|
| **Claude** | CLI | `claude --version` | opus, sonnet, haiku |
| **OpenAI Codex** | CLI | `codex --version` | gpt-5.3-codex, ... |
| **Kimi** | CLI | `kimi --version` | moonshot-v1-8k, 32k, 128k |
| **OpenAI** | API | API key | gpt-4, gpt-4-turbo, gpt-3.5-turbo |
| **GLM** | API | API key | glm-4, glm-4-plus, glm-4v |
| **Custom** | API | User-configured | User-defined |

#### First-Time Setup

Run `johnny-bmad` in a new project to start onboarding:

1. Detect CLI Tools
2. Configure API Providers
3. Add Custom Providers
4. Discover Available Models
5. Configure Models for Each Agent
6. Save Configuration

#### Configuration Files

- **~/.johnny-bmad/providers.json** - Global API keys (shared across all projects)
- **.johnny-bmad/models.json** - Per-project model selection
- **.johnny-bmad-models-cache.json** - Model cache (1-hour TTL)

#### Model ID Format

Models can be specified in two ways:

- **Short name**: `opus`, `sonnet`, `haiku`, `gpt-4`, `glm-4`
  - Auto-detects provider from model registry
  - Example: `--dev-model sonnet` (uses Claude)

- **Full ID (provider-prefixed)**: `claude:opus`, `openai:gpt-4`, `glm:glm-4`
  - Explicitly specifies provider
  - Example: `--dev-model openai:gpt-4` (uses OpenAI)

### State Persistence

Progress saves to `.johnny-bmad-state.json`. If interrupted:

```bash
johnny-bmad --resume  # Pick up where you left off
```

## Development

### Setup

```bash
git clone https://github.com/webeleon/johnny-bmad.git
cd johnny-bmad
bun install
```

### Commands

```bash
bun run dev          # Watch mode
bun run build        # Build to dist/
bun test             # Run tests
npx .                # Test locally
```

### Project Structure

```
src/
├── index.ts              # CLI entry
├── orchestrator.ts       # Main workflow
├── agents/               # SM, Story, Dev, Reviewer
├── claude/               # CLI spawning & prompts
├── git/                  # Commit operations
├── providers/            # Multi-provider system
│   ├── registry.ts       # Provider registry
│   ├── api-provider.ts   # API provider base
│   ├── cli-provider.ts   # CLI provider base
│   ├── cache.ts          # Model cache
│   └── providers/        # Built-in providers (claude, openai, glm, etc.)
├── config/               # Configuration management
│   └── models.ts        # Model config save/load
├── onboarding.ts         # First-run setup
└── utils/                # Logging, file parsing
```

### Contributing

1. Fork it
2. Create your branch (`git checkout -b feature/amazing`)
3. Commit your changes
4. Push to the branch
5. Open a PR

## Support

Questions? Issues? Join the [Webeleon Discord](https://discord.gg/AK7BNxJByt).

## License

MIT
