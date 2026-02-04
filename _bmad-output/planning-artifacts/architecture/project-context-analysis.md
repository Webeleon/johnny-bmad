# Project Context Analysis

## Requirements Overview

**Functional Requirements (62 FRs across 10 capability areas):**

The architecture must support three distinct workflow modes:

1. **Sequential Mode** (FR1, FR28-34, FR57-62): Existing v0.2.0 behavior - create story → implement → review → commit → repeat
2. **Batch Mode** (FR2, FR7-21): New workflow - create ALL stories → review each → approve all → STOP (implementation separate)
3. **Dev-Only Mode** (FR3, FR22-27): Implementation-only workflow - skip story creation, iterate through pre-created stories

**Core Architectural Capabilities Required:**

- **Multi-Agent Orchestration** (FR7-11, FR28-34): System spawns Claude CLI processes with specialized roles (SM Agent, Story Creator, Dev Agent, Reviewer Agent) using different models (opus for planning/review, sonnet for implementation)
- **State Management** (FR35-42): Persistent state tracking via `.johnny-bmad-state.json` enabling automatic resume after crashes, tracking mode/phase/epic/story position
- **Per-Story Review Flow** (FR12-18): Interactive approval workflow in batch mode - prompt after each story creation, iterate on changes until approved
- **Error Recovery** (FR43-50): Retry logic with exponential backoff, API rate limit detection, state preservation before failures
- **CLI Output System** (FR51-56): Agent visibility, progress indicators, colored terminal output, phase transition markers
- **Backward Compatibility** (FR57-62): All existing flags and behaviors must remain unchanged

**Non-Functional Requirements (20 NFRs across 3 categories):**

**Reliability NFRs (NFR-R1 to NFR-R9) - Critical Architecture Drivers:**
- Zero data loss during crashes/interruptions → Atomic state file writes required
- 100% resume success rate → State must capture exact workflow position (mode, phase, story index, approval status)
- API resilience → Retry with exponential backoff (2s, 4s, 8s), rate limit detection with pause/retry

**Performance NFRs (NFR-P1 to NFR-P5) - Architecture Constraints:**
- CLI startup <2 seconds → Minimal initialization overhead
- State file operations <100ms → Simple JSON format, atomic writes
- 8+ hour session stability → No memory leaks, <10% performance degradation, stateless agent spawning

**Maintainability NFRs (NFR-M1 to NFR-M7) - Quality Requirements:**
- 100% test coverage (v1.5 roadmap) → Architecture must be testable (unit, integration, system tests)
- Clear error messages with recovery steps → Centralized error formatting with "Try: [command]" pattern
- Backward compatible state file format → Migration strategy if schema changes

**Scale & Complexity:**

- **Primary domain**: CLI Tool / Developer Tools (terminal-based orchestrator)
- **Complexity level**: Medium (enhancing existing production tool, not greenfield)
- **Estimated architectural components**: 8-10 core components
  - CLI entry point (argument parsing, help display)
  - Orchestrator (state machine, workflow routing)
  - State manager (JSON persistence, atomic writes)
  - Agent system (4 agent wrappers: SM, Story Creator, Dev, Reviewer)
  - Claude CLI integration (process spawning, output capture)
  - Git integration (commit creation with safety checks)
  - File utilities (BMAD file parsing: epics, stories, sprint-status.yaml)
  - UI system (terminal output: colors, progress bars, agent labels)
  - User input system (prompts: confirmations, text input, selections)
  - Logger (verbose mode, timestamps, agent lifecycle tracking)

## Technical Constraints & Dependencies

**Cross-Runtime Compatibility (Critical Constraint):**
- Must support both **Bun** (development/preferred) AND **Node.js 18+** (npm package users)
- CANNOT use Bun-specific APIs (e.g., `Bun.spawn`) → Must use Node.js `child_process.spawn`
- Limits architectural choices to Node.js-compatible patterns

**Existing Technology Stack (Must Preserve):**
- TypeScript (ES2022), ESM modules
- Dependencies: chalk (colors), inquirer (prompts), yaml (parsing)
- Build: Bun bundler → single `dist/index.js` file
- Entry point: `#!/usr/bin/env node` shebang for CLI execution

**Brownfield Context (v0.2.0 in Production):**
- Sequential workflow already implemented and working
- State file format `.johnny-bmad-state.json` already in use
- Existing users depend on current behavior → Zero breaking changes allowed
- Flags: `--verbose`, `--yolo`, `--max-iterations` must continue working unchanged

**External Dependencies:**
- **Claude CLI** required in PATH → Architecture must detect/validate presence
- **BMAD project structure** required → Must validate `_bmad/` folder, `config.yaml`, `sprint-status.yaml`
- **Git** optional but recommended → Git operations must gracefully handle non-git repos

**Review Detection Complexity:**
- **Primary method**: Read `sprint-status.yaml` for story status === 'done'
- **Fallback method**: Scan Reviewer agent stdout for literal string `REVIEW_PASSED` or `REVIEW_FAILED`
- Architecture must support both detection mechanisms

## Cross-Cutting Concerns Identified

**1. State Persistence (Spans All Workflows)**
- Every workflow phase must save state before risky operations
- State file must be written atomically to prevent corruption
- Resume logic must route to correct phase based on saved state
- Affects: Orchestrator, all agents, error handlers

**2. Error Recovery & Retry Logic (Spans All Agent Interactions)**
- All Claude CLI spawns must wrap in try/catch with retry
- Exponential backoff: 2s → 4s → 8s before giving up
- State must be saved before surfacing errors to user
- Affects: Claude CLI integration, all agents, orchestrator

**3. Logging & Output Formatting (Spans Entire System)**
- Verbose mode: Labeled output streams (`[SM]`, `[Story]`, `[Dev]`, `[Review]`)
- Default mode: Clean narrative with phase transitions, progress bars
- Agent lifecycle tracking (start, complete, fail) in verbose mode
- All output must respect `NO_COLOR` environment variable
- Affects: All agents, orchestrator, UI components, error handlers

**4. Backward Compatibility (Constrains All New Features)**
- Sequential mode must remain default behavior
- All existing flags must work unchanged
- State file format changes require migration strategy
- New features are purely additive (`--batch`, `--dev-only`)
- Affects: CLI parser, orchestrator, state manager

**5. Git Safety (Spans Commit Operations)**
- User confirmation required before commits (unless `--yolo`)
- Must check for uncommitted changes before staging
- Conventional commit format: `feat(STORY-ID): title`
- Must validate git repo exists before attempting operations
- Affects: Git integration, orchestrator, user input system

**6. Cross-Runtime Support (Constrains All Process Spawning)**
- No Bun-specific APIs allowed
- Child process spawning must use Node.js `child_process` module
- Affects: Claude CLI integration, all agent implementations

**7. Terminal Compatibility (Spans All Output)**
- ASCII fallbacks for Unicode characters (█ → #, ░ → -, ━ → =)
- Color-independent status (text labels required: `[OK]`, `[FAIL]`)
- Works on macOS Terminal, iTerm, Windows Terminal, Linux terminals
- Screen reader compatibility (plain text, no animations)
- Affects: UI system, logger, all output formatting
