# Starter Template Evaluation

## Primary Technology Domain

**CLI Tool / Developer Tools** - Terminal-based orchestrator for BMAD implementation automation

**Project Context:** Brownfield enhancement of existing v0.2.0 production tool

## Starter Options Considered

**Evaluation Context:**
This is a brownfield enhancement project, not greenfield development. Rather than evaluating fresh starter templates, we assessed the existing johnny-bmad v0.2.0 architecture for its suitability as the foundation for batch workflow enhancement.

**Existing Architecture Assessment:**
- ✅ Production-proven CLI orchestration pattern
- ✅ Cross-runtime compatibility (Bun + Node.js)
- ✅ State persistence and resume capability already implemented
- ✅ Multi-agent coordination architecture already established
- ✅ Well-organized codebase with clear separation of concerns
- ✅ Active maintenance and successful npm distribution

**Alternative Considered:**
- Fresh rewrite with modern CLI framework (e.g., oclif, commander-based starter)
- **Rejected:** Would break backward compatibility, lose production-proven patterns, require complete rewrite

## Selected Starter: johnny-bmad v0.2.0 Architecture (Brownfield Enhancement)

**Rationale for Selection:**

The existing v0.2.0 architecture provides a solid foundation for batch workflow enhancement:

1. **Production-Proven Reliability:** Current sequential workflow demonstrates the orchestration pattern works in production use
2. **Backward Compatibility Requirement:** PRD mandates zero breaking changes - must build on existing architecture
3. **State Management Already Solved:** `.johnny-bmad-state.json` persistence and resume logic proven reliable
4. **Multi-Agent Pattern Established:** SM, Story Creator, Dev, Reviewer agents already working with proper model selection
5. **Cross-Runtime Compatibility:** Existing Node.js `child_process` usage ensures npm package compatibility
6. **Clean Codebase Structure:** Well-organized with clear component boundaries for extension

**Project Initialization:**

**No initialization command needed** - existing project structure will be enhanced with:
- New workflow modes (`--batch`, `--dev-only` flags)
- Enhanced state tracking for batch phases
- Per-story review flow components
- Extended CLI output system for batch progress

**Existing v0.2.0 codebase location:** `/Users/j/@webeleon/johnny-bmad`

## Architectural Decisions Provided by Existing v0.2.0

**Language & Runtime:**
- **TypeScript (ES2022):** Strict mode enabled, ESM modules
- **Dual Runtime Support:** Bun (development/preferred) + Node.js 18+ (npm compatibility)
- **Target:** ES2022 with ESNext modules
- **Build Output:** Single bundled `dist/index.js` with `#!/usr/bin/env node` shebang

**Dependencies & Libraries:**
- **chalk (5.4.1):** Terminal color output for status messages
- **inquirer (9.3.7):** Interactive user prompts (confirmations, selections, text input)
- **yaml (2.7.0):** BMAD configuration and sprint-status file parsing
- **Node.js built-ins:** `child_process` for Claude CLI spawning, `fs` for file operations

**Build Tooling:**
- **Bun bundler:** Single-file output for distribution
- **Target:** Node.js compatibility (not Bun-specific APIs)
- **Output:** `dist/index.js` published to npm as `@webeleon/johnny-bmad`
- **Package.json scripts:** `dev` (watch mode), `build`, `test`, `publish:npm`

**Testing Framework:**
- **Bun's built-in test runner:** `bun:test` with `describe`, `test`, `expect`
- **Co-located test files:** `*.test.ts` alongside implementation
- **Current coverage:** Partial (files.test.ts, orchestrator.test.ts, user-input.test.ts, stream-wrapper.test.ts)
- **v1.5 target:** 100% coverage (unit, integration, system tests)

**Code Organization:**
```
src/
├── index.ts              # CLI entry point, argument parsing
├── orchestrator.ts       # Main workflow loop, state machine
├── config.ts             # State persistence (.johnny-bmad-state.json)
├── types.ts              # TypeScript interfaces
├── agents/               # Agent wrappers (SM, Story Creator, Dev, Reviewer)
├── claude/               # Claude CLI integration (cli.ts, prompts.ts)
├── git/                  # Git operations (commit.ts)
└── utils/                # Utilities (logger, files, user-input, timer, stream-wrapper)
```

**Architectural Patterns Established:**
- **Orchestrator Pattern:** Central state machine (`orchestrator.ts`) manages workflow progression
- **Agent Wrappers:** Thin wrappers around Claude CLI spawning with role-specific prompts
- **State Persistence:** JSON file for automatic resume capability
- **Error Recovery:** Try/catch with 2-second delay retry on Claude CLI failures
- **Multi-Agent Coordination:** Specialized agents (opus for planning/review, sonnet for implementation)

**Development Experience:**
- **Watch Mode:** `bun run dev` with automatic recompilation
- **Verbose Mode:** `--verbose` flag enables labeled output streams `[SM]`, `[Dev]`, `[Review]`
- **State Inspection:** `.johnny-bmad-state.json` readable JSON for debugging
- **Cross-runtime Testing:** Test with both `bun run src/index.ts` and `npx .` (built package)
- **Git Integration:** Optional but recommended for automatic commits

**CLI Interface Already Established:**
- **Argument Parsing:** Manual parsing in `index.ts` (no external CLI framework)
- **Help Text:** `--help` flag with usage information
- **Existing Flags:** `--verbose`, `--yolo`, `--max-iterations`, `--resume` (deprecated, auto-resume is default)
- **User Prompts:** Inquirer-based confirmations and selections
- **Colored Output:** Chalk-based with info/warn/error/success/debug levels

**Cross-Cutting Concerns Already Solved:**
1. **State Persistence:** Atomic writes, resume on restart, progress tracking
2. **Error Handling:** Retry logic, state saves before failures, unhandled rejection handler
3. **Logging:** Timestamp-based, verbose mode support, agent lifecycle tracking
4. **Git Safety:** User confirmation before commits, conventional commit format
5. **Cross-Runtime Compatibility:** Node.js `child_process`, no Bun-specific APIs
6. **BMAD Project Validation:** Pre-flight checks for `_bmad/` folder, config.yaml

## Enhancement Strategy for Batch Workflow (v1)

**Architectural Extensions Required:**

1. **Workflow Mode Router:** Extend orchestrator to route between sequential/batch/dev-only modes
2. **Batch Phase State:** Track story creation → review → implementation phases in state file
3. **Per-Story Review Components:** New UI components for story display and approval prompts
4. **Enhanced State Schema:** Add `mode`, `phase`, `approvalStatus` fields to state file
5. **CLI Flag Expansion:** Add `--batch`, `--dev-only` to existing argument parser
6. **UI Component Library:** Extract terminal output formatting into reusable components (`src/ui/`)

**Architectural Constraints to Preserve:**

- ✅ Sequential mode remains default behavior (backward compatibility)
- ✅ All existing flags continue working unchanged
- ✅ State file format backward compatible or provides migration
- ✅ No Bun-specific APIs introduced (maintain Node.js compatibility)
- ✅ Existing agent wrappers and prompts remain functional
- ✅ Git safety and user confirmation patterns preserved

**Note:** Enhancement implementation will follow existing code organization patterns and extend (not replace) the proven v0.2.0 architecture.
