import { ApiProvider } from '../api-provider.js';
import type { Model } from '../../types.js';

export class GLMProvider extends ApiProvider {
  readonly id = 'glm';
  readonly name = 'GLM (Zhipu AI - API)';
  readonly models: Model[] = [
    {
      id: 'glm-4',
      name: 'GLM-4',
      providerId: 'glm',
      providerType: 'api',
      description: 'Latest GLM model',
      contextWindow: 128000,
      supportsTools: true
    },
    {
      id: 'glm-4-plus',
      name: 'GLM-4 Plus',
      providerId: 'glm',
      providerType: 'api',
      description: 'Enhanced GLM-4',
      contextWindow: 128000,
      supportsTools: true
    },
    {
      id: 'glm-4v',
      name: 'GLM-4V (Vision)',
      providerId: 'glm',
      providerType: 'api',
      description: 'GLM with vision capabilities',
      contextWindow: 128000,
      supportsTools: true
    }
  ];

  constructor() {
    super('https://api.z.ai/api/paas/v4');
  }
}
