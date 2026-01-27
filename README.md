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
| `--help` | `-h` | Show help message |

```bash
# Examples
johnny-bmad                 # Start fresh or prompt to resume if state exists
johnny-bmad --resume        # Auto-resume from last session
johnny-bmad -v              # Verbose output for debugging
johnny-bmad -m 5            # Limit to 5 dev-review cycles per story
johnny-bmad --yolo          # YOLO mode: auto-mark stories done at max iterations
johnny-bmad -m 3 -y         # 3 iterations max, auto-complete if stuck
```

### Requirements

- **BMAD Project** with `_bmad/` folder
- **Claude Code CLI** (`claude` command in PATH)
- **Node.js 18+**
- **Git** (optional, for auto-commits)

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
