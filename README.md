<div align="center">

# 🚀 Johnny BMAD

**Automate your BMAD implementation phase with AI-powered orchestration**

[![npm version](https://img.shields.io/npm/v/@webeleon/johnny-bmad.svg)](https://www.npmjs.com/package/@webeleon/johnny-bmad)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

*Inspired by Ralph — because every BMAD project deserves an assistant who never sleeps.*

[Quick Start](#-quick-start) • [Documentation](#-how-it-works) • [Configuration](#-configuration) • [Contributing](#-contributing)

</div>

---

## ✨ Overview

**Johnny BMAD** orchestrates multiple AI agent sessions to automate your BMAD implementation workflow. From sprint planning through code review and commit, Johnny handles the entire story lifecycle — letting you focus on what matters most.

### 🎯 What It Does

- ✅ **Automates story creation** — Generates implementation stories from epics
- ✅ **Orchestrates development** — Coordinates Dev, Review, and SM agents
- ✅ **Manages iterations** — Handles dev-review cycles automatically
- ✅ **Tracks progress** — Saves state for seamless resumption
- ✅ **Multi-provider support** — Works with Claude, OpenAI, GLM, and more
- ✅ **Smart commits** — Auto-commits with proper story-based messages

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (or Bun)
- **BMAD project** with `_bmad/` folder structure
- **At least one LLM provider** configured (CLI tool or API key)
- **Git** (optional, for auto-commits)

### Installation

```bash
npm install -g @webeleon/johnny-bmad
```

### Basic Usage

```bash
cd your-bmad-project
johnny-bmad
```

That's it! Johnny will:
1. Check your sprint status
2. Let you pick an epic
3. For each story: create → implement → review → commit
4. Repeat until the epic is complete

### First-Time Setup

On first run, Johnny will guide you through:
1. **Detecting CLI tools** (Claude, Codex, Kimi, etc.)
2. **Configuring API providers** (OpenAI, GLM, custom)
3. **Discovering available models**
4. **Selecting models for each agent role**

---

## 📖 Usage Guide

### Command-Line Options

| Option | Short | Description |
|--------|-------|-------------|
| `--resume` | `-r` | Auto-resume from saved state without prompting |
| `--verbose` | `-v` | Enable debug output for troubleshooting |
| `--max-iterations N` | `-m N` | Max dev-review cycles per story (default: 10) |
| `--yolo` | `-y` | Auto-complete stories when max iterations reached |
| `--batch` | `-b` | Create all stories first, then review (no implementation) |
| `--dev-only` | `-d` | Skip story creation, implement existing stories only |
| `--sm-model MODEL` | `-s` | Model for SM agent (default: opus) |
| `--story-model MODEL` | `-t` | Model for Story Creator (default: opus) |
| `--dev-model MODEL` | | Model for Dev agent (default: sonnet) |
| `--review-model MODEL` | `-R` | Model for Reviewer (default: opus) |
| `--reconfigure` | | Force run model configuration onboarding |
| `--refresh-models` | | Refresh model cache (discover available models) |
| `--help` | `-h` | Show help message |

### Common Workflows

#### Sequential Development (Default)
```bash
johnny-bmad
```
Creates stories one at a time, implements them immediately, reviews, and commits.

#### Resume Interrupted Session
```bash
johnny-bmad --resume
```
Picks up where you left off using saved state from `.johnny-bmad-state.json`.

#### Batch Story Creation
```bash
johnny-bmad --batch
```
Creates all stories for an epic first, then reviews each one. Useful for planning phases.

#### Development-Only Mode
```bash
johnny-bmad --dev-only
```
Skips story creation and implements pre-existing stories. Great for re-running implementations.

#### Limited Iterations with Auto-Complete
```bash
johnny-bmad -m 3 --yolo
```
Limits to 3 dev-review cycles per story, auto-completes if stuck (no prompts).

#### Custom Model Configuration
```bash
johnny-bmad --dev-model openai:gpt-4 --review-model opus
```
Uses GPT-4 for development, Claude Opus for reviews.

#### Verbose Debugging
```bash
johnny-bmad -v --dev-model sonnet
```
Enables detailed logging for troubleshooting.

---

## 🏗️ How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Johnny BMAD Orchestrator                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────┐
        │   SM Agent (opus)                 │
        │   • Check sprint status            │
        │   • Validate epic readiness        │
        └───────────────────────────────────┘
                            │
                            ▼
                    User selects epic
                            │
                            ▼
        ┌──────────────────────────────────────────────────┐
        │           Story Implementation Loop              │
        │                                                  │
        │  ┌──────────────────────────────────────────┐  │
        │  │  Story Creator (opus)                     │  │
        │  │  • Generate story from epic               │  │
        │  │  • Define acceptance criteria             │  │
        │  └──────────────────────────────────────────┘  │
        │                    │                            │
        │                    ▼                            │
        │  ┌──────────────────────────────────────────┐  │
        │  │  Dev Agent (sonnet)                       │  │
        │  │  • Implement story requirements            │  │
        │  │  • Write code and tests                   │  │
        │  └──────────────────────────────────────────┘  │
        │                    │                            │
        │                    ▼                            │
        │  ┌──────────────────────────────────────────┐  │
        │  │  Reviewer (opus)                         │  │
        │  │  • Code review                            │  │
        │  │  • Verify acceptance criteria             │  │
        │  │  • Output: REVIEW_PASSED / REVIEW_FAILED  │  │
        │  └──────────────────────────────────────────┘  │
        │                    │                            │
        │         ┌──────────┴──────────┐                │
        │         │                     │                │
        │      PASSED              FAILED                │
        │         │                     │                │
        │         ▼                     ▼                │
        │  ┌──────────┐        ┌──────────────┐        │
        │  │ Git      │        │ Loop back    │        │
        │  │ Commit   │        │ to Dev       │        │
        │  └──────────┘        └──────────────┘        │
        │                                              │
        └──────────────────────────────────────────────┘
                            │
                            ▼
                    Epic Complete ✓
```

### Workflow Details

1. **Sprint Status Check** — SM agent validates current sprint state
2. **Epic Selection** — User chooses which epic to implement
3. **Story Loop** — For each story in the epic:
   - **Create** — Story Creator generates implementation story
   - **Implement** — Dev agent writes code
   - **Review** — Reviewer validates implementation
   - **Iterate** — If review fails, loop back to Dev (max 10 iterations)
   - **Commit** — On pass, commit with `feat(STORY-ID): title` format
4. **State Persistence** — Progress saved to `.johnny-bmad-state.json`
5. **Resume** — Can resume from any interruption point

---

## ⚙️ Configuration

### Multi-Provider Support

Johnny BMAD supports multiple LLM providers through CLI tools and API keys:

| Provider | Type | Detection | Example Models |
|----------|------|-----------|----------------|
| **Claude** | CLI | `claude --version` | `opus`, `sonnet`, `haiku` |
| **OpenAI Codex** | CLI | `codex --version` | `gpt-5.3-codex` |
| **Kimi** | CLI | `kimi --version` | `moonshot-v1-8k`, `32k`, `128k` |
| **OpenAI** | API | API key | `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo` |
| **GLM** | API | API key | `glm-4`, `glm-4-plus`, `glm-4v` |
| **Custom** | API | User-configured | User-defined |

### Configuration Files

- **`~/.johnny-bmad/providers.json`** — Global API keys (shared across projects)
- **`.johnny-bmad/models.json`** — Per-project model selection
- **`.johnny-bmad-models-cache.json`** — Model cache (1-hour TTL)

### Model ID Format

Models can be specified in two ways:

**Short name** (auto-detects provider):
```bash
johnny-bmad --dev-model sonnet  # Uses Claude
johnny-bmad --dev-model gpt-4   # Uses OpenAI
```

**Full ID** (explicit provider):
```bash
johnny-bmad --dev-model claude:opus
johnny-bmad --dev-model openai:gpt-4
johnny-bmad --dev-model glm:glm-4
```

### State Management

Progress is automatically saved to `.johnny-bmad-state.json` in your project directory. This enables:

- **Resume functionality** — Continue after interruption
- **Progress tracking** — Current epic, story index, iteration counts
- **Completion history** — Track completed stories

To resume:
```bash
johnny-bmad --resume
```

---

## 🛠️ Development

### Setup

```bash
git clone https://github.com/webeleon/johnny-bmad.git
cd johnny-bmad
bun install  # or npm install
```

### Available Commands

```bash
bun run dev          # Watch mode development
bun run build        # Build to dist/
bun test             # Run unit tests
npx .                # Test built package locally
```

### Project Structure

```
src/
├── index.ts              # CLI entry point
├── orchestrator.ts       # Main workflow orchestration
├── config.ts             # State persistence
├── types.ts              # TypeScript interfaces
├── agents/               # AI agent implementations
│   ├── sm.ts             # Scrum Master agent
│   ├── story-creator.ts  # Story creation agent
│   ├── dev.ts            # Development agent
│   └── reviewer.ts       # Review agent
├── claude/               # Claude CLI integration
│   ├── cli.ts            # Process spawning
│   └── prompts.ts        # Prompt templates
├── providers/            # Multi-provider system
│   ├── registry.ts       # Provider registry
│   ├── api-provider.ts   # API provider base
│   ├── cli-provider.ts   # CLI provider base
│   ├── cache.ts          # Model cache
│   └── providers/        # Built-in providers
├── config/               # Configuration management
│   └── models.ts         # Model config save/load
├── onboarding.ts         # First-run setup
├── git/                  # Git operations
│   └── commit.ts         # Commit handling
└── utils/                # Utilities
    ├── logger.ts         # Colored logging
    ├── files.ts          # BMAD file parsing
    └── user-input.ts     # Interactive prompts
```

### Testing

```bash
# Run all tests
bun test

# Watch mode
bun test --watch

# Test CLI parsing
bun run src/index.ts --help
```

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Commit with clear messages** (`git commit -m 'Add amazing feature'`)
5. **Push to your branch** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request**

### Code Style

- Use `async/await` with Promises
- Prefer `const` declarations
- Use TypeScript strict mode
- Include `.js` extensions in ESM imports
- Follow existing patterns for consistency

---

## 📚 Additional Resources

- **BMAD Framework** — Learn more about the BMAD methodology
- **Documentation** — Full docs available at [GitHub Pages](https://webeleon.github.io/johnny-bmad/)
- **Issues** — Report bugs or request features on [GitHub Issues](https://github.com/webeleon/johnny-bmad/issues)

---

## 💬 Support

Have questions? Need help? Join our community:

- **Discord** — [Webeleon Discord Server](https://discord.gg/AK7BNxJByt)
- **GitHub Discussions** — [Discuss features and ideas](https://github.com/webeleon/johnny-bmad/discussions)
- **Issues** — [Report bugs](https://github.com/webeleon/johnny-bmad/issues)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by [Webeleon](https://webeleon.dev)**

[⬆ Back to Top](#-johnny-bmad)

</div>
