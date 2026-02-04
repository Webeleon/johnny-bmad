---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
inputDocuments:
  - '/Users/j/@webeleon/johnny-bmad/docs/index.md'
  - '/Users/j/@webeleon/johnny-bmad/docs/project-overview.md'
  - '/Users/j/@webeleon/johnny-bmad/docs/architecture.md'
  - '/Users/j/@webeleon/johnny-bmad/docs/source-tree-analysis.md'
  - '/Users/j/@webeleon/johnny-bmad/docs/development-guide.md'
  - '/Users/j/@webeleon/johnny-bmad/_bmad-output/analysis/brainstorming-session-2026-01-30.md'
briefCount: 0
researchCount: 0
brainstormingCount: 1
projectDocsCount: 5
workflowType: 'prd'
classification:
  projectType: 'cli_tool'
  domain: 'developer_tools'
  complexity: 'medium'
  projectContext: 'brownfield'
---

# Product Requirements Document - johnny-bmad

**Author:** J
**Date:** 2026-01-31

## Executive Summary

This PRD transforms johnny-bmad v0.2.0 from sequential story implementation into a production-grade tool with batch workflow capabilities. The enhancement adds `--batch` (create all stories upfront with per-story approval) and `--dev-only` (implement pre-created stories) flags, enabling developers to review complete epic plans before implementation and achieve time arbitrage by planning Epic B while Epic A implements automatically.

## Success Criteria

### User Success

**The Core "Aha!" Moment:**
Developers using johnny-bmad experience two levels of success:

1. **Existing Success** (already delivered): "I can run 10h+ implementation sessions without crashes or failures"

2. **NEW Success** (this PRD delivers): "What used to take 10 hours now takes 8 hours with perfect results - because I planned properly upfront"

**Specific User Outcomes:**
- Developer sees all stories for an epic before implementation starts
- Developer reviews the complete story set, identifies gaps, conflicts, or issues BEFORE writing code
- Developer approves the epic plan with confidence
- Dev/review loop executes through pre-created stories without mid-stream surprises
- **Never Again Scenario Prevented**: Zero instances of 5+ hours of work going in the wrong direction

**Emotional Success:**
- Relief: "I can review the full plan before diving in"
- Confidence: "I know exactly what I'm building and it's the right thing"
- Control: "No surprises mid-implementation that derail my day"

### Business Success

**Open Source Community Adoption:**
- GitHub stars growth as adoption indicator (baseline tracking)
- Community confidence in tool reliability for production use
- Portfolio-quality project suitable for client-facing work

**Personal Success Metrics:**
- Zero regressions in batch workflow mode
- Batch mode prevents wrong-direction implementation (eliminates 5h+ rework incidents)
- Tool ready for client engagements with confidence

### Technical Success

**Core Technical Achievements:**
- Batch story creation workflow successfully creates all epic stories upfront
- Dev-only mode skips story creation during dev/review loop
- Human approval gate enables epic-level review before implementation
- State tracking properly handles batch workflow phases
- Existing sequential workflow continues to work (backward compatibility)

**Quality Indicators:**
- All existing johnny-bmad functionality preserved (no breaking changes)
- Batch workflow completes epic implementation end-to-end
- State persistence enables resume capability in batch mode

### Measurable Outcomes

**Efficiency Metric:**
- Epic implementation time: 10h (old sequential flow) → 8h (new batch flow with better planning)
- Time savings come from: zero rework, clearer stories, no mid-stream planning pauses

**Quality Metric:**
- Zero instances of 5h+ rework due to wrong direction when using batch mode
- Story quality improves through upfront epic-level review

**Adoption Metric:**
- Community adoption tracked via GitHub stars (baseline established, growth monitored)

## Scope Overview

**This PRD (v1):** Batch workflow enhancement (--batch + --dev-only flags)
**v1.5:** Code quality + testing infrastructure
**v2+:** User-facing configuration file

See "Project Scoping & Phased Development" section for detailed scope breakdown.

## User Journeys

### Journey 1: Marcel - Corporate Developer (Time Arbitrage Through Automation)

**Persona: Marcel**
- Senior developer at large enterprise
- Works on complex corporate codebases with multiple stakeholders
- Receives vague, incomplete user stories from PM
- Code must pass human peer review (readable, maintainable)
- Billable hours matter, client trust is critical

**Opening Scene: The Old Way (Before Batch Workflow)**

Marcel opens the latest user story from the PM: "As a user, I want to manage my dashboard settings." Classic PM style - vague acceptance criteria, no edge cases, no error handling specified.

Marcel knows the drill: Transform this ONE vague user story into a detailed BMAD epic with implementation stories. Start coding. Hit ambiguities. Make guesses. Realize 5 hours later the guesses were wrong. Rework. Waste time. Miss client expectations.

The worst part? Marcel's brain is trapped in implementation mode - typing code, fixing bugs, battling the dev/review loop. No time to plan the NEXT feature while stuck implementing the CURRENT one.

**Rising Action: The New Way (With Batch Workflow)**

