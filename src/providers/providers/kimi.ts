import { CliProvider } from '../cli-provider.js';
import type { Model } from '../../types.js';

export class KimiProvider extends CliProvider {
  id = 'kimi';
  name = 'Kimi (CLI)';
  cliCommand = 'kimi';
  modelFlag = '--model';
  promptFlag = '-p';
  toolsFlag = '--allowedTools';

  async listModels(): Promise<Model[]> {
    return [
      {
        id: 'moonshot-v1-8k',
        name: 'Kimi 8K',
        providerId: 'kimi',
        providerType: 'cli',
        description: '8K context window',
        contextWindow: 8192,
        supportsTools: true
      },
      {
        id: 'moonshot-v1-32k',
        name: 'Kimi 32K',
        providerId: 'kimi',
        providerType: 'cli',
        description: '32K context window',
        contextWindow: 32768,
        supportsTools: true
      },
      {
        id: 'moonshot-v1-128k',
        name: 'Kimi 128K',
        providerId: 'kimi',
        providerType: 'cli',
        description: '128K context window',
        contextWindow: 128000,
        supportsTools: true
      }
    ];
  }
}
