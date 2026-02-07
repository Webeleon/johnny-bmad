import { CliProvider } from '../cli-provider.js';
import type { Model } from '../../types.js';

export class ClaudeProvider extends CliProvider {
  id = 'claude';
  name = 'Claude (CLI)';
  cliCommand = 'claude';
  modelFlag = '--model';
  promptFlag = '-p';
  toolsFlag = '--allowedTools';

  async listModels(): Promise<Model[]> {
    return [
      {
        id: 'opus',
        name: 'Claude Opus',
        providerId: 'claude',
        providerType: 'cli',
        description: 'Most capable, best for planning/review',
        contextWindow: 200000,
        supportsTools: true
      },
      {
        id: 'sonnet',
        name: 'Claude Sonnet',
        providerId: 'claude',
        providerType: 'cli',
        description: 'Balanced performance, good for coding',
        contextWindow: 200000,
        supportsTools: true
      },
      {
        id: 'haiku',
        name: 'Claude Haiku',
        providerId: 'claude',
        providerType: 'cli',
        description: 'Fastest, great for quick tasks',
        contextWindow: 200000,
        supportsTools: true
      }
    ];
  }
}