**Day 1 Morning - Planning Phase:**
Marcel receives the vague user story. Instead of diving into code, Marcel goes through the BMAD planning phase:
- Creates PRD breaking down the requirements
- Designs architecture for the feature
- Makes strategic technical decisions

**Day 1 Afternoon - Automate Story Creation & Validate:**
Marcel runs johnny-bmad in batch mode. The tool generates a complete BMAD epic - 8 detailed implementation stories breaking down "manage dashboard settings" into concrete, actionable work.

Marcel reviews all 8 stories upfront. Spots 2 edge cases the PM didn't specify. Identifies 1 conflict between stories. Uses BMAD Party Mode to validate and refine the stories with multi-agent collaboration.

Marcel takes the refined epic to stakeholders: "Here's how I'm breaking down your user story into 8 implementation stories. I've identified these gaps in your specs - let's align before I code."

PM clarifies. Team lead approves. Marcel has a SOLID, validated implementation plan.

**Day 2 Morning - Automate Implementation:**
Marcel kicks off johnny-bmad implementation for the approved epic. The tool runs for 8+ hours, implementing all 8 stories through automated dev/review loops.

**Critical Moment: Marcel Walks Away**

While johnny-bmad implements the "dashboard settings" epic, Marcel shifts context. Opens a new terminal. **Starts planning the NEXT user story** - the payments integration feature.

Marcel's brain focuses on high-value work (architecture, planning, design decisions) while automation handles implementation toil. **Parallel work** - one epic implements while the next epic plans.

**Day 2 Afternoon - Implementation Complete:**

Marcel returns. The epic is implemented. Peer review? Clean pass - the code is readable because the plan was solid. No 5h wrong direction. No rework. Client happy.

**Resolution: Marcel's New Reality**

Marcel's workflow transforms:
- **Morning**: Strategic planning for Epic B (architecture, design, stakeholder alignment)
- **Afternoon**: johnny-bmad implements Epic A (pre-approved, validated plan running on autopilot)
- **No longer bottlenecked** by typing speed - Marcel multiplies output through automation
- **Focus shift**: From "coding monkey" to "software architect/strategist"
- **Time savings**: 10h epic now takes 8h with zero rework
- **Zero 5h+ wrong direction incidents** - reviewed the plan before implementation

Marcel is freed from implementation toil to focus on what actually matters as a senior developer.

---

### Journey 2: Alex - Solo Developer (First-Time Discovery)

**Persona: Alex**
- Freelance developer working on side projects
- Uses BMAD framework for structured development
- Tired of manually implementing epics story-by-story
- Heard about johnny-bmad on GitHub, curious but skeptical

**Opening Scene: Manual Toil**

Alex has a BMAD project - building a personal SaaS. The current epic has 6 stories. Alex implements them manually: write code, test, debug, commit. Repeat 6 times. Takes all weekend.

"There's got to be a better way. I saw this johnny-bmad tool on GitHub. Does automation actually work for this?"

**Rising Action: First Run**

Alex installs johnny-bmad:
```bash
npm install -g @webeleon/johnny-bmad
```

Navigates to the BMAD project directory. Runs the command:
```bash
johnny-bmad
```

**Climax: The Magic Happens**

Alex watches the terminal:
- SM Agent checks sprint status
- Story Creator generates the first story file
- Dev Agent implements the story
- Reviewer validates the code
- Loop continues...

"Wait... it's actually doing this automatically?"

Three hours later, the epic is complete. All 6 stories implemented, reviewed, committed.

**Resolution: Convert to Believer**

Alex is sold. Every BMAD project now uses johnny-bmad for implementation automation.

"I used to spend weekends on implementation. Now I spend weekends on planning and let johnny-bmad handle the grunt work."

Stars the GitHub repo. Joins the Discord. Becomes part of the community.

---

### Journey 3: Sam - Developer (Error Recovery & Resume)

**Persona: Sam**
- Developer using johnny-bmad for a large epic
- Running a 5-hour implementation session
- Concerned about reliability for long sessions

**Opening Scene: The Fear**

Sam kicks off johnny-bmad for a 10-story epic. "This will take at least 5 hours. What if something fails halfway through?"

Three hours in, Sam's laptop battery dies unexpectedly. Terminal crashes.

**Panic**: "Did I just lose 3 hours of work?"

**Rising Action: The Recovery**

Sam plugs in the laptop, restarts. Opens the terminal, navigates to the project directory.

Runs johnny-bmad again (just the normal command, no special flags needed).

**Climax: Automatic Resume**

johnny-bmad reads `.johnny-bmad-state.json`:

"Resuming from Epic: user-authentication, Story: 4/10 (in-progress), Phase: development"

The tool picks up **exactly where it left off**. Story 4 completes. Story 5 begins. No work lost.

**Resolution: Trust Established**

Sam realizes: "Resume is automatic. My work is safe. I can trust long sessions."

Sam now runs johnny-bmad for 8+ hour sessions with confidence. If something fails, just restart - it'll resume automatically.

"I can walk away for lunch knowing if my network hiccups, the tool will just pick up where it left off when I restart it."

---

### Journey Requirements Summary

**Capabilities Revealed by These Journeys:**

