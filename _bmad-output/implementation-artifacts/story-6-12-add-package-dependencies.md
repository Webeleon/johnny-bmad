# Story 6-12: Add Package Dependencies

**As a** developer working on johnny-bmad multi-provider system,
**I want** to add the `node-fetch` library as a dependency for API provider HTTP requests,
**So that** API providers can make requests to LLM endpoints.

## Context

API providers (OpenAI, GLM, Custom) need to make HTTP requests to LLM API endpoints. The existing code only uses `child_process.spawn()` for CLI providers, which won't work for API-based communication.

## Requirements

- Add `node-fetch: ^3.3.2` to `package.json` dependencies section
- Install dependency with: `bun install` or `npm install`
- Verify dependency is added successfully
- Ensure version constraint is met (3.3.2 or higher)

## Acceptance Criteria

**Given** I create `package.json` file:

**When** I add to `dependencies`:

**Then** it includes:
```json
"node-fetch": "^3.3.2"
```

**And** when I run `bun install`:

**Then** `node-fetch` is installed and available in node_modules:

**And** TypeScript compilation succeeds without errors:

## Out of Scope

- Node.js HTTP alternatives (chose node-fetch for broad compatibility)
- Version range (3.3.2+ for fetch timeout support, AbortSignal)
- No other new dependencies introduced (minimizing risk)

## Technical Notes

- `node-fetch` provides AbortSignal.timeout() support for request timeouts
- Works in both Node.js and browser environments (though johnny-bmad is Node-only)
- Common fetch library with good TypeScript definitions
- No need to bundle node-fetch (already an ESM module)

## Dependencies After This Story

- Provider base classes can use fetch for HTTP requests
- API providers (OpenAI, GLM, Custom) can communicate via HTTP
- Retry logic in api-provider.ts can leverage fetch timeout
