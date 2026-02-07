import { CliProvider } from '../cli-provider.js';
import type { Model } from '../../types.js';

export class CodexProvider extends CliProvider {
  id = 'codex';
  name = 'OpenAI Codex (CLI)';
  cliCommand = 'codex';
  modelFlag = '--model';
  promptFlag = '-p';
  toolsFlag = '--allowedTools';

  async listModels(): Promise<Model[]> {
    return [
      {
        id: 'gpt-5.3-codex',
        name: 'GPT-5.3 Codex',
        providerId: 'codex',
        providerType: 'cli',
        description: 'Latest Codex model with enhanced coding capabilities',
        contextWindow: 128000,
        supportsTools: true
      }
    ];
  }
}