**From Marcel's Journey (Corporate Developer):**
1. **Batch Story Creation Workflow** - Generate all epic stories upfront before implementation
2. **Human Review & Approval Gate** - Review complete story set, validate plan, approve before dev starts
3. **BMAD Party Mode Integration** - Multi-agent validation of story set quality
4. **Stakeholder Collaboration** - Take story set to PM/team for alignment before coding
5. **Dev-Only Mode** - Run implementation loop through pre-created stories without mid-stream story generation
6. **Long-Running Session Support** - Ability to run for 8+ hours unattended while developer works on other tasks
7. **State Tracking for Batch Phases** - Track story creation phase, review phase, implementation phase separately
8. **Zero Rework Guarantee** - Plan validation prevents wrong-direction implementation

**From Alex's Journey (Solo Developer Discovery):**
1. **Simple Installation** - npm install -g works smoothly
2. **Zero-Config First Run** - Just run the command in a BMAD project directory
3. **Clear Progress Visibility** - User can see what's happening (SM, Story Creator, Dev, Reviewer)
4. **Automated End-to-End Flow** - From epic selection to implementation to commit without manual intervention
5. **Community Onboarding** - Clear value demonstration leads to GitHub stars, Discord engagement

**From Sam's Journey (Error Recovery):**
1. **Automatic Resume** - Default behavior, no flags required
2. **State Persistence** - `.johnny-bmad-state.json` tracks exact position (epic, story, phase)
3. **Graceful Recovery** - Handle crashes, network failures, API errors without losing work
4. **Clear Resume Feedback** - Tell user exactly where it's resuming from
5. **Long Session Reliability** - Support 5-10+ hour sessions with confidence

**Cross-Journey Requirements:**
- Backward compatibility (existing sequential workflow continues to work)
- Mode selection (batch vs sequential)
- Reliable state management across all workflow types

## Domain-Specific Requirements

### Developer Tools Domain Context

johnny-bmad operates in the **developer tools / CLI automation** domain. While not a regulated industry (like healthcare or fintech), this domain has strong quality expectations and patterns that shape product requirements.

### A. Test Coverage & Validation (MANDATORY)

**Why Critical for Developer Tools:**
Developers won't adopt a tool that breaks their workflow. Comprehensive testing proves reliability and enables confident contributions from the open source community.

**Requirements:**
- **100% code coverage** - All components, all workflows, all edge cases
- **Unit tests** - Every function, every module tested in isolation
- **Integration tests** - Workflow orchestration tested end-to-end
- **System tests** - Real BMAD projects tested with batch and sequential modes
- **Regression tests** - Prevent breaking changes as new features add
- **CI/CD pipeline** - Tests run automatically on every commit (GitHub Actions)
- **Test quality metrics** - Not just coverage percentage, but meaningful test scenarios

**Success Criteria:**
- Zero regressions when adding new features
- Community can contribute with confidence (tests catch breaking changes)
- Test suite completes in reasonable time (not 10+ minutes blocking development)

### E. Error Handling & Recovery (MANDATORY)

**Why Critical for Developer Tools:**
Long-running sessions (8+ hours) WILL encounter errors (API rate limits, network hiccups, crashes). Graceful recovery is the difference between "lost 5 hours of work" and "resumed seamlessly."

**Requirements:**

