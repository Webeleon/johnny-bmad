import { ApiProvider } from '../api-provider.js';
import type { Model } from '../../types.js';

export class OpenAIProvider extends ApiProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI (API)';
  readonly models: Model[] = [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      providerId: 'openai',
      providerType: 'api',
      description: 'Most capable GPT model',
      contextWindow: 128000,
      supportsTools: true
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      providerId: 'openai',
      providerType: 'api',
      description: 'Faster and cheaper GPT-4',
      contextWindow: 128000,
      supportsTools: true
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      providerId: 'openai',
      providerType: 'api',
      description: 'Fast and cost-effective',
      contextWindow: 16385,
      supportsTools: true
    }
  ];

  constructor() {
    super('https://api.openai.com/v1');
  }
}
