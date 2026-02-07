import { ClaudeProvider } from './providers/claude.js';
import { CodexProvider } from './providers/codex.js';
import { KimiProvider } from './providers/kimi.js';
import { OpenAIProvider } from './providers/openai.js';
import { GLMProvider } from './providers/glm.js';
import { CustomProvider } from './providers/custom.js';
import type { LLMProvider, Model, InvokeOptions, CustomProviderConfig } from '../types.js';
import { info, success, warn, debug } from '../utils/logger.js';
import { loadCachedModels, saveCachedModels } from './cache.js';
import { loadProviderConfig, getApiKey } from './config.js';

export class ProviderRegistry {
  private providers: Map<string, LLMProvider>;

  constructor() {
    this.providers = new Map();
    this.registerBuiltInProviders();
  }

  private registerBuiltInProviders(): void {
    this.register(new ClaudeProvider());
    this.register(new CodexProvider());
    this.register(new KimiProvider());
    this.register(new GLMProvider());
    this.register(new OpenAIProvider());
  }

  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(providerId: string): LLMProvider | undefined {
    return this.providers.get(providerId);
  }

  getAllProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  async getAvailableProviders(cwd: string): Promise<LLMProvider[]> {
    const config = await loadProviderConfig();
    const available: LLMProvider[] = [];

    for (const provider of this.providers.values()) {
      if (provider.needsApiKey()) {
        const apiKey = getApiKey(config, provider.id);
        if (!apiKey) {
          continue;
        }
        if (provider.configure) {
          await provider.configure(apiKey);
        }
      }

      const isAvailable = await provider.checkAvailable();
      if (isAvailable) {
        available.push(provider);
      }
    }

    if (available.length > 0) {
      const cliProviders = available.filter(p => p.type === 'cli').map(p => p.name);
      if (cliProviders.length > 0) {
        success(`Detected CLI tools: ${cliProviders.join(', ')}`);
      }

      const apiProviders = available.filter(p => p.type === 'api').map(p => p.name);
      if (apiProviders.length > 0) {
        success(`Detected API providers: ${apiProviders.join(', ')}`);
      }
    } else {
      warn('No LLM providers detected. Configure API keys or install CLI tools.');
    }

    return available;
  }

  async getAllModels(cwd: string, forceRefresh = false): Promise<Model[]> {
    if (!forceRefresh) {
      const cached = loadCachedModels(cwd);
      if (cached) {
        debug('Returning cached models');
        return cached.models;
      }
    }

    info('Discovering available models...');
    const availableProviders = await this.getAvailableProviders(cwd);
    const allModels: Model[] = [];

    for (const provider of availableProviders) {
      try {
        const models = await provider.listModels();
        allModels.push(...models);
        success(`${provider.name}: ${models.length} models`);
      } catch (error) {
        warn(`${provider.name}: ${error instanceof Error ? error.message : 'Failed to list models'}`);
      }
    }

    saveCachedModels(cwd, allModels);
    return allModels;
  }

  async invokeModel(modelId: string, options: InvokeOptions): Promise<string> {
    let providerId: string;
    let modelName: string;

    if (modelId.includes(':')) {
      const parts = modelId.split(':', 2);
      providerId = parts[0];
      modelName = parts[1];
    } else {
      const models = await this.getAllModels(options.cwd ?? process.cwd());
      const matched = models.find(m => m.id === modelId || m.name === modelId);

      if (!matched) {
        throw new Error(`Model '${modelId}' not found. Run --onboarding to see available models.`);
      }

      providerId = matched.providerId;
      modelName = matched.id;
    }

    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' not found`);
    }

    const result = await provider.invoke({
      ...options,
      model: modelName
    });

    return result.output ?? '';
  }

  async registerCustomProvider(providerId: string, config: CustomProviderConfig): Promise<void> {
    const apiKey = await this.getApiKeyForProvider(providerId);
    const models = config.models.map(m => ({
      ...m,
      providerId,
      providerType: 'api' as const
    }));

    const customProvider = new CustomProvider();
    customProvider.setConfig(providerId, config.name, config.baseUrl, models, apiKey);
    this.register(customProvider);
  }

  private async getApiKeyForProvider(providerId: string): Promise<string> {
    const config = await loadProviderConfig();
    const apiKey = getApiKey(config, providerId);

    if (!apiKey) {
      throw new Error(`API key not configured for provider '${providerId}'`);
    }

    return apiKey;
  }
}

export const registry = new ProviderRegistry();
