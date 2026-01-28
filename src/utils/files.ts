import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import YAML from 'yaml';
import type { BmadConfig, SprintStatus, Epic, EpicStory, Story, AcceptanceCriterion, OngoingWork } from '../types.js';
import { debug } from './logger.js';

const BMAD_DIR = '_bmad';
const BMAD_OUTPUT_DIR = '_bmad-output';
const CONFIG_PATH = '_bmad/bmm/config.yaml';
const SPRINT_STATUS_PATH = '_bmad-output/implementation-artifacts/sprint-status.yaml';
const EPICS_DIR = '_bmad-output/planning-artifacts';
const STORIES_DIR = '_bmad-output/implementation-artifacts';

export async function isBmadProject(cwd: string): Promise<boolean> {
  try {
    const bmadStat = await stat(join(cwd, BMAD_DIR));
    if (!bmadStat.isDirectory()) return false;

    const configStat = await stat(join(cwd, CONFIG_PATH));
    if (!configStat.isFile()) return false;

    return true;
  } catch {
    return false;
  }
}

export async function ensureOutputDir(cwd: string): Promise<void> {
  const outputPath = join(cwd, BMAD_OUTPUT_DIR);
  try {
    await stat(outputPath);
  } catch {
    const { mkdir } = await import('fs/promises');
    await mkdir(outputPath, { recursive: true });
  }
}

export async function loadConfig(cwd: string): Promise<BmadConfig> {
  const configPath = join(cwd, CONFIG_PATH);
  const content = await readFile(configPath, 'utf-8');
  return YAML.parse(content) as BmadConfig;
}

export async function loadSprintStatus(cwd: string): Promise<SprintStatus | null> {
  const statusPath = join(cwd, SPRINT_STATUS_PATH);
  try {
    const content = await readFile(statusPath, 'utf-8');
    return YAML.parse(content) as SprintStatus;
  } catch {
    return null;
  }
}

export async function loadEpics(cwd: string): Promise<Epic[]> {
  const epicsPath = join(cwd, EPICS_DIR);
  const epics: Epic[] = [];

  try {
    const files = await readdir(epicsPath);
    const epicFiles = files.filter(f => f.startsWith('epic-') && f.endsWith('.md'));

    for (const file of epicFiles) {
      const filePath = join(epicsPath, file);
      const content = await readFile(filePath, 'utf-8');
      const epic = parseEpicFile(content, filePath);
      if (epic) {
        epics.push(epic);
      }
    }
  } catch (err) {
    debug(`Failed to load epics: ${err}`);
  }

  return epics;
}

