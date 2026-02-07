# Story 6-13: Create Tests

**As a** developer working on johnny-bmad multi-provider system,
**I want** comprehensive test coverage for the provider system including registry, model config, and onboarding,
**So that** the system is reliable and well-tested before deployment.

## Context

The multi-provider system introduces significant new functionality that needs thorough testing to ensure:
- Provider registration works correctly
- Model caching saves and loads properly
- Onboarding prompts can be tested
- CLI argument parsing handles all new flags
- Integration between components is solid

## Requirements

- Create `src/providers/registry.test.ts` test suite for provider registry
- Create `src/config/models.test.ts` test suite for model configuration
- Create `src/onboarding.test.ts` test suite for onboarding flow
- Use Bun test runner (existing in project)
- Test critical paths and edge cases
- Maintain 100% test coverage for new code

## Acceptance Criteria

**Given** I create `src/providers/registry.test.ts`:

**Then** it uses `describe()` and `test()` from 'bun:test':

**And** it has test suite: "Provider Registry":

**And** it has test: "should have all built-in providers registered":
  - Calls `registry.getAllProviders()`
  - Expects array to include: 'claude', 'codex', 'kimi', 'glm', 'openai', 'custom'
  - Verifies length is 6

**And** it has test: "should get provider by ID":
  - Calls `registry.getProvider('claude')`
  - Expects provider to be defined with correct id and name
  - Verifies `getProvider('unknown')` returns undefined

**Given** I create `src/config/models.test.ts`:

**Then** it uses `describe()` with "Model Config":

**And** it has test: "should return null when config does not exist":
  - Calls `loadModelConfig(testDir)` where config file doesn't exist
  - Expects result to be null

**And** it has test: "should save and load model config":
  - Calls `saveModelConfig(testDir, config)` with test config
  - Calls `loadModelConfig(testDir)`
  - Expects loaded config to equal saved config

**When** I run `bun test`:

**Then** all tests pass with no errors:

**And** test coverage includes:
  - Provider registration (6 providers)
  - Provider lookup by ID
  - Model config persistence (save/load)
  - Onboarding flow (if tested with mocked inquirer)

## Technical Notes

- Tests use Bun's built-in test runner
- Test directories use `tmpdir()` for isolated test environments
- Inquirer can be mocked for onboarding tests
- State file operations can be tested in temp directories
- No external dependencies for tests (uses Bun's node-fetch polyfill)

## Out of Scope

- Integration tests (testing with real provider CLIs and APIs)
- E2E tests (testing full johnny-bmad workflow)
- Performance benchmarks
- Model validation tests (testing against real provider APIs)

## Test Files to Create

1. `src/providers/registry.test.ts` - Test provider registration and lookup
2. `src/config/models.test.ts` - Test model config save/load
3. `src/onboarding.test.ts` - Test onboarding prompts (optional, inquirer mocks)

## Test Coverage Goals

- Provider registry: 100% of registration and lookup methods
- Model config: 100% of save and load operations
- Onboarding: Test all prompt paths if inquirer can be mocked
- CLI arguments: Update test for new flag parsing
- Overall: Maintain or increase test coverage percentage

## Integration Points

- Test files are run by: `bun test` command
- Tests ensure code quality before deployment

## Example Test Output

```bash
$ bun test

src/providers/registry.test.ts:
  ✓ should have all built-in providers registered
  ✓ should get provider by ID
  ✓ should return undefined for unknown provider

src/config/models.test.ts:
  ✓ should return null when config does not exist
  ✓ should save and load model config

2 tests passed, 0 failed
```
