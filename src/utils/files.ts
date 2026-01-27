import { readdir, readFile, stat } from 'fs/promises';
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
  const actionableStatuses = ['review', 'in-progress', 'ready-for-dev'];

  // Separate epics and stories (epics start with "epic-")
  let inProgressEpicId: string | null = null;
  const actionableStories: Array<{ id: string; status: string }> = [];

  for (const [id, status] of entries) {
    if (id.startsWith('epic-')) {
      if (status === 'in-progress') {
        inProgressEpicId = id;
      }
    } else if (actionableStatuses.includes(status)) {
      actionableStories.push({ id, status });
    }
  }

  if (actionableStories.length === 0 && !inProgressEpicId) {
    return null;
  }

  // Derive epic from story ID (e.g., "1-5-node-selection" → "epic-1")
  let epicId: string;
  if (actionableStories.length > 0) {
    const storyId = actionableStories[0].id;
    const epicNum = storyId.split('-')[0];
    epicId = `epic-${epicNum}`;
  } else if (inProgressEpicId) {
    epicId = inProgressEpicId;
  } else {
    return null;
  }

  return {
    epicId,
    stories: actionableStories,
    source: 'sprint-status'
  };
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