**Network Failures:**
- Retry with exponential backoff (don't hammer the API)
- Max retry attempts with clear messaging
- Graceful degradation if network unavailable

**API Errors:**
- Clear error messages (not "No messages returned" - explain WHAT failed and WHY)
- Actionable recovery paths ("Try again in 5 minutes" or "Check API key")
- Context logging (what story, what phase, what operation failed)

**Crashes & Interruptions:**
- Automatic resume from state file (already works!)
- Clear feedback on resume ("Resuming from Epic X, Story Y, Phase Z")
- Preserve all progress (stories created, reviews completed, implementations done)

**Claude API Rate Limiting:**
- Detect rate limit responses
- Pause and retry after cooldown period
- Don't fail the entire session, just wait

**Invalid State Recovery:**
- Detect corrupted state files
- Offer recovery options (restart epic, manual fix, skip story)
- Don't silently fail - tell user what's wrong

**Success Criteria:**
- Zero "lost work" scenarios in batch workflow
- Clear, actionable error messages (developers know what to do)
- Automatic recovery for transient failures (network, API throttling)

### Other Developer Tools Considerations

**B. No Data Loss / Work Preservation:**
- Already addressed by automatic resume capability (works reliably)
- State persistence via `.johnny-bmad-state.json`

**C. Predictable Behavior:**
- Consistency is valuable, but less critical than testing and error handling
- Same input should produce same output where possible

**D. Performance & Resource Management:**
- Long sessions (8+ hours) should be stable
- Optimization is secondary to reliability

**F. Community Trust Signals:**
- CI/CD, semantic versioning, changelog are good practices
- Important for adoption but not blocking for MVP

## Innovation & Novel Patterns

### Detected Innovation Areas

**Core Innovation: BMAD Method + Ralph Loop + Human-in-the-Loop + Multi-Agent Orchestration**

johnny-bmad's batch workflow represents a **new paradigm** in developer tools by combining multiple existing patterns into a novel approach that enables **time arbitrage** for developers.

**The Innovation Formula:**

1. **BMAD Method** (Structured Planning)
   - Comprehensive planning artifacts: PRD → Architecture → Epics → User Stories
   - Domain-specific requirements, success criteria, user journeys
   - More thorough than simple task lists

2. **Ralph Loop Pattern** (Autonomous Implementation)
   - Autonomous AI agent loop running repeatedly until all items complete
   - Fresh AI context each iteration (memory via git/progress.txt/state)
   - Single story per iteration: implement → test → commit → mark done
   - Quality gates: typecheck, tests, CI validation

3. **Human-in-the-Loop Enhancement** (Trust But Verify)
   - **Batch story creation** - Generate ALL epic stories upfront (not picked during loop)
   - **Human review & approval gate** - Review complete story set BEFORE implementation starts
   - **Party Mode validation** - Multi-agent collaborative validation of story quality
   - Validate the PLAN before committing 8+ hours to automated execution

4. **Multi-Agent Orchestration** (Beyond Single Agent)
   - SM Agent (sprint status)
   - Story Creator Agent (epic breakdown)
   - Dev Agent (implementation)
   - Reviewer Agent (quality validation)
   - Coordinated workflow across multiple specialized agents

5. **Time Arbitrage Capability** (The Real Value)
   - Developer plans Epic B while johnny-bmad implements Epic A
   - Parallel planning + implementation (not sequential)
   - Developer freed from implementation toil to focus on architecture/strategy
   - **Paradigm shift**: "Human plans, AI implements" vs "human writes everything"

**What Makes This Novel:**

Existing tools solve pieces of this puzzle:
- **Ralph**: Autonomous implementation loop (single agent, no upfront planning validation)
- **CI/CD**: Automated testing/deployment (human still writes all code)
- **AI Code Assistants**: Help write code faster (human still writes code manually)
- **BMAD Method**: Structured planning framework (implementation still manual)

**johnny-bmad combines these** to enable a fundamentally different workflow where developers can **multiply their output** by working on strategic planning while automation handles implementation execution.

### Market Context & Competitive Landscape

**Emerging Pattern: AI-Assisted Development Automation**

The developer tools landscape is evolving from:
- **Phase 1**: Code completion (Copilot, Tabnine) - autocomplete on steroids
- **Phase 2**: Chat-based coding (ChatGPT, Claude) - conversational code generation
- **Phase 3**: Autonomous agents (Devin, Sweep, Cursor Agent) - full feature implementation
- **Phase 4**: Multi-agent orchestration (johnny-bmad, emerging) - coordinated teams of AI agents

**Competitive Context:**

| Tool | Approach | Human Role | Multi-Agent | Planning Validation |
|------|----------|------------|-------------|---------------------|
| Ralph | Autonomous loop | Define PRD, run loop | No (single agent) | No (stories picked during loop) |
| Devin | Autonomous agent | Assign task, review result | No | No |
| Cursor Agent | Interactive agent | Guide step-by-step | No | No |
| **johnny-bmad** | **Multi-agent + Human-in-loop** | **Plan, approve, then automate** | **Yes (4 agents)** | **Yes (batch review)** |

**Differentiation:**

johnny-bmad is positioned at the intersection of:
- **Structured methodology** (BMAD framework)
- **Autonomous execution** (Ralph loop pattern)
- **Human oversight** (approve before automate)
- **Multi-agent collaboration** (specialized agents working together)

This combination doesn't exist in current tools - it's either full automation with no planning validation (Ralph, Devin) or interactive collaboration with no time arbitrage (Cursor, Claude Code).

### Validation Approach

**How We Validate This Innovation Works:**

**1. Time Savings Metric**
- **Baseline**: 10h epic implementation (sequential: plan inline, implement, iterate)
- **Target**: 8h epic implementation (batch: plan upfront, validate, automate)
- **Validation**: Track actual epic completion times in batch vs sequential mode

**2. Rework Prevention Metric**
- **Baseline**: Current failure mode = 5h wrong direction due to unclear/conflicting stories
- **Target**: Zero instances of 5h+ wrong direction in batch mode
- **Validation**: Track rework incidents (stories that needed major rewrites after implementation)

**3. Developer Experience Validation**
- **Test with Marcel's workflow**: Corporate developer doing parallel planning + implementation
- **Measure**: Can developer successfully plan Epic B while Epic A implements?
- **Success**: Developer reports reduced implementation bottleneck, more time on strategic work

**4. Quality Gates Still Work**
- **Concern**: Does batch workflow maintain code quality vs sequential?
- **Validation**: Peer review pass rate, test coverage, CI success rate
- **Success**: Batch mode produces equal or better quality than sequential

**5. Community Adoption Signal**
- **Metric**: GitHub stars growth after batch workflow release
- **Validation**: Community confirms time arbitrage value in real projects
- **Success**: Users report successful 8+ hour unattended sessions

### Risk Mitigation

**Innovation Risks & Fallbacks:**

**Risk 1: Batch Story Quality Lower Than Sequential**
- **Concern**: Generating all stories upfront might produce lower quality than iterative discovery
- **Mitigation**: Party Mode validation + human review gate catches quality issues before implementation
- **Fallback**: Users can still use sequential mode (backward compatibility)

**Risk 2: Long Sessions Fail Catastrophically**
- **Concern**: 8h unattended run fails at hour 7, losing all work
- **Mitigation**: Automatic resume already works, state tracking across batch phases
- **Fallback**: State file enables resume from exact failure point

**Risk 3: Time Arbitrage Doesn't Actually Work**
- **Concern**: Developers can't effectively context-switch to plan Epic B while Epic A implements
- **Mitigation**: Test with real users (Marcel's corporate workflow)
- **Validation**: If time arbitrage fails, batch workflow still delivers value via upfront plan validation
- **Fallback**: Batch mode remains valuable even without parallel planning (prevents wrong direction)

**Risk 4: Multi-Agent Coordination Overhead**
- **Concern**: Coordinating 4 agents adds complexity and failure points
- **Mitigation**: Each agent has clear, isolated responsibility (SM, Story Creator, Dev, Reviewer)
- **Fallback**: Sequential mode uses same agents, just different workflow order

**Risk 5: Human Approval Gate Slows Things Down**
- **Concern**: Forcing human review before implementation adds friction
- **Mitigation**: Review is faster than rework - reviewing 8 stories upfront takes 30min vs 5h rework
- **Fallback**: Advanced users can skip approval with --yolo flag (trust the automation)

## CLI Tool Specific Requirements

### Project-Type Overview

johnny-bmad is a **command-line orchestration tool** that automates BMAD implementation through multi-agent coordination (SM, Story Creator, Dev, Reviewer agents).

**Current State (v0.2.0 - Existing Tool):**
- Sequential workflow (create story → implement → review → repeat) ✓ EXISTS
- --yolo flag (skip approvals, auto-commit) ✓ EXISTS
- --verbose flag (debug output) ✓ EXISTS
- --max-iterations flag ✓ EXISTS
- Automatic resume via state file ✓ EXISTS
- State tracking (`.johnny-bmad-state.json`) ✓ EXISTS

**This PRD Transforms:** Existing Tool → Production-Grade with Batch Workflow
- Adds **batch workflow** (create all stories upfront, review, implement)
- Adds **--batch flag** (NEW)
- Adds **--dev-only flag** (NEW)
- Enables **time arbitrage** (plan Epic B while Epic A implements)

### Technical Architecture Considerations

**Command Structure & Interaction Modes**

**Existing Flags (Already Implemented):**
- `--yolo` - Skip all approval gates, auto-commit ✓ WORKS
- `--verbose` - Debug/detailed output ✓ WORKS
- `--max-iterations N` - Max dev-review cycles ✓ WORKS
- Automatic resume (no flag needed) ✓ WORKS

**New Flags (This PRD Adds):**
- `--batch` - Batch workflow: create all stories upfront, review, approve, implement
- `--dev-only` - Dev-only mode: skip story creation, use pre-built stories

**Command Examples:**

**Current Sequential Mode (Exists):**
```bash
johnny-bmad                    # Interactive sequential (current default)
johnny-bmad --yolo             # Sequential + auto-approve (exists)
johnny-bmad --verbose          # Debug output (exists)
```

**New Batch Mode (This PRD):**
```bash
johnny-bmad --batch            # NEW: Batch with approval gate
johnny-bmad --batch --yolo     # NEW: Batch + auto-approve (existing --yolo works)
johnny-bmad --dev-only         # NEW: Use pre-built stories only
johnny-bmad --dev-only --yolo  # NEW: Dev-only + auto-approve
```

### Workflow Mode Schema

**Mode Selection Matrix**

| Command | Mode | Story Creation | Human Approval | Implementation | Exits After |
|---------|------|----------------|----------------|----------------|-------------|
| `johnny-bmad` | Sequential | Per-story | Optional | Yes (per-story) | Epic complete |
| `johnny-bmad --yolo` | Sequential Auto | Per-story | NO (auto) | Yes (per-story) | Epic complete |
| `johnny-bmad --batch` | Batch | All upfront | YES (per-story) | **NO** | Story approval |
| `johnny-bmad --batch --yolo` | Batch Auto | All upfront | NO (auto) | **NO** | Story creation |
| `johnny-bmad --dev-only` | Dev-Only | **NO** | Optional | Yes (all stories) | Epic complete |
| `johnny-bmad --dev-only --yolo` | Dev-Only Auto | **NO** | NO (auto) | Yes (all stories) | Epic complete |

**Sequential Mode (Current - Exists):**
```
FOR EACH STORY in Epic:
  1. Create Story (Story Creator Agent)
  2. Implement (Dev Agent)
  3. Review (Reviewer Agent)
  4. Commit (auto if --yolo, else prompt)
  → NEXT STORY
```

**Batch Mode (New - This PRD):**
```
PHASE 1: Story Creation
  - Create ALL Epic Stories upfront (Story Creator Agent)
  - Per-story review: "OK or changes needed?" after each creation
  - Iterate on stories until developer approves each one

PHASE 2: Completion
  - Display summary: "All 8 stories created and approved"
  - STOPS (no implementation in --batch mode)

USAGE: Developer runs --batch to prepare stories, then later runs --dev-only to implement
```

**Dev-Only Mode (New - This PRD):**
```
PREREQUISITE: Stories already exist (pre-created manually or via --batch)

PHASE: Implementation Only
  - SKIP story creation entirely
  - FOR EACH EXISTING STORY: Implement → Review → Commit

USE CASE: Marcel created stories, got approval,
          now just implement while planning Epic B
```

**Marcel's Time Arbitrage Workflow:**
```
Day 1 Morning: Manual BMAD planning (PRD, Architecture)
Day 1 Afternoon: johnny-bmad --batch (create + review all stories)

Day 2 Morning: Parallel work begins
  Terminal 1: johnny-bmad --dev-only (implements Epic A, 8+ hours unattended)
  Terminal 2: Marcel plans Epic B (PRD, Architecture for next feature)

RESULT: Developer output multiplied through time arbitrage
```

### Automatic Resume Behavior

**State File (Internal - Not User-Configurable):**
- `.johnny-bmad-state.json` ✓ EXISTS
- Purpose: Internal state tracking for automatic resume
- Content: Current epic, story index, iteration count, phase, completed stories
- User interaction: Read-only, tool-generated, NOT for manual editing

**Resume Behavior:**
- **Automatic** (no flag needed, no user action required)
- If state file exists, johnny-bmad automatically resumes from exact point
- Works across all modes (sequential, batch, dev-only)
- Clear feedback: "Resuming from Epic: X, Story: N/Total, Phase: Y"

**Example:**
```bash
# Start batch workflow
johnny-bmad --batch

# (Crashes after 5 hours during implementation phase)

# Just rerun - automatically resumes
johnny-bmad --batch
# Output: "Resuming from Epic: dashboard, Story: 4/8, Phase: implementation"
```

**No --resume Flag:**
- Resume is automatic, NOT a flag
- --resume flag does NOT exist (was misleading, removed from consideration)

### Output Formats

**Current State (Human-Readable):**
- Colored terminal output (chalk) ✓ EXISTS
- Progress indicators ✓ EXISTS
- Clear status messages (agent activity) ✓ EXISTS
- Error messages with context ✓ EXISTS

**Future Enhancement (Not This PRD):**
- `--json` flag for machine-readable output
- Enables scripting, monitoring, integration
- Other formats (YAML, CSV) possible
- Deferred to future roadmap

### Configuration

**State File (Exists - Internal Only):**
- `.johnny-bmad-state.json` ✓ EXISTS
- Purpose: Resume state tracking
- NOT user-configurable

**Config File (Future - Not This PRD):**
- User-facing config file DOES NOT EXIST YET
- Planned for v2+ roadmap (after batch workflow + testing)

**Roadmap:**
- **v1 (This PRD)**: Batch workflow + --batch + --dev-only flags
- **v1.5 (Next PRD)**: Code quality + testing infrastructure (100% coverage, CI/CD)
- **v2+ (Future)**: User-facing config file (model selection per agent, retry limits configurable)

**This PRD Scope:**
- Models: Hardcoded in code
- Retry limits: Hardcoded in code
- Config file: NOT included (v2+ future)

### Scripting Support

**Current Scriptability (Exists):**
- State persistence enables scripting ✓ EXISTS
- Deterministic exit codes (0 = success, non-zero = failure) ✓ EXISTS
- Automatic resume enables retry ✓ EXISTS

**This PRD Adds:**
- Batch mode scriptability (`--batch --yolo` for CI/CD automation)
- Dev-only mode scriptability (`--dev-only --yolo` for fully automated execution)

**Automation Use Cases:**
- CI/CD pipelines: Automated batch implementation without human gates
- Scheduled runs: Cron jobs running overnight batch workflows
- Multi-project automation: Scripts orchestrating multiple BMAD projects

### Implementation Considerations

**CLI Design Patterns:**
- Follow POSIX conventions (--flag-name format) ✓ EXISTS
- Colored output respects NO_COLOR environment variable
- Progress indicators work in non-TTY environments (CI/CD)

**Backwards Compatibility (Critical):**
- Existing sequential workflow UNCHANGED
- All existing flags continue working UNCHANGED
- New flags (--batch, --dev-only) are ADDITIVE ONLY
- Zero breaking changes to current behavior

**Developer Experience:**
- Clear help text (`johnny-bmad --help`) ✓ EXISTS, updated for new flags
- Sensible defaults (interactive sequential mode)
- Error messages with recovery suggestions ✓ EXISTS

**Shell Completion:**
- Low priority (nice-to-have, not blocking)
- Defer to future enhancement

## Project Scoping & Phased Development

### Scope Confirmation

This PRD transforms the existing johnny-bmad MVP (v0.2.0) into a production-grade tool with batch workflow capabilities. Scoping was established in earlier steps and confirmed in this review.

### This PRD Scope (v1 - Batch Workflow Enhancement)

**Core Deliverables:**

| Feature | Description | Status |
|---------|-------------|--------|
| `--batch` flag | Create all stories upfront, review, approve, implement | NEW |
| `--dev-only` flag | Skip story creation, use pre-built stories | NEW |
| Batch workflow phases | Phase 1: Create → Phase 2: Review → Phase 3: Implement | NEW |
| Human approval gate | Review all stories before implementation starts | NEW |
| State tracking for batch | Track phase + story position for resume | NEW |
| Backward compatibility | Existing sequential mode unchanged | PRESERVE |

**User Journeys Supported:**
- Marcel (Corporate Developer) - Time arbitrage workflow
- Alex (Solo Developer) - First-time discovery
- Sam (Error Recovery) - Automatic resume

**Success Metrics:**
- 10h → 8h epic implementation time (20% efficiency gain through better planning)
- Zero 5h+ wrong direction incidents (prevented by upfront plan validation)
- GitHub stars growth (community adoption signal)

### Post-MVP Roadmap

**v1.5 (Next PRD - Code Quality & Testing):**
- 100% test coverage (unit, integration, system tests)
- CI/CD pipeline (GitHub Actions)
- Better monitoring for long sessions
- Rich error context logging

**v2+ (Future - Flexibility & Configuration):**
- User-facing config file (`.johnny-bmad.json`)
- Model selection per agent (configurable)
- Retry limits configurable
- TEA agent integration (TBD)

### Explicitly Out of Scope (This PRD)

| Item | Reason | Target Version |
|------|--------|----------------|
| Config file | Not yet needed | v2+ |
| `--json` output | Future enhancement | v2+ |
| Shell completion | Low priority | Future |
| Testing infrastructure | Separate PRD | v1.5 |
| Model configurability | Requires config file | v2+ |

### Risk Mitigation

**Technical Risk:** Batch story quality might differ from sequential
- **Mitigation:** Party Mode validation + human review gate catches issues before implementation
- **Fallback:** Users can still use sequential mode (backward compatibility)

**Resource Risk:** Implementation takes longer than expected
- **Mitigation:** Core batch workflow is well-defined; defer testing to v1.5
- **Fallback:** Ship --batch flag first, --dev-only as fast-follow if needed

**Adoption Risk:** Community doesn't adopt batch workflow
- **Mitigation:** Backward compatibility means zero disruption to existing users
- **Fallback:** Sequential mode remains default, batch is opt-in

## Functional Requirements

This section defines the complete capability contract for johnny-bmad's batch workflow enhancement. Every feature must trace back to these requirements. If a capability is not listed here, it will not exist in the final product.

### 1. Workflow Mode Selection

- **FR1**: Developer can invoke johnny-bmad in sequential mode (default, existing behavior)
- **FR2**: Developer can invoke johnny-bmad in batch mode using `--batch` flag
- **FR3**: Developer can invoke johnny-bmad in dev-only mode using `--dev-only` flag
- **FR4**: Developer can combine any mode with `--yolo` to skip approval gates
- **FR5**: Developer can combine any mode with `--verbose` for detailed output (existing)
- **FR6**: Developer can view help text with `--help` flag (existing, updated for new flags)

### 2. Batch Story Creation (`--batch` flag)

- **FR7**: System can generate ALL user stories for an epic sequentially
- **FR8**: System can invoke Story Creator agent to create each story file
- **FR9**: System can display each story to developer after creation
- **FR10**: System can track story creation progress (e.g., "Creating story 3/8")
- **FR11**: System STOPS after all stories created and approved (no implementation in batch mode)

### 3. Per-Story Review & Approval (`--batch` without `--yolo`)

- **FR12**: Developer can review EACH story immediately after it's created
- **FR13**: System prompts "OK or changes needed?" after each story creation
- **FR14**: Developer can approve individual story to proceed to next
- **FR15**: Developer can request changes to individual story
- **FR16**: System can iterate on story with developer feedback until approved
- **FR17**: System proceeds to next story only after current story approved
- **FR18**: System displays summary when all stories approved (e.g., "All 8 stories created and approved")

### 4. Auto-Approve Story Creation (`--batch --yolo`)

- **FR19**: System can skip per-story approval prompts when `--yolo` flag provided
- **FR20**: System auto-approves each story immediately after creation
- **FR21**: System completes all story creation without human interaction

### 5. Dev-Only Execution (`--dev-only` flag)

- **FR22**: System can detect existing story files for current epic
- **FR23**: System can skip story creation phase entirely when `--dev-only` flag provided
- **FR24**: System can iterate through pre-created stories for implementation
- **FR25**: Developer can run dev-only mode with stories created via `--batch` in previous session
- **FR26**: Developer can run dev-only mode with manually created/edited stories
- **FR27**: System can display which stories will be implemented before starting

### 6. Implementation Loop (Sequential & Dev-Only modes)

- **FR28**: System can invoke Dev agent to implement each story
- **FR29**: System can invoke Reviewer agent to validate each implementation
- **FR30**: System can iterate dev/review loop until story passes or max iterations reached
- **FR31**: System can commit changes when story implementation passes review
- **FR32**: System can proceed to next story after successful commit
- **FR33**: Developer can configure max dev/review iterations via `--max-iterations` flag (existing)
- **FR34**: System can skip commit approval prompts when `--yolo` flag provided (existing)

### 7. State Management & Resume

- **FR35**: System can persist workflow state to `.johnny-bmad-state.json`
- **FR36**: System can track current workflow mode (sequential, batch, dev-only)
- **FR37**: System can track current phase (story-creation, approval, implementation)
- **FR38**: System can track current epic, story index, and approval status
- **FR39**: System can automatically detect state file on restart
- **FR40**: System can resume from saved state without user action
- **FR41**: System can display resume feedback (e.g., "Resuming from Epic: dashboard, Story: 4/8, Phase: implementation")
- **FR42**: Developer can restart johnny-bmad after crash/failure and resume from exact position

### 8. Error Handling & Recovery

- **FR43**: System can retry failed API calls with exponential backoff
- **FR44**: System can detect Claude API rate limiting and pause before retrying
- **FR45**: System can preserve state immediately before any operation that could fail
- **FR46**: System can display actionable error messages with context (what failed, where, why)
- **FR47**: System can handle network failures gracefully without losing progress
- **FR48**: System can recover from Story Creator agent failures during batch mode
- **FR49**: System can recover from Dev agent failures during implementation
- **FR50**: System can recover from Reviewer agent failures during validation

### 9. CLI Output & User Feedback

- **FR51**: Developer can see which agent is currently active (SM, Story Creator, Dev, Reviewer)
- **FR52**: Developer can see progress indicators during long operations
- **FR53**: Developer can see colored terminal output for status messages (existing)
- **FR54**: System can display workflow phase transitions clearly
- **FR55**: System can display story-by-story progress in batch mode
- **FR56**: System can display epic completion summary

### 10. Backward Compatibility

- **FR57**: Developer can use all existing flags without behavior changes
- **FR58**: Developer can run sequential workflow exactly as before (default mode)
- **FR59**: System can preserve existing state file format compatibility
- **FR60**: System can support existing `--yolo` flag behavior in all modes
- **FR61**: System can support existing `--verbose` flag behavior in all modes
- **FR62**: System can support existing `--max-iterations` flag behavior

---

**Total: 62 Functional Requirements across 10 Capability Areas**

**Capability Contract Note:** This FR list is binding. Any feature not listed here will not exist in the final product unless explicitly added through a change request. UX design, architecture, and epic breakdown all derive from these requirements.

## Non-Functional Requirements

This section defines quality attributes that specify HOW WELL the system must perform. Only relevant categories are included - categories that don't apply to johnny-bmad (security, scalability, accessibility, integration) are intentionally omitted.

### Reliability

**Critical for Long-Running Sessions:**

- **NFR-R1**: System must preserve all work when interrupted (crash, network failure, power loss)
- **NFR-R2**: Automatic resume must restore exact state (mode, epic, story, phase, approval status)
- **NFR-R3**: State file must be written atomically to prevent corruption
- **NFR-R4**: System must resume successfully 100% of the time when state file exists and is valid
- **NFR-R5**: System must detect and report corrupted state files with recovery options
- **NFR-R6**: Zero data loss scenarios - no lost stories, no lost implementations, no lost reviews

**API Resilience:**

- **NFR-R7**: System must handle Claude API rate limiting with retry after cooldown and clear user notification (pause and retry, not fail)
- **NFR-R8**: System must retry failed API calls up to 3 times with exponential backoff (2s, 4s, 8s)
- **NFR-R9**: System must handle transient network failures without session termination

### Performance

**CLI Responsiveness:**

- **NFR-P1**: Command start-up time must be <2 seconds from invocation to first output
- **NFR-P2**: State file read/write operations must complete in <100ms
- **NFR-P3**: Progress updates must display within 1 second of agent state changes

**Long Session Stability:**

- **NFR-P4**: System must maintain performance with no memory leaks, no response degradation >10%, and no crashes during 8+ hour sessions
- **NFR-P5**: State file size must remain <1MB regardless of epic size or session duration

### Maintainability

**Code Quality Expectations (for v1.5 Testing PRD):**

- **NFR-M1**: Code must achieve 100% test coverage (unit + integration + system tests) in v1.5
- **NFR-M2**: All new flags (--batch, --dev-only) must have test scenarios covering all code paths and edge cases
- **NFR-M3**: State management logic must have regression tests preventing state corruption
- **NFR-M4**: Error handling paths must have test coverage for all failure scenarios

**Documentation:**

- **NFR-M5**: All new CLI flags must be documented in --help output
- **NFR-M6**: Error messages must include specific recovery commands or actions to resolve the issue (not just "failed")
- **NFR-M7**: State file format changes must maintain backward compatibility or provide migration

---

**Total: 20 Non-Functional Requirements across 3 Relevant Categories**

**Note:** Categories not included (Security, Scalability, Accessibility, Integration) were assessed as not relevant for this CLI orchestration tool.
