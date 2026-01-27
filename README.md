# johnny-bmad

CLI tool to automate the BMAD implementation phase using Claude Code.

Johnny BMAD orchestrates multiple Claude Code sessions to implement your BMAD project stories - from sprint planning through code review and commit.

## Installation

### From npm (once published)

```bash
# Run directly with npx
npx johnny-bmad

# Or install globally
npm install -g johnny-bmad
```

### Local Installation (from source)

```bash
# 1. Clone the repository
git clone https://github.com/anthropics/johnny-bmad.git
cd johnny-bmad

# 2. Install dependencies
bun install
# or: npm install

# 3. Build the project
bun run build
# or: npm run build

# 4. Link globally so you can use it anywhere
npm link

# 5. Now use from any BMAD project directory
cd /path/to/your-bmad-project
johnny-bmad
```

#### Alternative: Run directly without linking

```bash
# From the johnny-bmad directory, run against a BMAD project:
bun run src/index.ts --help

# Or after building:
node dist/index.js --help

# To run in a specific BMAD project directory:
cd /path/to/your-bmad-project
/path/to/johnny-bmad/dist/index.js
```

#### Unlinking

```bash
# To remove the global link:
npm unlink -g johnny-bmad
```

## Usage

### Quick Start

```bash
# 1. Navigate to your BMAD project (must have _bmad/ folder)
cd /path/to/your-bmad-project

# 2. Run johnny-bmad
johnny-bmad
```

### Command Line Options

```bash
johnny-bmad              # Start fresh or prompt to resume if state exists
johnny-bmad --resume     # Auto-resume from saved state without prompting
johnny-bmad -r           # Short form of --resume

johnny-bmad --verbose    # Enable debug output for troubleshooting
johnny-bmad -v           # Short form of --verbose

johnny-bmad --help       # Show help message
johnny-bmad -h           # Short form of --help
```

### Example Session

```bash
$ cd my-bmad-project
$ johnny-bmad

╔════════════════════════════════════════════════════════════════╗
║                    JOHNNY BMAD                                 ║
║            BMAD Implementation Automation                      ║
╚════════════════════════════════════════════════════════════════╝

[SM] Checking sprint status...
# Claude runs sprint-status workflow

? Select an epic to implement:
  ❯ epic-001: User Authentication System
    epic-002: Dashboard Features
    Exit

# For each story in the epic:
[STORY] Creating story file for STORY-001...
[DEV] Implementing STORY-001...
[REVIEW] Reviewing STORY-001...
Review PASSED - story marked done in sprint-status.yaml
[GIT] Committing changes...
```

## Requirements

- **BMAD Project**: Must be run from a directory containing `_bmad/` folder with BMM configuration
- **Claude Code CLI**: The `claude` command must be available in your PATH
- **Node.js 18+** or **Bun**
- **Git** (optional): For automatic commits after each story

## How It Works

Johnny BMAD automates the implementation phase of the BMAD methodology by spawning Claude Code sessions with specific roles:

```
┌─────────────────────────────────────────────────────────────┐
│  1. SM Agent (opus) - Check sprint status                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. User selects epic to implement                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STORY LOOP (for each story in selected epic)               │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. Create Story (opus) - if file doesn't exist         │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                │
│                            ▼                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ DEV-REVIEW LOOP (max 10 iterations)                    │ │
│  │  2. Dev Story Workflow (sonnet)                        │ │
│  │  3. Code Review Workflow (opus)                        │ │
│  │     - If status=done → exit loop                       │ │
│  │     - If status!=done → back to dev                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                │
│                            ▼                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 4. Commit changes (if git repo)                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                │
│                            ▼                                │
│                   Next story in epic                        │
└─────────────────────────────────────────────────────────────┘
```

### Agent Roles & BMAD Workflows

Each agent invokes specific BMAD workflows via `workflow.xml`:

| Agent | Model | BMAD Workflow | Purpose |
|-------|-------|---------------|---------|
| SM Agent | opus | `sprint-status` + `sprint-planning` | Checks sprint status, initializes planning if needed |
| Story Creator | opus | `create-story` | Creates detailed story files with acceptance criteria |
| Dev Agent | sonnet | `dev-story` | Implements the story following BMAD dev workflow |
| Review Agent | opus | `code-review` | Reviews implementation via BMAD code review workflow |

Workflows are located in `_bmad/bmm/workflows/4-implementation/`.

### Completion Criteria

A story is considered complete when:
1. All acceptance criteria in the story file are marked `[x]`
2. Tests pass
3. Story status is `done` in `sprint-status.yaml` (set by the code-review workflow)

The reviewer agent reads `_bmad-output/implementation-artifacts/sprint-status.yaml` to check if the story's `development_status` is `done`. Falls back to detecting `REVIEW_PASSED` in output if the YAML file is unavailable.

### State Persistence

Progress is saved to `.johnny-bmad-state.json` in your project root. If interrupted, you can resume:

```bash
johnny-bmad --resume  # Auto-resume without prompting
johnny-bmad           # Prompts whether to resume or start fresh
```

### Max Iterations

If a story goes through 10 dev-review cycles without completion, you'll be prompted to:
- **Continue**: Reset counter and keep trying
- **Skip**: Mark story as blocked and move on
- **Abort**: Exit the script (state is saved)

## BMAD Project Structure

The tool expects this structure in your project:

```
your-project/
├── _bmad/
│   └── bmm/
│       └── config.yaml           # Project configuration
├── _bmad-output/
│   ├── planning-artifacts/
│   │   └── epic-*.md             # Epic definitions with stories
│   └── implementation-artifacts/
│       ├── sprint-status.yaml    # Sprint state
│       └── story-*.md            # Individual story files (created by tool)
```

### Epic File Format

Epics should list stories in one of these formats:

```markdown
## Stories

- [ ] STORY-001: Implement user authentication
- [ ] STORY-002: Add password reset flow
- [x] STORY-003: Create login page (already done)
```

Or:
```markdown
## Stories

1. STORY-001: Implement user authentication
2. STORY-002: Add password reset flow
```

## Development

```bash
# Install dependencies
bun install

# Run locally (development)
bun run src/index.ts

# Run with watch mode
bun run dev

# Build for distribution
bun run build

# Test built package locally
npx .
```

### Project Structure

```
johnny-bmad/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── orchestrator.ts       # Main workflow orchestrator
│   ├── config.ts             # State persistence
│   ├── types.ts              # TypeScript types
│   ├── claude/
│   │   ├── cli.ts            # Claude CLI process spawning
│   │   └── prompts.ts        # Prompt templates for each agent
│   ├── agents/
│   │   ├── sm.ts             # SM agent - sprint status
│   │   ├── story-creator.ts  # Story creation agent
│   │   ├── dev.ts            # Development agent
│   │   └── reviewer.ts       # Review agent
│   ├── git/
│   │   └── commit.ts         # Git operations
│   └── utils/
│       ├── logger.ts         # Logging utilities
│       ├── files.ts          # File/YAML parsing
│       └── user-input.ts     # Inquirer prompts
├── dist/                     # Built output
├── package.json
└── tsconfig.json
```

## License

MIT
