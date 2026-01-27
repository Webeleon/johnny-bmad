export function getSmAgentPrompt(): string {
  return `Execute BMAD workflows in sequence:

<steps CRITICAL="TRUE">
1. First, run sprint-status workflow:
   - Load the FULL @_bmad/core/tasks/workflow.xml
   - READ its entire contents
   - Execute with workflow-config: _bmad/bmm/workflows/4-implementation/sprint-status/workflow.yaml
   - Follow workflow.xml instructions EXACTLY as written

2. If sprint needs initialization or planning:
   - Load the FULL @_bmad/core/tasks/workflow.xml
   - Execute with workflow-config: _bmad/bmm/workflows/4-implementation/sprint-planning/workflow.yaml
   - Follow workflow.xml instructions EXACTLY as written
</steps>

IMPORTANT: Always load workflow.xml first and follow its instructions exactly.`;
}

export function getCreateStoryPrompt(storyId: string, storyTitle: string, epicId: string): string {
  return `Execute BMAD create-story workflow:

Story to create:
- Story ID: ${storyId}
- Story Title: ${storyTitle}
- Epic: ${epicId}

<steps CRITICAL="TRUE">
1. Load the FULL @_bmad/core/tasks/workflow.xml
2. READ its entire contents
3. Execute with workflow-config: _bmad/bmm/workflows/4-implementation/create-story/workflow.yaml
4. Pass story_key: ${storyId}
5. Follow workflow.xml instructions EXACTLY as written
</steps>

IMPORTANT: Always load workflow.xml first and follow its instructions exactly.`;
}

export function getDevStoryPrompt(storyId: string, storyFilePath: string): string {
  return `Execute BMAD dev-story workflow:

Story: ${storyId}
Story File: ${storyFilePath}

<steps CRITICAL="TRUE">
1. Load the FULL @_bmad/core/tasks/workflow.xml
2. READ its entire contents
3. Execute with workflow-config: _bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml
4. Follow workflow.xml instructions EXACTLY as written
</steps>

IMPORTANT: Always load workflow.xml first and follow its instructions exactly.`;
}

export function getReviewStoryPrompt(storyId: string, storyFilePath: string): string {
  return `Execute BMAD code-review workflow:

Story: ${storyId}
Story File: ${storyFilePath}

<steps CRITICAL="TRUE">
1. Load the FULL @_bmad/core/tasks/workflow.xml
2. READ its entire contents
3. Execute with workflow-config: _bmad/bmm/workflows/4-implementation/code-review/workflow.yaml
4. Follow workflow.xml instructions EXACTLY as written
</steps>

IMPORTANT: Always load workflow.xml first and follow its instructions exactly.

<automation-directive CRITICAL="TRUE">
When the workflow reaches Step 4 and presents the choice:
  1. Fix them automatically
  2. Create action items
  3. Show me details

YOU MUST ALWAYS CHOOSE OPTION 2: "Create action items"

This is NON-NEGOTIABLE. Always add findings as action items to the story's Tasks/Subtasks section.
Do NOT fix issues automatically. Do NOT ask for clarification on this choice.
</automation-directive>`;
}

export function getTestCommand(customCommand?: string): string {
  return customCommand || 'npm test';
}
