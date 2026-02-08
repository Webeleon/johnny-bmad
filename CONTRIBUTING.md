# Contributing to johnny-bmad

Thanks for your interest in contributing to johnny-bmad! This project uses the [BMAD methodology](https://github.com/bmad-method) (Business Model Agile Development) to plan and implement features. Contributions follow a structured **claim-then-implement** protocol to keep work organized and avoid conflicts.

## The Contribution Protocol

Contributing happens in three phases: **Propose**, **Claim**, and **Implement**.

### Phase 1: Propose (GitHub Issue)

Open an issue describing the feature or fix you want to work on.

- Use a clear, descriptive title
- Explain the motivation and expected behavior
- Wait for maintainer feedback before proceeding — the maintainers may have context on planned work or preferred approaches

### Phase 2: Claim (Planning PR)

Once your proposal is approved, fork the repo and create a branch to add BMAD planning artifacts. This "claim PR" reserves the epic number for you.

**What to add:**

1. **`_bmad-output/planning-artifacts/prd.md`** — Add or update a PRD section for the new work
2. **`_bmad-output/planning-artifacts/epics.md`** — Add a new epic using the next available number (e.g., `## Epic 6: Your Feature`) with a story list using `- [ ] 6-1-story-id: Story Title` format
3. **`_bmad-output/implementation-artifacts/sprint-status.yaml`** — Register the new epic and its stories with `backlog` status

**PR format:**

- Title: `docs(epic-N): add planning artifacts for <feature>`
- Reference the approved issue in the PR body
- Once approved and merged, you "own" that epic number

### Phase 3: Implement (Code PR)

After your planning PR is merged, create a new branch from `main` and implement the stories in your claimed epic.

**PR format:**

- Title: `feat(epic-N): implement <feature>`
- Reference both the issue and the epic in the PR body
- Keep the PR focused to one epic

## Development Setup

```bash
# Fork and clone
git clone https://github.com/<your-fork>/johnny-bmad.git
cd johnny-bmad

# Install dependencies
bun install

# Useful commands
bun test             # Run tests
bun run dev          # Watch mode
bun run build        # Build to dist/
npx .                # Test locally
```

## Code Quality Standards

- **Linting & formatting**: Biome (auto-enforced via pre-commit hook)
- **Commit messages**: Conventional commits (enforced via commit-msg hook)
- **Tests**: Co-located `.test.ts` files using Bun's test runner — maintain coverage
- **TypeScript**: Strict mode, ESM with `.js` import extensions
- **No Bun-specific APIs**: Use Node's `child_process` for spawning (npm compatibility)

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(epic-N): add batch story creation workflow
fix(3-2): handle empty banner on NO_COLOR
docs(epic-N): add planning artifacts for retry logic
chore: update biome config
```

| Prefix | Use for |
|--------|---------|
| `feat(epic-N)` | New features tied to an epic |
| `fix(story-id)` | Bug fixes for a specific story |
| `docs(epic-N)` | Planning artifact changes |
| `chore` | Tooling, infra, CI changes |

## BMAD Artifact Format Reference

### Epic entry in `epics.md`

```markdown
## Epic N: Title

**Epic Goal:** One-sentence user outcome.

### Story N.M: Story Title

**As a** <role>,
**I want** <capability>,
**So that** <benefit>.

**Acceptance Criteria:**
...
```

Stories are listed in the epic overview as:

```markdown
- [ ] N-M-story-id: Story Title
```

### Sprint status in `sprint-status.yaml`

```yaml
development_status:
  epic-N: backlog
  N-1-story-id: backlog
  N-2-story-id: backlog
```

Status values: `backlog`, `in-progress`, `review`, `done`

### Story file naming

Story files go in `_bmad-output/implementation-artifacts/` with the naming pattern:

```
N-M-story-id.md
```

For example: `6-1-add-retry-wrapper.md`

## PR Guidelines

- **One epic per PR** — keep PRs focused
- **Link the issue** in the PR description
- **Planning PRs and code PRs are separate** — don't mix artifact changes with implementation
- **CI must pass** — lint, tests, and build all need to succeed
- **No secrets** — never commit `.env` files, credentials, or API keys

## Questions?

Open an issue or join the [Webeleon Discord](https://discord.gg/AK7BNxJByt).
