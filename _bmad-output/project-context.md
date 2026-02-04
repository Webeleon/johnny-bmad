---
project_name: 'johnny-bmad'
user_name: 'J'
date: '2026-02-03'
sections_completed: ['technology_stack', 'language_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules']
status: 'complete'
rule_count: 27
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

**Core Technologies:**
- **TypeScript:** ES2022, strict mode, ESM modules (ESNext)
- **Runtime:** Bun (development) + Node.js 18+ (npm distribution target)
- **Module System:** ESM - **CRITICAL: Always use .js extensions in imports**

**Dependencies:**
- chalk ^5.4.1 (terminal colors, respects NO_COLOR)
- inquirer ^9.3.7 (interactive prompts)
- yaml ^2.7.0 (BMAD file parsing)

**Build & Test:**
- **Build:** Bun bundler → dist/index.js (Node.js target)
- **Test:** Bun's built-in test runner (`bun:test`)
- **Entry:** `#!/usr/bin/env node` shebang

**🚨 CRITICAL: Cross-Runtime Compatibility**
- **NEVER use Bun-specific APIs** (Bun.spawn, Bun.file, etc.)
- **ALWAYS use Node.js APIs** (child_process.spawn, fs module)
- **Rationale:** npm package must work on Node.js 18+, not just Bun

---

## Critical Implementation Rules

### Language-Specific Rules (TypeScript)

**Import/Export:**
- **🚨 ALWAYS use .js extensions in imports** (ESM requirement)
  ```typescript
  ✅ import { runOrchestrator } from './orchestrator.js';
  ❌ import { runOrchestrator } from './orchestrator';
  ```
- Use named exports, not default exports
- Strict mode ENABLED - all code must pass strict checks

**Async/Await:**
- ALWAYS use async/await with Promises (not callbacks)
- Return Promises from all async functions
- Wrap async in try/catch with proper error handling

**Type Safety:**
- NEVER use `any` type unless documented
- Prefer interfaces over type aliases for objects
- PascalCase for interfaces WITHOUT prefix (State, not IState)

### Testing Rules

**Test Organization:**
- **Co-locate tests:** `*.test.ts` alongside implementation
  ```
  ✅ src/ui/progress.ts → src/ui/progress.test.ts
  ❌ tests/ui/progress.test.ts (breaks pattern)
  ```

**Test Structure:**
- Hybrid describe: File/module → function/scenario
  ```typescript
  describe('config.ts - State Management', () => {
    describe('migrateV0toV1()', () => {
      test('should preserve currentEpic', () => { ... });
    });
  });
  ```

**Coverage Requirements:**
- **🚨 100% coverage (true 90%+) for ALL NEW v1 code**
- Run `bun test --coverage` before commits
- Quality gate: v1 cannot release <90% coverage

**Fixtures:**
- Simple data: inline in tests
- Complex data: `src/fixtures/*.json`

### Code Quality & Style Rules

**Naming Conventions:**
- **Files:** kebab-case (story-card.ts)
- **Functions:** camelCase (migrateV0toV1)
- **Variables:** camelCase (currentEpic)
- **Types:** PascalCase no prefix (State, WorkflowMode)
- **Constants:** SCREAMING_SNAKE_CASE (MAX_RETRIES)

**Code Organization:**
- New UI components: `src/ui/` only
- Utilities: `src/utils/` (logger, files, user-input)
- Test fixtures: `src/fixtures/`

**Variable Declarations:**
- Prefer `const` over `let`
- Use `let` only when reassignment needed
- NEVER use `var`

### Development Workflow Rules

**Commit Format:**
- Pattern: `feat(STORY-ID): title`
  ```
  ✅ feat(STORY-001): add batch workflow mode
  ✅ fix(STORY-002): resolve state migration issue
  ❌ Added batch workflow (missing type/scope)
  ```

**Git Safety:**
- User confirmation REQUIRED before commits (unless --yolo)
- NEVER commit `.johnny-bmad-state.json` (gitignored)
- NEVER commit `dist/` or `node_modules/`

**Development Commands:**
- `bun run dev` - Watch mode
- `bun test` - Run tests
- `bun test --coverage` - Validate coverage (REQUIRED before release)

### Critical Don't-Miss Rules

**🚨 NEVER-BREAK Rules:**

1. **Cross-Runtime Compatibility:**
   ```typescript
   ❌ NEVER: const proc = Bun.spawn(['claude', ...args]);
   ✅ ALWAYS: import { spawn } from 'child_process';
              const proc = spawn('claude', args);
   ```

2. **State Persistence:**
   ```typescript
   ✅ ALWAYS save state BEFORE risky operations:
      await saveState(currentState);  // Save first
      const result = await claudeSpawn(...);  // Then risk
   ```

3. **Import Extensions:**
   ```typescript
   ✅ import { loadState } from './config.js';  // .js required
   ❌ import { loadState } from './config';     // Will fail
   ```

4. **Terminal Output Formats:**
   ```typescript
   ✅ 'Story 4/8 [████████░░░░░░░░] implementing...'
   ✅ '[OK]    Story created successfully'
   ✅ '━━━ Phase: Story Creation ━━━'
   ❌ '[4/8] ████░░░░ Implementing' (wrong format)
   ```

5. **Error Messages Must Include Recovery:**
   ```typescript
   ✅ [ERROR] Claude CLI not found
           Try: Install from https://claude.ai/download
   ❌ throw new Error('Claude CLI not found'); (no recovery)
   ```

6. **Test Coverage Quality Gate:**
   - 100% coverage (true 90%+) for ALL NEW v1 code
   - Run `bun test --coverage` before any commit
   - v1 cannot release without 90%+ coverage

7. **Backward Compatibility:**
   - Sequential mode MUST remain default
   - Existing flags MUST work unchanged
   - v0.2.0 state files MUST migrate successfully

8. **Atomic State Writes:**
   ```typescript
   ✅ await fs.writeFile(`${STATE_FILE}.tmp`, json);
      await fs.rename(`${STATE_FILE}.tmp`, STATE_FILE);
   ❌ Direct write to state file (corruption risk)
   ```

**Anti-Patterns:**
```typescript
❌ Bun.spawn() - use child_process.spawn
❌ import from './module' - use './module.js'
❌ const maxRetries = 3 - use MAX_RETRIES
❌ src/ui/StoryCard.ts - use kebab-case
❌ interface IState {} - no prefix
❌ Commit without tests - 90%+ required
❌ Error without "Try:" - include recovery
❌ Direct state write - use atomic pattern
```

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-02-03
