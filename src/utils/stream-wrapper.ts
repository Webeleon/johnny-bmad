import { Transform } from 'stream';
import chalk from 'chalk';

// Color mapping for agent roles
const AGENT_COLORS: Record<string, (text: string) => string> = {
  'SM': chalk.cyan,
  'Story Creator': chalk.magenta,
  'Dev': chalk.blue,
  'Review': chalk.yellow,
};

/**
 * Creates a transform stream that prefixes each line with agent role
 * Handles line buffering for partial output
 */
export function createLabeledStream(
  agentRole: string,
  streamType: 'stdout' | 'stderr',
  originalStream: NodeJS.WriteStream
): Transform {
  const color = AGENT_COLORS[agentRole] || chalk.white;
  const prefix = color(`[${agentRole}${streamType === 'stderr' ? ':ERR' : ''}] `);

  let lineBuffer = '';

  return new Transform({
    transform(chunk, encoding, callback) {
      const text = chunk.toString();
      lineBuffer += text;

      // Process complete lines
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const prefixed = prefix + line + '\n';
        originalStream.write(prefixed);
      }

      callback();
    },
    flush(callback) {
      // Write any remaining buffer
      if (lineBuffer) {
        const prefixed = prefix + lineBuffer + '\n';
        originalStream.write(prefixed);
      }
      callback();
    }
  });
}