function parseEpicFile(content: string, filePath: string): Epic | null {
  const lines = content.split('\n');

  // Extract epic ID from filename
  const fileMatch = filePath.match(/epic-([^/]+)\.md$/);
  const id = fileMatch ? fileMatch[1] : 'unknown';

  // Extract title from first H1
  const titleLine = lines.find(l => l.startsWith('# '));
  const title = titleLine ? titleLine.replace(/^#\s+/, '') : `Epic ${id}`;

  // Extract stories from the file
  const stories: EpicStory[] = [];
  let inStoriesSection = false;

  for (const line of lines) {
    // Look for stories section
    if (line.match(/^##\s+.*stories/i)) {
      inStoriesSection = true;
      continue;
    }

    // Exit stories section on next H2
    if (inStoriesSection && line.match(/^##\s+/) && !line.match(/stories/i)) {
      inStoriesSection = false;
      continue;
    }

    // Parse story entries (various formats)
    if (inStoriesSection) {
      // Format: - [ ] STORY-001: Title or - [x] STORY-001: Title
      // Also matches numeric IDs like "8-1-pool-change-feedback"
      const checkboxMatch = line.match(/^-\s+\[([ x])\]\s+([\w]+-[\w-]+):\s*(.+)/i);
      if (checkboxMatch) {
        stories.push({
          id: checkboxMatch[2],
          title: checkboxMatch[3].trim(),
          status: checkboxMatch[1] === 'x' ? 'done' : 'pending'
        });
        continue;
      }

      // Format: - STORY-001: Title or - 8-1-pool-change: Title
      const simpleMatch = line.match(/^-\s+([\w]+-[\w-]+):\s*(.+)/i);
      if (simpleMatch) {
        stories.push({
          id: simpleMatch[1],
          title: simpleMatch[2].trim()
        });
        continue;
      }

      // Format: 1. STORY-001: Title or 1. 8-1-pool-change: Title
      const numberedMatch = line.match(/^\d+\.\s+([\w]+-[\w-]+):\s*(.+)/i);
      if (numberedMatch) {
        stories.push({
          id: numberedMatch[1],
          title: numberedMatch[2].trim()
        });
      }
    }
  }

  return {
    id,
    title,
    stories,
    filePath
  };
}

export async function loadStory(cwd: string, storyId: string): Promise<Story | null> {
  const storiesPath = join(cwd, STORIES_DIR);

  try {
    const files = await readdir(storiesPath);
    const storyFile = files.find(f =>
      f.toLowerCase().includes(storyId.toLowerCase()) && f.endsWith('.md')
    );

    if (!storyFile) {
      return null;
    }

    const filePath = join(storiesPath, storyFile);
    const content = await readFile(filePath, 'utf-8');
    return parseStoryFile(content, storyId, filePath);
  } catch {
    return null;
  }
}

function parseStoryFile(content: string, storyId: string, filePath: string): Story {
  const lines = content.split('\n');

  // Extract title from first H1
  const titleLine = lines.find(l => l.startsWith('# '));
  const title = titleLine ? titleLine.replace(/^#\s+/, '') : `Story ${storyId}`;

  // Extract acceptance criteria
  const acceptanceCriteria: AcceptanceCriterion[] = [];
  let inACSection = false;

  for (const line of lines) {
    // Look for acceptance criteria section
    if (line.match(/^##\s+.*acceptance.*criteria/i)) {
      inACSection = true;
      continue;
    }

    // Exit AC section on next H2
    if (inACSection && line.match(/^##\s+/) && !line.match(/acceptance.*criteria/i)) {
      inACSection = false;
      continue;
    }

    // Parse AC items
    if (inACSection) {
      const checkboxMatch = line.match(/^-\s+\[([ x])\]\s*(.+)/);
      if (checkboxMatch) {
        acceptanceCriteria.push({
          text: checkboxMatch[2].trim(),
          done: checkboxMatch[1] === 'x'
        });
      }
    }
  }

  return {
    id: storyId,
    title,
    acceptanceCriteria,
    filePath
  };
}

export async function storyFileExists(cwd: string, storyId: string): Promise<boolean> {
  const storiesPath = join(cwd, STORIES_DIR);

  try {
    const files = await readdir(storiesPath);
    return files.some(f =>
      f.toLowerCase().includes(storyId.toLowerCase()) && f.endsWith('.md')
    );
  } catch {
    return false;
  }
}

export function areAllAcceptanceCriteriaDone(story: Story): boolean {
  if (story.acceptanceCriteria.length === 0) {
    return false;
  }
  return story.acceptanceCriteria.every(ac => ac.done);
}

export function findOngoingWork(sprintStatus: SprintStatus | null): OngoingWork | null {
  if (!sprintStatus?.development_status) return null;

  const entries = Object.entries(sprintStatus.development_status);
  const actionableStatuses = ['review', 'in-progress', 'ready-for-dev', 'backlog', 'pending', 'ready'];
  const incompleteStatuses = ['review', 'in-progress', 'ready-for-dev', 'backlog', 'pending', 'ready'];

  // Separate epics and stories (epics start with "epic-")
  const inProgressEpics: string[] = [];
  const actionableStories: Array<{ id: string; status: string }> = [];

  for (const [id, status] of entries) {
    if (id.startsWith('epic-')) {
      if (status === 'in-progress') {
        inProgressEpics.push(id);
      }
    } else if (actionableStatuses.includes(status)) {
      actionableStories.push({ id, status });
    }
  }

  // If we have actionable stories, use the first one's epic
  if (actionableStories.length > 0) {
    const storyId = actionableStories[0].id;
    const epicNum = storyId.split('-')[0];
    return {
      epicId: `epic-${epicNum}`,
      stories: actionableStories,
      source: 'sprint-status'
    };
  }

  // If we have in-progress epics, check if they actually have remaining work
  for (const epicId of inProgressEpics) {
    const epicNum = epicId.replace('epic-', '');
    const epicStories = entries.filter(([id]) =>
      !id.startsWith('epic-') && id.startsWith(`${epicNum}-`)
    );

    // Check if any story is NOT done
    const hasIncompleteWork = epicStories.some(([, status]) =>
      incompleteStatuses.includes(status)
    );

    if (hasIncompleteWork) {
      const stories = epicStories
        .filter(([, status]) => actionableStatuses.includes(status))
        .map(([id, status]) => ({ id, status }));
      return {
        epicId,
        stories,
        source: 'sprint-status'
      };
    }
    // If all stories are done but epic still marked in-progress, skip it
    debug(`Epic ${epicId} marked in-progress but all stories done, skipping`);
  }

  return null;
}

/**
 * Get all stories for an epic from sprint-status, regardless of status.
 * This is used as a fallback when epic file parsing returns 0 stories.
 */
export function getAllStoriesForEpic(
  sprintStatus: SprintStatus | null,
  epicId: string
): Array<{ id: string; status: string }> {
  if (!sprintStatus?.development_status) return [];

  // Extract epic number (e.g., "epic-8" → "8")
  const epicNum = epicId.replace('epic-', '');
  const stories: Array<{ id: string; status: string }> = [];

  for (const [id, status] of Object.entries(sprintStatus.development_status)) {
    // Skip epic entries
    if (id.startsWith('epic-')) continue;
    // Match stories belonging to this epic (e.g., "8-1-..." for epic-8)
    if (id.startsWith(`${epicNum}-`)) {
      stories.push({ id, status });
    }
  }

  return stories;
}

/**
 * Get all epics from sprint-status.yaml when no epic files exist.
 * Falls back to sprint-status data to create synthetic Epic objects.
 * Filters out epics that are already done.
 */
export function getEpicsFromSprintStatus(sprintStatus: SprintStatus | null): Epic[] {
  if (!sprintStatus?.development_status) return [];

  const devStatus = sprintStatus.development_status;
  const epicIds = Object.keys(devStatus)
    .filter(id => id.startsWith('epic-'))
    .filter(id => devStatus[id] !== 'done');

  return epicIds.map(epicId => {
    const stories = getAllStoriesForEpic(sprintStatus, epicId);
    return {
      id: epicId.replace('epic-', ''),
      title: `Epic ${epicId.replace('epic-', '')}`,
      stories: stories.map(s => ({ id: s.id, title: s.id, status: s.status })),
      filePath: ''
    };
  });
}

/**
 * Update the status of a story or epic in sprint-status.yaml
 */
export async function updateSprintStatus(
  cwd: string,
  id: string,
  status: string
): Promise<void> {
  const statusPath = join(cwd, SPRINT_STATUS_PATH);

  try {
    const content = await readFile(statusPath, 'utf-8');
    const sprintStatus = YAML.parse(content) as SprintStatus;

    if (!sprintStatus.development_status) {
      sprintStatus.development_status = {};
    }

    sprintStatus.development_status[id] = status;

    const newContent = YAML.stringify(sprintStatus);
    await writeFile(statusPath, newContent, 'utf-8');
  } catch (err) {
    debug(`Failed to update sprint-status: ${err}`);
  }
}

/**
 * Mark an epic as done and all its stories as done in sprint-status.yaml
 */
export async function markEpicComplete(
  cwd: string,
  epicId: string,
  storyIds: string[]
): Promise<void> {
  const statusPath = join(cwd, SPRINT_STATUS_PATH);

  try {
    const content = await readFile(statusPath, 'utf-8');
    const sprintStatus = YAML.parse(content) as SprintStatus;

    if (!sprintStatus.development_status) {
      sprintStatus.development_status = {};
    }

    // Normalize epicId - ensure it has 'epic-' prefix
    const normalizedEpicId = epicId.startsWith('epic-') ? epicId : `epic-${epicId}`;

    // Mark all stories as done
    for (const storyId of storyIds) {
      sprintStatus.development_status[storyId] = 'done';
    }

    // Mark epic as done (try both formats to ensure we update the right key)
    sprintStatus.development_status[normalizedEpicId] = 'done';
    // Also mark without prefix if it exists
    const shortId = epicId.replace('epic-', '');
    if (sprintStatus.development_status[shortId] !== undefined) {
      sprintStatus.development_status[shortId] = 'done';
    }

    const newContent = YAML.stringify(sprintStatus);
    await writeFile(statusPath, newContent, 'utf-8');
    debug(`Marked epic ${normalizedEpicId} and ${storyIds.length} stories as done`);
  } catch (err) {
    // Log error more visibly - this is important
    console.error(`Failed to mark epic complete: ${err}`);
  }
}
